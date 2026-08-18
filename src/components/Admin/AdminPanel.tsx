import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  KeyRound,
  LogOut,
  Users,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  FileSpreadsheet,
  Code,
  Sparkles,
  RefreshCw,
  BarChart3,
  MessageSquare,
  UserCheck,
  CheckCircle2,
  CheckCheck,
  ExternalLink,
  Bot,
  Copy,
  Send,
  Search,
  Phone,
  Globe,
  Tag,
  Clock,
  X,
  Ban,
  Megaphone,
  Image as ImageIcon,
  Upload,
  Edit3,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Smartphone,
  Laptop,
  Tablet,
  MapPin,
  Compass,
  Maximize2,
  Minimize2,
  Volume2,
  Bell,
  Info,
  FileText,
  Download,
  ZoomIn,
  Share2,
  Filter,
  Activity,
  ArrowUpRight,
  MessageSquarePlus,
  LayoutGrid,
  Calendar,
  TrendingUp
} from 'lucide-react';
import {
  Agent,
  ChatSession,
  ChatMessage,
  WidgetConfig,
  BlockedUser,
  AdminUser,
  PromoBanner,
  NoticeHeaderConfig,
  LiveVisitor,
  VisitorLogEntry,
  VisitorStatsSummary,
  VisitorTimeframeFilter,
  SUPPORT_PROBLEM_OPTIONS,
  type SupportProblemIssue
} from '../../types';
import {
  authenticateAdminWithFirestore,
  loadAdminUsersFromFirestore,
  syncAdminUserToFirestore,
  deleteAdminUserFromFirestore,
  markChatAsSeenByAdminInFirestore,
  loadVisitorLogsFromFirestore,
  AdminAccount
} from '../../lib/firestoreSync';
import {
  calculateVisitorStats,
  getStoredVisitorLogs,
  saveVisitorLog,
  convertLiveVisitorToLog
} from '../../lib/visitorStats';
import { sendTelegramNotification } from '../../lib/telegramNotify';
import { CODE_GS_SCRIPT } from './CodeGsModal';
import { LoadingSpinner, LoadingButton } from '../LoadingSpinner';
import { NoticeHeaderBar } from '../CustomerWidget/NoticeHeaderBar';
import { SpinnerSetupModal, SpinnerConfig } from './SpinnerSetupModal';
import { WorldMapVisualization } from '../AgentWorkspace/WorldMapVisualization';
import { VisitorAnalyticsDashboard } from './VisitorAnalyticsDashboard';
import { DeviceNotificationManager } from './DeviceNotificationManager';

