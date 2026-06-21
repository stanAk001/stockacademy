import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Start every navigation/reload at the top — never let the browser silently
// restore the previous scroll position once a page's data loads.
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

// This app does NOT use a service worker. If a stale one from a previous app
// on this origin (dev ports like localhost:5173 get reused across projects) is
// registered, it can hijack navigations and make pages download as .htm.
// Proactively unregister any we find and drop their caches.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations?.()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => {});
  if (window.caches?.keys) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#0F1419',
                color: '#FDF8F0',
                borderRadius: '16px',
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: 500,
              },
              success: { iconTheme: { primary: '#10B981', secondary: '#FDF8F0' } },
              error: { iconTheme: { primary: '#F43F5E', secondary: '#FDF8F0' } },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
