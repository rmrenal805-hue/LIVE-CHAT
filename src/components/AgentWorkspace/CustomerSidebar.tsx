import React, { useState } from 'react';
import {
  User,
  MapPin,
  Globe,
  Clock,
  Laptop,
  Tag,
  FileText,
  Sparkles,
  RefreshCw,
  Plus,
  X,
  Mail,
  Phone,
  HeartHandshake,
  AlertTriangle,
  Smile
} from 'lucide-react';
import { ChatSession, ChatMessage } from '../../types';
import { analyzeChatSessionSentiment } from '../../utils/sentiment';

interface CustomerSidebarProps {
  chat: ChatSession | null;
  messages?: ChatMessage[];
  onUpdateCustomerMeta: (chatId: string, updates: { notes?: string; tags?: string[] }) => void;
  onBlockUser?: (chatId: string, phone?: string, ipAddress?: string, name?: string, reason?: string) => void;
  onUnblockUser?: (id: string) => void;
  onDeleteChat?: (chatId: string) => void;
}

export const CustomerSidebar: React.FC<CustomerSidebarProps> = ({
  chat,
  messages = [],
  onUpdateCustomerMeta,
  onBlockUser,
  onUnblockUser,
  onDeleteChat
}) => {
  const [newTag, setNewTag] = useState('');
  const [notes, setNotes] = useState(chat?.customer.notes || '');
  const [aiSummary, setAiSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);

  if (!chat) return null;

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    const currentTags = chat.customer.tags || [];
    if (!currentTags.includes(newTag.trim())) {
      const updated = [...currentTags, newTag.trim()];
      onUpdateCustomerMeta(chat.id, { tags: updated });
    }
    setNewTag('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updated = (chat.customer.tags || []).filter((t) => t !== tagToRemove);
    onUpdateCustomerMeta(chat.id, { tags: updated });
  };

  const handleSaveNotes = () => {
    onUpdateCustomerMeta(chat.id, { notes });
  };

  const handleFetchAiSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: chat.id }),
      });
      const data = await res.json();
      setAiSummary(data.summary || 'Summary unavailable.');
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSummary(false);
    }
  };

  return (
    <div id="agent-customer-details-pane" className="w-80 border-l border-slate-200 bg-white h-full overflow-y-auto p-4 space-y-5 shrink-0 text-xs text-slate-700">
      
      {/* Customer Header Card */}
      <div className="text-center pb-4 border-b border-slate-100">
        <img
          src={chat.customer.avatar}
          alt={chat.customer.name}
          className="w-16 h-16 rounded-full object-cover mx-auto mb-2 ring-4 ring-slate-100"
        />
        <h3 className="font-bold text-slate-900 text-sm">{chat.customer.name}</h3>
        <p className="text-slate-500 font-medium">{chat.customer.email}</p>
        
        {/* Chat ID Badge with Phone & IP */}
        <div className="mt-2.5 p-2 bg-slate-900 text-white rounded-xl text-left space-y-1">
          <div className="text-[10px] text-blue-300 font-semibold uppercase tracking-wider">চ্যাট আইডি (Chat ID)</div>
          <div className="font-mono text-[11px] font-bold text-amber-300 break-all select-all">{chat.id}</div>
        </div>

        {/* Block / Unlock Button */}
        {chat.isBlocked ? (
          <button
            onClick={() => onUnblockUser && onUnblockUser(chat.id)}
            className="w-full mt-2.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
          >
            <span>🔓 ইউজার আনব্লক করুন</span>
          </button>
        ) : (
          <div className="space-y-1.5 mt-2.5">
            <button
              onClick={() => onBlockUser && onBlockUser(chat.id, chat.customer.phone, chat.customer.ipAddress, chat.customer.name, 'ইনবক্স সাইডবার হতে ব্লক')}
              className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
            >
              <span>🚫 চ্যাট আইডি ব্লক করুন</span>
            </button>

            {onDeleteChat && (
              <button
                onClick={() => {
                  if (confirm('আপনি কি নিশ্চিত যে এই চ্যাটটি সম্পূর্ণ মুছে ফেলতে চান?')) {
                    onDeleteChat(chat.id);
                  }
                }}
                className="w-full py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-semibold text-xs rounded-xl border border-slate-200 transition flex items-center justify-center gap-1.5"
              >
                <span>🗑️ চ্যাট মুছে ফেলুন</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* AI Conversation Summarizer Card */}
      <div className="bg-gradient-to-tr from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-indigo-900 text-xs">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>এআই চ্যাট সারসংক্ষেপ (Summary)</span>
          </div>
          <button
            onClick={handleFetchAiSummary}
            disabled={loadingSummary}
            className="p-1 text-indigo-600 hover:text-indigo-800 transition disabled:opacity-50"
            title="এআই সামারি জেনারেট করুন"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingSummary ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {aiSummary ? (
          <div className="bg-white/80 p-2.5 rounded-lg border border-indigo-100/60 text-slate-700 text-[11px] leading-relaxed whitespace-pre-wrap">
            {aiSummary}
          </div>
        ) : (
          <p className="text-[11px] text-slate-500">
            এই চ্যাটের প্রধান বিষয়বস্তুর পয়েন্ট আকারে সামারি দেখতে রিফ্রেশ বাটনে চাপ দিন।
          </p>
        )}
      </div>

      {/* Customer Sentiment Analysis Card */}
      {(() => {
        const sentiment = analyzeChatSessionSentiment(messages, chat.lastMessage);
        return (
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                <Smile className="w-4 h-4 text-amber-500" />
                <span>গ্রাহকের মনোভাব (Sentiment)</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold ${sentiment.badgeClass}`}>
                {sentiment.score > 0 ? `+${sentiment.score}` : sentiment.score}
              </span>
            </div>

            {/* Current Sentiment Badge */}
            <div className={`p-2.5 rounded-lg border flex items-center gap-2.5 ${sentiment.badgeClass}`}>
              <span className="text-xl shrink-0">{sentiment.emoji}</span>
              <div className="min-w-0">
                <div className="font-bold text-xs">{sentiment.labelBn}</div>
                <p className="text-[10px] opacity-80">কীওয়ার্ড বেসড সেন্টিমেন্ট ডিটেকশন</p>
              </div>
            </div>

            {/* Matched Keywords */}
            {sentiment.matchedKeywords.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-medium">সনাক্তকৃত মূল শব্দসমূহ:</span>
                <div className="flex flex-wrap gap-1">
                  {sentiment.matchedKeywords.map((kw, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded text-[10px] font-mono"
                    >
                      "{kw}"
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Agent Action Advice Tip */}
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] leading-relaxed text-slate-600">
              <div className="font-bold text-slate-800 flex items-center gap-1 mb-0.5">
                {sentiment.sentiment === 'frustrated' ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                ) : (
                  <HeartHandshake className="w-3.5 h-3.5 text-emerald-500" />
                )}
                <span>এজেন্ট দিকনির্দেশনা:</span>
              </div>
              {sentiment.sentiment === 'frustrated' && (
                <p className="text-rose-700 font-medium">
                  গ্রাহক অসন্তুষ্ট বা ক্ষুব্ধ! বিনীতভাবে দুঃখ প্রকাশ করুন এবং দ্রুত সমস্যা সমাধানের ব্যবস্থা নিন।
                </p>
              )}
              {sentiment.sentiment === 'happy' && (
                <p className="text-emerald-700 font-medium">
                  গ্রাহক সন্তুষ্ট আছেন। পজিটিভ ফিডব্যাক গ্রহণ করুন এবং ধন্যবাদ জানান।
                </p>
              )}
              {sentiment.sentiment === 'neutral' && (
                <p className="text-slate-600">
                  গ্রাহক সাধারণ মনোভাব প্রকাশ করেছেন। পরিষ্কার তথ্য দিয়ে দ্রুত সহযোগিতা প্রদান করুন।
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Live Navigation & Device Metadata */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">ভিজিটর ও নেভিগেশন তথ্য</h4>
        </div>
        
        <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-600">
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="font-bold text-slate-900 font-mono">{chat.customer.phone || '01712345678'}</span>
          </div>

          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-mono text-slate-800 font-semibold">IP: {chat.customer.ipAddress || '103.205.132.42'}</span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-800">{chat.customer.location || 'ঢাকা, বাংলাদেশ'}</span>
          </div>

          {/* Chat Initiation Point Callout */}
          {chat.customer.chatInitiatedPage && (
            <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900">
              <div className="font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>চ্যাট শুরু করার পৃষ্ঠা:</span>
              </div>
              <div className="font-mono font-bold text-amber-950 mt-0.5">{chat.customer.chatInitiatedPage}</div>
            </div>
          )}

          {/* Path History Breadcrumb */}
          {chat.customer.pathHistory && chat.customer.pathHistory.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                নেভিগেশন জার্নি ({chat.customer.pathHistory.length}টি পেজ):
              </div>
              <div className="space-y-1">
                {chat.customer.pathHistory.slice(-5).map((step, idx) => (
                  <div
                    key={step.id || idx}
                    className={`p-1.5 rounded-md text-[10px] font-mono border flex items-center justify-between ${
                      step.isChatEntry || step.path === chat.customer.chatInitiatedPage
                        ? 'bg-amber-100/70 border-amber-300 text-amber-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="truncate">{step.path}</span>
                    <span className="text-[9px] text-slate-500 shrink-0 font-sans">{step.timeSpent || '১ মিনিট'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Laptop className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{chat.customer.browser || 'ক্রোম / ডেসktop'}</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              সাইটে সময়: {chat.customer.timeOnSite || '৫ মিনিট'} ({chat.customer.visitsCount || 1} বার ভিজিট)
            </span>
          </div>
        </div>
      </div>

      {/* Tags Section */}
      <div className="space-y-2">
        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">কাস্টমার ট্যাগসমূহ</h4>

        <div className="flex flex-wrap gap-1.5">
          {(chat.customer.tags || []).map((t) => (
            <span
              key={t}
              className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-semibold text-[11px] flex items-center gap-1"
            >
              <span>{t}</span>
              <button onClick={() => handleRemoveTag(t)} className="text-blue-400 hover:text-blue-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>

        <form onSubmit={handleAddTag} className="flex gap-1.5 mt-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="নতুন ট্যাগ যোগ করুন..."
            className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="p-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Internal Agent Notes */}
      <div className="space-y-2">
        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">এজেন্ট ইন্টারনাল নোট</h4>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="কাস্টমারের পছন্দ, বিষয় বা দরকারি তথ্য নোট করে রাখুন..."
          className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <button
          onClick={handleSaveNotes}
          className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg border border-slate-200 transition"
        >
          নোট সেভ করুন
        </button>
      </div>

    </div>
  );
};
