export type UserRole = 'customer' | 'agent' | 'system' | 'bot';

export type ChatStatus = 'unassigned' | 'active' | 'waiting' | 'resolved' | 'closed';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type SupportProblemIssue =
  | 'withdraw_problem'
  | 'deposit_problem'
  | 'password_forget'
  | 'username_forget'
  | 'email_forget'
  | 'affiliate_problem'
  | 'general_support';

export const SUPPORT_PROBLEM_OPTIONS: { value: SupportProblemIssue; label: string; icon: string; bangla: string }[] = [
  { value: 'withdraw_problem', label: 'Withdraw problem', bangla: 'উইথড্র সমস্যা (Withdraw Problem)', icon: '💸' },
  { value: 'deposit_problem', label: 'Dipojit problem', bangla: 'ডিপোজিট সমস্যা (Deposit Problem)', icon: '💳' },
  { value: 'password_forget', label: 'Password forget', bangla: 'পাসওয়ার্ড ভুলে গেছি (Password Forget)', icon: '🔑' },
  { value: 'username_forget', label: 'User name forget', bangla: 'ইউজারনেম ভুলে গেছি (Username Forget)', icon: '👤' },
  { value: 'email_forget', label: 'Email address forget', bangla: 'ইমেইল এড্রেস ভুলে গেছি (Email Address Forget)', icon: '📧' },
  { value: 'affiliate_problem', label: 'Affiliate problem', bangla: 'অ্যাফিলিয়েট সমস্যা (Affiliate Problem)', icon: '🤝' },
  { value: 'general_support', label: 'General Support', bangla: 'অন্যান্য / সাধারণ সহায়তা', icon: '💬' },
];

export interface ChatMessage {
  id: string;
  chatId: string;
  senderRole: UserRole;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  isInternalNote?: boolean;
  attachments?: {
    name: string;
    url: string;
    type: 'image' | 'file';
    size?: string;
  }[];
  quickReplies?: string[];
  readStatus?: 'sent' | 'delivered' | 'read';
  seenAt?: string;
  seenBy?: string;
  createdAt?: string;
}

export interface CustomerInfo {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  location?: string;
  ipAddress?: string;
  browser?: string;
  os?: string;
  currentPageUrl?: string;
  timeOnSite?: string;
  visitsCount?: number;
  tags?: string[];
  notes?: string;
  customData?: Record<string, string>;
  pathHistory?: VisitorPageVisit[];
  chatInitiatedPage?: string;
}

export interface ChatSession {
  id: string;
  customerId: string;
  customer: CustomerInfo;
  assignedAgentId?: string;
  assignedAgentName?: string;
  assignedAgentAvatar?: string;
  department: string;
  status: ChatStatus;
  priority: Priority;
  subject?: string;
  problemIssue?: SupportProblemIssue | string;
  adminSeen?: boolean;
  adminSeenAt?: string;
  adminSeenBy?: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCountCustomer: number;
  unreadCountAgent: number;
  isStarred?: boolean;
  satisfactionRating?: number; // 1 to 5
  satisfactionFeedback?: string;
  isBlocked?: boolean;
}

export interface BlockedUser {
  id: string;
  chatId?: string;
  phone?: string;
  ipAddress?: string;
  customerName?: string;
  reason?: string;
  blockedAt: string;
}

export interface AdminUser {
  id: string;
  username: string;
  password: string;
  name: string;
  role: 'Super Admin' | 'Admin' | 'Agent';
  email?: string;
  department?: string;
  avatar?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  role: 'Agent' | 'Lead' | 'Admin' | string;
  avatar: string;
  status: 'online' | 'away' | 'offline';
  department: string;
  activeChatsCount: number;
}

export interface CannedResponse {
  id: string;
  shortcut: string; // e.g. "/pricing"
  title: string;
  content: string;
  category: string;
}

export interface VisitorPageVisit {
  id?: string;
  path: string;
  title: string;
  timestamp: number;
  timeSpent?: string;
  isChatEntry?: boolean;
}

