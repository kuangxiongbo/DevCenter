import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileText, X, Check, ChevronDown } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { getProducts, getTopNavItems, getCategories, saveDoc, getDocs } from '../services/storage';
import { Product, TopNavItem, Category, DocStatus } from '../types';

interface BatchUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BatchUploadModal: React.FC<BatchUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useLanguage();
  
  // File State
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuration State
  const [products, setProducts] = useState<Product[]>([]);
  const [topNavs, setTopNavs] = useState<TopNavItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Selection State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedTopNavId, setSelectedTopNavId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  // Process State
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
        setProducts(getProducts());
        const allNavs = getTopNavItems();
        setTopNavs(allNavs);
        const allCats = getCategories();
        setCategories(allCats);
        setFiles([]);
        setSelectedProductId('');
        setSelectedTopNavId('');
        setSelectedCategoryId('');
        setError('');
    }
  }, [isOpen]);

  // Derived options
  const availableNavs = topNavs.filter(n => n.productId === selectedProductId);
  const availableCategories = categories.filter(c => c.productId === selectedProductId && c.topNavId === selectedTopNavId);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          const newFiles = Array.from(e.target.files).filter(f => f.name.endsWith('.md'));
          setFiles(prev => [...prev, ...newFiles]);
      }
  };

  const removeFile = (index: number) => {
      setFiles(files.filter((_, i) => i !== index));
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-\u4e00-\u9fa5]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  };

  const readFileContent = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
      });
  };

  const handleSubmit = async () => {
      setError('');
      if (files.length === 0) {
          setError(t('admin.upload.noFiles'));
          return;
      }
      if (!selectedProductId || !selectedTopNavId || !selectedCategoryId) {
          setError(t('admin.upload.error'));
          return;
      }

      setIsUploading(true);
      try {
          const allDocs = getDocs();
          for (const file of files) {
              const content = await readFileContent(file);
              
              const titleMatch = content.match(/^#\s+(.+)$/m);
              const title = titleMatch ? titleMatch[1].trim() : file.name.replace(/\.md$/i, '');
              
              const baseSlug = generateSlug(title) || `doc-${Date.now()}`;
              
              let slug = baseSlug;
              let counter = 1;
              while (allDocs.some(d => d.slug === slug)) {
                  slug = `${baseSlug}-${counter}`;
                  counter++;
              }

              saveDoc({
                  id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  title: title,
                  slug: slug,
                  categoryId: selectedCategoryId,
                  content: content,
                  lastUpdated: Date.now(),
                  status: DocStatus.PUBLISHED,
                  author: localStorage.getItem('devcenter_username') || 'Admin',
                  version: '1.0.0'
              });
          }
          onSuccess();
          onClose();
      } catch (e) {
          console.error(e);
          setError(t('admin.upload.failed'));
      } finally {
          setIsUploading(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.1s_ease-out]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
            <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <UploadCloud className="w-6 h-6 text-brand-600" />
                    {t('admin.upload.title')}
                </h2>
                <p className="text-sm text-slate-500 mt-1">{t('admin.upload.subtitle')}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
            </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
            {/* 1. File Selection */}
            <div className="space-y-3">
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-brand-500 hover:bg-brand-50 transition-colors group"
                >
                    <UploadCloud className="w-10 h-10 text-slate-300 group-hover:text-brand-500 mb-2 transition-colors" />
                    <p className="text-sm font-medium text-slate-600 group-hover:text-brand-600">{t('admin.upload.dropzone')}</p>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        multiple 
                        accept=".md" 
                        className="hidden" 
                    />
                </div>

                {/* File List */}
                {files.length > 0 && (
                    <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                        {files.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 text-sm">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                                    <span className="truncate text-slate-700 font-medium">{file.name}</span>
                                    <span className="text-xs text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
                                </div>
                                <button onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                {files.length > 0 && (
                    <p className="text-xs text-right text-slate-500">{files.length} {t('admin.upload.selected')}</p>
                )}
            </div>

            {/* 2. Destination Config */}
            <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                    {t('admin.upload.config')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Product */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('admin.editor.field.product')}</label>
                        <div className="relative">
                            <select 
                                value={selectedProductId}
                                onChange={e => { setSelectedProductId(e.target.value); setSelectedTopNavId(''); setSelectedCategoryId(''); }}
                                className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm appearance-none bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                            >
                                <option value="">{t('admin.editor.selectProduct')}</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Top Nav */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('admin.editor.field.topNav')}</label>
                        <div className="relative">
                            <select 
                                value={selectedTopNavId}
                                onChange={e => { setSelectedTopNavId(e.target.value); setSelectedCategoryId(''); }}
                                disabled={!selectedProductId}
                                className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm appearance-none bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none disabled:bg-slate-50 disabled:text-slate-400"
                            >
                                <option value="">{t('admin.editor.selectTab')}</option>
                                {availableNavs.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('admin.editor.field.category')}</label>
                        <div className="relative">
                            <select 
                                value={selectedCategoryId}
                                onChange={e => setSelectedCategoryId(e.target.value)}
                                disabled={!selectedTopNavId}
                                className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm appearance-none bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none disabled:bg-slate-50 disabled:text-slate-400"
                            >
                                <option value="">{t('admin.editor.selectCategory')}</option>
                                {availableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-sm font-medium text-red-500">{error}</span>
            <div className="flex gap-3">
                <button 
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                    {t('admin.editor.cancel')}
                </button>
                <button 
                    onClick={handleSubmit}
                    disabled={isUploading || files.length === 0}
                    className="px-6 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isUploading ? (
                        <>{t('admin.upload.processing')}</>
                    ) : (
                        <><UploadCloud className="w-4 h-4" /> {t('admin.upload.submit')}</>
                    )}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default BatchUploadModal;