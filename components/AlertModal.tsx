import React from 'react';
import { AlertTriangle, Check } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';

interface AlertModalProps {
  isOpen: boolean;
  message: string;
  type?: 'error' | 'success';
  onClose: () => void;
}

const AlertModal: React.FC<AlertModalProps> = ({ isOpen, message, type = 'error', onClose }) => {
  const { t } = useLanguage();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.1s_ease-out]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100 border border-slate-100">
        <div className="flex flex-col items-center text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
             {type === 'success' ? (
                 <Check className="w-6 h-6 text-green-500" />
             ) : (
                 <AlertTriangle className="w-6 h-6 text-red-500" />
             )}
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">
              {type === 'success' ? t('modal.successTitle') : t('modal.alertTitle')}
          </h3>
          <p className="text-sm text-slate-500 mb-6 px-4">{message}</p>
          
          <button 
            onClick={onClose}
            className="w-full px-4 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
          >
            {t('modal.ok')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;