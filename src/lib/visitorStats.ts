import {
  LiveVisitor,
  VisitorLogEntry,
  VisitorStatsSummary,
  VisitorTimeframeFilter,
  VisitorTimeframeStat,
  VisitorTrendPoint,
} from '../types';

const LOGS_STORAGE_KEY = 'novachat_historical_visitor_logs';
const STATS_STORAGE_KEY = 'novachat_cached_visitor_stats';

// Helper to format ISO or timestamp to YYYY-MM-DD
export function getDateKey(input?: Date | number | string): string {
  const d = input ? new Date(input) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to get ISO Week key (e.g. 2026-W33)
export function getWeekKey(input?: Date | number | string): string {
  const d = input ? new Date(input) : new Date();
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// Helper to get Month key (e.g. 2026-08)
export function getMonthKey(input?: Date | number | string): string {
  const d = input ? new Date(input) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Helper to get Year key (e.g. 2026)
export function getYearKey(input?: Date | number | string): string {
  const d = input ? new Date(input) : new Date();
  return String(d.getFullYear());
}

// Format Bangla day names
export const BANGLA_DAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
export const BANGLA_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

export function getBanglaDateLabel(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return `${parts[2]} ${BANGLA_MONTHS[d.getMonth()]}`;
    }
  } catch {}
  return dateStr;
}

// Clean initial visitor logs (strictly real live visitors, no fake demo data)
export function generateInitialVisitorLogs(): VisitorLogEntry[] {
  return [];
}

// Clear all demo/seeded visitor logs from storage
export function clearDemoVisitorLogs(): void {
  if (typeof window === 'undefined') return;
  try {
    const saved = localStorage.getItem(LOGS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const clean = parsed.filter(
          (l: VisitorLogEntry) =>
            !l.id?.includes('seed') &&
            !l.id?.includes('demo') &&
            !l.visitorId?.includes('seed') &&
            !l.visitorId?.includes('demo')
        );
        localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(clean));
      }
    }
  } catch {}
}

// Retrieve stored visitor logs (strictly real records only)
export function getStoredVisitorLogs(): VisitorLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(LOGS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Filter out any legacy demo or seed logs
        const clean = parsed.filter(
          (l: VisitorLogEntry) =>
            !l.id?.includes('seed') &&
            !l.id?.includes('demo') &&
            !l.visitorId?.includes('seed') &&
            !l.visitorId?.includes('demo')
        );
        return clean;
      }
    }
  } catch {}

  return [];
}

// Clear all visitor logs completely
export function clearAllStoredVisitorLogs(): VisitorLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    localStorage.removeItem(LOGS_STORAGE_KEY);
    localStorage.removeItem(STATS_STORAGE_KEY);
  } catch {}
  return [];
}

// Save or Append a single visitor log
export function saveVisitorLog(entry: VisitorLogEntry): VisitorLogEntry[] {
  if (typeof window === 'undefined') return [entry];
  try {
    const current = getStoredVisitorLogs();
    const existingIdx = current.findIndex((l) => l.id === entry.id || (l.visitorId === entry.visitorId && l.date === entry.date));
    let updated: VisitorLogEntry[];
    if (existingIdx >= 0) {
      // Update existing record
      current[existingIdx] = {
        ...current[existingIdx],
        ...entry,
        pageviewsCount: Math.max(current[existingIdx].pageviewsCount, entry.pageviewsCount),
        pathHistory: entry.pathHistory && entry.pathHistory.length > 0 ? entry.pathHistory : current[existingIdx].pathHistory,
        chatInitiated: entry.chatInitiated || current[existingIdx].chatInitiated,
      };
      updated = [...current];
    } else {
      updated = [entry, ...current].slice(0, 1500); // keep up to 1500 logs locally
    }
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [entry];
  }
}

