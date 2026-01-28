import { GoogleGenAI, Type } from "@google/genai";
import { getAIConfig, getDocs } from "./storage";
import { AIConfig, AIProvider } from "../types";

// --- Providers Logic ---

// 1. Gemini Implementation
const callGemini = async (config: AIConfig['gemini'], payload: { prompt: string, context?: string, mode?: 'chat' | 'json' }) => {
    if (!config.apiKey) throw new Error("Gemini API Key missing");
    
    const ai = new GoogleGenAI({ apiKey: config.apiKey });
    const model = config.model || 'gemini-3-flash-preview';
    
    const contents = payload.context 
        ? `${payload.prompt}\n\nContext/Content:\n${payload.context}`
        : payload.prompt;

    const reqConfig: any = { temperature: 0.3 };
    
    if (payload.mode === 'json') {
        reqConfig.responseMimeType = "application/json";
    }

    const response = await ai.models.generateContent({
        model,
        contents,
        config: reqConfig
    });

    return response.text || '';
};

// 2. Bailian (OpenAI Compatible) Implementation
const callBailian = async (config: AIConfig['bailian'], payload: { prompt: string, context?: string, mode?: 'chat' | 'json' }) => {
    if (!config.apiKey) throw new Error("Bailian API Key missing");
    
    const baseURL = config.baseURL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    const url = `${baseURL.replace(/\/+$/, '')}/chat/completions`;
    const model = config.model || 'qwen-turbo';

    const messages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: payload.context ? `${payload.prompt}\n\n${payload.context}` : payload.prompt }
    ];

    const body: any = {
        model: model,
        messages: messages,
        temperature: 0.3,
    };

    if (payload.mode === 'json') {
        body.response_format = { type: "json_object" };
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Bailian API Error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
};

// --- Fallback Runner ---

const runWithFallback = async (
    taskDescription: string, 
    payload: { prompt: string, context?: string, mode?: 'chat' | 'json' }
): Promise<string> => {
    const config = getAIConfig();
    if (!config.enabled) throw new Error("AI features are disabled globally.");

    const errors: string[] = [];

    // Iterate through priority list
    for (const provider of config.priority) {
        // Check if provider is enabled
        const providerSettings = config[provider];
        if (!providerSettings.enabled) continue;

        try {
            console.log(`Attempting ${taskDescription} with ${provider}...`);
            if (provider === 'gemini') {
                return await callGemini(config.gemini, payload);
            } else if (provider === 'bailian') {
                return await callBailian(config.bailian, payload);
            }
        } catch (error: any) {
            console.warn(`${provider} failed for ${taskDescription}:`, error.message);
            errors.push(`${provider}: ${error.message}`);
            // Continue to next provider...
        }
    }

    throw new Error(`All enabled AI providers failed. Details: ${errors.join('; ')}`);
};

// --- Public API ---

export const checkConnection = async (provider: AIProvider): Promise<boolean> => {
    const config = getAIConfig();
    try {
        const payload = { prompt: "Hello, reply with 'OK'.", mode: 'chat' as const };
        let result = '';
        
        if (provider === 'gemini') {
            result = await callGemini(config.gemini, payload);
        } else {
            result = await callBailian(config.bailian, payload);
        }
        return !!result;
    } catch (e) {
        console.error(`Connection check failed for ${provider}`, e);
        return false;
    }
};

export const generateContentSuggestion = async (currentContent: string, instruction: string): Promise<string> => {
    const systemPrompt = `You are a technical documentation assistant. 
    Task: ${instruction}
    Return ONLY the improved/generated content in Markdown format. Do not include conversational filler.`;

    return runWithFallback('Generate Content', {
        prompt: systemPrompt,
        context: currentContent,
        mode: 'chat'
    });
};

export const translateToEnglish = async (text: string): Promise<string> => {
    const prompt = `Translate the following text to English for a technical documentation UI label. 
    Keep it concise and professional (Title Case).
    Return ONLY the English translation. No quotes, no explanations.
    
    Text: "${text}"`;

    const result = await runWithFallback('Translate', {
        prompt: prompt,
        mode: 'chat'
    });
    return result ? result.trim() : '';
};

export interface ImportedDocStructure {
    title: string;
    categoryName: string;
    content: string;
}

export const analyzePdfContent = async (pdfText: string): Promise<ImportedDocStructure[]> => {
    // Truncate safely to avoid token limits on smaller models, though Gemini Flash handles huge context
    const safeText = pdfText.slice(0, 300000); 

    const systemPrompt = `You are a technical documentation expert.
    Analyze the provided raw PDF text.
    1. Split the content into logical documents (Overview, Quick Start, API, etc.).
    2. Return a valid JSON array where each object has:
       - "title": string
       - "categoryName": string (group related docs)
       - "content": string (Markdown format)
    
    Return ONLY valid JSON.`;

    const result = await runWithFallback('Analyze PDF', {
        prompt: systemPrompt,
        context: `PDF CONTENT:\n${safeText}`,
        mode: 'json' // Hint to providers to use JSON mode if available
    });

    try {
        // Cleanup markdown code blocks if present
        const jsonStr = result.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr) as ImportedDocStructure[];
    } catch (e) {
        console.error("Failed to parse JSON from AI response", e);
        throw new Error("AI response was not valid JSON");
    }
};

export const chatWithSiteContent = async (history: { role: 'user' | 'assistant', content: string }[], newMessage: string): Promise<string> => {
    // 1. Fetch all published documents
    const allDocs = getDocs().filter(d => d.status === 'PUBLISHED');
    
    // 2. Construct Context (Simple RAG - Concatenation)
    // In a production app, we would use vector embeddings here.
    // For this size, simple concatenation with basic truncation is acceptable.
    let siteContext = "";
    allDocs.forEach(d => {
        siteContext += `\n---\nDOCUMENT TITLE: ${d.title}\nCONTENT:\n${d.content}\n`;
    });

    // Truncate context if extremely large to respect typical token limits (e.g. 100k chars ~ 25k tokens)
    if (siteContext.length > 200000) {
        siteContext = siteContext.substring(0, 200000) + "\n...(truncated)...";
    }

    // 3. Construct System Prompt
    const systemPrompt = `You are the intelligent assistant for the "DevCenter" platform.
    Your goal is to answer user questions based STRICTLY on the documentation provided in the context below.
    
    Rules:
    1. If the answer is found in the context, answer clearly and concisely in Markdown.
    2. If the answer is NOT found in the context, politely state that the information is not available in the current documentation.
    3. Be helpful and professional.
    
    Documentation Context:
    ${siteContext}
    
    Chat History:
    ${history.map(h => `${h.role}: ${h.content}`).join('\n')}
    
    User Question: ${newMessage}`;

    return runWithFallback('Chat with Content', {
        prompt: systemPrompt,
        mode: 'chat'
    });
};