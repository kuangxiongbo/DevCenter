import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDocs, saveDoc, getCategories, getDocVersions, saveDocVersion, getProducts, getTopNavItems, getAIConfig } from '../../services/storage';
import { generateContentSuggestion } from '../../services/geminiService';
import { Doc, DocStatus, DocVersion, Product, Category, TopNavItem } from '../../types';
import { Save, Sparkles, ChevronDown, History, RotateCcw, Globe } from '../../components/Icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { format } from 'date-fns';
import ConfirmModal from '../../components/ConfirmModal';
import AlertModal from '../../components/AlertModal';

const Editor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  // Data State
  const [doc, setDoc] = useState<Doc>({
    id: `doc_${Date.now()}`,
    title: '',
    slug: '',
    categoryId: '',
    content: '',
    lastUpdated: Date.now(),
    status: DocStatus.DRAFT,
    author: localStorage.getItem('devcenter_username') || 'Admin',
    version: '1.0.0'
  });
  
  // Hierarchy Data
  const [products, setProducts] = useState<Product[]>([]);
  const [allNavs, setAllNavs] = useState<TopNavItem[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  
  // Selections
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedTopNavId, setSelectedTopNavId] = useState<string>('');

  const [versions, setVersions] = useState<DocVersion[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranslatingSlug, setIsTranslatingSlug] = useState(false); // New state for slug generation
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Slug State
  const [slugTouched, setSlugTouched] = useState(false);

  // AI State
  const [isAIEnabled, setIsAIEnabled] = useState(false);

  // Modal State
  const [confirmRestore, setConfirmRestore] = useState<{ isOpen: boolean; version: DocVersion | null }>({ isOpen: false, version: null });
  const [alert, setAlert] = useState<{ isOpen: boolean; message: string; type: 'success' | 'error' }>({ isOpen: false, message: '', type: 'error' });

  useEffect(() => {
    setProducts(getProducts());
    setAllNavs(getTopNavItems());
    const cats = getCategories();
    setAllCategories(cats);
    
    // AI Check
    setIsAIEnabled(getAIConfig().enabled);

    if (id && id !== 'new') {
      const docs = getDocs();
      const found = docs.find(d => d.id === id);
      if (found) {
        setDoc(found);
        setVersions(getDocVersions(found.id));
        setSlugTouched(true); // Don't auto-update slug for existing docs
        
        // Reverse look up logic to fill dropdowns
        const cat = cats.find(c => c.id === found.categoryId);
        if (cat) {
             setSelectedProductId(cat.productId);
             setSelectedTopNavId(cat.topNavId);
        }
      }
    } else {
        // New doc default logic
        const prods = getProducts();
        if (prods.length > 0) setSelectedProductId(prods[0].id);
        setSlugTouched(false); // Enable auto-update for new docs
    }
  }, [id]);

  // Derived available options
  const availableNavs = allNavs.filter(n => n.productId === selectedProductId);
  const availableCategories = allCategories.filter(c => c.productId === selectedProductId && c.topNavId === selectedTopNavId);

  // Sync generation (immediate feedback, allows Chinese)
  const generateSlugSync = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-\u4e00-\u9fa5]+/g, '') // Keep alphanumeric, underscore, dash, chinese
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  };

  // Async generation (English translation)
  const generateEnglishSlug = async (titleToConvert: string) => {
      if (!titleToConvert || !isAIEnabled) return;
      setIsTranslatingSlug(true);
      try {
          const prompt = "Translate this title to a URL-friendly, lowercase, kebab-case English slug. Return ONLY the slug (e.g., 'getting-started'), no code blocks, no explanation.";
          let result = await generateContentSuggestion(titleToConvert, prompt);
          // Cleanup result just in case AI adds markdown
          result = result.replace(/`/g, '').trim();
          setDoc(prev => ({ ...prev, slug: result }));
      } catch (error) {
          console.error("Slug translation failed", error);
      } finally {
          setIsTranslatingSlug(false);
      }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDoc(prev => ({
        ...prev,
        title: val,
        // Only update slug synchronously if user hasn't touched it, to provide immediate feedback
        slug: !slugTouched ? generateSlugSync(val) : prev.slug
    }));
  };

  const handleTitleBlur = () => {
    // If slug hasn't been manually edited, try to generate an English version on blur
    if (!slugTouched && doc.title && isAIEnabled) {
        generateEnglishSlug(doc.title);
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDoc(prev => ({ ...prev, slug: e.target.value }));
    setSlugTouched(true);
  };

  const handleSave = () => {
    setIsSaving(true);
    
    // Auto-save version history
    const timestamp = Date.now();
    const timeMarker = format(timestamp, 'yyyyMMddHHmm');
    const autoVersion = `${doc.version || '1.0.0'}-${timeMarker}`;

    const newVersion: DocVersion = {
        id: `v_${timestamp}`,
        docId: doc.id,
        title: doc.title,
        content: doc.content,
        version: autoVersion,
        timestamp: timestamp,
        author: localStorage.getItem('devcenter_username') || 'Admin',
        note: 'Auto-saved'
    };
    saveDocVersion(newVersion);

    // Save Doc
    saveDoc({ ...doc, lastUpdated: timestamp });
    
    setTimeout(() => {
      setIsSaving(false);
      navigate('/admin');
    }, 500);
  };

  const handleRestore = () => {
      const v = confirmRestore.version;
      if (v) {
          setDoc({
              ...doc,
              title: v.title,
              content: v.content,
              version: v.version
          });
          setShowHistory(false);
          setConfirmRestore({ isOpen: false, version: null });
      }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt) return;
    setIsGenerating(true);
    try {
      const suggestion = await generateContentSuggestion(doc.content, aiPrompt);
      setDoc(prev => ({ ...prev, content: suggestion }));
      setShowAiModal(false);
      setAiPrompt('');
    } catch (e) {
      setAlert({ isOpen: true, message: t('admin.ai.error'), type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Editor Header */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
        <h1 className="text-xl font-bold text-slate-800">{id === 'new' ? t('admin.editor.createTitle') : t('admin.editor.editTitle')}</h1>
        <div className="flex items-center gap-3">
            <button 
                onClick={() => setShowHistory(!showHistory)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${showHistory ? 'bg-slate-100 border-slate-300 text-slate-800' : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'}`}
            >
                <History className="w-4 h-4" />
                {t('admin.editor.history')}
            </button>
            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            {isAIEnabled && (
                <button 
                    onClick={() => setShowAiModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md border border-purple-200 transition-colors"
                >
                    <Sparkles className="w-4 h-4" />
                    {t('admin.editor.aiAssist')}
                </button>
            )}
            <button 
                onClick={() => navigate('/admin')}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
            >
                {t('admin.editor.cancel')}
            </button>
            
            <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors text-sm font-medium disabled:opacity-50 shadow-sm"
            >
                <Save className="w-4 h-4" />
                {isSaving ? t('admin.editor.saving') : t('admin.editor.save')}
            </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row relative">
        
        {/* Metadata Sidebar */}
        <div className="w-full md:w-80 bg-white border-r border-slate-200 p-6 overflow-y-auto shrink-0">
            <div className="space-y-6">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t('admin.editor.field.title')}</label>
                    <input 
                        type="text" 
                        value={doc.title}
                        onChange={handleTitleChange}
                        onBlur={handleTitleBlur}
                        className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t('admin.editor.field.slug')}</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            value={doc.slug}
                            onChange={handleSlugChange}
                            className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none font-mono text-slate-600"
                        />
                        {isAIEnabled && (
                            <button 
                                onClick={() => generateEnglishSlug(doc.title)}
                                disabled={isTranslatingSlug || !doc.title}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 disabled:opacity-30"
                                title="Generate English Slug"
                            >
                                {isTranslatingSlug ? (
                                    <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <Sparkles className="w-4 h-4" />
                                )}
                            </button>
                        )}
                    </div>
                </div>
                
                {/* 1. Product Selection */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">1. {t('admin.editor.field.product')}</label>
                    <div className="relative">
                        <select 
                            value={selectedProductId}
                            onChange={e => { setSelectedProductId(e.target.value); setSelectedTopNavId(''); }}
                            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm appearance-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none bg-white font-medium text-slate-700"
                        >
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* 2. Top Nav Selection */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">2. {t('admin.editor.field.topNav')}</label>
                    <div className="relative">
                        <select 
                            value={selectedTopNavId}
                            onChange={e => setSelectedTopNavId(e.target.value)}
                            disabled={!selectedProductId}
                            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm appearance-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none bg-white font-medium text-slate-700 disabled:bg-slate-100"
                        >
                            <option value="">{t('admin.editor.selectTab')}</option>
                            {availableNavs.map(n => (
                                <option key={n.id} value={n.id}>{n.label}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* 3. Category Selection */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">3. {t('admin.editor.field.category')}</label>
                    <div className="relative">
                        <select 
                            value={doc.categoryId}
                            onChange={e => setDoc({...doc, categoryId: e.target.value})}
                            disabled={!selectedTopNavId}
                            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm appearance-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none bg-white disabled:bg-slate-100"
                        >
                            <option value="">{t('admin.editor.selectCategory')}</option>
                            {availableCategories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                <div className="h-px bg-slate-200 my-2"></div>

                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t('admin.editor.field.version')}</label>
                    <input 
                        type="text" 
                        value={doc.version || ''}
                        onChange={e => setDoc({...doc, version: e.target.value})}
                        placeholder="e.g. 1.0.4"
                        className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t('admin.editor.field.status')}</label>
                    <select 
                        value={doc.status}
                        onChange={e => setDoc({...doc, status: e.target.value as DocStatus})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none bg-white"
                    >
                        <option value={DocStatus.DRAFT}>{t('status.DRAFT')}</option>
                        <option value={DocStatus.PUBLISHED}>{t('status.PUBLISHED')}</option>
                        <option value={DocStatus.ARCHIVED}>{t('status.ARCHIVED')}</option>
                    </select>
                </div>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white flex flex-col h-full">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs text-slate-500 font-medium flex justify-between">
                <span>{t('admin.editor.contentLabel')}</span>
                {doc.status === DocStatus.DRAFT && <span className="text-yellow-600 font-bold px-2 bg-yellow-100 rounded text-[10px] uppercase tracking-wider">Unpublished Draft</span>}
            </div>
            <textarea 
                value={doc.content}
                onChange={e => setDoc({...doc, content: e.target.value})}
                className="flex-1 w-full p-6 outline-none font-mono text-sm leading-relaxed text-slate-800 resize-none"
                placeholder={t('admin.editor.placeholder')}
            />
        </div>

        {/* History Sidebar Panel */}
        {showHistory && (
             <div className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-slate-200 shadow-xl z-10 flex flex-col animate-[slideIn_0.2s_ease-out]">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800">{t('admin.history.title')}</h3>
                    <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600">×</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {versions.length === 0 && <p className="text-slate-400 text-sm text-center py-8">{t('admin.history.empty')}</p>}
                    {versions.map(v => (
                        <div key={v.id} className="p-3 border border-slate-200 rounded-lg hover:border-brand-300 hover:shadow-sm transition-all bg-white group">
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-mono text-xs font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded break-all">{v.version}</span>
                                <span className="text-xs text-slate-400 shrink-0 ml-2">{format(v.timestamp, 'MM/dd HH:mm')}</span>
                            </div>
                            <div className="text-xs text-slate-600 mb-2 truncate">{v.title}</div>
                            <div className="text-xs text-slate-400 mb-2">By: {v.author}</div>
                            <button 
                                onClick={() => setConfirmRestore({ isOpen: true, version: v })}
                                className="w-full py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-brand-600 rounded border border-slate-200 flex items-center justify-center gap-1"
                            >
                                <RotateCcw className="w-3 h-3" />
                                {t('admin.history.restore')}
                            </button>
                        </div>
                    ))}
                </div>
             </div>
        )}
      </div>
      <style>{`
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      
      {/* AI Assistant Modal */}
      {showAiModal && isAIEnabled && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                <div className="p-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        {t('admin.ai.title')}
                    </h3>
                    <p className="text-white/80 text-sm mt-1">{t('admin.ai.desc')}</p>
                </div>
                <div className="p-6">
                    <textarea 
                        value={aiPrompt}
                        onChange={e => setAiPrompt(e.target.value)}
                        placeholder={t('admin.ai.placeholder')}
                        className="w-full h-32 p-3 border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none mb-4"
                    />
                    <div className="flex justify-end gap-3">
                        <button 
                            onClick={() => setShowAiModal(false)}
                            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                        >
                            {t('admin.editor.cancel')}
                        </button>
                        <button 
                            onClick={handleAiGenerate}
                            disabled={!aiPrompt || isGenerating}
                            className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isGenerating ? (
                                <>{t('admin.ai.thinking')}</>
                            ) : (
                                <><Sparkles className="w-4 h-4" /> {t('admin.ai.generate')}</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmRestore.isOpen}
        message={t('admin.history.restoreConfirm')}
        onConfirm={handleRestore}
        onCancel={() => setConfirmRestore({ isOpen: false, version: null })}
      />

      <AlertModal 
        isOpen={alert.isOpen}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, isOpen: false })}
      />
    </div>
  );
};

export default Editor;