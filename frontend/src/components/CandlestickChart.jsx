import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';
import { Loader2 } from 'lucide-react';
import api from '../services/api';

const TIMEFRAMES = [
  { id: '1M', label: '1M' },
  { id: '3M', label: '3M' },
  { id: '6M', label: '6M' },
  { id: '1Y', label: '1Y' },
  { id: '5Y', label: '5Y' },
];

function calculateSMA(candles, period) {
  const result = [];
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += candles[i - j].close;
    }
    result.push({
      time: candles[i].date,
      value: +(sum / period).toFixed(2),
    });
  }
  return result;
}

export default function CandlestickChart({ symbol, height = 400 }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const sma20Ref = useRef(null);
  const sma50Ref = useRef(null);
  const sma200Ref = useRef(null);

  const [range, setRange] = useState('6M');
  const [loading, setLoading] = useState(false);
  const [showMA, setShowMA] = useState({ sma20: true, sma50: true, sma200: false });
  const [source, setSource] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#FDF8F0' },
        textColor: '#0F1419',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      },
      grid: {
        vertLines: { color: '#0F141908' },
        horzLines: { color: '#0F141910' },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#0F141940', width: 1, style: 3 },
        horzLine: { color: '#0F141940', width: 1, style: 3 },
      },
      rightPriceScale: {
        borderColor: '#0F141920',
        textColor: '#0F141980',
      },
      timeScale: {
        borderColor: '#0F141920',
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981',
      downColor: '#EF4444',
      borderUpColor: '#10B981',
      borderDownColor: '#EF4444',
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#10B98140',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    const sma20 = chart.addSeries(LineSeries, {
      color: '#FBBF24',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      title: 'MA20',
    });
    const sma50 = chart.addSeries(LineSeries, {
      color: '#FB923C',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      title: 'MA50',
    });
    const sma200 = chart.addSeries(LineSeries, {
      color: '#EF4444',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      title: 'MA200',
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    sma20Ref.current = sma20;
    sma50Ref.current = sma50;
    sma200Ref.current = sma200;

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [height]);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);

    api.get(`/trading/candles/${symbol}?range=${range}`)
      .then(({ data }) => {
        if (!data.success || !candleSeriesRef.current) return;

        const candles = data.candles;
        setSource(data.source || 'unknown');

        const formatted = candles.map((c) => ({
          time: c.date,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));
        candleSeriesRef.current.setData(formatted);

        const volumeData = candles.map((c) => ({
          time: c.date,
          value: c.volume,
          color: c.close >= c.open ? '#10B98140' : '#EF444440',
        }));
        volumeSeriesRef.current.setData(volumeData);

        if (sma20Ref.current) sma20Ref.current.setData(showMA.sma20 ? calculateSMA(candles, 20) : []);
        if (sma50Ref.current) sma50Ref.current.setData(showMA.sma50 ? calculateSMA(candles, 50) : []);
        if (sma200Ref.current) sma200Ref.current.setData(showMA.sma200 ? calculateSMA(candles, 200) : []);

        chartRef.current?.timeScale().fitContent();
      })
      .catch((err) => {
        console.error('Chart load error:', err);
      })
      .finally(() => setLoading(false));
  }, [symbol, range, showMA]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-cream-warm rounded-full p-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              onClick={() => setRange(tf.id)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                range === tf.id
                  ? 'bg-ink text-cream'
                  : 'text-ink/60 hover:text-ink'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 text-xs">
          <MAToggle label="MA20" color="#FBBF24" active={showMA.sma20} onClick={() => setShowMA({ ...showMA, sma20: !showMA.sma20 })} />
          <MAToggle label="MA50" color="#FB923C" active={showMA.sma50} onClick={() => setShowMA({ ...showMA, sma50: !showMA.sma50 })} />
          <MAToggle label="MA200" color="#EF4444" active={showMA.sma200} onClick={() => setShowMA({ ...showMA, sma200: !showMA.sma200 })} />
        </div>
      </div>

      <div className="relative">
        <div ref={containerRef} className="w-full bg-cream rounded-xl border border-ink/5" />
        {loading && (
          <div className="absolute inset-0 grid place-items-center bg-cream/60 backdrop-blur-sm rounded-xl">
            <Loader2 className="animate-spin text-ink/60" size={24} />
          </div>
        )}
      </div>

      {source === 'synthetic' && (
        <p className="text-[10px] text-coral-500 italic">
          ⚠️ Demo chart — historical data not available for this symbol. Practice trades simulate market behavior.
        </p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-ink/50">
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-bull-600 rounded-sm"/> Up day (close &gt; open)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-bear-500 rounded-sm"/> Down day (close &lt; open)</span>
        <span>Wicks show daily high &amp; low</span>
      </div>
    </div>
  );
}

function MAToggle({ label, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1 rounded-full font-bold text-[10px] transition ${
        active ? 'bg-ink text-cream' : 'bg-cream-warm text-ink/50 hover:text-ink'
      }`}
    >
      <span className="w-2 h-2 rounded-sm" style={{ background: color }} />
      {label}
    </button>
  );
}