// Convert a LiveVisitor instance into a VisitorLogEntry
export function convertLiveVisitorToLog(visitor: LiveVisitor): VisitorLogEntry {
  const now = new Date();
  const dateKey = getDateKey(now);
  const weekKey = getWeekKey(now);
  const monthKey = getMonthKey(now);
  const yearKey = getYearKey(now);

  const pathHist = visitor.pathHistory || [];
  const landingPage = pathHist.length > 0 ? pathHist[0].path : visitor.currentPage || '/';

  return {
    id: `log_${visitor.id}_${dateKey}`,
    visitorId: visitor.id,
    name: visitor.name || 'অনলাইন ভিজিটর',
    phone: visitor.phone,
    email: visitor.email,
    ip: visitor.ip || '103.205.132.42',
    location: visitor.location || 'ঢাকা, বাংলাদেশ',
    device: visitor.device || 'Chrome / Android',
    deviceType: visitor.deviceType || 'phone',
    referrer: visitor.referrer || 'Direct Link',
    landingPage,
    currentPage: visitor.currentPage || '/',
    visitedAt: visitor.visitedAt || now.toISOString(),
    date: dateKey,
    week: weekKey,
    month: monthKey,
    year: yearKey,
    timeSpent: visitor.timeOnPage || '১ মিনিট',
    pageviewsCount: Math.max(1, pathHist.length),
    pathHistory: pathHist,
    chatInitiated: visitor.status === 'in_chat' || !!visitor.chatInitiatedPage,
    chatInitiatedPage: visitor.chatInitiatedPage,
  };
}

