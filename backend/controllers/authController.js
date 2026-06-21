import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import validator from 'validator';
import { OAuth2Client } from 'google-auth-library';
import db from '../config/db.js';
import { generateToken } from '../utils/jwt.js';
import { notifyNewSignup } from '../services/telegramService.js';
import { sendEmail, isEmailConfigured, passwordResetEmail } from '../services/emailService.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Password reset: link is valid for 30 minutes, single use.
const RESET_TTL_MIN = 30;
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// Auth token lives in an httpOnly cookie so page JavaScript (and any XSS)
// can't read it. `secure` is on in production (HTTPS only).
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};
const setAuthCookie = (res, token) => res.cookie('token', token, COOKIE_OPTS);

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

    setAuthCookie(res, token);
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

    setAuthCookie(res, token);
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

    setAuthCookie(res, token);
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
  res.clearCookie('token', { path: '/' });
  res.json({ success: true, message: 'Logged out.' });
};

/* ============================================
 *  FORGOT PASSWORD — email a reset link
 * ============================================ */
export const requestPasswordReset = async (req, res) => {
  // Always answer the same way so we never reveal whether an email is registered.
  const generic = { success: true, message: 'If that email is registered, a reset link is on its way.' };
  try {
    const { email } = req.body;
    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email.' });
    }

    const { rows } = await db.query(
      'SELECT id, email, full_name, username, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    const user = rows[0];

    // Only local accounts (with a password) can be reset — Google-only users have
    // no password. Either way, respond with the same generic message.
    if (!user || !user.password_hash || !isEmailConfigured()) {
      if (user && !user.password_hash) { /* google-only account — nothing to reset */ }
      if (!isEmailConfigured()) console.warn('[reset] SMTP not configured — cannot send reset link');
      return res.json(generic);
    }

    // One raw token is emailed; only its hash is stored.
    const raw = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(raw);
    const expiresAt = new Date(Date.now() + RESET_TTL_MIN * 60 * 1000);

    // Burn any earlier unused tokens, then store the new one.
    await db.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [user.id]);
    await db.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokenHash, expiresAt]
    );

    const url = `${process.env.CLIENT_URL || ''}/reset-password?token=${raw}`;
    const firstName = (user.full_name || user.username || '').split(' ')[0];
    await sendEmail({ to: user.email, ...passwordResetEmail({ name: firstName, url, ttlMin: RESET_TTL_MIN }) });

    return res.json(generic);
  } catch (err) {
    console.error('requestPasswordReset error:', err);
    return res.json(generic); // still don't leak on error
  }
};

/* ============================================
 *  RESET PASSWORD — set a new password with the token
 * ============================================ */
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Missing token or password.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const tokenHash = sha256(token);
    const { rows } = await db.query(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );
    const row = rows[0];
    if (!row) {
      return res.status(400).json({
        success: false,
        message: 'This reset link is invalid or has expired. Please request a new one.',
      });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, row.user_id]);
    // Burn this token and any other outstanding ones for the user.
    await db.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [row.user_id]);

    return res.json({ success: true, message: 'Your password has been reset. You can now sign in.' });
  } catch (err) {
    console.error('resetPassword error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};