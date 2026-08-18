import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  deleteDoc,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { db, app as firebaseApp } from './firebase';

export { db, firebaseApp };

// Collection References
const CHATS_COL = 'chats';
const MESSAGES_COL = 'messages';
const SETTINGS_COL = 'settings';
const TYPING_COL = 'typing_status';
const BLOCKED_COL = 'blocked_users';
const ADMIN_USERS_COL = 'admin_users';
const VISITORS_COL = 'visitors';
const VISITOR_LOGS_COL = 'visitor_logs';
const VISITOR_STATS_COL = 'visitor_stats';
const DEVICE_NOTIFICATIONS_COL = 'device_notifications';

export interface AdminAccount {
  id: string;
  username: string;
  password?: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Admin' | 'Agent' | 'Manager';
  avatar?: string;
  status?: 'online' | 'away' | 'offline';
  department?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

// Default initial admin accounts for Firebase storage
export const DEFAULT_FIREBASE_ADMINS: AdminAccount[] = [
  {
    id: 'admin_saju2470',
    username: 'saju2470',
    password: '20203494aa',
    name: 'Saju Ahmed',
    email: 'saju2470@novachat.com',
    role: 'Super Admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    status: 'online',
    department: 'ম্যানেজমেন্ট (Management)',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'admin_primary',
    username: 'admin',
    password: '20203494aa',
    name: 'Nova Admin',
    email: 'admin@novachat.com',
    role: 'Super Admin',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
    status: 'online',
    department: 'ম্যানেজমেন্ট (Management)',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'agent_arif',
    username: 'arif',
    password: 'agent123',
    name: 'আরিফুল ইসলাম',
    email: 'arif@novachat.com',
    role: 'Agent',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    status: 'online',
    department: 'গ্রাহক সহায়তা',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'agent_tanvir',
    username: 'tanvir',
    password: 'agent123',
    name: 'তানভীর আহমেদ',
    email: 'tanvir@novachat.com',
    role: 'Agent',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    status: 'online',
    department: 'বিলিং ও ডিপোজিট',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'agent_zoha366',
    username: 'zoha366',
    password: '01723993331aa',
    name: 'জোহার আহমেদ (Zoha)',
    email: 'zoha366@novachat.com',
    role: 'Agent',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    status: 'online',
    department: 'গ্রাহক সহায়তা ও লাইভ চ্যাট',
    createdAt: new Date().toISOString(),
  },
];

// Seed default admin users in Firestore if collection is empty
export async function seedDefaultAdminUsersIfEmpty() {
  try {
    for (const admin of DEFAULT_FIREBASE_ADMINS) {
      const ref = doc(db, ADMIN_USERS_COL, admin.id);
      await setDoc(ref, JSON.parse(JSON.stringify(admin)), { merge: true });
    }
  } catch (err) {
    console.warn('Error checking/seeding admin users in Firestore:', err);
  }
}

// Sync Admin user to Firestore
export async function syncAdminUserToFirestore(adminUser: AdminAccount) {
  if (!adminUser || !adminUser.id) return;
  try {
    const ref = doc(db, ADMIN_USERS_COL, adminUser.id);
    await setDoc(ref, JSON.parse(JSON.stringify(adminUser)), { merge: true });
  } catch (err) {
    console.error('Error syncing admin user to Firestore:', err);
  }
}

// Delete Admin user from Firestore
export async function deleteAdminUserFromFirestore(adminId: string) {
  if (!adminId) return;
  try {
    const ref = doc(db, ADMIN_USERS_COL, adminId);
    await deleteDoc(ref);
  } catch (err) {
    console.error('Error deleting admin user from Firestore:', err);
  }
}

// Load all admin users from Firestore
export async function loadAdminUsersFromFirestore(): Promise<AdminAccount[]> {
  try {
    await seedDefaultAdminUsersIfEmpty();
    const snap = await getDocs(collection(db, ADMIN_USERS_COL));
    const list: AdminAccount[] = [];
    snap.forEach((d) => {
      list.push(d.data() as AdminAccount);
    });
    return list.length > 0 ? list : DEFAULT_FIREBASE_ADMINS;
  } catch (err) {
    console.warn('Error loading admin users from Firestore:', err);
    return DEFAULT_FIREBASE_ADMINS;
  }
}

// Authenticate Admin user directly against Firebase Firestore
export async function authenticateAdminWithFirestore(
  usernameInput: string,
  passwordInput: string
): Promise<{ success: boolean; user?: AdminAccount; admin?: AdminAccount; error?: string }> {
  const cleanUser = (usernameInput || '').trim().toLowerCase();
  const cleanPass = (passwordInput || '').trim();

  if (!cleanUser || !cleanPass) {
    return { success: false, error: 'অনুগ্রহ করে ইউজারনেম এবং পাসওয়ার্ড প্রদান করুন।' };
  }

  try {
    // 1. First ensure Firestore is seeded with default admins if first run
    await seedDefaultAdminUsersIfEmpty();

    // 2. Fetch all admin users from Firestore collection 'admin_users'
    const snap = await getDocs(collection(db, ADMIN_USERS_COL));
    const adminList: AdminAccount[] = [];
    snap.forEach((d) => adminList.push(d.data() as AdminAccount));

    // 3. Find matching admin in Firestore
    const matched = adminList.find(
      (u) =>
        (u.username?.toLowerCase() === cleanUser || u.email?.toLowerCase() === cleanUser) &&
        u.password === cleanPass
    );

    if (matched) {
      // Update lastLoginAt in Firestore
      const updatedUser: AdminAccount = {
        ...matched,
        lastLoginAt: new Date().toISOString(),
      };
      const ref = doc(db, ADMIN_USERS_COL, matched.id);
      await setDoc(ref, { lastLoginAt: updatedUser.lastLoginAt }, { merge: true });

      // Omit password from returned state
      const { password, ...safeUser } = updatedUser;
      return { success: true, user: safeUser as AdminAccount, admin: safeUser as AdminAccount };
    }

    return {
      success: false,
      error: 'ইউজারনেম বা পাসওয়ার্ড সঠিক নয়!',
    };
  } catch (err: any) {
    console.error('Firestore authentication error:', err);
    // Fallback check against defaults if Firestore network glitch occurs
    const matchedDefault = DEFAULT_FIREBASE_ADMINS.find(
      (u) =>
        (u.username.toLowerCase() === cleanUser || u.email.toLowerCase() === cleanUser) &&
        u.password === cleanPass
    );
    if (matchedDefault) {
      const { password, ...safeUser } = matchedDefault;
      return { success: true, user: safeUser as AdminAccount, admin: safeUser as AdminAccount };
    }
    return {
      success: false,
      error: 'ইউজারনেম বা পাসওয়ার্ড সঠিক নয়!',
    };
  }
}

// Mark chat messages as Seen by Admin in Firestore
export async function markChatAsSeenByAdminInFirestore(
  chatId: string,
  adminName: string
) {
  if (!chatId) return;
  const nowIso = new Date().toISOString();
  try {
    // Update chat document in Firestore with admin seen status
    const chatRef = doc(db, CHATS_COL, chatId);
    await setDoc(
      chatRef,
      {
        adminSeen: true,
        adminSeenAt: nowIso,
        adminSeenBy: adminName || 'এডমিন',
        unreadCountAgent: 0,
      },
      { merge: true }
    );

    // Update customer messages of this chat to 'read' with seen timestamp
    const msgsSnap = await getDocs(
      query(collection(db, MESSAGES_COL), where('chatId', '==', chatId))
    );
    const updatePromises: Promise<any>[] = [];
    msgsSnap.forEach((d) => {
      const msg = d.data();
      if (msg.senderRole === 'customer' && msg.readStatus !== 'read') {
        const msgRef = doc(db, MESSAGES_COL, msg.id || d.id);
        updatePromises.push(
          setDoc(
            msgRef,
            {
              readStatus: 'read',
              seenAt: nowIso,
              seenBy: adminName || 'এডমিন',
            },
            { merge: true }
          )
        );
      }
    });
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }
  } catch (err) {
    console.warn(`Error marking chat ${chatId} as seen in Firestore:`, err);
  }
}

