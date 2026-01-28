import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDocs, deleteDoc, getProducts, getCategories, getAIConfig } from '../../services/storage';
import { Doc, DocStatus, Product, Category } from '../../types';
import { Plus, Edit3, Trash2, FileText, Search, Package, UploadCloud, Sparkles } from '../../components/Icons';
import { format } from 'date-fns';
import { useLanguage } from '../../contexts/LanguageContext';
import BatchUploadModal from '../../components/BatchUploadModal';
import PdfImportModal from '../../components/PdfImportModal';
import ConfirmModal from '../../components/ConfirmModal';
import AlertModal from '../../components/AlertModal';

const Dashboard: React.FC = () => {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [search, setSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  
  // Modals state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null); // For single delete
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false); // For batch delete
  const [alert, setAlert] = useState<{ isOpen: boolean; message: string; type: 'success' | 'error' }>({ isOpen: false, message: '', type: 'success' });

  // Batch Selection State
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  
  // AI State
  const [isAIEnabled, setIsAIEnabled] = useState(false);

  const { t, language } = useLanguage();

  const loadData = () => {
      setDocs(getDocs());
      setProducts(getProducts());
      setCategories(getCategories());
      setSelectedDocs(new Set()); // Reset selection on reload
      
      const ai = getAIConfig();
      setIsAIEnabled(ai.enabled);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredDocs = docs.filter(d => {
      // 1. Search Filter
      const matchesSearch = d.title.toLowerCase().includes(search.toLowerCase());
      
      // 2. Product Filter
      let matchesProduct = true;
      if (selectedProductId) {
          const docCategory = categories.find(c => c.id === d.categoryId);
          if (!docCategory || docCategory.productId !== selectedProductId) {
              matchesProduct = false;
          }
      }

      return matchesSearch && matchesProduct;
  });

  // Delete Handlers
  const confirmDelete = () => {
      if (deleteId) {
          deleteDoc(deleteId);
          loadData();
          setDeleteId(null);
      }
  };

  const confirmBatchDelete = () => {
      selectedDocs.forEach(id => {
          deleteDoc(id);
      });
      loadData();
      setShowBatchDeleteConfirm(false);
      setSelectedDocs(new Set());
  };

  // Selection Handlers
  const toggleSelectAll = () => {
      if (selectedDocs.size === filteredDocs.length && filteredDocs.length > 0) {
          setSelectedDocs(new Set());
      } else {
          setSelectedDocs(new Set(filteredDocs.map(d => d.id)));
      }
  };

  const toggleSelectOne = (id: string) => {
      const newSet = new Set(selectedDocs);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setSelectedDocs(newSet);
  };

  const showAlert = (message: string, type: 'success' | 'error' = 'success') => {
      setAlert({ isOpen: true, message, type });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('admin.dashboard.title')}</h1>
            <p className="text-slate-500 mt-1">{t('admin.dashboard.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
            {isAIEnabled && (
                <button 
                    onClick={() => setShowPdfModal(true)}
                    className="inline-flex items-center justify-center gap-2 bg-purple-50 text-purple-700 border border-purple-200 px-5 py-2.5 rounded-lg hover:bg-purple-100 transition-colors font-medium shadow-sm"
                >
                    <Sparkles className="w-5 h-5" />
                    {t('admin.pdf.title')}
                </button>
            )}
            <button 
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-300 px-5 py-2.5 rounded-lg hover:bg-slate-50 transition-colors font-medium shadow-sm"
            >
                <UploadCloud className="w-5 h-5" />
                {t('admin.upload.title')}
            </button>
            <Link 
                to="/admin/edit/new"
                className="inline-flex items-center justify-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-lg hover:bg-brand-700 transition-colors font-medium shadow-sm"
            >
                <Plus className="w-5 h-5" />
                {t('admin.newDoc')}
            </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center gap-4 justify-between">
              
              <div className="flex items-center gap-4 w-full sm:w-auto">
                  {/* Product Filter Dropdown */}
                  <div className="relative w-full sm:w-48">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                          <Package className="w-4 h-4" />
                      </div>
                      <select
                          value={selectedProductId}
                          onChange={(e) => setSelectedProductId(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer"
                      >
                          <option value="">{t('admin.allProducts')}</option>
                          {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                      </select>
                  </div>

                  {/* Batch Delete Button */}
                  {selectedDocs.size > 0 && (
                      <button 
                          onClick={() => setShowBatchDeleteConfirm(true)}
                          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors animate-[fadeIn_0.2s_ease-out]"
                      >
                          <Trash2 className="w-4 h-4" />
                          {t('admin.batchDelete')} ({selectedDocs.size})
                      </button>
                  )}
              </div>

              {/* Search Bar */}
              <div className="relative w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    placeholder={t('admin.searchPlaceholder')}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" 
                  />
              </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs border-b border-slate-200">
                      <tr>
                          <th className="px-6 py-4 w-12">
                              <input 
                                  type="checkbox" 
                                  checked={filteredDocs.length > 0 && selectedDocs.size === filteredDocs.length}
                                  onChange={toggleSelectAll}
                                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer w-4 h-4"
                              />
                          </th>
                          <th className="px-6 py-4">{t('admin.table.title')}</th>
                          <th className="px-6 py-4">{t('admin.editor.field.product')}</th>
                          <th className="px-6 py-4">{t('admin.table.status')}</th>
                          <th className="px-6 py-4">{t('admin.table.lastUpdated')}</th>
                          <th className="px-6 py-4 text-right">{t('admin.table.actions')}</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredDocs.length > 0 ? filteredDocs.map(doc => {
                          const cat = categories.find(c => c.id === doc.categoryId);
                          const prod = cat ? products.find(p => p.id === cat.productId) : null;
                          const isSelected = selectedDocs.has(doc.id);

                          return (
                            <tr key={doc.id} className={`hover:bg-slate-50 transition-colors group ${isSelected ? 'bg-slate-50' : ''}`}>
                                <td className="px-6 py-4">
                                    <input 
                                        type="checkbox" 
                                        checked={isSelected}
                                        onChange={() => toggleSelectOne(doc.id)}
                                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer w-4 h-4"
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-brand-50 text-brand-600 flex items-center justify-center">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-900">{doc.title}</div>
                                            <div className="text-xs text-slate-500 font-mono mt-0.5">{doc.slug}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                    {prod ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                                            {prod.name}
                                        </span>
                                    ) : <span className="text-slate-300">-</span>}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                        doc.status === DocStatus.PUBLISHED 
                                        ? 'bg-green-50 text-green-700 border-green-100'
                                        : doc.status === DocStatus.ARCHIVED
                                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                                        : 'bg-yellow-50 text-yellow-700 border-yellow-100'
                                    }`}>
                                        {t(`status.${doc.status}`)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-500">
                                    {format(doc.lastUpdated, language === 'zh' ? 'yyyy-MM-dd' : 'MMM d, yyyy')}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Link 
                                            to={`/admin/edit/${doc.id}`}
                                            className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                                            title={t('admin.editor.editTitle')}
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </Link>
                                        <button 
                                            onClick={() => setDeleteId(doc.id)}
                                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                          );
                      }) : (
                          <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                  {t('admin.noDocs')}
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
      
      {/* Modals */}
      <BatchUploadModal 
        isOpen={showUploadModal} 
        onClose={() => setShowUploadModal(false)} 
        onSuccess={() => { loadData(); showAlert(t('admin.upload.success')); }} 
      />

      {isAIEnabled && (
          <PdfImportModal 
            isOpen={showPdfModal}
            onClose={() => setShowPdfModal(false)}
            onSuccess={() => { loadData(); showAlert(t('admin.pdf.success')); }}
          />
      )}
      
      <ConfirmModal 
          isOpen={!!deleteId} 
          message={t('admin.deleteConfirm')}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
      />

      <ConfirmModal 
          isOpen={showBatchDeleteConfirm} 
          message={t('admin.batchDeleteConfirm', { count: selectedDocs.size })}
          onConfirm={confirmBatchDelete}
          onCancel={() => setShowBatchDeleteConfirm(false)}
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

export default Dashboard;