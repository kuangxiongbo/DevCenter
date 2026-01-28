import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    getTopNavItems, saveTopNavItem, deleteTopNavItem,
    getCategories, saveCategory, deleteCategory, getProducts, getDocs, getAIConfig
} from '../../services/storage';
import { translateToEnglish } from '../../services/geminiService';
import { TopNavItem, Category, Product, Doc } from '../../types';
import { Plus, Edit3, Trash2, Save, ChevronRight, Sparkles } from '../../components/Icons';
import { useLanguage } from '../../contexts/LanguageContext';
import ConfirmModal from '../../components/ConfirmModal';

const Menus: React.FC = () => {
  const { t } = useLanguage();
  
  // Selection State
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedTopNavId, setSelectedTopNavId] = useState<string>('');

  // Data State
  const [navItems, setNavItems] = useState<TopNavItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Count State
  const [counts, setCounts] = useState<{
      products: Record<string, number>;
      navs: Record<string, number>;
      cats: Record<string, number>;
  }>({ products: {}, navs: {}, cats: {} });
  
  // Edit State
  const [editingNav, setEditingNav] = useState<TopNavItem | null>(null);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  
  // AI State
  const [isAIEnabled, setIsAIEnabled] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'nav' | 'cat', id: string } | null>(null);

  useEffect(() => {
    loadData();
    setIsAIEnabled(getAIConfig().enabled);
  }, []);

  const loadData = () => {
    const prods = getProducts().sort((a, b) => a.order - b.order);
    setProducts(prods);
    if (prods.length > 0 && !selectedProductId) {
        setSelectedProductId(prods[0].id);
    }
    
    const navs = getTopNavItems().sort((a, b) => a.order - b.order);
    const cats = getCategories().sort((a, b) => a.order - b.order);
    const docs = getDocs();

    setNavItems(navs);
    setCategories(cats);

    // Calculate Counts
    const pCounts: Record<string, number> = {};
    const nCounts: Record<string, number> = {};
    const cCounts: Record<string, number> = {};

    docs.forEach(doc => {
        // Category Count
        if (doc.categoryId) {
            cCounts[doc.categoryId] = (cCounts[doc.categoryId] || 0) + 1;
            
            // Resolve parent hierarchy for Product and TopNav counts
            const cat = cats.find(c => c.id === doc.categoryId);
            if (cat) {
                 // Product Count
                 if (cat.productId) {
                     pCounts[cat.productId] = (pCounts[cat.productId] || 0) + 1;
                 }
                 // Top Nav Count
                 if (cat.topNavId) {
                     nCounts[cat.topNavId] = (nCounts[cat.topNavId] || 0) + 1;
                 }
            }
        }
    });

    setCounts({ products: pCounts, navs: nCounts, cats: cCounts });
  };

  // Filter Data
  const filteredNavs = navItems.filter(n => n.productId === selectedProductId);
  // Categories depend on selected Top Nav
  const filteredCategories = categories.filter(c => c.productId === selectedProductId && c.topNavId === selectedTopNavId);

  // --- Translation Logic ---
  const autoTranslateNav = async () => {
      if (!editingNav || !editingNav.label) return;
      setIsTranslating(true);
      const en = await translateToEnglish(editingNav.label);
      setEditingNav(prev => prev ? { ...prev, labelEn: en } : null);
      setIsTranslating(false);
  };

  const autoTranslateCat = async () => {
      if (!editingCat || !editingCat.name) return;
      setIsTranslating(true);
      const en = await translateToEnglish(editingCat.name);
      setEditingCat(prev => prev ? { ...prev, nameEn: en } : null);
      setIsTranslating(false);
  };

  const handleNavBlur = () => {
      if (editingNav && editingNav.label && !editingNav.labelEn && isAIEnabled) autoTranslateNav();
  };

  const handleCatBlur = () => {
      if (editingCat && editingCat.name && !editingCat.nameEn && isAIEnabled) autoTranslateCat();
  };

  // --- Top Nav Handlers ---
  const handleEditNav = (item: TopNavItem) => setEditingNav({...item});
  const handleNewNav = () => setEditingNav({ 
      id: `nav_${Date.now()}`, 
      productId: selectedProductId,
      label: '', 
      labelEn: '',
      path: '/docs/', 
      type: 'internal',
      order: filteredNavs.length + 1 
  });
  const handleSaveNav = () => {
    if (editingNav) {
      saveTopNavItem({...editingNav, productId: selectedProductId});
      setEditingNav(null);
      loadData();
    }
  };
  const handleDeleteNav = (id: string) => {
    setDeleteTarget({ type: 'nav', id });
  };

  // --- Category Handlers ---
  const handleEditCat = (cat: Category) => setEditingCat({...cat});
  const handleNewCat = () => setEditingCat({ 
      id: `cat_${Date.now()}`, 
      name: '', 
      nameEn: '',
      parentId: null, 
      productId: selectedProductId, 
      topNavId: selectedTopNavId,
      order: filteredCategories.length + 1 
  });
  
  const handleSaveCat = () => {
    if (editingCat) {
      saveCategory({ 
          ...editingCat, 
          parentId: editingCat.parentId || null,
          productId: selectedProductId,
          topNavId: selectedTopNavId
      });
      setEditingCat(null);
      loadData();
    }
  };
  const handleDeleteCat = (id: string) => {
    setDeleteTarget({ type: 'cat', id });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'nav') {
        deleteTopNavItem(deleteTarget.id);
        if (selectedTopNavId === deleteTarget.id) setSelectedTopNavId('');
    } else {
        deleteCategory(deleteTarget.id);
    }
    
    loadData();
    setDeleteTarget(null);
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">{t('admin.menus.title')}</h1>
                <p className="text-slate-500 mt-1">{t('admin.menus.subtitle')}</p>
            </div>
            <Link to="/admin" className="text-sm font-medium text-slate-600 hover:text-brand-600">
                {t('admin.menus.back')}
            </Link>
        </div>

        {/* Global Product Selector */}
        <div className="mb-8 p-4 bg-white rounded-xl shadow-sm border border-slate-200">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                {t('admin.menus.scope')}
            </label>
            <div className="flex gap-2">
                {products.map(p => (
                    <button
                        key={p.id}
                        onClick={() => { setSelectedProductId(p.id); setSelectedTopNavId(''); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${selectedProductId === p.id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                        {p.name}
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedProductId === p.id ? 'bg-white/20 text-white' : 'bg-white/50 text-slate-500'}`}>
                            {counts.products[p.id] || 0}
                        </span>
                    </button>
                ))}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Column 2: Top Navigation */}
            <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-fit transition-opacity ${!selectedProductId ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <h2 className="font-semibold text-slate-800">{t('admin.menus.configureTop')}</h2>
                    <button onClick={handleNewNav} className="p-1.5 bg-brand-600 text-white rounded hover:bg-brand-700 transition-colors">
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="p-4 flex-1 overflow-auto">
                    {editingNav && (
                        <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">{t('admin.menus.label')}</label>
                                    <input 
                                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm" 
                                        value={editingNav.label} 
                                        onChange={e => setEditingNav({...editingNav, label: e.target.value})}
                                        onBlur={handleNavBlur} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">English Label</label>
                                    <div className="relative">
                                        <input 
                                            className="w-full px-3 py-2 border border-slate-300 rounded text-sm" 
                                            value={editingNav.labelEn || ''} 
                                            onChange={e => setEditingNav({...editingNav, labelEn: e.target.value})} 
                                            placeholder={isAIEnabled ? "Auto-generated" : ""}
                                        />
                                        {isAIEnabled && (
                                            <button 
                                                onClick={autoTranslateNav}
                                                disabled={isTranslating || !editingNav.label}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 disabled:opacity-30"
                                                title="Auto Translate"
                                            >
                                                <Sparkles className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">{t('admin.menus.order')}</label>
                                    <input type="number" className="w-full px-3 py-2 border border-slate-300 rounded text-sm" value={editingNav.order} onChange={e => setEditingNav({...editingNav, order: parseInt(e.target.value) || 0})} />
                                </div>
                                <div>
                                     <label className="block text-xs font-semibold text-slate-500 mb-1">{t('admin.menus.path')}</label>
                                    <input className="w-full px-3 py-2 border border-slate-300 rounded text-sm" value={editingNav.path} onChange={e => setEditingNav({...editingNav, path: e.target.value})} />
                                </div>
                            </div>
                            
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setEditingNav(null)} className="px-3 py-1.5 text-xs font-medium text-slate-600">{t('admin.editor.cancel')}</button>
                                <button onClick={handleSaveNav} className="px-3 py-1.5 text-xs font-medium bg-brand-600 text-white rounded flex items-center gap-1"><Save className="w-3 h-3" /> {t('admin.editor.save')}</button>
                            </div>
                        </div>
                    )}

                    <ul className="space-y-2">
                        {filteredNavs.length > 0 ? filteredNavs.map(item => (
                            <li 
                                key={item.id} 
                                onClick={() => setSelectedTopNavId(item.id)}
                                className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${selectedTopNavId === item.id ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-slate-100 hover:bg-slate-50'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${selectedTopNavId === item.id ? 'bg-brand-500' : 'bg-slate-300'}`}></div>
                                    <div>
                                        <div className="font-medium text-sm text-slate-900 flex items-center gap-2">
                                            {item.label}
                                            {item.type === 'internal' && (
                                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-normal ${(counts.navs[item.id] || 0) === 0 ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-500'}`}>
                                                    {counts.navs[item.id] || 0}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-500 font-mono flex gap-2">
                                            <span>{item.path}</span>
                                            {item.labelEn && <span className="text-slate-400">| {item.labelEn}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); handleEditNav(item); }} className="p-1.5 text-slate-400 hover:text-brand-600"><Edit3 className="w-4 h-4" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteNav(item.id); }} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </li>
                        )) : <div className="text-center text-slate-400 text-sm py-4">{t('admin.menus.noItems')}</div>}
                    </ul>
                </div>
            </div>

            {/* Column 3: Sidebar Categories */}
            <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col transition-opacity ${!selectedTopNavId ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                         <h2 className="font-semibold text-slate-800">{t('admin.menus.configureSide')}</h2>
                         {selectedTopNavId && <span className="text-xs font-normal text-slate-500 px-2 py-0.5 bg-white border border-slate-200 rounded-full">{filteredNavs.find(n => n.id === selectedTopNavId)?.label}</span>}
                    </div>
                    <button onClick={handleNewCat} className="p-1.5 bg-brand-600 text-white rounded hover:bg-brand-700 transition-colors">
                         <Plus className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 flex-1 overflow-auto max-h-[600px]">
                    {editingCat && (
                        <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">{t('admin.menus.name')}</label>
                                <input 
                                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm" 
                                    value={editingCat.name} 
                                    onChange={e => setEditingCat({...editingCat, name: e.target.value})}
                                    onBlur={handleCatBlur}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">English Name</label>
                                <div className="relative">
                                    <input 
                                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm" 
                                        value={editingCat.nameEn || ''} 
                                        onChange={e => setEditingCat({...editingCat, nameEn: e.target.value})}
                                        placeholder={isAIEnabled ? "Auto-generated" : ""}
                                    />
                                    {isAIEnabled && (
                                        <button 
                                            onClick={autoTranslateCat}
                                            disabled={isTranslating || !editingCat.name}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 disabled:opacity-30"
                                            title="Auto Translate"
                                        >
                                            <Sparkles className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">{t('admin.menus.parent')}</label>
                                <select className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white" value={editingCat.parentId || ''} onChange={e => setEditingCat({...editingCat, parentId: e.target.value || null})}>
                                    <option value="">{t('admin.menus.noneRoot')}</option>
                                    {filteredCategories.filter(c => c.id !== editingCat.id).map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setEditingCat(null)} className="px-3 py-1.5 text-xs font-medium text-slate-600">{t('admin.editor.cancel')}</button>
                                <button onClick={handleSaveCat} className="px-3 py-1.5 text-xs font-medium bg-brand-600 text-white rounded flex items-center gap-1"><Save className="w-3 h-3" /> {t('admin.editor.save')}</button>
                            </div>
                        </div>
                    )}

                    <ul className="space-y-1">
                        {filteredCategories.length > 0 ? filteredCategories.map(cat => {
                             const parentName = cat.parentId ? filteredCategories.find(c => c.id === cat.parentId)?.name : null;
                             return (
                                <li key={cat.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                                    <div>
                                        <div className="font-medium text-sm text-slate-900 flex items-center gap-2">
                                            {cat.name}
                                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-normal ${(counts.cats[cat.id] || 0) === 0 ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-500'}`}>
                                                {counts.cats[cat.id] || 0}
                                            </span>
                                            {parentName && <span className="text-xs font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{parentName} &gt;</span>}
                                        </div>
                                        {cat.nameEn && <div className="text-xs text-slate-400 ml-0.5">{cat.nameEn}</div>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleEditCat(cat)} className="p-1.5 text-slate-400 hover:text-brand-600"><Edit3 className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteCat(cat.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </li>
                             );
                        }) : (
                             <div className="text-center text-slate-400 text-sm py-4">
                                 {t('admin.menus.noItems')}
                             </div>
                        )}
                    </ul>
                </div>
            </div>
        </div>
        
        <ConfirmModal 
            isOpen={!!deleteTarget} 
            message={t('admin.menus.deleteConfirm')}
            onConfirm={confirmDelete} 
            onCancel={() => setDeleteTarget(null)} 
        />
    </div>
  );
};

export default Menus;