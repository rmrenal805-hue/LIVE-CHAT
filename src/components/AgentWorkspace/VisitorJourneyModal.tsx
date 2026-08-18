import React from 'react';
import {
  X,
  Compass,
  MapPin,
  Globe,
  Clock,
  Laptop,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Phone,
  Layers,
  HelpCircle,
  Share2
} from 'lucide-react';
import { LiveVisitor, VisitorPageVisit } from '../../types';

interface VisitorJourneyModalProps {
  visitor: LiveVisitor | null;
  onClose: () => void;
  onInviteToChat: (visitor: LiveVisitor) => void;
}

export const VisitorJourneyModal: React.FC<VisitorJourneyModalProps> = ({
  visitor,
  onClose,
  onInviteToChat,
}) => {
  if (!visitor) return null;

  const pathHistory = visitor.pathHistory && visitor.pathHistory.length > 0
    ? visitor.pathHistory
    : [
        {
          id: 'step_default',
          path: visitor.currentPage || '/',
          title: 'হোমপোর্টাল ও ভিজিট পেজ',
          timestamp: new Date(visitor.visitedAt || Date.now()).getTime(),
          timeSpent: visitor.timeOnPage || '১ মিনিট',
          isChatEntry: visitor.status === 'in_chat',
        },
      ];

  const chatInitiatedPage = visitor.chatInitiatedPage || (visitor.status === 'in_chat' ? visitor.currentPage : null);
  const totalPages = pathHistory.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white">
                  ভিজিটর নেভিগেশন হিস্টোরি ও জার্নি
                </h3>
                <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  রিয়েলটাইম পাথ
                </span>
              </div>
              <p className="text-xs text-slate-300">
                চ্যাট শুরু করার পূর্বে ও পরে ভিজিটরের প্রতিটি পেজ ব্রাউজিং বিবরণ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Visitor Quick Info Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="space-y-0.5">
            <div className="text-[10px] text-slate-400 font-semibold uppercase">ভিজিটর পরিচয়</div>
            <div className="font-bold text-slate-900 truncate">{visitor.name || 'অনলাইন ভিজিটর'}</div>
            {visitor.phone && (
              <div className="text-[11px] font-mono text-blue-600 font-bold">{visitor.phone}</div>
            )}
          </div>

          <div className="space-y-0.5">
            <div className="text-[10px] text-slate-400 font-semibold uppercase">আইপি ও অবস্থান</div>
            <div className="font-mono text-slate-800 font-bold truncate">{visitor.ip || '103.205.132.42'}</div>
            <div className="text-[11px] text-slate-600 truncate">{visitor.location || 'ঢাকা, বাংলাদেশ'}</div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[10px] text-slate-400 font-semibold uppercase">ট্রাফিক সোর্স</div>
            <div className="font-semibold text-slate-800 truncate">{visitor.referrer || 'Direct Link'}</div>
            <div className="text-[11px] text-slate-500">{visitor.device || 'Web Browser'}</div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[10px] text-slate-400 font-semibold uppercase">বর্তমান স্ট্যাটাস</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${
                visitor.status === 'in_chat' ? 'bg-indigo-500 animate-ping' : 'bg-emerald-500 animate-pulse'
              }`} />
              <span className={`font-bold ${
                visitor.status === 'in_chat' ? 'text-indigo-700' : 'text-emerald-700'
              }`}>
                {visitor.status === 'in_chat' ? 'চ্যাটে যুক্ত' : visitor.status === 'invited' ? 'ইনভাইটেড' : 'ব্রাউজিং করছেন'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">মোট সময়: {visitor.timeOnPage}</div>
          </div>
        </div>

        {/* Chat Initiated Highlight Banner (if initiated) */}
        {chatInitiatedPage && (
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-b border-amber-200 p-3.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <div className="font-extrabold text-amber-950 flex items-center gap-1.5">
                  <span>📌 চ্যাট ইনিশিয়েশন পয়েন্ট (Chat Initiated Page):</span>
                  <span className="font-mono bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-300">
                    {chatInitiatedPage}
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  এই পেজটি ব্রাউজ করার সময় গ্রাহক সরাসরি লাইভ চ্যাট শুরু করেছিলেন।
                  {visitor.chatInitiatedAt && ` (সময়: ${new Date(visitor.chatInitiatedAt).toLocaleTimeString('bn-BD')})`}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <span className="bg-amber-500 text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-xs">
                কনভার্সন ট্রিগার
              </span>
            </div>
          </div>
        )}

        {/* Navigation Step-by-Step Stepper Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>ভিজিটকৃত পৃষ্ঠার ক্রমানুসার (মোট {totalPages}টি পেজ ভিজিট)</span>
            </div>
            <span className="text-[11px] font-mono">সর্বপ্রথম এন্ট্রি হতে বর্তমান সময়</span>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:top-3 before:bottom-3 before:left-2.5 before:w-0.5 before:bg-slate-200">
            {pathHistory.map((step, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === pathHistory.length - 1;
              const isChatTrigger = step.isChatEntry || step.path === chatInitiatedPage;

              return (
                <div key={step.id || idx} className="relative group">
                  {/* Stepper Bullet Node */}
                  <div
                    className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center font-bold text-[10px] transition-all shadow-xs ${
                      isChatTrigger
                        ? 'bg-amber-500 border-amber-300 text-white ring-4 ring-amber-100 animate-bounce'
                        : isLast
                        ? 'bg-blue-600 border-white text-white ring-4 ring-blue-100'
                        : isFirst
                        ? 'bg-emerald-600 border-white text-white ring-2 ring-emerald-100'
                        : 'bg-white border-slate-300 text-slate-600 group-hover:border-blue-500'
                    }`}
                  >
                    {idx + 1}
                  </div>

                  {/* Step Card Container */}
                  <div
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isChatTrigger
                        ? 'bg-amber-50/70 border-amber-300 shadow-sm'
                        : isLast
                        ? 'bg-blue-50/50 border-blue-200 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs">
                          {step.title || 'ওয়েব পেজ'}
                        </span>

                        <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                          {step.path}
                        </span>

                        {isFirst && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                            🚪 ল্যান্ডিং পৃষ্ঠা (Landing)
                          </span>
                        )}

                        {isChatTrigger && (
                          <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            <span>💬 চ্যাট শুরুর পেজ</span>
                          </span>
                        )}

                        {isLast && !isChatTrigger && (
                          <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                            📍 বর্তমান পৃষ্ঠা (Active)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 shrink-0 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>সময়: {step.timeSpent || '১ মিনিট'}</span>
                        {step.timestamp && (
                          <span className="text-slate-400">
                            • {new Date(step.timestamp).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Additional context note if visited before chat */}
                    {isChatTrigger && (
                      <div className="mt-2 text-[11px] text-amber-900 bg-amber-100/60 p-2 rounded-xl border border-amber-200/70 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>
                          গ্রাহক পূর্ববর্তী <b>{idx}</b> টি পৃষ্ঠা ব্রাউজ করার পর এই পেজে থাকা অবস্থায় সরাসরি চ্যাট ইনবক্সে যোগাযোগ করেছেন।
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            আইপি: <span className="font-mono font-bold text-slate-800">{visitor.ip}</span> • উৎস:{' '}
            <span className="font-semibold text-slate-800">{visitor.referrer || 'সরাসরি'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              বন্ধ করুন
            </button>

            <button
              onClick={() => {
                onInviteToChat(visitor);
                onClose();
              }}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{visitor.status === 'in_chat' ? 'চ্যাট ওপেন করুন' : 'সরাসরি চ্যাট ইনভাইট পাঠান'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
