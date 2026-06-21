import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Circle, Clock, Zap } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../services/api';

export default function CourseDetail() {
  const { slug } = useParams();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/courses/${slug}`)
      .then(({ data }) => {
        if (data.success) {
          setCourse(data.course);
          setLessons(data.lessons);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-20">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-ink/10 rounded" />
            <div className="h-12 w-3/4 bg-ink/10 rounded" />
            <div className="h-4 w-full bg-ink/10 rounded" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!course) return <Layout><div className="p-20 text-center">Course not found.</div></Layout>;

  const completedCount = lessons.filter((l) => l.completed).length;
  const progress = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link to="/courses" className="inline-flex items-center gap-2 text-sm font-semibold text-ink/60 hover:text-ink mb-6">
          <ArrowLeft size={16} /> All courses
        </Link>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative overflow-hidden rounded-[2rem] p-8 sm:p-12 mb-10 bg-gradient-to-br ${course.cover_color} text-ink`}
        >
          <div className="absolute -top-6 -right-6 text-ink/10 font-display text-[10rem] font-black leading-none">
            {course.icon}
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <span className="chip bg-ink text-cream">{course.difficulty}</span>
              <span className="chip bg-ink/10 text-ink capitalize">{course.category}</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-black leading-[1.05] mb-4">{course.title}</h1>
            <p className="text-lg text-ink/80 max-w-2xl">{course.description}</p>

            <div className="flex flex-wrap items-center gap-5 mt-6 text-sm font-semibold">
              <span className="flex items-center gap-1.5"><Clock size={16} /> {course.estimated_minutes} minutes</span>
              <span>·</span>
              <span>{lessons.length} lessons</span>
            </div>

            {/* Progress bar */}
            {lessons.length > 0 && (
              <div className="mt-6">
                <div className="flex justify-between text-sm font-semibold mb-1.5">
                  <span>Your progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-ink/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-ink"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Lesson list */}
        <h2 className="font-display text-2xl font-bold mb-4">Lessons in this course</h2>
        <div className="space-y-3">
          {lessons.map((lesson, idx) => (
            <motion.div
              key={lesson.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <Link
                to={`/courses/${slug}/lessons/${lesson.slug}`}
                className="flex items-center gap-4 card-soft p-5 hover:shadow-lg hover:-translate-y-0.5 transition group"
              >
                <div className="shrink-0">
                  {lesson.completed
                    ? <CheckCircle2 className="text-bull-500" size={28} />
                    : <Circle className="text-ink/20" size={28} />}
                </div>
                <span className="font-mono text-xs text-ink/40 font-semibold w-8">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg font-bold truncate">{lesson.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-ink/50 mt-0.5">
                    <span className="flex items-center gap-1"><Zap size={12} /> +{lesson.xp_reward} XP</span>
                    {lesson.completed && <span className="text-bull-600 font-semibold">Completed</span>}
                  </div>
                </div>
                <span className="text-sm font-semibold text-bull-600 hidden sm:inline opacity-0 group-hover:opacity-100 transition">
                  {lesson.completed ? 'Review' : 'Start'} →
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
