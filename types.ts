
export enum DocStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

export interface Product {
  id: string;
  name: string;
  nameEn?: string; // Added English name
  description?: string;
  order: number;
}

export interface Doc {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
  content: string; // Markdown content
  lastUpdated: number;
  status: DocStatus;
  author: string;
  version?: string;
  helpfulCount?: number;
  unhelpfulCount?: number;
}

export interface DocVersion {
  id: string;
  docId: string;
  title: string;
  content: string;
  version: string;
  timestamp: number;
  author: string;
  note?: string;
}

export interface Category {
  id: string;
  productId: string;
  topNavId: string; // Link category to a specific top nav item
  name: string;
  nameEn?: string; // Added English name
  parentId: string | null;
  order: number;
}

export interface TopNavItem {
  id: string;
  productId: string; // Link top nav to a product
  label: string;
  labelEn?: string; // Added English label
  path: string; // If it's a link, use http. If it's a section, use internal ID logic
  order: number;
  type: 'internal' | 'external';
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: 'admin' | 'editor' | 'guest'; // Added guest role
  displayName: string;
  status: 'PENDING' | 'ACTIVE'; // Added status for approval workflow
  wechatOpenId?: string; // For WeChat Login binding
}

export interface NavItem {
  id: string;
  title: string;
  path?: string;
  children?: NavItem[];
}

export interface WeChatConfig {
  appId: string;
  appSecret: string;
  token: string;
  encodingAesKey: string;
  callbackUrl: string;
  enabled: boolean;
}

export type AIProvider = 'gemini' | 'bailian';

export interface AIConfig {
  enabled: boolean;
  priority: AIProvider[]; // Ordered list of providers
  gemini: {
    enabled: boolean; // Individual toggle
    apiKey: string;
    model: string;
  };
  bailian: {
    enabled: boolean; // Individual toggle
    apiKey: string;
    baseURL: string;
    model: string;
  };
}