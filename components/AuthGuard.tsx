import React, { useState, useEffect } from 'react';
import Login from '../pages/Login';
import { useLanguage } from '../contexts/LanguageContext';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    // Check if user is authenticated
    const auth = localStorage.getItem('devcenter_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = () => {
    // Update state to reveal content without reloading the page
    setIsAuthenticated(true);
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Loading...</div>;
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
          <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">{t('auth.restricted')}</h2>
              <p className="text-slate-500">{t('auth.loginRequired')}</p>
          </div>
          <Login isEmbedded={true} onSuccess={handleLoginSuccess} />
      </div>
    </div>
  );
};

export default AuthGuard;