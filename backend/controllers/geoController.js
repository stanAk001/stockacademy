import axios from 'axios';

// Pricing config — change here as needed
const PRICING = {
  NG: {
    currency: 'NGN',
    amount_kobo: 450000,    // ₦4,500
    display: '₦4,500',
    processor: 'paystack',
  },
  INTL: {
    currency: 'USD',
    amount_kobo: (parseInt(process.env.PRICING_USD_CENTS) || 1000),  // $10 = 1000 cents
    display: `$${((parseInt(process.env.PRICING_USD_CENTS) || 1000) / 100).toFixed(0)}`,
    processor: 'flutterwave',
  },
};

/* GET /api/geo
 * Detects country from IP. Returns the right pricing for the user.
 * Falls back to Nigeria if detection fails (your home market). */
export const detectGeo = async (req, res) => {
  try {
    // Manual override (user clicks "Change country")
    const override = req.query.country?.toUpperCase();
    if (override) {
      const tier = override === 'NG' ? PRICING.NG : PRICING.INTL;
      return res.json({ success: true, country: override, ...tier, override: true });
    }

    // Get user IP — handles proxy chains
    let ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
             req.connection.remoteAddress ||
             req.ip;
    if (ip?.startsWith('::ffff:')) ip = ip.substring(7);

    // Localhost during dev = treat as Nigeria
    if (ip === '::1' || ip === '127.0.0.1' || ip?.startsWith('192.168.') || ip?.startsWith('10.')) {
      return res.json({ success: true, country: 'NG', ...PRICING.NG, source: 'local' });
    }

    try {
      const { data } = await axios.get(`https://ipapi.co/${ip}/json/`, { timeout: 3000 });
      const country = (data?.country_code || 'NG').toUpperCase();
      const tier = country === 'NG' ? PRICING.NG : PRICING.INTL;
      return res.json({
        success: true,
        country,
        country_name: data?.country_name,
        ...tier,
        source: 'ip',
      });
    } catch {
      return res.json({ success: true, country: 'NG', ...PRICING.NG, source: 'fallback' });
    }
  } catch (err) {
    console.error('geo detect error:', err);
    res.json({ success: true, country: 'NG', ...PRICING.NG, source: 'error' });
  }
};