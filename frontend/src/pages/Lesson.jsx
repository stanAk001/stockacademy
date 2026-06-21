import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Zap, Trophy, X, Check, ArrowRight, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import { LessonVisual } from '../components/LessonVisuals';
import YouTubeEmbed from '../components/YouTubeEmbed';
import LessonTutor from '../components/LessonTutor';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

/* Parse markdown content for [[visual:id]] and [[youtube:id|title]] tokens
 * and split it into renderable segments. Each segment is either markdown
 * text or a special component invocation. */
function renderLessonContent(content) {
  if (!content) return null;
  const TOKEN = /\[\[(visual|youtube):([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = TOKEN.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'md', text: content.slice(lastIndex, match.index) });
    }
    segments.push({ kind: match[1], id: match[2].trim(), title: match[3]?.trim() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    segments.push({ kind: 'md', text: content.slice(lastIndex) });
  }

  return segments.map((s, i) => {
    if (s.kind === 'md') return <ReactMarkdown key={i}>{s.text}</ReactMarkdown>;
    if (s.kind === 'visual') return <LessonVisual key={i} id={s.id} />;
    if (s.kind === 'youtube') return <YouTubeEmbed key={i} videoId={s.id} title={s.title} />;
    return null;
  });
}

export default function Lesson() {
  const { courseSlug, lessonSlug } = useParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [lesson, setLesson] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/courses/${courseSlug}/lessons/${lessonSlug}`)
      .then(({ data }) => {
        if (data.success) {
          setLesson(data.lesson);
          setQuiz(data.quiz);
        }
      })
      .finally(() => setLoading(false));
  }, [courseSlug, lessonSlug]);

  const complete = async () => {
    setCompleting(true);
    try {
      const { data } = await api.post(`/courses/lessons/${lesson.id}/complete`);
      if (data.success) {
        if (data.xpEarned > 0) {
          toast.success(`Lesson complete! +${data.xpEarned} XP ⚡`);
        } else {
          toast.success('Already completed — nice review!');
        }
        refreshUser();
        if (quiz) setShowQuiz(true);
        else navigate(`/courses/${courseSlug}`);
      }
    } catch (err) {
      toast.error('Could not save progress');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-20">
          <div className="animate-pulse space-y-4">
            <div className="h-10 w-2/3 bg-ink/10 rounded" />
            <div className="h-4 w-full bg-ink/10 rounded" />
            <div className="h-4 w-full bg-ink/10 rounded" />
            <div className="h-4 w-3/4 bg-ink/10 rounded" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!lesson) return <Layout><div className="p-20 text-center">Lesson not found.</div></Layout>;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link to={`/courses/${courseSlug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-ink/60 hover:text-ink mb-6">
          <ArrowLeft size={16} /> Back to {lesson.course_title}
        </Link>

        <div className="mb-6 flex items-center gap-2">
          <span className="chip bg-sun-100 text-sun-600"><Zap size={12} /> +{lesson.xp_reward} XP</span>
          {quiz && <span className="chip bg-coral-300 text-ink"><Trophy size={12} /> Includes quiz</span>}
        </div>

        {/* Lesson markdown content (with embedded visuals + videos) */}
        <article className="prose-lesson">
          {renderLessonContent(lesson.content)}
        </article>

        {/* AI tutor (premium) — grounded in this lesson */}
        <LessonTutor lessonId={lesson.id} />

        {/* Complete + quiz CTA */}
        <div className="mt-12 grid sm:grid-cols-2 gap-4">
          <div className="p-6 bg-ink text-cream rounded-3xl">
            <p className="font-display text-xl font-bold mb-1">Finished reading?</p>
            <p className="text-sm text-cream/60 mb-4">Mark complete to earn <strong className="text-sun-300">+{lesson.xp_reward} XP</strong>{quiz ? ' and start the quiz' : ''}.</p>
            <button
              onClick={complete}
              disabled={completing}
              className="btn-secondary shine w-full disabled:opacity-60"
            >
              {completing ? 'Saving…' : <><CheckCircle2 size={16} /> Mark complete{quiz ? ' & take quiz' : ''}</>}
            </button>
          </div>

          {quiz && (
            <div className="p-6 bg-gradient-to-br from-coral-300 to-sun-300 rounded-3xl">
              <p className="font-display text-xl font-bold mb-1">Test what you learned</p>
              <p className="text-sm text-ink/70 mb-4">{quiz.questions?.length || 0}-question quiz · pass to earn <strong>+25 XP</strong>.</p>
              <button
                onClick={() => setShowQuiz(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-ink text-cream rounded-full font-bold text-sm hover:bg-ink-soft transition"
              >
                <Trophy size={16} /> Take the quiz now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quiz modal */}
      <AnimatePresence>
        {showQuiz && quiz && (
          <QuizModal
            quiz={quiz}
            onClose={() => { setShowQuiz(false); navigate(`/courses/${courseSlug}`); }}
          />
        )}
      </AnimatePresence>
    </Layout>
  );
}

function QuizModal({ quiz, onClose }) {
  const { refreshUser } = useAuth();
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (Object.keys(answers).length !== quiz.questions.length) {
      return toast.error('Answer all questions first');
    }
    setSubmitting(true);
    try {
      const { data } = await api.post(`/courses/quizzes/${quiz.id}/submit`, { answers });
      if (data.success) {
        setResult(data);
        if (data.passed) {
          toast.success(`Passed with ${data.score}%! +25 XP ⚡`);
          refreshUser();
        } else {
          toast(`Scored ${data.score}% — try again!`, { icon: '📚' });
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const retry = () => {
    setAnswers({});
    setResult(null);
  };

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
        className="bg-cream rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-auto"
      >
        <div className="sticky top-0 bg-cream border-b border-ink/5 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-coral-500">Quiz time</p>
            <h2 className="font-display text-xl font-bold">{quiz.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-ink/5 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!result ? (
            <>
              {quiz.questions.map((q, qi) => (
                <div key={q.id}>
                  <p className="font-display font-bold text-lg mb-3">
                    <span className="text-ink/40 mr-2">{qi + 1}.</span>
                    {q.question}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => setAnswers({ ...answers, [q.id]: i })}
                        className={`w-full text-left px-4 py-3 rounded-2xl border-2 transition font-medium ${
                          answers[q.id] === i
                            ? 'border-ink bg-ink text-cream'
                            : 'border-ink/10 hover:border-ink/30 bg-white'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <button
                onClick={submit}
                disabled={submitting}
                className="btn-primary w-full py-4 disabled:opacity-60"
              >
                {submitting ? 'Grading…' : <>Submit answers <ArrowRight size={16} /></>}
              </button>
            </>
          ) : (
            <div>
              <div className={`rounded-3xl p-8 text-center ${result.passed ? 'bg-bull-500 text-cream' : 'bg-coral-400 text-ink'}`}>
                <div className="text-6xl mb-3">{result.passed ? '🎉' : '📘'}</div>
                <p className="text-sm font-bold uppercase tracking-widest opacity-80">
                  {result.passed ? 'You passed!' : 'Not quite — try again'}
                </p>
                <p className="font-display text-5xl font-black mt-2">{result.score}%</p>
                <p className="text-sm mt-2 opacity-80">
                  {result.correct} out of {result.total} correct
                </p>
              </div>

              <div className="space-y-3 mt-6">
                {result.results.map((r, i) => {
                  const q = quiz.questions.find((x) => x.id === r.questionId);
                  return (
                    <div
                      key={r.questionId}
                      className={`p-4 rounded-2xl border-2 ${
                        r.isCorrect ? 'border-bull-400 bg-bull-50' : 'border-bear-400 bg-coral-300/20'
                      }`}
                    >
                      <p className="font-bold flex items-start gap-2">
                        {r.isCorrect ? <Check size={18} className="text-bull-600 mt-0.5 shrink-0" /> : <X size={18} className="text-bear-500 mt-0.5 shrink-0" />}
                        <span>{q.question}</span>
                      </p>
                      <p className="text-sm text-ink/70 mt-2 ml-7">
                        ✅ Correct answer: <strong>{q.options[r.correct]}</strong>
                      </p>
                      {q.explanation && (
                        <p className="text-sm text-ink/60 mt-1 ml-7 italic">{q.explanation}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 mt-6">
                {!result.passed && (
                  <button onClick={retry} className="btn-ghost flex-1">
                    <RotateCcw size={16} /> Try again
                  </button>
                )}
                <button onClick={onClose} className="btn-primary flex-1">
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