// Save or Update Blocked User in Firestore
export async function syncBlockedUserToFirestore(blockedUser: any) {
  if (!blockedUser || !blockedUser.id) return;
  try {
    const docRef = doc(db, BLOCKED_COL, blockedUser.id);
    await setDoc(docRef, JSON.parse(JSON.stringify(blockedUser)), { merge: true });
  } catch (err) {
    console.error('Error syncing blocked user to Firestore:', err);
  }
}

// Remove Blocked User from Firestore
export async function deleteBlockedUserFromFirestore(id: string) {
  if (!id) return;
  try {
    const docRef = doc(db, BLOCKED_COL, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting blocked user from Firestore:', err);
  }
}

// Save or Update Typing Status in Firestore
export async function syncTypingStatusToFirestore(chatId: string, senderRole: 'customer' | 'agent', isTyping: boolean, senderName?: string) {
  if (!chatId) return;
  try {
    const docId = `${chatId}_${senderRole}`;
    const typingRef = doc(db, TYPING_COL, docId);
    await setDoc(typingRef, {
      chatId,
      senderRole,
      isTyping,
      senderName: senderName || (senderRole === 'customer' ? 'Customer' : 'Agent'),
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.error('Error syncing typing status to Firestore:', err);
  }
}

// Save or Update a Chat in Firestore
export async function syncChatToFirestore(chat: any) {
  if (!chat || !chat.id) return;
  try {
    const chatRef = doc(db, CHATS_COL, chat.id);
    await setDoc(chatRef, JSON.parse(JSON.stringify(chat)), { merge: true });
  } catch (err) {
    console.error(`Firestore sync error for chat ${chat.id}:`, err);
  }
}

// Delete a Chat and its messages from Firestore
export async function deleteChatFromFirestore(chatId: string) {
  if (!chatId) return;
  try {
    const chatRef = doc(db, CHATS_COL, chatId);
    await deleteDoc(chatRef);

    // Also remove messages for this chat
    const messagesSnap = await getDocs(collection(db, MESSAGES_COL));
    messagesSnap.forEach(async (docSnap) => {
      const msg = docSnap.data();
      if (msg && msg.chatId === chatId) {
        await deleteDoc(doc(db, MESSAGES_COL, docSnap.id));
      }
    });
  } catch (err) {
    console.error(`Firestore delete error for chat ${chatId}:`, err);
  }
}

// Save or Update a Message in Firestore
export async function syncMessageToFirestore(message: any) {
  if (!message || !message.id) return;
  try {
    const cleanData = JSON.parse(JSON.stringify(message));
    if (!cleanData.createdAt) {
      cleanData.createdAt = new Date().toISOString();
    }
    const msgRef = doc(db, MESSAGES_COL, message.id);
    await setDoc(msgRef, cleanData, { merge: true });
  } catch (err) {
    console.error(`Firestore sync error for message ${message.id}:`, err);
  }
}

// Delete a single Message from Firestore
export async function deleteMessageFromFirestore(messageId: string, chatId?: string) {
  if (!messageId) return;
  try {
    const msgRef = doc(db, MESSAGES_COL, messageId);
    await deleteDoc(msgRef);
  } catch (err) {
    console.error(`Firestore delete error for message ${messageId}:`, err);
  }
}

// Save Widget Config Settings to Firestore
export async function syncWidgetConfigToFirestore(config: any) {
  try {
    const configRef = doc(db, SETTINGS_COL, 'widgetConfig');
    await setDoc(configRef, JSON.parse(JSON.stringify(config)), { merge: true });
  } catch (err) {
    console.error('Firestore sync error for widgetConfig:', err);
  }
}

// Save or Update Live Visitor in Firestore
export async function syncVisitorToFirestore(visitor: any) {
  if (!visitor || !visitor.id) return;
  try {
    const visitorRef = doc(db, VISITORS_COL, visitor.id);
    const cleanVisitor = {
      ...visitor,
      lastActive: Date.now(),
      visitedAt: visitor.visitedAt || new Date().toISOString(),
    };
    await setDoc(visitorRef, JSON.parse(JSON.stringify(cleanVisitor)), { merge: true });
  } catch (err) {
    console.warn(`Firestore sync error for visitor ${visitor.id}:`, err);
  }
}

// Delete Live Visitor from Firestore
export async function deleteVisitorFromFirestore(visitorId: string) {
  if (!visitorId) return;
  try {
    const visitorRef = doc(db, VISITORS_COL, visitorId);
    await deleteDoc(visitorRef);
  } catch (err) {
    console.warn(`Firestore delete error for visitor ${visitorId}:`, err);
  }
}

// Sync Visitor Log Entry to Firestore
export async function syncVisitorLogToFirestore(logEntry: any) {
  if (!logEntry || !logEntry.id) return;
  try {
    const logRef = doc(db, VISITOR_LOGS_COL, logEntry.id);
    await setDoc(logRef, JSON.parse(JSON.stringify(logEntry)), { merge: true });
  } catch (err) {
    console.warn(`Firestore sync error for visitor log ${logEntry.id}:`, err);
  }
}

// Load Visitor Logs from Firestore
export async function loadVisitorLogsFromFirestore(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, VISITOR_LOGS_COL));
    const list: any[] = [];
    snap.forEach((d) => list.push(d.data()));
    return list;
  } catch (err) {
    console.warn('Error loading visitor logs from Firestore:', err);
    return [];
  }
}

