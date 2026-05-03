import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import api from '../services/api';

export default function TickerTape() {
  const [stocks, setStocks] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/trading/market');
        if (data.success) setStocks(data.stocks);
      } catch (e) { /* silent */ }
    };
    load();
    const interval = setInterval(load, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  if (stocks.length === 0) return null;
  const doubled = [...stocks, ...stocks];

  return (
    <div className="bg-ink text-cream border-y border-cream/10 overflow-hidden">
      <div className="flex animate-ticker whitespace-nowrap py-3">
        {doubled.map((s, i) => {
          const up = s.change >= 0;
          return (
            <div key={i} className="flex items-center gap-3 px-6 border-r border-cream/10">
              <span className="font-mono font-bold text-sm">{s.symbol}</span>
              <span className="font-mono text-sm text-cream/60">${s.price}</span>
              <span className={`flex items-center gap-1 text-xs font-semibold ${up ? 'text-bull-400' : 'text-bear-400'}`}>
                {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {up ? '+' : ''}{s.changePercent}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
