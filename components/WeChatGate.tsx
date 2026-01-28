import React, { useState, useEffect } from 'react';
import { QrCode, Smartphone, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface WeChatGateProps {
  children: React.ReactNode;
}

const WeChatGate: React.FC<WeChatGateProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [scanStatus, setScanStatus] = useState<'waiting' | 'scanned' | 'success'>('waiting');
  const { language } = useLanguage();

  useEffect(() => {
    const auth = localStorage.getItem('devcenter_wechat_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Simulate scanning process when user clicks QR code
  const simulateScan = () => {
    if (scanStatus !== 'waiting') return;
    
    setScanStatus('scanned');
    setTimeout(() => {
        setScanStatus('success');
        setTimeout(() => {
            localStorage.setItem('devcenter_wechat_auth', 'true');
            setIsAuthenticated(true);
        }, 1000);
    }, 1500);
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100">
        <div className="bg-[#07c160] p-6 text-center">
            <h2 className="text-white font-bold text-xl">
                {language === 'zh' ? '微信扫码登录' : 'WeChat Login'}
            </h2>
            <p className="text-white/80 text-sm mt-1">
                {language === 'zh' ? '安全 · 便捷 · 高效' : 'Secure · Fast · Efficient'}
            </p>
        </div>
        
        <div className="p-8 flex flex-col items-center">
            <div 
                className="relative group cursor-pointer"
                onClick={simulateScan}
                title="Click to simulate scan"
            >
                <div className={`w-48 h-48 border-2 ${scanStatus === 'success' ? 'border-[#07c160]' : 'border-slate-100'} rounded-lg flex items-center justify-center bg-slate-50 transition-colors`}>
                    {scanStatus === 'success' ? (
                         <Check className="w-20 h-20 text-[#07c160]" />
                    ) : (
                         <QrCode className="w-32 h-32 text-slate-800" />
                    )}
                </div>
                
                {/* Scan Overlay Animation */}
                {scanStatus === 'waiting' && (
                    <div className="absolute top-0 left-0 w-full h-full border-2 border-[#07c160] opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none">
                         <div className="absolute top-0 left-0 w-full h-1 bg-[#07c160]/50 shadow-[0_0_10px_#07c160] animate-[scan_2s_ease-in-out_infinite]"></div>
                    </div>
                )}
            </div>

            <div className="mt-8 text-center space-y-2">
                {scanStatus === 'waiting' && (
                    <>
                        <p className="text-slate-800 font-medium">
                            {language === 'zh' ? '请使用微信扫一扫' : 'Please scan with WeChat'}
                        </p>
                        <p className="text-slate-500 text-sm">
                            {language === 'zh' ? '关注公众号获取访问权限' : 'Follow official account to access'}
                        </p>
                    </>
                )}
                {scanStatus === 'scanned' && (
                    <p className="text-[#07c160] font-medium animate-pulse">
                         {language === 'zh' ? '扫描成功，请在手机上确认' : 'Scan successful, confirm on phone'}
                    </p>
                )}
                {scanStatus === 'success' && (
                    <p className="text-[#07c160] font-bold">
                         {language === 'zh' ? '登录成功' : 'Login Successful'}
                    </p>
                )}
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-100 w-full flex justify-center text-slate-400 text-xs">
                <span className="flex items-center gap-1">
                    <Smartphone className="w-3 h-3" /> 
                    {language === 'zh' ? '开发者中心演示' : 'DevCenter Demo'}
                </span>
            </div>
        </div>
      </div>
      <style>{`
        @keyframes scan {
            0% { top: 0; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default WeChatGate;