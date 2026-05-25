import db from '../config/db.js';
import PDFDocument from 'pdfkit';
import crypto from 'crypto';
import axios from 'axios';
import { notifyNewCertificate } from '../services/telegramService.js';

const CERT_PRICE_NGN = 2000;
const CERT_PRICE_USD_CENTS = 200;

// Helper: check if user has completed everything
async function checkCompletion(userId) {
  const { rows: lessonStats } = await db.query(`
    SELECT 
      COUNT(DISTINCT l.id) AS total_lessons,
      COUNT(DISTINCT CASE WHEN up.completed = true THEN l.id END) AS completed_lessons
    FROM lessons l
    LEFT JOIN user_progress up ON up.lesson_id = l.id AND up.user_id = $1
  `, [userId]);

  const { rows: quizStats } = await db.query(`
    SELECT 
      COUNT(DISTINCT q.id) AS total_quizzes,
      COUNT(DISTINCT CASE WHEN qa.passed = true THEN q.id END) AS passed_quizzes
    FROM quizzes q
    LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.user_id = $1
  `, [userId]);

  const totalLessons = parseInt(lessonStats[0].total_lessons) || 0;
  const completedLessons = parseInt(lessonStats[0].completed_lessons) || 0;
  const totalQuizzes = parseInt(quizStats[0].total_quizzes) || 0;
  const passedQuizzes = parseInt(quizStats[0].passed_quizzes) || 0;

  return {
    total_lessons: totalLessons,
    completed_lessons: completedLessons,
    total_quizzes: totalQuizzes,
    passed_quizzes: passedQuizzes,
    isComplete: totalLessons > 0 && completedLessons === totalLessons && passedQuizzes === totalQuizzes,
    progress_pct: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
  };
}

