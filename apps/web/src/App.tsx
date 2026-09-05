import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import Home from './pages/Home';
import Download from './pages/Download';
import Legal from './pages/Legal';

function App() {
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  let content = <Home />;
  if (route.startsWith('#/download')) {
    content = <Download />;
  } else if (route.startsWith('#/terms')) {
    content = <Legal type="terms" />;
  } else if (route.startsWith('#/privacy')) {
    content = <Legal type="privacy" />;
  }

  return (
    <>
      {content}
      <Analytics />
    </>
  );
}

export default App;
