import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getWeChatConfig, saveWeChatConfig } from '../../services/storage';
import { WeChatConfig } from '../../types';
import { Save, Smartphone } from '../../components/Icons';
import { useLanguage } from '../../contexts/LanguageContext';

const WeChatConfigPage: React.FC = () => {
  const { t } = useLanguage();
  const [config, setConfig] = useState<WeChatConfig>({
      appId: '',
      appSecret: '',
      token: '',
      encodingAesKey: '',
      callbackUrl: 'https://your-domain.com/api/wechat/callback',
      enabled: false
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setConfig(getWeChatConfig());
  }, []);

  const handleSave = () => {
    saveWeChatConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('admin.wechat.title')}</h1>
          <p className="text-slate-500 mt-1">{t('admin.wechat.subtitle')}</p>
        </div>
        <Link to="/admin" className="text-sm font-medium text-slate-600 hover:text-brand-600">
          {t('admin.backToDashboard')}
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 text-white rounded-lg flex items-center justify-center">
                      <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                      <h3 className="text-lg font-semibold text-slate-800">{t('admin.wechat.sectionTitle')}</h3>
                      <p className="text-sm text-slate-500">{t('admin.wechat.sectionDesc')}</p>
                  </div>
              </div>
              <label className="flex items-center cursor-pointer">
                  <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={config.enabled}
                        onChange={e => setConfig({...config, enabled: e.target.checked})}
                      />
                      <div className={`block w-14 h-8 rounded-full transition-colors ${config.enabled ? 'bg-green-500' : 'bg-slate-200'}`}></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${config.enabled ? 'transform translate-x-6' : ''}`}></div>
                  </div>
                  <span className="ml-3 text-sm font-medium text-slate-600">{t('admin.wechat.enable')}</span>
              </label>
          </div>

          <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">{t('admin.wechat.appId')}</label>
                      <input 
                          type="text"
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none font-mono text-sm"
                          value={config.appId}
                          onChange={e => setConfig({...config, appId: e.target.value})}
                          placeholder="wx..."
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">{t('admin.wechat.appSecret')}</label>
                      <input 
                          type="password"
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none font-mono text-sm"
                          value={config.appSecret}
                          onChange={e => setConfig({...config, appSecret: e.target.value})}
                      />
                  </div>
              </div>

              <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">{t('admin.wechat.callback')}</label>
                  <div className="flex">
                      <input 
                          type="text"
                          className="flex-1 px-4 py-2 border border-slate-300 rounded-l-lg bg-slate-50 text-slate-600 font-mono text-sm"
                          value={config.callbackUrl}
                          readOnly
                      />
                      <button className="px-4 py-2 bg-slate-100 border border-l-0 border-slate-300 rounded-r-lg text-sm font-medium text-slate-600 hover:bg-slate-200">
                          Copy
                      </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{t('admin.wechat.callbackHint')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">{t('admin.wechat.token')}</label>
                      <input 
                          type="text"
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none font-mono text-sm"
                          value={config.token}
                          onChange={e => setConfig({...config, token: e.target.value})}
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">{t('admin.wechat.aesKey')}</label>
                      <input 
                          type="text"
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none font-mono text-sm"
                          value={config.encodingAesKey}
                          onChange={e => setConfig({...config, encodingAesKey: e.target.value})}
                      />
                  </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                  <button 
                      onClick={handleSave}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium transition-all ${saved ? 'bg-green-600' : 'bg-brand-600 hover:bg-brand-700'}`}
                  >
                      {saved ? <span className="flex items-center gap-1">{t('admin.saved')}</span> : <><Save className="w-4 h-4" /> {t('admin.saveConfig')}</>}
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};

export default WeChatConfigPage;