// GET /api/certificates/eligibility
export const checkEligibility = async (req, res) => {
  try {
    const userId = req.user.id;

    const existing = await db.query(
      'SELECT * FROM certificates WHERE user_id = $1 ORDER BY issued_at DESC LIMIT 1',
      [userId]
    );

    const completion = await checkCompletion(userId);

    const userRes = await db.query('SELECT plan, full_name, full_name_legal FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];
    const isPremium = user.plan === 'premium';

    return res.json({
      success: true,
      eligible: completion.isComplete,
      already_owns: existing.rows.length > 0,
      certificate: existing.rows[0] || null,
      completion,
      pricing: {
        is_premium: isPremium,
        price_ngn: isPremium ? 0 : CERT_PRICE_NGN,
        price_usd_cents: isPremium ? 0 : CERT_PRICE_USD_CENTS,
        free_for_premium: true,
      },
      user_name: user.full_name_legal || user.full_name || '',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to check eligibility' });
  }
};

// POST /api/certificates/save-name
export const saveLegalName = async (req, res) => {
  try {
    const { full_name_legal } = req.body;
    if (!full_name_legal || full_name_legal.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Please enter your full legal name (at least 3 characters).' });
    }
    await db.query(
      'UPDATE users SET full_name_legal = $1 WHERE id = $2',
      [full_name_legal.trim(), req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to save name' });
  }
};

// POST /api/certificates/initialize
export const initialize = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRes = await db.query('SELECT email, plan, full_name, full_name_legal FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];

    if (!user.full_name_legal) {
      return res.status(400).json({ success: false, message: 'Please set your legal name first.' });
    }

    const completion = await checkCompletion(userId);
    if (!completion.isComplete) {
      return res.status(400).json({ success: false, message: 'Complete all lessons and quizzes first.' });
    }

    const existing = await db.query('SELECT id FROM certificates WHERE user_id = $1', [userId]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'You already have a certificate.' });
    }

    // PREMIUM USERS: issue free
    if (user.plan === 'premium') {
      const cert = await issueCertificate(userId, user.full_name_legal, null, 0, true);
      return res.json({
        success: true,
        free: true,
        certificate: cert,
      });
    }

    // FREE USERS: start Paystack payment
    const reference = `CERT-${Date.now()}-${userId}`;
    const callbackUrl = `${process.env.CLIENT_URL}/certificate/verify?reference=${reference}`;

    const { data } = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: user.email,
        amount: CERT_PRICE_NGN * 100,
        reference,
        callback_url: callbackUrl,
        metadata: {
          purpose: 'certificate',
          user_id: userId,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    res.json({
      success: true,
      free: false,
      authorization_url: data.data.authorization_url,
      reference,
    });
  } catch (err) {
    console.error('Cert init error:', err.response?.data || err.message);
    res.status(500).json({ success: false, message: 'Failed to initialize certificate' });
  }
};

// POST /api/certificates/verify
export const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.body;
    const userId = req.user.id;

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Missing reference' });
    }

    const { data } = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (data.data.status !== 'success') {
      return res.status(400).json({ success: false, message: 'Payment not successful' });
    }

    const existing = await db.query(
      'SELECT * FROM certificates WHERE payment_reference = $1',
      [reference]
    );
    if (existing.rows.length > 0) {
      return res.json({ success: true, certificate: existing.rows[0], already_issued: true });
    }

    const userRes = await db.query('SELECT full_name_legal FROM users WHERE id = $1', [userId]);
    const fullName = userRes.rows[0].full_name_legal;

    const amount = data.data.amount / 100;
    const cert = await issueCertificate(userId, fullName, reference, amount, false);

    res.json({ success: true, certificate: cert });
  } catch (err) {
    console.error('Cert verify error:', err.response?.data || err.message);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

// Helper: actually create the certificate
async function issueCertificate(userId, fullName, paymentRef, amount, wasFree) {
  const certNumber = `SA-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const verificationToken = crypto.randomBytes(16).toString('hex');

  const { rows } = await db.query(
    `INSERT INTO certificates 
     (user_id, certificate_number, verification_token, full_name, payment_reference, amount_paid, was_free)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [userId, certNumber, verificationToken, fullName, paymentRef, amount, wasFree]
  );

  // Fire Telegram notification (don't block)
  notifyNewCertificate(rows[0], wasFree).catch(() => {});

  return rows[0];
}

// GET /api/certificates/my
export const myCertificates = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM certificates WHERE user_id = $1 ORDER BY issued_at DESC',
      [req.user.id]
    );
    res.json({ success: true, certificates: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch certificates' });
  }
};

// GET /api/certificates/download/:id
export const downloadCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      'SELECT * FROM certificates WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    generatePDF(rows[0], res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to download' });
  }
};

// GET /api/certificates/verify-public/:token  (public, no auth)
export const verifyPublic = async (req, res) => {
  try {
    const { token } = req.params;
    const { rows } = await db.query(
      `SELECT certificate_number, full_name, issued_at
       FROM certificates
       WHERE verification_token = $1`,
      [token]
    );

    if (rows.length === 0) {
      return res.json({ success: false, valid: false });
    }

    res.json({
      success: true,
      valid: true,
      certificate: rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, valid: false });
  }
};

