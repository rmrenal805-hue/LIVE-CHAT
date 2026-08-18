import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Zap,
  Lock,
  Star,
  UserPlus,
  CheckCircle,
  Clock,
  Paperclip,
  X,
  FileText,
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCheck,
  ClipboardList,
  Trash2
} from 'lucide-react';
import { ChatSession, ChatMessage, Agent, CannedResponse } from '../../types';
import { LoadingSpinner } from '../LoadingSpinner';
import { analyzeTextSentiment, analyzeChatSessionSentiment } from '../../utils/sentiment';

interface AgentChatAreaProps {
  chat: ChatSession | null;
  messages: ChatMessage[];
  agents: Agent[];
  activeAgent: Agent;
  cannedResponses: CannedResponse[];
  onSendMessage: (text: string, isInternalNote?: boolean, attachments?: any[]) => void;
  onAssignAgent: (chatId: string, agentId: string) => void;
  onChangeStatus: (chatId: string, status: any) => void;
  onToggleStar: (chatId: string) => void;
  onTyping: (isTyping: boolean) => void;
  onDeleteMessage?: (chatId: string, messageId: string) => void;
  isCustomerTyping?: boolean;
  onBackToList?: () => void;
}

export const AgentChatArea: React.FC<AgentChatAreaProps> = ({
  chat,
  messages,
  agents,
  activeAgent,
  cannedResponses,
  onSendMessage,
  onAssignAgent,
  onChangeStatus,
  onToggleStar,
  onTyping,
  onDeleteMessage,
  isCustomerTyping,
  onBackToList
}) => {
  const [inputText, setInputText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [showCannedModal, setShowCannedModal] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isCustomerTyping]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      onTyping(false);
    };
  }, [chat?.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (!isInternalNote) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2500);
    }
  };

  if (!chat) {
    return (
      <div id="agent-no-chat-selected" className="flex-1 bg-slate-50 flex items-center justify-center p-8 text-center text-slate-400">
        <div>
          <div className="w-16 h-16 rounded-2xl bg-slate-200/60 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Zap className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-700 text-base">কোনো চ্যাট নির্বাচন করা হয়নি</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">ইনবক্স তালিকা থেকে কোনো গ্রাহকের কনভারসেশন সিলেক্ট করুন।</p>
        </div>
      </div>
    );
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && attachments.length === 0) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onSendMessage(inputText, isInternalNote, attachments.length > 0 ? attachments : undefined);
    setInputText('');
    setAttachments([]);
    setAiSuggestions([]);
    onTyping(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const isImg = file.type.startsWith('image/');

    const processFile = (): Promise<string> => {
      return new Promise((resolve) => {
        if (!isImg) {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 1200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width = Math.round((width * MAX_HEIGHT) / height);
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.85));
            } else {
              resolve(event.target?.result as string);
            }
          };
          img.onerror = () => resolve(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      });
    };

    const dataUrl = await processFile();
    setAttachments((prev) => [
      ...prev,
      {
        name: file.name,
        url: dataUrl,
        type: isImg ? 'image' : 'file',
        size: (file.size / 1024).toFixed(1) + ' KB',
      },
    ]);

    e.target.value = '';
  };

  const handleFetchAiSuggestions = async () => {
    setLoadingAi(true);
    setAiSuggestions([]);
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: chat.id, customerName: chat.customer.name }),
      });
      const data = await res.json();
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setAiSuggestions(data.suggestions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div id="agent-chat-main-area" className="flex-1 flex flex-col h-full bg-slate-50 relative overflow-hidden">
      
      {/* Top Header Bar - Responsive & Clean */}
      <div className="px-3 py-2 sm:px-4 sm:py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-2xs">
        
        {/* Customer info & Subject */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
          {onBackToList && (
            <button
              onClick={onBackToList}
              className="md:hidden p-1.5 text-slate-700 hover:text-slate-950 bg-slate-100 active:bg-slate-200 rounded-lg transition shrink-0 cursor-pointer"
              title="তালিকায় ফিরে যান"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <img
            src={chat.customer.avatar}
            alt={chat.customer.name}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm truncate">{chat.customer.name}</h3>
              <span className="font-mono text-[9px] sm:text-[10px] bg-slate-900 text-amber-300 font-bold px-1.5 py-0.5 rounded border border-slate-700 shrink-0">
                #{chat.id}
              </span>
              
              {/* Sentiment Indicator Badge */}
              {(() => {
                const sentiment = analyzeChatSessionSentiment(messages, chat.lastMessage);
                return (
                  <div
                    className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-full border text-[10px] font-bold transition shrink-0 ${sentiment.badgeClass}`}
                    title={`কীওয়ার্ড সেন্টিমেন্ট বিশ্লেষণ (স্কোর: ${sentiment.score})`}
                  >
                    <span>{sentiment.emoji}</span>
                    <span className="hidden sm:inline">{sentiment.labelBn}</span>
                  </div>
                );
              })()}

              <button
                onClick={() => onToggleStar(chat.id)}
                className="text-slate-400 hover:text-amber-400 transition cursor-pointer p-0.5"
                title="স্টার চিহ্নিত করুন"
              >
                <Star className={`w-3.5 h-3.5 ${chat.isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-500 truncate mt-0.5">
              {chat.customer.phone && (
                <span className="font-mono font-medium text-blue-700">📞 {chat.customer.phone}</span>
              )}
              {chat.customer.ipAddress && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="font-mono text-emerald-700 hidden sm:inline">🌐 IP: {chat.customer.ipAddress}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto flex-wrap">
          
          {/* Assigned Agent Dropdown */}
          <div className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 sm:py-1 rounded-lg border border-slate-200 text-[11px] sm:text-xs">
            <UserPlus className="w-3 h-3 text-slate-500 shrink-0" />
            <select
              value={chat.assignedAgentId || ''}
              onChange={(e) => onAssignAgent(chat.id, e.target.value)}
              className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer text-[10px] sm:text-xs max-w-[100px] sm:max-w-[130px] truncate"
            >
              <option value="">-- এজেন্ট --</option>
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <select
            value={chat.status}
            onChange={(e) => onChangeStatus(chat.id, e.target.value)}
            className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:py-1 rounded-lg border focus:outline-none cursor-pointer ${
              chat.status === 'active'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : chat.status === 'unassigned'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <option value="unassigned">অ্যাসাইন ছাড়া</option>
            <option value="active">সক্রিয় (Active)</option>
            <option value="waiting">অপেক্ষমাণ</option>
            <option value="resolved">সমাধানকৃত</option>
          </select>

          {/* Quick Resolve Button */}
          {chat.status !== 'resolved' && (
            <button
              onClick={() => onChangeStatus(chat.id, 'resolved')}
              className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] sm:text-xs font-semibold rounded-lg flex items-center gap-1 shadow-2xs transition cursor-pointer"
              title="সমাধান চিহ্নিত করুন"
            >
              <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">ক্লোজ</span>
            </button>
          )}
        </div>
      </div>

      {/* Message Thread Scroll */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
        {(() => {
          const seenIds = new Set<string>();
          const seenContent = new Set<string>();
          const displayMessages: ChatMessage[] = [];

          for (const m of messages) {
            if (!m) continue;
            const idKey = m.id ? String(m.id).trim() : null;
            const contentKey = `${m.senderRole || ''}_${(m.content || '').trim()}_${(m.timestamp || '').trim()}`;

            if (idKey && seenIds.has(idKey)) {
              continue;
            }
            if (seenContent.has(contentKey)) {
              continue;
            }

            if (idKey) seenIds.add(idKey);
            seenContent.add(contentKey);
            displayMessages.push(m);
          }

          return displayMessages.map((msg, idx) => {
          const isCustomer = msg.senderRole === 'customer';
          const isNote = msg.isInternalNote;
          const isSystem = msg.senderRole === 'system';

          if (isSystem) {
            return (
              <div key={msg.id ? `${msg.id}_${idx}` : `sys_${idx}`} className="text-center my-2 text-[11px] text-slate-400 font-medium">
                <span className="bg-slate-200/60 px-3 py-1 rounded-full">{msg.content}</span>
              </div>
            );
          }

          if (isNote) {
            return (
              <div key={msg.id ? `${msg.id}_${idx}` : `note_${idx}`} className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 my-2 shadow-2xs group relative">
                <div className="flex items-center justify-between gap-1.5 text-amber-800 font-semibold text-[11px] mb-1">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Internal Agent Whisper Note ({msg.senderName})</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  {onDeleteMessage && msg.id && (
                    <button
                      onClick={() => {
                        if (confirm('আপনি কি এই ইন্টারনাল নোটটি ডিলিট করতে চান?')) {
                          onDeleteMessage(chat.id, msg.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                      title="নোট ডিলিট করুন"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-amber-900 font-medium text-xs whitespace-pre-wrap">{msg.content}</p>
              </div>
            );
          }

          // Check if consecutive messages are duplicate
          const isDuplicate = idx > 0 && messages[idx - 1]?.content === msg.content && messages[idx - 1]?.senderRole === msg.senderRole;

          return (
            <div
              key={msg.id ? `${msg.id}_${idx}` : `msg_${idx}`}
              className={`flex gap-2.5 ${isCustomer ? 'flex-row' : 'flex-row-reverse'} items-end group`}
            >
              <img
                src={msg.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={msg.senderName}
                className="w-7 h-7 rounded-full object-cover shrink-0 mb-1 border border-slate-200"
              />

              <div className={`max-w-[75%] space-y-1 ${isCustomer ? 'items-start' : 'items-end'}`}>
                <div className={`flex items-center gap-1.5 text-[10px] text-slate-400 px-1 ${isCustomer ? 'justify-start' : 'justify-end'}`}>
                  <span>{msg.senderName}</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                  {isDuplicate && (
                    <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.2 rounded border border-amber-300">
                      ডুপ্লিকেট মেসেজ
                    </span>
                  )}
                  {!isCustomer && (
                    <span className="flex items-center gap-0.5 ml-0.5" title={msg.readStatus === 'read' ? 'গ্রাহক দেখেছে (Read)' : 'পাঠানো হয়েছে'}>
                      {msg.readStatus === 'read' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-sky-400 font-bold" />
                      ) : msg.readStatus === 'delivered' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </span>
                  )}
                  {onDeleteMessage && msg.id && (
                    <button
                      onClick={() => {
                        if (confirm('আপনি কি এই মেসেজটি ডিলিট করতে চান? (ডাবল এসএমএস রিমুভ)')) {
                          onDeleteMessage(chat.id, msg.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer ml-1"
                      title="মেসেজ ডিলিট করুন (ডাবল এসএমএস রিমুভ)"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div
                  className={`p-3 rounded-2xl shadow-2xs leading-relaxed ${
                    isCustomer
                      ? 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                      : 'bg-blue-600 text-white rounded-br-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {msg.attachments.map((att, idx) => (
                        <div key={idx} className="rounded-lg overflow-hidden border border-slate-200/40">
                          {att.type === 'image' ? (
                            <img
                              src={att.url}
                              alt={att.name}
                              onClick={() => setPreviewImageModal(att.url)}
                              className="max-h-56 w-full object-cover cursor-pointer hover:opacity-90 transition rounded-lg"
                            />
                          ) : (
                            <a href={att.url} download={att.name} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-100 text-slate-800 hover:text-blue-600 flex items-center gap-2 text-xs">
                              <FileText className="w-4 h-4" />
                              <span className="truncate">{att.name}</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        });
      })()}

        {isCustomerTyping && (
          <div className="flex items-center gap-3 my-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Pulsating Avatar Container */}
            <div className="relative flex items-center justify-center shrink-0">
              {/* Outer Pulsating Ring */}
              <span className="absolute inline-flex h-9 w-9 rounded-full bg-blue-500/30 animate-ping opacity-75" />
              {/* Inner Glowing Aura */}
              <span className="absolute inline-flex h-8 w-8 rounded-full bg-blue-400/20 animate-pulse" />
              
              {/* Avatar Image */}
              <img
                src={chat.customer.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={chat.customer.name}
                className="relative w-8 h-8 rounded-full object-cover ring-2 ring-blue-600 shadow-md transition-transform"
              />

              {/* Custom SVG Typing Badge Overlay */}
              <span className="absolute -bottom-1 -right-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full p-0.5 border-2 border-white shadow-xs animate-bounce">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </span>
            </div>

            {/* Typing Bubble */}
            <div className="bg-white border border-slate-200/90 px-3.5 py-2 rounded-2xl rounded-bl-xs shadow-xs flex items-center gap-2.5">
              <span className="font-bold text-slate-800 text-xs">{chat.customer.name}</span>
              <span className="text-slate-500 text-xs font-medium">মেসেজ লিখছেন</span>

              {/* Bouncing Dots */}
              <div className="flex items-center gap-1 pl-1">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.32s]" />
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.16s]" />
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* AI Suggested Replies Shelf */}
      {aiSuggestions.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-t border-indigo-100 p-3 shrink-0 animate-in fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>জেমি নাই (Gemini) এআই সাজেস্টেড রিপ্লাই</span>
            </div>
            <button
              onClick={() => setAiSuggestions([])}
              className="text-slate-400 hover:text-slate-600 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            {aiSuggestions.map((sug, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputText(sug);
                  setAiSuggestions([]);
                }}
                className="text-left text-xs bg-white hover:bg-indigo-100/60 p-2 rounded-lg border border-indigo-200 text-slate-800 transition font-medium shadow-2xs"
              >
                "{sug}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reply Input Bar */}
      <div className="p-2 sm:p-3 bg-white border-t border-slate-200 shrink-0 space-y-2">
        
        {/* Toggle Reply Mode & Quick Helpers */}
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] sm:text-xs">
            <button
              type="button"
              onClick={() => setIsInternalNote(false)}
              className={`px-2 sm:px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                !isInternalNote ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              পাবলিক
            </button>
            <button
              type="button"
              onClick={() => setIsInternalNote(true)}
              className={`px-2 sm:px-3 py-1 rounded-md font-semibold flex items-center gap-1 transition cursor-pointer ${
                isInternalNote ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>নোট (Whisper)</span>
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap ml-auto">
            {/* Send Report Form Link */}
            <button
              type="button"
              onClick={() => {
                onSendMessage(
                  '📋 কাস্টমার সাপোর্ট রিপোর্ট ও অভিযোগ ফরম:\nঅনুগ্রহ করে আপনার কোনো অভিযোগ বা রিপোর্ট থাকলে নিচের লিংকে ক্লিক করে ফরমটি পূরণ করুন:\nhttps://live-chat-swart-nine.vercel.app/report-form',
                  false
                );
              }}
              className="px-2 py-0.5 sm:py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[10px] sm:text-xs font-semibold rounded-lg border border-amber-200 flex items-center gap-1 transition cursor-pointer"
              title="রিপোর্ট ফরম লিংক পাঠান"
            >
              <ClipboardList className="w-3 h-3 text-amber-700" />
              <span className="hidden xs:inline">রিপোর্ট লিংক</span>
            </button>

            {/* Canned Responses Trigger */}
            <button
              type="button"
              onClick={() => setShowCannedModal(!showCannedModal)}
              className="px-2 py-0.5 sm:py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] sm:text-xs font-medium rounded-lg border border-slate-200 flex items-center gap-1 transition cursor-pointer"
            >
              <Zap className="w-3 h-3 text-amber-500" />
              <span>শর্টকাট</span>
            </button>

            {/* AI Suggest Button */}
            <button
              type="button"
              onClick={handleFetchAiSuggestions}
              disabled={loadingAi}
              className="px-2 py-0.5 sm:py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] sm:text-xs font-medium rounded-lg border border-indigo-200 flex items-center gap-1 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loadingAi ? (
                <LoadingSpinner size="xs" color="indigo" label="..." />
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  <span>AI ড্রাফট</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Canned Responses Quick Picker Menu */}
        {showCannedModal && (
          <div className="mb-2 bg-slate-900 text-white rounded-xl p-2.5 shadow-xl max-h-48 overflow-y-auto space-y-1 z-30">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1 px-1 mb-1 text-[11px] text-slate-400">
              <span>প্রস্তুতকৃত রিপ্লাই নির্বাচন করুন</span>
              <button onClick={() => setShowCannedModal(false)}>
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
            {cannedResponses.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setInputText(item.content);
                  setShowCannedModal(false);
                }}
                className="w-full text-left p-1.5 hover:bg-slate-800 rounded-lg text-xs flex items-center justify-between transition"
              >
                <div>
                  <span className="font-semibold text-blue-400">{item.shortcut}</span> - {item.title}
                </div>
                <span className="text-[10px] text-slate-400 px-1.5 py-0.5 bg-slate-800 rounded">{item.category}</span>
              </button>
            ))}
          </div>
        )}

        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="mb-2 p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 overflow-x-auto">
            {attachments.map((att, idx) => (
              <div key={idx} className="relative bg-white border border-slate-200 rounded-lg p-1.5 flex items-center gap-2 text-xs shadow-2xs">
                {att.type === 'image' && (
                  <img src={att.url} alt={att.name} className="w-8 h-8 object-cover rounded" />
                )}
                <span className="truncate max-w-[120px] font-medium text-slate-700">{att.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                  className="text-rose-500 hover:text-rose-700 p-0.5 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text Form */}
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <label title="ছবি বা ফাইল সংযুক্ত করুন" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer shrink-0">
            <Paperclip className="w-4 h-4" />
            <input type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleFileUpload} className="hidden" />
          </label>

          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={
              isInternalNote
                ? 'অভ্যন্তরীণ গোপন নোট লিখুন (শুধুমাত্র এজেন্টরা দেখতে পাবে)...'
                : 'গ্রাহককে পাঠানোর জন্য রিপ্লাই লিখুন...'
            }
            className={`flex-1 text-xs px-3.5 py-2.5 border rounded-xl focus:outline-none transition ${
              isInternalNote
                ? 'bg-amber-50/50 border-amber-300 focus:ring-2 focus:ring-amber-500/20'
                : 'bg-white border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
            }`}
          />

          <button
            type="submit"
            disabled={!inputText.trim() && attachments.length === 0}
            className={`px-4 py-2.5 rounded-xl text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed ${
              isInternalNote ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <span>পাঠান</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

      </div>

      {/* Lightbox Modal for Large Image Preview */}
      {previewImageModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
          <div className="relative max-w-3xl max-h-[90vh]">
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute -top-10 right-0 text-white bg-slate-800/80 p-1.5 rounded-full hover:bg-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={previewImageModal} alt="Enlarged preview" className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl" />
          </div>
        </div>
      )}

    </div>
  );
};
