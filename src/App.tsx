import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { CustomerChatWidget } from './components/CustomerWidget/CustomerChatWidget';
import { WidgetEmbedModal } from './components/CustomerWidget/WidgetEmbedModal';
import { StorefrontPreview } from './components/StorefrontPreview';
import { ConversationList } from './components/AgentWorkspace/ConversationList';
import { AgentChatArea } from './components/AgentWorkspace/AgentChatArea';
import { CustomerSidebar } from './components/AgentWorkspace/CustomerSidebar';
import { LiveVisitorsTab } from './components/AgentWorkspace/LiveVisitorsTab';
import { CannedResponsesTab } from './components/AgentWorkspace/CannedResponsesTab';
import { WidgetSettings } from './components/Settings/WidgetSettings';
import { AdminPanel } from './components/Admin/AdminPanel';
import { CodeGsModal } from './components/Admin/CodeGsModal';
import { DeviceNotificationToast } from './components/CustomerWidget/DeviceNotificationToast';
import { ShieldCheck, Lock, KeyRound, X, User, Bell, RefreshCw } from 'lucide-react';
import {
  ChatSession,
  ChatMessage,
  Agent,
  CannedResponse,
  LiveVisitor,
  WidgetConfig,
  BlockedUser,
  DeviceNotification
} from './types';
import {
  INITIAL_AGENTS,
  INITIAL_CHATS,
  INITIAL_MESSAGES,
  INITIAL_CANNED_RESPONSES,
  INITIAL_LIVE_VISITORS,
  INITIAL_WIDGET_CONFIG
} from './data/mockData';
import {
  syncChatToFirestore,
  syncMessageToFirestore,
  syncTypingStatusToFirestore,
  syncBlockedUserToFirestore,
  deleteBlockedUserFromFirestore,
  deleteChatFromFirestore,
  syncWidgetConfigToFirestore,
  loadFirestoreData,
  setupFirestoreRealtimeListeners,
  authenticateAdminWithFirestore,
  markChatAsSeenByAdminInFirestore,
  deleteMessageFromFirestore
} from './lib/firestoreSync';
import { sendTelegramNotification } from './lib/telegramNotify';
import { getOrCreatePersistentCustomerId, saveCustomerProfile } from './lib/visitorIdentity';
import {
  startVisitorTracker,
  recordChatInitiation,
  getVisitorPathHistory,
  recordVisitorPageVisit
} from './lib/visitorTracker';

