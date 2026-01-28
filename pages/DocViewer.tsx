
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { getDocBySlug, getCategories, getDocs, submitFeedback } from '../services/storage';
import { Doc } from '../types';
import { format } from 'date-fns';
import { Check, ChevronRight, Copy, ThumbsUp, ThumbsDown, Package, Clock, User as UserIcon, Tag } from '../components/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useProduct } from '../contexts/ProductContext';
import yaml from 'https://esm.sh/js-yaml@4.1.0';

// Define VS Code Dark Plus theme manually to avoid import errors with ESM
const vscDarkPlus: any = {
  "code[class*=\"language-\"]": {
    "color": "#d4d4d4",
    "fontSize": "13px",
    "textShadow": "none",
    "fontFamily": "Menlo, Monaco, Consolas, \"Andale Mono\", \"Ubuntu Mono\", \"Courier New\", monospace",
    "direction": "ltr",
    "textAlign": "left",
    "whiteSpace": "pre",
    "wordSpacing": "normal",
    "wordBreak": "normal",
    "lineHeight": "1.5",
    "MozTabSize": "4",
    "OTabSize": "4",
    "tabSize": "4",
    "WebkitHyphens": "none",
    "MozHyphens": "none",
    "msHyphens": "none",
    "hyphens": "none",
    "background": "#1e1e1e"
  },
  "pre[class*=\"language-\"]": {
    "color": "#d4d4d4",
    "fontSize": "13px",
    "textShadow": "none",
    "fontFamily": "Menlo, Monaco, Consolas, \"Andale Mono\", \"Ubuntu Mono\", \"Courier New\", monospace",
    "direction": "ltr",
    "textAlign": "left",
    "whiteSpace": "pre",
    "wordSpacing": "normal",
    "wordBreak": "normal",
    "lineHeight": "1.5",
    "MozTabSize": "4",
    "OTabSize": "4",
    "tabSize": "4",
    "WebkitHyphens": "none",
    "MozHyphens": "none",
    "msHyphens": "none",
    "hyphens": "none",
    "padding": "1em",
    "margin": ".5em 0",
    "overflow": "auto",
    "background": "#1e1e1e",
    "borderRadius": "0.5rem"
  },
  "comment": { "color": "#6a9955" },
  "string": { "color": "#ce9178" },
  "number": { "color": "#b5cea8" },
  "builtin": { "color": "#4ec9b0" },
  "keyword": { "color": "#569cd6" },
  "function": { "color": "#dcdcaa" },
  "class-name": { "color": "#4ec9b0" },
  "tag": { "color": "#569cd6" },
  "attr-name": { "color": "#9cdcfe" },
  "attr-value": { "color": "#ce9178" },
  "punctuation": { "color": "#d4d4d4" },
  "operator": { "color": "#d4d4d4" }
};

