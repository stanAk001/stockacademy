import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, BookOpen } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../services/api';

const categories = [
  { id: 'all', label: 'All' },
  { id: 'basics', label: 'Basics' },
  { id: 'fundamental', label: 'Fundamental' },
  { id: 'technical', label: 'Technical' },
  { id: 'risk', label: 'Risk' },
  { id: 'strategies', label: 'Strategies' },
];

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/courses')
      .then(({ data }) => data.success && setCourses(data.courses))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? courses : courses.filter((c) => c.category === filter);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-bull-600">Learning library</p>
          <h1 className="font-display text-3xl sm:text-5xl font-black leading-tight mt-1">
            All <span className="italic">courses</span>
          </h1>
          <p className="text-ink/60 mt-2 max-w-xl text-sm sm:text-base">Follow the path top-to-bottom or jump to any topic you need today.</p>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 mb-6 sm:mb-8 overflow-x-auto">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                filter === c.id ? 'bg-ink text-cream' : 'bg-white text-ink/70 hover:bg-ink/5'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card-soft p-6 h-64 animate-pulse bg-ink/5" />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filtered.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/courses/${c.slug}`}
                  className="block card-soft p-5 sm:p-6 hover:shadow-2xl hover:-translate-y-1 transition group h-full"
                >
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${c.cover_color} grid place-items-center text-2xl sm:text-3xl mb-4 sm:mb-5`}>
                    {c.icon}
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-2 flex-wrap">
                    <span className="chip bg-ink/5 text-ink/70 text-[10px] sm:text-xs">{c.difficulty}</span>
                    <span className="chip bg-ink/5 text-ink/70 capitalize text-[10px] sm:text-xs">{c.category}</span>
                  </div>
                  <h3 className="font-display text-lg sm:text-xl font-bold mb-2">{c.title}</h3>
                  <p className="text-xs sm:text-sm text-ink/60 mb-4 sm:mb-5 line-clamp-2">{c.description}</p>
                  <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-ink/5 text-xs sm:text-sm text-ink/60">
                    <span className="flex items-center gap-1 sm:gap-1.5"><BookOpen size={14} /> {c.lesson_count} lessons</span>
                    <span className="flex items-center gap-1 sm:gap-1.5"><Clock size={14} /> {c.estimated_minutes} min</span>
                  </div>
                  <div className="mt-3 sm:mt-4 flex items-center justify-between">
                    <span className="font-semibold text-bull-600 text-xs sm:text-sm">Start course</span>
                    <ArrowRight className="text-bull-600 group-hover:translate-x-1 transition" size={16} />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}