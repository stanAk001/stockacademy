import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Heart, MessageCircle, CornerDownRight, Target } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import PremiumBadge from './PremiumBadge';
import { timeAgo } from '../lib/timeAgo';

const TYPE = {
  post_like:     { icon: Heart,          verb: 'liked your post' },
  post_comment:  { icon: MessageCircle,  verb: 'commented on your post' },
  comment_reply: { icon: CornerDownRight, verb: 'replied to your comment' },
  comment_like:  { icon: Heart,          verb: 'liked your comment' },
  price_alert:   { icon: Target,         verb: '' },
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = async () => {
    try {
      const { data } = await api.get('/notifications');
      if (data.success) { setItems(data.notifications); setUnread(data.unread); }
    } catch { /* ignore */ }
  };

  // Poll every 60s while signed in.
  useEffect(() => {
    if (!user) return undefined;
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [user]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      try { await api.post('/notifications/read'); } catch { /* ignore */ }
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="relative w-9 h-9 grid place-items-center rounded-full bg-ink/5 hover:bg-ink/10 transition"
        aria-label="Notifications"
      >
        <Bell size={18} className="text-ink/70" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 grid place-items-center rounded-full bg-coral-500 text-cream text-[10px] font-black leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 mt-2 w-80 max-w-[88vw] bg-white rounded-2xl shadow-xl border border-ink/5 overflow-hidden z-50"
            >
              <div className="px-4 py-3 border-b border-ink/5">
                <p className="font-display font-bold">Notifications</p>
              </div>
              <div className="max-h-96 overflow-auto">
                {items.length === 0 ? (
                  <div className="px-4 py-12 text-center">
                    <Bell size={24} className="text-ink/20 mx-auto mb-2" />
                    <p className="text-sm text-ink/50">No notifications yet.</p>
                    <p className="text-xs text-ink/40 mt-0.5">Likes and replies on your posts will show up here.</p>
                  </div>
                ) : items.map((n) => {
                  const t = TYPE[n.type] || { icon: Bell, verb: 'interacted with your post' };
                  const Icon = t.icon;
                  // System notifications (e.g. price alerts) have no actor — show
                  // their stored message and a system icon instead of an avatar.
                  const isSystem = !n.actor_username;
                  const to = n.type === 'price_alert' ? '/alerts' : (n.post_id ? `/forum/${n.post_id}` : '/forum');
                  return (
                    <Link
                      key={n.id}
                      to={to}
                      onClick={() => setOpen(false)}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-cream-warm transition border-b border-ink/5 last:border-0 ${n.is_read ? '' : 'bg-sun-100/50'}`}
                    >
                      {isSystem ? (
                        <div className="w-9 h-9 rounded-full bg-ink grid place-items-center shrink-0">
                          <Icon size={16} className="text-sun-300" />
                        </div>
                      ) : (
                        <div className="relative shrink-0">
                          {n.actor_avatar ? (
                            <img src={n.actor_avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sun-400 to-coral-400 grid place-items-center text-ink font-bold text-sm">
                              {n.actor_username?.charAt(0).toUpperCase() || '?'}
                            </div>
                          )}
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-ink grid place-items-center ring-2 ring-white">
                            <Icon size={11} className="text-sun-300" />
                          </span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        {isSystem ? (
                          <p className="text-sm leading-snug text-ink/85">{n.message}</p>
                        ) : (
                          <p className="text-sm leading-snug">
                            <span className="font-bold">@{n.actor_username || 'someone'}</span>
                            {n.actor_plan === 'premium' && <PremiumBadge plan="premium" size={12} className="mx-1 align-text-bottom" />}
                            <span className="text-ink/70"> {t.verb}</span>
                            {n.post_title && <span className="text-ink/45"> · “{n.post_title}”</span>}
                          </p>
                        )}
                        <p className="text-[11px] text-ink/40 mt-0.5">{timeAgo(n.created_at)}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
