import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product } from '../types';
import { getProducts } from '../services/storage';

interface ProductContextType {
  products: Product[];
  currentProduct: Product | null;
  currentTopNavId: string | null;
  setProductId: (id: string) => void;
  setTopNavId: (id: string) => void;
  refreshProducts: () => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [currentTopNavId, setCurrentTopNavId] = useState<string | null>(null);

  const refreshProducts = () => {
    const prods = getProducts().sort((a, b) => a.order - b.order);
    setProducts(prods);
    // Default to first product if none selected or invalid
    if (prods.length > 0) {
        const storedId = localStorage.getItem('devcenter_current_product');
        const found = prods.find(p => p.id === storedId);
        setCurrentProduct(found || prods[0]);
    }
  };

  useEffect(() => {
    refreshProducts();
  }, []);

  const setProductId = (id: string) => {
    const found = products.find(p => p.id === id);
    if (found) {
      setCurrentProduct(found);
      localStorage.setItem('devcenter_current_product', found.id);
      // When product changes, TopNav needs to be reset/recalculated by consuming components
      setCurrentTopNavId(null); 
    }
  };

  const setTopNavId = (id: string) => {
      setCurrentTopNavId(id);
  };

  return (
    <ProductContext.Provider value={{ products, currentProduct, currentTopNavId, setProductId, setTopNavId, refreshProducts }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProduct = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProduct must be used within a ProductProvider');
  }
  return context;
};