export interface VisitorLogEntry {
  id: string;
  visitorId: string;
  name: string;
  phone?: string;
  email?: string;
  ip: string;
  location: string;
  device: string;
  deviceType: 'phone' | 'desktop' | 'tablet';
  referrer: string;
  landingPage: string;
  currentPage: string;
  visitedAt: string; // ISO String
  date: string; // YYYY-MM-DD
  week: string; // YYYY-Wxx
  month: string; // YYYY-MM
  year: string; // YYYY
  timeSpent?: string;
  pageviewsCount: number;
  pathHistory?: VisitorPageVisit[];
  chatInitiated?: boolean;
  chatInitiatedPage?: string;
}

export interface VisitorTimeframeStat {
  visits: number;
  uniqueVisitors: number;
  pageviews: number;
  chatInitiatedCount: number;
  growthPercent?: number;
}

export interface VisitorTrendPoint {
  key: string;
  label: string;
  visits: number;
  uniqueVisitors: number;
  pageviews?: number;
}

export interface VisitorStatsSummary {
  today: VisitorTimeframeStat;
  thisWeek: VisitorTimeframeStat;
  thisMonth: VisitorTimeframeStat;
  thisYear: VisitorTimeframeStat;
  allTime: VisitorTimeframeStat;
  hourlyTrendToday: VisitorTrendPoint[];
  dailyTrendThisWeek: VisitorTrendPoint[];
  weeklyTrendThisMonth: VisitorTrendPoint[];
  monthlyTrendThisYear: VisitorTrendPoint[];
  topPages: { path: string; title: string; views: number; uniqueVisitors: number }[];
  deviceBreakdown: { phone: number; desktop: number; tablet: number };
  topLocations: { location: string; count: number; percent: number }[];
  topSources: { name: string; icon: string; count: number; percent: number }[];
  lastUpdated: string;
}

export type VisitorTimeframeFilter = 'live' | 'today' | 'this_week' | 'this_month' | 'this_year' | 'all';


export interface LiveVisitor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  location: string;
  currentPage: string;
  timeOnPage: string;
  device: string;
  deviceType?: 'phone' | 'desktop' | 'tablet';
  ip: string;
  referrer: string;
  status: 'browsing' | 'in_chat' | 'invited';
  visitedAt?: string;
  pathHistory?: VisitorPageVisit[];
  chatInitiatedPage?: string;
  chatInitiatedAt?: string;
}

export interface DeviceNotification {
  id: string;
  targetType: 'all' | 'specific_visitor' | 'specific_chat';
  targetVisitorId?: string;
  targetChatId?: string;
  title: string;
  body: string;
  icon?: string;
  actionUrl?: string;
  actionType?: 'open_chat' | 'open_url' | 'none';
  soundEnabled?: boolean;
  priority?: 'normal' | 'high' | 'urgent';
  createdAt: string;
  senderName?: string;
}

export interface PromoBanner {
  id?: string;
  enabled: boolean;
  title: string;
  description?: string;
  imageUrl: string;
  linkUrl: string;
  buttonText?: string;
  createdAt?: string;
}

export interface NoticeHeaderConfig {
  enabled: boolean;
  text: string;
  speed?: 'slow' | 'medium' | 'fast';
  theme?: 'amber' | 'blue' | 'red' | 'emerald' | 'purple' | 'slate' | 'gradient';
  icon?: 'megaphone' | 'bell' | 'alert' | 'sparkle' | 'info';
  linkUrl?: string;
  linkText?: string;
  updatedAt?: string;
}

export interface TelegramBotConfig {
  id: string;
  name: string;
  botToken: string;
  chatId: string;
  enabled: boolean;
  createdAt?: string;
}

export interface WidgetConfig {
  primaryColor: string;
  headerTitle: string;
  welcomeMessage: string;
  botName: string;
  botAvatar: string;
  position: 'bottom-right' | 'bottom-left';
  requirePreChatForm: boolean;
  enableAiAutoReply: boolean;
  aiSystemPrompt: string;
  departments: string[];
  appsScriptUrl?: string;
  websiteUrl?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  telegramBots?: TelegramBotConfig[];
  telegramNotificationsEnabled?: boolean;
  noticeHeader?: NoticeHeaderConfig;
  promoBanner?: PromoBanner;
  promoBanners?: PromoBanner[];
}
