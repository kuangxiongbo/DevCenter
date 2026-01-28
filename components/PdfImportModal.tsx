import React, { useState, useRef, useEffect } from 'react';
import { FileText, X, ChevronDown, Sparkles, UploadCloud, Check } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { getProducts, getTopNavItems, getCategories, saveDoc, saveCategory } from '../services/storage';
import { Product, TopNavItem, Category, DocStatus } from '../types';
import { analyzePdfContent, ImportedDocStructure } from '../services/geminiService';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;

interface PdfImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PdfImportModal: React.FC<PdfImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useLanguage();
  
  // Steps: 'upload' -> 'analyzing' -> 'review' -> 'success'
  const [step, setStep] = useState<'upload' | 'analyzing' | 'review'>('upload');

  // File & Data
  const [file, setFile] = useState<File | null>(null);
  const [analyzedData, setAnalyzedData] = useState<ImportedDocStructure[]>([]);
  
  // Configuration
  const [products, setProducts] = useState<Product[]>([]);
  const [topNavs, setTopNavs] = useState<TopNavItem[]>([]);
  
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedTopNavId, setSelectedTopNavId] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
        setProducts(getProducts());
        setTopNavs(getTopNavItems());
        setStep('upload');
        setFile(null);
        setAnalyzedData([]);
        setError('');
        setSelectedProductId('');
        setSelectedTopNavId('');
    }
  }, [isOpen]);

  const availableNavs = topNavs.filter(n => n.productId === selectedProductId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const selectedFile = e.target.files[0];
          if (selectedFile.type !== 'application/pdf') {
              setError('Please select a PDF file.');
              return;
          }
          setFile(selectedFile);
          setError('');
      }
  };

  const extractTextFromPdf = async (file: File): Promise<string> => {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      let fullText = '';
      const maxPages = Math.min(pdf.numPages, 20); 
      
      for (let i = 1; i <= maxPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += `--- Page ${i} ---\n${pageText}\n\n`;
      }
      
      return fullText;
  };

  const startAnalysis = async () => {
      if (!file || !selectedProductId || !selectedTopNavId) {
          setError(t('admin.pdf.error'));
          return;
      }

      setStep('analyzing');
      try {
          const text = await extractTextFromPdf(file);
          const docs = await analyzePdfContent(text);
          setAnalyzedData(docs);
          setStep('review');
      } catch (e) {
          console.error(e);
          setError(t('admin.pdf.fail'));
          setStep('upload');
      }
  };

  const handleImport = () => {
      // 1. Group docs by category
      const categoryMap = new Map<string, ImportedDocStructure[]>();
      analyzedData.forEach(doc => {
          const cat = doc.categoryName || 'General';
          if (!categoryMap.has(cat)) categoryMap.set(cat, []);
          categoryMap.get(cat)?.push(doc);
      });

      // 2. Create Categories & Docs
      const existingCats = getCategories();
      let orderCounter = existingCats.filter(c => c.topNavId === selectedTopNavId).length + 1;

      categoryMap.forEach((docs, catName) => {
          // Create Category
          const catId = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          saveCategory({
              id: catId,
              productId: selectedProductId,
              topNavId: selectedTopNavId,
              name: catName,
              parentId: null,
              order: orderCounter++
          });

          // Create Docs
          docs.forEach(d => {
              const slug = d.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + `-${Date.now().toString().slice(-4)}`;
              saveDoc({
                  id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                  title: d.title,
                  slug: slug,
                  categoryId: catId,
                  content: d.content,
                  lastUpdated: Date.now(),
                  status: DocStatus.PUBLISHED,
                  author: localStorage.getItem('devcenter_username') || 'System',
                  version: '1.0.0'
              });
          });
      });

      onSuccess();
      onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.1s_ease-out]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
            <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    {t('admin.pdf.title')}
                </h2>
                <p className="text-sm text-slate-500 mt-1">{t('admin.pdf.subtitle')}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
            </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            {step === 'upload' && (
                <div className="space-y-6">
                    {/* Config Section */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('admin.pdf.targetProduct')}</label>
                            <div className="relative">
                                <select 
                                    value={selectedProductId}
                                    onChange={e => { setSelectedProductId(e.target.value); setSelectedTopNavId(''); }}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm appearance-none bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                                >
                                    <option value="">{t('admin.editor.selectProduct')}</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('admin.pdf.targetTab')}</label>
                            <div className="relative">
                                <select 
                                    value={selectedTopNavId}
                                    onChange={e => setSelectedTopNavId(e.target.value)}
                                    disabled={!selectedProductId}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm appearance-none bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none disabled:bg-slate-50"
                                >
                                    <option value="">{t('admin.editor.selectTab')}</option>
                                    {availableNavs.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Dropzone */}
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors group ${file ? 'border-purple-500 bg-purple-50' : 'border-slate-300 hover:border-purple-500 hover:bg-slate-50'}`}
                    >
                        {file ? (
                            <>
                                <FileText className="w-12 h-12 text-purple-600 mb-3" />
                                <p className="text-sm font-medium text-slate-900">{file.name}</p>
                                <p className="text-xs text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                <p className="text-xs text-purple-600 font-medium mt-3">{t('admin.pdf.clickToChange')}</p>
                            </>
                        ) : (
                            <>
                                <UploadCloud className="w-12 h-12 text-slate-300 group-hover:text-purple-500 mb-3 transition-colors" />
                                <p className="text-sm font-medium text-slate-600 group-hover:text-purple-700">{t('admin.pdf.clickToUpload')}</p>
                                <p className="text-xs text-slate-400 mt-1">{t('admin.pdf.maxPages')}</p>
                            </>
                        )}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept=".pdf" 
                            className="hidden" 
                        />
                    </div>
                </div>
            )}

            {step === 'analyzing' && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-6"></div>
                    <h3 className="text-lg font-bold text-slate-900">{t('admin.pdf.analyzing')}</h3>
                    <p className="text-slate-500 mt-2 max-w-sm">
                        {t('admin.pdf.analyzingDesc')}
                    </p>
                </div>
            )}

            {step === 'review' && (
                <div className="space-y-4">
                    <div className="bg-green-50 text-green-800 p-4 rounded-lg text-sm border border-green-100 flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        {t('admin.pdf.complete', { count: analyzedData.length })}
                    </div>
                    <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                        {analyzedData.map((doc, idx) => (
                            <div key={idx} className="p-4 hover:bg-slate-50">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-semibold text-slate-800 text-sm">{doc.title}</h4>
                                    <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">{doc.categoryName}</span>
                                </div>
                                <p className="text-xs text-slate-400 line-clamp-2">{doc.content.substring(0, 150)}...</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
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
                {step === 'upload' && (
                    <button 
                        onClick={startAnalysis}
                        disabled={!file}
                        className="px-6 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Sparkles className="w-4 h-4" /> {t('admin.pdf.analyze')}
                    </button>
                )}
                {step === 'review' && (
                    <button 
                        onClick={handleImport}
                        className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                        <UploadCloud className="w-4 h-4" /> {t('admin.pdf.import', { count: analyzedData.length })}
                    </button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default PdfImportModal;