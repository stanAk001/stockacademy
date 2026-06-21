import db from '../config/db.js';

const CRYPTO_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX'];

export const listForSymbol = async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const isCrypto = CRYPTO_SYMBOLS.includes(symbol);
    const assetType = isCrypto ? 'crypto' : 'us_equity';

    const { rows } = await db.query(
      `SELECT id, key, name, logo, color, affiliate_url, description
       FROM brokers
       WHERE enabled = TRUE AND $1 = ANY(asset_types)
       ORDER BY priority ASC`,
      [assetType]
    );

    const brokers = rows.map((b) => ({
      ...b,
      affiliate_url: b.affiliate_url.replace('{symbol}', symbol),
      asset_type: assetType,
    }));

    res.json({ success: true, symbol, asset_type: assetType, brokers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load brokers' });
  }
};

export const track = async (req, res) => {
  try {
    const { broker_id, symbol } = req.body;
    await db.query(
      'INSERT INTO affiliate_clicks (user_id, broker_id, symbol) VALUES ($1, $2, $3)',
      [req.user.id, broker_id, symbol]
    );
    res.json({ success: true });
  } catch (err) {
    res.json({ success: true });
  }
};
