import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const DEMO_PROFILES = {
  ADMIN: {
    phone: '9876543200',
    password: 'admin123',
    label: 'Super Admin (Dr. Vikram Sarabhai)',
    role: 'admin',
  },
  FARMER: {
    phone: '9876543210',
    password: 'farmer123',
    label: 'Farmer (Ramesh Kumar - Karnal)',
    role: 'farmer',
  },
  OFFICER: {
    phone: '9876543220',
    password: 'admin123',
    label: 'Mandi Supervisor (Rajesh Sharma)',
    role: 'centre_officer',
  },
  INSPECTOR: {
    phone: '9876543230',
    password: 'admin123',
    label: 'Quality Inspector (Dr. Sunita Verma)',
    role: 'quality_inspector',
  },
  WEIGHBRIDGE: {
    phone: '9876543240',
    password: 'admin123',
    label: 'Weighbridge Operator (Amit Patel)',
    role: 'weighbridge_operator',
  },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('kisansetu_token');
    const savedUser = localStorage.getItem('kisansetu_user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('kisansetu_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (phone, password) => {
    const res = await authAPI.login({ phone, password });
    if (res.data.success) {
      localStorage.setItem('kisansetu_token', res.data.token);
      localStorage.setItem('kisansetu_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      return res.data;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  const registerFarmer = async (formData) => {
    const res = await authAPI.registerFarmer(formData);
    if (res.data.success) {
      localStorage.setItem('kisansetu_token', res.data.token);
      localStorage.setItem('kisansetu_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      return res.data;
    }
    throw new Error(res.data.message || 'Registration failed');
  };

  const logout = () => {
    localStorage.removeItem('kisansetu_token');
    localStorage.removeItem('kisansetu_user');
    setUser(null);
  };

  const quickSwitchProfile = async (profileKey) => {
    const profile = DEMO_PROFILES[profileKey];
    if (profile) {
      return login(profile.phone, profile.password);
    }
  };

  const updateUserSession = (updatedUser, newToken) => {
    if (newToken) {
      localStorage.setItem('kisansetu_token', newToken);
    }
    if (updatedUser) {
      localStorage.setItem('kisansetu_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        registerFarmer,
        logout,
        quickSwitchProfile,
        updateUserSession,
        isFarmer: user?.role === 'farmer',
        isOfficer: ['centre_officer', 'admin'].includes(user?.role),
        isInspector: ['quality_inspector', 'admin'].includes(user?.role),
        isWeighbridge: ['weighbridge_operator', 'admin'].includes(user?.role),
        isStaff: ['centre_officer', 'quality_inspector', 'weighbridge_operator', 'admin'].includes(user?.role),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
