import { useEffect, useRef } from 'react';

// Focus an input on mount WITHOUT the browser's default behaviour of scrolling
// the page down to it. Plain `autoFocus` drags the page to the field, which is
// why form pages were opening scrolled to the middle/bottom. Attach the returned
// ref to the input instead of using the `autoFocus` attribute.
export function useAutoFocus(enabled = true) {
  const ref = useRef(null);
  useEffect(() => {
    if (enabled && ref.current) {
      ref.current.focus({ preventScroll: true });
    }
  }, [enabled]);
  return ref;
}
