import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAIConfig, saveAIConfig } from '../../services/storage';
import { checkConnection } from '../../services/geminiService';
import { AIConfig, AIProvider } from '../../types';
import { Save, Sparkles, Eye, EyeOff, ArrowUp, ArrowDown, Settings, Check, AlertTriangle, Loader2 } from '../../components/Icons';
import { useLanguage } from '../../contexts/LanguageContext';

const AIConfigPage: React.FC = () => {
  const { t } = useLanguage();
  const [config, setConfig] = useState<AIConfig>({
      enabled: false,
      priority: ['gemini', 'bailian'],
      gemini: { enabled: true, apiKey: '', model: '' },
      bailian: { enabled: true, apiKey: '', baseURL: '', model: '' }
  });
  
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  
  // Status check states
  const [checkingStatus, setCheckingStatus] = useState<Record<string, boolean>>({});
  const [statusResult, setStatusResult] = useState<Record<string, 'success' | 'error' | null>>({});

  useEffect(() => {
    setConfig(getAIConfig());
  }, []);

  const handleSave = () => {
    saveAIConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateProviderConfig = (provider: 'gemini' | 'bailian', field: string, value: any) => {
      setConfig(prev => ({
          ...prev,
          [provider]: {
              ...prev[provider],
              [field]: value
          }
      }));
  };

  const movePriority = (index: number, direction: 'up' | 'down') => {
      const newPriority = [...config.priority];
      if (direction === 'up' && index > 0) {
          [newPriority[index], newPriority[index - 1]] = [newPriority[index - 1], newPriority[index]];
      } else if (direction === 'down' && index < newPriority.length - 1) {
          [newPriority[index], newPriority[index + 1]] = [newPriority[index + 1], newPriority[index]];
      }
      setConfig({ ...config, priority: newPriority });
  };

  const toggleProviderEnabled = (provider: AIProvider) => {
      setConfig(prev => ({
          ...prev,
          [provider]: {
              ...prev[provider],
              enabled: !prev[provider].enabled
          }
      }));
  };

  const handleCheckConnection = async (provider: AIProvider) => {
      setCheckingStatus(prev => ({ ...prev, [provider]: true }));
      setStatusResult(prev => ({ ...prev, [provider]: null }));
      
      // Ensure we save first so service uses latest
      saveAIConfig(config);

      const isOk = await checkConnection(provider);
      
      setCheckingStatus(prev => ({ ...prev, [provider]: false }));
      setStatusResult(prev => ({ ...prev, [provider]: isOk ? 'success' : 'error' }));
  };

  const toggleShowKey = (provider: string) => {
      setShowKey(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const renderProviderSettings = (provider: 'gemini' | 'bailian') => {
      const isGemini = provider === 'gemini';
      const settings = config[provider];

      return (
          <div className="p-4 space-y-4 bg-slate-50 border-t border-slate-100">
              {/* API Key */}
              <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{t('admin.aiconfig.apiKey')}</label>
                  <div className="relative">
                      <input 
                          type={showKey[provider] ? "text" : "password"}
                          className="w-full px-3 py-2 pr-10 border border-slate-300 rounded text-sm font-mono focus:ring-1 focus:ring-brand-500 outline-none"
                          value={settings.apiKey}
                          onChange={e => updateProviderConfig(provider, 'apiKey', e.target.value)}
                          placeholder={isGemini ? "AIzaSy..." : "sk-..."}
                      />
                      <button 
                          onClick={() => toggleShowKey(provider)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600"
                      >
                          {showKey[provider] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                  </div>
              </div>

              {/* Model */}
              <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{t('admin.aiconfig.model')}</label>
                  <input 
                      type="text"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm font-mono focus:ring-1 focus:ring-brand-500 outline-none"
                      value={settings.model}
                      onChange={e => updateProviderConfig(provider, 'model', e.target.value)}
                      placeholder={isGemini ? 'gemini-3-flash-preview' : 'qwen-turbo'}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                      {isGemini ? t('admin.aiconfig.geminiHint') : t('admin.aiconfig.bailianHint')}
                  </p>
              </div>

              {/* Base URL (Bailian Only) */}
              {!isGemini && (
                  <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{t('admin.aiconfig.baseUrl')}</label>
                      <input 
                          type="text"
                          className="w-full px-3 py-2 border border-slate-300 rounded text-sm font-mono focus:ring-1 focus:ring-brand-500 outline-none"
                          value={config.bailian.baseURL}
                          onChange={e => updateProviderConfig('bailian', 'baseURL', e.target.value)}
                          placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">{t('admin.aiconfig.baseUrlHint')}</p>
                  </div>
              )}
          </div>
      );
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('admin.aiconfig.title')}</h1>
          <p className="text-slate-500 mt-1">{t('admin.aiconfig.subtitle')}</p>
        </div>
        <Link to="/admin" className="text-sm font-medium text-slate-600 hover:text-brand-600">
          {t('admin.backToDashboard')}
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          {/* Master Switch */}
          <div className="mb-8 flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 text-white rounded-lg flex items-center justify-center transition-colors ${config.enabled ? 'bg-purple-600' : 'bg-slate-300'}`}>
                      <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                      <h3 className="text-lg font-semibold text-slate-800">{t('admin.aiconfig.enable')}</h3>
                      <p className="text-sm text-slate-500">{config.enabled ? 'Global AI Features Active' : 'All AI features disabled'}</p>
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
                      <div className={`block w-14 h-8 rounded-full transition-colors ${config.enabled ? 'bg-purple-600' : 'bg-slate-200'}`}></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${config.enabled ? 'transform translate-x-6' : ''}`}></div>
                  </div>
              </label>
          </div>

          <div className={`space-y-6 transition-all ${config.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Provider Priority Chain</h4>
                  <span className="text-xs text-slate-400">System tries top to bottom</span>
              </div>

              {/* Priority List */}
              <div className="space-y-3">
                  {config.priority.map((provider, index) => {
                      const isExpanded = expandedProvider === provider;
                      const isEnabled = config[provider].enabled;
                      const checkState = statusResult[provider];

                      return (
                          <div key={provider} className={`border rounded-lg transition-all ${isExpanded ? 'border-brand-300 ring-1 ring-brand-100 shadow-md' : 'border-slate-200 bg-white'}`}>
                              <div className="flex items-center justify-between p-3">
                                  <div className="flex items-center gap-3">
                                      {/* Drag/Order Controls */}
                                      <div className="flex flex-col gap-1">
                                          <button 
                                              onClick={() => movePriority(index, 'up')}
                                              disabled={index === 0}
                                              className="p-0.5 text-slate-400 hover:text-brand-600 disabled:opacity-20"
                                          >
                                              <ArrowUp className="w-3 h-3" />
                                          </button>
                                          <button 
                                              onClick={() => movePriority(index, 'down')}
                                              disabled={index === config.priority.length - 1}
                                              className="p-0.5 text-slate-400 hover:text-brand-600 disabled:opacity-20"
                                          >
                                              <ArrowDown className="w-3 h-3" />
                                          </button>
                                      </div>

                                      {/* Provider Info */}
                                      <div className="flex items-center gap-3">
                                          <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-xs ${provider === 'gemini' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                              {provider === 'gemini' ? 'G' : 'Q'}
                                          </div>
                                          <div>
                                              <div className="font-medium text-slate-900 flex items-center gap-2">
                                                  {provider === 'gemini' ? 'Google Gemini' : 'Ali Bailian (Qwen)'}
                                                  {!isEnabled && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Disabled</span>}
                                              </div>
                                              <div className="text-xs text-slate-400">
                                                  {index === 0 ? 'Primary' : 'Fallback'}
                                              </div>
                                          </div>
                                      </div>
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-3">
                                      {/* Status Indicator */}
                                      {checkState === 'success' && <span className="flex items-center gap-1 text-xs text-green-600"><Check className="w-3 h-3" /> Ready</span>}
                                      {checkState === 'error' && <span className="flex items-center gap-1 text-xs text-red-600"><AlertTriangle className="w-3 h-3" /> Error</span>}
                                      
                                      <button 
                                          onClick={() => handleCheckConnection(provider)}
                                          disabled={!isEnabled || checkingStatus[provider]}
                                          className="text-xs font-medium px-3 py-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1"
                                      >
                                          {checkingStatus[provider] ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Test'}
                                      </button>

                                      <div className="h-4 w-px bg-slate-200 mx-1"></div>

                                      <button 
                                          onClick={() => setExpandedProvider(isExpanded ? null : provider)}
                                          className={`p-2 rounded hover:bg-slate-100 ${isExpanded ? 'text-brand-600 bg-brand-50' : 'text-slate-400'}`}
                                          title="Settings"
                                      >
                                          <Settings className="w-4 h-4" />
                                      </button>

                                      <label className="relative inline-flex items-center cursor-pointer">
                                          <input type="checkbox" className="sr-only peer" checked={isEnabled} onChange={() => toggleProviderEnabled(provider)} />
                                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
                                      </label>
                                  </div>
                              </div>

                              {/* Expanded Settings */}
                              {isExpanded && renderProviderSettings(provider)}
                          </div>
                      );
                  })}
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

export default AIConfigPage;