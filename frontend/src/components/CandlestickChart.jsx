import { useEffect, useRef, useState } from 'react';
import {
  createChart, ColorType, CandlestickSeries, HistogramSeries, LineSeries, AreaSeries,
} from 'lightweight-charts';
import { Loader2, TrendingUp, TrendingDown, LineChart, CandlestickChart as CandleIcon } from 'lucide-react';
import api from '../services/api';

// TradingView-style ranges: intraday (1D/5D) through to MAX.
const TIMEFRAMES = ['1D', '5D', '1W', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'MAX'];

const GREEN = '#10B981';
const RED = '#EF4444';

function calculateSMA(candles, period) {
  const out = [];
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += candles[i - j].close;
    out.push({ time: candles[i].time, value: +(sum / period).toFixed(2) });
  }
  return out;
}

// Every range delivers `time` as unix seconds. Intraday also shows the clock.
function fmtTime(t, intraday) {
  if (typeof t !== 'number') {
    return t?.year ? `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}` : String(t ?? '');
  }
  return new Date(t * 1000).toLocaleString(undefined, intraday
    ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function CandlestickChart({ symbol, height = 400, onHover }) {
  const containerRef = useRef(null);
  const onHoverRef = useRef(onHover);
  onHoverRef.current = onHover; // always call the latest handler from the crosshair sub
  const chartRef = useRef(null);
  const candleRef = useRef(null);
  const areaRef = useRef(null);
  const volumeRef = useRef(null);
  const sma20Ref = useRef(null);
  const sma50Ref = useRef(null);
  const sma200Ref = useRef(null);
  const intradayRef = useRef(false); // so the crosshair handler formats time correctly

  const [range, setRange] = useState('6M');
  const [chartType, setChartType] = useState('area'); // 'area' (beginner) | 'candle' (advanced)
  const [loading, setLoading] = useState(false);
  const [showMA, setShowMA] = useState({ sma20: true, sma50: false, sma200: false });
  const [source, setSource] = useState(null);
  const [readout, setReadout] = useState(null); // live hover values
  const [period, setPeriod] = useState(null);   // { changePct, up }

  // --- create the chart once ---
  useEffect(() => {
    if (!containerRef.current) return undefined;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#FDF8F0' },
        textColor: '#0F1419',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        attributionLogo: false,
      },
      grid: { vertLines: { color: '#0F141908' }, horzLines: { color: '#0F141910' } },
      crosshair: {
        mode: 1,
        vertLine: { color: '#0F141940', width: 1, style: 3, labelBackgroundColor: '#0F1419' },
        horzLine: { color: '#0F141940', width: 1, style: 3, labelBackgroundColor: '#0F1419' },
      },
      rightPriceScale: { borderColor: '#0F141920', textColor: '#0F141980' },
      timeScale: { borderColor: '#0F141920', timeVisible: false, secondsVisible: false },
      width: containerRef.current.clientWidth,
      height,
    });

    const area = chart.addSeries(AreaSeries, {
      lineColor: GREEN, lineWidth: 2,
      topColor: 'rgba(16,185,129,0.22)', bottomColor: 'rgba(16,185,129,0.01)',
      priceLineVisible: false,
    });
    const candle = chart.addSeries(CandlestickSeries, {
      upColor: GREEN, downColor: RED, borderUpColor: GREEN, borderDownColor: RED,
      wickUpColor: GREEN, wickDownColor: RED, visible: false,
    });
    const volume = chart.addSeries(HistogramSeries, {
      color: '#10B98140', priceFormat: { type: 'volume' }, priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

    const mk = (color, title) => chart.addSeries(LineSeries, {
      color, lineWidth: 2, priceLineVisible: false, lastValueVisible: false, title, visible: false,
    });
    const sma20 = mk('#FBBF24', 'MA20');
    const sma50 = mk('#FB923C', 'MA50');
    const sma200 = mk('#8B5CF6', 'MA200');

    chartRef.current = chart;
    areaRef.current = area;
    candleRef.current = candle;
    volumeRef.current = volume;
    sma20Ref.current = sma20;
    sma50Ref.current = sma50;
    sma200Ref.current = sma200;

    // Live readout: as the pointer moves, show that day's numbers.
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) { setReadout(null); onHoverRef.current?.(null); return; }
      const cd = param.seriesData.get(candle);
      const ad = param.seriesData.get(area);
      const close = cd?.close ?? ad?.value;
      if (close == null) { setReadout(null); onHoverRef.current?.(null); return; }
      const r = { date: fmtTime(param.time, intradayRef.current), open: cd?.open, high: cd?.high, low: cd?.low, close };
      setReadout(r);
      onHoverRef.current?.(r); // let the parent page mirror the hovered values
    });

    const onResize = () => chart.applyOptions({ width: containerRef.current.clientWidth });
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.remove(); };
  }, [height]);

  // --- load data on symbol/range ---
  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    setReadout(null);
    api.get(`/trading/candles/${encodeURIComponent(symbol)}?range=${range}`)
      .then(({ data }) => {
        if (!data.success || !candleRef.current) return;
        const candles = data.candles || [];
        setSource(data.source || null);
        intradayRef.current = Boolean(data.intraday);
        // Show clock times on the axis for intraday, plain dates otherwise.
        chartRef.current?.applyOptions({ timeScale: { timeVisible: Boolean(data.intraday) } });

        candleRef.current.setData(candles.map((c) => ({
          time: c.time, open: c.open, high: c.high, low: c.low, close: c.close,
        })));
        areaRef.current.setData(candles.map((c) => ({ time: c.time, value: c.close })));
        volumeRef.current.setData(candles.map((c) => ({
          time: c.time, value: c.volume, color: c.close >= c.open ? '#10B98140' : '#EF444440',
        })));

        sma20Ref.current.setData(calculateSMA(candles, 20));
        sma50Ref.current.setData(calculateSMA(candles, 50));
        sma200Ref.current.setData(calculateSMA(candles, 200));

        // Period return — the "is this up or down over this window" story.
        if (candles.length >= 2) {
          const first = candles[0].close;
          const last = candles[candles.length - 1].close;
          const changePct = first ? ((last - first) / first) * 100 : 0;
          const up = changePct >= 0;
          setPeriod({ changePct, up });
          const color = up ? GREEN : RED;
          areaRef.current.applyOptions({
            lineColor: color,
            topColor: up ? 'rgba(16,185,129,0.22)' : 'rgba(239,68,68,0.20)',
            bottomColor: up ? 'rgba(16,185,129,0.01)' : 'rgba(239,68,68,0.01)',
          });
        } else {
          setPeriod(null);
        }

        chartRef.current?.timeScale().fitContent();
      })
      .catch((err) => console.error('Chart load error:', err))
      .finally(() => setLoading(false));
  }, [symbol, range]);

  // --- toggle series visibility without refetching ---
  useEffect(() => {
    areaRef.current?.applyOptions({ visible: chartType === 'area' });
    candleRef.current?.applyOptions({ visible: chartType === 'candle' });
    const showLines = chartType === 'candle';
    sma20Ref.current?.applyOptions({ visible: showLines && showMA.sma20 });
    sma50Ref.current?.applyOptions({ visible: showLines && showMA.sma50 });
    sma200Ref.current?.applyOptions({ visible: showLines && showMA.sma200 });
  }, [chartType, showMA]);

  return (
    <div className="space-y-3">
      {/* Readout bar — the period story, or live hover values */}
      <div className="flex items-center justify-between gap-3 flex-wrap min-h-[34px]">
        {readout ? (
          <div className="flex items-center gap-x-3 gap-y-0.5 flex-wrap text-[11px] font-mono">
            <span className="text-ink/45">{readout.date}</span>
            {readout.open != null && <span className="text-ink/70">O <b className="text-ink">{readout.open.toFixed(2)}</b></span>}
            {readout.high != null && <span className="text-ink/70">H <b className="text-bull-600">{readout.high.toFixed(2)}</b></span>}
            {readout.low != null && <span className="text-ink/70">L <b className="text-bear-500">{readout.low.toFixed(2)}</b></span>}
            <span className="text-ink/70">Close <b className="text-ink">{readout.close.toFixed(2)}</b></span>
          </div>
        ) : period ? (
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${period.up ? 'bg-bull-100 text-bull-700' : 'bg-coral-300/40 text-bear-500'}`}>
              {period.up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {period.up ? '+' : ''}{period.changePct.toFixed(1)}%
            </span>
            <span className="text-[11px] text-ink/45">over {range === 'MAX' ? 'the max window' : range}. Hover the chart to read any day.</span>
          </div>
        ) : (
          <span className="text-[11px] text-ink/40">Hover the chart to read any day's price.</span>
        )}

        {/* Line vs Candles */}
        <div className="flex gap-1 bg-cream-warm rounded-full p-1 shrink-0">
          <TypeBtn active={chartType === 'area'} onClick={() => setChartType('area')} icon={LineChart} label="Line" />
          <TypeBtn active={chartType === 'candle'} onClick={() => setChartType('candle')} icon={CandleIcon} label="Candles" />
        </div>
      </div>

      {/* Timeframes */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-1 bg-cream-warm rounded-full p-1 w-max">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setRange(tf)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${range === tf ? 'bg-ink text-cream' : 'text-ink/60 hover:text-ink'}`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Indicators — only in candle (advanced) mode, so beginners aren't overwhelmed */}
      {chartType === 'candle' && (
        <div className="flex gap-2 text-xs">
          <MAToggle label="MA20" color="#FBBF24" active={showMA.sma20} onClick={() => setShowMA({ ...showMA, sma20: !showMA.sma20 })} />
          <MAToggle label="MA50" color="#FB923C" active={showMA.sma50} onClick={() => setShowMA({ ...showMA, sma50: !showMA.sma50 })} />
          <MAToggle label="MA200" color="#8B5CF6" active={showMA.sma200} onClick={() => setShowMA({ ...showMA, sma200: !showMA.sma200 })} />
          <span className="text-[10px] text-ink/40 self-center">Moving averages smooth out the noise to show the trend.</span>
        </div>
      )}

      <div className="relative">
        <div ref={containerRef} className="w-full bg-cream rounded-xl border border-ink/5" />
        {loading && (
          <div className="absolute inset-0 grid place-items-center bg-cream/60 rounded-xl">
            <Loader2 className="animate-spin text-ink/60" size={24} />
          </div>
        )}
      </div>

      {source === 'synthetic' && (
        <p className="text-[10px] text-coral-500 italic">
          Demo chart — real history isn't available for this symbol, so this simulates market behaviour for practice.
        </p>
      )}

      {/* Plain-English legend, adapts to the chart type */}
      <p className="text-[11px] text-ink/50 leading-relaxed">
        {chartType === 'area' ? (
          <>This line is the closing price over time. Up and to the right means the company grew. Switch to <b>Candles</b> for the daily detail.</>
        ) : (
          <>Each candle is one day: <span className="text-bull-600 font-semibold">green</span> closed higher than it opened, <span className="text-bear-500 font-semibold">red</span> closed lower. The thin wicks are the day's high and low.</>
        )}
      </p>
    </div>
  );
}

function TypeBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition ${active ? 'bg-ink text-cream' : 'text-ink/60 hover:text-ink'}`}
    >
      <Icon size={13} /> {label}
    </button>
  );
}

function MAToggle({ label, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1 rounded-full font-bold text-[10px] transition ${active ? 'bg-ink text-cream' : 'bg-cream-warm text-ink/50 hover:text-ink'}`}
    >
      <span className="w-2 h-2 rounded-sm" style={{ background: color }} />
      {label}
    </button>
  );
}
