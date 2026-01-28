import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Category, Doc } from '../types';
import { getCategories, getDocs } from '../services/storage';
import { ChevronRight, ChevronDown } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useProduct } from '../contexts/ProductContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { t, language } = useLanguage();
  const { currentProduct, currentTopNavId } = useProduct();

  useEffect(() => {
    // Reload docs and categories whenever they might change or product changes
    const allCategories = getCategories();
    
    // Complex Filtering:
    // 1. Must match current Product
    // 2. Must match current Top Nav (if set).
    
    let filteredCats = allCategories.filter(c => c.productId === currentProduct?.id);
    
    if (currentTopNavId) {
        filteredCats = filteredCats.filter(c => c.topNavId === currentTopNavId);
    }

    setCategories(filteredCats);
    setDocs(getDocs());
    
    // Auto expand all top level categories
    setExpanded(new Set(filteredCats.map(c => c.id)));
  }, [currentProduct, currentTopNavId]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpanded(newExpanded);
  };

  const getCatName = (cat: Category) => {
      return language === 'en' ? (cat.nameEn || cat.name) : cat.name;
  };

  const renderTree = (parentId: string | null) => {
    const childCats = categories.filter(c => c.parentId === parentId).sort((a, b) => a.order - b.order);
    
    // Leaf node category (display docs)
    if (childCats.length === 0 && parentId !== null) {
        const catDocs = docs.filter(d => d.categoryId === parentId && d.status === 'PUBLISHED');
        if (catDocs.length === 0) return <div className="pl-6 py-1 text-xs text-slate-400 italic">Empty</div>;
        
        return (
            <div className="pl-4 border-l border-slate-200 ml-2">
                {catDocs.map(doc => (
                    <NavLink
                        key={doc.id}
                        to={`/docs/${doc.slug}`}
                        className={({ isActive }) => 
                            `block py-1.5 px-3 text-sm rounded-md mb-1 transition-colors ${isActive ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`
                        }
                        onClick={() => {
                            if (window.innerWidth < 768) onClose();
                        }}
                    >
                        {doc.title}
                    </NavLink>
                ))}
            </div>
        );
    }

    return (
      <ul className="space-y-1">
        {childCats.map(cat => (
          <li key={cat.id}>
            <button
              onClick={() => toggleExpand(cat.id)}
              className="flex items-center w-full py-2 px-2 text-sm font-semibold text-slate-700 hover:text-brand-600 group"
            >
              {expanded.has(cat.id) ? (
                <ChevronDown className="w-4 h-4 mr-1 text-slate-400 group-hover:text-brand-500" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-1 text-slate-400 group-hover:text-brand-500" />
              )}
              {getCatName(cat)}
            </button>
            {expanded.has(cat.id) && (
              <div className="pl-2">
                {renderTree(cat.id)}
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar Container */}
      <aside 
        className={`
          fixed top-16 left-0 bottom-0 z-50 w-72 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out overflow-y-auto custom-scrollbar
          md:translate-x-0 md:block
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                {currentProduct ? (language === 'en' ? (currentProduct.nameEn || currentProduct.name) : currentProduct.name) : t('sidebar.title')}
            </h3>
            {categories.length > 0 ? renderTree(null) : (
                <div className="text-sm text-slate-400 text-center py-8">
                    {currentTopNavId ? 'No categories found.' : 'Select a tab above.'}
                </div>
            )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;