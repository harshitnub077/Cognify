import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useDailyPrompt, useCoachHistory, useDriftScore, useDashboardStats } from '../../hooks/useDashboardData';
import { supabase } from '../../lib/supabase';
import { IconBrain, IconArrowUpRight, IconSend, IconFlame, IconTarget, IconHistory, IconThumbUp, IconBulb } from '@tabler/icons-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

type Message = { id: string, role: 'user' | 'coach', content: string, reaction?: string };

const Coach = () => {
  const { data: dailyPrompt } = useDailyPrompt();
  const { data: history } = useCoachHistory();
  const { data: driftData } = useDriftScore();
  const { data: stats } = useDashboardStats();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isStreaming) return;
    
    const newMsg: Message = { id: Date.now().toString(), role: 'user', content: text.trim() };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setIsStreaming(true);

    const { data: { session } } = await supabase.auth.getSession();
    
    try {
      const response = await fetch('http://localhost:3001/api/coach/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          message: text.trim(),
          conversation_history: messages,
          user_context: {
            drift_score: driftData?.score || 0,
            goals: ['Deep Thinker', 'Mindful Creator', 'Empathetic Leader'],
            dominant_emotion: 'fear',
            recent_content_summary: 'Watched heavily polarizing news followed by productivity shorts.'
          }
        })
      });

      if (!response.body) throw new Error('No stream');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let coachMsgId = (Date.now() + 1).toString();
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
            } catch(e) {}
          }
        }
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'coach', content: 'I am currently unable to reflect. Let us try again later.' }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const starters = [
    "I keep watching motivational videos but never take action...",
    "I've been doom scrolling a lot this week...",
    "My drift score dropped this week. I don't understand why...",
    "I want to reduce my screen time but I don't know how to start..."
  ];

  const driftScore = driftData?.score || -12;

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] pb-4 space-y-6">
      <header className="shrink-0 pt-6">
        <h1 className="text-2xl font-bold">Cognify Coach</h1>
        <p className="text-slate-500 text-sm">Your Socratic guide to digital consciousness.</p>
      </header>

      {/* Top Section: Daily Insight */}
      <div className="shrink-0 bg-[#Fdfbf7] dark:bg-[#1C1A17] border border-[#E8E2D2] dark:border-[#2C2A27] rounded-xl p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4C39B] dark:via-[#6A5E43] to-transparent" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#A89874] dark:text-[#8A7E63] mb-4 font-sans">Today's Reflection</h3>
        <p className="font-serif text-lg md:text-xl text-[#4A4232] dark:text-[#D4C39B] max-w-2xl leading-relaxed italic">
          "{dailyPrompt?.prompt || 'Loading insight...'}"
        </p>
        <button 
          onClick={() => setInput(dailyPrompt?.prompt || '')}
          className="mt-6 flex items-center gap-2 text-sm font-semibold text-[#6C4FF6] hover:text-[#5B40DB] transition bg-[#6C4FF6]/10 px-4 py-2 rounded-full"
        >
          Start talking about this <IconArrowUpRight size={16} />
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        
        {/* Left Panel: Chat Interface */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-xl shadow-sm overflow-hidden min-h-[400px]">
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                <div className="w-16 h-16 bg-[#6C4FF6]/10 rounded-2xl flex items-center justify-center text-[#6C4FF6] mb-6">
                  <IconBrain size={32} />
                </div>
                <h3 className="text-lg font-bold mb-2">I am here to listen.</h3>
                <p className="text-slate-500 text-sm mb-8">I won't give you answers. I will ask the questions that help you find your own.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
                  {starters.map((starter, i) => (
                    <button key={i} onClick={() => setInput(starter)} className="p-3 text-xs bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#333] rounded-lg hover:border-[#6C4FF6] transition">
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={msg.id} className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  {msg.role === 'coach' && (
                    <div className="w-8 h-8 rounded-full bg-[#6C4FF6]/10 text-[#6C4FF6] flex items-center justify-center shrink-0 mr-3 mt-1">
                      {isStreaming && i === messages.length - 1 ? (
                        <div className="animate-pulse"><IconBrain size={16} /></div>
                      ) : (
                        <IconBrain size={16} />
                      )}
                    </div>
                  )}
                  <div className="max-w-[80%] flex flex-col">
                    <div className={cn(
                      "p-4 rounded-2xl text-sm leading-relaxed",
                      msg.role === 'user' 
                        ? "bg-[#6C4FF6] text-white rounded-tr-sm" 
                        : "bg-slate-50 dark:bg-[#1A1A1A] border-l-4 border-l-[#6C4FF6] text-slate-800 dark:text-slate-200 rounded-tl-sm shadow-sm"
                    )}>
                      {msg.content || (isStreaming && i === messages.length - 1 ? <span className="animate-pulse">...</span> : '')}
                    </div>
                    {msg.role === 'coach' && !isStreaming && i === messages.length - 1 && (
                      <div className="flex gap-2 mt-2 ml-2">
                        <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-500 transition border border-slate-200 dark:border-[#333] px-2 py-1 rounded-full bg-white dark:bg-[#1A1A1A]">
                          <IconThumbUp size={12} /> Helpful
                        </button>
                        <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#6C4FF6] transition border border-slate-200 dark:border-[#333] px-2 py-1 rounded-full bg-white dark:bg-[#1A1A1A]">
                          <IconBulb size={12} /> Made me think
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Box */}
          <div className="p-4 border-t border-slate-200 dark:border-[#222] bg-white dark:bg-[#121212]">
            <div className="relative flex items-end gap-2 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#333] rounded-xl p-2 focus-within:border-[#6C4FF6] transition-colors">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value.slice(0, 500))}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleSend(input);
                  }
                }}
                placeholder="Tell me about your content habits this week..."
                className="w-full bg-transparent border-none resize-none outline-none text-sm p-2 custom-scrollbar"
                rows={3}
                disabled={isStreaming}
              />
              <div className="absolute top-2 right-4 text-[10px] text-slate-400 font-medium">
                {input.length}/500
              </div>
              <button 
                onClick={() => handleSend(input)}
                disabled={!input.trim() || isStreaming}
                className="p-2 bg-[#6C4FF6] text-white rounded-lg hover:bg-[#5B40DB] disabled:opacity-50 disabled:cursor-not-allowed shrink-0 mb-1"
              >
                <IconSend size={18} />
              </button>
            </div>
            <p className="text-[10px] text-center text-slate-400 mt-2">Ctrl + Enter to send</p>
          </div>
        </div>

        {/* Right Panel: Context Panel */}
        <div className="w-full lg:w-[40%] flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-xl p-4 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
              <h4 className="text-xs font-bold uppercase text-slate-500 mb-2 z-10">Drift Score</h4>
              <div className="relative w-24 h-12 mb-2 z-10">
                <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
                  <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" strokeLinecap="round" />
                  <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" 
                    stroke={driftScore >= 30 ? "#10b981" : driftScore >= 0 ? "#f59e0b" : "#ef4444"} 
                    strokeWidth="12" strokeLinecap="round" 
                    strokeDasharray={`${((driftScore + 100) / 200) * 125.6}, 126`} 
                  />
                </svg>
                <div className="absolute bottom-0 left-0 w-full text-2xl font-bold">
                  {driftScore > 0 ? '+' : ''}{driftScore}
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-xl p-4 shadow-sm flex flex-col justify-center items-center">
              <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Current Streak</h4>
              <div className="flex items-center gap-2 text-2xl font-bold text-orange-500">
                <IconFlame size={28} className="fill-orange-500" /> {stats?.streak || 0}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-xl p-5 shadow-sm">
            <h4 className="text-sm font-bold mb-3 flex items-center gap-2"><IconTarget size={18} className="text-[#6C4FF6]" /> Active Goals</h4>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 text-xs font-semibold bg-[#6C4FF6]/10 text-[#6C4FF6] rounded-md border border-[#6C4FF6]/20">Deep Thinker</span>
              <span className="px-3 py-1 text-xs font-semibold bg-[#6C4FF6]/10 text-[#6C4FF6] rounded-md border border-[#6C4FF6]/20">Mindful Creator</span>
              <span className="px-3 py-1 text-xs font-semibold bg-[#6C4FF6]/10 text-[#6C4FF6] rounded-md border border-[#6C4FF6]/20">Empathetic Leader</span>
            </div>
          </div>

          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-xl p-5 shadow-sm">
            <h4 className="text-sm font-bold mb-3">This Week's Emotions</h4>
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wide rounded-md border bg-amber-500/10 text-amber-500 border-amber-500/20">Fear</span>
              <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wide rounded-md border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Joy</span>
              <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wide rounded-md border bg-cyan-500/10 text-cyan-500 border-cyan-500/20">Surprise</span>
            </div>
          </div>

          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-xl p-5 shadow-sm flex-1">
            <h4 className="text-sm font-bold mb-3 flex items-center gap-2"><IconHistory size={18} className="text-slate-500" /> Past Sessions</h4>
            {(!history || history.length === 0) ? (
              <p className="text-xs text-slate-500 text-center py-4">No past sessions yet.</p>
            ) : (
              <div className="space-y-3">
                {history.slice(0, 3).map((session: any) => (
                  <div key={session.id} className="p-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#333] rounded-lg cursor-pointer hover:border-[#6C4FF6] transition group">
                    <p className="text-[10px] text-slate-400 mb-1 font-medium uppercase tracking-wide">{format(new Date(session.createdAt), 'MMM dd')}</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {session.messages?.[0]?.content || "Session without messages"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Coach;
