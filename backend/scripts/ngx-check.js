// Diagnostic: is NGX Pulse history reachable, and what does it return?
import 'dotenv/config';
import axios from 'axios';

const KEY = process.env.NGX_PULSE_API_KEY || '';
const BASE = process.env.NGX_PULSE_BASE || 'https://ngxpulse.ng/api/ngxdata';
console.log('NGX_PULSE_API_KEY present:', Boolean(KEY), '· BASE:', BASE);

async function hit(path, params) {
  try {
    const { data, status } = await axios.get(`${BASE}${path}`, { headers: { 'X-API-Key': KEY }, params, timeout: 15000 });
    const shape = Array.isArray(data) ? `array(${data.length})` : typeof data === 'object' ? `object{${Object.keys(data).join(',')}}` : typeof data;
    console.log(`\nGET ${path} → ${status}  ${shape}`);
    console.log('  sample:', JSON.stringify(data).slice(0, 320));
  } catch (e) {
    console.log(`\nGET ${path} → ERROR ${e.response?.status || ''} ${e.code || ''}`);
    console.log('  ', e.response?.data ? JSON.stringify(e.response.data).slice(0, 320) : e.message);
  }
}

await hit('/prices/DANGCEM', { days: 60 });   // history (what technicals need)
await hit('/stocks', {});                      // the live-quote list (known to work)
process.exit(0);