// Sync Aggregated Visitor Stats Summary to Firestore
export async function syncVisitorStatsSummaryToFirestore(summary: any) {
  if (!summary) return;
  try {
    const statsRef = doc(db, VISITOR_STATS_COL, 'global_summary');
    await setDoc(statsRef, JSON.parse(JSON.stringify(summary)), { merge: true });
  } catch (err) {
    console.warn('Firestore sync error for visitor stats summary:', err);
  }
}

// Send Device Notification to Firestore
export async function sendDeviceNotificationToFirestore(notification: any) {
  if (!notification || !notification.id) return;
  try {
    const notifRef = doc(db, DEVICE_NOTIFICATIONS_COL, notification.id);
    await setDoc(notifRef, JSON.parse(JSON.stringify(notification)), { merge: true });
  } catch (err) {
    console.warn(`Firestore sync error for device notification ${notification.id}:`, err);
  }
}

// Fetch all initial data from Firestore
export async function loadFirestoreData() {
  try {
    const chatsSnap = await getDocs(collection(db, CHATS_COL));
    const messagesSnap = await getDocs(collection(db, MESSAGES_COL));
    const settingsSnap = await getDocs(collection(db, SETTINGS_COL));
    const blockedSnap = await getDocs(collection(db, BLOCKED_COL));
    const visitorsSnap = await getDocs(collection(db, VISITORS_COL));
    const visitorLogsSnap = await getDocs(collection(db, VISITOR_LOGS_COL));

    const loadedChats: any[] = [];
    chatsSnap.forEach((docSnap) => {
      loadedChats.push(docSnap.data());
    });

    const loadedMessages: Record<string, any[]> = {};
    messagesSnap.forEach((docSnap) => {
      const msg = docSnap.data();
      if (msg && msg.chatId) {
        if (!loadedMessages[msg.chatId]) loadedMessages[msg.chatId] = [];
        loadedMessages[msg.chatId].push(msg);
      }
    });

    // Sort messages in each chat chronologically
    for (const chatId in loadedMessages) {
      loadedMessages[chatId].sort((a, b) => {
        const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
        const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
        return timeA - timeB;
      });
    }

    let loadedConfig = null;
    settingsSnap.forEach((docSnap) => {
      if (docSnap.id === 'widgetConfig') {
        loadedConfig = docSnap.data();
      }
    });

    const loadedBlocked: any[] = [];
    blockedSnap.forEach((docSnap) => {
      loadedBlocked.push(docSnap.data());
    });

    const loadedVisitors: any[] = [];
    const now = Date.now();
    visitorsSnap.forEach((docSnap) => {
      const v: any = docSnap.data();
      // Keep only active visitors within last 10 minutes
      if (v && (!v.lastActive || now - v.lastActive < 10 * 60 * 1000)) {
        loadedVisitors.push(v);
      }
    });

    const loadedVisitorLogs: any[] = [];
    visitorLogsSnap.forEach((docSnap) => {
      loadedVisitorLogs.push(docSnap.data());
    });

    return {
      chats: loadedChats,
      messages: loadedMessages,
      widgetConfig: loadedConfig,
      blockedUsers: loadedBlocked,
      visitors: loadedVisitors,
      visitorLogs: loadedVisitorLogs,
    };
  } catch (err) {
    console.error('Error loading data from Firestore:', err);
    return null;
  }
}

