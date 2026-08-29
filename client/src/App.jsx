import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';

import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import AiVoiceModal from './components/ai/AiVoiceModal';

import Home from './pages/Home';
import BookSlot from './pages/farmer/BookSlot';
import TokenPass from './pages/farmer/TokenPass';
import MyBookings from './pages/farmer/MyBookings';
import OfficerDashboard from './pages/centre/OfficerDashboard';
import PublicMandiDisplay from './pages/display/PublicMandiDisplay';
import Login from './pages/auth/Login';
import MandiAnalytics from './pages/analytics/MandiAnalytics';

function AppLayout() {
  const location = useLocation();
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // Hide Navbar and Footer on the standalone Big Screen TV page
  const isDisplayScreen = location.pathname.startsWith('/display/');

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-kisan-500 selection:text-white">
      {!isDisplayScreen && <Navbar onOpenAiModal={() => setAiModalOpen(true)} />}

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home onOpenAiModal={() => setAiModalOpen(true)} />} />
          <Route path="/book-slot" element={<BookSlot />} />
          <Route path="/token/:id" element={<TokenPass />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/centre/officer" element={<OfficerDashboard />} />
          <Route path="/display/:centreId" element={<PublicMandiDisplay />} />
          <Route path="/login" element={<Login />} />
          <Route path="/analytics" element={<MandiAnalytics />} />
        </Routes>
      </main>

      {!isDisplayScreen && <Footer />}

      <AiVoiceModal isOpen={aiModalOpen} onClose={() => setAiModalOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <Router>
          <AppLayout />
        </Router>
      </LanguageProvider>
    </AuthProvider>
  );
}
