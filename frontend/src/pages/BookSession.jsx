import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Calendar, Clock, Check, ShieldAlert, ArrowRight, Sparkles,
  Video, MessageCircle, BookOpen, LineChart as LineIcon, Lock, Loader2, Globe,
} from 'lucide-react';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const formatMoney = (kobo, currency = 'NGN') => {
  const v = kobo / 100;
  try {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v);
  } catch {
    return `${currency} ${v.toLocaleString()}`;
  }
};

// USD pricing for international users (matches backend defaults)
const USD_PRICING = {
  1: 10,
  2: 20,
  3: 70,
};

const formatUsd = (cents) => `$${(cents / 100).toFixed(0)}`;

export default function BookSession() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselected = searchParams.get('type');

  const [sessionTypes, setSessionTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [step, setStep] = useState('choose');
  const [geo, setGeo] = useState(null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  useEffect(() => {
    api.get('/geo').then(({ data }) => data.success && setGeo(data));
    api.get('/bookings/session-types')
      .then(({ data }) => {
        if (data.success) {
          setSessionTypes(data.session_types);
          if (preselected) {
            const match = data.session_types.find((s) => s.key === preselected);
            if (match) {
              setSelectedType(match);
              setStep('book');
            }
          }
        }
      });
  }, [preselected]);

  const switchCountry = async (code) => {
    const { data } = await api.get(`/geo?country=${code}`);
    if (data.success) {
      setGeo(data);
      setShowCountryPicker(false);
    }
  };

  const handlePick = (type) => {
    if (type.premium_only && user?.plan !== 'premium') {
      toast.error('This tier is for Premium members. Upgrade first.');
      navigate('/upgrade');
      return;
    }
    setSelectedType(type);
    setStep('book');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const useFlutterwave = geo?.processor === 'flutterwave';

  const priceFor = (sessionType) => {
    if (useFlutterwave) {
      const usd = USD_PRICING[sessionType.id] || 10;
      return formatUsd(usd * 100);
    }
    return formatMoney(sessionType.price_kobo, sessionType.currency);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* HERO */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-gradient-to-br from-sun-300 via-coral-300 to-coral-400 rounded-[2rem] p-8 sm:p-12 mb-10 overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-ink/10 rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-cream/30 rounded-full blur-2xl" />
          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ink text-cream text-xs font-bold mb-5">
              <Sparkles size={14} className="text-sun-300" /> 1-ON-1 MENTORSHIP
            </div>
            <h1 className="font-display text-4xl sm:text-6xl font-black leading-[1.03] mb-4">
              Book a private<br />
              <span className="italic">stock mentorship session.</span>
            </h1>
            <p className="text-lg text-ink/80 max-w-xl">
              Educational 1-on-1 coaching on technical analysis, risk management, and live chart breakdowns — focused entirely on helping you <em>learn</em>, not on managing your money.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <Chip icon={LineIcon}>Chart breakdown</Chip>
              <Chip icon={BookOpen}>Fundamental analysis</Chip>
              <Chip icon={Video}>Live Google Meet</Chip>
            </div>
          </div>
        </motion.div>

        {/* Country / currency switcher */}
        {geo && (
          <div className="flex items-center justify-center gap-2 mb-6 text-xs text-ink/60">
            <Globe size={12} />
            {!showCountryPicker ? (
              <>
                <span>Showing prices for <strong className="text-ink">{geo.country_name || geo.country}</strong></span>
                <button onClick={() => setShowCountryPicker(true)} className="text-coral-500 hover:underline font-bold">change</button>
              </>
            ) : (
              <div className="flex gap-1.5">
                <button onClick={() => switchCountry('NG')} className="px-3 py-1 rounded-full bg-bull-100 text-bull-700 font-bold hover:bg-bull-200 transition">🇳🇬 Nigeria (₦)</button>
                <button onClick={() => switchCountry('US')} className="px-3 py-1 rounded-full bg-sun-100 text-sun-600 font-bold hover:bg-sun-200 transition">🌍 International ($)</button>
              </div>
            )}
          </div>
        )}

        {step === 'choose' && (
          <ChooseStep sessionTypes={sessionTypes} onPick={handlePick} user={user} priceFor={priceFor} />
        )}

        {step === 'book' && selectedType && (
          <BookStep
            sessionType={selectedType}
            onBack={() => setStep('choose')}
            user={user}
            geo={geo}
            useFlutterwave={useFlutterwave}
            priceFor={priceFor}
          />
        )}

        {/* Disclaimer */}
        <div className="mt-12 bg-sun-100 rounded-2xl p-5 flex gap-3 max-w-3xl mx-auto">
          <ShieldAlert size={20} className="text-sun-600 shrink-0 mt-0.5" />
          <div className="text-sm text-ink/70 leading-relaxed">
            <strong>Educational sessions only.</strong> These sessions teach you how to analyse stocks and build your own informed decisions.
            They are <strong>not</strong> personalised investment advice and <strong>not</strong> a substitute for a licensed financial adviser.
            Nothing said in a session guarantees any particular outcome in real markets.
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Chip({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-ink/10 px-3 py-1.5 rounded-full text-xs font-semibold">
      <Icon size={14} /> {children}
    </span>
  );
}

/* ============================================
 *  STEP 1: Choose a session type
 * ============================================ */
function ChooseStep({ sessionTypes, onPick, user, priceFor }) {
  return (
    <div>
      <div className="text-center mb-8 max-w-xl mx-auto">
        <p className="text-sm font-bold uppercase tracking-widest text-bull-600">Step 1 of 2</p>
        <h2 className="font-display text-3xl sm:text-4xl font-black leading-tight mt-1">
          Choose the session that fits you.
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {sessionTypes.map((s, i) => {
          const locked = s.premium_only && user?.plan !== 'premium';
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`card-soft p-7 flex flex-col relative overflow-hidden ${
                s.key === 'deep' ? 'ring-4 ring-ink shadow-2xl' : ''
              }`}
            >
              {s.key === 'deep' && (
                <div className="absolute top-0 right-0 bg-ink text-cream text-xs font-bold tracking-widest px-4 py-1 rounded-bl-2xl">
                  POPULAR
                </div>
              )}

              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} grid place-items-center text-2xl mb-5`}>
                {s.icon}
              </div>

              <h3 className="font-display text-2xl font-bold mb-1">{s.name}</h3>
              <p className="text-sm text-ink/60 mb-5 leading-relaxed">{s.description}</p>

              <div className="flex items-baseline gap-1 mb-5">
                <span className="font-display text-4xl font-black">{priceFor(s)}</span>
                <span className="text-ink/50 text-sm">/ session</span>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {(s.features || []).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <div className="mt-0.5 w-4 h-4 rounded-full bg-ink text-sun-300 grid place-items-center shrink-0">
                      <Check size={10} strokeWidth={3} />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>

              {locked ? (
                <button className="btn-ghost w-full opacity-80 cursor-not-allowed">
                  <Lock size={14} /> Premium only
                </button>
              ) : (
                <button onClick={() => onPick(s)} className="btn-primary w-full">
                  Book now <ArrowRight size={16} />
                </button>
              )}

              {s.premium_only && (
                <p className="text-[10px] text-ink/50 mt-2 text-center uppercase tracking-widest">
                  Premium members only
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================
 *  STEP 2: Booking form
 * ============================================ */
function BookStep({ sessionType, onBack, user, geo, useFlutterwave, priceFor }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.full_name || '',
    email: user?.email || '',
    phone: '',
    date: '',
    start_time: '',
    notes: '',
  });
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);

  const nextDates = useMemo(() => {
    const arr = [];
    const d = new Date();
    for (let i = 0; i < 30; i++) {
      const copy = new Date(d);
      copy.setDate(d.getDate() + i);
      arr.push(copy.toISOString().split('T')[0]);
    }
    return arr;
  }, []);

  useEffect(() => {
    if (!form.date) return;
    setLoadingSlots(true);
    setForm((f) => ({ ...f, start_time: '' }));
    api.get('/bookings/available-slots', {
      params: { session_type_id: sessionType.id, date: form.date },
    })
      .then(({ data }) => data.success && setSlots(data.slots))
      .finally(() => setLoadingSlots(false));
  }, [form.date, sessionType.id]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.date || !form.start_time) {
      return toast.error('Please fill in all required fields');
    }
    setBooking(true);
    try {
      const payload = {
        session_type_id: sessionType.id,
        name: form.name,
        email: form.email,
        phone: form.phone,
        date: form.date,
        start_time: form.start_time,
        notes: form.notes,
        country: geo?.country,
      };

      console.log('Sending booking payload:', payload);

      const endpoint = useFlutterwave
        ? '/bookings/initialize-international'
        : '/bookings/initialize';

      const { data } = await api.post(endpoint, payload);

      if (data.success) {
        if (data.authorization_url) {
          toast.success('Redirecting to secure payment…');
          window.location.href = data.authorization_url;
          return;
        }
        const ref = data.booking?.reference;
        toast.success('Booking created. Verifying payment…');
        navigate(`/book-session/verify?reference=${ref}&demo=1`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  const isToday = form.date === new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={onBack} className="text-sm font-semibold text-ink/60 hover:text-ink mb-4">
        ← Pick a different session
      </button>

      <div className="text-center mb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-bull-600">Step 2 of 2</p>
        <h2 className="font-display text-3xl sm:text-4xl font-black leading-tight mt-1">
          Pick a date & time.
        </h2>
      </div>

      {/* Selected summary */}
      <div className={`rounded-3xl p-5 mb-6 bg-gradient-to-br ${sessionType.color} flex items-center gap-4`}>
        <div className="text-3xl">{sessionType.icon}</div>
        <div className="flex-1">
          <p className="font-display font-bold text-lg">{sessionType.name}</p>
          <p className="text-sm text-ink/70">{sessionType.duration_minutes} minutes · {priceFor(sessionType)}</p>
        </div>
      </div>

      <form onSubmit={submit} className="card-soft p-6 sm:p-8 space-y-5">
        {/* Contact */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5">Full name</label>
            <input
              required
              className="input-field"
              placeholder="Jane Doe"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">Email</label>
            <input
              required
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5">Phone (optional)</label>
          <input
            type="tel"
            className="input-field"
            placeholder="+234 ..."
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>

        {/* Date scroller */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold mb-2">
            <Calendar size={14} /> Pick a date
          </label>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {nextDates.map((d) => {
              const date = new Date(d + 'T00:00:00');
              const day = date.toLocaleDateString('en', { weekday: 'short' });
              const dayN = date.getDate();
              const month = date.toLocaleDateString('en', { month: 'short' });
              const active = form.date === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setForm({ ...form, date: d })}
                  className={`shrink-0 w-20 rounded-2xl border-2 p-3 text-center transition ${
                    active ? 'bg-ink text-cream border-ink' : 'border-ink/10 hover:border-ink/30 bg-white'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold opacity-70">{day}</div>
                  <div className="font-display text-2xl font-black">{dayN}</div>
                  <div className="text-[10px] font-semibold">{month}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        {form.date && (
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold mb-2">
              <Clock size={14} /> Pick a start time (Africa/Lagos)
            </label>
            {loadingSlots ? (
              <div className="flex items-center gap-2 text-ink/50">
                <Loader2 className="animate-spin" size={16} /> Loading slots…
              </div>
            ) : slots.length === 0 ? (
              <div className="p-4 bg-cream-warm rounded-2xl text-sm text-ink/60">
                No available slots on this date. {isToday ? 'Try tomorrow.' : 'Try another day.'}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slots.map((s) => {
                  const active = form.start_time === s.start;
                  return (
                    <button
                      key={s.start}
                      type="button"
                      onClick={() => setForm({ ...form, start_time: s.start })}
                      className={`py-3 rounded-xl border-2 font-mono text-sm font-semibold transition ${
                        active ? 'bg-ink text-cream border-ink' : 'border-ink/10 hover:border-ink/30 bg-white'
                      }`}
                    >
                      {s.start}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold mb-1.5">Notes (optional)</label>
          <textarea
            rows={3}
            className="input-field resize-none"
            placeholder="What would you like to focus on? E.g. 'I want to understand how to read RSI on TSLA.'"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        <button
          type="submit"
          disabled={booking || !form.date || !form.start_time}
          className="btn-primary w-full py-4 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {booking ? (
            <><Loader2 className="animate-spin" size={16}/> Processing…</>
          ) : (
            <>Continue to payment · {priceFor(sessionType)} <ArrowRight size={16}/></>
          )}
        </button>

        <p className="text-xs text-ink/50 text-center">
          You'll be redirected to {useFlutterwave ? 'Flutterwave' : 'Paystack'} to complete payment securely. Your booking is only confirmed after payment.
        </p>
      </form>
    </div>
  );
}