export default function App() {
  const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes inactivity timeout

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const auth = localStorage.getItem('novachat_admin_auth') === 'true';
    if (!auth) return false;
    
    // Check if session has expired after 30 minutes of inactivity
    const lastActiveStr = localStorage.getItem('novachat_admin_last_activity');
    if (lastActiveStr) {
      const lastActive = parseInt(lastActiveStr, 10);
      if (!isNaN(lastActive) && Date.now() - lastActive > 30 * 60 * 1000) {
        localStorage.removeItem('novachat_admin_auth');
        localStorage.removeItem('novachat_admin_profile');
        localStorage.removeItem('novachat_admin_user');
        localStorage.removeItem('novachat_admin_last_activity');
        return false;
      }
    }
    return true;
  });

  const [currentUser, setCurrentUser] = useState<{ id?: string; username?: string; name?: string; role?: string; email?: string } | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem('novachat_admin_profile') || localStorage.getItem('novachat_admin_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  const isAgentRole = currentUser?.role === 'Agent' || currentUser?.username === 'zoha366' || currentUser?.username === 'arif' || currentUser?.username === 'tanvir';

  const [activeTab, setActiveTab] = useState<'widget_preview' | 'agent_workspace' | 'visitors' | 'canned' | 'settings' | 'admin'>(() => {
    if (typeof window === 'undefined') return 'widget_preview';
    const auth = localStorage.getItem('novachat_admin_auth') === 'true';
    const lastActiveStr = localStorage.getItem('novachat_admin_last_activity');
    if (auth && lastActiveStr) {
      const lastActive = parseInt(lastActiveStr, 10);
      if (!isNaN(lastActive) && Date.now() - lastActive > 30 * 60 * 1000) {
        return 'widget_preview';
      }
    }
    if (auth) {
      try {
        const saved = localStorage.getItem('novachat_admin_profile') || localStorage.getItem('novachat_admin_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.role === 'Agent' || parsed.username === 'zoha366' || parsed.username === 'arif' || parsed.username === 'tanvir') {
            return 'agent_workspace';
          }
        }
      } catch (e) {}
      return 'admin';
    }
    return 'widget_preview';
  });

  // Track Admin Activity & Auto Logout after 30 Minutes of Inactivity
  useEffect(() => {
    if (!isAdminLoggedIn) return;

    const recordActivity = () => {
      try {
        localStorage.setItem('novachat_admin_last_activity', Date.now().toString());
      } catch (e) {}
    };

    // Ensure last activity is recorded upon login
    if (!localStorage.getItem('novachat_admin_last_activity')) {
      recordActivity();
    }

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    
    // Throttle activity updates to once every 5 seconds to reduce localStorage writes
    let lastThrottledTime = 0;
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastThrottledTime > 5000) {
        lastThrottledTime = now;
        recordActivity();
      }
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Check inactivity every 10 seconds
    const intervalId = setInterval(() => {
      const lastActiveStr = localStorage.getItem('novachat_admin_last_activity');
      if (lastActiveStr) {
        const lastActive = parseInt(lastActiveStr, 10);
        if (!isNaN(lastActive)) {
          const elapsed = Date.now() - lastActive;
          if (elapsed >= INACTIVITY_TIMEOUT_MS) {
            // Auto logout triggered due to 30 minutes inactivity
            setIsAdminLoggedIn(false);
            setCurrentUser(null);
            localStorage.removeItem('novachat_admin_auth');
            localStorage.removeItem('novachat_admin_profile');
            localStorage.removeItem('novachat_admin_user');
            localStorage.removeItem('novachat_admin_last_activity');
            setActiveTab('widget_preview');
            setToastNotification({
              id: 'session_expired_' + Date.now(),
              sender: 'সিস্টেম সিকিউরিটি',
              text: '৩০ মিনিট কোনো কার্যক্রম না থাকায় সেশন স্বয়ংক্রিয়ভাবে লগআউট হয়েছে।',
            });
          }
        }
      }
    }, 10000);

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      clearInterval(intervalId);
    };
  }, [isAdminLoggedIn]);

  useEffect(() => {
    if (isAdminLoggedIn) {
      if (isAgentRole) {
        if (activeTab === 'admin' || activeTab === 'settings' || activeTab === 'widget_preview') {
          setActiveTab('agent_workspace');
        }
      } else if (activeTab === 'widget_preview') {
        setActiveTab('admin');
      }
    }
  }, [isAdminLoggedIn, isAgentRole, activeTab]);

  const [isConnected, setIsConnected] = useState(false);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [adminLoginUsername, setAdminLoginUsername] = useState('');
  const [adminLoginPassword, setAdminLoginPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [isAdminLoginLoading, setIsAdminLoginLoading] = useState(false);

  // Mobile Workspace Navigation
  const [mobileWorkspaceView, setMobileWorkspaceView] = useState<'list' | 'chat'>('list');

  // Notification & Sound State
  const [isNotificationEnabled, setIsNotificationEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  });
  const [toastNotification, setToastNotification] = useState<{ id: string; sender: string; text: string } | null>(null);
  const [activeDeviceNotification, setActiveDeviceNotification] = useState<DeviceNotification | null>(null);

  // Core Data State
  const [chats, setChats] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('novachat_chats');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_CHATS;
  });

  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(() => {
    try {
      const saved = localStorage.getItem('novachat_messages');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_MESSAGES;
  });

  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [activeAgent, setActiveAgent] = useState<Agent>(INITIAL_AGENTS[0]);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>(INITIAL_CANNED_RESPONSES);
  const [liveVisitors, setLiveVisitors] = useState<LiveVisitor[]>(INITIAL_LIVE_VISITORS);

  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig>(() => {
    try {
      const saved = localStorage.getItem('novachat_widget_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_WIDGET_CONFIG;
  });

  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);

  // Selected Active Chat in Agent Inbox
  const [selectedChatId, setSelectedChatId] = useState<string | null>(() => {
    const initialList = INITIAL_CHATS;
    return initialList.length > 0 ? initialList[0].id : null;
  });

  const [activeFilter, setActiveFilter] = useState<'all' | 'unassigned' | 'active' | 'waiting' | 'resolved' | 'starred'>('all');

  // Customer Widget Chat Session ID
  const [customerChatId, setCustomerChatId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('novachat_customer_chat_id') || null;
    }
    return null;
  });

  const customerChatIdRef = useRef(customerChatId);
  customerChatIdRef.current = customerChatId;

  const selectedChatIdRef = useRef(selectedChatId);
  selectedChatIdRef.current = selectedChatId;

  useEffect(() => {
    if (customerChatId) {
      try {
        localStorage.setItem('novachat_customer_chat_id', customerChatId);
      } catch (e) {}
    } else {
      try {
        localStorage.removeItem('novachat_customer_chat_id');
      } catch (e) {}
    }
  }, [customerChatId]);

  // LocalStorage state persistence
  useEffect(() => {
    try {
      localStorage.setItem('novachat_chats', JSON.stringify(chats));
    } catch (e) {}
  }, [chats]);

  useEffect(() => {
    try {
      localStorage.setItem('novachat_messages', JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem('novachat_widget_config', JSON.stringify(widgetConfig));
    } catch (e) {}
  }, [widgetConfig]);

  // Direct Client-Side Google Sheet posting helper
  const syncToGoogleSheetDirect = (url: string, payload: any) => {
    if (!url || !url.startsWith('http')) return;
    try {
      fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      }).catch((err) => console.warn('Direct Google Sheet Sync warning:', err));
    } catch (e) {
      console.warn('Direct Google Sheet Sync error:', e);
    }
  };

  // Smart local AI auto reply helper for client-side static mode
  const getSmartLocalAiReply = (text: string): string => {
    const lower = text.toLowerCase();
    if (lower.includes('দাম') || lower.includes('প্রাইস') || lower.includes('মূল্য') || lower.includes('price')) {
      return 'আমাদের সার্ভিসের প্যাকেজ ও ফি সম্পর্কিত তথ্যের জন্য ধন্যবাদ! আমাদের সার্ভিস প্যাকেজ ১,৪৯৯ টাকা থেকে শুরু। বিস্তারিত জানতে আমাদের প্রতিনিধি আপনাকে শীঘ্রই মেসেজ পাঠাবে।';
    }
    if (lower.includes('পেমেন্ট') || lower.includes('bkash') || lower.includes('বিকাশ') || lower.includes('নগদ') || lower.includes('ব্যাংক')) {
      return 'আমরা বিকাশ, নগদ, রকেট এবং যেকোনো কার্ড গ্রহণ করি। পেমেন্টের জন্য আমাদের প্রতিনিধি আপনাকে একাউন্ট নম্বর শেয়ার করবে।';
    }
    if (lower.includes('হ্যালো') || lower.includes('হাই') || lower.includes('আসসালামু') || lower.includes('hello') || lower.includes('hi')) {
      return 'আসসালামু আলাইকুম! নোভাচ্যাটে আপনাকে স্বাগতম। আমি কীভাবে আপনাকে সাহায্য করতে পারি?';
    }
    return 'ধন্যবাদ আপনার বার্তার জন্য! আমাদের সাপোর্ট টিম বার্তাটি পেয়েছে এবং খুব দ্রুতই আপনার সাথে চ্যাটে যুক্ত হবে।';
  };

  // Typing States
  const [isTypingAgent, setIsTypingAgent] = useState<string | null>(null);
  const [isCustomerTyping, setIsCustomerTyping] = useState<boolean>(false);

  // Modals State
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
  const [isCodeGsModalOpen, setIsCodeGsModalOpen] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  // Web Audio Chime Sound Generator
  const playChimeSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn('Audio chime warning:', e);
    }
  };

  const triggerMessageNotification = (senderName: string, messageText: string) => {
    playChimeSound();

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`💬 নোভাচ্যাট: ${senderName}`, {
          body: messageText,
          icon: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
        });
      } catch (err) {
        console.warn('Browser notification error:', err);
      }
    }

    setToastNotification({
      id: String(Date.now()),
      sender: senderName,
      text: messageText,
    });

    setTimeout(() => {
      setToastNotification(null);
    }, 4500);
  };

  const handleRequestNotificationPermission = () => {
    if (!('Notification' in window)) {
      alert('আপনার ব্রাউজার ওয়েব নোটিফিকেশন সাপোর্ট করে না।');
      return;
    }
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        setIsNotificationEnabled(true);
        triggerMessageNotification('নোটিফিকেশন সার্ভিস', 'ব্রাউজার ও সাউন্ড নোটিফিকেশন সফলভাবে চালু করা হয়েছে!');
      } else {
        setIsNotificationEnabled(false);
        alert('নোটিফিকেশন পারমিশন ব্লকেড করা আছে। ব্রাউজার সাইট সেটিংসে নোটিফিকেশন এলাউ (Allow) করুন।');
      }
    });
  };

  const visitorTrackerRef = useRef<{
    updateVisitorInfo: (updates: {
      name?: string;
      phone?: string;
      email?: string;
      status?: 'browsing' | 'in_chat' | 'invited';
    }) => void;
    trackNavigation: (path: string, title?: string) => void;
    stop: () => void;
  } | null>(null);

  // Real-time visitor tracking for storefront & customer widget
  useEffect(() => {
    if (!isAdminLoggedIn) {
      const tracker = startVisitorTracker({
        visitorName: 'অনলাইন ভিজিটর',
        status: customerChatId ? 'in_chat' : 'browsing',
      });
      visitorTrackerRef.current = tracker;

      return () => {
        tracker.stop();
      };
    }
  }, [isAdminLoggedIn]);

  // Connect WebSocket, Firestore Realtime Listener & Fetch Initial REST Data
  useEffect(() => {
    // Setup Realtime Firestore Listener (for Vercel & cross-device sync)
    setupFirestoreRealtimeListeners(
      (firestoreChats) => {
        if (firestoreChats && firestoreChats.length > 0) {
          setChats((prev) => {
            // Merge Firestore chats with local state
            const map = new Map();
            firestoreChats.forEach((c) => map.set(c.id, c));
            prev.forEach((c) => {
              if (!map.has(c.id)) map.set(c.id, c);
            });
            return Array.from(map.values()).sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
          });
        }
      },
      (firestoreMessagesMap) => {
        if (firestoreMessagesMap && Object.keys(firestoreMessagesMap).length > 0) {
          setMessages((prev) => {
            const merged: Record<string, ChatMessage[]> = { ...prev };
            for (const [cId, msgs] of Object.entries(firestoreMessagesMap)) {
              const existing = merged[cId] || [];
              const seenIds = new Set<string>();
              const seenContent = new Set<string>();
              const uniqueList: ChatMessage[] = [];

              for (const m of [...existing, ...(Array.isArray(msgs) ? msgs : [])]) {
                if (!m) continue;
                const idKey = m.id ? String(m.id).trim() : null;
                const contentKey = `${m.senderRole || ''}_${(m.content || '').trim()}_${(m.timestamp || '').trim()}`;
                if (idKey && seenIds.has(idKey)) continue;
                if (seenContent.has(contentKey)) continue;
                if (idKey) seenIds.add(idKey);
                seenContent.add(contentKey);
                uniqueList.push(m);
              }
              merged[cId] = uniqueList;
            }
            return merged;
          });
        }
      },
      (chatId, senderRole, isTyping, senderName) => {
        if (senderRole === 'customer') {
          if (chatId === selectedChatIdRef.current) {
            setIsCustomerTyping(isTyping);
          }
        } else {
          if (chatId === customerChatIdRef.current) {
            setIsTypingAgent(isTyping ? (senderName || 'এডমিন সাপোর্ট') : null);
          }
        }
      },
      (firestoreBlocked) => {
        if (firestoreBlocked) {
          setBlockedUsers(firestoreBlocked);
        }
      },
      (firestoreVisitors) => {
        if (firestoreVisitors) {
          setLiveVisitors(firestoreVisitors);
        }
      },
      (firestoreNotif) => {
        if (firestoreNotif) {
          setActiveDeviceNotification(firestoreNotif);
        }
      }
    );

    // Initial load from Firestore
    loadFirestoreData().then((data) => {
      if (data) {
        if (data.chats && data.chats.length > 0) {
          setChats(data.chats);
        }
        if (data.messages && Object.keys(data.messages).length > 0) {
          setMessages(data.messages);
        }
        if (data.widgetConfig) {
          const cfg = {
            ...data.widgetConfig,
            telegramBotToken: data.widgetConfig.telegramBotToken || '8409188990:AAHR7bb3Zx9TcKpKEdldruvfVI-hRaoXfb4',
            telegramChatId: data.widgetConfig.telegramChatId || '6331230671',
          };
          if (cfg.telegramBotToken === '8861406019:AAHhY47ahk7DS495Ly1eLsa0tYZikFQ86f0') {
            cfg.telegramBotToken = '8409188990:AAHR7bb3Zx9TcKpKEdldruvfVI-hRaoXfb4';
          }
          if (cfg.telegramChatId === '6081054558') {
            cfg.telegramChatId = '6331230671';
          }
          setWidgetConfig(cfg);
          syncWidgetConfigToFirestore(cfg);
        }
        if (data.blockedUsers && data.blockedUsers.length > 0) {
          setBlockedUsers(data.blockedUsers);
        }
        if (data.visitors && data.visitors.length > 0) {
          setLiveVisitors(data.visitors);
        }
      }
    });

    fetchInitialData();
    connectWebSocket();

    const intervalId = setInterval(() => {
      fetchInitialData();
    }, 5000);

    return () => {
      clearInterval(intervalId);
      wsRef.current?.close();
    };
  }, []);

  // Auto mark customer messages as READ ONLY when Agent is actively viewing selectedChatId in Agent Workspace
  useEffect(() => {
    if (!isAdminLoggedIn || activeTab !== 'agent_workspace' || !selectedChatId) return;
    const currentMsgs = messages[selectedChatId];
    if (!currentMsgs || currentMsgs.length === 0) return;

    let hasUnread = false;
    const updatedMsgs = currentMsgs.map((m) => {
      if (m.senderRole === 'customer' && m.readStatus !== 'read') {
        hasUnread = true;
        const readMsg = { ...m, readStatus: 'read' as const, seenAt: new Date().toISOString(), seenBy: activeAgent.name };
        syncMessageToFirestore(readMsg);
        return readMsg;
      }
      return m;
    });

    if (hasUnread) {
      setMessages((prev) => ({
        ...prev,
        [selectedChatId]: updatedMsgs,
      }));
      setChats((prev) =>
        prev.map((c) => {
          if (c.id === selectedChatId && (c.unreadCountAgent || 0) > 0) {
            const updatedChat = { ...c, unreadCountAgent: 0, adminSeen: true, adminSeenAt: new Date().toISOString(), adminSeenBy: activeAgent.name };
            syncChatToFirestore(updatedChat);
            return updatedChat;
          }
          return c;
        })
      );
      markChatAsSeenByAdminInFirestore(selectedChatId, activeAgent.name);
    }
  }, [selectedChatId, activeTab, isAdminLoggedIn, messages[selectedChatId]?.length]);

  // Auto mark agent messages as READ when Customer views customerChatId
  useEffect(() => {
    if (!customerChatId) return;
    const currentMsgs = messages[customerChatId];
    if (!currentMsgs || currentMsgs.length === 0) return;

    let hasUnread = false;
    const updatedMsgs = currentMsgs.map((m) => {
      if (m.senderRole === 'agent' && m.readStatus !== 'read') {
        hasUnread = true;
        const readMsg = { ...m, readStatus: 'read' as const };
        syncMessageToFirestore(readMsg);
        return readMsg;
      }
      return m;
    });

    if (hasUnread) {
      setMessages((prev) => ({
        ...prev,
        [customerChatId]: updatedMsgs,
      }));
      setChats((prev) =>
        prev.map((c) => {
          if (c.id === customerChatId && (c.unreadCountCustomer || 0) > 0) {
            const updatedChat = { ...c, unreadCountCustomer: 0 };
            syncChatToFirestore(updatedChat);
            return updatedChat;
          }
          return c;
        })
      );
    }
  }, [customerChatId, messages[customerChatId]?.length]);

  const fetchInitialData = async () => {
    try {
      const results = await Promise.allSettled([
        fetch('/api/chats').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/messages').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/agents').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/canned-responses').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/visitors').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/settings').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/blocked-users').then((r) => (r.ok ? r.json() : null)),
      ]);

      const [chatsRes, messagesRes, agentsRes, cannedRes, visitorsRes, settingsRes, blockedRes] = results;

      if (chatsRes.status === 'fulfilled' && chatsRes.value && Array.isArray(chatsRes.value) && chatsRes.value.length > 0) {
        setChats(chatsRes.value);
      }
      if (messagesRes.status === 'fulfilled' && messagesRes.value && typeof messagesRes.value === 'object') {
        setMessages(messagesRes.value);
      }
      if (agentsRes.status === 'fulfilled' && agentsRes.value && Array.isArray(agentsRes.value)) {
        setAgents(agentsRes.value);
      }
      if (cannedRes.status === 'fulfilled' && cannedRes.value && Array.isArray(cannedRes.value)) {
        setCannedResponses(cannedRes.value);
      }
      if (visitorsRes.status === 'fulfilled' && visitorsRes.value && Array.isArray(visitorsRes.value)) {
        setLiveVisitors(visitorsRes.value);
      }
      if (settingsRes.status === 'fulfilled' && settingsRes.value && typeof settingsRes.value === 'object') {
        setWidgetConfig(settingsRes.value);
      }
      if (blockedRes.status === 'fulfilled' && blockedRes.value && Array.isArray(blockedRes.value)) {
        setBlockedUsers(blockedRes.value);
      }
    } catch {
      // Seamlessly fall back to Firestore Realtime Listeners and LocalStorage
    }
  };

  const handleBlockUser = async (chatId: string, phone?: string, ipAddress?: string, name?: string, reason?: string) => {
    const blockItem: BlockedUser = {
      id: `block_${Date.now()}`,
      chatId: chatId || 'N/A',
      phone: phone || '',
      ipAddress: ipAddress || '',
      reason: reason || 'এডমিন দ্বারা ব্লকড',
      blockedAt: new Date().toISOString(),
    };

    // Update blockedUsers local state and sync to Firestore
    setBlockedUsers((prev) => {
      const exists = prev.some((b) => b.chatId === chatId || (b.phone && b.phone === phone));
      if (exists) return prev;
      return [blockItem, ...prev];
    });
    syncBlockedUserToFirestore(blockItem);

    // Update isBlocked on chats and sync chat to Firestore
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === chatId || (phone && c.customer.phone === phone)) {
          const updated = { ...c, isBlocked: true, status: 'closed' as const };
          syncChatToFirestore(updated);
          return updated;
        }
        return c;
      })
    );

    try {
      const res = await fetch('/api/blocked-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, phone, ipAddress, name, reason }),
      });
      if (res.ok) {
        const updated = await res.json();
        setBlockedUsers(updated);
      }
    } catch (err) {
      console.warn('REST block user fallback to Firestore:', err);
    }
  };

  const handleUnblockUser = async (id: string) => {
    const item = blockedUsers.find((b) => b.id === id || b.chatId === id);
    const targetChatId = item?.chatId || id;
    const targetPhone = item?.phone;

    setBlockedUsers((prev) => prev.filter((b) => b.id !== id && b.chatId !== id));
    deleteBlockedUserFromFirestore(id);
    if (item && item.id) deleteBlockedUserFromFirestore(item.id);

    // Unblock chat in chats array and sync chat to Firestore
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === targetChatId || (targetPhone && c.customer.phone === targetPhone)) {
          const updated = { ...c, isBlocked: false, status: 'active' as const };
          syncChatToFirestore(updated);
          return updated;
        }
        return c;
      })
    );

    try {
      const res = await fetch(`/api/blocked-users/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const updated = await res.json();
        setBlockedUsers(updated);
      }
    } catch (err) {
      console.warn('REST unblock user fallback to Firestore:', err);
    }
  };

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError('');
    setIsAdminLoginLoading(true);

    try {
      // Authenticate with Firebase Firestore
      const firestoreResult = await authenticateAdminWithFirestore(
        adminLoginUsername.trim(),
        adminLoginPassword.trim()
      );

      if (firestoreResult.success && firestoreResult.admin) {
        setIsAdminLoggedIn(true);
        setCurrentUser(firestoreResult.admin);
        localStorage.setItem('novachat_admin_auth', 'true');
        localStorage.setItem('novachat_admin_profile', JSON.stringify(firestoreResult.admin));
        localStorage.setItem('novachat_admin_last_activity', Date.now().toString());
        setIsAdminLoginModalOpen(false);
        setAdminLoginPassword('');
        setAdminLoginError('');
        setIsAdminLoginLoading(false);

        if (firestoreResult.admin.role === 'Agent') {
          setActiveTab('agent_workspace');
          const matched = agents.find(
            (a) =>
              (firestoreResult.admin.name && a.name.includes(firestoreResult.admin.name)) ||
              (firestoreResult.admin.email && a.email === firestoreResult.admin.email)
          );
          if (matched) setActiveAgent(matched);
        } else {
          setActiveTab('admin');
        }
        return;
      } else if (firestoreResult.error && !firestoreResult.error.includes('কানেকশন সমস্যা')) {
        setAdminLoginError(firestoreResult.error);
        setIsAdminLoginLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Firestore direct login error, falling back:', err);
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminLoginUsername, password: adminLoginPassword }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setIsAdminLoggedIn(true);
          setCurrentUser(data.user);
          localStorage.setItem('novachat_admin_auth', 'true');
          localStorage.setItem('novachat_admin_user', JSON.stringify(data.user));
          localStorage.setItem('novachat_admin_last_activity', Date.now().toString());
          setIsAdminLoginModalOpen(false);
          setAdminLoginPassword('');
          setAdminLoginError('');
          setIsAdminLoginLoading(false);
          
          if (data.user.role === 'Agent') {
            setActiveTab('agent_workspace');
            const matched = agents.find(
              (a) =>
                (data.user.name && a.name.includes(data.user.name)) ||
                (data.user.email && a.email === data.user.email)
            );
            if (matched) setActiveAgent(matched);
          } else {
            setActiveTab('admin');
          }
          return;
        }
      }
    } catch (err) {
      console.warn('Backend login API unavailable');
    }

    // Static client-side fallback authentication
    const usernameInput = adminLoginUsername.trim().toLowerCase();
    if (usernameInput === 'zoha366' && adminLoginPassword === '01723993331aa') {
      const zohaProfile = {
        id: 'agent_zoha366',
        username: 'zoha366',
        name: 'জোহার আহমেদ (Zoha)',
        role: 'Agent',
        email: 'zoha366@novachat.com',
        department: 'গ্রাহক সহায়তা ও লাইভ চ্যাট',
      };
      setIsAdminLoggedIn(true);
      setCurrentUser(zohaProfile);
      localStorage.setItem('novachat_admin_auth', 'true');
      localStorage.setItem('novachat_admin_profile', JSON.stringify(zohaProfile));
      localStorage.setItem('novachat_admin_last_activity', Date.now().toString());
      setIsAdminLoginModalOpen(false);
      setAdminLoginPassword('');
      setAdminLoginError('');
      setIsAdminLoginLoading(false);
      setActiveTab('agent_workspace');
      const zohaAgent = agents.find((a) => a.id === 'agent_zoha' || a.name.includes('Zoha') || a.name.includes('জোহার'));
      if (zohaAgent) setActiveAgent(zohaAgent);
      return;
    }

    if (
      (usernameInput === 'saju2470' && adminLoginPassword === '20203494aa') ||
      (usernameInput === 'admin' && (adminLoginPassword === '20203494aa' || adminLoginPassword === 'admin123' || adminLoginPassword === 'admin')) ||
      (usernameInput === 'arif' && adminLoginPassword === 'agent123') ||
      (usernameInput === 'tanvir' && adminLoginPassword === 'agent123') ||
      adminLoginPassword === '20203494aa' ||
      adminLoginPassword === 'admin123'
    ) {
      const isAgent = usernameInput === 'arif' || usernameInput === 'tanvir';
      const profile = {
        id: isAgent ? `agent_${usernameInput}` : 'admin_super',
        username: usernameInput || 'admin',
        name: usernameInput === 'saju2470' ? 'Saju Ahmed' : isAgent ? (usernameInput === 'arif' ? 'আরিফ রহমান' : 'তানভীর আহমেদ') : 'Nova Admin',
        role: isAgent ? 'Agent' : 'Super Admin',
      };
      setIsAdminLoggedIn(true);
      setCurrentUser(profile);
      localStorage.setItem('novachat_admin_auth', 'true');
      localStorage.setItem('novachat_admin_profile', JSON.stringify(profile));
      localStorage.setItem('novachat_admin_last_activity', Date.now().toString());
      setIsAdminLoginModalOpen(false);
      setAdminLoginPassword('');
      setAdminLoginError('');
      setIsAdminLoginLoading(false);
      if (isAgent) {
        setActiveTab('agent_workspace');
      } else {
        setActiveTab('admin');
      }
    } else {
      setAdminLoginError('লগইন ব্যর্থ হয়েছে! ইউজারনেম ও পাসওয়ার্ড সঠিক দিন।');
      setIsAdminLoginLoading(false);
    }
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('novachat_admin_auth');
    localStorage.removeItem('novachat_admin_profile');
    localStorage.removeItem('novachat_admin_user');
    localStorage.removeItem('novachat_admin_last_activity');
    setActiveTab('widget_preview');
  };

  const connectWebSocket = () => {
    try {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${location.host}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        ws.send(JSON.stringify({ type: 'join', role: 'agent' }));
      };

      ws.onclose = () => {
        // Default to active connected status for static hosting / GitHub Pages mode
        setIsConnected(true);
        setTimeout(connectWebSocket, 10000);
      };

      ws.onerror = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);

          switch (parsed.type) {
            case 'new_message': {
              const { chatId, message, chat } = parsed;
              if (message && (message.id || message.content)) {
                setMessages((prev) => {
                  const list = prev[chatId] || [];
                  const exists = list.some(
                    (m) =>
                      m.id === message.id ||
                      (m.content === message.content && m.senderRole === message.senderRole && Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 5000)
                  );
                  if (exists) {
                    return prev;
                  }
                  return {
                    ...prev,
                    [chatId]: [...list, message],
                  };
                });

                // Trigger notification & sound chime
                const sender = message.senderName || 'গ্রাহক';
                const messageText = message.content || message.text || '';
                triggerMessageNotification(sender, messageText);
              }
              if (chat) {
                setChats((prev) => {
                  const exists = prev.some((c) => c.id === chatId);
                  if (!exists) return [chat, ...prev];
                  return prev.map((c) => (c.id === chatId ? chat : c));
                });
              }
              break;
            }

            case 'chat_updated': {
              const { chatId, chat, systemMessage } = parsed;
              setChats((prev) => prev.map((c) => (c.id === chatId ? chat : c)));
              if (systemMessage && systemMessage.id) {
                setMessages((prev) => {
                  const list = prev[chatId] || [];
                  if (list.some((m) => m.id === systemMessage.id)) {
                    return prev;
                  }
                  return {
                    ...prev,
                    [chatId]: [...list, systemMessage],
                  };
                });
              }
              break;
            }

            case 'new_chat_created': {
              const { chat, message } = parsed;
              setChats((prev) => {
                if (prev.some((c) => c.id === chat.id)) return prev;
                return [chat, ...prev];
              });
              if (message) {
                setMessages((prev) => ({
                  ...prev,
                  [chat.id]: [message],
                }));
                const messageText = message.content || message.text || '';
                triggerMessageNotification(chat.customer?.name || 'নতুন গ্রাহক', messageText);
              }
              break;
            }

            case 'typing_status': {
              if (parsed.senderRole === 'customer') {
                if (parsed.chatId === selectedChatIdRef.current) {
                  setIsCustomerTyping(parsed.isTyping);
                }
              } else {
                if (parsed.chatId === customerChatIdRef.current) {
                  setIsTypingAgent(parsed.isTyping ? (parsed.senderName || 'এডমিন সাপোর্ট') : null);
                }
              }
              break;
            }

            case 'agent_status_updated': {
              if (parsed.agents) setAgents(parsed.agents);
              break;
            }

            case 'settings_updated': {
              if (parsed.widgetConfig) setWidgetConfig(parsed.widgetConfig);
              break;
            }

            case 'visitors_updated': {
              if (parsed.visitors && Array.isArray(parsed.visitors)) {
                setLiveVisitors(parsed.visitors);
              }
              break;
            }

            case 'device_notification': {
              if (parsed.notification) {
                setActiveDeviceNotification(parsed.notification);
              }
              break;
            }

            case 'delete_message':
            case 'message_deleted': {
              const { chatId, messageId } = parsed;
              if (chatId && messageId) {
                setMessages((prev) => ({
                  ...prev,
                  [chatId]: (prev[chatId] || []).filter((m) => m.id !== messageId),
                }));
              }
              break;
            }

            case 'full_reset': {
              fetchInitialData();
              break;
            }
          }
        } catch (err) {
          console.error('WS Parse Error:', err);
        }
      };

      wsRef.current = ws;
    } catch (e) {
      setIsConnected(true);
    }
  };

  // Customer Actions
  const handleStartCustomerChat = async (data: {
    customerName: string;
    customerPhone?: string;
    customerEmail: string;
    department: string;
    subject: string;
    initialMessage: string;
    problemIssue?: string;
  }) => {
    const persistentCustomerId = getOrCreatePersistentCustomerId();
    const cleanPhone = (data.customerPhone || '').replace(/[^0-9]/g, '');
    saveCustomerProfile(data.customerName, cleanPhone, data.customerEmail);

    const chatInitMeta = recordChatInitiation();
    const currentPathHistory = getVisitorPathHistory();

    if (visitorTrackerRef.current) {
      visitorTrackerRef.current.updateVisitorInfo({
        name: data.customerName,
        phone: data.customerPhone,
        email: data.customerEmail,
        status: 'in_chat',
      });
    }

    // Search for existing chat session of this same customer (by customerChatId, customerId, or phone)
    const existingChat = chats.find((c) => {
      if (customerChatId && c.id === customerChatId) return true;
      if (c.customerId && (c.customerId === persistentCustomerId || c.customer?.id === persistentCustomerId)) return true;
      if (cleanPhone && c.customer?.phone && c.customer.phone.replace(/[^0-9]/g, '').includes(cleanPhone)) return true;
      if (cleanPhone && c.id && c.id.includes(cleanPhone)) return true;
      return false;
    });

    const targetChatId = existingChat ? existingChat.id : (cleanPhone ? `CHAT-${cleanPhone}` : `CHAT-${persistentCustomerId}`);

    let serverOk = false;
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          chatId: targetChatId,
          customerId: persistentCustomerId,
          visitorId: persistentCustomerId,
          pathHistory: currentPathHistory,
          chatInitiatedPage: chatInitMeta.page,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.chat) {
          setCustomerChatId(result.chat.id);
          serverOk = true;
        }
      }
    } catch (e) {
      console.warn('API /api/chats unavailable (Vercel/Static mode), syncing directly with Firestore');
    }

    const firstMsg: ChatMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      chatId: targetChatId,
      senderRole: 'customer',
      senderName: data.customerName || existingChat?.customer?.name || 'নতুন গ্রাহক',
      senderAvatar: existingChat?.customer?.avatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      content: data.initialMessage,
      timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
      readStatus: 'delivered',
    };

    if (existingChat) {
      // Re-use existing chat room & re-activate it if closed/resolved
      const updatedChat: ChatSession = {
        ...existingChat,
        customerId: existingChat.customerId || persistentCustomerId,
        customer: {
          ...existingChat.customer,
          id: existingChat.customer?.id || persistentCustomerId,
          name: data.customerName || existingChat.customer.name,
          email: data.customerEmail || existingChat.customer.email,
          phone: data.customerPhone || existingChat.customer.phone,
          pathHistory: currentPathHistory,
          chatInitiatedPage: chatInitMeta.page,
        },
        department: data.department || existingChat.department,
        subject: data.subject || existingChat.subject,
        problemIssue: (data as any).problemIssue || existingChat.problemIssue,
        status: 'active', // Automatically reopen chat!
        updatedAt: new Date().toISOString(),
        lastMessage: data.initialMessage,
        unreadCountAgent: (existingChat.unreadCountAgent || 0) + 1,
      };

      setChats((prev) => prev.map((c) => (c.id === existingChat.id ? updatedChat : c)));
      setMessages((prev) => ({
        ...prev,
        [existingChat.id]: [...(prev[existingChat.id] || []), firstMsg],
      }));
      setCustomerChatId(existingChat.id);

      syncChatToFirestore(updatedChat);
      syncMessageToFirestore(firstMsg);

      // Telegram notification
      sendTelegramNotification(
        {
          type: 'new_message',
          customerName: updatedChat.customer.name,
          customerPhone: updatedChat.customer.phone,
          customerEmail: updatedChat.customer.email,
          department: updatedChat.department,
          problemIssue: (data as any).problemIssue || data.subject,
          chatId: existingChat.id,
          messageText: data.initialMessage,
        },
        widgetConfig
      );
    } else {
      // Create first-time new session
      const newSession: ChatSession = {
        id: targetChatId,
        customerId: persistentCustomerId,
        customer: {
          id: persistentCustomerId,
          name: data.customerName || 'নতুন গ্রাহক',
          email: data.customerEmail || `${cleanPhone || 'visitor'}@customer.com`,
          phone: data.customerPhone || '',
          avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
          ipAddress: '127.0.0.1 (Web)',
          location: 'বাংলাদেশ',
          pathHistory: currentPathHistory,
          chatInitiatedPage: chatInitMeta.page,
        },
        status: 'active',
        priority: 'medium',
        department: data.department || 'সাধারণ জিজ্ঞাসা',
        subject: data.subject || 'সাহায্য প্রয়োজন',
        unreadCountAgent: 1,
        unreadCountCustomer: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastMessage: data.initialMessage,
        isStarred: false,
      };

      setChats((prev) => [newSession, ...prev.filter((c) => c.id !== targetChatId)]);
      setMessages((prev) => ({
        ...prev,
        [targetChatId]: [firstMsg],
      }));
      setCustomerChatId(targetChatId);

      syncChatToFirestore(newSession);
      syncMessageToFirestore(firstMsg);

      sendTelegramNotification(
        {
          type: 'new_chat',
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail,
          department: data.department,
          problemIssue: (data as any).problemIssue || data.subject,
          chatId: targetChatId,
          messageText: data.initialMessage,
        },
        widgetConfig
      );
    }

    // Direct Google Sheet Sync
    syncToGoogleSheetDirect(widgetConfig.appsScriptUrl, {
      rows: [{
        timestamp: firstMsg.timestamp,
        chatId: targetChatId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        department: data.department,
        status: 'active',
        sender: `${firstMsg.senderName} (customer)`,
        content: firstMsg.content,
        rating: 'N/A'
      }]
    });

    // AI auto reply when in client static/Vercel mode
    if (widgetConfig.enableAiAutoReply) {
      setTimeout(() => {
        const aiText = getSmartLocalAiReply(data.initialMessage);
        const aiMsg: ChatMessage = {
          id: 'msg_ai_' + Date.now(),
          chatId: targetChatId,
          senderRole: 'agent',
          senderName: widgetConfig.botName || 'নোভা এআই সহকারী',
          senderAvatar: widgetConfig.botAvatar,
          content: aiText,
          timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
          readStatus: 'read',
        };
        setMessages((prev) => ({
          ...prev,
          [targetChatId]: [...(prev[targetChatId] || []), aiMsg],
        }));
        setChats((prev) =>
          prev.map((c) => (c.id === targetChatId ? { ...c, lastMessage: aiMsg.content, updatedAt: new Date().toISOString() } : c))
        );
        syncMessageToFirestore(aiMsg);

        triggerMessageNotification(widgetConfig.botName, aiMsg.content);

        syncToGoogleSheetDirect(widgetConfig.appsScriptUrl, {
          rows: [{
            timestamp: aiMsg.timestamp,
            chatId: targetChatId,
            customerName: data.customerName,
            customerEmail: data.customerEmail,
            department: data.department,
            status: 'active',
            sender: `${aiMsg.senderName} (AI Bot)`,
            content: aiMsg.content,
            rating: 'N/A'
          }]
        });
      }, 1200);
    }
  };

  const handleReopenCustomerChat = () => {
    const activeChat = customerSession || chats.find((c) => c.id === customerChatId);
    if (!activeChat) return;

    const reopenedChat: ChatSession = {
      ...activeChat,
      status: 'active',
      updatedAt: new Date().toISOString(),
      lastMessage: 'চ্যাট পুনরায় চালু করা হয়েছে',
    };

    setChats((prev) => prev.map((c) => (c.id === activeChat.id ? reopenedChat : c)));
    setCustomerChatId(activeChat.id);
    syncChatToFirestore(reopenedChat);

    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'change_status',
            chatId: activeChat.id,
            status: 'active',
          })
        );
      }
    } catch (e) {}
  };

  const handleSendCustomerMessage = async (text: string, attachments?: any[]) => {
    const activeChatId = customerChatId || customerSession?.id;
    if (!activeChatId || (!text.trim() && (!attachments || attachments.length === 0))) return;

    const currentChat = chats.find((c) => c.id === activeChatId) || customerSession;
    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const displayMsg = text.trim() || (attachments && attachments.length > 0 ? '📷 [ছবি/ফাইল]' : '');
    const newMsg: ChatMessage = {
      id: msgId,
      chatId: activeChatId,
      senderRole: 'customer',
      senderName: currentChat?.customer?.name || 'Visitor',
      senderAvatar: currentChat?.customer?.avatar,
      content: displayMsg,
      attachments,
      timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
      readStatus: 'delivered',
    };

    setMessages((prev) => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMsg],
    }));

    // Auto reopen chat if it was closed or resolved
    const updatedChat: ChatSession | null = currentChat
      ? {
          ...currentChat,
          status: 'active', // If chat was resolved/closed, reopen automatically on new customer message
          lastMessage: displayMsg,
          updatedAt: new Date().toISOString(),
          unreadCountAgent: (currentChat.unreadCountAgent || 0) + 1,
        }
      : null;

    if (updatedChat) {
      setChats((prev) =>
        prev.map((c) => (c.id === activeChatId ? updatedChat : c))
      );
      syncChatToFirestore(updatedChat);
    }

    // Direct Firestore sync
    syncMessageToFirestore(newMsg);

    // Telegram notification on customer message with photo support
    sendTelegramNotification(
      {
        type: 'new_message',
        customerName: currentChat?.customer.name || 'Visitor',
        customerPhone: currentChat?.customer.phone,
        customerIp: currentChat?.customer.ipAddress,
        problemIssue: currentChat?.problemIssue,
        chatId: activeChatId,
        messageText: displayMsg,
        photoUrl: attachments && attachments.length > 0 ? attachments[0].url : undefined,
        photoName: attachments && attachments.length > 0 ? attachments[0].name : undefined,
        attachments: attachments,
      },
      widgetConfig
    );

    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'message',
            chatId: activeChatId,
            senderRole: 'customer',
            senderName: newMsg.senderName,
            senderAvatar: newMsg.senderAvatar,
            content: text,
            attachments,
          })
        );
      } else {
        await fetch(`/api/chats/${encodeURIComponent(activeChatId)}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newMsg),
        });
      }
    } catch (e) {
      console.warn('Message send network warning:', e);
    }

    // Client-side AI Auto Reply when WebSocket/server endpoint unavailable
    if (widgetConfig.enableAiAutoReply && (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)) {
      setTimeout(() => {
        const aiText = getSmartLocalAiReply(text);
        const aiMsg: ChatMessage = {
          id: 'msg_ai_' + Date.now(),
          chatId: activeChatId,
          senderRole: 'agent',
          senderName: widgetConfig.botName || 'নোভা এআই সহকারী',
          senderAvatar: widgetConfig.botAvatar,
          content: aiText,
          timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
          readStatus: 'read',
        };
        setMessages((prev) => ({
          ...prev,
          [activeChatId]: [...(prev[activeChatId] || []), aiMsg],
        }));
        if (currentChat) {
          const chatWithAiReply: ChatSession = {
            ...currentChat,
            status: 'active',
            lastMessage: aiMsg.content,
            updatedAt: new Date().toISOString(),
          };
          setChats((prev) =>
            prev.map((c) => (c.id === activeChatId ? chatWithAiReply : c))
          );
          syncChatToFirestore(chatWithAiReply);
        }
        syncMessageToFirestore(aiMsg);
        triggerMessageNotification(widgetConfig.botName, aiMsg.content);
      }, 1200);
    }

    if (currentChat) {
      syncToGoogleSheetDirect(widgetConfig.appsScriptUrl, {
        rows: [
          {
            timestamp: newMsg.timestamp,
            chatId: activeChatId,
            customerName: currentChat.customer.name,
            customerEmail: currentChat.customer.email,
            department: currentChat.department,
            status: 'active',
            sender: `${newMsg.senderName} (customer)`,
            content: text,
            rating: currentChat.satisfactionRating ? `${currentChat.satisfactionRating}/5` : 'N/A',
          },
        ],
      });
    }
  };

  const handleCustomerTyping = (isTyping: boolean) => {
    if (!customerChatId) return;
    syncTypingStatusToFirestore(customerChatId, 'customer', isTyping, 'Customer');
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'typing',
          chatId: customerChatId,
          senderName: 'Customer',
          senderRole: 'customer',
          isTyping,
        })
      );
    }
  };

  const handleSubmitRating = async (rating: number, feedback: string) => {
    if (!customerChatId) return;
    try {
      await fetch(`/api/chats/${customerChatId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, feedback }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Admin Actions
  const handleSendAdminMessage = async (chatId: string, text: string, isInternalNote?: boolean) => {
    if (!chatId || !text.trim()) return;

    const currentChat = chats.find((c) => c.id === chatId);
    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      chatId,
      senderRole: 'agent',
      senderName: 'এডমিন (System Admin)',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      content: text,
      isInternalNote,
      timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
      readStatus: 'delivered',
    };

    setMessages((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newMsg],
    }));

    const updatedChat = currentChat
      ? {
          ...currentChat,
          lastMessage: isInternalNote ? currentChat.lastMessage : text,
          updatedAt: new Date().toISOString(),
          unreadCountCustomer: isInternalNote ? currentChat.unreadCountCustomer : currentChat.unreadCountCustomer + 1,
        }
      : null;

    if (updatedChat) {
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? updatedChat : c))
      );
      syncChatToFirestore(updatedChat);
    }

    // Direct Firestore Sync
    syncMessageToFirestore(newMsg);

    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'message',
            chatId,
            senderRole: 'agent',
            senderName: 'এডমিন (System Admin)',
            senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            content: text,
            isInternalNote,
          })
        );
      } else {
        await fetch(`/api/chats/${encodeURIComponent(chatId)}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newMsg),
        });
      }
    } catch (e) {
      console.warn('Admin message send warning:', e);
    }

    if (currentChat) {
      syncToGoogleSheetDirect(widgetConfig.appsScriptUrl, {
        rows: [
          {
            timestamp: newMsg.timestamp,
            chatId,
            customerName: currentChat.customer.name,
            customerEmail: currentChat.customer.email,
            department: currentChat.department,
            status: currentChat.status,
            sender: `System Admin (Agent${isInternalNote ? ' - internal note' : ''})`,
            content: text,
            rating: 'N/A',
          },
        ],
      });
    }
  };

  // Agent Actions
  const handleSendAgentMessage = async (text: string, isInternalNote?: boolean, attachments?: any[]) => {
    if (!selectedChatId || (!text.trim() && (!attachments || attachments.length === 0))) return;

    const currentChat = chats.find((c) => c.id === selectedChatId);
    const displayMsg = text.trim() || (attachments && attachments.length > 0 ? '📷 [ছবি/ফাইল]' : '');
    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      chatId: selectedChatId,
      senderRole: 'agent',
      senderName: activeAgent.name,
      senderAvatar: activeAgent.avatar,
      content: displayMsg,
      isInternalNote,
      attachments,
      timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
      readStatus: 'delivered',
    };

    setMessages((prev) => ({
      ...prev,
      [selectedChatId]: [...(prev[selectedChatId] || []), newMsg],
    }));

    const updatedChat = currentChat
      ? {
          ...currentChat,
          lastMessage: isInternalNote ? currentChat.lastMessage : displayMsg,
          updatedAt: new Date().toISOString(),
          unreadCountCustomer: isInternalNote ? currentChat.unreadCountCustomer : currentChat.unreadCountCustomer + 1,
        }
      : null;

    if (updatedChat) {
      setChats((prev) =>
        prev.map((c) => (c.id === selectedChatId ? updatedChat : c))
      );
      syncChatToFirestore(updatedChat);
    }

    // Direct Firestore Sync
    syncMessageToFirestore(newMsg);

    try {
      await fetch(`/api/chats/${encodeURIComponent(selectedChatId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMsg),
      });
    } catch (e) {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'message',
            chatId: selectedChatId,
            senderRole: 'agent',
            senderName: activeAgent.name,
            senderAvatar: activeAgent.avatar,
            content: text,
            isInternalNote,
          })
        );
      }
    }

    if (currentChat) {
      syncToGoogleSheetDirect(widgetConfig.appsScriptUrl, {
        rows: [
          {
            timestamp: newMsg.timestamp,
            chatId: selectedChatId,
            customerName: currentChat.customer.name,
            customerEmail: currentChat.customer.email,
            department: currentChat.department,
            status: currentChat.status,
            sender: `${activeAgent.name} (Agent${isInternalNote ? ' - internal note' : ''})`,
            content: text,
            rating: 'N/A',
          },
        ],
      });
    }
  };

  const handleAgentTyping = (isTyping: boolean) => {
    if (!selectedChatId) return;
    const currentChat = chats.find((c) => c.id === selectedChatId);
    const typingAgentName =
      currentChat?.assignedAgentName ||
      currentChat?.assignedAgent?.name ||
      activeAgent?.name ||
      'সাপোর্ট এজেন্ট';

    syncTypingStatusToFirestore(selectedChatId, 'agent', isTyping, typingAgentName);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'typing',
          chatId: selectedChatId,
          senderName: typingAgentName,
          senderRole: 'agent',
          isTyping,
        })
      );
    }
  };

  const handleAssignAgent = (chatId: string, agentId: string) => {
    const ag = agents.find((a) => a.id === agentId);
    if (!ag) return;

    setActiveAgent(ag);

    const joinMessageText = `${ag.name} চ্যাটে যুক্ত হয়েছেন এবং এই চ্যাটে অ্যাসাইন করা হয়েছে।`;
    const sysMessage: ChatMessage = {
      id: 'msg_sys_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      chatId: chatId,
      senderRole: 'system',
      senderName: 'System',
      content: joinMessageText,
      timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
      isInternalNote: false,
    };

    setChats((prev) =>
      prev.map((c) => {
        if (c.id === chatId) {
          const updated = {
            ...c,
            assignedAgent: ag,
            assignedAgentId: ag.id,
            assignedAgentName: ag.name,
            assignedAgentAvatar: ag.avatar,
            status: 'active',
            updatedAt: new Date().toISOString(),
          };
          syncChatToFirestore(updated);
          return updated;
        }
        return c;
      })
    );

    setMessages((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), sysMessage],
    }));

    syncMessageToFirestore(sysMessage);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'assign_agent',
          chatId,
          agentId: ag.id,
          agentName: ag.name,
          agentAvatar: ag.avatar,
        })
      );
    }
  };

  const handleChangeStatus = (chatId: string, status: any) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === chatId) {
          const updated = { ...c, status };
          syncChatToFirestore(updated);
          return updated;
        }
        return c;
      })
    );

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'change_status',
          chatId,
          status,
        })
      );
    }
  };

  const handleToggleStar = async (chatId: string) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === chatId) {
          const updated = { ...c, isStarred: !c.isStarred };
          syncChatToFirestore(updated);
          return updated;
        }
        return c;
      })
    );
    try {
      await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: true }),
      });
    } catch (e) {}
  };

  const handleUpdateCustomerMeta = async (chatId: string, updates: { notes?: string; tags?: string[] }) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === chatId) {
          const updated = {
            ...c,
            notes: updates.notes !== undefined ? updates.notes : c.notes,
            tags: updates.tags !== undefined ? updates.tags : c.tags,
          };
          syncChatToFirestore(updated);
          return updated;
        }
        return c;
      })
    );
    try {
      await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (e) {}
  };

  const handleDeleteChat = async (chatId: string) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (selectedChatId === chatId) setSelectedChatId(null);
    deleteChatFromFirestore(chatId);
    try {
      await fetch(`/api/chats/${chatId}`, { method: 'DELETE' });
    } catch (e) {}
  };

  const handleDeleteMessage = async (chatId: string, messageId: string) => {
    if (!chatId || !messageId) return;

    setMessages((prev) => {
      const currentList = prev[chatId] || [];
      const updatedList = currentList.filter((m) => m.id !== messageId);
      
      const remainingLastMsg = updatedList[updatedList.length - 1];
      setChats((prevChats) =>
        prevChats.map((c) => {
          if (c.id === chatId) {
            const updatedChat = {
              ...c,
              lastMessage: remainingLastMsg ? remainingLastMsg.content : '',
              updatedAt: new Date().toISOString(),
            };
            syncChatToFirestore(updatedChat);
            return updatedChat;
          }
          return c;
        })
      );

      return {
        ...prev,
        [chatId]: updatedList,
      };
    });

    deleteMessageFromFirestore(messageId, chatId);

    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'delete_message',
            chatId,
            messageId,
          })
        );
      } else {
        await fetch(`/api/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}`, {
          method: 'DELETE',
        });
      }
    } catch (e) {
      console.warn('Delete message network warning:', e);
    }
  };

  const handleAgentStatusChange = async (status: 'online' | 'away' | 'offline') => {
    const updated = { ...activeAgent, status };
    setActiveAgent(updated);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'agent_status',
          agentId: activeAgent.id,
          status,
        })
      );
    }
  };

  const handleResetDemo = async () => {
    try {
      await fetch('/api/reset-demo', { method: 'POST' });
    } catch (e) {}
    localStorage.removeItem('novachat_chats');
    localStorage.removeItem('novachat_messages');
    localStorage.removeItem('novachat_widget_config');
    setChats(INITIAL_CHATS);
    setMessages(INITIAL_MESSAGES);
    setWidgetConfig(INITIAL_WIDGET_CONFIG);
  };

  const handleProactiveInvite = (visitor: LiveVisitor) => {
    handleStartCustomerChat({
      customerName: visitor.name,
      customerEmail: visitor.email || 'visitor@store.com',
      department: 'Customer Support',
      subject: `Proactive Chat Invite on ${visitor.currentPage}`,
      initialMessage: `👋 Hi ${visitor.name}! I noticed you're exploring ${visitor.currentPage}. Can I answer any questions for you?`,
    });
    setActiveTab('agent_workspace');
  };

  const handleAddCannedResponse = async (data: { shortcut: string; title: string; content: string; category: string }) => {
    const res = await fetch('/api/canned-responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const newResponse = await res.json();
      setCannedResponses((prev) => [...prev, newResponse]);
    }
  };

  const handleDeleteCannedResponse = async (id: string) => {
    await fetch(`/api/canned-responses/${id}`, { method: 'DELETE' });
    setCannedResponses((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSaveSettings = async (updated: Partial<WidgetConfig>) => {
    const merged = { ...widgetConfig, ...updated };
    setWidgetConfig(merged);
    syncWidgetConfigToFirestore(merged);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        setWidgetConfig(await res.json());
      }
    } catch (e) {}
  };

  const handleAddAgent = (newAgentData: Omit<Agent, 'id'>) => {
    const newAgent: Agent = {
      ...newAgentData,
      id: `ag_${Date.now()}`,
    };
    setAgents((prev) => [...prev, newAgent]);
  };

  const handleDeleteAgent = (agentId: string) => {
    setAgents((prev) => prev.filter((a) => a.id !== agentId));
  };

  // Selected chat data
  const selectedChat = chats.find((c) => c.id === selectedChatId) || null;
  const currentChatMessages = selectedChatId ? messages[selectedChatId] || [] : [];
  
  // Persistent Customer Session identification (prevent duplicates, retain visitor identity)
  const customerSession = (() => {
    if (customerChatId) {
      const found = chats.find((c) => c.id === customerChatId);
      if (found) return found;
    }
    const pid = typeof window !== 'undefined' ? (localStorage.getItem('novachat_customer_id') || localStorage.getItem('novachat_visitor_id')) : null;
    const pphone = typeof window !== 'undefined' ? localStorage.getItem('novachat_customer_phone') : null;
    const cleanP = pphone ? pphone.replace(/[^0-9]/g, '') : '';
    if (pid || cleanP) {
      const matched = chats.find((c) => {
        if (pid && (c.customerId === pid || c.customer?.id === pid)) return true;
        if (cleanP && c.customer?.phone && c.customer.phone.replace(/[^0-9]/g, '').includes(cleanP)) return true;
        if (cleanP && c.id && c.id.includes(cleanP)) return true;
        return false;
      });
      if (matched) return matched;
    }
    return null;
  })();

  const customerMessages = customerSession ? (messages[customerSession.id] || []) : (customerChatId ? (messages[customerChatId] || []) : []);

  const unreadTotal = chats.reduce((acc, c) => acc + (c.unreadCountAgent || 0), 0);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 font-sans antialiased">
      
      {/* Floating Notification Banner Toast */}
      {toastNotification && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 max-w-xs sm:max-w-sm">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-white animate-bounce" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-xs text-blue-400 truncate">💬 {toastNotification.sender}</h4>
            <p className="text-xs text-slate-200 line-clamp-2 mt-0.5">{toastNotification.text}</p>
          </div>
          <button
            onClick={() => setToastNotification(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={isConnected}
        activeAgent={activeAgent}
        agents={agents}
        onAgentChange={(agentId) => {
          const ag = agents.find((a) => a.id === agentId);
          if (ag) setActiveAgent(ag);
        }}
        onAgentStatusChange={handleAgentStatusChange}
        onResetDemo={handleResetDemo}
        openEmbedModal={() => setIsEmbedModalOpen(true)}
        openCodeGsModal={() => setIsCodeGsModalOpen(true)}
        unreadCount={unreadTotal}
        liveVisitorsCount={liveVisitors.length}
        isAdminLoggedIn={isAdminLoggedIn}
        currentUser={currentUser}
        openAdminLoginModal={() => setIsAdminLoginModalOpen(true)}
        onAdminLogout={handleAdminLogout}
        isNotificationEnabled={isNotificationEnabled}
        onRequestNotificationPermission={handleRequestNotificationPermission}
      />

      {/* Main View Area */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Tab 1: Customer Storefront Preview */}
        {activeTab === 'widget_preview' && !isAdminLoggedIn && (
          <div className="flex-1 flex overflow-hidden relative">
            <StorefrontPreview
              widgetConfig={widgetConfig}
              onPageNavigate={(path, title) => {
                if (visitorTrackerRef.current) {
                  visitorTrackerRef.current.trackNavigation(path, title);
                }
              }}
            />

            {/* Floating Live Chat Widget */}
            <CustomerChatWidget
              widgetConfig={widgetConfig}
              chatSession={customerSession}
              messages={customerMessages}
              onStartChat={handleStartCustomerChat}
              onSendMessage={handleSendCustomerMessage}
              onSendQuickReply={(text) => handleSendCustomerMessage(text)}
              onTyping={handleCustomerTyping}
              onSubmitRating={handleSubmitRating}
              onNewChat={handleReopenCustomerChat}
              isTypingAgent={isTypingAgent}
            />
          </div>
        )}

        {/* Tab 2: Support Agent Workspace */}
        {activeTab === 'agent_workspace' && isAdminLoggedIn && (
          <div className="flex-1 flex overflow-hidden w-full relative">
            <div className={`w-full md:w-80 lg:w-96 shrink-0 h-full ${mobileWorkspaceView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
              <ConversationList
                chats={chats}
                selectedChatId={selectedChatId}
                onSelectChat={async (id) => {
                  setSelectedChatId(id);
                  setMobileWorkspaceView('chat');
                  try {
                    const res = await fetch(`/api/chats/${id}?role=agent`);
                    if (res.ok) {
                      const data = await res.json();
                      if (data.messages && Array.isArray(data.messages)) {
                        setMessages((prev) => ({ ...prev, [id]: data.messages }));
                      }
                      if (data.chat) {
                        setChats((prev) => prev.map((c) => (c.id === id ? data.chat : c)));
                      }
                    }
                  } catch (e) {}
                }}
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
                messagesMap={messages}
              />
            </div>

            <div className={`flex-1 h-full ${mobileWorkspaceView === 'list' ? 'hidden md:flex' : 'flex'}`}>
              <AgentChatArea
                chat={selectedChat}
                messages={currentChatMessages}
                agents={agents}
                activeAgent={activeAgent}
                cannedResponses={cannedResponses}
                onSendMessage={handleSendAgentMessage}
                onAssignAgent={handleAssignAgent}
                onChangeStatus={handleChangeStatus}
                onToggleStar={handleToggleStar}
                onTyping={handleAgentTyping}
                onDeleteMessage={handleDeleteMessage}
                isCustomerTyping={isCustomerTyping}
                onBackToList={() => setMobileWorkspaceView('list')}
              />
            </div>

            <div className="hidden xl:block h-full shrink-0">
              <CustomerSidebar
                chat={selectedChat}
                messages={currentChatMessages}
                onUpdateCustomerMeta={handleUpdateCustomerMeta}
                onBlockUser={handleBlockUser}
                onUnblockUser={handleUnblockUser}
                onDeleteChat={handleDeleteChat}
              />
            </div>
          </div>
        )}

        {/* Tab 3: Real-Time Live Visitors */}
        {activeTab === 'visitors' && isAdminLoggedIn && (
          <LiveVisitorsTab
            visitors={liveVisitors}
            onInviteToChat={handleProactiveInvite}
          />
        )}

        {/* Tab 4: Canned Responses Snippets */}
        {activeTab === 'canned' && isAdminLoggedIn && (
          <CannedResponsesTab
            cannedResponses={cannedResponses}
            onAddCannedResponse={handleAddCannedResponse}
            onDeleteCannedResponse={handleDeleteCannedResponse}
          />
        )}

        {/* Tab 5: Settings & AI Config (Super Admin Only) */}
        {activeTab === 'settings' && isAdminLoggedIn && !isAgentRole && (
          <WidgetSettings
            widgetConfig={widgetConfig}
            onSaveSettings={handleSaveSettings}
          />
        )}

        {/* Tab 6: Admin Control Panel (Super Admin Only) */}
        {activeTab === 'admin' && isAdminLoggedIn && !isAgentRole && (
          <AdminPanel
            agents={agents}
            chats={chats}
            messages={messages}
            widgetConfig={widgetConfig}
            blockedUsers={blockedUsers}
            liveVisitors={liveVisitors}
            onInviteToChat={handleProactiveInvite}
            onAddAgent={handleAddAgent}
            onDeleteAgent={handleDeleteAgent}
            onUpdateWidgetConfig={handleSaveSettings}
            onOpenCodeGsModal={() => setIsCodeGsModalOpen(true)}
            onSendAdminMessage={handleSendAdminMessage}
            onChangeStatus={handleChangeStatus}
            onAssignAgent={handleAssignAgent}
            onBlockUser={handleBlockUser}
            onUnblockUser={handleUnblockUser}
            onStartNewChat={handleStartCustomerChat}
            onDeleteMessage={handleDeleteMessage}
          />
        )}
      </main>

      {/* Admin Login Modal Overlay */}
      {isAdminLoginModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => setIsAdminLoginModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-md">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">এডমিন ও সাপোর্ট এজেন্ট লগইন</h2>
              <p className="text-xs text-slate-500">
                এডমিন প্যানেল ও ইনবক্সে প্রবেশ করতে ইউজারনেম ও পাসওয়ার্ড লিখুন।
              </p>
            </div>

            {adminLoginError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
                {adminLoginError}
              </div>
            )}

            <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ইউজারনেম (Username)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={adminLoginUsername}
                    onChange={(e) => setAdminLoginUsername(e.target.value)}
                    placeholder="ইউজারনেম লিখুন"
                    className="w-full p-3 pl-10 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  পাসওয়ার্ড (Password)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={adminLoginPassword}
                    onChange={(e) => setAdminLoginPassword(e.target.value)}
                    placeholder="পাসওয়ার্ড লিখুন"
                    className="w-full p-3 pl-10 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAdminLoginLoading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isAdminLoginLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>লগইন যাচাই হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>লগইন করুন</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Embed Script Modal */}
      <WidgetEmbedModal
        isOpen={isEmbedModalOpen}
        onClose={() => setIsEmbedModalOpen(false)}
        widgetConfig={widgetConfig}
      />

      {/* Code.gs Google Apps Script Modal */}
      <CodeGsModal
        isOpen={isCodeGsModalOpen}
        onClose={() => setIsCodeGsModalOpen(false)}
        webAppUrl={widgetConfig.appsScriptUrl}
      />

      {/* Real-time Admin-to-User Device Notification Toast & Banner */}
      <DeviceNotificationToast
        notification={activeDeviceNotification}
        onDismiss={() => setActiveDeviceNotification(null)}
        onOpenChat={() => {
          setActiveTab('widget_preview');
        }}
      />
    </div>
  );
}
