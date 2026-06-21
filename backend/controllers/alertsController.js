import db from '../config/db.js';

export const premiumOnly = (req, res, next) => {
  if (req.user.plan !== 'premium') {
    return res.status(403).json({
      success: false,
      message: 'Price alerts are a Premium feature. Upgrade to unlock.',
      upgrade: true,
    });
  }
  next();
};

export const list = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM price_alerts WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ success: true, alerts: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load alerts' });
  }
};

export const create = async (req, res) => {
  try {
    const { symbol, company_name, target_price, direction, note } = req.body;
    if (!symbol || !target_price || !direction) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }
    const { rows } = await db.query(
      `INSERT INTO price_alerts (user_id, symbol, company_name, target_price, direction, note)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, symbol.toUpperCase(), company_name, target_price, direction, note || null]
    );
    res.json({ success: true, alert: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create alert' });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM price_alerts WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete' });
  }
};
