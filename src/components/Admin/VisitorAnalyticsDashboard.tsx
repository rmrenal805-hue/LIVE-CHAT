import React, { useState, useMemo } from 'react';
import {
  LiveVisitor,
  VisitorLogEntry,
  VisitorStatsSummary,
  VisitorTimeframeFilter,
} from '../../types';
import { clearDemoVisitorLogs } from '../../lib/visitorStats';
import {
  Users,
  Eye,
  MessageSquare,
  TrendingUp,
  Calendar,
  Clock,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  Compass,
  ArrowUpRight,
  RefreshCw,
  Download,
  Search,
  Filter,
  Layers,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Sparkles,
  BarChart3,
  Trash2,
} from 'lucide-react';

interface VisitorAnalyticsDashboardProps {
  stats: VisitorStatsSummary;
  logs: VisitorLogEntry[];
  liveVisitors: LiveVisitor[];
  activeTimeframe: VisitorTimeframeFilter;
  onTimeframeChange: (tf: VisitorTimeframeFilter) => void;
  onRefresh?: () => void;
  onInviteToChat?: (visitor: LiveVisitor) => void;
}

export const VisitorAnalyticsDashboard: React.FC<VisitorAnalyticsDashboardProps> = ({
  stats,
  logs,
  liveVisitors,
  activeTimeframe,
  onTimeframeChange,
  onRefresh,
  onInviteToChat,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [chatOnlyFilter, setChatOnlyFilter] = useState(false);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);

  // Copy Phone Helper
  const handleCopyPhone = (phone: string, id: string) => {
    navigator.clipboard?.writeText(phone);
    setCopiedPhoneId(id);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  // Export filtered logs to CSV
  const handleExportCsv = () => {
    if (!filteredList || filteredList.length === 0) return;
    const headers = ['Visitor ID', 'Name', 'Phone', 'Email', 'Location', 'IP', 'Device', 'Current Page', 'Pageviews', 'Chat Initiated', 'Visited At'];
    const rows = filteredList.map((l) => [
      `"${l.visitorId}"`,
      `"${l.name || ''}"`,
      `"${l.phone || ''}"`,
      `"${l.email || ''}"`,
      `"${l.location || ''}"`,
      `"${l.ip || ''}"`,
      `"${l.device || ''}"`,
      `"${l.currentPage || ''}"`,
      l.pageviewsCount || 1,
      l.chatInitiated ? 'Yes' : 'No',
      `"${l.visitedAt || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `novachat_visitors_${activeTimeframe}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Clear demo / test visitor data
  const [isClearing, setIsClearing] = useState(false);
  const handleClearDemoData = async () => {
    setIsClearing(true);
    try {
      clearDemoVisitorLogs();
      await fetch('/api/analytics/clear-demo', { method: 'POST' }).catch(() => {});
      if (onRefresh) onRefresh();
    } catch {}
    setTimeout(() => {
      setIsClearing(false);
    }, 600);
  };

  // Filtered visitor list based on current timeframe
  const filteredList = useMemo(() => {
    let list: VisitorLogEntry[] = [];
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const yearStr = `${now.getFullYear()}`;

    if (activeTimeframe === 'live') {
      list = liveVisitors.map((v) => ({
        id: `live_${v.id}`,
        visitorId: v.id,
        name: v.name || 'অনলাইন ভিজিটর',
        phone: v.phone,
        email: v.email,
        ip: v.ip || '103.205.132.42',
        location: v.location || 'ঢাকা, বাংলাদেশ',
        device: v.device || 'Chrome / Android',
        deviceType: v.deviceType || 'phone',
        referrer: v.referrer || 'Direct Link',
        landingPage: v.pathHistory?.[0]?.path || v.currentPage || '/',
        currentPage: v.currentPage || '/',
        visitedAt: v.visitedAt || now.toISOString(),
        date: todayStr,
        week: 'current',
        month: monthStr,
        year: yearStr,
        timeSpent: v.timeOnPage || '১ মিনিট',
        pageviewsCount: Math.max(1, v.pathHistory?.length || 1),
        pathHistory: v.pathHistory,
        chatInitiated: v.status === 'in_chat' || !!v.chatInitiatedPage,
        chatInitiatedPage: v.chatInitiatedPage,
      }));
    } else if (activeTimeframe === 'today') {
      list = logs.filter((l) => l.date === todayStr);
    } else if (activeTimeframe === 'this_week') {
      // Last 7 days or current week
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      list = logs.filter((l) => new Date(l.visitedAt) >= sevenDaysAgo || l.date === todayStr);
    } else if (activeTimeframe === 'this_month') {
      list = logs.filter((l) => l.month === monthStr || l.date === todayStr);
    } else if (activeTimeframe === 'this_year') {
      list = logs.filter((l) => l.year === yearStr || l.date === todayStr);
    } else {
      list = logs;
    }

    if (chatOnlyFilter) {
      list = list.filter((l) => l.chatInitiated);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.phone && l.phone.includes(q)) ||
          (l.ip && l.ip.includes(q)) ||
          (l.location && l.location.toLowerCase().includes(q)) ||
          (l.currentPage && l.currentPage.toLowerCase().includes(q))
      );
    }

    return list;
  }, [logs, liveVisitors, activeTimeframe, chatOnlyFilter, searchQuery]);

  // Current active period headline stats
  const currentPeriodStat = useMemo(() => {
    switch (activeTimeframe) {
      case 'today':
        return { label: 'আজকের ভিজিট (Today)', stat: stats.today };
      case 'this_week':
        return { label: 'এই সপ্তাহের ভিজিট (This Week)', stat: stats.thisWeek };
      case 'this_month':
        return { label: 'এই মাসের ভিজিট (This Month)', stat: stats.thisMonth };
      case 'this_year':
        return { label: 'এই বছরের ভিজিটর (This Year)', stat: stats.thisYear };
      case 'live':
        return {
          label: 'লাইভ সক্রিয় ভিজিটর (Live Online)',
          stat: {
            visits: liveVisitors.length,
            uniqueVisitors: new Set(liveVisitors.map((v) => v.id)).size,
            pageviews: liveVisitors.reduce((acc, v) => acc + (v.pathHistory?.length || 1), 0),
            chatInitiatedCount: liveVisitors.filter((v) => v.status === 'in_chat').length,
          },
        };
      default:
        return { label: 'সর্বমোট সংরক্ষিত ভিজিটর (All Time)', stat: stats.allTime };
    }
  }, [activeTimeframe, stats, liveVisitors]);

  // Selected Trend points to display in Chart
  const trendData = useMemo(() => {
    if (activeTimeframe === 'today') {
      return { title: 'আজকের ঘণ্টায় ঘণ্টায় ভিজিটের ট্রেন্ড (Hourly Trend)', points: stats.hourlyTrendToday };
    }
    if (activeTimeframe === 'this_week') {
      return { title: 'এই সপ্তাহের ৭ দিনের ভিজিট ট্রেন্ড (Daily Breakdown)', points: stats.dailyTrendThisWeek };
    }
    if (activeTimeframe === 'this_month') {
      return { title: 'এই মাসের সাপ্তাহিক ভিজিট বিশ্লেষণ (Weekly Breakdown)', points: stats.weeklyTrendThisMonth };
    }
    if (activeTimeframe === 'this_year') {
      return { title: 'এই বছরের মাসিক ভিজিট পরিসংখ্যান (Monthly Trend)', points: stats.monthlyTrendThisYear };
    }
    return { title: 'এই সপ্তাহের ৭ দিনের ট্রেন্ড', points: stats.dailyTrendThisWeek };
  }, [activeTimeframe, stats]);

  const maxTrendVisits = Math.max(1, ...trendData.points.map((p) => p.visits));

  return (
    <div className="space-y-6">
      {/* 1. FOUR HERO METRIC CARDS (Today, This Week, This Month, This Year) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Visits */}
        <div
          onClick={() => onTimeframeChange('today')}
          className={`cursor-pointer rounded-3xl p-5 border transition-all duration-200 relative overflow-hidden group shadow-xs hover:shadow-md ${
            activeTimeframe === 'today'
              ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-blue-600 ring-2 ring-blue-400 ring-offset-2'
              : 'bg-white border-slate-200 text-slate-900 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 ${
                activeTimeframe === 'today' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>আজকের ভিজিট</span>
            </span>
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                activeTimeframe === 'today' ? 'bg-emerald-400/20 text-emerald-200' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span>+{stats.today.growthPercent || 18}%</span>
            </span>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-black tracking-tight">{stats.today.visits.toLocaleString('bn-BD')}</div>
              <p className={`text-xs mt-0.5 font-medium ${activeTimeframe === 'today' ? 'text-blue-100' : 'text-slate-500'}`}>
                মোট ভিজিট সেশন
              </p>
            </div>
            <div className="text-right">
              <div className={`text-sm font-bold ${activeTimeframe === 'today' ? 'text-white' : 'text-slate-800'}`}>
                {stats.today.uniqueVisitors.toLocaleString('bn-BD')}
              </div>
              <p className={`text-[10px] ${activeTimeframe === 'today' ? 'text-blue-200' : 'text-slate-400'}`}>
                ইউনিক ভিজিটর
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t flex items-center justify-between text-[11px] font-semibold border-white/10">
            <span className={activeTimeframe === 'today' ? 'text-blue-100' : 'text-slate-500'}>
              পেজভিউ: <b className="font-bold text-inherit">{stats.today.pageviews.toLocaleString('bn-BD')}</b>
            </span>
            <span className={`flex items-center gap-1 ${activeTimeframe === 'today' ? 'text-white font-bold' : 'text-blue-600'}`}>
              <span>চ্যাটে যুক্ত: {stats.today.chatInitiatedCount.toLocaleString('bn-BD')}</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 2: This Week's Visits */}
        <div
          onClick={() => onTimeframeChange('this_week')}
          className={`cursor-pointer rounded-3xl p-5 border transition-all duration-200 relative overflow-hidden group shadow-xs hover:shadow-md ${
            activeTimeframe === 'this_week'
              ? 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-indigo-600 ring-2 ring-indigo-400 ring-offset-2'
              : 'bg-white border-slate-200 text-slate-900 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 ${
                activeTimeframe === 'this_week' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>এই সপ্তাহের ভিজিট</span>
            </span>
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                activeTimeframe === 'this_week' ? 'bg-emerald-400/20 text-emerald-200' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span>+{stats.thisWeek.growthPercent || 24}%</span>
            </span>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-black tracking-tight">{stats.thisWeek.visits.toLocaleString('bn-BD')}</div>
              <p className={`text-xs mt-0.5 font-medium ${activeTimeframe === 'this_week' ? 'text-indigo-100' : 'text-slate-500'}`}>
                সাপ্তাহিক ভিজিট
              </p>
            </div>
            <div className="text-right">
              <div className={`text-sm font-bold ${activeTimeframe === 'this_week' ? 'text-white' : 'text-slate-800'}`}>
                {stats.thisWeek.uniqueVisitors.toLocaleString('bn-BD')}
              </div>
              <p className={`text-[10px] ${activeTimeframe === 'this_week' ? 'text-indigo-200' : 'text-slate-400'}`}>
                ইউনিক ভিজিটর
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t flex items-center justify-between text-[11px] font-semibold border-white/10">
            <span className={activeTimeframe === 'this_week' ? 'text-indigo-100' : 'text-slate-500'}>
              পেজভিউ: <b className="font-bold text-inherit">{stats.thisWeek.pageviews.toLocaleString('bn-BD')}</b>
            </span>
            <span className={`flex items-center gap-1 ${activeTimeframe === 'this_week' ? 'text-white font-bold' : 'text-indigo-600'}`}>
              <span>চ্যাটে যুক্ত: {stats.thisWeek.chatInitiatedCount.toLocaleString('bn-BD')}</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 3: This Month's Visits */}
        <div
          onClick={() => onTimeframeChange('this_month')}
          className={`cursor-pointer rounded-3xl p-5 border transition-all duration-200 relative overflow-hidden group shadow-xs hover:shadow-md ${
            activeTimeframe === 'this_month'
              ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-emerald-600 ring-2 ring-emerald-400 ring-offset-2'
              : 'bg-white border-slate-200 text-slate-900 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 ${
                activeTimeframe === 'this_month' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>এই মাসের ভিজিট</span>
            </span>
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                activeTimeframe === 'this_month' ? 'bg-white/20 text-emerald-100' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span>+{stats.thisMonth.growthPercent || 32}%</span>
            </span>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-black tracking-tight">{stats.thisMonth.visits.toLocaleString('bn-BD')}</div>
              <p className={`text-xs mt-0.5 font-medium ${activeTimeframe === 'this_month' ? 'text-emerald-100' : 'text-slate-500'}`}>
                মাসিক মোট ভিজিট
              </p>
            </div>
            <div className="text-right">
              <div className={`text-sm font-bold ${activeTimeframe === 'this_month' ? 'text-white' : 'text-slate-800'}`}>
                {stats.thisMonth.uniqueVisitors.toLocaleString('bn-BD')}
              </div>
              <p className={`text-[10px] ${activeTimeframe === 'this_month' ? 'text-emerald-200' : 'text-slate-400'}`}>
                ইউনিক ভিজিটর
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t flex items-center justify-between text-[11px] font-semibold border-white/10">
            <span className={activeTimeframe === 'this_month' ? 'text-emerald-100' : 'text-slate-500'}>
              পেজভিউ: <b className="font-bold text-inherit">{stats.thisMonth.pageviews.toLocaleString('bn-BD')}</b>
            </span>
            <span className={`flex items-center gap-1 ${activeTimeframe === 'this_month' ? 'text-white font-bold' : 'text-emerald-600'}`}>
              <span>চ্যাটে যুক্ত: {stats.thisMonth.chatInitiatedCount.toLocaleString('bn-BD')}</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 4: This Year's Visitors */}
        <div
          onClick={() => onTimeframeChange('this_year')}
          className={`cursor-pointer rounded-3xl p-5 border transition-all duration-200 relative overflow-hidden group shadow-xs hover:shadow-md ${
            activeTimeframe === 'this_year'
              ? 'bg-gradient-to-br from-amber-600 to-orange-700 text-white border-amber-600 ring-2 ring-amber-400 ring-offset-2'
              : 'bg-white border-slate-200 text-slate-900 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 ${
                activeTimeframe === 'this_year' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-800'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>এই বছরের ভিজিটর</span>
            </span>
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                activeTimeframe === 'this_year' ? 'bg-white/20 text-amber-100' : 'bg-amber-50 text-amber-800'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>বার্ষিক ট্রাফিক</span>
            </span>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-black tracking-tight">{stats.thisYear.visits.toLocaleString('bn-BD')}</div>
              <p className={`text-xs mt-0.5 font-medium ${activeTimeframe === 'this_year' ? 'text-amber-100' : 'text-slate-500'}`}>
                বার্ষিক মোট ভিজিট
              </p>
            </div>
            <div className="text-right">
              <div className={`text-sm font-bold ${activeTimeframe === 'this_year' ? 'text-white' : 'text-slate-800'}`}>
                {stats.thisYear.uniqueVisitors.toLocaleString('bn-BD')}
              </div>
              <p className={`text-[10px] ${activeTimeframe === 'this_year' ? 'text-amber-200' : 'text-slate-400'}`}>
                ইউনিক ভিজিটর
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t flex items-center justify-between text-[11px] font-semibold border-white/10">
            <span className={activeTimeframe === 'this_year' ? 'text-amber-100' : 'text-slate-500'}>
              পেজভিউ: <b className="font-bold text-inherit">{stats.thisYear.pageviews.toLocaleString('bn-BD')}</b>
            </span>
            <span className={`flex items-center gap-1 ${activeTimeframe === 'this_year' ? 'text-white font-bold' : 'text-amber-600'}`}>
              <span>চ্যাটে যুক্ত: {stats.thisYear.chatInitiatedCount.toLocaleString('bn-BD')}</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* 2. TIMEFRAME SWITCHER BAR & ACTIONS */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <button
            onClick={() => onTimeframeChange('live')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
              activeTimeframe === 'live'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping"></span>
            <span>🟢 লাইভ সক্রিয় ({liveVisitors.length})</span>
          </button>

          <button
            onClick={() => onTimeframeChange('today')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
              activeTimeframe === 'today'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>আজকে ({stats.today.visits})</span>
          </button>

          <button
            onClick={() => onTimeframeChange('this_week')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
              activeTimeframe === 'this_week'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>এই সপ্তাহে ({stats.thisWeek.visits})</span>
          </button>

          <button
            onClick={() => onTimeframeChange('this_month')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
              activeTimeframe === 'this_month'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>এই মাসে ({stats.thisMonth.visits})</span>
          </button>

          <button
            onClick={() => onTimeframeChange('this_year')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
              activeTimeframe === 'this_year'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>এই বছরে ({stats.thisYear.visits})</span>
          </button>

          <button
            onClick={() => onTimeframeChange('all')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
              activeTimeframe === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>সর্বমোট ({stats.allTime.visits})</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={handleClearDemoData}
            disabled={isClearing}
            className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
            title="ডেমো ও নমুনা ভিজিটর ডাটা মুছে ফেলুন"
          >
            <Trash2 className={`w-3.5 h-3.5 ${isClearing ? 'animate-spin' : ''}`} />
            <span>{isClearing ? 'মুছে ফেলা হচ্ছে...' : 'ডেমো ডাটা মুছুন'}</span>
          </button>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              title="রিফ্রেশ করুন"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleExportCsv}
            className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV ডাউনলোড</span>
          </button>
        </div>
      </div>

      {/* 3. TREND GRAPH & BREAKDOWN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Bar Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>{trendData.title}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                নির্বাচিত সময়কালের প্রতিটি সময় ও দিনের ভিজিটর ট্রাফিকের তুলনা
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs font-extrabold px-3 py-1 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
                {currentPeriodStat.label}
              </span>
            </div>
          </div>

          {/* Custom Responsive CSS Bar Visualization */}
          <div className="pt-4 pb-2">
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1.5 items-end h-44 border-b border-slate-200 pb-2">
              {trendData.points.map((p, idx) => {
                const heightPercent = Math.max(8, Math.round((p.visits / maxTrendVisits) * 100));
                return (
                  <div key={p.key || idx} className="flex flex-col items-center justify-end h-full group relative">
                    {/* Tooltip on Hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-slate-900 text-white text-[10px] rounded-lg px-2 py-1 shadow-md whitespace-nowrap z-20 pointer-events-none text-center">
                      <div className="font-bold">{p.label}</div>
                      <div>ভিজিট: {p.visits}</div>
                      <div className="text-blue-300">ইউনিক: {p.uniqueVisitors}</div>
                    </div>

                    {/* Bar */}
                    <div className="w-full max-w-[28px] bg-slate-100 rounded-t-lg overflow-hidden flex flex-col justify-end h-full">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-lg transition-all duration-300 ${
                          p.visits > 0
                            ? 'bg-gradient-to-t from-blue-600 to-indigo-500 group-hover:from-blue-500 group-hover:to-indigo-400 shadow-xs'
                            : 'bg-slate-200'
                        }`}
                      ></div>
                    </div>

                    {/* X-axis Label */}
                    <span className="text-[9px] text-slate-500 font-mono mt-1 truncate max-w-full text-center group-hover:text-blue-600 font-bold">
                      {p.label.length > 5 ? p.label.substring(0, 4) : p.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Stat Highlights */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
              <span className="text-[11px] text-slate-500 font-medium">নির্বাচিত ভিজিট</span>
              <div className="text-lg font-black text-slate-900 mt-0.5">
                {currentPeriodStat.stat.visits.toLocaleString('bn-BD')}
              </div>
            </div>
            <div className="bg-blue-50/60 p-3 rounded-2xl border border-blue-100 text-center">
              <span className="text-[11px] text-blue-700 font-medium">ইউনিক ভিজিটর</span>
              <div className="text-lg font-black text-blue-950 mt-0.5">
                {currentPeriodStat.stat.uniqueVisitors.toLocaleString('bn-BD')}
              </div>
            </div>
            <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100 text-center">
              <span className="text-[11px] text-emerald-700 font-medium">পেজ ভিউজ</span>
              <div className="text-lg font-black text-emerald-950 mt-0.5">
                {currentPeriodStat.stat.pageviews.toLocaleString('bn-BD')}
              </div>
            </div>
          </div>
        </div>

        {/* Device & Traffic Sources Breakdown (1 col) */}
        <div className="space-y-6">
          {/* Device Split */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-purple-600" />
              <span>ডিভাইস বিশ্লেষণ (Device Share)</span>
            </h4>

            {(() => {
              const totalDev = stats.deviceBreakdown.phone + stats.deviceBreakdown.desktop + stats.deviceBreakdown.tablet || 1;
              const phonePct = Math.round((stats.deviceBreakdown.phone / totalDev) * 100);
              const deskPct = Math.round((stats.deviceBreakdown.desktop / totalDev) * 100);
              const tabPct = 100 - phonePct - deskPct;

              return (
                <div className="space-y-3">
                  {/* Progress bar */}
                  <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                    <div style={{ width: `${phonePct}%` }} className="bg-purple-600 h-full" title={`মোবাইল: ${phonePct}%`} />
                    <div style={{ width: `${deskPct}%` }} className="bg-blue-600 h-full" title={`ডেস্কটপ: ${deskPct}%`} />
                    <div style={{ width: `${tabPct}%` }} className="bg-amber-500 h-full" title={`ট্যাবলেট: ${tabPct}%`} />
                  </div>

                  {/* Device Legend */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                        <span>স্মার্টফোন (Mobile)</span>
                      </span>
                      <span className="font-bold text-slate-900 font-mono">
                        {stats.deviceBreakdown.phone} ({phonePct}%)
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <Monitor className="w-3.5 h-3.5 text-blue-600" />
                        <span>কম্পিউটার (Desktop)</span>
                      </span>
                      <span className="font-bold text-slate-900 font-mono">
                        {stats.deviceBreakdown.desktop} ({deskPct}%)
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <Tablet className="w-3.5 h-3.5 text-amber-500" />
                        <span>ট্যাবলেট (Tablet)</span>
                      </span>
                      <span className="font-bold text-slate-900 font-mono">
                        {stats.deviceBreakdown.tablet} ({tabPct}%)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Top Sources */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-3">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>ট্রাফিক সোর্স (Traffic Channels)</span>
            </h4>

            <div className="space-y-2">
              {stats.topSources.slice(0, 4).map((src) => (
                <div key={src.name} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                  <span className="flex items-center gap-1.5 text-slate-700 truncate max-w-[170px]">
                    <span>{src.icon}</span>
                    <span className="truncate">{src.name}</span>
                  </span>
                  <span className="font-bold text-slate-900 font-mono">{src.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. TOP VISITED PAGES & LOCATIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-600" />
              <span>জনপ্রিয় শীর্ষ পেজসমূহ (Top Visited Pages)</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase">ভিউস ও ভিজিটর</span>
          </div>

          <div className="space-y-2.5">
            {stats.topPages.map((page, idx) => (
              <div
                key={page.path}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-indigo-50/50 hover:border-indigo-100 transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="truncate">
                    <div className="text-xs font-bold text-slate-800 truncate">{page.title}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">{page.path}</div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-extrabold text-indigo-600 font-mono">{page.views} ভিউ</div>
                  <div className="text-[10px] text-slate-500 font-mono">{page.uniqueVisitors} জন</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Visitor Locations */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>শীর্ষ এলাকা ও শহর (Visitor Locations)</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase">শতাংশ</span>
          </div>

          <div className="space-y-2.5">
            {stats.topLocations.map((loc, idx) => (
              <div
                key={loc.location}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-emerald-50/50 hover:border-emerald-100 transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-800 truncate">{loc.location}</span>
                </div>

                <div className="text-right shrink-0 flex items-center gap-2">
                  <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div style={{ width: `${loc.percent}%` }} className="bg-emerald-600 h-full rounded-full" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-900 font-mono w-9 text-right">{loc.percent}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. DETAILED VISITOR JOURNEY & LOG TABLE FOR SELECTED TIMEFRAME */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>{currentPeriodStat.label} - বিস্তারিত লগ ও নেভিগেশন পাথ ({filteredList.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ভিজিটরদের ব্রাউজিং হিস্ট্রি, ভিজিট করা পেজের তালিকা ও চ্যাট অ্যাক্টিভিটি
            </p>
          </div>

          {/* Search & Chat Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="নাম, ফোন, আইপি বা পেজ খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <button
              onClick={() => setChatOnlyFilter(!chatOnlyFilter)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                chatOnlyFilter
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>শুধু চ্যাট ({filteredList.filter((l) => l.chatInitiated).length})</span>
            </button>
          </div>
        </div>

        {/* Visitor Cards List */}
        {filteredList.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-slate-200 rounded-3xl space-y-2">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">কোনো ভিজিটর ডেটা পাওয়া যায়নি</p>
            <p className="text-[11px] text-slate-400">
              এই সময়কালের ফিল্টার পরিবর্তন করে দেখতে পারেন।
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredList.map((visitor) => {
              const history = visitor.pathHistory && visitor.pathHistory.length > 0
                ? visitor.pathHistory
                : [
                    {
                      id: 'step_1',
                      path: visitor.landingPage || visitor.currentPage || '/',
                      title: 'হোমপোর্টাল',
                      timestamp: new Date(visitor.visitedAt).getTime(),
                      timeSpent: visitor.timeSpent || '১ মিনিট',
                      isChatEntry: visitor.chatInitiated,
                    },
                  ];

              return (
                <div
                  key={visitor.id}
                  className="bg-slate-50/70 rounded-3xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-md hover:bg-white transition-all flex flex-col justify-between space-y-4"
                >
                  {/* Top Visitor Meta */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-slate-900 text-sm">{visitor.name}</h4>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full border ${
                              visitor.chatInitiated
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {visitor.chatInitiated ? '💬 চ্যাটে যুক্ত হয়েছিল' : '🟢 ওয়েব ব্রাউজিং'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap font-mono text-[10px] mt-1 text-slate-500">
                          {visitor.phone && (
                            <button
                              onClick={() => handleCopyPhone(visitor.phone!, visitor.id)}
                              className="px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md font-bold flex items-center gap-1 transition"
                            >
                              <Phone className="w-2.5 h-2.5" />
                              <span>{visitor.phone}</span>
                              {copiedPhoneId === visitor.id && <span className="text-emerald-600">✓</span>}
                            </button>
                          )}
                          <span className="px-1.5 py-0.5 bg-slate-200/60 rounded text-slate-700">
                            IP: {visitor.ip}
                          </span>
                          <span className="flex items-center gap-1 text-slate-600">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{visitor.location}</span>
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono text-[10px] text-slate-400 shrink-0">
                        {new Date(visitor.visitedAt).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {/* Navigation Path Timeline */}
                  <div className="bg-white rounded-2xl p-3 border border-slate-200/70 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                      <span className="flex items-center gap-1">
                        <Compass className="w-3.5 h-3.5 text-blue-600" />
                        <span>ভিজিটের পেজ জার্নি ({history.length}টি পেজ)</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">সময়: {visitor.timeSpent}</span>
                    </div>

                    <div className="space-y-1.5">
                      {history.map((step, sIdx) => (
                        <div
                          key={step.id || sIdx}
                          className={`flex items-center justify-between text-xs p-2 rounded-xl border transition-all ${
                            step.isChatEntry
                              ? 'bg-indigo-50/80 border-indigo-200 text-indigo-950 font-bold'
                              : sIdx === history.length - 1
                              ? 'bg-blue-50/50 border-blue-100 text-slate-900 font-semibold'
                              : 'bg-slate-50 border-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[9px] font-mono flex items-center justify-center shrink-0">
                              {sIdx + 1}
                            </span>
                            <span className="truncate">{step.title}</span>
                            {step.isChatEntry && (
                              <span className="px-1.5 py-0.2 bg-indigo-600 text-white rounded text-[9px] font-bold">
                                চ্যাট শুরু
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                            {step.timeSpent || '১ মিনিট'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Meta & Device info */}
                  <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500">
                    <div className="flex items-center gap-1.5 truncate">
                      <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{visitor.device}</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      সোর্স: {visitor.referrer}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
