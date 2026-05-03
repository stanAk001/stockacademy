import db from '../config/db.js';

export const list = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM watchlist WHERE user_id = $1 ORDER BY added_at DESC',
      [req.user.id]
    );
    res.json({ success: true, watchlist: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load watchlist' });
  }
};

export const add = async (req, res) => {
  try {
    const { symbol, company_name, note } = req.body;
    if (!symbol) return res.status(400).json({ success: false, message: 'Symbol required' });

    if (req.user.plan !== 'premium') {
      const count = await db.query('SELECT COUNT(*) FROM watchlist WHERE user_id = $1', [req.user.id]);
      if (parseInt(count.rows[0].count) >= 5) {
        return res.status(403).json({
          success: false,
          message: 'Free plan allows up to 5 stocks. Upgrade to Premium for unlimited watchlist.',
          upgrade: true,
        });
      }
    }

    const { rows } = await db.query(
      `INSERT INTO watchlist (user_id, symbol, company_name, note)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, symbol) DO UPDATE SET note = EXCLUDED.note
       RETURNING *`,
      [req.user.id, symbol.toUpperCase(), company_name, note]
    );
    res.json({ success: true, item: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to add' });
  }
};

export const remove = async (req, res) => {
  try {
    const { symbol } = req.params;
    await db.query('DELETE FROM watchlist WHERE user_id = $1 AND symbol = $2', [req.user.id, symbol.toUpperCase()]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to remove' });
  }
};
