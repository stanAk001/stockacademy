import { useEffect, useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Per-entry scroll memory: clicking a link opens the new page at the top, but
// pressing Back/Forward returns you to the exact spot you were on that page.
//
// (The underlying scroll fix lives in index.css — <body> must not be a nested
// scroll container, or window.scrollTo can't reach the real scroll position.)
const scrollPositions = new Map();

export default function ScrollToTop() {
  const { key } = useLocation();
  const navType = useNavigationType(); // 'POP' (back/forward) | 'PUSH' | 'REPLACE'

  // We manage scroll ourselves — stop the browser from also trying to restore.
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Remember where we are on the CURRENT history entry as the user scrolls.
  useEffect(() => {
    const remember = () => scrollPositions.set(key, window.scrollY);
    window.addEventListener('scroll', remember, { passive: true });
    return () => window.removeEventListener('scroll', remember);
  }, [key]);

  // On entering a route:
  //   • Back/Forward (POP) → restore the saved spot for that entry.
  //   • New navigation (PUSH/REPLACE) → start at the very top.
  useLayoutEffect(() => {
    if (navType === 'POP') {
      const y = scrollPositions.get(key) ?? 0;
      window.scrollTo(0, y);
      // Content may still be settling — re-apply briefly so we land on the spot.
      const raf = requestAnimationFrame(() => window.scrollTo(0, y));
      const t = setTimeout(() => window.scrollTo(0, y), 200);
      return () => { cancelAnimationFrame(raf); clearTimeout(t); };
    }

    window.scrollTo(0, 0);
    const raf = requestAnimationFrame(() => window.scrollTo(0, 0));
    const t = setTimeout(() => window.scrollTo(0, 0), 120);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, [key, navType]);

  return null;
}
