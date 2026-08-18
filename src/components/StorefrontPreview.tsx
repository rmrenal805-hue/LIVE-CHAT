import React, { useState } from 'react';
import {
  MessageSquare,
  ExternalLink,
  Globe,
  Megaphone,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Banknote,
  Users,
  HelpCircle,
  Gift,
  FileText,
  Compass,
  CheckCircle2
} from 'lucide-react';
import { WidgetConfig } from '../types';
import { NoticeHeaderBar } from './CustomerWidget/NoticeHeaderBar';
import { recordVisitorPageVisit, getPageTitleForPath } from '../lib/visitorTracker';

interface StorefrontPreviewProps {
  widgetConfig?: WidgetConfig;
  onPageNavigate?: (path: string, title?: string) => void;
}

export const StorefrontPreview: React.FC<StorefrontPreviewProps> = ({ widgetConfig, onPageNavigate }) => {
  const [activePath, setActivePath] = useState<string>('/');

  const activePromos = (
    widgetConfig?.promoBanners && widgetConfig.promoBanners.length > 0
      ? widgetConfig.promoBanners
      : widgetConfig?.promoBanner
      ? [widgetConfig.promoBanner]
      : []
  ).filter((p) => p.enabled && p.imageUrl);

  const notice = widgetConfig?.noticeHeader;

  const handleNavigate = (path: string, title: string) => {
    setActivePath(path);
    recordVisitorPageVisit(path, title);
    if (onPageNavigate) {
      onPageNavigate(path, title);
    }
  };

  const navPages = [
    { path: '/', label: 'হোমপোর্টাল', icon: Globe, title: 'হোমপোর্টাল ও অফিসিয়াল লিংক' },
    { path: '/deposit-guide', label: 'ডিপোজিট গাইড', icon: CreditCard, title: 'ডিপোজিট ও রিচার্জ গাইড' },
    { path: '/withdraw-policy', label: 'উইথড্র নীতিমালা', icon: Banknote, title: 'উইথড্র নীতিমালা ও শর্ত' },
    { path: '/affiliate-program', label: 'অ্যাফিলিয়েট প্রোগ্রাম', icon: Users, title: 'অ্যাফিলিয়েট পার্টনারশিপ' },
    { path: '/promotions', label: 'অফার ও বোনাস', icon: Gift, title: 'স্পেশাল অফার ও বোনাস' },
    { path: '/faq-support', label: 'প্রশ্নোত্তর ও হেল্প', icon: HelpCircle, title: 'সাধারণ প্রশ্নোত্তর ও হেল্প' },
  ];

  return (
    <div id="storefront-preview-canvas" className="flex-1 bg-slate-950 text-slate-300 overflow-y-auto relative flex flex-col items-center">
      
      {/* 1. Top Scrolling Notice Bar for User Dashboard */}
      {notice && notice.enabled && (
        <div className="w-full sticky top-0 z-30 shadow-md">
          <NoticeHeaderBar notice={notice} />
        </div>
      )}

      {/* 2. Interactive Navigation Bar (Simulates customer browsing across pages) */}
      <div className="w-full bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-4 py-2.5 sticky top-0 z-20 flex items-center justify-center">
        <div className="max-w-5xl w-full flex items-center justify-between gap-2 overflow-x-auto scrollbar-none text-xs">
          <div className="flex items-center gap-1.5 shrink-0 text-slate-400 font-bold pr-2 border-r border-slate-800">
            <Compass className="w-3.5 h-3.5 text-blue-400 animate-spin" />
            <span className="text-[10px] uppercase tracking-wider text-slate-300">ওয়েব পেজসমূহ:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-nowrap">
            {navPages.map((page) => {
              const Icon = page.icon;
              const isActive = activePath === page.path;
              return (
                <button
                  key={page.path}
                  onClick={() => handleNavigate(page.path, page.title)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 text-xs whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40 ring-2 ring-blue-400/30'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{page.label}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-amber-300 bg-amber-950/40 border border-amber-800/40 px-2 py-1 rounded-lg shrink-0">
            <span>💡 লাইভ ট্র্যাকিং সক্রিয়</span>
          </div>
        </div>
      </div>

      <div className="w-full flex-1 flex flex-col items-center p-4 sm:p-8 space-y-6 max-w-6xl relative">
        {/* Subtle Background Grid Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

        {/* Dynamic Page Content Based on Selected Tab */}
        {activePath === '/' && (
          <div className="relative z-10 w-full max-w-4xl text-center space-y-2 pt-1 text-[10px]">
            <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
              ওয়েবসাইট সার্ভিস ও অফিশিয়াল পোর্টাল
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl mx-auto leading-relaxed">
              আমাদের অফিশিয়াল ওয়েবসাইট এবং স্পনসরড সার্ভিস পোর্টালসমূহ নিচে দেওয়া হলো। সরাসরি ভিজিট করতে বাটনে ক্লিক করুন। সহায়তার জন্য চ্যাট উইজেট ব্যবহার করুন।
            </p>
          </div>
        )}

        {activePath === '/deposit-guide' && (
          <div className="relative z-10 w-full max-w-4xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 text-xs shadow-xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-white">ডিপোজিট ও ইনস্ট্যান্ট রিচার্জ নির্দেশিকা</h2>
                <p className="text-[11px] text-slate-400">বিকাশ, নগদ, রকেট ও ব্যাংক একাউন্টের মাধ্যমে দ্রুত ডিপোজিট করুন</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
                <div className="font-bold text-emerald-400 text-[11px]">১. ক্যাশআউট বা সেন্ড মানি</div>
                <p className="text-[10px] text-slate-400">প্রদত্ত অফিশিয়াল এজেন্ট বা মার্চেন্ট নম্বরে সঠিক অ্যামাউন্ট সেন্ড করুন।</p>
              </div>
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
                <div className="font-bold text-blue-400 text-[11px]">২. TrxID সংগ্রহ করুন</div>
                <p className="text-[10px] text-slate-400">মেসেজ থেকে ৮ বা ১০ ডিজিটের Transaction ID কপি করে ফর্মে পেস্ট করুন।</p>
              </div>
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
                <div className="font-bold text-amber-400 text-[11px]">৩. ইনস্ট্যান্ট ব্যালেন্স যোগ</div>
                <p className="text-[10px] text-slate-400">১-২ মিনিটের মধ্যে আপনার অ্যাকাউন্টে ব্যালেন্স স্বয়ংক্রিয়ভাবে ক্রেডিট হবে।</p>
              </div>
            </div>
          </div>
        )}

        {activePath === '/withdraw-policy' && (
          <div className="relative z-10 w-full max-w-4xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 text-xs shadow-xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-white">উইথড্র নীতিমালা ও শর্তাবলী</h2>
                <p className="text-[11px] text-slate-400">নিরাপদ এবং দ্রুততম সময়ে আপনার পেমেন্ট পাওয়ার নিয়মাবলী</p>
              </div>
            </div>

            <div className="space-y-2 text-[11px] text-slate-300">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>উইথড্র প্রসেসিং টাইম: ৫ থেকে ১৫ মিনিট (২৪/৭ দিন সক্রিয়)।</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>সর্বনিম্ন উইথড্র সীমা: ৫০০ টাকা এবং সর্বোচ্চ ১,০০,০০০ টাকা প্রতি ট্রানজেকশন।</span>
              </div>
            </div>
          </div>
        )}

        {activePath === '/affiliate-program' && (
          <div className="relative z-10 w-full max-w-4xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 text-xs shadow-xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-white">অ্যাফিলিয়েট পার্টনারশিপ প্রোগ্রাম</h2>
                <p className="text-[11px] text-slate-400">আমাদের সাথে পার্টনার হিসেবে কাজ করে প্রতি মাসে আকর্ষণীয় কমিশন অর্জন করুন</p>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-purple-950/40 to-slate-950 rounded-2xl border border-purple-800/40 text-[11px] text-slate-300 space-y-2">
              <p>📌 আজই আপনার রেফারেল লিংক তৈরি করুন এবং বন্ধুদের আমন্ত্রণ জানিয়ে আজীবন কমিশন উপভোগ করুন।</p>
              <div className="font-bold text-amber-300">যোগাযোগ করতে নিচে চ্যাট উইজেটে মেসেজ দিন।</div>
            </div>
          </div>
        )}

        {activePath === '/promotions' && (
          <div className="relative z-10 w-full max-w-4xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 text-xs shadow-xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-white">স্পেশাল অফার ও বোনাস পোর্টাল</h2>
                <p className="text-[11px] text-slate-400">প্রতিদিনের স্পেশাল বোনাস, ক্যাশব্যাক ও প্রোমো কোডসমূহ</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 bg-gradient-to-br from-rose-950/40 to-slate-950 rounded-2xl border border-rose-800/40 space-y-1.5">
                <span className="text-[10px] font-bold text-rose-400 bg-rose-950 px-2 py-0.5 rounded-md border border-rose-800">১০০% ওয়েলকাম বোনাস</span>
                <h3 className="font-bold text-white text-xs">প্রথম ডিপোজিটে ১০০% বোনাস</h3>
                <p className="text-[10px] text-slate-400">নতুন নিবন্ধিত গ্রাহকদের জন্য প্রথম ডিপোজিটে ইনস্ট্যান্ট সমপরিমাণ বোনাস।</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-amber-950/40 to-slate-950 rounded-2xl border border-amber-800/40 space-y-1.5">
                <span className="text-[10px] font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded-md border border-amber-800">ডেইলি ক্যাশব্যাক</span>
                <h3 className="font-bold text-white text-xs">প্রতিদিনের ৫% ক্যাশব্যাক</h3>
                <p className="text-[10px] text-slate-400">প্রতিদিন রাত ১২টায় অটোমেটিক আপনার একাউন্টে ক্যাশব্যাক জমা হবে।</p>
              </div>
            </div>
          </div>
        )}

        {activePath === '/faq-support' && (
          <div className="relative z-10 w-full max-w-4xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 text-xs shadow-xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-white">সাধারণ প্রশ্নোত্তর ও হেল্পডেস্ক (FAQ)</h2>
                <p className="text-[11px] text-slate-400">গ্রাহকদের সর্বাধিক জিজ্ঞাসিত সাধারণ প্রশ্ন এবং উত্তর</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <div className="font-bold text-white text-[11px]">প্রশ্ন: কতক্ষণ সময়ের মধ্যে লাইভ সাপোর্ট পাওয়া যায়?</div>
                <p className="text-[10px] text-slate-400">উত্তর: আমাদের সাপোর্ট টিম ২৪ ঘণ্টা সার্বক্ষণিক সক্রিয় থাকে। চ্যাট শুরু করলে ৩০ সেকেন্ডের মধ্যে প্রতিনিধি যুক্ত হন।</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <div className="font-bold text-white text-[11px]">প্রশ্ন: ডিপোজিট সফল না হলে কি করব?</div>
                <p className="text-[10px] text-slate-400">উত্তর: আপনার ডিপোজিটের TrxID এবং প্রেরক নম্বর দিয়ে লাইভ চ্যাটে মেসেজ দিন, তাৎক্ষণিক সমাধান করা হবে।</p>
              </div>
            </div>
          </div>
        )}

        {/* Promoted Websites Section */}
        {activePromos.length > 0 ? (
          <div className="relative z-10 w-full max-w-5xl space-y-3 text-[10px]">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[10px] uppercase tracking-wider">
                <Megaphone className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                <span>প্রমোটেড ওয়েবসাইটসমূহ ({activePromos.length})</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                অফিশিয়াল লিংক ও অফার
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activePromos.map((promo, idx) => (
                <div
                  key={promo.id || idx}
                  className="bg-gradient-to-b from-slate-900 to-slate-950 border border-purple-500/30 hover:border-purple-500/60 rounded-2xl overflow-hidden shadow-xl hover:shadow-purple-950/40 transition duration-300 flex flex-col justify-between group text-[10px]"
                >
                  <div>
                    {/* Photo Banner */}
                    <a
                      href={promo.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block relative h-40 sm:h-44 overflow-hidden bg-slate-900 group"
                    >
                      <img
                        src={promo.imageUrl}
                        alt={promo.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                      <div className="absolute top-2.5 left-2.5 bg-slate-950/80 backdrop-blur-md text-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded-lg border border-amber-400/30 flex items-center gap-1 shadow-md">
                        <Megaphone className="w-3 h-3 text-amber-400" />
                        <span>স্পনসরড ওয়েবসাইট</span>
                      </div>
                    </a>

                    {/* Text Content */}
                    <div className="p-3.5 space-y-1.5">
                      <h3 className="text-xs font-bold text-white group-hover:text-amber-300 transition leading-snug">
                        {promo.title}
                      </h3>
                      {promo.description && (
                        <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-3">
                          {promo.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Visit Site Button Underneath */}
                  <div className="p-3.5 pt-0">
                    <a
                      href={promo.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-black text-[10px] rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <span>{promo.buttonText || 'ওয়েবসাইট ভিজিট করুন (Visit Site)'}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="relative z-10 w-full max-w-md bg-slate-900/60 border border-slate-800 backdrop-blur-md rounded-2xl p-5 text-center space-y-2 text-[10px]">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400">
              <Globe className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-white">কোনো ওয়েবসাইট প্রমোশন সক্রিয় নেই</h3>
            <p className="text-[10px] text-slate-400">
              এডমিন প্যানেল থেকে 📢 ওয়েবসাইট প্রমোশন ট্যাবে গিয়ে নতুন অফিশিয়াল ওয়েবসাইট যোগ করতে পারবেন।
            </p>
          </div>
        )}

        {/* Live Chat Notice Bar */}
        <div className="relative z-10 w-full max-w-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-lg text-center sm:text-left text-[10px]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-[10px] font-bold text-white">সরাসরি লাইভ চ্যাট সহায়তা (Live Support)</h4>
              <p className="text-[10px] text-slate-400">যেকোনো তথ্যের জন্য ডানদিকের নিচে চ্যাট আইকনে ক্লিক করুন</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 py-1 px-2.5 rounded-lg shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>অনলাইন সাপোর্ট চ্যাট সক্রিয়</span>
          </div>
        </div>

      </div>
    </div>
  );
};
