import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Search, Wallet, PieChart as PieIcon,
  ShoppingCart, X, ArrowUp, ArrowDown, History, RefreshCcw
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import BuyThisStockButton from '../components/BuyThisStockButton';
import StockAnalysisPanel from '../components/StockAnalysisPanel';
import CandlestickChart from '../components/CandlestickChart';

const POPULAR = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'DIS', 'KO', 'JPM', 'V'];

export default function Simulator() {
  const { user, refreshUser } = useAuth();
  const [selected, setSelected] = useState('AAPL');
  const [quote, setQuote] = useState(null);
  const [market, setMarket] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');
  const [tradeModal, setTradeModal] = useState(null);
  const [tab, setTab] = useState('chart');

  const loadAll = async () => {
    try {
      const [q, m, p, t] = await Promise.all([
        api.get(`/trading/quote/${selected}`),
        api.get('/trading/market'),
        api.get('/trading/portfolio'),
        api.get('/trading/transactions'),
      ]);
      if (q.data.success) setQuote(q.data);
      if (m.data.success) setMarket(m.data.stocks);
      if (p.data.success) setPortfolio(p.data);
      if (t.data.success) setTransactions(t.data.transactions);
    } catch (err) {
      /* silent */
    }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [selected]);

  const filteredMarket = market.filter(
    (s) =>
      s.symbol.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase())
  );

  const doTrade = async (side, symbol, shares) => {
    try {
      const { data } = await api.post(`/trading/${side.toLowerCase()}`, { symbol, shares });
      if (data.success) {
        toast.success(data.message);
        setTradeModal(null);
        refreshUser();
        loadAll();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Trade failed');
    }
  };

  const isUp = quote?.change >= 0;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-bull-600">Paper trading</p>
            <h1 className="font-display text-4xl sm:text-5xl font-black leading-tight mt-1">
              The <span className="italic">simulator</span>.
            </h1>
            <p className="text-ink/60 mt-1">Practice with virtual money. Zero real risk. Infinite learning.</p>
          </div>
          <button onClick={loadAll} className="btn-ghost shrink-0 self-start">
            <RefreshCcw size={14} /> Refresh prices
          </button>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <BalanceCard
            label="Cash"
            value={portfolio?.summary?.balance ?? user?.virtual_balance ?? 0}
            icon={Wallet}
            color="bg-sun-300"
          />
          <BalanceCard
            label="Equity"
            value={portfolio?.summary?.equity_value ?? 0}
            icon={PieIcon}
            color="bg-bull-400"
          />
          <BalanceCard
            label="Total P/L"
            value={portfolio?.summary?.total_pl ?? 0}
            icon={portfolio?.summary?.total_pl >= 0 ? TrendingUp : TrendingDown}
            color={portfolio?.summary?.total_pl >= 0 ? 'bg-sage-400' : 'bg-coral-300'}
            isPL
          />
        </div>

        <div className="flex gap-2 mb-5 overflow-x-auto">
          {[
            { id: 'chart', label: 'Chart & Trade' },
            { id: 'portfolio', label: 'My Holdings' },
            { id: 'history', label: 'Transactions' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
                tab === t.id ? 'bg-ink text-cream' : 'bg-white text-ink/70 hover:bg-ink/5'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'chart' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="card-soft p-5 lg:order-2 lg:col-span-1">
              <p className="text-xs font-bold uppercase tracking-widest text-bull-600 mb-3">Market</p>
            <div className="relative mb-3">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none z-10" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search stocks…"
                  className="input-field py-2 !pl-12"
                />
              </div>
              <div className="space-y-1 max-h-[30rem] overflow-auto">
                {filteredMarket.map((s) => {
                  const up = s.change >= 0;
                  return (
                    <button
                      key={s.symbol}
                      onClick={() => setSelected(s.symbol)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition ${
                        selected === s.symbol ? 'bg-ink text-cream' : 'hover:bg-cream-warm'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-sm font-mono">{s.symbol}</p>
                        <p className="text-xs opacity-60 truncate">{s.name}</p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-sm font-semibold font-mono">${s.price}</p>
                        <p className={`text-xs font-semibold ${up ? 'text-bull-400' : 'text-bear-400'}`}>
                          {up ? '+' : ''}{s.changePercent}%
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-5">
              <div className="card-soft p-6">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                  <div>
                    <p className="text-xs font-mono text-ink/40">NASDAQ</p>
                    <h2 className="font-display text-3xl font-black">{quote?.symbol}</h2>
                    <p className="text-sm text-ink/60">{quote?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-4xl font-black font-mono">
                      ${quote?.price?.toFixed(2)}
                    </p>
                    <p className={`text-sm font-bold font-mono flex items-center justify-end gap-1 ${isUp ? 'text-bull-600' : 'text-bear-500'}`}>
                      {isUp ? <ArrowUp size={14}/> : <ArrowDown size={14}/>}
                      {quote?.change >= 0 ? '+' : ''}{quote?.change?.toFixed(2)} ({quote?.changePercent?.toFixed(2)}%)
                    </p>
                  </div>
                </div>

                <CandlestickChart symbol={selected} height={400} />

                <div className="grid grid-cols-4 gap-3 mt-5 text-sm">
                  <Metric label="Open" value={`$${quote?.open?.toFixed(2) ?? '—'}`} />
                  <Metric label="High" value={`$${quote?.high?.toFixed(2) ?? '—'}`} color="text-bull-600" />
                  <Metric label="Low" value={`$${quote?.low?.toFixed(2) ?? '—'}`} color="text-bear-500" />
                  <Metric label="Prev Close" value={`$${quote?.prevClose?.toFixed(2) ?? '—'}`} />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setTradeModal({ side: 'BUY', symbol: selected, price: quote?.price })}
                  className="btn-primary flex-1 bg-bull-600 hover:bg-bull-700"
                >
                  <ShoppingCart size={16} /> Paper Buy
                </button>
                <button
                  onClick={() => setTradeModal({ side: 'SELL', symbol: selected, price: quote?.price })}
                  className="btn-primary flex-1 bg-bear-500 hover:bg-bear-600"
                >
                  Paper Sell
                </button>
                <BuyThisStockButton symbol={selected} className="flex-1" />
              </div>

              <StockAnalysisPanel symbol={selected} />

              <div className="card-soft p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-ink/50 mb-2">Popular tickers</p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelected(s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold transition ${
                        selected === s ? 'bg-ink text-cream' : 'bg-cream-warm hover:bg-ink/10'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'portfolio' && (
          <div className="card-soft p-6">
            {portfolio?.portfolio?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-ink/10 text-ink/50 uppercase text-xs">
                      <th className="py-3 pr-3">Symbol</th>
                      <th className="py-3 px-3">Shares</th>
                      <th className="py-3 px-3 hidden sm:table-cell">Avg cost</th>
                      <th className="py-3 px-3">Current</th>
                      <th className="py-3 px-3 hidden md:table-cell">Value</th>
                      <th className="py-3 px-3">P/L</th>
                      <th className="py-3 pl-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.portfolio.map((p) => {
                      const up = p.pl >= 0;
                      return (
                        <tr key={p.symbol} className="border-b border-ink/5 hover:bg-cream-warm">
                          <td className="py-3 pr-3">
                            <p className="font-bold font-mono">{p.symbol}</p>
                            <p className="text-xs text-ink/50 truncate max-w-[10rem]">{p.company_name}</p>
                          </td>
                          <td className="py-3 px-3 font-mono">{parseFloat(p.shares).toFixed(2)}</td>
                          <td className="py-3 px-3 font-mono hidden sm:table-cell">${parseFloat(p.avg_buy_price).toFixed(2)}</td>
                          <td className="py-3 px-3 font-mono">${p.current_price.toFixed(2)}</td>
                          <td className="py-3 px-3 font-mono hidden md:table-cell">${p.market_value.toFixed(2)}</td>
                          <td className={`py-3 px-3 font-mono font-bold ${up ? 'text-bull-600' : 'text-bear-500'}`}>
                            {up ? '+' : ''}${p.pl.toFixed(2)}
                            <span className="block text-xs font-normal">({p.pl_pct}%)</span>
                          </td>
                          <td className="py-3 pl-3 text-right">
                            <button
                              onClick={() => { setSelected(p.symbol); setTradeModal({ side: 'SELL', symbol: p.symbol, price: p.current_price, maxShares: parseFloat(p.shares) }); }}
                              className="px-3 py-1 rounded-full bg-bear-500 text-white text-xs font-bold hover:bg-bear-600"
                            >
                              Sell
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center">
                <div className="text-6xl mb-3">📉</div>
                <p className="font-display text-xl font-bold mb-1">No holdings yet</p>
                <p className="text-ink/60">Buy your first stock to build your portfolio.</p>
                <button onClick={() => setTab('chart')} className="btn-primary mt-5">
                  Go to chart <ShoppingCart size={16}/>
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="card-soft p-6">
            {transactions.length ? (
              <div className="space-y-2">
                {transactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 hover:bg-cream-warm rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl grid place-items-center ${
                        t.transaction_type === 'BUY' ? 'bg-bull-100 text-bull-600' : 'bg-coral-300/40 text-bear-500'
                      }`}>
                        {t.transaction_type === 'BUY' ? <ArrowDown size={16}/> : <ArrowUp size={16}/>}
                      </div>
                      <div>
                        <p className="font-bold font-mono">{t.symbol} · {t.transaction_type}</p>
                        <p className="text-xs text-ink/50">
                          {parseFloat(t.shares).toFixed(2)} shares @ ${parseFloat(t.price_per_share).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold">${parseFloat(t.total_amount).toFixed(2)}</p>
                      <p className="text-xs text-ink/50">{new Date(t.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <History className="mx-auto mb-3 text-ink/20" size={48} />
                <p className="font-display text-xl font-bold mb-1">No transactions yet</p>
                <p className="text-ink/60">Your trade history will appear here.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {tradeModal && (
          <TradeModal
            {...tradeModal}
            balance={portfolio?.summary?.balance ?? user?.virtual_balance ?? 0}
            onClose={() => setTradeModal(null)}
            onConfirm={doTrade}
          />
        )}
      </AnimatePresence>
    </Layout>
  );
}

function BalanceCard({ label, value, icon: Icon, color, isPL }) {
  const positive = value >= 0;
  const displayValue = isPL
    ? `${positive ? '+' : '-'}$${Math.abs(Number(value)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (
    <div className="card-soft p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink/60">{label}</span>
        <div className={`w-9 h-9 ${color} rounded-xl grid place-items-center`}>
          <Icon size={16} className="text-ink" strokeWidth={2.4} />
        </div>
      </div>
      <p className={`font-display text-3xl font-black font-mono ${isPL ? (positive ? 'text-bull-600' : 'text-bear-500') : ''}`}>
        {displayValue}
      </p>
    </div>
  );
}

function Metric({ label, value, color = '' }) {
  return (
    <div className="bg-cream-warm rounded-xl p-3">
      <p className="text-xs text-ink/50 font-semibold uppercase tracking-wider">{label}</p>
      <p className={`font-mono font-bold ${color}`}>{value}</p>
    </div>
  );
}

function TradeModal({ side, symbol, price, maxShares, balance, onClose, onConfirm }) {
  const [shares, setShares] = useState(1);
  const total = (shares * price).toFixed(2);
  const insufficient = side === 'BUY' && total > balance;
  const tooMany = side === 'SELL' && maxShares && shares > maxShares;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm grid place-items-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-cream rounded-3xl max-w-md w-full overflow-hidden"
      >
        <div className={`p-6 text-cream ${side === 'BUY' ? 'bg-bull-600' : 'bg-bear-500'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">
                {side === 'BUY' ? 'Buy order' : 'Sell order'}
              </p>
              <h2 className="font-display text-3xl font-black">{symbol}</h2>
              <p className="text-sm opacity-80 font-mono">${price?.toFixed(2)} / share</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-cream/10 rounded-full">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-1.5">Number of shares</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={shares}
              onChange={(e) => setShares(parseFloat(e.target.value) || 0)}
              className="input-field text-2xl font-display font-bold font-mono"
            />
            {maxShares && (
              <p className="text-xs text-ink/50 mt-1">
                You own {maxShares} shares. <button onClick={() => setShares(maxShares)} className="text-bull-600 font-semibold underline">Sell all</button>
              </p>
            )}
          </div>

          <div className="p-4 bg-cream-warm rounded-2xl space-y-2 text-sm">
            <Row label="Estimated total" value={`$${total}`} bold />
            {side === 'BUY' && <Row label="Available cash" value={`$${Number(balance).toFixed(2)}`} />}
            {side === 'BUY' && <Row label="After trade" value={`$${(balance - total).toFixed(2)}`} color={insufficient ? 'text-bear-500' : ''} />}
          </div>

          {insufficient && (
            <p className="text-sm text-bear-500 font-semibold">Not enough cash for this trade.</p>
          )}
          {tooMany && (
            <p className="text-sm text-bear-500 font-semibold">You only own {maxShares} shares.</p>
          )}

          <button
            disabled={insufficient || tooMany || shares <= 0}
            onClick={() => onConfirm(side, symbol, shares)}
            className={`btn-primary w-full py-4 ${side === 'BUY' ? 'bg-bull-600 hover:bg-bull-700' : 'bg-bear-500 hover:bg-bear-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Confirm {side.toLowerCase()}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Row({ label, value, bold, color = '' }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink/60">{label}</span>
      <span className={`font-mono ${bold ? 'font-bold' : ''} ${color}`}>{value}</span>
    </div>
  );
}