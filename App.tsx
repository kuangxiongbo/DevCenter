import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import DocViewer from './pages/DocViewer';
import Login from './pages/Login';
import Dashboard from './pages/admin/Dashboard';
import Editor from './pages/admin/Editor';
import Menus from './pages/admin/Menus';
import Users from './pages/admin/Users';
import Products from './pages/admin/Products';
import WeChatConfigPage from './pages/admin/WeChatConfig';
import AIConfigPage from './pages/admin/AIConfig';
import AuthGuard from './components/AuthGuard';
import AiAssistant from './components/AiAssistant';
import { LanguageProvider } from './contexts/LanguageContext';
import { ProductProvider } from './contexts/ProductContext';

// Layout for Public Pages
const PublicLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-white">
      <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className={`
        pt-16 transition-all duration-200 ease-in-out
        md:pl-72
      `}>
        <AuthGuard>
            <Outlet />
        </AuthGuard>
      </main>
      
      {/* Global AI Chatbot for Public Area */}
      <AiAssistant />
    </div>
  );
};

// Layout for Admin Pages (adds Global Header)
const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header toggleSidebar={() => {}} /> 
      {/* Sidebar toggle is no-op in Admin for now, or could toggle a different admin sidebar */}
      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  );
};

// Protected Admin Route (Requires Auth AND not Guest)
const ProtectedRoute: React.FC = () => {
  const isAuthenticated = localStorage.getItem('devcenter_auth') === 'true';
  const role = localStorage.getItem('devcenter_user_role');
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  // Block guests from admin area
  if (role === 'guest') return <Navigate to="/" replace />;
  
  return <Outlet />;
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <ProductProvider>
        <Router>
            <Routes>
            {/* Public Routes - Now Protected by AuthGuard inside Layout */}
            <Route element={<PublicLayout />}>
                <Route path="/" element={<Navigate to="/docs/getting-started" replace />} />
                <Route path="/docs/:slug" element={<DocViewer />} />
            </Route>

            {/* Auth Route */}
            <Route path="/login" element={<Login />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute />}>
                <Route element={<AdminLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="menus" element={<Menus />} />
                    <Route path="users" element={<Users />} />
                    <Route path="products" element={<Products />} />
                    <Route path="wechat" element={<WeChatConfigPage />} />
                    <Route path="ai" element={<AIConfigPage />} />
                </Route>
                {/* Editor has its own full-screen layout logic, so we keep it separate or verify layout compatibility. 
                    Currently Editor handles its own 'back' navigation to dashboard. */}
                <Route path="edit/:id" element={<Editor />} />
            </Route>
            </Routes>
        </Router>
      </ProductProvider>
    </LanguageProvider>
  );
};

export default App;