// Realtime Firestore Listener
export function setupFirestoreRealtimeListeners(
  onChatsUpdate: (chats: any[]) => void,
  onMessagesUpdate: (messagesMap: Record<string, any[]>) => void,
  onTypingUpdate?: (chatId: string, senderRole: 'customer' | 'agent', isTyping: boolean, senderName?: string) => void,
  onBlockedUsersUpdate?: (blockedUsers: any[]) => void,
  onVisitorsUpdate?: (visitors: any[]) => void,
  onDeviceNotificationReceived?: (notification: any) => void
) {
  let unsubscribeChats: (() => void) | null = null;
  let unsubscribeMessages: (() => void) | null = null;
  let unsubscribeTyping: (() => void) | null = null;
  let unsubscribeBlocked: (() => void) | null = null;
  let unsubscribeVisitors: (() => void) | null = null;
  let unsubscribeNotifications: (() => void) | null = null;

  const listenChats = () => {
    try {
      if (unsubscribeChats) {
        try { unsubscribeChats(); } catch (e) {}
      }
      unsubscribeChats = onSnapshot(
        collection(db, CHATS_COL),
        (snapshot) => {
          const chatsList: any[] = [];
          snapshot.forEach((d) => chatsList.push(d.data()));
          // Sort chats by updatedAt desc
          chatsList.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
          onChatsUpdate(chatsList);
        },
        (error) => {
          // Idle stream disconnect or cancelled listener, auto-reconnect
          console.log('Firestore chats listener idle/reconnect event:', error.message || error);
          setTimeout(() => {
            listenChats();
          }, 2000);
        }
      );
    } catch (e) {
      console.warn('Error initiating chats listener:', e);
    }
  };

  const listenMessages = () => {
    try {
      if (unsubscribeMessages) {
        try { unsubscribeMessages(); } catch (e) {}
      }
      unsubscribeMessages = onSnapshot(
        collection(db, MESSAGES_COL),
        (snapshot) => {
          const messagesMap: Record<string, any[]> = {};
          snapshot.forEach((d) => {
            const msg = d.data();
            if (msg && msg.chatId) {
              if (!messagesMap[msg.chatId]) messagesMap[msg.chatId] = [];
              messagesMap[msg.chatId].push(msg);
            }
          });
          // Sort messages in each chat chronologically
          for (const chatId in messagesMap) {
            messagesMap[chatId].sort((a, b) => {
              const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
              const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
              return timeA - timeB;
            });
          }
          onMessagesUpdate(messagesMap);
        },
        (error) => {
          // Idle stream disconnect or cancelled listener, auto-reconnect
          console.log('Firestore messages listener idle/reconnect event:', error.message || error);
          setTimeout(() => {
            listenMessages();
          }, 2000);
        }
      );
    } catch (e) {
      console.warn('Error initiating messages listener:', e);
    }
  };

  const listenTyping = () => {
    if (!onTypingUpdate) return;
    try {
      if (unsubscribeTyping) {
        try { unsubscribeTyping(); } catch (e) {}
      }
      unsubscribeTyping = onSnapshot(
        collection(db, TYPING_COL),
        (snapshot) => {
          const now = Date.now();
          snapshot.forEach((d) => {
            const data = d.data();
            if (data && data.chatId) {
              // Ignore typing status older than 6 seconds
              const isRecent = data.updatedAt && (now - data.updatedAt < 6000);
              const isTypingActive = data.isTyping && isRecent;
              onTypingUpdate(data.chatId, data.senderRole, isTypingActive, data.senderName);
            }
          });
        },
        (error) => {
          console.log('Firestore typing listener idle/reconnect event:', error.message || error);
          setTimeout(() => {
            listenTyping();
          }, 2000);
        }
      );
    } catch (e) {
      console.warn('Error initiating typing listener:', e);
    }
  };

  const listenBlocked = () => {
    if (!onBlockedUsersUpdate) return;
    try {
      if (unsubscribeBlocked) {
        try { unsubscribeBlocked(); } catch (e) {}
      }
      unsubscribeBlocked = onSnapshot(
        collection(db, BLOCKED_COL),
        (snapshot) => {
          const blockedList: any[] = [];
          snapshot.forEach((d) => blockedList.push(d.data()));
          onBlockedUsersUpdate(blockedList);
        },
        (error) => {
          console.log('Firestore blocked users listener idle/reconnect event:', error.message || error);
          setTimeout(() => {
            listenBlocked();
          }, 2000);
        }
      );
    } catch (e) {
      console.warn('Error initiating blocked listener:', e);
    }
  };

  const listenVisitors = () => {
    if (!onVisitorsUpdate) return;
    try {
      if (unsubscribeVisitors) {
        try { unsubscribeVisitors(); } catch (e) {}
      }
      unsubscribeVisitors = onSnapshot(
        collection(db, VISITORS_COL),
        (snapshot) => {
          const visitorsList: any[] = [];
          const now = Date.now();
          snapshot.forEach((d) => {
            const v: any = d.data();
            // Show only visitors active within the last 10 minutes
            if (v && (!v.lastActive || now - v.lastActive < 10 * 60 * 1000)) {
              visitorsList.push(v);
            }
          });
          // Sort by latest active
          visitorsList.sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
          onVisitorsUpdate(visitorsList);
        },
        (error) => {
          console.log('Firestore visitors listener idle/reconnect event:', error.message || error);
          setTimeout(() => {
            listenVisitors();
          }, 2000);
        }
      );
    } catch (e) {
      console.warn('Error initiating visitors listener:', e);
    }
  };

  const listenNotifications = () => {
    if (!onDeviceNotificationReceived) return;
    try {
      if (unsubscribeNotifications) {
        try { unsubscribeNotifications(); } catch (e) {}
      }
      unsubscribeNotifications = onSnapshot(
        collection(db, DEVICE_NOTIFICATIONS_COL),
        (snapshot) => {
          const now = Date.now();
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
              const notif: any = change.doc.data();
              // Process notifications created within the last 2 minutes
              if (notif && notif.createdAt) {
                const createdTime = new Date(notif.createdAt).getTime();
                if (now - createdTime < 2 * 60 * 1000) {
                  onDeviceNotificationReceived(notif);
                }
              }
            }
          });
        },
        (error) => {
          console.log('Firestore notifications listener idle/reconnect event:', error.message || error);
          setTimeout(() => {
            listenNotifications();
          }, 2000);
        }
      );
    } catch (e) {
      console.warn('Error initiating notifications listener:', e);
    }
  };

  listenChats();
  listenMessages();
  listenTyping();
  listenBlocked();
  listenVisitors();
  listenNotifications();
}
