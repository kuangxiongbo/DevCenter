import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { getDocBySlug, getCategories, getDocs } from '../services/storage';
import { Doc } from '../types';
import { format } from 'date-fns';
import { Check, ChevronRight, Copy } from '../components/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useProduct } from '../contexts/ProductContext';

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
  const [loading, setLoading] = useState(true);
  const { t, language } = useLanguage();
  const { setProductId, setTopNavId } = useProduct();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    let foundDoc = getDocBySlug(slug || 'getting-started');
    
    // Auto-recovery: If default doc is missing, find any doc to show
    if (!foundDoc && (!slug || slug === 'getting-started')) {
        const allDocs = getDocs();
        if (allDocs.length > 0) {
            foundDoc = allDocs[0];
            navigate(`/docs/${foundDoc.slug}`, { replace: true });
        }
    }

    setDoc(foundDoc || null);

    // Context Sync: When landing on a URL, set the active Product and Top Nav Tab
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 lg:px-12 lg:py-12">
        <div className="mb-8 border-b border-slate-100 pb-8">
             <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                <span>{t('nav.docs')}</span>
                <ChevronRight className="w-3 h-3" />
                {/* Try to find category name */}
                <span className="capitalize font-medium text-slate-700">
                    {getCategories().find(c => c.id === doc.categoryId)?.name || '...'}
                </span>
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight leading-tight">{doc.title}</h1>
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
                {doc.content}
             </ReactMarkdown>
        </article>

        <div className="mt-16 pt-8 border-t border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('doc.helpful.title')}</h3>
            <div className="flex gap-4">
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:border-brand-500 hover:text-brand-600 transition-all shadow-sm">
                    <Check className="w-4 h-4" />
                    {t('doc.helpful.yes')}
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:border-slate-400 hover:text-slate-700 transition-all shadow-sm">
                    {t('doc.helpful.no')}
                </button>
            </div>
        </div>
    </div>
  );
};

export default DocViewer;