const CodeBlock = ({ language, children }: { language: string, children: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg overflow-hidden my-6 border border-slate-800/50 shadow-lg bg-[#1e1e1e]">
      <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
            onClick={handleCopy}
            className="p-2 rounded-md bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white backdrop-blur-sm border border-white/10 transition-all shadow-sm"
            title="Copy code"
        >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        showLineNumbers={true}
        wrapLines={true}
        customStyle={{ 
            margin: 0, 
            borderRadius: '0.5rem', 
            fontSize: '0.875rem', 
            lineHeight: '1.6',
            padding: '1.5rem 1rem',
            backgroundColor: 'transparent'
        }}
        lineNumberStyle={{ 
            minWidth: '2.5em', 
            paddingRight: '1em', 
            color: '#606a74', 
            textAlign: 'right',
            userSelect: 'none'
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
};

const DocViewer: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [allDocs, setAllDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, language } = useLanguage();
  const { setProductId, setTopNavId } = useProduct();
  const navigate = useNavigate();
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    setLoading(true);
    setFeedbackSubmitted(false);
    
    // Load all docs to resolve links
    const docs = getDocs();
    setAllDocs(docs);

    let foundDoc = getDocBySlug(slug || 'getting-started');
    
    // Auto-recovery
    if (!foundDoc && (!slug || slug === 'getting-started')) {
        if (docs.length > 0) {
            foundDoc = docs[0];
            navigate(`/docs/${foundDoc.slug}`, { replace: true });
        }
    }

    setDoc(foundDoc || null);

    if (foundDoc) {
        const categories = getCategories();
        const category = categories.find(c => c.id === foundDoc.categoryId);
        if (category) {
            if (category.productId) setProductId(category.productId);
            if (category.topNavId) setTopNavId(category.topNavId);
        }
    }

    setLoading(false);
  }, [slug]);

  const handleFeedback = (isHelpful: boolean) => {
    if (doc && !feedbackSubmitted) {
        submitFeedback(doc.id, isHelpful);
        setFeedbackSubmitted(true);
    }
  };

  // Process Content: Extract Frontmatter & Transform WikiLinks
  const { meta, cleanContent } = useMemo(() => {
    if (!doc) return { meta: {}, cleanContent: '' };
    
    // Normalize newlines to ensure regex works across platforms/editors
    let content = doc.content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    let metadata: any = {};

    // 1. Extract Frontmatter
    // Robust regex: Matches --- at start, content, and closing --- on its own line
    // Accepts spaces after ---
    const fenceRegex = /^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/;
    const match = fenceRegex.exec(content);
    
    if (match) {
        try {
            metadata = yaml.load(match[1]);
            content = content.replace(fenceRegex, '');
        } catch (e) {
            console.warn("Failed to parse frontmatter", e);
        }
    }

    // 2. Transform WikiLinks [[Link]] -> [Link](/docs/slug)
    // Supports [[Link]] and [[Link|Label]]
    const wikiLinkRegex = /\[\[([\s\S]+?)\]\]/g;
    content = content.replace(wikiLinkRegex, (_, inner) => {
        // Split alias if exists (Target|Alias)
        const parts = inner.split('|');
        const rawTarget = parts[0].trim();
        const alias = parts[1] ? parts[1].trim() : null;
        
        // Clean target: Remove .md extension if user typed it (common mistake or compatibility)
        const cleanTarget = rawTarget.replace(/\.md$/i, '').trim();

        // Find doc by title (case insensitive) or slug
        const targetDoc = allDocs.find(d => 
            d.title.trim().toLowerCase() === cleanTarget.toLowerCase() ||
            d.slug.trim().toLowerCase() === cleanTarget.toLowerCase()
        );
        
        const displayText = alias || rawTarget;
        
        let href = '#';
        if (targetDoc) {
            href = `/docs/${targetDoc.slug}`;
        } else {
            // Fallback: Generate a slug from the title so it is clickable
            // Even if it 404s, it confirms to the user it is a link
            const fallbackSlug = cleanTarget.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\w\-\u4e00-\u9fa5]+/g, '') // Keep alphanumeric and Chinese
                .replace(/\-\-+/g, '-')
                .replace(/^-+/, '')
                .replace(/-+$/, '');
            href = `/docs/${fallbackSlug}`;
        }

        return `[${displayText}](${href})`;
    });

    return { meta: metadata, cleanContent: content };
  }, [doc, allDocs]);

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Loading...</div>;
  }

  if (!doc) {
    return (
        <div className="p-12 text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{t('doc.notFound')}</h2>
            <p className="text-slate-500 mb-6">{t('doc.notFoundDesc')}</p>
            <Link to="/" className="text-brand-600 hover:underline">{t('doc.returnHome')}</Link>
        </div>
    );
  }

  // Helper to render metadata badges
  const renderMetaItem = (labelKey: string, value: any, icon?: React.ReactNode) => {
      if (!value) return null;
      return (
          <div className="flex items-start gap-2 text-sm text-slate-600 mb-2 mr-6">
              {icon && <span className="mt-0.5 text-slate-400">{icon}</span>}
              <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t(labelKey)}</span>
                  <span className="font-medium">
                      {Array.isArray(value) ? value.join(', ') : value.toString()}
                  </span>
              </div>
          </div>
      );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 lg:px-12 lg:py-12">
        <div className="mb-8 border-b border-slate-100 pb-8">
             <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                <span>{t('nav.docs')}</span>
                <ChevronRight className="w-3 h-3" />
                <span className="capitalize font-medium text-slate-700">
                    {getCategories().find(c => c.id === doc.categoryId)?.name || '...'}
                </span>
            </div>
            
            <h1 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight leading-tight">
                {meta.title || doc.title}
            </h1>

            {/* Metadata Section */}
            {(meta.type || meta.tags || meta.created || meta.author) && (
                <div className="flex flex-wrap gap-y-4 bg-slate-50 rounded-xl p-4 border border-slate-100 mb-6">
                    {renderMetaItem('doc.meta.type', meta.type, <Package className="w-4 h-4" />)}
                    {renderMetaItem('doc.meta.tags', meta.tags, <Tag className="w-4 h-4" />)}
                    {renderMetaItem('doc.meta.author', meta.author || doc.author, <UserIcon className="w-4 h-4" />)}
                    {renderMetaItem('doc.meta.created', meta.created, <Clock className="w-4 h-4" />)}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
                <span>{t('doc.lastUpdated')} {format(doc.lastUpdated, language === 'zh' ? 'yyyy-MM-dd' : 'MMMM d, yyyy')}</span>
                {doc.version && (
                    <span className="bg-brand-50 text-brand-700 px-2.5 py-0.5 rounded-full font-medium text-xs border border-brand-100">
                        v{doc.version}
                    </span>
                )}
            </div>
        </div>

        <article className="prose prose-slate max-w-none 
            prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900
            prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
            prose-p:text-slate-600 prose-p:leading-relaxed
            prose-a:text-brand-600 prose-a:no-underline hover:prose-a:underline
            prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0 prose-pre:shadow-none
            prose-code:text-brand-700 prose-code:bg-brand-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none
            prose-blockquote:border-l-4 prose-blockquote:border-brand-200 prose-blockquote:bg-slate-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:text-slate-600 prose-blockquote:rounded-r-lg
            prose-img:rounded-xl prose-img:shadow-md
            prose-table:border-collapse prose-th:bg-slate-50 prose-th:p-3 prose-td:p-3 prose-td:border-t prose-td:border-slate-100
        ">
             <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                    a({node, className, children, href, ...props}) {
                         if (!href) return <span className={className}>{children}</span>;
                         
                         // Check for external links (http, https, or starting with www.)
                         const isExternal = href.startsWith('http') || href.startsWith('//') || href.startsWith('www.');
                         const finalHref = href.startsWith('www.') ? `http://${href}` : href;

                         if (isExternal) {
                             return (
                                 <a 
                                    href={finalHref} 
                                    className="text-brand-600 hover:underline" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    {...props}
                                 >
                                     {children}
                                 </a>
                             );
                         }
                         
                         return (
                             <Link 
                                 to={href} 
                                 className="text-brand-600 hover:underline"
                                 {...props}
                             >
                                 {children}
                             </Link>
                         )
                    },
                    code({node, inline, className, children, ...props}) {
                        const match = /language-(\w+)/.exec(className || '');
                        const codeContent = String(children).replace(/\n$/, '');
                        
                        return !inline && match ? (
                          <CodeBlock language={match[1]} children={codeContent} />
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                    }
                }}
             >
                {cleanContent}
             </ReactMarkdown>
        </article>

        <div className="mt-16 pt-8 border-t border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('doc.helpful.title')}</h3>
            {feedbackSubmitted ? (
                 <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-100 flex items-center gap-2 w-fit animate-[fadeIn_0.3s_ease-out]">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">{t('doc.helpful.thanks')}</span>
                 </div>
            ) : (
                <div className="flex gap-4">
                    <button 
                        onClick={() => handleFeedback(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:border-brand-500 hover:text-brand-600 hover:shadow-md transition-all shadow-sm"
                    >
                        <ThumbsUp className="w-4 h-4" />
                        {t('doc.helpful.yes')}
                    </button>
                    <button 
                        onClick={() => handleFeedback(false)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:border-slate-400 hover:text-slate-700 hover:shadow-md transition-all shadow-sm"
                    >
                        <ThumbsDown className="w-4 h-4" />
                        {t('doc.helpful.no')}
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};

export default DocViewer;