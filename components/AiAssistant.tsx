import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Sparkles, Loader2, Minimize2 } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { getAIConfig } from '../services/storage';
import { chatWithSiteContent } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AiAssistant: React.FC = () => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    // Check if AI is enabled
    const config = getAIConfig();
    setIsEnabled(config.enabled);
    
    // Initial welcome message
    if (messages.length === 0) {
        setMessages([{ role: 'assistant', content: t('chat.welcome') }]);
    }
  }, [t]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
        const response = await chatWithSiteContent(messages, userMsg);
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
        // More helpful error message
        const errMsg = error instanceof Error ? error.message : String(error);
        const displayMsg = errMsg.includes("Key missing") 
            ? "⚠️ Please configure your AI API Key in the **Management Console > AI Config** to use this feature."
            : t('chat.error');
        
        setMessages(prev => [...prev, { role: 'assistant', content: displayMsg }]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
  };

  if (!isEnabled) return null;

  return (
    <>
        {/* Floating Toggle Button with Pop-in Animation */}
        {!isOpen && (
            <div className="fixed bottom-6 right-6 z-50 animate-[popIn_0.5s_cubic-bezier(0.175,0.885,0.32,1.275)]">
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-14 h-14 bg-brand-600 hover:bg-brand-700 text-white rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-105"
                    title={t('chat.title')}
                >
                    <MessageSquare className="w-7 h-7" />
                </button>
            </div>
        )}

        {/* Chat Window */}
        {isOpen && (
            <div className={`fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 transition-all duration-300 origin-bottom-right ${isMinimized ? 'w-72 h-16 overflow-hidden' : 'w-[90vw] md:w-96 h-[500px] max-h-[80vh]'} animate-[slideUp_0.3s_ease-out]`}>
                
                {/* Header */}
                <div 
                    className="bg-brand-600 text-white p-4 flex items-center justify-between cursor-pointer"
                    onClick={() => setIsMinimized(!isMinimized)}
                >
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        <h3 className="font-bold">{t('chat.title')}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                            className="p-1 hover:bg-white/20 rounded"
                        >
                            <Minimize2 className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsOpen(false); setIsMinimized(false); }}
                            className="p-1 hover:bg-white/20 rounded"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Messages Area */}
                {!isMinimized && (
                    <>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div 
                                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                                            msg.role === 'user' 
                                            ? 'bg-brand-600 text-white rounded-br-none' 
                                            : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none'
                                        }`}
                                    >
                                        {msg.role === 'user' ? (
                                            msg.content
                                        ) : (
                                            <div className="prose prose-sm prose-slate max-w-none prose-p:my-1 prose-pre:bg-slate-100 prose-pre:text-slate-800">
                                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-2 text-slate-500 text-sm">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {t('chat.thinking')}
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 border-t border-slate-100 bg-white">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    placeholder={t('chat.placeholder')}
                                    disabled={isLoading}
                                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 disabled:opacity-50"
                                />
                                <button 
                                    onClick={handleSend}
                                    disabled={!input.trim() || isLoading}
                                    className="p-2 bg-brand-600 text-white rounded-full hover:bg-brand-700 disabled:opacity-50 disabled:bg-slate-300 transition-colors shadow-sm"
                                >
                                    <Send className="w-5 h-5 translate-x-0.5 translate-y-0.5" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        )}
        <style>{`
            @keyframes popIn {
                from { transform: scale(0) rotate(-180deg); opacity: 0; }
                to { transform: scale(1) rotate(0); opacity: 1; }
            }
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `}</style>
    </>
  );
};

export default AiAssistant;