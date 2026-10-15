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
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AuthGate from './components/auth/AuthGate';

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
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/rates" element={<RatesPage />} />
          <Route element={<AuthGate roles={['CUSTOMER']} />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/passbook" element={<PassbookPage />} />
            <Route path="/b2b" element={<B2BPortalPage />} />
          </Route>
          <Route element={<AuthGate roles={['ADMIN']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
          <Route element={<AuthGate roles={['AGENT']} />}>
            <Route path="/agent" element={<div className="container-page py-12"><h1 className="text-3xl font-extrabold">Pickup agent app</h1><p className="mt-2 text-slate-600">Open the ScrapGullak mobile app to manage your assigned pickups.</p></div>} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}
