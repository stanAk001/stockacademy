import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminStocks from './pages/AdminStocks';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Pricing from './pages/Pricing';
import VerifyUpgrade from './pages/VerifyUpgrade';
import NotFound from './pages/NotFound';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Lesson from './pages/Lesson';
import Simulator from './pages/Simulator';
import Watchlist from './pages/Watchlist';
import Alerts from './pages/Alerts';
import Forum from './pages/Forum';
import ForumPost from './pages/ForumPost';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import StockDetail from './pages/StockDetail';
import Rankings from './pages/Rankings';
import BookSession from './pages/BookSession';
import VerifyBooking from './pages/VerifyBooking';
import MyBookings from './pages/MyBookings';
import AdminBookings from './pages/AdminBookings';
import AdminHub from './pages/AdminHub';
import AdminUsers from './pages/AdminUsers';
import AdminUserDetail from './pages/AdminUserDetail';
import AdminForum from './pages/AdminForum';
import AdminRevenue from './pages/AdminRevenue';
import Certificate from './pages/Certificate';
import CertificateVerify from './pages/CertificateVerify';
import VerifyCertificate from './pages/VerifyCertificate';

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
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/certificate" element={<Certificate />} />
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

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}