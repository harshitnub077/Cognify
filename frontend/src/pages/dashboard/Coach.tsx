/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useDailyPrompt, useCoachHistory, useDriftScore } from '../../hooks/useDashboardData';
import { IconUser, IconSend, IconSparkles, IconLoader2 } from '@tabler/icons-react';
import { Logo } from '../../components/Logo';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type Message = { id: string, role: 'user' | 'coach', content: string };

const Coach = () => {
  const { data: dailyPrompt } = useDailyPrompt();
  const { data: history } = useCoachHistory();
  const { data: driftData } = useDriftScore();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Load history into messages
  useEffect(() => {
    if (history && history.length > 0 && messages.length === 0) {
      // Filter out any bugged empty messages and map backend history
      const formattedHistory = history
        .filter((msg: any) => msg.content && msg.content.trim().length > 0)
        .map((msg: any) => ({
          id: msg.id || Date.now().toString() + Math.random(),
          role: (msg.role === 'assistant' ? 'coach' : msg.role) as 'user' | 'coach',
          content: msg.content
        }));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages(formattedHistory);
    }
  }, [history, messages.length]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isStreaming) return;
    
    const newMsg: Message = { id: Date.now().toString(), role: 'user', content: text.trim() };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setIsStreaming(true);

    const { data: { session } } = await supabase.auth.getSession();
    
    try {
      const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://cognify-api-lin2.onrender.com/api' : 'http://localhost:3001/api');
      const response = await fetch(`${baseURL}/coach/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          message: text.trim(),
          conversation_history: messages,
          user_context: { drift_score: driftData?.score || 0 }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      if (!response.body) throw new Error('No stream');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      const coachMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: coachMsgId, role: 'coach', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.text) {
                setMessages(prev => prev.map(m => m.id === coachMsgId ? { ...m, content: m.content + data.text } : m));
              }
              if (data.done) break;
            } catch (e) {
              console.error('Failed to parse SSE data', e);
            }
          }
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'coach', content: 'An error occurred connecting to the AI Coach.' }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  return (
    // Fixed height container matching standard dashboard routing areas, minus padding
    <div className="flex flex-col h-[calc(100vh-8rem)] w-full max-w-[1200px] mx-auto overflow-hidden">
      
      {/* Scrollable Chat Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth">
        <AnimatePresence mode="wait">
          {messages.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full flex flex-col items-center justify-center px-4 max-w-2xl mx-auto w-full"
            >
              <div className="w-16 h-16 bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl flex items-center justify-center mb-8 shadow-sm p-3">
                <Logo className="w-full h-full text-white" />
              </div>
              <h1 className="text-3xl font-display font-semibold text-white mb-3 text-center tracking-tight">
                How can I assist your alignment today?
              </h1>
              <p className="text-slate-500 text-center mb-10 text-[15px] max-w-md leading-relaxed">
                I am your Socratic guide. We can analyze your digital habits, discuss your goals, or review today's suggested reflection.
              </p>
              
              {/* Daily Prompt Suggestion */}
              <button 
                onClick={() => setInput(dailyPrompt?.prompt || '')}
                className="group flex flex-col items-start p-5 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl hover:border-[#333] hover:bg-[#0f0f0f] transition-all w-full text-left cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">
                  <IconSparkles size={14} className="text-white" /> Daily Reflection
                </div>
                <p className="text-[15px] font-medium text-slate-300 group-hover:text-white transition-colors leading-snug">
                  "{dailyPrompt?.prompt || 'Loading insight...'}"
                </p>
              </button>
            </motion.div>
          ) : (
            <div className="flex flex-col w-full pb-6 pt-8 max-w-3xl mx-auto px-4 md:px-6">
              {messages.map((msg, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id} 
                  className={cn(
                    "flex w-full mb-8",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === 'coach' ? (
                    <div className="flex gap-4 max-w-[90%] md:max-w-[85%]">
                      <div className="shrink-0 mt-0.5">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm overflow-hidden p-1.5">
                          <Logo className="w-full h-full text-black" />
                        </div>
                      </div>
                      <div className="text-[15px] leading-7 text-slate-200 font-medium">
                        <div className="whitespace-pre-wrap font-sans">
                          {msg.content || (isStreaming && i === messages.length - 1 ? (
                            <span className="flex gap-1.5 items-center h-7">
                              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </span>
                          ) : '')}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-[85%] md:max-w-[75%] bg-[#1a1a1a] text-white px-5 py-3.5 rounded-2xl rounded-tr-sm text-[15px] leading-relaxed shadow-sm font-medium whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  )}
                </motion.div>
              ))}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Docked Input Area */}
      <div className="shrink-0 px-4 py-4 md:px-6">
        <div className="max-w-3xl mx-auto w-full relative flex flex-col items-center">
          <div className="w-full relative flex items-end bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl shadow-lg focus-within:border-[#444] focus-within:ring-1 focus-within:ring-[#444] transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Cognify Coach..."
              className="w-full bg-transparent border-none resize-none outline-none text-[15px] text-white placeholder-slate-500 pl-4 pr-12 py-3.5 max-h-[200px] custom-scrollbar"
              rows={1}
              disabled={isStreaming}
            />
            <div className="absolute right-2 bottom-2 flex items-center">
              <button 
                onClick={() => handleSend(input)}
                disabled={!input.trim() || isStreaming}
                className="p-2 bg-white text-black rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:bg-[#111] disabled:text-slate-500 transition-all flex items-center justify-center"
              >
                {isStreaming ? <IconLoader2 size={16} className="animate-spin" /> : <IconSend size={16} />}
              </button>
            </div>
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-3">
            Cognify AI Coach can make mistakes. Consider verifying important information.
          </span>
        </div>
      </div>
    </div>
  );
};

export default Coach;
