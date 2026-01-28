import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProducts, saveProduct, deleteProduct, getAIConfig } from '../../services/storage';
import { translateToEnglish } from '../../services/geminiService';
import { Product } from '../../types';
import { Plus, Edit3, Trash2, Package, Save, Sparkles } from '../../components/Icons';
import { useLanguage } from '../../contexts/LanguageContext';
import ConfirmModal from '../../components/ConfirmModal';
import AlertModal from '../../components/AlertModal';

const Products: React.FC = () => {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ isOpen: boolean; message: string; type: 'success' | 'error' }>({ isOpen: false, message: '', type: 'error' });
  const [isTranslating, setIsTranslating] = useState(false);
  const [isAIEnabled, setIsAIEnabled] = useState(false);

  useEffect(() => {
    loadProducts();
    setIsAIEnabled(getAIConfig().enabled);
  }, []);

  const loadProducts = () => {
    setProducts(getProducts().sort((a, b) => a.order - b.order));
  };

  const handleEdit = (p: Product) => setEditingProduct({ ...p });
  
  const handleNew = () => setEditingProduct({ 
    id: `prod_${Date.now()}`, 
    name: '', 
    nameEn: '',
    order: products.length + 1 
  });

  const handleSave = () => {
    if (editingProduct) {
      if (!editingProduct.name || !editingProduct.id) {
        setAlert({ isOpen: true, message: t('admin.products.error'), type: 'error' });
        return;
      }
      saveProduct(editingProduct);
      setEditingProduct(null);
      loadProducts();
    }
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
        deleteProduct(deleteId);
        loadProducts();
        setDeleteId(null);
    }
  };

  const autoTranslate = async () => {
      if (!editingProduct || !editingProduct.name) return;
      setIsTranslating(true);
      const en = await translateToEnglish(editingProduct.name);
      setEditingProduct(prev => prev ? { ...prev, nameEn: en } : null);
      setIsTranslating(false);
  };

  const handleBlur = () => {
      // If English name is empty, try to auto translate
      if (editingProduct && editingProduct.name && !editingProduct.nameEn && isAIEnabled) {
          autoTranslate();
      }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('admin.products.title')}</h1>
          <p className="text-slate-500 mt-1">{t('admin.products.subtitle')}</p>
        </div>
        <Link to="/admin" className="text-sm font-medium text-slate-600 hover:text-brand-600">
          {t('admin.backToDashboard')}
        </Link>
      </div>

      <div className="flex gap-8 flex-col lg:flex-row">
        {/* Product List */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Package className="w-4 h-4" /> {t('admin.products.title')}
            </h2>
            <button onClick={handleNew} className="p-1.5 bg-brand-600 text-white rounded hover:bg-brand-700 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="p-0 overflow-auto">
              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs border-b border-slate-200">
                      <tr>
                          <th className="px-6 py-4">{t('admin.products.name')}</th>
                          <th className="px-6 py-4">English Name</th>
                          <th className="px-6 py-4">{t('admin.products.id')}</th>
                          <th className="px-6 py-4">{t('admin.menus.order')}</th>
                          <th className="px-6 py-4 text-right">{t('admin.table.actions')}</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {products.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4 font-medium text-slate-900">{p.name}</td>
                              <td className="px-6 py-4 text-slate-600">{p.nameEn || '-'}</td>
                              <td className="px-6 py-4 text-slate-600 font-mono text-xs">{p.id}</td>
                              <td className="px-6 py-4 text-slate-600">{p.order}</td>
                              <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                      <button onClick={() => handleEdit(p)} className="p-1.5 text-slate-400 hover:text-brand-600"><Edit3 className="w-4 h-4" /></button>
                                      <button onClick={() => handleDelete(p.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
        </div>

        {/* Editor Form */}
        {editingProduct && (
            <div className="w-full lg:w-96 bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
                <h3 className="font-bold text-lg mb-4 text-slate-800">{t('admin.products.add')}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">{t('admin.products.name')}</label>
                        <input 
                            className="w-full px-3 py-2 border border-slate-300 rounded text-sm" 
                            value={editingProduct.name} 
                            onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                            onBlur={handleBlur}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">English Name</label>
                        <div className="relative">
                            <input 
                                className="w-full px-3 py-2 border border-slate-300 rounded text-sm" 
                                value={editingProduct.nameEn || ''} 
                                onChange={e => setEditingProduct({...editingProduct, nameEn: e.target.value})}
                                placeholder={isAIEnabled ? "Auto-generated" : ""}
                            />
                             {isAIEnabled && (
                                 <button 
                                    onClick={autoTranslate}
                                    disabled={isTranslating || !editingProduct.name}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 disabled:opacity-30"
                                    title="Auto Translate"
                                >
                                    {isTranslating ? (
                                        <div className="w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <Sparkles className="w-3 h-3" />
                                    )}
                                </button>
                             )}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">{t('admin.products.id')}</label>
                        <input 
                            type="text"
                            className="w-full px-3 py-2 border border-slate-300 rounded text-sm font-mono" 
                            value={editingProduct.id} 
                            onChange={e => setEditingProduct({...editingProduct, id: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">{t('admin.menus.order')}</label>
                        <input 
                            type="number"
                            className="w-full px-3 py-2 border border-slate-300 rounded text-sm" 
                            value={editingProduct.order} 
                            onChange={e => setEditingProduct({...editingProduct, order: parseInt(e.target.value) || 0})}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button onClick={() => setEditingProduct(null)} className="px-3 py-1.5 text-sm font-medium text-slate-600">{t('admin.editor.cancel')}</button>
                        <button onClick={handleSave} className="px-3 py-1.5 text-sm font-medium bg-brand-600 text-white rounded flex items-center gap-1">
                            <Save className="w-4 h-4" /> {t('admin.editor.save')}
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>

      <ConfirmModal 
        isOpen={!!deleteId} 
        message={t('admin.deleteConfirm')}
        onConfirm={confirmDelete} 
        onCancel={() => setDeleteId(null)} 
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

export default Products;