// PDF generation
function generatePDF(cert, res) {
  const doc = new PDFDocument({
    layout: 'landscape',
    size: 'A4',
    margin: 0,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="StockAcademy-Certificate-${cert.certificate_number}.pdf"`);
  doc.pipe(res);

  const W = doc.page.width;
  const H = doc.page.height;

  // Background
  doc.rect(0, 0, W, H).fill('#FDF8F0');

  // Outer border
  doc.rect(30, 30, W - 60, H - 60).lineWidth(2).stroke('#0F1419');

  // Inner thin border
  doc.rect(45, 45, W - 90, H - 90).lineWidth(0.5).stroke('#0F1419');

  // Top accent bar
  doc.rect(45, 45, W - 90, 8).fill('#FBBF24');

  // Bottom accent bar
  doc.rect(45, H - 53, W - 90, 8).fill('#FB7185');

  // Wordmark
  doc
    .fillColor('#0F1419')
    .font('Helvetica-Bold')
    .fontSize(20)
    .text('StockAcademy', 0, 90, { align: 'center', width: W });

  doc
    .fillColor('#0F1419')
    .font('Helvetica')
    .fontSize(10)
    .text('CERTIFICATE OF COMPLETION', 0, 115, { align: 'center', width: W, characterSpacing: 4 });

  // Ornament line
  doc
    .moveTo(W / 2 - 80, 150)
    .lineTo(W / 2 + 80, 150)
    .lineWidth(1)
    .stroke('#FBBF24');

  // "This is to certify that"
  doc
    .fillColor('#0F1419')
    .font('Helvetica-Oblique')
    .fontSize(14)
    .text('This is to certify that', 0, 175, { align: 'center', width: W });

  // Recipient name
  doc
    .fillColor('#0F1419')
    .font('Helvetica-Bold')
    .fontSize(42)
    .text(cert.full_name, 0, 210, { align: 'center', width: W });

  // Underline under name
  const nameWidth = doc.widthOfString(cert.full_name);
  const nameX = (W - nameWidth) / 2;
  doc
    .moveTo(nameX - 20, 270)
    .lineTo(nameX + nameWidth + 20, 270)
    .lineWidth(1)
    .stroke('#0F1419');

  // "has successfully completed"
  doc
    .fillColor('#0F1419')
    .font('Helvetica')
    .fontSize(13)
    .text('has successfully completed all 6 courses and quizzes in the', 0, 295, { align: 'center', width: W });

  // Program title
  doc
    .fillColor('#FB7185')
    .font('Helvetica-Bold')
    .fontSize(22)
    .text('Complete Stock Market Education Program', 0, 320, { align: 'center', width: W });

  // Subtitle
  doc
    .fillColor('#0F1419')
    .font('Helvetica')
    .fontSize(11)
    .fillOpacity(0.6)
    .text('covering Market Basics, Earning from Stocks, Fundamental Analysis,', 0, 360, { align: 'center', width: W });
  doc
    .text('Technical Analysis, Risk Management, and Trading Strategies', 0, 376, { align: 'center', width: W });

  doc.fillOpacity(1);

  const date = new Date(cert.issued_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const colY = H - 130;

  // Left: Date
  doc
    .fillColor('#0F1419')
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('DATE OF ISSUE', 100, colY, { characterSpacing: 2 });
  doc
    .font('Helvetica')
    .fontSize(12)
    .text(date, 100, colY + 18);
  doc
    .moveTo(100, colY + 38)
    .lineTo(220, colY + 38)
    .lineWidth(0.5)
    .stroke('#0F1419');

  // Center: Signature
  doc
    .fillColor('#0F1419')
    .font('Helvetica-Oblique')
    .fontSize(18)
    .text('Akeem Gbolahan', W / 2 - 60, colY - 5);
  doc
    .moveTo(W / 2 - 80, colY + 28)
    .lineTo(W / 2 + 100, colY + 28)
    .lineWidth(0.5)
    .stroke('#0F1419');
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .text('FOUNDER, STOCKACADEMY', W / 2 - 80, colY + 35, { characterSpacing: 2 });

  // Right: Cert number
  doc
    .fillColor('#0F1419')
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('CERTIFICATE NUMBER', W - 220, colY, { characterSpacing: 2 });
  doc
    .font('Courier')
    .fontSize(11)
    .text(cert.certificate_number, W - 220, colY + 18);
  doc
    .moveTo(W - 220, colY + 38)
    .lineTo(W - 100, colY + 38)
    .lineWidth(0.5)
    .stroke('#0F1419');

  // Verification URL footer
  const verifyUrl = `${(process.env.CLIENT_URL || 'https://stocklearning-phi.vercel.app').replace(/^https?:\/\//, '')}/verify/${cert.verification_token}`;
  doc
    .fillColor('#0F1419')
    .fillOpacity(0.5)
    .font('Helvetica')
    .fontSize(8)
    .text(`Verify authenticity at: ${verifyUrl}`, 0, H - 70, { align: 'center', width: W });

  doc.fillOpacity(1);

  doc.end();
}