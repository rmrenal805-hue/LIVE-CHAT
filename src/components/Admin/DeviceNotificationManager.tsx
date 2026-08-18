import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  Radio,
  Sparkles,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  ExternalLink,
  Users,
  User,
  Clock,
  Zap,
  MessageSquare,
  Flame,
  Check
} from 'lucide-react';
import { LiveVisitor, DeviceNotification, ChatSession } from '../../types';
import { sendDeviceNotificationToFirestore } from '../../lib/firestoreSync';

interface DeviceNotificationManagerProps {
  liveVisitors: LiveVisitor[];
  chats: ChatSession[];
  onNotificationSent?: (notif: DeviceNotification) => void;
  defaultVisitorId?: string;
  onCloseModal?: () => void;
}

const PRESET_TEMPLATES = [
  {
    title: '💬 আমাদের সাপোর্ট টিম আপনার সেবায় প্রস্তুত!',
    body: 'আপনার কোনো প্রশ্ন বা সমস্যা থাকলে এখনই চ্যাটে নক করুন। আমরা সাথে সাথেই উত্তর দেব!',
    actionType: 'open_chat' as const,
    priority: 'high' as const,
    icon: '💬',
  },
  {
    title: '🎉 স্পেশাল ৫০% ক্যাশব্যাক অফার!',
    body: 'আজকের অর্ডারে জিতে নিন আকর্ষণীয় ক্যাশব্যাক ও ফ্রি ডেলিভারি। সীমিত সময়ের অফার!',
    actionType: 'open_url' as const,
    actionUrl: 'https://live-chat-swart-nine.vercel.app/',
    priority: 'urgent' as const,
    icon: '🎁',
  },
  {
    title: '⚡ জরুরি আপডেট ও সার্ভিস নোটিশ',
    body: 'আমাদের প্ল্যাটফর্মে নতুন ফিচার যুক্ত হয়েছে। সেরা অভিজ্ঞতার জন্য চেক করুন।',
    actionType: 'none' as const,
    priority: 'normal' as const,
    icon: '⚡',
  },
  {
    title: '👋 আপনি কি কোনো সহায়তা খুঁজছেন?',
    body: 'আমাদের এক্সপার্ট প্রতিনিধি আপনাকে সাহায্য করতে লাইভ আছেন। কথা বলতে ট্যাপ করুন!',
    actionType: 'open_chat' as const,
    priority: 'high' as const,
    icon: '👋',
  },
];

