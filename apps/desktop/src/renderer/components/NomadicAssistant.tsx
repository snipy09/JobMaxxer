import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles, X, Send, Bot, User, ArrowRight,
  Briefcase, BookOpen, Compass, Settings, Zap,
  Lock, MessageSquare, ExternalLink, RefreshCw,
  ShieldCheck, AlertCircle, CheckCircle2, ChevronRight, Terminal
} from 'lucide-react';
import { AppUser, getApi, TabType } from '../types';
import {
  AssistantMessage, AssistantAction,
  parseAssistantResponse, isAcademicExploitationQuery
} from '../utils/assistant-action-parser';
import { normalizeTier } from '../utils/tier-utils';

interface NomadicAssistantProps {
  currentUser: AppUser | null;
  onNavigateTab: (tab: TabType) => void;
  onTriggerAutoApply?: (urls?: string[]) => void;
  onOpenUpgrade: (feature?: string) => void;
  onLog?: (msg: string) => void;
}

const DEFAULT_SUGGESTIONS = [
  { label: '⚡ Auto-apply to top jobs', prompt: 'Auto apply to the top matching software engineer jobs.' },
  { label: '🎯 Show remote roles', prompt: 'Filter the job board for remote engineering opportunities.' },
  { label: '📚 Google LeetCode sets', prompt: 'Show me the top LeetCode questions for Google.' },
  { label: '💡 STAR interview strategy', prompt: 'Give me a structured framework for behavioral STAR interview questions.' },
];

