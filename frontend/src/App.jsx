import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import ScrollToTop from './components/ScrollToTop';

// Route components are lazy-loaded so each page (and its heavy deps — charts,
// canvas, markdown) ships as its own chunk instead of one giant bundle.
const AdminStocks = lazy(() => import('./pages/AdminStocks'));
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Pricing = lazy(() => import('./pages/Pricing'));
const VerifyUpgrade = lazy(() => import('./pages/VerifyUpgrade'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Courses = lazy(() => import('./pages/Courses'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const Lesson = lazy(() => import('./pages/Lesson'));
const Simulator = lazy(() => import('./pages/Simulator'));
const Watchlist = lazy(() => import('./pages/Watchlist'));
const Alerts = lazy(() => import('./pages/Alerts'));
const Forum = lazy(() => import('./pages/Forum'));
const ForumPost = lazy(() => import('./pages/ForumPost'));
const Profile = lazy(() => import('./pages/Profile'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const StockDetail = lazy(() => import('./pages/StockDetail'));
const Rankings = lazy(() => import('./pages/Rankings'));
const BookSession = lazy(() => import('./pages/BookSession'));
const VerifyBooking = lazy(() => import('./pages/VerifyBooking'));
const MyBookings = lazy(() => import('./pages/MyBookings'));
const AdminBookings = lazy(() => import('./pages/AdminBookings'));
const AdminHub = lazy(() => import('./pages/AdminHub'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminUserDetail = lazy(() => import('./pages/AdminUserDetail'));
const AdminForum = lazy(() => import('./pages/AdminForum'));
const AdminRevenue = lazy(() => import('./pages/AdminRevenue'));
const Certificate = lazy(() => import('./pages/Certificate'));
const CertificateVerify = lazy(() => import('./pages/CertificateVerify'));
const VerifyCertificate = lazy(() => import('./pages/VerifyCertificate'));
const CompareStocks = lazy(() => import('./pages/CompareStocks'));
const NewsScanner = lazy(() => import('./pages/NewsScanner'));
const Insights = lazy(() => import('./pages/Insights'));
const InsightArticle = lazy(() => import('./pages/InsightArticle'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const PortfolioReview = lazy(() => import('./pages/PortfolioReview'));
const AdminPortfolioReviews = lazy(() => import('./pages/AdminPortfolioReviews'));
const AdminBroadcast = lazy(() => import('./pages/AdminBroadcast'));
const Scout = lazy(() => import('./pages/Scout'));
const Setups = lazy(() => import('./pages/Setups'));
const Radar = lazy(() => import('./pages/Radar'));
const Positions = lazy(() => import('./pages/Positions'));
const Theses = lazy(() => import('./pages/Theses'));
const MyMarket = lazy(() => import('./pages/MyMarket'));
const Journal = lazy(() => import('./pages/Journal'));
const InvestmentProfile = lazy(() => import('./pages/InvestmentProfile'));

function PageLoader() {
  return <div className="min-h-screen grid place-items-center text-ink/40">Loading…</div>;
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: { background: '#0F1419', color: '#FDF8F0', borderRadius: '12px', fontWeight: '600' },
          }}
        />
        <ScrollToTop />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/certificate" element={<Certificate />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/insights/:slug" element={<InsightArticle />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/certificate/verify" element={<CertificateVerify />} />
            <Route path="/verify/:token" element={<VerifyCertificate />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
            <Route path="/courses/:slug" element={<ProtectedRoute><CourseDetail /></ProtectedRoute>} />
            <Route path="/courses/:courseSlug/lessons/:lessonSlug" element={<ProtectedRoute><Lesson /></ProtectedRoute>} />
            <Route path="/simulator" element={<ProtectedRoute><Simulator /></ProtectedRoute>} />
            <Route path="/watchlist" element={<ProtectedRoute><Watchlist /></ProtectedRoute>} />
            <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
            <Route path="/forum" element={<ProtectedRoute><Forum /></ProtectedRoute>} />
            <Route path="/forum/:id" element={<ProtectedRoute><ForumPost /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            <Route path="/stocks/:symbol" element={<ProtectedRoute><StockDetail /></ProtectedRoute>} />
            <Route path="/rankings" element={<ProtectedRoute><Rankings /></ProtectedRoute>} />
            <Route path="/compare-stocks" element={<ProtectedRoute><CompareStocks /></ProtectedRoute>} />
            <Route path="/news-scanner" element={<ProtectedRoute><NewsScanner /></ProtectedRoute>} />
            <Route path="/scout" element={<ProtectedRoute><Scout /></ProtectedRoute>} />
            <Route path="/setups" element={<ProtectedRoute><Setups /></ProtectedRoute>} />
            <Route path="/radar" element={<ProtectedRoute><Radar /></ProtectedRoute>} />
            <Route path="/positions" element={<ProtectedRoute><Positions /></ProtectedRoute>} />
            <Route path="/theses" element={<ProtectedRoute><Theses /></ProtectedRoute>} />
            <Route path="/my-market" element={<ProtectedRoute><MyMarket /></ProtectedRoute>} />
            <Route path="/journal" element={<ProtectedRoute><Journal /></ProtectedRoute>} />
            <Route path="/investment-profile" element={<ProtectedRoute><InvestmentProfile /></ProtectedRoute>} />
            <Route path="/portfolio-review" element={<ProtectedRoute><PortfolioReview /></ProtectedRoute>} />

            <Route path="/upgrade" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
            <Route path="/upgrade/verify" element={<ProtectedRoute><VerifyUpgrade /></ProtectedRoute>} />
            <Route path="/admin/stocks" element={<ProtectedRoute><AdminStocks /></ProtectedRoute>} />
            <Route path="/book-session" element={<ProtectedRoute><BookSession /></ProtectedRoute>} />
            <Route path="/book-session/verify" element={<ProtectedRoute><VerifyBooking /></ProtectedRoute>} />
            <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />

            <Route path="/admin" element={<ProtectedRoute><AdminHub /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/users/:id" element={<ProtectedRoute><AdminUserDetail /></ProtectedRoute>} />
            <Route path="/admin/forum" element={<ProtectedRoute><AdminForum /></ProtectedRoute>} />
            <Route path="/admin/revenue" element={<ProtectedRoute><AdminRevenue /></ProtectedRoute>} />
            <Route path="/admin/bookings" element={<ProtectedRoute><AdminBookings /></ProtectedRoute>} />
            <Route path="/admin/portfolio-reviews" element={<ProtectedRoute><AdminPortfolioReviews /></ProtectedRoute>} />
            <Route path="/admin/broadcast" element={<ProtectedRoute><AdminBroadcast /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