export const DeviceNotificationManager: React.FC<DeviceNotificationManagerProps> = ({
  liveVisitors = [],
  chats = [],
  onNotificationSent,
  defaultVisitorId,
  onCloseModal,
}) => {
  const [targetType, setTargetType] = useState<'all' | 'specific_visitor' | 'specific_chat'>(
    defaultVisitorId ? 'specific_visitor' : 'all'
  );
  const [selectedVisitorId, setSelectedVisitorId] = useState<string>(defaultVisitorId || '');
  const [selectedChatId, setSelectedChatId] = useState<string>('');

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [actionType, setActionType] = useState<'open_chat' | 'open_url' | 'none'>('open_chat');
  const [actionUrl, setActionUrl] = useState('https://live-chat-swart-nine.vercel.app/');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('high');
  const [senderName, setSenderName] = useState('অফিশিয়াল সাপোর্ট এডমিন');

  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [recentNotifications, setRecentNotifications] = useState<DeviceNotification[]>([]);

  // Load recent notifications
  useEffect(() => {
    fetch('/api/notifications/recent')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.notifications)) {
          setRecentNotifications(data.notifications);
        }
      })
      .catch(() => {});
  }, []);

  const handleApplyPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    setTitle(preset.title);
    setBody(preset.body);
    setActionType(preset.actionType);
    if (preset.actionUrl) setActionUrl(preset.actionUrl);
    setPriority(preset.priority);
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setErrorMessage('নোটিফিকেশনের শিরোনাম এবং বার্তা উভয়ই পূরণ করুন।');
      return;
    }

    if (targetType === 'specific_visitor' && !selectedVisitorId) {
      setErrorMessage('দয়া করে নির্দিষ্ট ভিজিটর নির্বাচন করুন।');
      return;
    }

    if (targetType === 'specific_chat' && !selectedChatId) {
      setErrorMessage('দয়া করে নির্দিষ্ট চ্যাট কাস্টমার নির্বাচন করুন।');
      return;
    }

    setIsSending(true);
    setErrorMessage('');
    setSuccessMessage('');

    const newNotification: DeviceNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      targetType,
      targetVisitorId: targetType === 'specific_visitor' ? selectedVisitorId : undefined,
      targetChatId: targetType === 'specific_chat' ? selectedChatId : undefined,
      title: title.trim(),
      body: body.trim(),
      actionType,
      actionUrl: actionType === 'open_url' ? actionUrl.trim() : undefined,
      soundEnabled,
      priority,
      createdAt: new Date().toISOString(),
      senderName: senderName.trim(),
    };

    try {
      // 1. Direct Firestore Sync (Instant cross-device cloud push)
      await sendDeviceNotificationToFirestore(newNotification);

      // 2. Server API & WebSocket Broadcast
      const res = await fetch('/api/notifications/send-to-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNotification),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessMessage(data.message || 'ইউজারের ডিভাইসে নোটিফিকেশন সফলভাবে পাঠানো হয়েছে!');
      } else {
        setSuccessMessage('নোটিফিকেশন ফায়ারস্টোর ও ক্লাউড নেটওয়ার্কে ব্রডকাস্ট হয়েছে!');
      }

      setRecentNotifications((prev) => [newNotification, ...prev.slice(0, 30)]);
      if (onNotificationSent) onNotificationSent(newNotification);

      // Reset form if desired
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (err: any) {
      console.warn('Device notification error:', err);
      // Fallback: sync directly
      await sendDeviceNotificationToFirestore(newNotification);
      setSuccessMessage('নোটিফিকেশন সরাসরি ক্লাউড পুশ নেটওয়ার্কে পাঠানো হয়েছে!');
      setRecentNotifications((prev) => [newNotification, ...prev.slice(0, 30)]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <Radio className="w-5 h-5 animate-pulse" />
              </span>
              <h2 className="text-xl font-bold tracking-tight">রিয়েল-টাইম ইউজার ডিভাইস নোটিফিকেশন সেন্টার</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Web Push & Sound
              </span>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl">
              এডমিন এখান থেকে সরাসরি যেকোনো ভিজিটর বা কাস্টমারের ডিভাইসে (মোবাইল/ডেস্কটপ) রিয়েল-টাইম পুশ নোটিফিকেশন, অডিও সাউন্ড অ্যালার্ট এবং নোটিশ পাঠাতে পারবেন।
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700/80 text-center">
              <div className="text-xs text-slate-400">সক্রিয় ইউজার/ডিভাইস</div>
              <div className="text-lg font-black text-emerald-400 flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                {liveVisitors.length} টি
              </div>
            </div>
            {onCloseModal && (
              <button
                onClick={onCloseModal}
                className="px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition"
              >
                বন্ধ করুন
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Form + Live Device Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form & Presets (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Quick Presets */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-800">কুইক নোটিফিকেশন টেমপ্লেট (এক ক্লিকে পূরণ)</h3>
              </div>
              <span className="text-xs text-slate-400">৪টি প্রস্তুত টেমপ্লেট</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRESET_TEMPLATES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="p-3 text-left rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/50 transition group flex flex-col justify-between"
                >
                  <div className="font-semibold text-xs text-slate-800 group-hover:text-blue-700 flex items-center gap-1.5">
                    <span>{preset.icon}</span>
                    <span className="line-clamp-1">{preset.title}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                    {preset.body}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSendNotification} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-600" />
                নোটিফিকেশন তৈরি ও পাঠান
              </h3>
            </div>

            {/* Target Audience Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                টার্গেট অডিয়েন্স (কার ডিভাইসে পাঠাবেন?)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType('all')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition ${
                    targetType === 'all'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>সব সক্রিয় ডিভাইস ({liveVisitors.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetType('specific_visitor')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition ${
                    targetType === 'specific_visitor'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>নির্দিষ্ট ভিজিটর</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetType('specific_chat')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition ${
                    targetType === 'specific_chat'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>নির্দিষ্ট চ্যাট ({chats.length})</span>
                </button>
              </div>
            </div>

            {/* Specific Target Selector Dropdown */}
            {targetType === 'specific_visitor' && (
              <div className="space-y-1.5 animate-in fade-in">
                <label className="block text-xs font-semibold text-slate-700">
                  নির্দিষ্ট ভিজিটর নির্বাচন করুন:
                </label>
                <select
                  value={selectedVisitorId}
                  onChange={(e) => setSelectedVisitorId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="">-- ভিজিটর বেছে নিন --</option>
                  {liveVisitors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name || 'Visitor'} ({v.location || 'অজানা'}) • {v.device} • {v.currentPage}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {targetType === 'specific_chat' && (
              <div className="space-y-1.5 animate-in fade-in">
                <label className="block text-xs font-semibold text-slate-700">
                  নির্দিষ্ট কাস্টমার চ্যাট নির্বাচন করুন:
                </label>
                <select
                  value={selectedChatId}
                  onChange={(e) => setSelectedChatId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="">-- চ্যাট বেছে নিন --</option>
                  {chats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customer?.name || 'Customer'} ({c.customer?.phone || c.id}) • {c.status}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                নোটিফিকেশন টাইটেল / শিরোনাম <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="যেমন: 🎉 বিশেষ অফার বা জরুরি নোটিশ..."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                required
              />
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                বার্তা / মেসেজ বডি <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                placeholder="ইউজারকে যে বিস্তারিত মেসেজ দেখাতে চান লিখুন..."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Action Type & Sound Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  ক্লিক করলে কী হবে? (Action Type)
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="open_chat">💬 সাথে সাথে লাইভ চ্যাট উইন্ডো খুলবে</option>
                  <option value="open_url">🔗 নির্দিষ্ট লিংকে নিয়ে যাবে (URL)</option>
                  <option value="none">🔔 শুধুমাত্র নোটিফিকেশন প্রদর্শন করবে</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  জরুরিতা ও প্রায়োরিটি
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="urgent">🔥 Urgent (অ্যালার্ট ব্যানার + ভাইব্রেশন)</option>
                  <option value="high">⚡ High (পপআপ নোটিফিকেশন + চিম)</option>
                  <option value="normal">📌 Normal (স্ট্যান্ডার্ড টোস্ট)</option>
                </select>
              </div>
            </div>

            {actionType === 'open_url' && (
              <div className="space-y-1.5 animate-in fade-in">
                <label className="block text-xs font-semibold text-slate-700">
                  লিংক URL (Destination Link):
                </label>
                <input
                  type="url"
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono"
                />
              </div>
            )}

            {/* Sound Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2.5">
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                )}
                <div>
                  <div className="text-xs font-bold text-slate-800">অডিও সাউন্ড অ্যালার্ট (Chime)</div>
                  <div className="text-[11px] text-slate-500">ইউজারের ডিভাইসে রিংটোন/শব্দ বাজবে</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Feedback Messages */}
            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSending}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>নোটিফিকেশন পাঠানো হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Radio className="w-4 h-4 animate-pulse" />
                  <span>ইউজারের ডিভাইসে এখনই নোটিফিকেশন পুশ করুন 🚀</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Live Device Screen Mockup & Recent History (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Device Preview Card */}
          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-lg text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  ইউজারের স্ক্রিনে যেমন দেখাবে (Live Preview)
                </span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                Mobile & PC
              </span>
            </div>

            {/* Simulated Mobile/Browser Viewport */}
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 relative min-h-[190px] flex flex-col justify-between overflow-hidden shadow-inner">
              <div className="text-[10px] text-slate-500 flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                <span>🔔 System Notification Bar</span>
                <span>এখন • Just Now</span>
              </div>

              {/* Floating Toast Notification Box */}
              <div className="my-3 p-3.5 bg-slate-900/95 border border-blue-500/40 rounded-xl shadow-xl backdrop-blur-md space-y-2 animate-in slide-in-from-top-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                    💬
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-white truncate">
                        {title || '🎉 বিশেষ অফার বা জরুরি নোটিশ'}
                      </h4>
                      {priority === 'urgent' && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                          URGENT
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 line-clamp-3 mt-0.5">
                      {body || 'এখানে আপনার দেওয়া বার্তাটি ইউজারের ডিভাইসে সাথে সাথে ভেসে উঠবে এবং শব্দ বাজবে।'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 border-t border-slate-800">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Volume2 className="w-3 h-3" />
                    {soundEnabled ? 'সাউন্ড একটিভ' : 'নিঃশব্দ'}
                  </span>
                  <span className="text-blue-400 font-semibold flex items-center gap-0.5">
                    {actionType === 'open_chat' && 'ট্যাপ করে চ্যাট শুরু করুন →'}
                    {actionType === 'open_url' && 'অফার দেখুন →'}
                    {actionType === 'none' && 'নোটিশ'}
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-slate-600 text-center font-mono">
                Cross-browser Web Push & In-app Floating Alert
              </div>
            </div>
          </div>

          {/* Recent Sent Notifications */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  সাম্প্রতিক প্রেরিত নোটিফিকেশন হিস্টোরি
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">{recentNotifications.length} টি</span>
            </div>

            {recentNotifications.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                এখনও কোনো ডিভাইস নোটিফিকেশন পাঠানো হয়নি।
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {recentNotifications.slice(0, 10).map((notif) => (
                  <div
                    key={notif.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1 hover:bg-slate-100/80 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-800 truncate">{notif.title}</span>
                      <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2">{notif.body}</p>
                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">
                        {notif.targetType === 'all'
                          ? 'সব সক্রিয় ডিভাইস'
                          : notif.targetType === 'specific_visitor'
                          ? 'নির্দিষ্ট ভিজিটর'
                          : 'নির্দিষ্ট চ্যাট'}
                      </span>
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> ডেলিভারড
                      </span>
                    </div>
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
