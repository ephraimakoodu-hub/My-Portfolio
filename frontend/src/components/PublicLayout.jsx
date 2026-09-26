import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { api } from '../api/client';

export default function PublicLayout() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.get('/settings').then(setSettings).catch(() => setSettings({}));
  }, []);

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Navbar name={settings?.name} />
      <main id="main-content">
        <Outlet context={{ settings }} />
      </main>
      <Footer settings={settings} />
    </>
  );
}