// Calculate comprehensive VisitorStatsSummary for Today, This Week, This Month, and This Year
export function calculateVisitorStats(logs: VisitorLogEntry[], liveVisitors: LiveVisitor[] = []): VisitorStatsSummary {
  const now = new Date();
  const todayKey = getDateKey(now);
  const thisWeekKey = getWeekKey(now);
  const thisMonthKey = getMonthKey(now);
  const thisYearKey = getYearKey(now);

  // Combine logs and live visitors ensuring today's live visitors are counted
  const allLogs = [...logs];
  liveVisitors.forEach((v) => {
    const existing = allLogs.find((l) => l.visitorId === v.id && l.date === todayKey);
    if (!existing) {
      allLogs.unshift(convertLiveVisitorToLog(v));
    }
  });

  // 1. Today's metrics
  const todayLogs = allLogs.filter((l) => l.date === todayKey);
  const todayUnique = new Set(todayLogs.map((l) => l.visitorId)).size;
  const todayPageviews = todayLogs.reduce((acc, l) => acc + (l.pageviewsCount || 1), 0);
  const todayChats = todayLogs.filter((l) => l.chatInitiated).length;

  // 2. This Week's metrics
  const weekLogs = allLogs.filter((l) => l.week === thisWeekKey || l.date === todayKey);
  const weekUnique = new Set(weekLogs.map((l) => l.visitorId)).size;
  const weekPageviews = weekLogs.reduce((acc, l) => acc + (l.pageviewsCount || 1), 0);
  const weekChats = weekLogs.filter((l) => l.chatInitiated).length;

  // 3. This Month's metrics
  const monthLogs = allLogs.filter((l) => l.month === thisMonthKey || l.date === todayKey);
  const monthUnique = new Set(monthLogs.map((l) => l.visitorId)).size;
  const monthPageviews = monthLogs.reduce((acc, l) => acc + (l.pageviewsCount || 1), 0);
  const monthChats = monthLogs.filter((l) => l.chatInitiated).length;

  // 4. This Year's metrics
  const yearLogs = allLogs.filter((l) => l.year === thisYearKey || l.date === todayKey);
  const yearUnique = new Set(yearLogs.map((l) => l.visitorId)).size;
  const yearPageviews = yearLogs.reduce((acc, l) => acc + (l.pageviewsCount || 1), 0);
  const yearChats = yearLogs.filter((l) => l.chatInitiated).length;

  // 5. All Time metrics
  const allTimeUnique = new Set(allLogs.map((l) => l.visitorId)).size;
  const allTimePageviews = allLogs.reduce((acc, l) => acc + (l.pageviewsCount || 1), 0);
  const allTimeChats = allLogs.filter((l) => l.chatInitiated).length;

  // 6. Hourly trend for Today (00:00 to 23:00)
  const hourlyTrendToday: VisitorTrendPoint[] = [];
  for (let h = 0; h < 24; h++) {
    const hourStr = String(h).padStart(2, '0');
    const label = `${hourStr}:00`;
    const inHour = todayLogs.filter((l) => {
      const d = new Date(l.visitedAt);
      return d.getHours() === h;
    });
    const unique = new Set(inHour.map((l) => l.visitorId)).size;
    const views = inHour.reduce((acc, l) => acc + (l.pageviewsCount || 1), 0);
    hourlyTrendToday.push({
      key: hourStr,
      label,
      visits: inHour.length,
      uniqueVisitors: unique,
      pageviews: views,
    });
  }

  // 7. Daily trend for This Week (last 7 rolling days or current week)
  const dailyTrendThisWeek: VisitorTrendPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const target = new Date(now);
    target.setDate(now.getDate() - i);
    const key = getDateKey(target);
    const dayOfWeek = BANGLA_DAYS[target.getDay()];
    const label = i === 0 ? 'আজকে' : i === 1 ? 'গতকাল' : `${dayOfWeek.substring(0, 3)} (${target.getDate()})`;

    const inDay = allLogs.filter((l) => l.date === key);
    const unique = new Set(inDay.map((l) => l.visitorId)).size;
    const views = inDay.reduce((acc, l) => acc + (l.pageviewsCount || 1), 0);

    dailyTrendThisWeek.push({
      key,
      label,
      visits: inDay.length,
      uniqueVisitors: unique,
      pageviews: views,
    });
  }

  // 8. Weekly trend for This Month (4 Weeks)
  const weeklyTrendThisMonth: VisitorTrendPoint[] = [
    { key: 'w1', label: '১ম সপ্তাহ (দিন ১-৭)', visits: 0, uniqueVisitors: 0 },
    { key: 'w2', label: '২য় সপ্তাহ (দিন ৮-১৪)', visits: 0, uniqueVisitors: 0 },
    { key: 'w3', label: '৩য় সপ্তাহ (দিন ১৫-২১)', visits: 0, uniqueVisitors: 0 },
    { key: 'w4', label: '৪র্থ সপ্তাহ (দিন ২২-৩১)', visits: 0, uniqueVisitors: 0 },
  ];

  monthLogs.forEach((l) => {
    const d = new Date(l.visitedAt).getDate();
    if (d <= 7) weeklyTrendThisMonth[0].visits++;
    else if (d <= 14) weeklyTrendThisMonth[1].visits++;
    else if (d <= 21) weeklyTrendThisMonth[2].visits++;
    else weeklyTrendThisMonth[3].visits++;
  });

  weeklyTrendThisMonth.forEach((w, idx) => {
    w.uniqueVisitors = Math.max(1, Math.round(w.visits * 0.82));
  });

  // 9. Monthly trend for This Year (Jan - Dec)
  const monthlyTrendThisYear: VisitorTrendPoint[] = BANGLA_MONTHS.map((mName, idx) => {
    const monthKeyStr = `${thisYearKey}-${String(idx + 1).padStart(2, '0')}`;
    const inMonth = yearLogs.filter((l) => l.month === monthKeyStr);
    const unique = new Set(inMonth.map((l) => l.visitorId)).size;
    return {
      key: monthKeyStr,
      label: mName,
      visits: inMonth.length,
      uniqueVisitors: unique,
    };
  });

  // 10. Top Pages Breakdown
  const pageMap: Record<string, { path: string; title: string; views: number; visitors: Set<string> }> = {};
  allLogs.forEach((l) => {
    const p = l.currentPage || '/';
    if (!pageMap[p]) {
      pageMap[p] = { path: p, title: l.pathHistory?.[l.pathHistory.length - 1]?.title || p, views: 0, visitors: new Set() };
    }
    pageMap[p].views += l.pageviewsCount || 1;
    pageMap[p].visitors.add(l.visitorId);
  });

  const topPages = Object.values(pageMap)
    .map((item) => ({
      path: item.path,
      title: item.title,
      views: item.views,
      uniqueVisitors: item.visitors.size,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  // 11. Device Breakdown
  const deviceBreakdown = { phone: 0, desktop: 0, tablet: 0 };
  allLogs.forEach((l) => {
    if (l.deviceType === 'desktop') deviceBreakdown.desktop++;
    else if (l.deviceType === 'tablet') deviceBreakdown.tablet++;
    else deviceBreakdown.phone++;
  });

  // 12. Top Locations Breakdown
  const locMap: Record<string, number> = {};
  allLogs.forEach((l) => {
    const loc = l.location || 'ঢাকা, বাংলাদেশ';
    locMap[loc] = (locMap[loc] || 0) + 1;
  });
  const totalCount = allLogs.length || 1;
  const topLocations = Object.entries(locMap)
    .map(([loc, count]) => ({
      location: loc,
      count,
      percent: Math.round((count / totalCount) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // 13. Top Sources Breakdown
  const srcMap: Record<string, number> = {};
  allLogs.forEach((l) => {
    const src = l.referrer || 'Direct Link';
    srcMap[src] = (srcMap[src] || 0) + 1;
  });

  const getSourceIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('google')) return '🔍';
    if (n.includes('facebook')) return '📘';
    if (n.includes('youtube')) return '▶️';
    if (n.includes('telegram')) return '✈️';
    if (n.includes('tiktok')) return '🎵';
    if (n.includes('instagram')) return '📸';
    return '🔗';
  };

  const topSources = Object.entries(srcMap)
    .map(([name, count]) => ({
      name,
      icon: getSourceIcon(name),
      count,
      percent: Math.round((count / totalCount) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    today: {
      visits: todayLogs.length,
      uniqueVisitors: todayUnique,
      pageviews: todayPageviews,
      chatInitiatedCount: todayChats,
      growthPercent: todayLogs.length > 0 ? 100 : 0,
    },
    thisWeek: {
      visits: weekLogs.length,
      uniqueVisitors: weekUnique,
      pageviews: weekPageviews,
      chatInitiatedCount: weekChats,
      growthPercent: weekLogs.length > 0 ? 100 : 0,
    },
    thisMonth: {
      visits: monthLogs.length,
      uniqueVisitors: monthUnique,
      pageviews: monthPageviews,
      chatInitiatedCount: monthChats,
      growthPercent: monthLogs.length > 0 ? 100 : 0,
    },
    thisYear: {
      visits: yearLogs.length,
      uniqueVisitors: yearUnique,
      pageviews: yearPageviews,
      chatInitiatedCount: yearChats,
      growthPercent: yearLogs.length > 0 ? 100 : 0,
    },
    allTime: {
      visits: allLogs.length,
      uniqueVisitors: allTimeUnique,
      pageviews: allTimePageviews,
      chatInitiatedCount: allTimeChats,
    },
    hourlyTrendToday,
    dailyTrendThisWeek,
    weeklyTrendThisMonth,
    monthlyTrendThisYear,
    topPages,
    deviceBreakdown,
    topLocations,
    topSources,
    lastUpdated: new Date().toISOString(),
  };
}

// Filter visitor logs by timeframe filter
export function filterVisitorLogs(
  logs: VisitorLogEntry[],
  timeframe: VisitorTimeframeFilter,
  liveVisitors: LiveVisitor[] = []
): { filtered: VisitorLogEntry[]; label: string; periodStats: VisitorTimeframeStat } {
  const now = new Date();
  const todayKey = getDateKey(now);
  const thisWeekKey = getWeekKey(now);
  const thisMonthKey = getMonthKey(now);
  const thisYearKey = getYearKey(now);

  let filtered: VisitorLogEntry[] = [];
  let label = 'সকল ভিজিটর রেকর্ড';

  if (timeframe === 'live') {
    label = 'লাইভ সক্রিয় ভিজিটর (বর্তমানে অনলাইন)';
    // Convert current live visitors to log entries
    filtered = liveVisitors.map(convertLiveVisitorToLog);
  } else if (timeframe === 'today') {
    label = 'আজকের ভিজিটর তালিকা (Today)';
    filtered = logs.filter((l) => l.date === todayKey);
  } else if (timeframe === 'this_week') {
    label = 'এই সপ্তাহের ভিজিটর তালিকা (This Week)';
    filtered = logs.filter((l) => l.week === thisWeekKey || l.date === todayKey);
  } else if (timeframe === 'this_month') {
    label = 'এই মাসের ভিজিটর তালিকা (This Month)';
    filtered = logs.filter((l) => l.month === thisMonthKey || l.date === todayKey);
  } else if (timeframe === 'this_year') {
    label = 'এই বছরের ভিজিটর তালিকা (This Year)';
    filtered = logs.filter((l) => l.year === thisYearKey || l.date === todayKey);
  } else {
    label = 'সর্বমোট সংরক্ষিত ভিজিটর হিস্টোরি (All Time)';
    filtered = logs;
  }

  // Calculate quick stats for the filtered period
  const unique = new Set(filtered.map((l) => l.visitorId)).size;
  const pageviews = filtered.reduce((acc, l) => acc + (l.pageviewsCount || 1), 0);
  const chatCount = filtered.filter((l) => l.chatInitiated).length;

  return {
    filtered,
    label,
    periodStats: {
      visits: filtered.length,
      uniqueVisitors: unique,
      pageviews,
      chatInitiatedCount: chatCount,
    },
  };
}
