import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Check, X, Edit3, Video, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUSES = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];

export default function AdminBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    try {
      const qs = filter === 'all' ? '' : `?status=${filter}`;
      const { data } = await api.get('/bookings/admin' + qs);
      if (data.success) setBookings(data.bookings);
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error('Admin access required');
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  if (!user?.is_admin) {
    return (
      <Layout>
        <div className="max-w-md mx-auto p-16 text-center">
          <ShieldCheck className="mx-auto mb-3 text-ink/20" size={48}/>
          <h1 className="font-display text-2xl font-bold">Admin access required</h1>
          <p className="text-ink/60 mt-2">
            Set <code>is_admin = true</code> on your user row in pgAdmin to access this page.
          </p>
        </div>
      </Layout>
    );
  }

  const quickAction = async (id, patch) => {
    try {
      await api.patch(`/bookings/admin/${id}`, patch);
      toast.success('Updated');
      load();
    } catch { toast.error('Update failed'); }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-widest text-coral-500">Admin</p>
          <h1 className="font-display text-4xl font-black">Mentorship bookings</h1>
          <p className="text-ink/60 mt-1">Review, reschedule, and confirm sessions.</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-full text-sm font-semibold capitalize transition ${
                filter === s ? 'bg-ink text-cream' : 'bg-white text-ink/70 hover:bg-ink/5'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-ink/5 animate-pulse rounded-2xl"/>)}
          </div>
        ) : bookings.length === 0 ? (
          <p className="py-10 text-center text-ink/60">No bookings in this view.</p>
        ) : (
          <div className="space-y-3">
            {bookings.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="card-soft p-5"
              >
                <div className="flex flex-col md:flex-row gap-4 md:items-center">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display text-lg font-bold">{b.name}</h3>
                      <span className="text-xs text-ink/50">· {b.email}</span>
                      {b.username && <span className="text-xs text-ink/50">· @{b.username}</span>}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap mt-1 text-sm">
                      <span className="font-semibold">{b.session_type_name}</span>
                      <span className="text-ink/40">·</span>
                      <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(b.session_date).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><Clock size={12}/> {b.start_time?.slice(0,5)}–{b.end_time?.slice(0,5)}</span>
                    </div>
                    {b.notes && (
                      <p className="text-sm text-ink/60 mt-2 italic">"{b.notes}"</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                      <span className={`chip ${b.status === 'confirmed' ? 'bg-bull-100 text-bull-700' : b.status === 'pending' ? 'bg-sun-100 text-sun-600' : 'bg-ink/5 text-ink/60'} capitalize`}>
                        {b.status}
                      </span>
                      <span className={`chip ${b.payment_status === 'paid' ? 'bg-bull-100 text-bull-700' : 'bg-coral-300/40 text-bear-500'} capitalize`}>
                        {b.payment_status}
                      </span>
                      <span className="text-ink/40 font-mono">{b.reference}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    {b.status === 'pending' && b.payment_status === 'paid' && (
                      <button onClick={() => quickAction(b.id, { status: 'confirmed' })} className="px-3 py-1.5 rounded-full bg-bull-500 text-white text-xs font-bold">
                        <Check size={12} className="inline mr-1"/>Confirm
                      </button>
                    )}
                    {b.status === 'confirmed' && (
                      <button onClick={() => quickAction(b.id, { status: 'completed' })} className="px-3 py-1.5 rounded-full bg-ink text-cream text-xs font-bold">
                        Mark complete
                      </button>
                    )}
                    <button onClick={() => setEditing(b)} className="px-3 py-1.5 rounded-full bg-ink/5 text-ink text-xs font-bold">
                      <Edit3 size={12} className="inline mr-1"/>Edit
                    </button>
                    {b.status !== 'cancelled' && b.status !== 'completed' && (
                      <button onClick={() => quickAction(b.id, { status: 'cancelled' })} className="px-3 py-1.5 rounded-full bg-bear-500 text-white text-xs font-bold">
                        <X size={12} className="inline mr-1"/>Cancel
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <EditModal booking={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }}/>
      )}
    </Layout>
  );
}

function EditModal({ booking, onClose, onSaved }) {
  const [form, setForm] = useState({
    meeting_url: booking.meeting_url || '',
    session_date: booking.session_date?.split('T')[0] || '',
    start_time: booking.start_time?.slice(0, 5) || '',
  });
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/bookings/admin/${booking.id}`, form);
      toast.success('Saved');
      onSaved();
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm grid place-items-center p-4">
      <form onSubmit={save} className="bg-cream rounded-3xl max-w-md w-full p-6">
        <h2 className="font-display text-xl font-bold mb-4">Edit booking</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold mb-1.5 flex items-center gap-1"><Video size={12}/> Meeting URL</label>
            <input type="url" className="input-field" value={form.meeting_url}
              onChange={(e) => setForm({ ...form, meeting_url: e.target.value })}
              placeholder="https://meet.google.com/xyz-abc-def"/>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">Reschedule date</label>
            <input type="date" className="input-field" value={form.session_date}
              onChange={(e) => setForm({ ...form, session_date: e.target.value })}/>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">Start time</label>
            <input type="time" className="input-field font-mono" value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}/>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
