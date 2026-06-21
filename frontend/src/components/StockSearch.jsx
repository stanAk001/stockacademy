import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp, X, Loader2 } from 'lucide-react';
import api from '../services/api';

export default function StockSearch({ inline = false }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const debounceRef = useRef(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/stocks/search', { params: { q: query } });
        if (data.success) setResults(data.results);
      } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const onClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const onSelect = (s) => {
    setOpen(false);
    setQuery('');
    setResults([]);
    navigate(`/stocks/${encodeURIComponent(s.symbol)}`);
  };

  return (
    <div ref={wrapRef} className={`relative ${inline ? 'w-full' : 'w-72'}`}>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/60" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search any stock — AAPL, Tesla, MTNN…"
          className="w-full pl-9 pr-9 py-2 rounded-full bg-white hover:bg-cream-warm focus:bg-white focus:ring-2 focus:ring-bull-400/40 border-2 border-ink/10 focus:border-ink/30 text-sm font-semibold text-ink placeholder:text-ink/55 outline-none transition"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink"
          >
            <X size={14}/>
          </button>
        )}
      </div>

      {open && (query || loading) && (
        <div className="absolute top-full mt-2 w-full sm:w-96 max-w-[95vw] bg-white rounded-2xl shadow-2xl border border-ink/5 overflow-hidden z-50 max-h-96 overflow-y-auto right-0 sm:left-0">
          {loading && (
            <div className="flex items-center gap-2 p-4 text-ink/50 text-sm">
              <Loader2 className="animate-spin" size={14}/> Searching…
            </div>
          )}
          {!loading && results.length === 0 && query && (
            <div className="p-4 text-ink/50 text-sm">No matches for "{query}"</div>
          )}
          {results.map((s) => (
            <button
              key={s.symbol}
              onClick={() => onSelect(s)}
              className="w-full flex items-center gap-3 p-3 hover:bg-cream-warm transition text-left border-b border-ink/5 last:border-0"
            >
              <div className={`w-9 h-9 rounded-xl grid place-items-center text-xs font-mono font-bold shrink-0 ${
                s.country === 'NG' ? 'bg-bull-100 text-bull-700' : 'bg-sun-100 text-sun-600'
              }`}>
                {s.country === 'NG' ? '🇳🇬' : '🇺🇸'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm">{s.display_symbol}</span>
                  <span className="text-xs text-ink/40">·</span>
                  <span className="text-xs text-ink/50">{s.exchange}</span>
                </div>
                <p className="text-xs text-ink/60 truncate">{s.name}</p>
              </div>
              <TrendingUp size={14} className="text-ink/30 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
