import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, Zap } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Leaderboard() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/leaderboard')
      .then(({ data }) => data.success && setList(data.leaderboard))
      .finally(() => setLoading(false));
  }, []);

  const podium = list.slice(0, 3);
  const rest = list.slice(3);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center mb-10">
          <p className="text-sm font-bold uppercase tracking-widest text-coral-500">Top learners</p>
          <h1 className="font-display text-4xl sm:text-5xl font-black leading-tight mt-1">
            The <span className="italic">leaderboard</span>.
          </h1>
          <p className="text-ink/60 mt-1">Earn XP from lessons, quizzes, and trades to climb the ranks.</p>
        </div>

        {loading ? (
          <div className="h-80 bg-ink/5 animate-pulse rounded-3xl" />
        ) : (
          <>
            {/* Podium */}
            {podium.length >= 3 && (
              <div className="grid grid-cols-3 gap-3 mb-8 items-end">
                {[1, 0, 2].map((idx, position) => {
                  const p = podium[idx];
                  const rank = idx + 1;
                  const heights = ['h-40', 'h-48', 'h-32'];
                  const colors = [
                    'bg-gradient-to-b from-bull-400 to-bull-600',
                    'bg-gradient-to-b from-sun-300 to-sun-500',
                    'bg-gradient-to-b from-coral-300 to-coral-500',
                  ];
                  return (
                    <motion.div
                      key={p?.username}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: position * 0.15 }}
                      className="flex flex-col items-center"
                    >
                      <div className="mb-2 text-center">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-ink text-cream grid place-items-center font-bold text-xl mx-auto mb-1 overflow-hidden">
                          {p?.avatar_url
                            ? <img src={p.avatar_url} alt="" className="w-full h-full rounded-full object-cover"/>
                            : p?.username?.charAt(0).toUpperCase()}
                        </div>
                        <p className="font-bold text-sm truncate max-w-[8rem]">@{p?.username}</p>
                        <p className="text-xs text-ink/60 flex items-center justify-center gap-1">
                          <Zap size={10}/> {p?.total_xp} XP
                        </p>
                      </div>
                      <div className={`w-full ${heights[rank - 1]} ${colors[rank - 1]} rounded-t-2xl flex items-start justify-center pt-3`}>
                        {rank === 1 ? <Crown className="text-ink" size={28}/>
                          : rank === 2 ? <Medal className="text-ink" size={24}/>
                          : <Trophy className="text-ink" size={20}/>}
                        <span className="ml-1 font-display text-3xl font-black">{rank}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Rest */}
            <div className="card-soft overflow-hidden">
              {rest.map((u, i) => {
                const isMe = u.username === user?.username;
                return (
                  <div
                    key={u.username}
                    className={`flex items-center gap-4 p-4 border-b last:border-0 border-ink/5 ${
                      isMe ? 'bg-sun-100' : 'hover:bg-cream-warm'
                    }`}
                  >
                    <span className="font-display text-lg font-bold text-ink/40 w-8">#{i + 4}</span>
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full"/>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sage-400 to-bull-500 grid place-items-center text-sm font-bold text-ink">
                        {u.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">
                        @{u.username} {isMe && <span className="text-xs text-sun-600 font-semibold">(you)</span>}
                      </p>
                      {u.full_name && <p className="text-xs text-ink/50 truncate">{u.full_name}</p>}
                    </div>
                    <span className="chip bg-sun-100 text-sun-600"><Zap size={12}/> {u.total_xp} XP</span>
                  </div>
                );
              })}
              {list.length === 0 && (
                <div className="p-12 text-center text-ink/60">No learners yet — be the first!</div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