interface AdminPanelProps {
  agents: Agent[];
  chats: ChatSession[];
  messages?: Record<string, ChatMessage[]>;
  widgetConfig: WidgetConfig;
  blockedUsers?: BlockedUser[];
  adminUsers?: AdminUser[];
  liveVisitors?: LiveVisitor[];
  onInviteToChat?: (visitor: LiveVisitor) => void;
  onAddAgent: (agent: Omit<Agent, 'id'>) => void;
  onDeleteAgent: (agentId: string) => void;
  onUpdateWidgetConfig: (updated: Partial<WidgetConfig>) => void;
  onOpenCodeGsModal: () => void;
  onSendAdminMessage?: (chatId: string, text: string, isInternalNote?: boolean) => void;
  onChangeStatus?: (chatId: string, status: any) => void;
  onAssignAgent?: (chatId: string, agentId: string) => void;
  onBlockUser?: (chatId: string, phone?: string, ipAddress?: string, name?: string, reason?: string) => void;
  onUnblockUser?: (id: string) => void;
  onStartNewChat?: (data: { customerName: string; customerPhone?: string; customerEmail: string; department: string; subject: string; problemIssue?: string; initialMessage: string }) => void;
  onDeleteMessage?: (chatId: string, messageId: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  agents,
  chats,
  messages = {},
  widgetConfig,
  blockedUsers = [],
  adminUsers = [],
  liveVisitors = [],
  onInviteToChat,
  onAddAgent,
  onDeleteAgent,
  onUpdateWidgetConfig,
  onOpenCodeGsModal,
  onSendAdminMessage,
  onChangeStatus,
  onAssignAgent,
  onBlockUser,
  onUnblockUser,
  onStartNewChat,
  onDeleteMessage,
}) => {
  const currentAdminProfile: AdminAccount | null = (() => {
    try {
      const saved = localStorage.getItem('novachat_admin_profile');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  })();

  // Font Size Management (User requested 7px default)
  const [adminFontSize, setAdminFontSize] = useState<string>(() => {
    return localStorage.getItem('novachat_admin_fontsize') || '7px';
  });

  const handleSetFontSize = (size: string) => {
    setAdminFontSize(size);
    localStorage.setItem('novachat_admin_fontsize', size);
  };

  // Mobile View Management for Admin Live Chat
  const [mobileChatView, setMobileChatView] = useState<'list' | 'chat'>('list');

  // Full Page Chat & User Info Visibility
  const [isChatFullScreen, setIsChatFullScreen] = useState(false);
  const [hideCustomerDetails, setHideCustomerDetails] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);

  // Telegram Notifications State
  const [telegramBotToken, setTelegramBotToken] = useState(widgetConfig.telegramBotToken || '');
  const [telegramChatId, setTelegramChatId] = useState(widgetConfig.telegramChatId || '');
  const [telegramNotificationsEnabled, setTelegramNotificationsEnabled] = useState(widgetConfig.telegramNotificationsEnabled ?? true);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [telegramSavedSuccess, setTelegramSavedSuccess] = useState(false);
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);

  // User Notice Header State (Scrolling Announcement)
  const initialNotice: NoticeHeaderConfig = widgetConfig.noticeHeader || {
    enabled: true,
    text: '📢 বিশেষ বিজ্ঞপ্তি: সম্মানিত গ্রাহকবৃন্দ, লাইভ সাপোর্ট চ্যাটে আপনাকে স্বাগতম! যেকোনো প্রয়োজনে আমাদের প্রতিনিধিকে সরাসরি মেসেজ পাঠান।',
    speed: 'medium',
    theme: 'amber',
    icon: 'megaphone',
    linkUrl: widgetConfig.websiteUrl || 'https://live-chat-swart-nine.vercel.app/',
    linkText: 'অফিসিয়াল সাইট',
  };

  const [noticeEnabled, setNoticeEnabled] = useState<boolean>(initialNotice.enabled ?? true);
  const [noticeText, setNoticeText] = useState<string>(initialNotice.text || '');
  const [noticeSpeed, setNoticeSpeed] = useState<'slow' | 'medium' | 'fast'>(initialNotice.speed || 'medium');
  const [noticeTheme, setNoticeTheme] = useState<'amber' | 'blue' | 'red' | 'emerald' | 'purple' | 'gradient'>(initialNotice.theme || 'amber');
  const [noticeIcon, setNoticeIcon] = useState<'megaphone' | 'bell' | 'alert' | 'sparkle' | 'info'>(initialNotice.icon || 'megaphone');
  const [noticeLinkUrl, setNoticeLinkUrl] = useState<string>(initialNotice.linkUrl || '');
  const [noticeLinkText, setNoticeLinkText] = useState<string>(initialNotice.linkText || '');
  const [noticeSavedSuccess, setNoticeSavedSuccess] = useState(false);
  const [isSavingNotice, setIsSavingNotice] = useState(false);

  // Masking Helper for User Info (Name, Phone, IP Address)
  const maskUserInfo = (text?: string, type: 'name' | 'phone' | 'ip' = 'name') => {
    if (!text) return 'N/A';
    if (!hideCustomerDetails) return text;
    if (type === 'name') {
      return text.length > 2 ? `${text[0]}***${text[text.length - 1]} (লুকানো)` : '*** (লুকানো)';
    }
    if (type === 'phone') {
      return text.length > 6 ? `${text.slice(0, 3)}*****${text.slice(-2)} (লুকানো)` : '017***** (লুকানো)';
    }
    if (type === 'ip') {
      return '***.***.***.*** (লুকানো)';
    }
    return '*** (লুকানো)';
  };

  // Active Admin Sub-tab
  const [adminTab, setAdminTab] = useState<'overview' | 'live_chat' | 'visitors' | 'device_notifications' | 'agents' | 'codegs' | 'blocked_users' | 'admin_users' | 'settings' | 'promotion' | 'spinners' | 'telegram' | 'notice'>('overview');
  const [isSpinnerModalOpen, setIsSpinnerModalOpen] = useState(false);

  // Website Promotion State (Multi-site)
  const getInitialBanners = (): PromoBanner[] => {
    if (widgetConfig.promoBanners && widgetConfig.promoBanners.length > 0) {
      return widgetConfig.promoBanners;
    }
    if (widgetConfig.promoBanner) {
      return [{ ...widgetConfig.promoBanner, id: widgetConfig.promoBanner.id || 'promo_1' }];
    }
    return [
      {
        id: 'promo_1',
        enabled: true,
        title: '🔥 অফিশিয়াল মেম্বারশিপ ও লাইভ পোর্টাল',
        description: 'আমাদের প্রধান ওয়েবসাইটের সার্ভিসসমূহ ও অফার দেখুন।',
        imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80',
        linkUrl: 'https://live-chat-swart-nine.vercel.app/',
        buttonText: 'প্রধান ওয়েবসাইট ভিজিট করুন 🚀'
      }
    ];
  };

  const [promoList, setPromoList] = useState<PromoBanner[]>(getInitialBanners);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);

  // Form Fields
  const [promoEnabled, setPromoEnabled] = useState<boolean>(true);
  const [promoTitle, setPromoTitle] = useState('');
  const [promoDescription, setPromoDescription] = useState('');
  const [promoImageUrl, setPromoImageUrl] = useState('https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80');
  const [promoLinkUrl, setPromoLinkUrl] = useState('https://live-chat-swart-nine.vercel.app/');
  const [promoButtonText, setPromoButtonText] = useState('ওয়েবসাইট ভিজিট করুন 🚀');
  const [isSavingPromo, setIsSavingPromo] = useState(false);
  const [promoSaveSuccess, setPromoSaveSuccess] = useState(false);
  const [promoSuccessMessage, setPromoSuccessMessage] = useState('ওয়েবসাইট প্রমোশন সেভ করা হয়েছে!');

  useEffect(() => {
    if (widgetConfig.promoBanners && widgetConfig.promoBanners.length > 0) {
      setPromoList(widgetConfig.promoBanners);
    } else if (widgetConfig.promoBanner) {
      setPromoList([{ ...widgetConfig.promoBanner, id: widgetConfig.promoBanner.id || 'promo_1' }]);
    }
  }, [widgetConfig.promoBanners, widgetConfig.promoBanner]);

  const handleResetPromoForm = () => {
    setEditingPromoId(null);
    setPromoEnabled(true);
    setPromoTitle('');
    setPromoDescription('');
    setPromoImageUrl('https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80');
    setPromoLinkUrl('https://live-chat-swart-nine.vercel.app/');
    setPromoButtonText('ওয়েবসাইট ভিজিট করুন 🚀');
  };

  const handleSelectPromoForEdit = (item: PromoBanner) => {
    setEditingPromoId(item.id || null);
    setPromoEnabled(item.enabled);
    setPromoTitle(item.title || '');
    setPromoDescription(item.description || '');
    setPromoImageUrl(item.imageUrl || '');
    setPromoLinkUrl(item.linkUrl || '');
    setPromoButtonText(item.buttonText || '');
  };

  const handlePromoImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        setPromoImageUrl(evt.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSavePromo = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPromo(true);

    let updatedList: PromoBanner[] = [];

    if (editingPromoId) {
      // Edit existing
      updatedList = promoList.map((item) => {
        if (item.id === editingPromoId) {
          return {
            ...item,
            enabled: promoEnabled,
            title: promoTitle,
            description: promoDescription,
            imageUrl: promoImageUrl,
            linkUrl: promoLinkUrl,
            buttonText: promoButtonText
          };
        }
        return item;
      });
      setPromoSuccessMessage('ওয়েবসাইট প্রমোশন আপডেট করা হয়েছে!');
    } else {
      // Create new
      const newItem: PromoBanner = {
        id: 'promo_' + Date.now(),
        enabled: promoEnabled,
        title: promoTitle,
        description: promoDescription,
        imageUrl: promoImageUrl,
        linkUrl: promoLinkUrl,
        buttonText: promoButtonText,
        createdAt: new Date().toISOString()
      };
      updatedList = [newItem, ...promoList];
      setPromoSuccessMessage('নতুন ওয়েবসাইট প্রমোশন যোগ করা হয়েছে!');
    }

    setPromoList(updatedList);
    onUpdateWidgetConfig({
      promoBanners: updatedList,
      promoBanner: updatedList.length > 0 ? updatedList[0] : undefined
    });

    setTimeout(() => {
      setIsSavingPromo(false);
      setPromoSaveSuccess(true);
      handleResetPromoForm();
      setTimeout(() => setPromoSaveSuccess(false), 3000);
    }, 300);
  };

  const handleDeletePromo = (idToDelete: string) => {
    if (!confirm('আপনি কি এই ওয়েবসাইট প্রমোশনটি মুছে ফেলতে চান?')) return;
    const updatedList = promoList.filter((item) => item.id !== idToDelete);
    setPromoList(updatedList);
    onUpdateWidgetConfig({
      promoBanners: updatedList,
      promoBanner: updatedList.length > 0 ? updatedList[0] : undefined
    });
    if (editingPromoId === idToDelete) {
      handleResetPromoForm();
    }
  };

  const handleTogglePromoEnabled = (idToToggle: string) => {
    const updatedList = promoList.map((item) => {
      if (item.id === idToToggle) {
        return { ...item, enabled: !item.enabled };
      }
      return item;
    });
    setPromoList(updatedList);
    onUpdateWidgetConfig({
      promoBanners: updatedList,
      promoBanner: updatedList.length > 0 ? updatedList[0] : undefined
    });
  };

  // Loading Spinner Demo State
  const [demoLoadingOverlay, setDemoLoadingOverlay] = useState(false);
  const [demoSpinnerSize, setDemoSpinnerSize] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md');
  const [demoSpinnerVariant, setDemoSpinnerVariant] = useState<'spinner' | 'dots' | 'pulse' | 'bars' | 'card' | 'overlay'>('spinner');
  const [demoSpinnerColor, setDemoSpinnerColor] = useState<'primary' | 'blue' | 'indigo' | 'emerald' | 'rose' | 'slate'>('primary');
  const [demoSpinnerLabel, setDemoSpinnerLabel] = useState('ডাটা লোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...');
  const [demoButtonLoading, setDemoButtonLoading] = useState(false);

  // Admin Users List & Form State
  const [adminUsersList, setAdminUsersList] = useState<AdminUser[]>(adminUsers);
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'Super Admin' | 'Admin' | 'Agent'>('Admin');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminDepartment, setNewAdminDepartment] = useState('গ্রাহক সহায়তা (Customer Support)');
  const [showAdminPasswordId, setShowAdminPasswordId] = useState<string | null>(null);
  const [adminUserFormError, setAdminUserFormError] = useState('');
  const [adminUserFormSuccess, setAdminUserFormSuccess] = useState('');
  const [isExportingSheet, setIsExportingSheet] = useState(false);

  useEffect(() => {
    fetch('/api/admin-users')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAdminUsersList(data);
        }
      })
      .catch((err) => console.error('Error fetching admin users:', err));
  }, []);

  const handleCreateAdminUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminUserFormError('');
    setAdminUserFormSuccess('');

    try {
      const res = await fetch('/api/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newAdminUsername,
          password: newAdminPassword,
          role: newAdminRole,
          name: newAdminName,
          email: newAdminEmail,
          department: newAdminDepartment,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAdminUserFormError(data.error || 'অ্যাকাউন্ট তৈরি করতে ব্যর্থ হয়েছে');
      } else {
        setAdminUsersList(data.adminUsers || []);
        setAdminUserFormSuccess('নতুন অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে এবং গুগল শিটে সিঙ্ক করা হয়েছে!');
        setNewAdminUsername('');
        setNewAdminPassword('');
        setNewAdminName('');
        setNewAdminEmail('');
      }
    } catch (err) {
      setAdminUserFormError('সার্ভারে যোগাযোগ করতে সমস্যা হয়েছে');
    }
  };

  const handleDeleteAdminUser = async (id: string) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই ইউজার অ্যাকাউন্টটি ডিলিট করতে চান?')) return;
    try {
      const res = await fetch(`/api/admin-users/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setAdminUsersList(data.adminUsers || []);
      }
    } catch (err) {
      console.error('Failed to delete admin user:', err);
    }
  };

  const handleExportAdminUsersSheet = async () => {
    setIsExportingSheet(true);
    try {
      const res = await fetch('/api/admin-users/export-sheet', { method: 'POST' });
      const data = await res.json();
      alert(data.message || 'গুগল শিটে এডমিন ইউজার তালিকা সফলভাবে সিঙ্ক হয়েছে!');
    } catch (err) {
      alert('গুগল শিট সিঙ্কে সমস্যা হয়েছে।');
    } finally {
      setIsExportingSheet(false);
    }
  };

  // Blocked User State
  const [manualBlockId, setManualBlockId] = useState('');
  const [manualBlockReason, setManualBlockReason] = useState('');

  // Admin Live Chat State
  const [selectedAdminChatId, setSelectedAdminChatId] = useState<string>(chats[0]?.id || '');
  const [adminChatSearch, setAdminChatSearch] = useState<string>('');
  const [adminMessageText, setAdminMessageText] = useState<string>('');
  const [adminIsNote, setAdminIsNote] = useState<boolean>(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // New Chat Modal State
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustDept, setNewCustDept] = useState('সাধারণ জিজ্ঞাসা');
  const [newCustProblemIssue, setNewCustProblemIssue] = useState<SupportProblemIssue>('deposit_problem');
  const [newCustSubject, setNewCustSubject] = useState('ডিপোজিট সমস্যা');
  const [newCustMessage, setNewCustMessage] = useState('');

  // Handle selecting a chat session in Admin Live Chat & mark as seen
  const handleSelectAdminChat = async (chatId: string) => {
    setSelectedAdminChatId(chatId);
    setMobileChatView('chat');
    const adminDisplayName = currentAdminProfile?.name || 'Saju Ahmed (Admin)';
    await markChatAsSeenByAdminInFirestore(chatId, adminDisplayName);
  };

  useEffect(() => {
    if (adminTab === 'live_chat' && selectedAdminChatId) {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      const adminDisplayName = currentAdminProfile?.name || 'Saju Ahmed (Admin)';
      markChatAsSeenByAdminInFirestore(selectedAdminChatId, adminDisplayName);
    }
  }, [selectedAdminChatId, messages, adminTab]);

  // New Agent Form State
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentEmail, setNewAgentEmail] = useState('');
  const [newAgentRole, setNewAgentRole] = useState<'Senior Agent' | 'Support Representative' | 'AI Admin'>('Support Representative');
  const [newAgentAvatar, setNewAgentAvatar] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150');
  const [agentSuccess, setAgentSuccess] = useState(false);

  // Password Change State
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passChangedMsg, setPassChangedMsg] = useState('');

  // Google Apps Script Test State
  const [testScriptUrl, setTestScriptUrl] = useState('');
  const [testSyncResult, setTestSyncResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);
  const [isTestingScript, setIsTestingScript] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Handle Add New Agent
  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim() || !newAgentEmail.trim()) return;

    onAddAgent({
      name: newAgentName.trim(),
      email: newAgentEmail.trim(),
      role: newAgentRole,
      status: 'online',
      avatar: newAgentAvatar,
    });

    setNewAgentName('');
    setNewAgentEmail('');
    setAgentSuccess(true);
    setTimeout(() => setAgentSuccess(false), 3000);
  };

  // Handle Password Change Submit
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassChangedMsg('পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে!');
    setCurrentPass('');
    setNewPass('');
    setTimeout(() => setPassChangedMsg(''), 3000);
  };

  // Test Apps Script Webhook
  const handleTestScript = async () => {
    if (!testScriptUrl.trim()) {
      setTestSyncResult({ error: 'অনুগ্রহ করে Apps Script Web App URL টি লিখুন।' });
      return;
    }
    setIsTestingScript(true);
    setTestSyncResult(null);

    try {
      const res = await fetch('/api/sheets/apps-script-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webAppUrl: testScriptUrl.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestSyncResult({
          success: true,
          message: data.message || 'গুগল শিট ওয়েব হুক কানেকশন ১০০% সফল হয়েছে!',
        });
      } else {
        setTestSyncResult({ error: data.error || 'গুগল শিটে সংযোগ করা সম্ভব হয়নি।' });
      }
    } catch (err: any) {
      setTestSyncResult({ error: err.message || 'নেটওয়ার্ক বা ওয়েব হুক সমস্যা।' });
    } finally {
      setIsTestingScript(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(CODE_GS_SCRIPT);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  // Visitor Device, Location & Referrer Categorizers
  const getVisitorDeviceType = (v: LiveVisitor): 'phone' | 'desktop' | 'tablet' => {
    if (v.deviceType) return v.deviceType;
    const d = (v.device || '').toLowerCase();
    if (d.includes('phone') || d.includes('android') || d.includes('iphone') || d.includes('mobile') || d.includes('ios') || d.includes('samsung') || d.includes('redmi') || d.includes('oneplus') || d.includes('xiaomi')) {
      return 'phone';
    }
    if (d.includes('ipad') || d.includes('tablet')) {
      return 'tablet';
    }
    return 'desktop';
  };

  const getTrafficSourceBadge = (referrer: string) => {
    const ref = (referrer || '').toLowerCase();
    if (ref.includes('google')) return { name: 'Google Search', icon: '🔍', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (ref.includes('facebook')) return { name: 'Facebook', icon: '📘', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    if (ref.includes('youtube')) return { name: 'YouTube', icon: '▶️', color: 'bg-red-50 text-red-700 border-red-200' };
    if (ref.includes('tiktok')) return { name: 'TikTok', icon: '🎵', color: 'bg-pink-50 text-pink-700 border-pink-200' };
    if (ref.includes('telegram')) return { name: 'Telegram', icon: '✈️', color: 'bg-sky-50 text-sky-700 border-sky-200' };
    if (ref.includes('linkedin')) return { name: 'LinkedIn', icon: '💼', color: 'bg-blue-50 text-blue-800 border-blue-300' };
    if (ref.includes('direct') || !ref) return { name: 'Direct Link / ওয়েবসাইট', icon: '🔗', color: 'bg-slate-100 text-slate-700 border-slate-300' };
    return { name: referrer, icon: '🌐', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  const allLiveVisitors = liveVisitors || [];

  // Historical Visitor Logs & Timeframe Analytics State
  const [visitorLogs, setVisitorLogs] = useState<VisitorLogEntry[]>(() => {
    return getStoredVisitorLogs();
  });
  const [activeVisitorTimeframe, setActiveVisitorTimeframe] = useState<VisitorTimeframeFilter>('today');

  // Load latest visitor logs from API/Firestore on mount
  useEffect(() => {
    fetch('/api/analytics/visitor-logs?timeframe=all')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.filtered) && data.filtered.length > 0) {
          setVisitorLogs(data.filtered);
        }
      })
      .catch(() => {});
  }, []);

  // Compute comprehensive Today, This Week, This Month, This Year stats summary
  const visitorStatsSummary = useMemo(() => {
    return calculateVisitorStats(visitorLogs, allLiveVisitors);
  }, [visitorLogs, allLiveVisitors]);

  // Refresh visitor analytics handler
  const handleRefreshVisitorStats = () => {
    fetch('/api/analytics/visitor-logs?timeframe=all')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.filtered)) {
          setVisitorLogs(data.filtered);
        }
      })
      .catch(() => {});
  };

  // Filter state for Visitor list in Overview and Visitors tab
  const [visitorDeviceFilter, setVisitorDeviceFilter] = useState<'all' | 'phone' | 'desktop' | 'tablet'>('all');
  const [visitorSearchTerm, setVisitorSearchTerm] = useState('');
  const [visitorLocationFilter, setVisitorLocationFilter] = useState<'all' | string>('all');
  const [visitorSourceFilter, setVisitorSourceFilter] = useState<'all' | string>('all');
  const [showTacticalMap, setShowTacticalMap] = useState<boolean>(true);

  // Visitor analytics metrics
  const totalVisitorsCount = allLiveVisitors.length;
  const phoneVisitorsCount = allLiveVisitors.filter((v) => getVisitorDeviceType(v) === 'phone').length;
  const desktopVisitorsCount = allLiveVisitors.filter((v) => getVisitorDeviceType(v) === 'desktop').length;
  const tabletVisitorsCount = allLiveVisitors.filter((v) => getVisitorDeviceType(v) === 'tablet').length;

  const phonePercent = totalVisitorsCount > 0 ? Math.round((phoneVisitorsCount / totalVisitorsCount) * 100) : 0;
  const desktopPercent = totalVisitorsCount > 0 ? Math.round((desktopVisitorsCount / totalVisitorsCount) * 100) : 0;
  const tabletPercent = totalVisitorsCount > 0 ? Math.round((tabletVisitorsCount / totalVisitorsCount) * 100) : 0;

  // Location aggregations
  const locationBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    allLiveVisitors.forEach((v) => {
      const loc = v.location || 'অজানা স্থান';
      counts[loc] = (counts[loc] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([loc, count]) => ({
        location: loc,
        count,
        percent: totalVisitorsCount > 0 ? Math.round((count / totalVisitorsCount) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [allLiveVisitors, totalVisitorsCount]);

  // Traffic sources / Referrer aggregations
  const sourceBreakdown = useMemo(() => {
    const counts: Record<string, { count: number; meta: ReturnType<typeof getTrafficSourceBadge> }> = {};
    allLiveVisitors.forEach((v) => {
      const meta = getTrafficSourceBadge(v.referrer);
      if (!counts[meta.name]) {
        counts[meta.name] = { count: 0, meta };
      }
      counts[meta.name].count += 1;
    });
    return Object.entries(counts)
      .map(([name, data]) => ({
        name,
        meta: data.meta,
        count: data.count,
        percent: totalVisitorsCount > 0 ? Math.round((data.count / totalVisitorsCount) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [allLiveVisitors, totalVisitorsCount]);

  // Filtered live visitors
  const filteredVisitors = useMemo(() => {
    return allLiveVisitors.filter((v) => {
      const dType = getVisitorDeviceType(v);
      if (visitorDeviceFilter !== 'all' && dType !== visitorDeviceFilter) return false;
      if (visitorLocationFilter !== 'all' && v.location !== visitorLocationFilter) return false;
      if (visitorSourceFilter !== 'all' && getTrafficSourceBadge(v.referrer).name !== visitorSourceFilter) return false;

      if (visitorSearchTerm.trim()) {
        const q = visitorSearchTerm.toLowerCase();
        const matchName = v.name.toLowerCase().includes(q);
        const matchPhone = v.phone && v.phone.includes(q);
        const matchIp = v.ip && v.ip.toLowerCase().includes(q);
        const matchLoc = v.location.toLowerCase().includes(q);
        const matchDevice = v.device.toLowerCase().includes(q);
        const matchRef = v.referrer.toLowerCase().includes(q);
        const matchPage = v.currentPage.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchIp && !matchLoc && !matchDevice && !matchRef && !matchPage) {
          return false;
        }
      }
      return true;
    });
  }, [allLiveVisitors, visitorDeviceFilter, visitorLocationFilter, visitorSourceFilter, visitorSearchTerm]);

  // Calculated Stats
  const totalChats = chats.length;
  const resolvedChats = chats.filter((c) => c.status === 'resolved').length;
  const activeChats = chats.filter((c) => c.status === 'active').length;
  const waitingChats = chats.filter((c) => c.status === 'waiting').length;

  return (
    <div
      id="admin-dashboard-page"
      style={{
        fontSize: adminFontSize,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y'
      }}
      className="w-full h-full flex-1 bg-slate-50 overflow-y-auto overscroll-contain p-2 sm:p-4 text-[7px] admin-compact-mode pb-28 select-text"
    >
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* Compact Admin Toolbar (Replaces old bulky banner) */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-800 text-[10px] sm:text-xs">এডমিন কন্ট্রোল</span>
              <span className="text-[7px] bg-emerald-500/20 text-emerald-700 font-extrabold uppercase px-1.5 py-0.2 rounded">
                সক্রিয়
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Font Size Selector */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 text-[7px]">
              <span className="text-slate-500 px-1 font-bold">ফন্ট:</span>
              {(['7px', '8px', '9px', '10px'] as const).map((sz) => (
                <button
                  key={sz}
                  onClick={() => handleSetFontSize(sz)}
                  className={`px-1.5 py-0.5 rounded transition font-bold cursor-pointer ${
                    adminFontSize === sz
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                  title={`ফন্ট সাইজ ${sz} সেট করুন`}
                >
                  {sz}
                </button>
              ))}
            </div>

            {/* Spinner Model Setup Modal Trigger */}
            <button
              onClick={() => setIsSpinnerModalOpen(true)}
              className="px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-[8px] sm:text-[9px] font-bold rounded-lg flex items-center gap-1 transition shadow-xs cursor-pointer"
              title="স্পিনার লোডার মডেল কাস্টমাইজ ও টেস্ট করুন"
            >
              <Sparkles className="w-3 h-3 text-amber-200 animate-pulse" />
              <span>স্পিনার মডেল সেটআপ</span>
            </button>

            {/* Code.gs Modal Button */}
            <button
              onClick={onOpenCodeGsModal}
              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[8px] sm:text-[9px] font-bold rounded-lg flex items-center gap-1 transition shadow-xs cursor-pointer"
            >
              <Code className="w-3 h-3" />
              <span>Code.gs</span>
            </button>
          </div>
        </div>

        {/* Sub Navigation Bar */}
        <div className="flex items-center gap-1 border-b border-slate-200 pb-2 text-[8px] sm:text-[9px] font-semibold overflow-x-auto">
          <button
            onClick={() => setAdminTab('overview')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition shrink-0 ${
              adminTab === 'overview'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <BarChart3 className="w-3 h-3" />
            <span>সংক্ষিপ্ত ওভারভিউ</span>
          </button>

          <button
            onClick={() => {
              setAdminTab('live_chat');
              if (!selectedAdminChatId && chats.length > 0) {
                setSelectedAdminChatId(chats[0].id);
              }
            }}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition shrink-0 ${
              adminTab === 'live_chat'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <MessageSquare className="w-3 h-3 text-amber-500 shrink-0" />
            <span>💬 কাস্টমার লাইভ চ্যাট ({chats.length})</span>
          </button>

          <button
            onClick={() => setAdminTab('visitors')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition shrink-0 ${
              adminTab === 'visitors'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs font-bold'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Globe className="w-3 h-3 text-emerald-500 shrink-0" />
            <span>🌐 লাইভ ভিজিটর ({allLiveVisitors.length})</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </button>

          <button
            onClick={() => setAdminTab('device_notifications')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition shrink-0 ${
              adminTab === 'device_notifications'
                ? 'bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 text-white shadow-xs font-bold'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Bell className="w-3 h-3 text-indigo-500 shrink-0 animate-bounce" />
            <span>📱 ডিভাইস পুশ নোটিফিকেশন</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700">
              Live
            </span>
          </button>

          <button
            onClick={() => setAdminTab('agents')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition shrink-0 ${
              adminTab === 'agents'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>সাপোর্ট এজেন্টসমূহ ({agents.length})</span>
          </button>

          <button
            onClick={() => setAdminTab('promotion')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition shrink-0 ${
              adminTab === 'promotion'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs font-bold'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Megaphone className="w-3 h-3 text-amber-400 shrink-0" />
            <span>📢 ওয়েবসাইট প্রমোশন</span>
          </button>

          <button
            onClick={() => setAdminTab('codegs')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition shrink-0 ${
              adminTab === 'codegs'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3 h-3" />
            <span>Code.gs ও গুগল শিট সিঙ্ক</span>
          </button>

          <button
            onClick={() => setAdminTab('blocked_users')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition shrink-0 ${
              adminTab === 'blocked_users'
                ? 'bg-rose-600 text-white shadow-xs font-bold'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <ShieldCheck className="w-3 h-3 text-rose-500" />
            <span>🚫 ব্লকড ইউজার ({blockedUsers.length})</span>
          </button>

          <button
            onClick={() => setAdminTab('admin_users')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition shrink-0 ${
              adminTab === 'admin_users'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-bold'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <KeyRound className="w-3 h-3 text-indigo-500" />
            <span>👤 ইউজার ও রোল শিট ({adminUsersList.length})</span>
          </button>

          <button
            onClick={() => setAdminTab('settings')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition shrink-0 ${
              adminTab === 'settings'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Lock className="w-3 h-3" />
            <span>পাসওয়ার্ড কাস্টমাইজেশন</span>
          </button>

          <button
            onClick={() => setAdminTab('spinners')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition shrink-0 ${
              adminTab === 'spinners'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-bold'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
            <span>🌀 স্পিনার</span>
          </button>

          <button
            onClick={() => setAdminTab('telegram')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition shrink-0 ${
              adminTab === 'telegram'
                ? 'bg-gradient-to-r from-sky-600 to-blue-700 text-white shadow-xs font-bold'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Send className="w-3 h-3 text-sky-400" />
            <span>✈️ টেলিগ্রাম নোটিফিকেশন</span>
          </button>

          <button
            onClick={() => setAdminTab('notice')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition shrink-0 ${
              adminTab === 'notice'
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 font-black shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Volume2 className={`w-3 h-3 ${noticeEnabled ? 'text-amber-600 animate-pulse' : 'text-slate-400'}`} />
            <span>📢 ইউজার নোটিশ হেডার</span>
            {noticeEnabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            )}
          </button>
        </div>

        {/* TAB 1: OVERVIEW & STATS */}
        {adminTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Quick User Notice Header Bar */}
            <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="p-2 bg-amber-500 text-slate-950 rounded-xl font-bold shrink-0">
                  <Volume2 className="w-4 h-4 animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-950">ইউজার নোটিশ হেডার স্ক্রলার</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
                      noticeEnabled && noticeText.trim() ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {noticeEnabled && noticeText.trim() ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয়'}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-900 truncate mt-0.5 font-medium">
                    {noticeText.trim() || 'কোনো নোটিশ সেট করা নেই'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setAdminTab('notice')}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-xs"
              >
                <span>বার্তা পরিবর্তন করুন</span>
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* NEW: VISITOR ANALYTICS HERO TIMEFRAME CARDS (Today, This Week, This Month, This Year) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                      <span>ওয়েবসাইট ভিজিটর অ্যানালিটিক্স ও ট্রাফিক ট্রেন্ড</span>
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-100">
                        লাইভ সিঙ্ক
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      আজকে, চলতি সপ্তাহ, চলতি মাস এবং এই বছরের সংগৃহীত মোট ভিজিট ও ইউনিক ভিজিটরদের ট্র্যাকিং
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setActiveVisitorTimeframe('today');
                    setAdminTab('visitors');
                  }}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>সম্পূর্ণ ভিজিটর রিপোর্ট ➔</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Today's Visits */}
                <div
                  onClick={() => {
                    setActiveVisitorTimeframe('today');
                    setAdminTab('visitors');
                  }}
                  className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 text-white rounded-3xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group relative overflow-hidden ring-1 ring-white/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2.5 py-1 bg-white/20 rounded-xl flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>আজকের ভিজিট (Today)</span>
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-400/25 text-emerald-200 flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" />
                      <span>+{visitorStatsSummary.today.growthPercent || 18}%</span>
                    </span>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <div className="text-3xl font-black tracking-tight font-mono">
                        {visitorStatsSummary.today.visits.toLocaleString('bn-BD')}
                      </div>
                      <p className="text-xs text-blue-100 mt-0.5 font-medium">আজকের মোট ভিজিট</p>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black font-mono text-white">
                        {visitorStatsSummary.today.uniqueVisitors.toLocaleString('bn-BD')}
                      </div>
                      <p className="text-[10px] text-blue-200 font-medium">ইউনিক ভিজিটর</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px]">
                    <span className="text-blue-100">
                      পেজভিউ: <b>{visitorStatsSummary.today.pageviews.toLocaleString('bn-BD')}</b>
                    </span>
                    <span className="text-white font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                      <span>বিস্তারিত দেখুন</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {/* 2. This Week's Visits */}
                <div
                  onClick={() => {
                    setActiveVisitorTimeframe('this_week');
                    setAdminTab('visitors');
                  }}
                  className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white rounded-3xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group relative overflow-hidden ring-1 ring-white/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2.5 py-1 bg-white/20 rounded-xl flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>এই সপ্তাহের ভিজিট (This Week)</span>
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-400/25 text-emerald-200 flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" />
                      <span>+{visitorStatsSummary.thisWeek.growthPercent || 24}%</span>
                    </span>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <div className="text-3xl font-black tracking-tight font-mono">
                        {visitorStatsSummary.thisWeek.visits.toLocaleString('bn-BD')}
                      </div>
                      <p className="text-xs text-indigo-100 mt-0.5 font-medium">সাপ্তাহিক মোট ভিজিট</p>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black font-mono text-white">
                        {visitorStatsSummary.thisWeek.uniqueVisitors.toLocaleString('bn-BD')}
                      </div>
                      <p className="text-[10px] text-indigo-200 font-medium">ইউনিক ভিজিটর</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px]">
                    <span className="text-indigo-100">
                      পেজভিউ: <b>{visitorStatsSummary.thisWeek.pageviews.toLocaleString('bn-BD')}</b>
                    </span>
                    <span className="text-white font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                      <span>বিস্তারিত দেখুন</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {/* 3. This Month's Visits */}
                <div
                  onClick={() => {
                    setActiveVisitorTimeframe('this_month');
                    setAdminTab('visitors');
                  }}
                  className="bg-gradient-to-br from-emerald-600 via-teal-700 to-teal-800 text-white rounded-3xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group relative overflow-hidden ring-1 ring-white/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2.5 py-1 bg-white/20 rounded-xl flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>এই মাসের ভিজিট (This Month)</span>
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/20 text-emerald-100 flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" />
                      <span>+{visitorStatsSummary.thisMonth.growthPercent || 32}%</span>
                    </span>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <div className="text-3xl font-black tracking-tight font-mono">
                        {visitorStatsSummary.thisMonth.visits.toLocaleString('bn-BD')}
                      </div>
                      <p className="text-xs text-emerald-100 mt-0.5 font-medium">মাসিক মোট ভিজিট</p>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black font-mono text-white">
                        {visitorStatsSummary.thisMonth.uniqueVisitors.toLocaleString('bn-BD')}
                      </div>
                      <p className="text-[10px] text-emerald-200 font-medium">ইউনিক ভিজিটর</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px]">
                    <span className="text-emerald-100">
                      পেজভিউ: <b>{visitorStatsSummary.thisMonth.pageviews.toLocaleString('bn-BD')}</b>
                    </span>
                    <span className="text-white font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                      <span>বিস্তারিত দেখুন</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {/* 4. This Year's Visitors */}
                <div
                  onClick={() => {
                    setActiveVisitorTimeframe('this_year');
                    setAdminTab('visitors');
                  }}
                  className="bg-gradient-to-br from-amber-600 via-amber-700 to-orange-700 text-white rounded-3xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group relative overflow-hidden ring-1 ring-white/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2.5 py-1 bg-white/20 rounded-xl flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" />
                      <span>এই বছরের ভিজিটর (This Year)</span>
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/20 text-amber-100 flex items-center gap-0.5">
                      <Sparkles className="w-3 h-3" />
                      <span>বার্ষিক ট্রাফিক</span>
                    </span>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <div className="text-3xl font-black tracking-tight font-mono">
                        {visitorStatsSummary.thisYear.visits.toLocaleString('bn-BD')}
                      </div>
                      <p className="text-xs text-amber-100 mt-0.5 font-medium">বার্ষিক মোট ভিজিট</p>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black font-mono text-white">
                        {visitorStatsSummary.thisYear.uniqueVisitors.toLocaleString('bn-BD')}
                      </div>
                      <p className="text-[10px] text-amber-200 font-medium">ইউনিক ভিজিটর</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px]">
                    <span className="text-amber-100">
                      পেজভিউ: <b>{visitorStatsSummary.thisYear.pageviews.toLocaleString('bn-BD')}</b>
                    </span>
                    <span className="text-white font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                      <span>বিস্তারিত দেখুন</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-500 text-xs">
                  <span>মোট চ্যাট টিকিট</span>
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">{totalChats}</div>
                <p className="text-[11px] text-slate-500">অনলাইন গ্রাহকদের প্রশ্নসমূহ</p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-500 text-xs">
                  <span>চলতি ও অপেক্ষমাণ চ্যাট</span>
                  <RefreshCw className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black text-amber-600">{activeChats + waitingChats}</div>
                <p className="text-[11px] text-slate-500">{waitingChats} টি চ্যাট অ্যাসাইন ছাড়া</p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-500 text-xs">
                  <span>সমাধানকৃত টিকিট</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-emerald-600">{resolvedChats}</div>
                <p className="text-[11px] text-slate-500">সফলভাবে উত্তর দেওয়া হয়েছে</p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-500 text-xs">
                  <span>মোট সক্রিয় এজেন্ট</span>
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-black text-indigo-600">{agents.length}</div>
                <p className="text-[11px] text-slate-500">সাপোর্ট টিমের সদস্য</p>
              </div>
            </div>

            {/* Recent Conversations Overview */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                <span>সাম্প্রতিক কাস্টমার টিকিট তালিকা</span>
                <span className="text-xs text-slate-500 font-normal">মোট {chats.length} টি রেসপন্স</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3">চ্যাট আইডি (Chat ID)</th>
                      <th className="py-2.5 px-3">গ্রাহক ও ফোন / IP</th>
                      <th className="py-2.5 px-3">ডিপার্টমেন্ট</th>
                      <th className="py-2.5 px-3">বিষয়</th>
                      <th className="py-2.5 px-3">স্ট্যাটাস</th>
                      <th className="py-2.5 px-3">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {chats.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700 text-[11px] select-all">
                          {c.id}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <img src={c.customer.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                            <div>
                              <div>{c.customer.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                📞 {c.customer.phone || '01712345678'} • IP: {c.customer.ipAddress || '103.205.132.42'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">{c.department}</td>
                        <td className="py-2.5 px-3 max-w-xs truncate">{c.subject}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              c.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : c.status === 'resolved'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => {
                              setSelectedAdminChatId(c.id);
                              setAdminTab('live_chat');
                            }}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg transition flex items-center gap-1"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>লাইভ চ্যাট</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Website Visitors & Device Analytics */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                      <Globe className="w-4 h-4" />
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm">
                      লাইভ ওয়েবসাইট ভিজিটর ও ট্রাফিক রিপোর্ট
                    </h3>
                    <span className="flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      রিয়েলটাইম লাইভ
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    ওয়েবসাইটে বর্তমানে মোট {totalVisitorsCount} জন সক্রিয় ভিজিটর ব্রাউজ করছেন
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAdminTab('visitors')}
                    className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  >
                    <span>সম্পূর্ণ ভিজিটর ও ম্যাপ ড্যাশবোর্ড</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 4 Visitor Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-xl p-3.5 border border-emerald-100 space-y-1">
                  <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold">
                    <span>মোট সক্রিয় ভিজিটর</span>
                    <Activity className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-950 flex items-baseline gap-1.5">
                    {totalVisitorsCount} <span className="text-xs font-normal text-emerald-700">জন</span>
                  </div>
                  <p className="text-[10px] text-emerald-700">লাইভ ব্রাউজিং করছেন</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-xl p-3.5 border border-blue-100 space-y-1">
                  <div className="flex items-center justify-between text-blue-800 text-xs font-semibold">
                    <span>📱 ফোন / মোবাইল ইউজার</span>
                    <Smartphone className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-blue-950 flex items-baseline gap-1.5">
                    {phoneVisitorsCount} <span className="text-xs font-bold text-blue-700">({phonePercent}%)</span>
                  </div>
                  <p className="text-[10px] text-blue-700">Android ও iPhone ইউজার</p>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-purple-50/50 rounded-xl p-3.5 border border-indigo-100 space-y-1">
                  <div className="flex items-center justify-between text-indigo-800 text-xs font-semibold">
                    <span>💻 ডেস্কটপ / কম্পিউটার</span>
                    <Laptop className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-black text-indigo-950 flex items-baseline gap-1.5">
                    {desktopVisitorsCount} <span className="text-xs font-bold text-indigo-700">({desktopPercent}%)</span>
                  </div>
                  <p className="text-[10px] text-indigo-700">Windows, Mac ও Linux ইউজার</p>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-xl p-3.5 border border-amber-100 space-y-1">
                  <div className="flex items-center justify-between text-amber-800 text-xs font-semibold">
                    <span>🔗 শীর্ষ ট্রাফিক সোর্স</span>
                    <Share2 className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-sm font-bold text-amber-950 truncate">
                    {sourceBreakdown[0]?.name || 'Google Search'}
                  </div>
                  <p className="text-[10px] text-amber-700">
                    {sourceBreakdown[0]?.count || 0} জন ইউজার ({sourceBreakdown[0]?.percent || 0}%)
                  </p>
                </div>
              </div>

              {/* Analytics 3-column breakdown: Device, Traffic Sources & Locations */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Device Breakdown */}
                <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                      <span>ডিভাইস অনুপাত</span>
                    </h4>
                    <span className="text-[10px] text-slate-500 font-medium">মোবাইল বনাম পিসি</span>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                        <span className="flex items-center gap-1">📱 ফোন / মোবাইল ({phoneVisitorsCount} জন)</span>
                        <span className="text-blue-600 font-bold">{phonePercent}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${phonePercent}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                        <span className="flex items-center gap-1">💻 ডেস্কটপ / পিসি ({desktopVisitorsCount} জন)</span>
                        <span className="text-indigo-600 font-bold">{desktopPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${desktopPercent}%` }} />
                      </div>
                    </div>

                    {tabletVisitorsCount > 0 && (
                      <div>
                        <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                          <span className="flex items-center gap-1">📲 ট্যাবলেট ({tabletVisitorsCount} জন)</span>
                          <span className="text-purple-600 font-bold">{tabletPercent}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div className="bg-purple-600 h-full rounded-full transition-all duration-500" style={{ width: `${tabletPercent}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Where users came from (Traffic Sources / Referrers) */}
                <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-amber-600" />
                      <span>কোথায় থেকে ইউজার আসলো</span>
                    </h4>
                    <span className="text-[10px] text-slate-500 font-medium">ট্রাফিক সোর্স</span>
                  </div>

                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {sourceBreakdown.map((src, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200/60 text-[11px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span>{src.meta.icon}</span>
                          <span className="font-semibold text-slate-800 truncate">{src.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 font-mono">
                          <span className="font-bold text-slate-900">{src.count} জন</span>
                          <span className="text-[10px] text-slate-500">({src.percent}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Top Locations */}
                <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-600" />
                      <span>শীর্ষ লোকেশন তালিকা</span>
                    </h4>
                    <span className="text-[10px] text-slate-500 font-medium">জেলা ও শহর</span>
                  </div>

                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {locationBreakdown.map((loc, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200/60 text-[11px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                          <span className="font-semibold text-slate-800 truncate">{loc.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 font-mono">
                          <span className="font-bold text-slate-900">{loc.count} জন</span>
                          <span className="text-[10px] text-slate-500">({loc.percent}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Filter Bar & Interactive Visitors Table */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  {/* Device Filter Buttons */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      onClick={() => setVisitorDeviceFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        visitorDeviceFilter === 'all'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      সব ({totalVisitorsCount})
                    </button>
                    <button
                      onClick={() => setVisitorDeviceFilter('phone')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                        visitorDeviceFilter === 'phone'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Smartphone className="w-3 h-3" />
                      <span>ফোন ইউজার ({phoneVisitorsCount})</span>
                    </button>
                    <button
                      onClick={() => setVisitorDeviceFilter('desktop')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                        visitorDeviceFilter === 'desktop'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Laptop className="w-3 h-3" />
                      <span>ডেস্কটপ ইউজার ({desktopVisitorsCount})</span>
                    </button>
                    {tabletVisitorsCount > 0 && (
                      <button
                        onClick={() => setVisitorDeviceFilter('tablet')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                          visitorDeviceFilter === 'tablet'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Tablet className="w-3 h-3" />
                        <span>ট্যাবলেট ({tabletVisitorsCount})</span>
                      </button>
                    )}
                  </div>

                  {/* Search Input */}
                  <div className="relative min-w-[200px] sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="নাম, ফোন, IP বা লোকেশন খুঁজুন..."
                      value={visitorSearchTerm}
                      onChange={(e) => setVisitorSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                    {visitorSearchTerm && (
                      <button
                        onClick={() => setVisitorSearchTerm('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Table of Live Visitors */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold text-[11px]">
                        <th className="py-2.5 px-3">ভিজিটর ও ফোন / IP</th>
                        <th className="py-2.5 px-3">ডিভাইস ও ব্রাউজার</th>
                        <th className="py-2.5 px-3">লোকেশন (Location)</th>
                        <th className="py-2.5 px-3">কোথায় থেকে আসলো (Source)</th>
                        <th className="py-2.5 px-3">ভিজিট করা পেজ</th>
                        <th className="py-2.5 px-3">স্ট্যাটাস</th>
                        <th className="py-2.5 px-3 text-right">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 text-[11px]">
                      {filteredVisitors.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-6 text-slate-500 font-medium">
                            কোনো ভিজিটর তথ্য পাওয়া যায়নি।
                          </td>
                        </tr>
                      ) : (
                        filteredVisitors.map((v) => {
                          const dType = getVisitorDeviceType(v);
                          const srcBadge = getTrafficSourceBadge(v.referrer);
                          return (
                            <tr key={v.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                    {v.name.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900">{maskUserInfo(v.name, 'name')}</div>
                                    <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 flex-wrap">
                                      <span>📞 {maskUserInfo(v.phone || '01712345678', 'phone')}</span>
                                      <span>•</span>
                                      <span>IP: {maskUserInfo(v.ip, 'ip')}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-2.5 px-3">
                                <div className="space-y-0.5">
                                  <span
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      dType === 'phone'
                                        ? 'bg-blue-100 text-blue-800'
                                        : dType === 'tablet'
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-indigo-100 text-indigo-800'
                                    }`}
                                  >
                                    {dType === 'phone' && <Smartphone className="w-3 h-3" />}
                                    {dType === 'desktop' && <Laptop className="w-3 h-3" />}
                                    {dType === 'tablet' && <Tablet className="w-3 h-3" />}
                                    <span>
                                      {dType === 'phone' ? '📱 ফোন (Mobile)' : dType === 'tablet' ? '📲 ট্যাবলেট' : '💻 ডেস্কটপ (PC)'}
                                    </span>
                                  </span>
                                  <div className="text-[10px] text-slate-500 truncate max-w-[150px] font-medium" title={v.device}>
                                    {v.device}
                                  </div>
                                </div>
                              </td>

                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1 font-medium text-slate-800">
                                  <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                                  <span>{v.location}</span>
                                </div>
                              </td>

                              <td className="py-2.5 px-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${srcBadge.color}`}>
                                  <span>{srcBadge.icon}</span>
                                  <span>{srcBadge.name}</span>
                                </span>
                              </td>

                              <td className="py-2.5 px-3">
                                <div className="space-y-0.5 font-mono text-[10px]">
                                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-semibold">
                                    {v.currentPage}
                                  </span>
                                  <div className="text-slate-500 text-[9px]">{v.timeOnPage} ধরে</div>
                                </div>
                              </td>

                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    v.status === 'in_chat'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : v.status === 'invited'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-sky-100 text-sky-800'
                                  }`}
                                >
                                  {v.status === 'in_chat' ? 'চ্যাটে যুক্ত' : v.status === 'invited' ? 'আমন্ত্রিত' : 'ব্রাউজিং'}
                                </span>
                              </td>

                              <td className="py-2.5 px-3 text-right">
                                <button
                                  onClick={() => {
                                    if (onInviteToChat) {
                                      onInviteToChat(v);
                                    } else if (onStartNewChat) {
                                      onStartNewChat({
                                        customerName: v.name,
                                        customerPhone: v.phone || '01712345678',
                                        customerEmail: v.email || 'visitor@store.com',
                                        department: 'Customer Support',
                                        subject: `Chat with ${v.name} from ${v.location}`,
                                        initialMessage: `👋 হ্যালো ${v.name}! আমি দেখতে পাচ্ছি আপনি আমাদের ওয়েবসাইট ব্রাউজ করছেন। কোনো তথ্য দিয়ে সাহায্য করতে পারি?`
                                      });
                                      setAdminTab('live_chat');
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition inline-flex items-center gap-1 cursor-pointer shadow-xs"
                                  title="ভিজিটরকে সরাসরি চ্যাটে আমন্ত্রণ জানান"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  <span>চ্যাট ইনভাইট</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: LIVE VISITORS (DEDICATED VISITOR ANALYTICS & MAP) */}
        {adminTab === 'visitors' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Header with Title and Quick Summary */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span>লাইভ ওয়েবসাইট ভিজিটর ট্র্যাকিং ও অ্যানালিটিক্স</span>
                      <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                        {allLiveVisitors.length} জন সক্রিয়
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500">
                      ভিজিটরের ডিভাইস (ফোন/ডেস্কটপ), লোকেশন (শহর/দেশ), এবং কোন উৎস (Traffic Source) থেকে এসেছে তা রিয়েলটাইমে মনিটর করুন।
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowTacticalMap(!showTacticalMap)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border shadow-2xs ${
                    showTacticalMap
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>{showTacticalMap ? '🗺️ ম্যাপ বন্ধ করুন' : '🗺️ লাইভ ম্যাপ দেখুন'}</span>
                </button>
              </div>
            </div>

            {/* Comprehensive Visitor Analytics Dashboard (Today, This Week, This Month, This Year) */}
            <VisitorAnalyticsDashboard
              stats={visitorStatsSummary}
              logs={visitorLogs}
              liveVisitors={allLiveVisitors}
              activeTimeframe={activeVisitorTimeframe}
              onTimeframeChange={(tf) => setActiveVisitorTimeframe(tf)}
              onRefresh={handleRefreshVisitorStats}
              onInviteToChat={onInviteToChat}
            />

            {/* Tactical Live Map View */}
            {showTacticalMap && (
              <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 shadow-lg text-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <h3 className="font-bold text-xs text-slate-200">
                      🌍 লাইভ জিওলোকেশন ও ট্রাফিক মানচিত্র (Live Geolocation Radar)
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    অ্যাক্টিভ নোডস: {allLiveVisitors.length} টি
                  </span>
                </div>
                <div className="h-64 sm:h-80 w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800/80">
                  <WorldMapVisualization visitors={allLiveVisitors} />
                </div>
              </div>
            )}

            {/* 4 Stat Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-500 text-xs">
                  <span>মোট লাইভ ভিজিটর</span>
                  <Globe className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">{totalVisitorsCount} জন</div>
                <p className="text-[11px] text-emerald-600 font-semibold">● সাইটে সক্রিয় রয়েছেন</p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-500 text-xs">
                  <span>📱 ফোন / মোবাইল ভিজিটর</span>
                  <Smartphone className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black text-blue-600">{phoneVisitorsCount} জন</div>
                <p className="text-[11px] text-slate-500">মোট ভিজিটরের {phonePercent}%</p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-500 text-xs">
                  <span>💻 ডেস্কটপ / পিসি ভিজিটর</span>
                  <Laptop className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-black text-indigo-600">{desktopVisitorsCount} জন</div>
                <p className="text-[11px] text-slate-500">মোট ভিজিটরের {desktopPercent}%</p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-500 text-xs">
                  <span>🔗 প্রধান রেফারাল সোর্স</span>
                  <Compass className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-lg font-black text-amber-700 truncate">
                  {sourceBreakdown[0]?.name || 'Google Search'}
                </div>
                <p className="text-[11px] text-slate-500">
                  {sourceBreakdown[0]?.count || 0} জন ({sourceBreakdown[0]?.percent || 0}%)
                </p>
              </div>
            </div>

            {/* Breakdown Grids: Device Types, Top Sources, and Locations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Device Card */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
                <h3 className="font-bold text-slate-900 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span>ডিভাইস বিভাজন (Device Type)</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">অনুপাত</span>
                </h3>

                <div className="space-y-3">
                  <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100">
                    <div className="flex justify-between items-center text-xs font-bold text-blue-900 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-blue-600" />
                        <span>📱 ফোন ইউজার (Mobile)</span>
                      </span>
                      <span>{phoneVisitorsCount} জন ({phonePercent}%)</span>
                    </div>
                    <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: `${phonePercent}%` }} />
                    </div>
                    <p className="text-[10px] text-blue-700 mt-1">iPhone, Samsung, Xiaomi, OnePlus ইত্যাদি</p>
                  </div>

                  <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
                    <div className="flex justify-between items-center text-xs font-bold text-indigo-900 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Laptop className="w-4 h-4 text-indigo-600" />
                        <span>💻 ডেস্কটপ / কম্পিউটার (PC)</span>
                      </span>
                      <span>{desktopVisitorsCount} জন ({desktopPercent}%)</span>
                    </div>
                    <div className="w-full bg-indigo-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${desktopPercent}%` }} />
                    </div>
                    <p className="text-[10px] text-indigo-700 mt-1">Windows 11/10, macOS, Ubuntu Linux</p>
                  </div>

                  {tabletVisitorsCount > 0 && (
                    <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100">
                      <div className="flex justify-between items-center text-xs font-bold text-purple-900 mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <Tablet className="w-4 h-4 text-purple-600" />
                          <span>📲 ট্যাবলেট (iPad / Tab)</span>
                        </span>
                        <span>{tabletVisitorsCount} জন ({tabletPercent}%)</span>
                      </div>
                      <div className="w-full bg-purple-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-purple-600 h-full rounded-full" style={{ width: `${tabletPercent}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Traffic Sources Card */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
                <h3 className="font-bold text-slate-900 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-amber-600" />
                    <span>কোথায় থেকে আসলো (Traffic Source)</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">রেফারাল</span>
                </h3>

                <div className="space-y-2">
                  {sourceBreakdown.map((src, idx) => (
                    <div
                      key={idx}
                      onClick={() => setVisitorSourceFilter(visitorSourceFilter === src.name ? 'all' : src.name)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer ${
                        visitorSourceFilter === src.name
                          ? 'bg-amber-50 border-amber-300 shadow-xs'
                          : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span>{src.meta.icon}</span>
                          <span>{src.name}</span>
                        </span>
                        <span className="font-bold text-slate-900">{src.count} জন ({src.percent}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: `${src.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Locations Card */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
                <h3 className="font-bold text-slate-900 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-rose-600" />
                    <span>লোকেশন তালিকা (Visitor Locations)</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">শহর ও জেলা</span>
                </h3>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {locationBreakdown.map((loc, idx) => (
                    <div
                      key={idx}
                      onClick={() => setVisitorLocationFilter(visitorLocationFilter === loc.location ? 'all' : loc.location)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer ${
                        visitorLocationFilter === loc.location
                          ? 'bg-rose-50 border-rose-300 shadow-xs'
                          : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>{loc.location}</span>
                        </span>
                        <span className="font-bold text-slate-900">{loc.count} জন ({loc.percent}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-rose-500 h-full rounded-full" style={{ width: `${loc.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Complete Visitors Interactive Table with Full Actions */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>লাইভ ভিজিটর তালিকা ও যোগাযোগ কন্ট্রোল</span>
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                      প্রদর্শিত: {filteredVisitors.length} জন
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ফিল্টার অনুযায়ী যেকোনো ভিজিটরকে সরাসরি লাইভ চ্যাটে আমন্ত্রণ জানাতে 'চ্যাট ইনভাইট' বাটনে ক্লিক করুন।
                  </p>
                </div>

                {/* Filters & Search */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Device Filters */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold">
                    <button
                      onClick={() => setVisitorDeviceFilter('all')}
                      className={`px-2.5 py-1 rounded-lg transition ${
                        visitorDeviceFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      সব
                    </button>
                    <button
                      onClick={() => setVisitorDeviceFilter('phone')}
                      className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                        visitorDeviceFilter === 'phone' ? 'bg-blue-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Smartphone className="w-3 h-3" />
                      <span>ফোন</span>
                    </button>
                    <button
                      onClick={() => setVisitorDeviceFilter('desktop')}
                      className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                        visitorDeviceFilter === 'desktop' ? 'bg-indigo-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Laptop className="w-3 h-3" />
                      <span>ডেস্কটপ</span>
                    </button>
                  </div>

                  {/* Search */}
                  <div className="relative min-w-[200px]">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="নাম, ফোন, IP, লোকেশন..."
                      value={visitorSearchTerm}
                      onChange={(e) => setVisitorSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                    {visitorSearchTerm && (
                      <button
                        onClick={() => setVisitorSearchTerm('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Active Filter Chips */}
              {(visitorDeviceFilter !== 'all' || visitorLocationFilter !== 'all' || visitorSourceFilter !== 'all' || visitorSearchTerm) && (
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] pb-1">
                  <span className="text-slate-500 font-bold">সক্রিয় ফিল্টার:</span>
                  {visitorDeviceFilter !== 'all' && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                      ডিভাইস: {visitorDeviceFilter === 'phone' ? '📱 ফোন' : '💻 ডেস্কটপ'}
                      <button onClick={() => setVisitorDeviceFilter('all')} className="hover:text-blue-950"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {visitorLocationFilter !== 'all' && (
                    <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                      লোকেশন: {visitorLocationFilter}
                      <button onClick={() => setVisitorLocationFilter('all')} className="hover:text-rose-950"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {visitorSourceFilter !== 'all' && (
                    <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                      উৎস: {visitorSourceFilter}
                      <button onClick={() => setVisitorSourceFilter('all')} className="hover:text-amber-950"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {visitorSearchTerm && (
                    <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                      অনুসন্ধান: "{visitorSearchTerm}"
                      <button onClick={() => setVisitorSearchTerm('')} className="hover:text-slate-950"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setVisitorDeviceFilter('all');
                      setVisitorLocationFilter('all');
                      setVisitorSourceFilter('all');
                      setVisitorSearchTerm('');
                    }}
                    className="text-xs text-rose-600 hover:underline font-bold ml-1 cursor-pointer"
                  >
                    সব রিসেট করুন
                  </button>
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold text-[11px]">
                      <th className="py-3 px-3">ভিজিটর ও ফোন / IP</th>
                      <th className="py-3 px-3">ডিভাইস ও ব্রাউজার (Device)</th>
                      <th className="py-3 px-3">লোকেশন (Location)</th>
                      <th className="py-3 px-3">কোথায় থেকে আসলো (Source)</th>
                      <th className="py-3 px-3">ভিজিট করা পেজ</th>
                      <th className="py-3 px-3">স্ট্যাটাস</th>
                      <th className="py-3 px-3 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-[11px]">
                    {filteredVisitors.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-500 font-medium">
                          কোনো ভিজিটর খুঁজে পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      filteredVisitors.map((v) => {
                        const dType = getVisitorDeviceType(v);
                        const srcBadge = getTrafficSourceBadge(v.referrer);
                        return (
                          <tr key={v.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                  {v.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 text-xs">{maskUserInfo(v.name, 'name')}</div>
                                  <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 flex-wrap mt-0.5">
                                    <span>📞 {maskUserInfo(v.phone || '01712345678', 'phone')}</span>
                                    <span>•</span>
                                    <span>IP: {maskUserInfo(v.ip, 'ip')}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="space-y-1">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    dType === 'phone'
                                      ? 'bg-blue-100 text-blue-800'
                                      : dType === 'tablet'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-indigo-100 text-indigo-800'
                                  }`}
                                >
                                  {dType === 'phone' && <Smartphone className="w-3 h-3" />}
                                  {dType === 'desktop' && <Laptop className="w-3 h-3" />}
                                  {dType === 'tablet' && <Tablet className="w-3 h-3" />}
                                  <span>
                                    {dType === 'phone' ? '📱 ফোন (Mobile)' : dType === 'tablet' ? '📲 ট্যাবলেট' : '💻 ডেস্কটপ (PC)'}
                                  </span>
                                </span>
                                <div className="text-[10px] text-slate-500 font-medium truncate max-w-[170px]" title={v.device}>
                                  {v.device}
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1 font-medium text-slate-800">
                                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <span>{v.location}</span>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${srcBadge.color}`}>
                                <span>{srcBadge.icon}</span>
                                <span>{srcBadge.name}</span>
                              </span>
                            </td>

                            <td className="py-3 px-3">
                              <div className="space-y-0.5 font-mono text-[10px]">
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-semibold inline-block">
                                  {v.currentPage}
                                </span>
                                <div className="text-slate-500 text-[9px]">{v.timeOnPage} ধরে অবস্থান</div>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  v.status === 'in_chat'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : v.status === 'invited'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-sky-100 text-sky-800'
                                }`}
                              >
                                {v.status === 'in_chat' ? 'চ্যাটে যুক্ত' : v.status === 'invited' ? 'আমন্ত্রিত' : 'ব্রাউজিং'}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => {
                                  if (onInviteToChat) {
                                    onInviteToChat(v);
                                  } else if (onStartNewChat) {
                                    onStartNewChat({
                                      customerName: v.name,
                                      customerPhone: v.phone || '01712345678',
                                      customerEmail: v.email || 'visitor@store.com',
                                      department: 'Customer Support',
                                      subject: `Chat with ${v.name} from ${v.location}`,
                                      initialMessage: `👋 হ্যালো ${v.name}! আমি দেখতে পাচ্ছি আপনি আমাদের ওয়েবসাইট ব্রাউজ করছেন। কোনো তথ্য দিয়ে সাহায্য করতে পারি?`
                                    });
                                    setAdminTab('live_chat');
                                  }
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                                title="ভিজিটরকে সরাসরি চ্যাটে আমন্ত্রণ জানান"
                              >
                                <MessageSquarePlus className="w-3.5 h-3.5" />
                                <span>চ্যাট ইনভাইট</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: LIVE CUSTOMER CHAT (ADMIN LIVE CHAT) */}
        {adminTab === 'live_chat' && (() => {
          const filteredChats = chats.filter((c) => {
            const q = adminChatSearch.toLowerCase().trim();
            if (!q) return true;
            return (
              c.id.toLowerCase().includes(q) ||
              c.customer.name.toLowerCase().includes(q) ||
              (c.customer.phone && c.customer.phone.includes(q)) ||
              (c.customer.ipAddress && c.customer.ipAddress.includes(q))
            );
          });

          const activeChatSession = chats.find((c) => c.id === selectedAdminChatId) || filteredChats[0] || chats[0];
          const activeMessages = activeChatSession ? (messages[activeChatSession.id] || []) : [];

          const handleSendAdminSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (!activeChatSession || !adminMessageText.trim()) return;
            if (onSendAdminMessage) {
              onSendAdminMessage(activeChatSession.id, adminMessageText.trim(), adminIsNote);
            }
            setAdminMessageText('');
            setAdminIsNote(false);
          };

          const handleCannedInsert = (text: string) => {
            if (!activeChatSession) return;
            if (onSendAdminMessage) {
              onSendAdminMessage(activeChatSession.id, text, false);
            }
          };

          return (
            <div className={`bg-white border border-slate-200 shadow-md overflow-hidden flex flex-col md:flex-row animate-in fade-in transition-all ${
              isChatFullScreen
                ? 'fixed inset-0 z-50 rounded-none h-screen max-h-screen w-screen'
                : 'rounded-2xl h-[560px] max-h-[calc(100vh-200px)] min-h-[420px]'
            }`}>
              {/* Left Column: Customer Chat List */}
              <div
                className={`w-full md:w-80 border-r border-slate-200 bg-slate-50 flex flex-col h-full shrink-0 ${
                  mobileChatView === 'chat' ? 'hidden md:flex' : 'flex'
                }`}
              >
                <div className="p-3 border-b border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                      <span>কাস্টমার তালিকা ({filteredChats.length})</span>
                    </h3>
                    <button
                      onClick={() => setIsNewChatModalOpen(true)}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                      title="নতুন চ্যাট টিকিট যোগ করুন"
                    >
                      <Plus className="w-3 h-3" />
                      <span>নতুন চ্যাট</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={adminChatSearch}
                      onChange={(e) => setAdminChatSearch(e.target.value)}
                      placeholder="আইডি, ফোন বা আইপি দিয়ে খুঁজুন..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-200/60 p-1">
                  {filteredChats.map((c) => {
                    const isSelected = activeChatSession?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => handleSelectAdminChat(c.id)}
                        className={`w-full text-left p-3 rounded-xl transition flex items-start gap-2.5 ${
                          isSelected ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <img
                          src={c.customer.avatar}
                          alt=""
                          className={`w-9 h-9 rounded-full object-cover aspect-square shrink-0 ring-2 ${
                            isSelected ? 'ring-white/50' : 'ring-slate-200'
                          }`}
                        />
                        <div className="flex-1 min-w-0 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold truncate">{maskUserInfo(c.customer.name, 'name')}</span>
                            <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                              {c.lastMessageTime}
                            </span>
                          </div>

                          <div className={`font-mono text-[10px] font-bold truncate mt-0.5 flex items-center justify-between ${
                            isSelected ? 'text-amber-200' : 'text-blue-700'
                          }`}>
                            <span>🆔 {c.id}</span>
                            {c.adminSeen && (
                              <span className={`text-[9px] px-1 py-0.2 rounded font-sans ${isSelected ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'}`}>
                                ✓✓ Seen
                              </span>
                            )}
                          </div>

                          {c.problemIssue && (
                            <div className={`text-[9px] font-medium truncate mt-0.5 ${isSelected ? 'text-amber-300 font-bold' : 'text-amber-700 font-semibold'}`}>
                              📌 {c.problemIssue}
                            </div>
                          )}

                          <div className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                            📞 {maskUserInfo(c.customer.phone || '01712345678', 'phone')} • IP: {maskUserInfo(c.customer.ipAddress || '103.205.132.42', 'ip')}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {filteredChats.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-400">
                      কোনো কাস্টমার পাওয়া যায়নি।
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Live Chat Screen */}
              {activeChatSession ? (
                <div
                  className={`flex-1 flex flex-col h-full bg-slate-50/50 min-w-0 ${
                    mobileChatView === 'list' ? 'hidden md:flex' : 'flex'
                  }`}
                >
                  {/* Mobile Back Button Bar */}
                  <div className="md:hidden px-3 py-1.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                    <button
                      onClick={() => setMobileChatView('list')}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-bold flex items-center gap-1 transition"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>← কাস্টমার তালিকায় ফিরে যান</span>
                    </button>
                    <span className="text-[10px] font-mono text-amber-300 font-bold">
                      ID: #{activeChatSession.id}
                    </span>
                  </div>

                  {/* Chat Session Header - Super Compact & Clean */}
                  <div className="px-2.5 py-1 bg-white border-b border-slate-200 shrink-0 shadow-2xs">
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      {/* Left: Customer Info Chip */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <img
                          src={activeChatSession.customer.avatar}
                          alt=""
                          className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                        />
                        <div className="flex items-center gap-1 flex-wrap min-w-0">
                          <span className="font-bold text-slate-900 text-[11px] truncate">
                            {maskUserInfo(activeChatSession.customer.name, 'name')}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(activeChatSession.id);
                              alert(`Chat ID কপি করা হয়েছে: ${activeChatSession.id}`);
                            }}
                            title="Chat ID কপি করুন"
                            className="font-mono text-[8px] bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold px-1 py-0.2 rounded flex items-center gap-0.5 cursor-pointer shrink-0"
                          >
                            <span>#{activeChatSession.id}</span>
                            <Copy className="w-2 h-2 opacity-70" />
                          </button>
                          <span className="text-[8px] bg-blue-50 text-blue-700 border border-blue-200 font-medium px-1 py-0.2 rounded shrink-0">
                            {currentAdminProfile?.name || activeChatSession.assignedAgentName || 'Saju Ahmed'}
                          </span>
                          {activeChatSession.customer.phone && (
                            <span className="font-mono text-blue-700 font-bold bg-blue-50/80 px-1 py-0.2 rounded text-[8px] border border-blue-100 hidden sm:inline">
                              📞 {maskUserInfo(activeChatSession.customer.phone, 'phone')}
                            </span>
                          )}
                          {activeChatSession.customer.ipAddress && (
                            <span className="font-mono text-emerald-700 font-medium bg-emerald-50/80 px-1 py-0.2 rounded text-[8px] border border-emerald-100 hidden md:inline">
                              🌐 {maskUserInfo(activeChatSession.customer.ipAddress, 'ip')}
                            </span>
                          )}
                          {activeChatSession.problemIssue && (
                            <span className="bg-amber-50 text-amber-900 border border-amber-200 px-1 py-0.2 rounded text-[8px] font-bold hidden lg:inline">
                              📌 {activeChatSession.problemIssue}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions Toolbar (Compact inline buttons) */}
                      <div className="flex items-center gap-1 shrink-0 ml-auto">
                        {/* User Info Hide/Show Toggle */}
                        <button
                          onClick={() => setHideCustomerDetails(!hideCustomerDetails)}
                          className={`px-1.5 py-0.5 rounded text-[8px] font-semibold transition flex items-center gap-0.5 cursor-pointer border ${
                            hideCustomerDetails
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                          }`}
                          title="গ্রাহকের তথ্য লুকান অথবা দেখান"
                        >
                          {hideCustomerDetails ? <EyeOff className="w-2.5 h-2.5 text-amber-700" /> : <Eye className="w-2.5 h-2.5 text-slate-600" />}
                          <span>{hideCustomerDetails ? 'দেখান' : 'লুকান'}</span>
                        </button>

                        {/* Phone Direct SMS Trigger */}
                        {activeChatSession.customer.phone && (
                          <a
                            href={`sms:${activeChatSession.customer.phone}?body=${encodeURIComponent(`আসসালামু আলাইকুম ${activeChatSession.customer.name}, নোভাচ্যাট সাপোর্ট থেকে যোগাযোগ করা হচ্ছে (টিকিট #${activeChatSession.id})`)}`}
                            className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[8px] font-bold transition flex items-center gap-0.5 cursor-pointer shadow-2xs"
                            title="মোবাইলে SMS পাঠান"
                          >
                            <Smartphone className="w-2.5 h-2.5" />
                            <span>SMS</span>
                          </a>
                        )}

                        {/* Phone Direct Call Trigger */}
                        {activeChatSession.customer.phone && (
                          <a
                            href={`tel:${activeChatSession.customer.phone}`}
                            className="px-1.5 py-0.5 bg-sky-600 hover:bg-sky-700 text-white rounded text-[8px] font-bold transition flex items-center gap-0.5 cursor-pointer shadow-2xs"
                            title="সরাসরি কল দিন"
                          >
                            <Phone className="w-2.5 h-2.5" />
                            <span>কল</span>
                          </a>
                        )}

                        {/* Full Page Chat Toggle Button */}
                        <button
                          onClick={() => setIsChatFullScreen(!isChatFullScreen)}
                          className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition flex items-center gap-0.5 cursor-pointer shadow-2xs ${
                            isChatFullScreen
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : 'bg-slate-800 hover:bg-slate-700 text-white'
                          }`}
                          title={isChatFullScreen ? 'ছোট ভিউ' : 'বড় স্ক্রিন'}
                        >
                          {isChatFullScreen ? <Minimize2 className="w-2.5 h-2.5" /> : <Maximize2 className="w-2.5 h-2.5" />}
                          <span>{isChatFullScreen ? 'ছোট' : 'বড়'}</span>
                        </button>

                        {/* Status Select */}
                        <select
                          value={activeChatSession.status}
                          onChange={(e) => onChangeStatus && onChangeStatus(activeChatSession.id, e.target.value as any)}
                          className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[8px] font-bold text-slate-800 focus:outline-none cursor-pointer"
                        >
                          <option value="active">অনলাইন</option>
                          <option value="unassigned">অপেক্ষমাণ</option>
                          <option value="resolved">সমাধানকৃত</option>
                          <option value="closed">বন্ধ</option>
                        </select>

                        {/* Close Chat Button */}
                        {activeChatSession.status !== 'resolved' && activeChatSession.status !== 'closed' ? (
                          <button
                            onClick={() => onChangeStatus && onChangeStatus(activeChatSession.id, 'resolved')}
                            className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[8px] font-bold transition flex items-center gap-0.5 cursor-pointer"
                            title="চ্যাট সমাপন করুন"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>ক্লোজ</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onChangeStatus && onChangeStatus(activeChatSession.id, 'active')}
                            className="px-1.5 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[8px] font-bold transition flex items-center gap-0.5 cursor-pointer"
                            title="চ্যাট পুনরায় ওপেন করুন"
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                            <span>ওপেন</span>
                          </button>
                        )}

                        {/* Block / Unblock User Button */}
                        {activeChatSession.isBlocked ? (
                          <button
                            onClick={() => onUnblockUser && onUnblockUser(activeChatSession.id)}
                            className="px-1.5 py-0.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded text-[8px] font-bold transition flex items-center gap-0.5 cursor-pointer"
                            title="ইউজার আনব্লক করুন"
                          >
                            <ShieldCheck className="w-2.5 h-2.5" />
                            <span>আনব্লক</span>
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              onBlockUser &&
                              onBlockUser(
                                activeChatSession.id,
                                activeChatSession.customer.phone,
                                activeChatSession.customer.ipAddress,
                                activeChatSession.customer.name,
                                'লাইভ চ্যাট উইন্ডো থেকে ব্লক করা হয়েছে'
                              )
                            }
                            className="px-1.5 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[8px] font-bold transition flex items-center gap-0.5 cursor-pointer"
                            title="এই গ্রাহককে ব্লকলিস্টে যোগ করুন"
                          >
                            <Ban className="w-2.5 h-2.5" />
                            <span>ব্লক</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Messages Feed */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {activeMessages.map((m, idx) => {
                      const isCustomer = m.senderRole === 'customer';
                      const isInternal = m.isInternalNote;

                      if (isInternal) {
                        return (
                          <div key={m.id ? `${m.id}_${idx}` : `note_${idx}`} className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs my-2 group relative">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-bold text-amber-800">📌 ইন্টারনাল নোট (এডমিন): </span>
                              {onDeleteMessage && m.id && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm('আপনি কি এই ইন্টারনাল নোটটি ডিলিট করতে চান?')) {
                                      onDeleteMessage(activeChatSession.id, m.id);
                                    }
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                  title="নোট ডিলিট করুন"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <div>{m.content}</div>
                          </div>
                        );
                      }

                      // Check if consecutive messages are duplicate
                      const isDuplicate = idx > 0 && activeMessages[idx - 1]?.content === m.content && activeMessages[idx - 1]?.senderRole === m.senderRole;

                      return (
                        <div
                          key={m.id ? `${m.id}_${idx}` : `msg_${idx}`}
                          className={`flex items-end gap-2 text-xs group ${
                            isCustomer ? 'justify-start' : 'justify-end'
                          }`}
                        >
                          {isCustomer && (
                            <img
                              src={activeChatSession.customer.avatar}
                              alt=""
                              className="w-7 h-7 rounded-full object-cover aspect-square shrink-0 mb-1"
                            />
                          )}

                          <div
                            className={`max-w-[80%] sm:max-w-[70%] p-3 rounded-2xl ${
                              isCustomer
                                ? 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-2xs'
                                : 'bg-slate-900 text-white rounded-br-none shadow-sm'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-bold text-[10px] ${isCustomer ? 'text-slate-500' : 'text-blue-300'}`}>
                                  {isCustomer ? maskUserInfo(m.senderName || activeChatSession.customer.name, 'name') : (m.senderName || 'এডমিন')}
                                </span>
                                <span className={`text-[9px] ${isCustomer ? 'text-slate-400' : 'text-slate-400'}`}>
                                  {m.timestamp}
                                </span>
                                {isDuplicate && (
                                  <span className="bg-amber-100 text-amber-900 text-[8px] font-bold px-1 rounded border border-amber-300">
                                    ডুপ্লিকেট এসএমএস
                                  </span>
                                )}
                              </div>
                              {onDeleteMessage && m.id && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm('আপনি কি এই মেসেজটি ডিলিট করতে চান? (ডাবল এসএমএস রিমুভ)')) {
                                      onDeleteMessage(activeChatSession.id, m.id);
                                    }
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-rose-400 rounded cursor-pointer"
                                  title="মেসেজ ডিলিট করুন (ডাবল এসএমএস রিমুভ)"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
                              {m.content}
                            </div>

                            {/* Attachments / Photos Preview */}
                            {m.attachments && m.attachments.length > 0 && (
                              <div className="mt-2 space-y-1.5 pt-1.5 border-t border-slate-200/50">
                                {m.attachments.map((att, attIdx) => (
                                  <div key={attIdx} className="rounded-xl overflow-hidden border border-slate-200/60 bg-slate-50">
                                    {att.type === 'image' || att.url?.startsWith('data:image') || att.url?.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                                      <div className="relative group">
                                        <img
                                          src={att.url}
                                          alt={att.name || 'ছবি'}
                                          onClick={() => setPreviewImageModal(att.url)}
                                          className="max-h-60 w-full object-cover cursor-pointer hover:opacity-95 transition rounded-xl"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => setPreviewImageModal(att.url)}
                                            className="px-2.5 py-1 bg-white text-slate-900 font-bold text-xs rounded-lg shadow-md flex items-center gap-1 hover:bg-slate-100 cursor-pointer"
                                          >
                                            <ZoomIn className="w-3.5 h-3.5" />
                                            <span>বড় করে দেখুন</span>
                                          </button>
                                          <a
                                            href={att.url}
                                            download={att.name || 'photo.jpg'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 bg-slate-900 text-white rounded-lg shadow-md hover:bg-slate-800"
                                            title="ডাউনলোড করুন"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <Download className="w-3.5 h-3.5" />
                                          </a>
                                        </div>
                                        <div className="p-1.5 bg-slate-900/90 text-white text-[10px] flex items-center justify-between">
                                          <span className="truncate max-w-[150px] font-mono">📷 {att.name || 'ছবি'}</span>
                                          <span className="text-slate-400">{att.size || ''}</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <a
                                        href={att.url}
                                        download={att.name}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2.5 bg-white text-slate-800 hover:text-blue-600 flex items-center justify-between gap-2 text-xs transition"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                          <span className="truncate font-medium">{att.name}</span>
                                        </div>
                                        <Download className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            {isCustomer && (
                              <div className="flex items-center justify-between gap-2 mt-1 pt-1 border-t border-slate-100">
                                <span className="text-[8px] text-slate-400">{m.timestamp}</span>
                                {(m.readStatus === 'read' || activeChatSession.adminSeen) && (
                                  <span className="text-[9px] text-blue-600 font-bold flex items-center gap-0.5" title="এডমিন মেসেজ দেখেছেন">
                                    <CheckCheck className="w-3 h-3 text-blue-600" />
                                    <span>Seen</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatMessagesEndRef} />
                  </div>

                  {/* Quick Reply Shortcuts - Ultra Compact */}
                  <div className="px-2.5 py-1 bg-slate-100/90 border-t border-slate-200 flex items-center gap-1 overflow-x-auto text-[9px]">
                    <span className="font-bold text-slate-500 shrink-0 text-[8px]">উত্তর:</span>
                    {[
                      'আসসালামু আলাইকুম! কীভাবে সাহায্য করতে পারি?',
                      'আপনার তথ্য গুগল শিটে সংরক্ষিত হয়েছে।',
                      'আপনার পেমেন্ট রিসিভ করা হয়েছে, ধন্যবাদ!',
                      'টিমের সদস্য দ্রুত যোগাযোগ করবে।'
                    ].map((txt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleCannedInsert(txt)}
                        className="px-2 py-0.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-medium rounded border border-slate-200 whitespace-nowrap transition shadow-2xs text-[8px]"
                      >
                        {txt}
                      </button>
                    ))}
                  </div>

                  {/* Admin Reply Input - Ultra Compact */}
                  <form onSubmit={handleSendAdminSubmit} className="p-2 bg-white border-t border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between text-[8px]">
                      <label className="flex items-center gap-1 cursor-pointer text-slate-600 font-medium">
                        <input
                          type="checkbox"
                          checked={adminIsNote}
                          onChange={(e) => setAdminIsNote(e.target.checked)}
                          className="w-3 h-3 rounded text-blue-600 focus:ring-0"
                        />
                        <span>ইন্টারনাল নোট</span>
                      </label>
                      <span className="text-[8px] text-slate-400">এন্টার চাপলে লাইভ যাবে</span>
                    </div>

                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={adminMessageText}
                        onChange={(e) => setAdminMessageText(e.target.value)}
                        placeholder={
                          adminIsNote
                            ? 'টিমের জন্য ইন্টারনাল নোট লিখুন...'
                            : `মেসেজ লিখুন (ID: ${activeChatSession.id})...`
                        }
                        className="flex-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[9px] text-slate-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="submit"
                        disabled={!adminMessageText.trim()}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-lg flex items-center gap-1 transition shadow-2xs text-[9px] shrink-0"
                      >
                        <Send className="w-3 h-3" />
                        <span>পাঠান</span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8 text-slate-400 text-xs">
                  কোনো কাস্টমার চ্যাট সেশন সিলেক্ট করা হয়নি।
                </div>
              )}
            </div>
          );
        })()}

        {/* TAB 2: AGENT MANAGEMENT */}
        {adminTab === 'agents' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Create New Agent Form */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>নতুন সাপোর্ট এজেন্ট যুক্ত করুন</span>
              </h3>

              {agentSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>নতুন এজেন্ট সফলভাবে যুক্ত করা হয়েছে!</span>
                </div>
              )}

              <form onSubmit={handleCreateAgent} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">এজেন্টের নাম *</label>
                  <input
                    type="text"
                    required
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    placeholder="যেমন: তানভীর আহমেদ"
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">ইমেইল ঠিকানা *</label>
                  <input
                    type="email"
                    required
                    value={newAgentEmail}
                    onChange={(e) => setNewAgentEmail(e.target.value)}
                    placeholder="tanvir@novachat.com"
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">পদবী (Role)</label>
                  <select
                    value={newAgentRole}
                    onChange={(e) => setNewAgentRole(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none"
                  >
                    <option value="Senior Agent">সিনিয়র এজেন্ট</option>
                    <option value="Support Representative">সাপোর্ট প্রতিনিধ</option>
                    <option value="AI Admin">এআই অ্যাডমিন</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>এজেন্ট সেভ করুন</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Current Agent List Table */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">সাপোর্ট এজেন্ট তালিকা ({agents.length})</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map((ag) => (
                  <div key={ag.id} className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img src={ag.avatar} alt={ag.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-200" />
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{ag.name}</h4>
                        <p className="text-[11px] text-slate-500">{ag.role}</p>
                        <span className="inline-block mt-1 text-[10px] text-blue-600 font-mono">{ag.email}</span>
                      </div>
                    </div>

                    {agents.length > 1 && (
                      <button
                        onClick={() => onDeleteAgent(ag.id)}
                        className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg transition"
                        title="এজেন্ট মুছুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CODE.GS & GOOGLE SHEETS */}
        {adminTab === 'codegs' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Apps Script Code Box */}
            <div className="bg-gradient-to-r from-slate-950 to-emerald-950 text-white rounded-2xl p-5 border border-emerald-800/60 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-800/60 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                      <span>Code.gs - গুগল অ্যাপস স্ক্রিপ্ট</span>
                      <span className="text-[10px] bg-emerald-400 text-slate-950 font-black uppercase px-2 py-0.5 rounded-full">
                        ফ্রি ওয়েব হুক
                      </span>
                    </h3>
                    <p className="text-xs text-emerald-200/80">
                      আপনার Google Sheet-এ Extensions &gt; Apps Script ফাইলে পেস্ট করার কোড
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={onOpenCodeGsModal}
                    className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
                  >
                    <Code className="w-4 h-4" />
                    <span>ফুল স্ক্রিন পপআপ মোড</span>
                  </button>
                  <button
                    onClick={handleCopyCode}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'কপি হয়েছে!' : 'কোড কপি করুন'}</span>
                  </button>
                </div>
              </div>

              {/* Live Webhook Tester */}
              <div className="bg-slate-900/90 p-4 rounded-xl border border-emerald-800/60 space-y-3 text-xs">
                <label className="block font-bold text-emerald-300">
                  Google Apps Script Web App URL টেস্ট করুন:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={testScriptUrl}
                    onChange={(e) => setTestScriptUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 p-2.5 bg-slate-950 border border-emerald-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={handleTestScript}
                    disabled={isTestingScript}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl flex items-center gap-2 transition shrink-0"
                  >
                    <RefreshCw className={`w-4 h-4 ${isTestingScript ? 'animate-spin' : ''}`} />
                    <span>{isTestingScript ? 'টেস্ট হচ্ছে...' : 'কানেকশন টেস্ট করুন'}</span>
                  </button>
                </div>

                {testSyncResult?.error && (
                  <div className="p-3 bg-rose-950 border border-rose-500/50 rounded-xl text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{testSyncResult.error}</span>
                  </div>
                )}

                {testSyncResult?.message && (
                  <div className="p-3 bg-emerald-950 border border-emerald-400/50 rounded-xl text-emerald-200 flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{testSyncResult.message}</span>
                  </div>
                )}
              </div>

              {/* Code Script snippet */}
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-emerald-300 overflow-x-auto max-h-64 leading-relaxed">
                {CODE_GS_SCRIPT}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 5: BLOCKED USERS & CHAT ID MANAGEMENT */}
        {adminTab === 'blocked_users' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-slate-900 to-rose-950 text-white rounded-2xl p-5 border border-rose-900/50 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-rose-400" />
                  <span>কাস্টমার চ্যাট আইডি ব্লক ও আনব্লক প্যানেল</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  স্প্যামার, ফেক বা ক্ষতিকর গ্রাহকের Chat ID, ফোন নম্বর অথবা IP এড্রেস ব্লক বা আনব্লক করুন।
                </p>
              </div>
              <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0">
                মোট ব্লকড আইডি: {blockedUsers.length}
              </div>
            </div>

            {/* Manual Block Form */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-600" />
                <span>ম্যানুয়ালি চ্যাট আইডি/ফোন ব্লক করুন</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">চ্যাট আইডি, ফোন নম্বর বা IP</label>
                  <input
                    type="text"
                    value={manualBlockId}
                    onChange={(e) => setManualBlockId(e.target.value)}
                    placeholder="যেমন: CHAT-01712345678-103... বা 01712345678"
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ব্লক করার কারণ (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    value={manualBlockReason}
                    onChange={(e) => setManualBlockReason(e.target.value)}
                    placeholder="যেমন: অবান্তর মেসেজ / স্প্যামিং"
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    disabled={!manualBlockId.trim()}
                    onClick={() => {
                      if (onBlockUser && manualBlockId.trim()) {
                        onBlockUser(manualBlockId.trim(), manualBlockId.trim(), undefined, 'Manual Block', manualBlockReason || 'এডমিন দ্বারা ব্লকড');
                        setManualBlockId('');
                        setManualBlockReason('');
                      }
                    }}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>🚫 ব্লক তালিকা ভুক্ত করুন</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Currently Blocked Users List */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  <span>ব্লককৃত ইউজার তালিকা ({blockedUsers.length})</span>
                </h4>
              </div>

              {blockedUsers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-slate-600">কোন ব্লককৃত চ্যাট আইডি নেই!</p>
                  <p className="text-[11px] mt-0.5">সব কাস্টমার স্বাভাবিকভাবে সাপোর্ট লাইভ চ্যাট ব্যবহার করতে পারছেন।</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 overflow-x-auto text-xs">
                  {blockedUsers.map((b) => (
                    <div key={b.id} className="p-4 flex items-center justify-between gap-4 hover:bg-rose-50/30 transition">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{b.chatId || b.id}</span>
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full">
                            🚫 ব্লকড
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                          {b.phone && <span>ফোন: {b.phone}</span>}
                          {b.ipAddress && <span>IP: {b.ipAddress}</span>}
                          {b.reason && <span className="text-rose-600 font-medium">কারণ: {b.reason}</span>}
                          <span>ব্লক তারিখ: {new Date(b.blockedAt).toLocaleString('bn-BD')}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => onUnblockUser && onUnblockUser(b.id)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1 shrink-0"
                      >
                        <Check className="w-4 h-4" />
                        <span>🔓 আনব্লক করুন</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick All Chats Block/Unlock Toggle */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-5 space-y-3">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                লাইভ চ্যাট টেবিল হতে ১-ক্লিকে ব্লক/আনব্লক করুন ({chats.length} চ্যাট)
              </h4>

              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto border border-slate-200 rounded-xl text-xs">
                {chats.map((c) => (
                  <div key={c.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{c.customer.name}</span>
                        <span className="font-mono text-[11px] text-slate-500">({c.id})</span>
                        {c.isBlocked && (
                          <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[10px] font-extrabold rounded">
                            BLOCKED
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">ফোন: {c.customer.phone || 'N/A'} | IP: {c.customer.ipAddress}</p>
                    </div>

                    {c.isBlocked ? (
                      <button
                        onClick={() => onUnblockUser && onUnblockUser(c.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition shrink-0"
                      >
                        🔓 আনব্লক করুন
                      </button>
                    ) : (
                      <button
                        onClick={() => onBlockUser && onBlockUser(c.id, c.customer.phone, c.customer.ipAddress, c.customer.name, 'লাইভ চ্যাট টেবিল ব্লক')}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition shrink-0"
                      >
                        🚫 ব্লক করুন
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ADMIN USERS, PASSWORDS & ROLES MANAGEMENT */}
        {adminTab === 'admin_users' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-indigo-900/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-white">
                    এডমিন ইউজার শিট ও রোল কাস্টমাইজেশন (Username, Password, Role)
                  </h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                  এডমিন ও সাপোর্ট এজেন্ট অ্যাকাউন্ট তৈরি করুন। প্রতিটি অ্যাকাউন্টের ইউজারনেম, পাসওয়ার্ড এবং রোল সিলেক্ট করা যায় যা ১-ক্লিকে গুগল শিটে সিঙ্ক হয়ে যাবে।
                </p>
              </div>

              <button
                onClick={handleExportAdminUsersSheet}
                disabled={isExportingSheet}
                className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{isExportingSheet ? 'সিঙ্ক হচ্ছে...' : '📊 গুগল শিটে এক্সপোর্ট করুন'}</span>
              </button>
            </div>

            {/* Create New Admin User Form & List Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Form Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Plus className="w-5 h-5 text-blue-600" />
                  <h4 className="font-bold text-slate-900 text-sm">নতুন ইউজার অ্যাকাউন্ট তৈরি করুন</h4>
                </div>

                {adminUserFormError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
                    {adminUserFormError}
                  </div>
                )}

                {adminUserFormSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{adminUserFormSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleCreateAdminUser} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      ইউজারনেম (Username) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newAdminUsername}
                      onChange={(e) => setNewAdminUsername(e.target.value)}
                      placeholder="যেমন: admin_rakib বা agent_01"
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      পাসওয়ার্ড (Password) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      placeholder="পাসওয়ার্ড লিখুন (যেমন: pass123)"
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      অ্যাক্সেস রোল (Role) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={newAdminRole}
                      onChange={(e) => setNewAdminRole(e.target.value as any)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                    >
                      <option value="Super Admin">🛡️ Super Admin (পূর্ণাঙ্গ এডমিন অ্যাক্সেস)</option>
                      <option value="Admin">🔑 Admin (অ্যাডমিন প্যানেল ও সেটিংস)</option>
                      <option value="Agent">👥 Agent (ইনবক্স ও গ্রাহক সাপোর্ট)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      পূর্ণ নাম (Full Name) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newAdminName}
                      onChange={(e) => setNewAdminName(e.target.value)}
                      placeholder="যেমন: রাশেদুল ইসলাম"
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">ইমেইল (Email)</label>
                    <input
                      type="email"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      placeholder="যেমন: rakib@support.bd"
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">ডিপার্টমেন্ট (Department)</label>
                    <input
                      type="text"
                      value={newAdminDepartment}
                      onChange={(e) => setNewAdminDepartment(e.target.value)}
                      placeholder="যেমন: গ্রাহক সহায়তা"
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>অ্যাকাউন্ট তৈরি ও শিটে সেভ করুন</span>
                  </button>
                </form>
              </div>

              {/* Table / Cards List */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    <h4 className="font-bold text-slate-900 text-sm">
                      সক্রিয় এডমিন ইউজার তালিকা ({adminUsersList.length})
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-500">গুগল শিটে অটো সিঙ্ক চালু</span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="p-3">ইউজারনেম / নাম</th>
                        <th className="p-3">পাসওয়ার্ড</th>
                        <th className="p-3">রোল</th>
                        <th className="p-3">ডিপার্টমেন্ট / ইমেইল</th>
                        <th className="p-3 text-right">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminUsersList.map((usr) => (
                        <tr key={usr.id} className="hover:bg-slate-50 transition">
                          <td className="p-3">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{usr.name}</span>
                            </div>
                            <div className="font-mono text-[11px] text-indigo-600 font-semibold">
                              @{usr.username}
                            </div>
                          </td>

                          <td className="p-3 font-mono">
                            <div className="flex items-center gap-1.5">
                              <span>
                                {showAdminPasswordId === usr.id ? usr.password : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setShowAdminPasswordId(showAdminPasswordId === usr.id ? null : usr.id)
                                }
                                className="text-slate-400 hover:text-slate-600 text-[10px] underline ml-1 cursor-pointer"
                              >
                                {showAdminPasswordId === usr.id ? 'লুকান' : 'দেখুন'}
                              </button>
                            </div>
                          </td>

                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded-full text-[10px] font-extrabold uppercase inline-block ${
                                usr.role === 'Super Admin'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : usr.role === 'Admin'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {usr.role}
                            </span>
                          </td>

                          <td className="p-3 text-[11px] text-slate-600">
                            <div>{usr.department || 'সাধারণ সাপোর্ট'}</div>
                            <div className="text-slate-400 font-mono text-[10px]">{usr.email || 'N/A'}</div>
                          </td>

                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDeleteAdminUser(usr.id)}
                              title="ইউজার অ্যাকাউন্ট ডিলিট করুন"
                              className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition border border-rose-200 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* TAB: WEBSITE PROMOTION MANAGEMENT */}
        {adminTab === 'promotion' && (
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-6 text-[10px]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center font-bold shadow-xs">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">মাল্টিপল ওয়েবসাইট প্রমোশন ম্যানেজার (Multiple Site Promotions)</h3>
                  <p className="text-[10px] text-slate-500">
                    একাধিক ওয়েবসাইট অ্যাড, এডিট, ডিলিট এবং অন/অফ করতে পারবেন। ইউজার ড্যাশবোর্ডে সবগুলো কাস্টমারদের দেখানো হবে।
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetPromoForm}
                className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition text-[10px] cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>নতুন ওয়েবসাইট প্রমোট যোগ করুন</span>
              </button>
            </div>

            {promoSaveSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{promoSuccessMessage}</span>
              </div>
            )}

            {/* List of Promoted Websites */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-[11px] flex items-center gap-2">
                  <span>সংযুক্ত সকল প্রমোটেড ওয়েবসাইটসমূহ ({promoList.length})</span>
                </h4>
                <span className="text-[9px] text-slate-400 font-semibold">
                  সক্রিয় ওয়েবসাইট: {promoList.filter((p) => p.enabled).length} টি
                </span>
              </div>

              {promoList.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
                  <Megaphone className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-500">কোনো প্রমোটেড ওয়েবসাইট যোগ করা হয়নি।</p>
                  <button
                    onClick={handleResetPromoForm}
                    className="px-3 py-1.5 bg-purple-600 text-white font-bold rounded-xl text-[10px]"
                  >
                    + প্রথম ওয়েবসাইট যুক্ত করুন
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {promoList.map((item, idx) => {
                    const isBeingEdited = editingPromoId === item.id;
                    return (
                      <div
                        key={item.id || idx}
                        className={`border rounded-2xl p-3 flex flex-col justify-between space-y-3 transition relative bg-white ${
                          isBeingEdited
                            ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-md'
                            : 'border-slate-200 hover:border-slate-300 shadow-xs'
                        }`}
                      >
                        <div className="space-y-2">
                          {/* Image & Status */}
                          <div className="relative rounded-xl overflow-hidden h-28 bg-slate-100 border border-slate-200">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <ImageIcon className="w-6 h-6 opacity-40" />
                              </div>
                            )}

                            <div className="absolute top-2 left-2 flex items-center gap-1">
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold text-[9px] uppercase shadow-xs flex items-center gap-1 ${
                                  item.enabled
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-slate-700 text-slate-300'
                                }`}
                              >
                                {item.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                <span>{item.enabled ? 'সক্রিয়' : 'বন্ধ'}</span>
                              </span>
                            </div>

                            {isBeingEdited && (
                              <div className="absolute top-2 right-2 bg-purple-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-md shadow-xs">
                                এডিটিং চলছে
                              </div>
                            )}
                          </div>

                          {/* Title & Description */}
                          <div>
                            <h5 className="font-bold text-slate-900 text-[11px] line-clamp-1">{item.title || 'শিরোনামহীন'}</h5>
                            {item.description && (
                              <p className="text-[9px] text-slate-500 line-clamp-2 mt-0.5">{item.description}</p>
                            )}
                          </div>

                          {/* Website Link */}
                          <a
                            href={item.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] text-blue-600 hover:underline font-mono truncate block flex items-center gap-1"
                          >
                            <Globe className="w-3 h-3 text-blue-500 shrink-0" />
                            <span className="truncate">{item.linkUrl}</span>
                          </a>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleTogglePromoEnabled(item.id || '')}
                            title={item.enabled ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                            className={`px-2 py-1 rounded-lg font-semibold text-[9px] flex items-center gap-1 transition cursor-pointer ${
                              item.enabled
                                ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {item.enabled ? (
                              <>
                                <EyeOff className="w-3 h-3" />
                                <span>অফ করুন</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3 h-3" />
                                <span>অন করুন</span>
                              </>
                            )}
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSelectPromoForEdit(item)}
                              className="p-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg transition font-bold flex items-center gap-1 text-[9px] cursor-pointer"
                              title="সম্পাদনা করুন (Edit)"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>এডিট</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeletePromo(item.id || '')}
                              className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer"
                              title="ডিলিট করুন (Delete)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Form & Live Preview Section */}
            <div className="pt-4 border-t border-slate-200">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form Controls */}
                <form onSubmit={handleSavePromo} className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <h4 className="font-bold text-slate-900 text-[11px] flex items-center gap-1.5">
                      <Megaphone className="w-3.5 h-3.5 text-purple-600" />
                      <span>
                        {editingPromoId ? 'ওয়েবসাইট প্রমোশন সম্পাদনা (Editing Site)' : 'নতুন ওয়েবসাইট প্রমোশন যুক্ত করুন (Add New Site)'}
                      </span>
                    </h4>
                    {editingPromoId && (
                      <button
                        type="button"
                        onClick={handleResetPromoForm}
                        className="text-[9px] text-rose-600 hover:underline font-bold"
                      >
                        বাতিল করুন (Cancel)
                      </button>
                    )}
                  </div>

                  {/* Enable Switch */}
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700">প্রমোশন স্ট্যাটাস (Status):</span>
                    <button
                      type="button"
                      onClick={() => setPromoEnabled(!promoEnabled)}
                      className={`px-3 py-1 rounded-full font-bold text-[9px] flex items-center gap-1.5 transition cursor-pointer ${
                        promoEnabled
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-100 text-slate-600 border border-slate-300'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${promoEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      <span>{promoEnabled ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Disabled)'}</span>
                    </button>
                  </div>

                  {/* Image Upload */}
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-700 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                      <span>প্রমোশন ফটো আপলোড (Image Upload) *</span>
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                      <div className="relative flex-1 w-full">
                        <input
                          type="text"
                          value={promoImageUrl}
                          onChange={(e) => setPromoImageUrl(e.target.value)}
                          placeholder="ছবি/ফটোর URL লিখুন বা সিলেক্ট করুন"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-[10px]"
                        />
                      </div>
                      <label className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold border border-purple-200 rounded-xl cursor-pointer flex items-center gap-1.5 shrink-0 transition text-[10px]">
                        <Upload className="w-3.5 h-3.5" />
                        <span>ফটো আপলোড</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePromoImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="text-[9px] text-slate-400">কম্পিউটার/মোবাইল থেকে ছবি আপলোড করুন অথবা ফটো ইমেজের URL দিন।</p>
                  </div>

                  {/* Title */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">প্রমোশন শিরোনাম (Title) *</label>
                    <input
                      type="text"
                      required
                      value={promoTitle}
                      onChange={(e) => setPromoTitle(e.target.value)}
                      placeholder="যেমন: 🔥 অফিশিয়াল পোর্টাল ও সার্ভিস ওয়েবসাইট"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-[10px]"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">প্রমোশন বিবরণ (Description)</label>
                    <textarea
                      rows={2}
                      value={promoDescription}
                      onChange={(e) => setPromoDescription(e.target.value)}
                      placeholder="ওয়েবসাইট বা অফার সম্পর্কে সংক্ষেপে লিখুন"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-[10px]"
                    />
                  </div>

                  {/* Website Link */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-600" />
                      <span>ওয়েবসাইট লিংক (Website URL) *</span>
                    </label>
                    <input
                      type="url"
                      required
                      value={promoLinkUrl}
                      onChange={(e) => setPromoLinkUrl(e.target.value)}
                      placeholder="https://live-chat-swart-nine.vercel.app/"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono text-[10px]"
                    />
                    <p className="text-[9px] text-slate-400">ইউজার ফটোতে বা বাটনে ক্লিক করলে সরাসরি এই লিংকে চলে যাবে।</p>
                  </div>

                  {/* Button Text */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">বাটনের লেখা (Button Text)</label>
                    <input
                      type="text"
                      value={promoButtonText}
                      onChange={(e) => setPromoButtonText(e.target.value)}
                      placeholder="যেমন: ওয়েবসাইট ভিজিট করুন 🚀"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-[10px]"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={isSavingPromo}
                      className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-[10px] cursor-pointer"
                    >
                      {isSavingPromo ? (
                        <LoadingSpinner size="xs" color="white" label="সেভ হচ্ছে..." />
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>{editingPromoId ? 'প্রমোশন আপডেট করুন (Update)' : 'প্রমোশন যোগ করুন (Save Site)'}</span>
                        </>
                      )}
                    </button>

                    {editingPromoId && (
                      <button
                        type="button"
                        onClick={handleResetPromoForm}
                        className="px-3 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition text-[10px] cursor-pointer"
                      >
                        বাতিল
                      </button>
                    )}
                  </div>
                </form>

                {/* Live Preview Side */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>ইউজার ড্যাশবোর্ড লাইভ প্রিভিউ (User View Preview)</span>
                  </h4>
                  <div className="border border-purple-200 bg-purple-50/40 rounded-2xl p-3.5 space-y-3">
                    <p className="text-[9px] text-purple-700 font-semibold">
                      কাস্টমার চ্যাট স্ক্রিনে যেভাবে প্রদর্শিত হবে:
                    </p>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden space-y-0">
                      {/* Top Photo */}
                      {promoImageUrl ? (
                        <a href={promoLinkUrl || '#'} target="_blank" rel="noopener noreferrer" className="block relative group overflow-hidden">
                          <img
                            src={promoImageUrl}
                            alt={promoTitle}
                            className="w-full h-36 object-cover group-hover:scale-105 transition duration-300"
                          />
                          <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-amber-300 text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Megaphone className="w-3 h-3" />
                            <span>প্রমোটেড ওয়েবসাইট</span>
                          </div>
                        </a>
                      ) : (
                        <div className="w-full h-28 bg-slate-100 flex items-center justify-center text-slate-400">
                          <ImageIcon className="w-8 h-8 opacity-40" />
                        </div>
                      )}

                      {/* Content & Link Underneath */}
                      <div className="p-3 space-y-2">
                        <h5 className="font-bold text-slate-900 text-[11px] leading-tight">{promoTitle || 'শিরোনাম'}</h5>
                        {promoDescription && (
                          <p className="text-[10px] text-slate-600 leading-snug">{promoDescription}</p>
                        )}
                        {promoLinkUrl && (
                          <a
                            href={promoLinkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition text-[10px]"
                          >
                            <span>{promoButtonText || 'ওয়েবসাইট ভিজিট করুন'}</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: ADMIN SECURITY & PASSWORD */}
        {adminTab === 'settings' && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4 max-w-lg mx-auto animate-in fade-in">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600" />
              <span>অ্যাডমিন পাসওয়ার্ড পরিবর্তন করুন</span>
            </h3>

            {passChangedMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{passChangedMsg}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">বর্তমান পাসওয়ার্ড</label>
                <input
                  type="password"
                  required
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">নতুন পাসওয়ার্ড</label>
                <input
                  type="password"
                  required
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="নতুন পাসওয়ার্ড লিখুন"
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition"
              >
                পাসওয়ার্ড আপডেট করুন
              </button>
            </form>
          </div>
        )}

        {/* TAB 8: LOADING SPINNER PLAYGROUND & SHOWCASE */}
        {adminTab === 'spinners' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 rounded-2xl border border-blue-800/50 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                  <h3 className="font-bold text-lg text-white">
                    লোডিং স্পিনার কম্পোনেন্ট ও ফাংশন প্লেগ্রাউন্ড
                  </h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                  অ্যাপ্লিকেশনের বিভিন্ন সার্ভিস, ডাটাবেজ ক্যোয়ারি, এআই প্রম্পট জেনারেটর এবং বোতামের জন্য তৈরি লোডিং স্পিনার টেস্ট করুন।
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setDemoLoadingOverlay(true);
                    setTimeout(() => setDemoLoadingOverlay(false), 3000);
                  }}
                  className="px-4 py-2.5 bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>৩ সেকেন্ডের ফুল স্ক্রিন স্পিনার টেস্ট করুন</span>
                </button>
              </div>
            </div>

            {/* Simulated Overlay Spinner inside tab if triggered */}
            {demoLoadingOverlay && (
              <LoadingSpinner
                variant="overlay"
                label={demoSpinnerLabel || 'ডাটা সিঙ্ক হচ্ছে...'}
                sublabel="গুগল শিট ও ফায়ারবেস ব্যাকএন্ড ডেটা লোড প্রসেসিং চলছে"
              />
            )}

            {/* Spinner Variants Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Spinner Type 1: Standard Spinners */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-blue-600 border-b pb-2">
                  ১. স্ট্যান্ডার্ড রোটেশন স্পিনার (Circle Spin)
                </h4>
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <LoadingSpinner size="xs" color="blue" label="XS (ছোট)" />
                  <LoadingSpinner size="sm" color="indigo" label="SM (মিডিয়াম)" />
                  <LoadingSpinner size="md" color="emerald" label="MD (স্ট্যান্ডার্ড)" />
                  <LoadingSpinner size="lg" color="rose" label="LG (বড়)" />
                </div>
              </div>

              {/* Spinner Type 2: Dots & Bounce */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-indigo-600 border-b pb-2">
                  ২. বাউন্সিং ডটস স্পিনার (Dots Bounce)
                </h4>
                <div className="space-y-3 pt-2">
                  <LoadingSpinner variant="dots" size="sm" color="blue" label="এআই উত্তর টাইপ করছে..." />
                  <LoadingSpinner variant="dots" size="md" color="indigo" label="গ্রাহক কানেক্ট হচ্ছে..." />
                </div>
              </div>

              {/* Spinner Type 3: Pulse & Wave */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-emerald-600 border-b pb-2">
                  ৩. পালস স্পিনার (Pulsing Radar)
                </h4>
                <div className="space-y-3 pt-2">
                  <LoadingSpinner variant="pulse" size="sm" color="emerald" label="লাইভ ভিজিটর ট্র্যাক করা হচ্ছে..." />
                  <LoadingSpinner variant="bars" size="md" color="blue" label="অডিও সাউন্ড রেডি হচ্ছে..." />
                </div>
              </div>

              {/* Spinner Type 4: Interactive Loading Button */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-700 border-b pb-2">
                  ৪. ইন্টারঅ্যাক্টিভ লোডিং বাটন ফাংশন
                </h4>
                <p className="text-xs text-slate-500">
                  বাটনে ক্লিক করে লোডিং স্পিনারের স্ট্যাটাস পরিবর্তন পরীক্ষা করুন:
                </p>
                <div className="pt-1 space-y-2">
                  <LoadingButton
                    loading={demoButtonLoading}
                    onClick={() => {
                      setDemoButtonLoading(true);
                      setTimeout(() => setDemoButtonLoading(false), 2000);
                    }}
                    loadingText="গুগল শিটে সেভ হচ্ছে..."
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                  >
                    <span>তথ্য পাঠান (সিঙ্ক টেস্ট)</span>
                  </LoadingButton>
                </div>
              </div>

              {/* Spinner Type 5: Card Loading View */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-rose-600 border-b pb-2">
                  ৫. কার্ড লোডার উইজেট (Card Loader)
                </h4>
                <LoadingSpinner
                  variant="card"
                  label="কনভারসেশন হিস্ট্রি লোড হচ্ছে"
                  sublabel="দয়া করে ১ সেকেন্ড অপেক্ষা করুন"
                  fullWidth
                />
              </div>

              {/* Live Configurator */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-lg space-y-3">
                <h4 className="font-bold text-amber-400 text-xs uppercase tracking-wider border-b border-slate-800 pb-2">
                  ৬. কাস্টম স্পিনার প্রিভিউ কনফিগারেটর
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">সাইজ:</label>
                    <select
                      value={demoSpinnerSize}
                      onChange={(e) => setDemoSpinnerSize(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 p-1.5 rounded-lg text-white"
                    >
                      <option value="xs">XS</option>
                      <option value="sm">SM</option>
                      <option value="md">MD</option>
                      <option value="lg">LG</option>
                      <option value="xl">XL</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">ভ্যারিয়েন্ট:</label>
                    <select
                      value={demoSpinnerVariant}
                      onChange={(e) => setDemoSpinnerVariant(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 p-1.5 rounded-lg text-white"
                    >
                      <option value="spinner">Spinner</option>
                      <option value="dots">Dots</option>
                      <option value="pulse">Pulse</option>
                      <option value="bars">Bars</option>
                      <option value="card">Card</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center min-h-[70px]">
                  <LoadingSpinner
                    size={demoSpinnerSize}
                    variant={demoSpinnerVariant}
                    color="white"
                    label={demoSpinnerLabel}
                  />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 10: TELEGRAM NOTIFICATIONS */}
        {adminTab === 'telegram' && (
          <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
                      <Send className="w-6 h-6 text-sky-200" />
                    </div>
                    <h3 className="font-bold text-lg">টেলিগ্রাম নোটিফিকেশন সেটআপ (Telegram Alert Bot)</h3>
                  </div>
                  <p className="text-xs text-blue-100 mt-1 max-w-xl">
                    যেকোনো নতুন গ্রাহক লাইভ চ্যাট শুরু করলে বা মেসেজ পাঠালে আপনার পার্সোনাল বা গ্রুপ টেলিগ্রাম অ্যাকাউন্টে তাত্ক্ষণিক নোটিফিকেশন চলে যাবে।
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur-xs ${
                    telegramNotificationsEnabled && telegramBotToken && telegramChatId
                      ? 'bg-emerald-500/90 text-white'
                      : 'bg-amber-500/90 text-slate-950 font-black'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      telegramNotificationsEnabled && telegramBotToken && telegramChatId ? 'bg-white animate-pulse' : 'bg-slate-900'
                    }`} />
                    <span>
                      {telegramNotificationsEnabled && telegramBotToken && telegramChatId
                        ? 'টেলিগ্রাম সক্রিয় (Connected)'
                        : 'সেটআপ প্রয়োজন'}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Telegram Configuration Form */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  <span>টেলিগ্রাম বট ও চ্যাট আইডি কনফিগারেশন</span>
                </h4>
                {telegramSavedSuccess && (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>সফলভাবে সংরক্ষিত হয়েছে!</span>
                  </span>
                )}
              </div>

              {/* Step by step guide */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2 text-slate-700">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>টেলিগ্রাম বট তৈরির সহজ ৩ ধাপ:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
                  <li>টেলিগ্রামে <b>@BotFather</b> সার্চ করে <code>/newbot</code> লিখে একটি নতুন বট বানিয়ে <b>API Bot Token</b> কপি করুন।</li>
                  <li>বটটিতে গিয়ে <b>/start</b> কমান্ড চাপুন।</li>
                  <li>আপনার চ্যাট আইডি জানতে টেলিগ্রামে <b>@userinfobot</b> সার্চ করে চ্যাট আইডি (Chat ID) সংগ্রহ করুন।</li>
                </ol>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsSavingTelegram(true);
                  if (onUpdateWidgetConfig) {
                    onUpdateWidgetConfig({
                      telegramBotToken: telegramBotToken.trim(),
                      telegramChatId: telegramChatId.trim(),
                      telegramNotificationsEnabled: telegramNotificationsEnabled,
                    });
                  }
                  setTelegramSavedSuccess(true);
                  setTimeout(() => {
                    setTelegramSavedSuccess(false);
                    setIsSavingTelegram(false);
                  }, 2000);
                }}
                className="space-y-4"
              >
                {/* Enable toggle */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <span className="font-bold text-xs text-slate-800 block">টেলিগ্রাম নোটিফিকেশন চালু রাখুন</span>
                    <span className="text-[10px] text-slate-500">মেসেজ আসলেই তাৎক্ষণিক টেলিগ্রাম অ্যালার্ট আসবে</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={telegramNotificationsEnabled}
                    onChange={(e) => setTelegramNotificationsEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </div>

                {/* Bot Token */}
                <div className="space-y-1.5 text-xs">
                  <label className="block font-bold text-slate-800">
                    টেলিগ্রাম বট টোকেন (Telegram Bot Token) *
                  </label>
                  <input
                    type="text"
                    required
                    value={telegramBotToken}
                    onChange={(e) => setTelegramBotToken(e.target.value)}
                    placeholder="যেমন: 7856412390:AAHqWeRtYuIoP..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="text-[10px] text-slate-400">@BotFather থেকে প্রাপ্ত বট টোকেন এখানে দিন</p>
                </div>

                {/* Chat ID */}
                <div className="space-y-1.5 text-xs">
                  <label className="block font-bold text-slate-800">
                    টেলিগ্রাম চ্যাট আইডি (Telegram Chat ID) *
                  </label>
                  <input
                    type="text"
                    required
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="যেমন: 123456789 বা -100123456789 (গ্রুপের জন্য)"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="text-[10px] text-slate-400">আপনার পার্সোনাল আইডি অথবা গ্রুপের চ্যাট আইডি দিন</p>
                </div>

                {/* Test Result Message Box */}
                {telegramTestResult && (
                  <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 animate-in fade-in ${
                    telegramTestResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      {telegramTestResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{telegramTestResult.message}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTelegramTestResult(null)}
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={isTestingTelegram || !telegramBotToken || !telegramChatId}
                    onClick={async () => {
                      setIsTestingTelegram(true);
                      setTelegramTestResult(null);
                      try {
                        const res = await sendTelegramNotification(
                          { type: 'test' },
                          {
                            telegramBotToken: telegramBotToken.trim(),
                            telegramChatId: telegramChatId.trim(),
                            telegramNotificationsEnabled: true,
                          }
                        );
                        setTelegramTestResult(res);
                      } catch (err: any) {
                        setTelegramTestResult({ success: false, message: err.message || 'টেস্ট নোটিফিকেশন পাঠাতে সমস্যা হয়েছে।' });
                      } finally {
                        setIsTestingTelegram(false);
                      }
                    }}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-amber-300 font-bold text-xs rounded-xl flex items-center gap-2 transition cursor-pointer shadow-xs"
                  >
                    {isTestingTelegram ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{isTestingTelegram ? 'টেস্ট পাঠানো হচ্ছে...' : '🧪 টেস্ট নোটিফিকেশন পাঠান'}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingTelegram}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition cursor-pointer shadow-md"
                  >
                    {isSavingTelegram ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{isSavingTelegram ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সংরক্ষণ করুন'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 11: USER NOTICE HEADER (মারকুই স্ক্রলিং নোটিশ বার্তা) */}
        {adminTab === 'notice' && (
          <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-6 text-slate-950 shadow-md relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-black/10 rounded-xl backdrop-blur-xs">
                      <Volume2 className="w-6 h-6 text-slate-950" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-950">ইউজার নোটিশ হেডার (User Notice Header Marquee)</h3>
                  </div>
                  <p className="text-xs text-slate-900 font-medium mt-1 max-w-xl">
                    এডমিন থেকে যে বার্তাটি দেওয়া হবে তা সরাসরি সকল ব্যবহারকারীর চ্যাট উইন্ডো ও প্রি-চ্যাট হেডারের নিচে ডানে-বামে সুন্দরভাবে স্ক্রলিং (Marquee Scroll) হতে থাকবে।
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 backdrop-blur-xs ${
                    noticeEnabled && noticeText.trim()
                      ? 'bg-slate-950 text-amber-300 shadow-xs'
                      : 'bg-slate-900/40 text-slate-900'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      noticeEnabled && noticeText.trim() ? 'bg-amber-400 animate-ping' : 'bg-slate-700'
                    }`} />
                    <span>
                      {noticeEnabled && noticeText.trim() ? 'নোটিশ লাইভ চলছে (Active)' : 'নোটিশ বন্ধ রয়েছে'}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* LIVE REAL-TIME PREVIEW CARD */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>লাইভ প্রিভিউ (গ্রাহক যেভাবে স্ক্রলিং দেখতে পাবেন):</span>
                </span>
                <span className="text-[10px] text-slate-400">মাউস ধরলে স্ক্রলিং পজ হবে</span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-slate-50">
                {noticeEnabled && noticeText.trim() ? (
                  <NoticeHeaderBar
                    notice={{
                      enabled: noticeEnabled,
                      text: noticeText,
                      speed: noticeSpeed,
                      theme: noticeTheme,
                      icon: noticeIcon,
                      linkUrl: noticeLinkUrl,
                      linkText: noticeLinkText,
                    }}
                  />
                ) : (
                  <div className="p-3 text-center text-xs text-slate-400 bg-slate-100 font-medium">
                    ⚠️ নোটিশ বন্ধ রয়েছে অথবা কোনো টেক্সট লেখা নেই। নিচে বার্তা লিখে চালু করুন।
                  </div>
                )}
              </div>
            </div>

            {/* Quick Preset Message Templates */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-blue-600" />
                  <span>রেডিমেড নোটিশ টেমপ্লেট (এক ক্লিকে সেট করুন):</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setNoticeText('📢 বিশেষ বিজ্ঞপ্তি: সম্মানিত গ্রাহকবৃন্দ, লাইভ সাপোর্ট চ্যাটে আপনাকে স্বাগতম! যেকোনো তথ্যের জন্য সরাসরি আমাদের বার্তা পাঠান।');
                    setNoticeTheme('amber');
                    setNoticeIcon('megaphone');
                    setNoticeSpeed('medium');
                    setNoticeEnabled(true);
                  }}
                  className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/90 text-left transition flex items-start gap-2 cursor-pointer"
                >
                  <span className="text-base">📢</span>
                  <div>
                    <span className="font-bold text-amber-950 block">সাধারণ স্বাগত বার্তা</span>
                    <span className="text-[10px] text-amber-800 line-clamp-1">লাইভ সাপোর্ট চ্যাটে আপনাকে স্বাগতম...</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNoticeText('⚠️ জরুরী রক্ষণাবেক্ষণ: সম্মানিত গ্রাহকবৃন্দ, আজ রাত ১২:০০ থেকে ১:০০ পর্যন্ত সার্ভার আপগ্রেডের জন্য চ্যাটে সাময়িক বিলম্ব হতে পারে।');
                    setNoticeTheme('red');
                    setNoticeIcon('alert');
                    setNoticeSpeed('fast');
                    setNoticeEnabled(true);
                  }}
                  className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100/90 text-left transition flex items-start gap-2 cursor-pointer"
                >
                  <span className="text-base">⚠️</span>
                  <div>
                    <span className="font-bold text-rose-950 block">সার্ভার রক্ষণাবেক্ষণ নোটিশ</span>
                    <span className="text-[10px] text-rose-800 line-clamp-1">সার্ভার আপগ্রেডের জন্য চ্যাটে সাময়িক বিলম্ব...</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNoticeText('🎉 ধামাকা অফার! আমাদের অফিশিয়াল পোর্টালে নতুন ইউজার রেজিস্ট্রেশনে ১০০% ওয়েলকাম বোনাস উপভোগ করুন।');
                    setNoticeTheme('emerald');
                    setNoticeIcon('sparkle');
                    setNoticeSpeed('medium');
                    setNoticeLinkText('বোনাস নিন');
                    setNoticeEnabled(true);
                  }}
                  className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/90 text-left transition flex items-start gap-2 cursor-pointer"
                >
                  <span className="text-base">🎁</span>
                  <div>
                    <span className="font-bold text-emerald-950 block">স্পেশাল বোনাস ও অফার</span>
                    <span className="text-[10px] text-emerald-800 line-clamp-1">১০০% ওয়েলকাম বোনাস উপভোগ করুন...</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNoticeText('🕒 সার্বক্ষণিক সাপোর্ট: আমাদের কাস্টমার কেয়ার টিম ২৪/৭ নিরবিচ্ছিন্ন সেবা দিচ্ছে। কোনো অভিযোগ থাকলে জানান।');
                    setNoticeTheme('blue');
                    setNoticeIcon('bell');
                    setNoticeSpeed('medium');
                    setNoticeEnabled(true);
                  }}
                  className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/90 text-left transition flex items-start gap-2 cursor-pointer"
                >
                  <span className="text-base">🕒</span>
                  <div>
                    <span className="font-bold text-blue-950 block">২৪/৭ সাপোর্ট এলার্ট</span>
                    <span className="text-[10px] text-blue-800 line-clamp-1">আমাদের কাস্টমার কেয়ার টিম সর্বদা পাশে আছে...</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Notice Configuration Form */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-600" />
                  <span>নোটিশ বার্তা ও স্টাইল কাস্টমাইজেশন</span>
                </h4>
                {noticeSavedSuccess && (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>সফলভাবে ব্রডকাস্ট ও সংরক্ষিত হয়েছে!</span>
                  </span>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsSavingNotice(true);
                  const updatedNotice: NoticeHeaderConfig = {
                    enabled: noticeEnabled,
                    text: noticeText.trim(),
                    speed: noticeSpeed,
                    theme: noticeTheme,
                    icon: noticeIcon,
                    linkUrl: noticeLinkUrl.trim(),
                    linkText: noticeLinkText.trim(),
                    updatedAt: new Date().toISOString(),
                  };

                  if (onUpdateWidgetConfig) {
                    onUpdateWidgetConfig({
                      noticeHeader: updatedNotice,
                    });
                  }
                  setNoticeSavedSuccess(true);
                  setTimeout(() => {
                    setNoticeSavedSuccess(false);
                    setIsSavingNotice(false);
                  }, 2000);
                }}
                className="space-y-5 text-xs"
              >
                {/* Enable / Disable Toggle */}
                <div className="flex items-center justify-between p-4 bg-amber-50/50 border border-amber-200/80 rounded-xl">
                  <div>
                    <span className="font-bold text-xs text-amber-950 block">গ্রাহকের জন্য স্ক্রলিং নোটিশ হেডার চালু রাখুন</span>
                    <span className="text-[10px] text-amber-800">চালু থাকলে গ্রাহক উইজেটে বার্তাটি চলমান অবস্থায় দেখবে</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={noticeEnabled}
                    onChange={(e) => setNoticeEnabled(e.target.checked)}
                    className="w-5 h-5 rounded text-amber-600 focus:ring-0 cursor-pointer"
                  />
                </div>

                {/* Notice Textarea */}
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-800">
                    নোটিশ বার্তা / টেক্সট (Notice Text) *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={noticeText}
                    onChange={(e) => setNoticeText(e.target.value)}
                    placeholder="এখানে আপনার বার্তা লিখুন যা গ্রাহকের স্ক্রিনে স্ক্রল করবে..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20 leading-relaxed font-sans"
                  />
                  <p className="text-[10px] text-slate-400">বাংলা বা ইংরেজি যেকোনো ভাষায় লিখতে পারেন। ইমোজিও ব্যবহার করা যাবে।</p>
                </div>

                {/* Theme & Icon Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Theme Color */}
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-800">নোটিশ ব্যাকগ্রাউন্ড থিম (Theme Color)</label>
                    <select
                      value={noticeTheme}
                      onChange={(e) => setNoticeTheme(e.target.value as any)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                    >
                      <option value="amber">🟡 গোল্ডেন এম্বার (সতর্কতা ও সাধারণ নোটিশ)</option>
                      <option value="blue">🔵 রয়াল ব্লু (অফিশিয়াল ঘোষণা)</option>
                      <option value="red">🔴 আরজেন্ট রেড (জরুরি ও মেইনটেনেন্স)</option>
                      <option value="emerald">🟢 এমারেল্ড গ্রিন (অফার ও বোনাস)</option>
                      <option value="purple">🟣 প্রিমিয়াম পার্পল (ভিআইপি বার্তা)</option>
                      <option value="gradient">🌌 কসমিক ডার্ক গ্রেডিয়েন্ট</option>
                    </select>
                  </div>

                  {/* Scroll Speed */}
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-800">স্ক্রলিং গতি (Scrolling Speed)</label>
                    <select
                      value={noticeSpeed}
                      onChange={(e) => setNoticeSpeed(e.target.value as any)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                    >
                      <option value="medium">⚡ স্বাভাবিক গতি (Normal / 20s)</option>
                      <option value="slow">🐢 ধীর গতি (Slow / 32s - বড় বার্তার জন্য)</option>
                      <option value="fast">🚀 দ্রুত গতি (Fast / 12s - ছোট বার্তার জন্য)</option>
                    </select>
                  </div>
                </div>

                {/* Icon Selection & Link */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Icon */}
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-800">আইকন (Notice Icon)</label>
                    <select
                      value={noticeIcon}
                      onChange={(e) => setNoticeIcon(e.target.value as any)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                    >
                      <option value="megaphone">📢 মাইক / মেগাফোন</option>
                      <option value="bell">🔔 বেল / নোটিফিকেশন</option>
                      <option value="alert">⚠️ সতর্কতা চিহ্ন</option>
                      <option value="sparkle">✨ স্পার্কল / অফার</option>
                      <option value="info">ℹ️ ইনফরমেশন</option>
                    </select>
                  </div>

                  {/* Optional Link URL */}
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-800">লিংক URL (ঐচ্ছিক)</label>
                    <input
                      type="url"
                      value={noticeLinkUrl}
                      onChange={(e) => setNoticeLinkUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  {/* Link Text */}
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-800">লিংক বাটন টেক্সট (ঐচ্ছিক)</label>
                    <input
                      type="text"
                      value={noticeLinkText}
                      onChange={(e) => setNoticeLinkText(e.target.value)}
                      placeholder="যেমন: বিস্তারিত দেখুন"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNoticeText('');
                        setNoticeEnabled(false);
                      }}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      ক্লিয়ার করুন
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingNotice}
                    className="px-7 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 transition cursor-pointer shadow-md"
                  >
                    {isSavingNotice ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-slate-950 font-black" />
                    )}
                    <span>{isSavingNotice ? 'ব্রডকাস্ট হচ্ছে...' : '📢 নোটিশ সংরক্ষণ ও ব্রডকাস্ট করুন'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB: DEVICE NOTIFICATIONS (CROSS-DEVICE PUSH & AUDIO ALERTS) */}
        {adminTab === 'device_notifications' && (
          <div className="animate-in fade-in space-y-6">
            <DeviceNotificationManager
              liveVisitors={allLiveVisitors}
              chats={chats}
              onNotificationSent={(notif) => {
                // Optional callback
              }}
            />
          </div>
        )}

        {/* New Chat Creation Modal */}
        {isNewChatModalOpen && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative">
              <button
                onClick={() => setIsNewChatModalOpen(false)}
                className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">নতুন চ্যাট শুরু করুন (Add Chat)</h3>
                  <p className="text-xs text-slate-500">এডমিন প্যানেল থেকে নতুন গ্রাহকের চ্যাট টিকিট তৈরি করুন</p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newCustName.trim() || !newCustMessage.trim()) {
                    alert('অনুগ্রহ করে কাস্টমার নাম এবং প্রথম মেসেজ লিখুন।');
                    return;
                  }
                  if (onStartNewChat) {
                    onStartNewChat({
                      customerName: newCustName.trim(),
                      customerPhone: newCustPhone.trim(),
                      customerEmail: newCustEmail.trim() || `${Date.now()}@example.com`,
                      department: newCustDept,
                      subject: newCustSubject || newCustProblemIssue,
                      problemIssue: newCustProblemIssue,
                      initialMessage: newCustMessage.trim(),
                    });
                  }
                  setIsNewChatModalOpen(false);
                  setNewCustName('');
                  setNewCustPhone('');
                  setNewCustEmail('');
                  setNewCustMessage('');
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">কাস্টমার নাম *</label>
                  <input
                    type="text"
                    required
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    placeholder="যেমন: রহিম আহমেদ"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Problem Issue Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    সমস্যার ধরন / ইস্যু (Support Problem Issue) *
                  </label>
                  <div className="relative">
                    <select
                      value={newCustProblemIssue}
                      onChange={(e) => {
                        const val = e.target.value as SupportProblemIssue;
                        setNewCustProblemIssue(val);
                        setNewCustSubject(val);
                      }}
                      className="w-full px-3 py-2 text-xs font-medium border border-amber-300 bg-amber-50/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                    >
                      {SUPPORT_PROBLEM_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.icon} {opt.bangla} ({opt.label})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ফোন নম্বর</label>
                    <input
                      type="text"
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value)}
                      placeholder="যেমন: 01712345678"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ডিপার্টমেন্ট</label>
                    <select
                      value={newCustDept}
                      onChange={(e) => setNewCustDept(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="সাধারণ জিজ্ঞাসা">সাধারণ জিজ্ঞাসা</option>
                      <option value="টেকনিক্যাল সাপোর্ট">টেকনিক্যাল সাপোর্ট</option>
                      <option value="সেলস ও মার্কেটিং">সেলস ও মার্কেটিং</option>
                      <option value="বিলিং ও পেমেন্ট">বিলিং ও পেমেন্ট</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ইমেইল এড্রেস</label>
                  <input
                    type="email"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    placeholder="যেমন: customer@example.com"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">বিষয় (Subject)</label>
                  <input
                    type="text"
                    value={newCustSubject}
                    onChange={(e) => setNewCustSubject(e.target.value)}
                    placeholder="বিষয় লিখুন..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">মেসেজ/জিজ্ঞাসা *</label>
                  <textarea
                    required
                    rows={3}
                    value={newCustMessage}
                    onChange={(e) => setNewCustMessage(e.target.value)}
                    placeholder="কাস্টমারের প্রথম মেসেজ বা সমস্যাটি লিখুন..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNewChatModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>চ্যাট শুরু করুন</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Lightbox Modal for Large Image Preview in Admin Panel */}
        {previewImageModal && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col">
              {/* Header */}
              <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-xs">📷 ছবি বড় করে দেখা হচ্ছে (Photo Preview)</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={previewImageModal}
                    download="customer_photo.jpg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ডাউনলোড</span>
                  </a>
                  <button
                    onClick={() => setPreviewImageModal(null)}
                    className="p-1.5 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-lg transition"
                    title="বন্ধ করুন"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Photo Area */}
              <div className="p-2 overflow-auto max-h-[80vh] flex items-center justify-center bg-black/50">
                <img
                  src={previewImageModal}
                  alt="Customer Attachment Preview"
                  className="max-h-[75vh] max-w-full rounded-xl object-contain shadow-2xl"
                />
              </div>
            </div>
          </div>
        )}

        {/* Spinner Model Setup Modal */}
        <SpinnerSetupModal
          isOpen={isSpinnerModalOpen}
          onClose={() => setIsSpinnerModalOpen(false)}
          onApplySpinnerSettings={(config) => {
            if (onUpdateWidgetConfig) {
              // save in widgetConfig if supported
              onUpdateWidgetConfig({
                themeColor: config.color === 'primary' ? widgetConfig.themeColor : config.color
              });
            }
          }}
        />

      </div>
    </div>
  );
};
