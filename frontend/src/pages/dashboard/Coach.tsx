import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useDailyPrompt, useCoachHistory, useDriftScore } from '../../hooks/useDashboardData';
import { IconBrain, IconArrowRight, IconSend, IconHistory } from '@tabler/icons-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

type Message = { id: string, role: 'user' | 'coach', content: string };

const Coach = () => {
  const { data: dailyPrompt } = useDailyPrompt();
  const { data: history } = useCoachHistory();
  const { data: driftData } = useDriftScore();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          message: text.trim(),
          conversation_history: messages,
          user_context: { drift_score: driftData?.score || 0 }
        })
      });

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
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'coach', content: 'I am currently unable to reflect. Let us try again later.' }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const driftScore = driftData?.score || 0;

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] lg:h-[calc(100vh-120px)] space-y-4 w-full max-w-[1600px] mx-auto px-4 md:px-6">
      <header className="shrink-0 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">Cognify Coach</h1>
        <p className="text-sm text-slate-500">Your Socratic guide to digital consciousness.</p>
      </header>

      <div className="shrink-0 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6 flex flex-col items-center text-center">
        <h3 className="text-xs font-medium text-slate-500 mb-3">Today's Reflection</h3>
        <p className="font-serif text-lg md:text-xl text-white max-w-2xl leading-relaxed italic">
          "{dailyPrompt?.prompt || 'Loading insight...'}"
        </p>
        <button 
          onClick={() => setInput(dailyPrompt?.prompt || '')}
          className="mt-4 text-xs font-medium text-slate-400 hover:text-white transition flex items-center gap-1"
        >
          Discuss this <IconArrowRight size={14} />
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        
        {/* Chat */}
        <div className="flex-1 flex flex-col bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden min-h-[400px]">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <IconBrain size={48} stroke={1} className="text-[#333] mb-4" />
                <h3 className="text-sm font-medium text-white mb-1">I am here to listen.</h3>
                <p className="text-xs text-slate-500 max-w-xs">I won't give you answers. I ask questions that help you find your own.</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={msg.id} className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className="max-w-[85%] flex flex-col">
                    <div className={cn(
                      "p-3.5 text-sm leading-relaxed rounded-md",
                      msg.role === 'user' 
                        ? "bg-white text-black font-medium" 
                        : "bg-[#111] border border-[#222] text-slate-200"
                    )}>
                      {msg.content || (isStreaming && i === messages.length - 1 ? <span className="animate-pulse">...</span> : '')}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-4 border-t border-[#1a1a1a] bg-[#050505]">
            <div className="flex items-end gap-2 bg-[#111] border border-[#222] rounded-md p-2 focus-within:border-[#444] transition-all">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
                placeholder="Type your thoughts..."
                className="w-full bg-transparent border-none resize-none outline-none text-sm text-white placeholder-slate-600 p-2 max-h-32 custom-scrollbar"
                rows={1}
                disabled={isStreaming}
              />
              <button 
                onClick={() => handleSend(input)}
                disabled={!input.trim() || isStreaming}
                className="p-2 bg-white text-black rounded hover:bg-slate-200 disabled:opacity-30 shrink-0 mb-1 transition-colors"
              >
                <IconSend size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-72 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-5">
            <h4 className="text-xs font-medium text-slate-500 mb-3">Drift Score</h4>
            <div className="text-3xl font-semibold tabular-nums text-white">
              {driftScore > 0 ? '+' : ''}{driftScore}
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-5 flex-1">
            <h4 className="text-xs font-medium text-slate-500 mb-4 flex items-center gap-2"><IconHistory size={14} /> Past Sessions</h4>
            {(!history || history.length === 0) ? (
              <p className="text-xs text-slate-600">No past sessions.</p>
            ) : (
              <div className="space-y-3">
                {history.slice(0, 4).map((session: any) => (
                  <div key={session.id} className="p-3 bg-[#111] border border-[#222] rounded-md">
                    <p className="text-xs text-slate-500 mb-1">{format(new Date(session.createdAt), 'MMM dd')}</p>
                    <p className="text-sm text-slate-300 line-clamp-2">
                      {session.messages?.[0]?.content || "Empty session"}
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
