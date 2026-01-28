import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Terminal, QrCode, Check, Shield } from '../components/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { getUsers, saveUser, getWeChatConfig } from '../services/storage';
import { User, WeChatConfig } from '../types';

interface LoginProps {
  isEmbedded?: boolean;
  onSuccess?: () => void;
}

const Login: React.FC<LoginProps> = ({ isEmbedded = false, onSuccess }) => {
  const [view, setView] = useState<'login' | 'register' | 'bind' | 'pending_approval'>('login');
  const [loginMethod, setLoginMethod] = useState<'scan' | 'password'>('password');
  
  // Configuration
  const [wechatConfig, setWeChatConfig] = useState<WeChatConfig | null>(null);

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  // Transient state for registration binding
  const [registeredUser, setRegisteredUser] = useState<User | null>(null);

  // UI State
  const [error, setError] = useState('');
  const [scanStatus, setScanStatus] = useState<'waiting' | 'scanned' | 'success'>('waiting');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    const config = getWeChatConfig();
    setWeChatConfig(config);
    // If enabled, default to scan for better UX, else password
    if (config.enabled && !isEmbedded) {
        setLoginMethod('scan');
    } else {
        setLoginMethod('password');
    }
  }, [isEmbedded]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        if (user.status === 'PENDING') {
            setError(t('login.error.pending'));
            return;
        }
        completeLogin(user);
    } else {
      setError(t('login.error'));
    }
  };

  const completeLogin = (user: User) => {
      localStorage.setItem('devcenter_auth', 'true');
      localStorage.setItem('devcenter_user_role', user.role);
      localStorage.setItem('devcenter_username', user.displayName);
      
      // Notify app of auth change
      window.dispatchEvent(new Event('auth-change'));
      
      if (onSuccess) {
          onSuccess();
      } else {
          // Check for return location in state
          const from = (location.state as any)?.from?.pathname;
          if (from) {
              navigate(from);
          } else {
              // If guest, go to home, else go to admin
              if (user.role === 'guest') {
                navigate('/');
              } else {
                navigate('/admin');
              }
          }
      }
  };

  const handleRegister = (e: React.FormEvent) => {
      e.preventDefault();
      if (!username || !password) {
          setError(t('login.error'));
          return;
      }
      
      const newUser: User = {
          id: `user_${Date.now()}`,
          username,
          password,
          displayName: displayName || username,
          role: 'guest', // Default role is now Guest (Visitor)
          status: 'PENDING', // Still requires approval
      };
      
      saveUser(newUser);
      setRegisteredUser(newUser);
      
      // Logic: If WeChat enabled, go to Bind. If not, go to Pending Approval screen directly.
      if (wechatConfig?.enabled) {
          setView('bind'); 
      } else {
          setView('pending_approval');
      }
  };

  const getWeChatQrUrl = () => {
      if (!wechatConfig || !wechatConfig.appId) return '';
      
      // Construct the real WeChat OAuth URL
      const oauthUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${wechatConfig.appId}&redirect_uri=${encodeURIComponent(wechatConfig.callbackUrl)}&response_type=code&scope=snsapi_login&state=STATE#wechat_redirect`;
      
      // Use a public API to generate the QR code image for this URL
      // This visualizes the configuration accurately
      return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(oauthUrl)}`;
  };

  const simulateWeChatScan = (isBind: boolean) => {
      if (scanStatus !== 'waiting') return;
      setScanStatus('scanned');
      
      setTimeout(() => {
          setScanStatus('success');
          
          if (isBind && registeredUser) {
              const mockOpenId = `wx_${Math.random().toString(36).substring(7)}`;
              const updatedUser = { ...registeredUser, wechatOpenId: mockOpenId };
              saveUser(updatedUser);
              
              // After binding, go to pending approval, don't auto login
              setTimeout(() => setView('pending_approval'), 1000);
          } else if (!isBind) {
              // Login Flow simulation
              const users = getUsers();
              // Find first user with openId for demo, or match a specific mocked one
              const user = users.find(u => u.wechatOpenId); 
              if (user) {
                   if (user.status === 'PENDING') {
                       setError(t('login.error.pending'));
                       setTimeout(() => setScanStatus('waiting'), 2000);
                       return;
                   }
                  setTimeout(() => completeLogin(user), 500);
              } else {
                  setError(t('login.noBindAccount'));
                  setTimeout(() => setScanStatus('waiting'), 2000);
              }
          }
      }, 1500);
  };

  const resetState = () => {
      setError('');
      setScanStatus('waiting');
      setUsername('');
      setPassword('');
  }

  // Styles adjustment for embedded mode
  const containerClass = isEmbedded 
    ? "w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100 mx-auto" 
    : "min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4";
  
  const innerClass = isEmbedded ? "" : "w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100";

  return (
    <div className={containerClass}>
      <div className={innerClass}>
        <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg mb-4">
                <Terminal className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 text-center">
                {view === 'login' && t('login.title')}
                {view === 'register' && t('login.register')}
                {view === 'bind' && t('login.bind')}
                {view === 'pending_approval' && t('login.pendingTitle')}
            </h1>
            <p className="text-slate-500 text-sm mt-2 text-center">
                {view === 'login' && t('login.subtitle')}
                {view === 'register' && t('login.registerSubtitle')}
                {view === 'bind' && t('login.bindSubtitle')}
            </p>
        </div>

        {/* LOGIN VIEW */}
        {view === 'login' && (
            <>
                {/* Tabs - Only show if WeChat is enabled */}
                {wechatConfig?.enabled && (
                    <div className="flex border-b border-slate-100 mb-6">
                        <button 
                            onClick={() => { setLoginMethod('scan'); resetState(); }}
                            className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${loginMethod === 'scan' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            {t('login.scan')}
                        </button>
                        <button 
                            onClick={() => { setLoginMethod('password'); resetState(); }}
                            className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${loginMethod === 'password' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            {t('login.password')}
                        </button>
                    </div>
                )}

                {loginMethod === 'scan' && wechatConfig?.enabled ? (
                     <div className="flex flex-col items-center py-4">
                        <div 
                           className="w-48 h-48 border border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 cursor-pointer relative overflow-hidden group mb-4"
                           onClick={() => simulateWeChatScan(false)}
                           title="Click to simulate scan (Demo Mode)"
                       >
                            {/* Visualizes real config or fallback icon */}
                            {scanStatus === 'success' ? (
                                <Check className="w-20 h-20 text-[#07c160]" />
                            ) : (
                                wechatConfig.appId ? (
                                    <img src={getWeChatQrUrl()} alt="WeChat Login QR" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <QrCode className="w-32 h-32 text-slate-800" />
                                )
                            )}

                            {scanStatus === 'waiting' && (
                               <div className="absolute top-0 left-0 w-full h-1 bg-[#07c160]/50 shadow-[0_0_10px_#07c160] animate-[scan_2s_ease-in-out_infinite]"></div>
                            )}
                       </div>
                       <p className="text-sm text-slate-500">
                           {scanStatus === 'success' ? t('login.scanSuccess') : t('login.scanTip')}
                       </p>
                       {wechatConfig.appId && <p className="text-[10px] text-slate-300 mt-2">AppID: {wechatConfig.appId}</p>}
                   </div>
                ) : (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                placeholder={t('admin.users.username')}
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                placeholder={t('login.password')}
                            />
                        </div>
                        <button type="submit" className="w-full bg-brand-600 text-white font-semibold py-3 rounded-lg hover:bg-brand-700 transition-colors">
                            {t('login.signin')}
                        </button>
                    </form>
                )}

                <div className="mt-6 text-center">
                    <button onClick={() => { setView('register'); resetState(); }} className="text-sm text-brand-600 hover:underline">
                        {t('login.registerLink')}
                    </button>
                </div>
            </>
        )}

        {/* REGISTER VIEW */}
        {view === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        placeholder={t('admin.users.username')}
                    />
                     <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        placeholder={t('admin.users.displayName')}
                    />
                </div>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    placeholder={t('login.password')}
                />
                
                <button type="submit" className="w-full bg-brand-600 text-white font-semibold py-3 rounded-lg hover:bg-brand-700 transition-colors mt-2">
                    {wechatConfig?.enabled ? t('login.next') : t('login.complete')}
                </button>
                
                <div className="text-center pt-2">
                    <button type="button" onClick={() => setView('login')} className="text-sm text-slate-500 hover:text-slate-800">
                        {t('login.back')}
                    </button>
                </div>
            </form>
        )}

        {/* BIND VIEW (After Register, only if enabled) */}
        {view === 'bind' && (
             <div className="flex flex-col items-center">
                <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm mb-6 flex items-center gap-2">
                    <Check className="w-4 h-4" /> {t('login.bindSuccess')}
                </div>
                
                <p className="text-slate-600 text-sm mb-4 text-center px-4">
                    {t('login.bindDesc')}
                </p>

                <div 
                   className="w-48 h-48 border border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 cursor-pointer relative overflow-hidden group mb-6"
                   onClick={() => simulateWeChatScan(true)}
                   title="Click to simulate binding"
               >
                   {/* Generate QR using config */}
                   {scanStatus === 'success' ? (
                       <Check className="w-20 h-20 text-[#07c160]" />
                   ) : (
                       wechatConfig?.appId ? (
                           <img src={getWeChatQrUrl()} alt="WeChat Bind QR" className="w-full h-full object-contain p-2" />
                       ) : (
                           <QrCode className="w-32 h-32 text-slate-800" />
                       )
                   )}
                   
                    {scanStatus === 'waiting' && (
                       <div className="absolute top-0 left-0 w-full h-1 bg-[#07c160]/50 shadow-[0_0_10px_#07c160] animate-[scan_2s_ease-in-out_infinite]"></div>
                    )}
               </div>
               
               <button 
                 onClick={() => setView('pending_approval')}
                 className="text-slate-400 text-xs hover:text-slate-600 underline"
               >
                 {t('login.skip')}
               </button>
           </div>
        )}
        
        {/* PENDING APPROVAL VIEW */}
        {view === 'pending_approval' && (
             <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 mb-6">
                    <Shield className="w-8 h-8" />
                </div>
                <p className="text-slate-600 text-sm mb-8 px-4 leading-relaxed">
                    {t('login.pendingDesc')}
                </p>
                <button 
                    onClick={() => setView('login')}
                    className="w-full bg-slate-100 text-slate-700 font-semibold py-3 rounded-lg hover:bg-slate-200 transition-colors"
                >
                    {t('login.back')}
                </button>
            </div>
        )}
        
        {error && (
            <div className="mt-4 text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100 text-center animate-[shake_0.5s_ease-in-out]">
              {error}
            </div>
        )}
      </div>
      <style>{`
        @keyframes scan {
            0% { top: 0; opacity: 0; }
            50% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
};

export default Login;