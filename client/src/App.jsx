import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';

import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import AiVoiceModal from './components/ai/AiVoiceModal';
import ProtectedRoute from './components/auth/ProtectedRoute';

import Home from './pages/Home';
import BookSlot from './pages/farmer/BookSlot';
import TokenPass from './pages/farmer/TokenPass';
import MyBookings from './pages/farmer/MyBookings';
import OfficerDashboard from './pages/centre/OfficerDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import PublicMandiDisplay from './pages/display/PublicMandiDisplay';
import Login from './pages/auth/Login';
import MandiAnalytics from './pages/analytics/MandiAnalytics';
import Profile from './pages/account/Profile';

function AppLayout() {
  const location = useLocation();
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // Hide Navbar and Footer on the standalone Big Screen TV page
  const isDisplayScreen = location.pathname.startsWith('/display');

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-kisan-500 selection:text-white">
      {!isDisplayScreen && <Navbar onOpenAiModal={() => setAiModalOpen(true)} />}

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home onOpenAiModal={() => setAiModalOpen(true)} />} />
          <Route
            path="/book-slot"
            element={
              <ProtectedRoute allowedRoles={['farmer', 'admin']}>
                <BookSlot />
              </ProtectedRoute>
            }
          />
          <Route path="/token/:id" element={<TokenPass />} />
          <Route
            path="/my-bookings"
            element={
              <ProtectedRoute allowedRoles={['farmer', 'admin']}>
                <MyBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/centre/officer"
            element={
              <ProtectedRoute allowedRoles={['centre_officer', 'quality_inspector', 'weighbridge_operator', 'admin']}>
                <OfficerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/display" element={<PublicMandiDisplay />} />
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
    <ThemeProvider>
      <AuthProvider>
        <LanguageProvider>
          <Router>
            <AppLayout />
          </Router>
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}