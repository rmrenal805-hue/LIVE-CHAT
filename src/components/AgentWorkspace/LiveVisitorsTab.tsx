import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Globe,
  Clock,
  Laptop,
  MessageSquarePlus,
  UserCheck,
  RefreshCw,
  LayoutGrid,
  Map as MapIcon,
  Compass,
  ArrowRight,
  Search,
  CheckCircle2,
  Sparkles,
  Phone,
  Layers,
  Copy,
  Check
} from 'lucide-react';
import { LiveVisitor } from '../../types';
import { LoadingSpinner } from '../LoadingSpinner';
import { WorldMapVisualization } from './WorldMapVisualization';
import { VisitorJourneyModal } from './VisitorJourneyModal';

interface LiveVisitorsTabProps {
  visitors: LiveVisitor[];
  onInviteToChat: (visitor: LiveVisitor) => void;
}

export const LiveVisitorsTab: React.FC<LiveVisitorsTabProps> = ({ visitors, onInviteToChat }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'both' | 'map' | 'grid'>('both');
  const [selectedVisitorForJourney, setSelectedVisitorForJourney] = useState<LiveVisitor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_chat' | 'browsing' | 'multi_page'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const handleCopyPhone = (phone: string, id: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered Visitors
  const filteredVisitors = useMemo(() => {
    return visitors.filter((v) => {
      // Status Filter
      if (statusFilter === 'in_chat' && v.status !== 'in_chat') return false;
      if (statusFilter === 'browsing' && v.status !== 'browsing') return false;
      if (statusFilter === 'multi_page' && (!v.pathHistory || v.pathHistory.length < 2)) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = v.name && v.name.toLowerCase().includes(q);
        const matchesPhone = v.phone && v.phone.includes(q);
        const matchesIp = v.ip && v.ip.toLowerCase().includes(q);
        const matchesLocation = v.location && v.location.toLowerCase().includes(q);
        const matchesCurrentPage = v.currentPage && v.currentPage.toLowerCase().includes(q);
        const matchesHistory = v.pathHistory && v.pathHistory.some((p) => p.path.toLowerCase().includes(q) || (p.title && p.title.toLowerCase().includes(q)));
        if (!matchesName && !matchesPhone && !matchesIp && !matchesLocation && !matchesCurrentPage && !matchesHistory) {
          return false;
        }
      }
      return true;
    });
  }, [visitors, statusFilter, searchQuery]);

  return (
    <div id="live-visitors-page" className="flex-1 bg-slate-50 p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-5">
        
        {/* Top Header Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <span>লাইভ ওয়েবসাইট ভিজিটর ও নেভিগেশন পাথ ট্র্যাকিং</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                ভিজিটররা চ্যাট শুরু করার পূর্বে এবং পরে কোন কোন পেজে ভিজিট করেছেন তা রিয়েলটাইমে ট্র্যাক করুন।
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* View Mode Switcher */}
              <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1 text-xs">
                <button
                  onClick={() => setViewMode('both')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                    viewMode === 'both' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>উভয় ভিউ</span>
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                    viewMode === 'map' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span>ম্যাপ</span>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                    viewMode === 'grid' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>কার্ড</span>
                </button>
              </div>

              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                {isRefreshing ? (
                  <LoadingSpinner size="xs" color="slate" label="রিফ্রেশ হচ্ছে..." />
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                    <span>রিফ্রেশ</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-bold shadow-xs">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                <span>{visitors.length} জন ভিজিটর সক্রিয়</span>
              </div>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ভিজিটর নাম, ফোন, আইপি বা পেজ দিয়ে খুঁজুন..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                সকল ভিজিটর ({visitors.length})
              </button>

              <button
                onClick={() => setStatusFilter('in_chat')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'in_chat'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                }`}
              >
                <span>💬 চ্যাটে যুক্ত ({visitors.filter((v) => v.status === 'in_chat').length})</span>
              </button>

              <button
                onClick={() => setStatusFilter('browsing')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'browsing'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <span>🟢 ব্রাউজিং ({visitors.filter((v) => v.status === 'browsing').length})</span>
              </button>

              <button
                onClick={() => setStatusFilter('multi_page')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'multi_page'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-amber-600" />
                <span>একাধিক পেজ জার্নি ({visitors.filter((v) => v.pathHistory && v.pathHistory.length > 1).length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* World Map Section */}
        {(viewMode === 'both' || viewMode === 'map') && (
          <WorldMapVisualization visitors={filteredVisitors} onInviteToChat={onInviteToChat} />
        )}

        {/* Visitors Grid Section */}
        {(viewMode === 'both' || viewMode === 'grid') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-blue-600" />
                <span>ভিজিটরদের বিস্তারিত তালিকা ও জার্নি পাথ ({filteredVisitors.length})</span>
              </h3>
            </div>

            {filteredVisitors.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <UserCheck className="w-7 h-7 animate-pulse" />
                </div>
                <h4 className="font-extrabold text-slate-800 text-sm">কোনো ভিজিটর ডেটা পাওয়া যায়নি</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  ওয়েবসাইটে নতুন কোনো ভিজিটর ব্রাউজ শুরু করলে সাথে সাথে তাদের ভিজিট করা পৃষ্ঠা ও লাইভ পাথ এখানে দৃশ্যমান হবে।
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredVisitors.map((v) => {
                  const history = v.pathHistory && v.pathHistory.length > 0
                    ? v.pathHistory
                    : [
                        {
                          id: 'step_default',
                          path: v.currentPage || '/',
                          title: 'হোমপোর্টাল',
                          timestamp: Date.now(),
                          timeSpent: v.timeOnPage || '১ মিনিট',
                          isChatEntry: v.status === 'in_chat',
                        },
                      ];
                  
                  const chatTriggerPage = v.chatInitiatedPage || (v.status === 'in_chat' ? v.currentPage : null);
                  const totalSteps = history.length;

                  return (
                    <div
                      key={v.id}
                      className="bg-white rounded-3xl p-5 shadow-xs hover:shadow-md border border-slate-200 transition-all flex flex-col justify-between space-y-4"
                    >
                      {/* Visitor Top Header */}
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-slate-900 text-sm">
                                {v.name || 'অনলাইন ভিজিটর'}
                              </h4>
                              <span
                                className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border uppercase ${
                                  v.status === 'in_chat'
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    : v.status === 'invited'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {v.status === 'in_chat'
                                  ? '💬 চ্যাটে যুক্ত'
                                  : v.status === 'invited'
                                  ? '✉️ ইনভাইটেড'
                                  : '🟢 ব্রাউজিং'}
                              </span>
                            </div>

                            {/* Phone & IP Badge */}
                            <div className="flex items-center gap-1.5 flex-wrap font-mono text-[10px] mt-1.5">
                              {v.phone ? (
                                <button
                                  onClick={() => handleCopyPhone(v.phone!, v.id)}
                                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 transition cursor-pointer"
                                  title="ফোন নম্বর কপি করুন"
                                >
                                  <Phone className="w-3 h-3 text-blue-600" />
                                  <span>{v.phone}</span>
                                  {copiedId === v.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                                </button>
                              ) : null}

                              <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-bold">
                                🌐 IP: {v.ip || '103.205.132.42'}
                              </span>

                              <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md">
                                📍 {v.location || 'ঢাকা, বাংলাদেশ'}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-[10px] text-slate-400 font-semibold uppercase">মোট ব্রাউজিং সময়</div>
                            <div className="font-bold text-slate-800 text-xs font-mono">{v.timeOnPage}</div>
                          </div>
                        </div>

                        {/* Summary Journey Badges */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-[11px]">
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">🚪 ল্যান্ডিং পৃষ্ঠা</span>
                            <div className="font-mono text-slate-800 font-bold truncate">
                              {history[0]?.path || '/'}
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">📍 বর্তমান পৃষ্ঠা</span>
                            <div className="font-mono text-blue-600 font-bold truncate">
                              {v.currentPage || '/'}
                            </div>
                          </div>

                          <div className="space-y-0.5 col-span-2 sm:col-span-1">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">📑 মোট পেজ</span>
                            <div className="font-bold text-slate-800 flex items-center gap-1">
                              <Compass className="w-3.5 h-3.5 text-indigo-500" />
                              <span>{totalSteps}টি পৃষ্ঠা ভিজিট</span>
                            </div>
                          </div>
                        </div>

                        {/* Visual Step-by-Step Navigation Path Breadcrumb */}
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-extrabold text-slate-800 flex items-center gap-1">
                              <Compass className="w-3.5 h-3.5 text-blue-600" />
                              <span>নেভিগেশন হিস্টোরি (পৃষ্ঠা অনুযায়ী ক্রমানুসার):</span>
                            </span>
                            <button
                              onClick={() => setSelectedVisitorForJourney(v)}
                              className="text-blue-600 hover:text-blue-700 font-bold text-[10px] flex items-center gap-0.5 transition cursor-pointer"
                            >
                              <span>বিস্তারিত জার্নি দেখুন</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Stepper Trail */}
                          <div className="bg-slate-50/80 rounded-2xl p-2.5 border border-slate-200 space-y-2">
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                              {history.map((step, idx) => {
                                const isFirst = idx === 0;
                                const isLast = idx === history.length - 1;
                                const isChatTrigger = step.isChatEntry || step.path === chatTriggerPage;

                                return (
                                  <React.Fragment key={step.id || idx}>
                                    <div
                                      onClick={() => setSelectedVisitorForJourney(v)}
                                      className={`shrink-0 px-2.5 py-1 rounded-xl text-[10px] font-semibold border flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
                                        isChatTrigger
                                          ? 'bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-300/40 font-bold'
                                          : isLast
                                          ? 'bg-blue-100 text-blue-900 border-blue-300 font-bold'
                                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                                      }`}
                                    >
                                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                        isChatTrigger ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'
                                      }`}>
                                        {idx + 1}
                                      </span>
                                      <span className="font-mono">{step.path}</span>
                                      {isChatTrigger && (
                                        <span className="bg-amber-500 text-white text-[8px] font-extrabold px-1 rounded">
                                          💬 চ্যাট
                                        </span>
                                      )}
                                    </div>

                                    {idx < history.length - 1 && (
                                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </div>

                            {/* Chat Initiated Callout Banner */}
                            {chatTriggerPage && (
                              <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 text-[10px] text-amber-900 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>
                                    📌 <b>চ্যাট শুরুর পৃষ্ঠা:</b> <span className="font-mono font-bold">{chatTriggerPage}</span>
                                  </span>
                                </div>
                                <span className="text-[9px] bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded font-bold shrink-0">
                                  সেশন ট্রিগার
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setSelectedVisitorForJourney(v)}
                          className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Compass className="w-3.5 h-3.5 text-blue-600" />
                          <span>পাথ জার্নি</span>
                        </button>

                        <button
                          onClick={() => onInviteToChat(v)}
                          className="py-2 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MessageSquarePlus className="w-3.5 h-3.5" />
                          <span>{v.status === 'in_chat' ? 'চ্যাট ওপেন করুন' : 'চ্যাট ইনভাইট'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Full Visitor Journey Stepper Modal */}
      {selectedVisitorForJourney && (
        <VisitorJourneyModal
          visitor={selectedVisitorForJourney}
          onClose={() => setSelectedVisitorForJourney(null)}
          onInviteToChat={onInviteToChat}
        />
      )}
    </div>
  );
};
