import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Toaster from './components/ui/Toaster';
import LandingPage from './pages/LandingPage';
import RatesPage from './pages/RatesPage';
import PassbookPage from './pages/PassbookPage';
import B2BPortalPage from './pages/B2BPortalPage';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';

export default function App() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash && !location.state?.scrollTo) window.scrollTo({ top: 0 });
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/rates" element={<RatesPage />} />
          <Route path="/passbook" element={<PassbookPage />} />
          <Route path="/b2b" element={<B2BPortalPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}
