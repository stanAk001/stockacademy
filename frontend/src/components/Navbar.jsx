import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Menu, X, LogOut, User, LayoutDashboard, BookOpen, LineChart,
  MessagesSquare, Trophy, Star, BellRing, Sparkles, GraduationCap, Calendar,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Logo from './Logo';
import StockSearch from './StockSearch';
import NotificationBell from './NotificationBell';

const navItems = [
  { to: '/dashboard',  label: 'Dashboard', icon: LayoutDashboard },
  { to: '/rankings',   label: 'Rankings',  icon: BarChart3 },
  { to: '/courses',    label: 'Courses',   icon: BookOpen },
  { to: '/simulator',  label: 'Simulator', icon: LineChart },
  { to: '/watchlist',  label: 'Watchlist', icon: Star },
  { to: '/alerts',     label: 'Alerts',    icon: BellRing },
  { to: '/book-session', label: 'Mentorship', icon: GraduationCap },
  { to: '/forum',      label: 'Community', icon: MessagesSquare },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [newPosts, setNewPosts] = useState(0);
  const navigate = useNavigate();
  const isPremium = user?.plan === 'premium';

  const handleLogout = () => { logout(); navigate('/'); };

  // "New posts in the community" badge. Polls, and clears instantly when the
  // Forum page broadcasts that it's been opened.
  useEffect(() => {
    if (!user) return undefined;
    const fetchCount = () => api.get('/forum/new-count')
      .then(({ data }) => data.success && setNewPosts(data.count))
      .catch(() => {});
    fetchCount();
    const id = setInterval(fetchCount, 60000);
    const onSeen = () => setNewPosts(0);
    window.addEventListener('forum-seen', onSeen);
    return () => { clearInterval(id); window.removeEventListener('forum-seen', onSeen); };
  }, [user]);

  const navBadge = (to) =>
    to === '/forum' && newPosts > 0 ? (
      <span className="ml-1 min-w-[16px] h-4 px-1 grid place-items-center rounded-full bg-coral-500 text-cream text-[9px] font-black leading-none">
        {newPosts > 9 ? '9+' : newPosts}
      </span>
    ) : null;

  return (
    <header className="sticky top-0 z-40 bg-cream/85 backdrop-blur-md border-b border-ink/5">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        <Logo />

        {/* Search bar - hidden on small screens */}
        <div className="hidden md:block flex-1 max-w-md">
          <StockSearch />
        </div>

        {/* Auth actions */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              {!isPremium && (
                <Link to="/upgrade" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-coral-400 to-sun-400 text-ink text-xs font-bold rounded-full hover:scale-105 transition">
                  <Sparkles size={12}/> Upgrade
                </Link>
              )}
              <NotificationBell />
              <div className="relative">
                <button onClick={() => setProfileOpen(v => !v)}
                  className={`flex items-center gap-2 p-1 pr-3 rounded-full transition ${
                    isPremium ? 'bg-gradient-to-r from-coral-400 to-sun-400' : 'bg-ink/5 hover:bg-ink/10'
                  }`}>
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.username} className="w-8 h-8 rounded-full object-cover"/>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sun-400 to-coral-400 grid place-items-center text-ink font-bold text-sm">
                      {user.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="hidden sm:block text-sm font-semibold max-w-[110px] truncate">
                    {user.username}{isPremium && <span className="ml-1">⭐</span>}
                  </span>
                </button>

                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-ink/5 overflow-hidden z-20">
                      <div className="p-4 border-b border-ink/5">
                        <p className="font-bold text-sm truncate">{user.full_name || user.username}</p>
                        <p className="text-xs text-ink/60 truncate">{user.email}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="chip bg-sun-100 text-sun-600">⚡ {user.total_xp} XP</span>
                          {isPremium && <span className="chip bg-gradient-to-r from-coral-400 to-sun-400 text-ink">⭐ Premium</span>}
                        </div>
                      </div>
                      <Link to="/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-3 hover:bg-cream-warm text-sm font-medium">
                        <User size={16}/> Profile
                      </Link>
                      <Link to="/my-bookings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-3 hover:bg-cream-warm text-sm font-medium">
                        <Calendar size={16}/> My sessions
                      </Link>
                      {user.is_admin && (
                        <Link to="/admin/bookings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-3 hover:bg-cream-warm text-sm font-medium text-coral-500">
                          <GraduationCap size={16}/> Admin bookings
                        </Link>
                      )}
                      {!isPremium && (
                        <Link to="/upgrade" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-3 hover:bg-cream-warm text-sm font-semibold text-coral-500">
                          <Sparkles size={16}/> Upgrade to Premium
                        </Link>
                      )}
                      <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-3 hover:bg-cream-warm text-sm font-medium text-bear-500">
                        <LogOut size={16}/> Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link to="/login" className="px-4 py-2 text-sm font-semibold text-ink hover:text-bull-600 transition">Log in</Link>
              <Link to="/signup" className="px-4 py-2 text-sm font-bold bg-ink text-cream rounded-full hover:bg-ink-soft transition">Get started</Link>
            </div>
          )}

          {user && (
            <button onClick={() => setOpen(!open)} className="lg:hidden p-2 rounded-full hover:bg-ink/5" aria-label="Menu">
              {open ? <X size={22}/> : <Menu size={22}/>}
            </button>
          )}
        </div>
      </nav>

      {/* Mobile menu */}
      {user && open && (
        <div className="lg:hidden border-t border-ink/5 bg-cream">
          <div className="px-4 py-3 space-y-1">
            <div className="md:hidden mb-3"><StockSearch inline /></div>
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition ${
                    isActive ? 'bg-ink text-cream' : 'text-ink/70 hover:bg-ink/5'
                  }`
                }>
                <item.icon size={18}/> {item.label} {navBadge(item.to)}
              </NavLink>
            ))}
            {!isPremium && (
              <NavLink to="/upgrade" onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold bg-gradient-to-r from-coral-400 to-sun-400 text-ink">
                <Sparkles size={18}/> Upgrade to Premium
              </NavLink>
            )}
          </div>
        </div>
      )}

      {/* Desktop secondary nav (only for logged-in users) */}
      {user && (
        <div className="hidden lg:block border-t border-ink/5 bg-cream/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-11 flex items-center gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                    isActive ? 'bg-ink text-cream' : 'text-ink/60 hover:text-ink hover:bg-ink/5'
                  }`
                }>
                <item.icon size={13}/> {item.label} {navBadge(item.to)}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
