import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Whenever the pathname changes, instantly scroll to the top of the window
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
