import bcrypt from 'bcryptjs';
import validator from 'validator';
import { OAuth2Client } from 'google-auth-library';
import db from '../config/db.js';
import { generateToken } from '../utils/jwt.js';
import { notifyNewSignup } from '../services/telegramService.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/* ============================================
 *  LOCAL SIGN UP
 * ============================================ */
export const signup = async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ success: false, message: 'Username must be between 3 and 30 characters.' });
    }

    const existing = await db.query(
      'SELECT id, email, username FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), username]
    );
    if (existing.rows.length > 0) {
      const conflict = existing.rows[0].email === email.toLowerCase() ? 'email' : 'username';
      return res.status(409).json({ success: false, message: `That ${conflict} is already taken.` });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const { rows } = await db.query(
      `INSERT INTO users (username, email, password_hash, full_name, auth_provider, last_login_at)
       VALUES ($1, $2, $3, $4, 'local', NOW())
       RETURNING id, username, email, full_name, avatar_url, virtual_balance, total_xp,
                 experience_level, auth_provider, plan, is_admin, is_banned`,
      [username, email.toLowerCase(), passwordHash, fullName || username]
    );

    const user = rows[0];
    const token = generateToken({ id: user.id, email: user.email });

    // Telegram notification — fire and forget, won't block signup if it fails
    notifyNewSignup(user, 'email').catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Account created successfully. Welcome aboard!',
      token,
      user,
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

/* ============================================
 *  LOCAL LOGIN
 * ============================================ */
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide credentials.' });
    }

    const { rows } = await db.query(
      'SELECT * FROM users WHERE email = $1 OR username = $1',
      [identifier.toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const user = rows[0];

    if (user.is_banned) {
      return res.status(403).json({
        success: false,
        message: `Your account has been suspended. Reason: ${user.banned_reason || 'Violation of terms.'}`,
      });
    }

    if (!user.password_hash) {
      return res.status(401).json({
        success: false,
        message: 'This account was created with Google. Please sign in with Google.',
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Track last login
    await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    const token = generateToken({ id: user.id, email: user.email });

    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      virtual_balance: user.virtual_balance,
      total_xp: user.total_xp,
      experience_level: user.experience_level,
      auth_provider: user.auth_provider,
      plan: user.plan,
      is_admin: user.is_admin,
      is_banned: user.is_banned,
    };

    res.json({ success: true, message: `Welcome back, ${user.username}!`, token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

/* ============================================
 *  GOOGLE OAUTH
 * ============================================ */
export const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, message: 'Google credential missing.' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture, email_verified } = payload;

    if (!email_verified) {
      return res.status(400).json({ success: false, message: 'Google email not verified.' });
    }

    let { rows } = await db.query(
      'SELECT * FROM users WHERE google_id = $1 OR email = $2',
      [googleId, email.toLowerCase()]
    );

    let user;
    let isNewSignup = false;  // ← flag to track if this is a brand new user

    if (rows.length > 0) {
      user = rows[0];

      if (user.is_banned) {
        return res.status(403).json({
          success: false,
          message: `Your account has been suspended. Reason: ${user.banned_reason || 'Violation of terms.'}`,
        });
      }

      if (!user.google_id) {
        const updated = await db.query(
          `UPDATE users SET google_id = $1, avatar_url = COALESCE(avatar_url, $2), is_verified = true
           WHERE id = $3 RETURNING *`,
          [googleId, picture, user.id]
        );
        user = updated.rows[0];
      }
    } else {
      // Brand new user — track this for notifications
      isNewSignup = true;

      const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      let username = baseUsername;
      let counter = 1;
      while (true) {
        const check = await db.query('SELECT id FROM users WHERE username = $1', [username]);
        if (check.rows.length === 0) break;
        username = `${baseUsername}${counter++}`;
      }

      const inserted = await db.query(
        `INSERT INTO users (username, email, google_id, full_name, avatar_url, auth_provider, is_verified, last_login_at)
         VALUES ($1, $2, $3, $4, $5, 'google', true, NOW())
         RETURNING *`,
        [username, email.toLowerCase(), googleId, name, picture]
      );
      user = inserted.rows[0];
    }

    // Track last login
    await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    // Telegram notification — only for brand new Google signups, not existing logins
    if (isNewSignup) {
      notifyNewSignup(user, 'google').catch(() => {});
    }

    const token = generateToken({ id: user.id, email: user.email });

    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      virtual_balance: user.virtual_balance,
      total_xp: user.total_xp,
      experience_level: user.experience_level,
      auth_provider: user.auth_provider,
      plan: user.plan,
      is_admin: user.is_admin,
      is_banned: user.is_banned,
    };

    res.json({ success: true, message: 'Signed in with Google!', token, user: safeUser });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ success: false, message: 'Google authentication failed.' });
  }
};

export const me = async (req, res) => {
  res.json({ success: true, user: req.user });
};

export const logout = (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out.' });
};