export const NomadicAssistant: React.FC<NomadicAssistantProps> = ({
  currentUser,
  onNavigateTab,
  onTriggerAutoApply,
  onOpenUpgrade,
  onLog
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `👋 **Hello! I am your Autonomous Co-Pilot on Steroids.**\n\nI have complete access across Nomadic to control your Job Board, trigger auto-applications, navigate learning roadmaps, recommend textbooks, and coach you through technical & behavioral interviews.\n\nWhat would you like to execute today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const userTier = normalizeTier(currentUser?.tier || currentUser?.subscription_tier);
  const isMax = userTier === 'max';

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMsg: AssistantMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    // 1. Anti-Exploitation Check
    if (isAcademicExploitationQuery(text)) {
      setTimeout(() => {
        const guardMsg: AssistantMessage = {
          id: `guard_${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ **Academic Integrity Policy**\n\nNomadic Assistant cannot solve school/university homework, assignments, or live exams on your behalf.\n\nHowever, I can explain the underlying **system architecture**, algorithm trade-offs, or point you to textbooks in your **CS Vault**! What technical concept would you like to explore?`,
          action: { type: 'NAVIGATE', target: 'learner-resources' },
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, guardMsg]);
        setLoading(false);
      }, 400);
      return;
    }

    // 2. Query AI backend
    const api = getApi();
    try {
      if (api && (api as any).askNomadicAssistant) {
        const res = await (api as any).askNomadicAssistant({
          message: text,
          history: messages.map(m => ({ sender: m.sender, text: m.text }))
        });

        if (res && res.reply) {
          const aiMsg: AssistantMessage = {
            id: `ai_${Date.now()}`,
            sender: 'assistant',
            text: res.reply,
            action: res.action,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, aiMsg]);
          if (res.action && res.action.type !== 'NONE') {
            executeAction(res.action);
          }
          return;
        }
      }

      // Fallback intent recognition
      let reply = `I've processed your request. How else can I assist your career progression?`;
      let action: AssistantAction = { type: 'NONE' };
      const lower = text.toLowerCase();

      if (lower.includes('feed') || lower.includes('job') || lower.includes('board')) {
        reply = `Navigating to your **Direct ATS Job Radar**. Scanning latest verified opportunities...`;
        action = { type: 'NAVIGATE', target: 'feed' };
      } else if (lower.includes('apply') || lower.includes('auto-apply') || lower.includes('auto apply')) {
        reply = `🚀 Initializing **Batch Co-Pilot Auto-Apply** for your top matching jobs...`;
        action = { type: 'TRIGGER_APPLY', target: 'top_jobs' };
      } else if (lower.includes('roadmap') || lower.includes('learn')) {
        reply = `Opening your **Interactive Career Roadmaps**. Tracking milestone progress...`;
        action = { type: 'NAVIGATE', target: 'learner-roadmaps' };
      } else if (lower.includes('google') || lower.includes('leetcode') || lower.includes('question')) {
        reply = `Opening the **428+ Company Question Bank** for targeted interview practice.`;
        action = { type: 'NAVIGATE', target: 'learner-resources' };
      } else if (lower.includes('settings') || lower.includes('profile')) {
        reply = `Opening your **Candidate Settings & Automation Preferences**.`;
        action = { type: 'NAVIGATE', target: 'settings' };
      } else if (lower.includes('outreach') || lower.includes('email') || lower.includes('recruiter')) {
        reply = `Opening the **Recruiter Outreach Radar & Drip Dispatcher**.`;
        action = { type: 'NAVIGATE', target: 'outreach' };
      }

      const aiMsg: AssistantMessage = {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        text: reply,
        action,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
      if (action.type !== 'NONE') {
        executeAction(action);
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          text: `I ran into a temporary connection issue. You can ask me to navigate the app, trigger auto-apply, or answer interview prep questions!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const executeAction = (action: AssistantAction) => {
    onLog?.(`[Assistant Action] Executing ${action.type} -> ${action.target || ''}`);
    if (action.type === 'NAVIGATE' && action.target) {
      onNavigateTab(action.target as TabType);
    } else if (action.type === 'TRIGGER_APPLY') {
      if (onTriggerAutoApply) {
        onTriggerAutoApply();
      } else {
        onNavigateTab('feed');
      }
    }
  };

  return (
    <>
      {/* ── 1. FLOATING BOTTOM-RIGHT TRIGGER BUTTON ─────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-[90] select-none">
        <button
          type="button"
          onClick={() => {
            if (!isMax) {
              onOpenUpgrade('Nomadic Autonomous Co-Pilot on Steroids');
            } else {
              setIsOpen(!isOpen);
            }
          }}
          className={`relative w-13 h-13 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-2xl cursor-pointer group hover:scale-105 active:scale-95 ${
            isOpen
              ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 ring-2 ring-powder-500'
              : 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 border border-slate-800 dark:border-slate-200'
          }`}
          title={isMax ? 'Nomadic Autonomous AI Assistant' : 'Nomadic Assistant (Max Plan Exclusive)'}
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-powder-500 to-emerald-400 opacity-25 blur-md group-hover:opacity-40 transition-opacity" />
          
          <div className="relative flex items-center justify-center">
            {isOpen ? (
              <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
            ) : (
              <Sparkles className="w-5 h-5 text-emerald-400 dark:text-emerald-600 animate-pulse" />
            )}
          </div>

          {/* MAX Badge */}
          <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-black bg-emerald-500 text-slate-950 shadow-xs border border-white dark:border-slate-900">
            MAX
          </span>
        </button>
      </div>

      {/* ── 2. SLIDING CHAT DRAWER ON BOTTOM-RIGHT ─────────────────────────── */}
      {isOpen && isMax && (
        <div className="fixed bottom-22 right-6 z-[90] w-96 sm:w-[420px] h-[560px] max-h-[82vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200 font-sans select-none">
          
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center font-bold shadow-xs">
                <Bot className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black text-slate-950 dark:text-white">
                    Nomadic Co-Pilot
                  </h3>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    ONLINE
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">App Controller &amp; Strategic Coach</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMessages([messages[0]])}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
                title="Clear Chat History"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
                title="Minimize Assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Action Suggestion Chips */}
          <div className="px-3 py-2 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {DEFAULT_SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(s.prompt)}
                disabled={loading}
                className="px-2.5 py-1 rounded-xl text-[10px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-powder-500 whitespace-nowrap transition-all shadow-2xs active:scale-95"
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Chat Transcript Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-white dark:bg-slate-900 text-xs">
            {messages.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <div key={m.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                      isUser
                        ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 font-medium rounded-tr-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 rounded-tl-xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-sans text-xs">{m.text}</div>
                    
                    {/* Action Button if emitted by AI */}
                    {m.action && m.action.type !== 'NONE' && (
                      <button
                        type="button"
                        onClick={() => executeAction(m.action!)}
                        className="mt-2 w-full py-1.5 px-2.5 bg-powder-500 hover:bg-powder-600 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition shadow-2xs active:scale-95"
                      >
                        <Zap className="w-3 h-3 fill-current" />
                        <span>Execute: {m.action.target || m.action.type}</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 px-1">{m.timestamp}</span>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 max-w-[70%] text-xs">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-powder-500" />
                <span className="font-mono text-[11px]">Co-Pilot is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask Co-Pilot anything or give an app command..."
                disabled={loading}
                className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-powder-500"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || loading}
                className="p-2 bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 rounded-xl transition disabled:opacity-40 shrink-0 cursor-pointer shadow-xs"
                title="Send Message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
