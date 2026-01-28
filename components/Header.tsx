import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Search, Terminal, Globe, ChevronDown, FileText } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useProduct } from '../contexts/ProductContext';
import { getTopNavItems, getDocs, getCategories } from '../services/storage';
import { TopNavItem, Doc } from '../types';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const { products, currentProduct, setProductId, currentTopNavId, setTopNavId } = useProduct();
  
  // Use state for auth status to trigger re-renders
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('devcenter_auth') === 'true');
  const [userRole, setUserRole] = useState(localStorage.getItem('devcenter_user_role'));
  
  const [navItems, setNavItems] = useState<TopNavItem[]>([]);
  const [showProductMenu, setShowProductMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Doc[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  
  const productMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const isAdmin = location.pathname.startsWith('/admin');

  // Listen for auth changes
  useEffect(() => {
    const checkAuth = () => {
        setIsLoggedIn(localStorage.getItem('devcenter_auth') === 'true');
        setUserRole(localStorage.getItem('devcenter_user_role'));
    };
    
    // Check on mount
    checkAuth();
    
    // Listen for custom event from Login/Logout
    window.addEventListener('auth-change', checkAuth);
    return () => window.removeEventListener('auth-change', checkAuth);
  }, []);

  useEffect(() => {
    // Filter nav items for current product
    const allNavs = getTopNavItems().sort((a, b) => a.order - b.order);
    const productNavs = currentProduct 
        ? allNavs.filter(n => n.productId === currentProduct.id)
        : [];
    setNavItems(productNavs);

    // Auto-select first nav if none selected (e.g. initial load or product switch)
    // Only if not already set, to prevent overriding deep links
    if (currentProduct && productNavs.length > 0 && !currentTopNavId && !isAdmin) {
         setTopNavId(productNavs[0].id);
    }
  }, [currentProduct, currentTopNavId, isAdmin]);

  // Handle Search
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
        const docs = getDocs();
        const results = docs.filter(d => 
            d.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
            d.content.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 5);
        setSearchResults(results);
        setShowSearch(true);
    } else {
        setSearchResults([]);
        setShowSearch(false);
    }
  }, [searchQuery]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (productMenuRef.current && !productMenuRef.current.contains(event.target as Node)) {
            setShowProductMenu(false);
        }
        if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
            setShowSearch(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
      localStorage.removeItem('devcenter_auth');
      localStorage.removeItem('devcenter_user_role');
      localStorage.removeItem('devcenter_username');
      
      // Notify other components
      window.dispatchEvent(new Event('auth-change'));
      
      // If we are in admin, go home.
      if (isAdmin) {
          navigate('/');
      }
  };

  const handleProductSwitch = (prodId: string) => {
    setProductId(prodId);
    setShowProductMenu(false);

    // Smart Navigation Logic:
    // When switching products, we want to go to the first valid page of that product
    // rather than the generic homepage, because the generic homepage might default back 
    // to the "default" product in DocViewer logic, confusing the user.
    
    const allNavs = getTopNavItems();
    const prodNavs = allNavs.filter(n => n.productId === prodId).sort((a,b) => a.order - b.order);

    if (prodNavs.length > 0) {
        const firstNav = prodNavs[0];
        setTopNavId(firstNav.id);

        if (firstNav.type === 'internal') {
            // Try to find the first doc in the first category of this top nav
            const allCats = getCategories();
            const relevantCats = allCats.filter(c => c.topNavId === firstNav.id).sort((a,b) => a.order - b.order);
            
            if (relevantCats.length > 0) {
                const allDocs = getDocs();
                // Find first published doc in first category
                const relevantDocs = allDocs.filter(d => d.categoryId === relevantCats[0].id && d.status === 'PUBLISHED');
                
                if (relevantDocs.length > 0) {
                    navigate(`/docs/${relevantDocs[0].slug}`);
                    return;
                }
            }
            // Fallback: If no specific doc found, try the path defined in nav
            navigate(firstNav.path);
        } else {
            // External, just go to home or stay
            navigate('/');
        }
    } else {
        navigate('/');
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh');
  };

  const getNavLinkClass = (isActive: boolean) => 
      `px-3 py-2 rounded-md transition-colors whitespace-nowrap ${isActive ? 'text-brand-600 bg-brand-50 font-semibold' : 'hover:text-brand-600 hover:bg-slate-50'}`;

  // Helper for Product Name
  const getProductName = (p: typeof currentProduct) => {
      if (!p) return '';
      return language === 'en' ? (p.nameEn || p.name) : p.name;
  }

  // Helper for Nav Label
  const getNavLabel = (item: TopNavItem) => {
      return language === 'en' ? (item.labelEn || item.label) : item.label;
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-4 lg:px-8">
      <div className="flex items-center gap-4">
        {!isAdmin && (
            <button 
            onClick={toggleSidebar}
            className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-md md:hidden"
            >
            <Menu className="w-6 h-6" />
            </button>
        )}
        
        <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-sm group-hover:bg-brand-700 transition-colors">
                    <Terminal className="w-5 h-5" />
                </div>
                <span className="font-bold text-lg text-slate-800 tracking-tight hidden sm:block">{t('app.title')}</span>
            </Link>

            {/* Product Switcher - Hide in Admin Mode to avoid confusion */}
            {!isAdmin && currentProduct && (
                <div className="relative" ref={productMenuRef}>
                    <div className="flex items-center gap-3">
                        <span className="text-slate-300 mx-1">•</span>
                        <button 
                            onClick={() => setShowProductMenu(!showProductMenu)}
                            className="flex items-center gap-1.5 text-slate-700 hover:text-brand-600 font-medium text-sm transition-colors py-1"
                        >
                            {getProductName(currentProduct)}
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showProductMenu ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {showProductMenu && (
                        <div className="absolute top-full left-4 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-50 animate-[fadeIn_0.1s_ease-out]">
                             {products.map(product => (
                                 <button
                                     key={product.id}
                                     onClick={() => handleProductSwitch(product.id)}
                                     className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${currentProduct.id === product.id ? 'text-brand-600 font-medium bg-brand-50' : 'text-slate-700'}`}
                                 >
                                     {language === 'en' ? (product.nameEn || product.name) : product.name}
                                 </button>
                             ))}
                        </div>
                    )}
                </div>
            )}
            
            {/* Admin Badge */}
            {isAdmin && (
                <span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded border border-slate-200 ml-2">{t('header.consoleBadge')}</span>
            )}
        </div>

        {/* Dynamic Top Nav */}
        <nav className="hidden md:flex items-center ml-8 gap-1 text-sm font-medium text-slate-600 overflow-x-auto no-scrollbar">
            {isAdmin ? (
                // Admin Navigation
                <>
                    <Link to="/admin" className={getNavLinkClass(location.pathname === '/admin')}>
                        {t('admin.dashboard.title')}
                    </Link>
                    {userRole === 'admin' && (
                        <>
                            <Link to="/admin/menus" className={getNavLinkClass(location.pathname.includes('/menus'))}>
                                {t('admin.menus')}
                            </Link>
                            <Link to="/admin/products" className={getNavLinkClass(location.pathname.includes('/products'))}>
                                {t('admin.products.title')} 
                            </Link>
                            <Link to="/admin/users" className={getNavLinkClass(location.pathname.includes('/users'))}>
                                {t('admin.users')}
                            </Link>
                            <Link to="/admin/wechat" className={getNavLinkClass(location.pathname.includes('/wechat'))}>
                                {t('admin.wechat')}
                            </Link>
                            <Link to="/admin/ai" className={getNavLinkClass(location.pathname.includes('/ai'))}>
                                {t('admin.ai')}
                            </Link>
                        </>
                    )}
                </>
            ) : (
                // Public Navigation
                navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => {
                            setTopNavId(item.id);
                            if (item.type === 'internal') navigate(item.path);
                            else window.open(item.path, '_blank');
                        }}
                        className={getNavLinkClass(currentTopNavId === item.id)}
                    >
                        {getNavLabel(item)}
                    </button>
                ))
            )}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {/* Functional Search */}
        <div className="relative hidden lg:block group" ref={searchRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-brand-500" />
            <input 
                type="text" 
                placeholder={isAdmin ? t('admin.searchPlaceholder') : t('search.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if(searchResults.length > 0) setShowSearch(true); }}
                className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-sm text-slate-700 w-64 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
            
            {showSearch && (
                <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-[100] animate-[fadeIn_0.1s_ease-out]">
                    {searchResults.length > 0 ? (
                        <ul>
                            {searchResults.map(res => (
                                <li key={res.id}>
                                    <Link 
                                        to={`/admin/edit/${res.id}`} 
                                        onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                                        className="block p-4 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors"
                                    >
                                        <div className="font-medium text-brand-600 text-sm mb-1">{res.title}</div>
                                        <div className="text-xs text-slate-500 line-clamp-2">{res.content.substring(0, 150)}...</div>
                                        {isAdmin && <div className="mt-1 text-[10px] text-slate-400 uppercase tracking-wider">{t('header.clickToEdit')}</div>}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-4 text-center text-slate-500 text-sm">No results found</div>
                    )}
                </div>
            )}
        </div>

        <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

        <button 
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors"
          title="Switch Language"
        >
          <Globe className="w-4 h-4" />
          <span className="uppercase">{language}</span>
        </button>

        {isLoggedIn ? (
            <div className="flex items-center gap-3">
                 {/* Show console link only if NOT in admin AND NOT guest */}
                 {!isAdmin && userRole !== 'guest' && (
                    <Link to="/admin" className="text-sm font-medium text-slate-600 hover:text-brand-600">{t('nav.console')}</Link>
                 )}
                 {isAdmin && (
                    <Link to="/" className="text-sm font-medium text-slate-600 hover:text-brand-600">{t('doc.returnHome')}</Link>
                 )}
                 <button onClick={handleLogout} className="text-sm font-medium text-red-500 hover:text-red-600">{t('nav.logout')}</button>
            </div>
        ) : (
            <Link 
                to="/login"
                state={{ from: location }} 
                className="text-sm font-medium bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
            >
                {t('nav.login')}
            </Link>
        )}
      </div>
      <style>{`
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </header>
  );
};

export default Header;