import React, { useState, useEffect } from 'react';
import Home from './pages/Home';
import Legal from './pages/Legal';

function App() {
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (route.startsWith('#/terms')) return <Legal type="terms" />;
  if (route.startsWith('#/privacy')) return <Legal type="privacy" />;
  if (route.startsWith('#/refund')) return <Legal type="refund" />;

  return <Home />;
}

export default App;
