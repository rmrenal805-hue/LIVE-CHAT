import { ChatSession, ChatMessage, Agent, CannedResponse, LiveVisitor, WidgetConfig } from '../types';

export const INITIAL_AGENTS: Agent[] = [
  {
    id: 'agent_1',
    name: 'আরিফ রহমান',
    email: 'arif@support.bd',
    role: 'লিড সাপোর্ট',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    status: 'online',
    department: 'গ্রাহক সহায়তা (Customer Support)',
    activeChatsCount: 2
  },
  {
    id: 'agent_2',
    name: 'তানভীর আহমেদ',
    email: 'tanvir@support.bd',
    role: 'সাপোর্ট এজেন্ট',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    status: 'online',
    department: 'কারিগরি সেলস (Technical Sales)',
    activeChatsCount: 1
  },
  {
    id: 'agent_3',
    name: 'ফারহানা ইসলাম',
    email: 'farhana@support.bd',
    role: 'সাপোর্ট এজেন্ট',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    status: 'away',
    department: 'বিলিং ও পেমেন্ট (Billing)',
    activeChatsCount: 0
  },
  {
    id: 'agent_zoha',
    name: 'জোহার আহমেদ (Zoha)',
    email: 'zoha366@novachat.com',
    role: 'সাপোর্ট এজেন্ট',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    status: 'online',
    department: 'গ্রাহক সহায়তা ও লাইভ চ্যাট',
    activeChatsCount: 0
  }
];

export const INITIAL_WIDGET_CONFIG: WidgetConfig = {
  primaryColor: '#2563eb', // Blue-600
  headerTitle: 'লাইভ সাপোর্ট চ্যাট',
  welcomeMessage: '👋 আসসালামু আলাইকুম! আপনাকে কীভাবে সাহায্য করতে পারি?',
  botName: 'নোভা এআই সহকারী',
  botAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
  position: 'bottom-right',
  requirePreChatForm: true,
  enableAiAutoReply: false,
  aiSystemPrompt: 'আপনি নোভা সাপোর্ট সেন্টারের একজন বিনয়ী ও সহায়ক এআই অ্যাসিস্ট্যান্ট। বাংলায় অত্যন্ত প্রাঞ্জল ও দ্রুত উত্তর প্রদান করুন।',
  departments: ['গ্রাহক সহায়তা (Customer Support)', 'কারিগরি সেলস (Technical Sales)', 'বিলিং ও পেমেন্ট (Billing)', 'সাধারণ জিজ্ঞাসা (General)'],
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbwc3JsSAxjiMaln2A713d9TT0NZ3YQGIebEXrXIu8AgeLUGOWNMoJar_PihP2laJvFr/exec',
  websiteUrl: 'https://live-chat-swart-nine.vercel.app/',
  telegramBotToken: '8409188990:AAHR7bb3Zx9TcKpKEdldruvfVI-hRaoXfb4',
  telegramChatId: '6331230671',
  telegramBots: [
    {
      id: 'tg_bot_1',
      name: 'টেলিগ্রাম নোটিফিকেশন বট ১ (Primary)',
      botToken: '8409188990:AAHR7bb3Zx9TcKpKEdldruvfVI-hRaoXfb4',
      chatId: '6331230671',
      enabled: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tg_bot_2',
      name: 'টেলিগ্রাম নোটিফিকেশন বট ২ (Multi)',
      botToken: '8753033604:AAFE7Y99dJwN-F8h58OMywO1QW_7iqrkDcM',
      chatId: '6081054558',
      enabled: true,
      createdAt: new Date().toISOString(),
    }
  ],
  telegramNotificationsEnabled: true,
  noticeHeader: {
    enabled: true,
    text: '📢 বিশেষ বিজ্ঞপ্তি: সম্মানিত গ্রাহকবৃন্দ, লাইভ সাপোর্ট চ্যাটে আপনাকে স্বাগতম! যেকোনো প্রয়োজনে আমাদের প্রতিনিধিকে সরাসরি মেসেজ পাঠান।',
    speed: 'medium',
    theme: 'amber',
    icon: 'megaphone',
    linkUrl: 'https://live-chat-swart-nine.vercel.app/',
    linkText: 'অফিসিয়াল সাইট',
    updatedAt: new Date().toISOString()
  },
  promoBanners: [
    {
      id: 'promo_1',
      enabled: true,
      title: '🔥 অফিশিয়াল মেম্বারশিপ ও লাইভ পোর্টাল',
      description: 'আমাদের প্রধান ওয়েবসাইটের সার্ভিসসমূহ ও অফার দেখুন।',
      imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80',
      linkUrl: 'https://live-chat-swart-nine.vercel.app/',
      buttonText: 'প্রধান ওয়েবসাইট ভিজিট করুন 🚀'
    },
    {
      id: 'promo_2',
      enabled: true,
      title: '💎 নতুন রেজিস্ট্রেশন ও বোনাস সাইট',
      description: 'আজই অ্যাকাউন্ট তৈরি করে জিতে নিন আকর্ষণীয় পয়েন্ট ও সাপোর্ট ক্যাশব্যাক।',
      imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80',
      linkUrl: 'https://live-chat-swart-nine.vercel.app/',
      buttonText: 'রেজিস্ট্রেশন সাইটে যান 🔗'
    }
  ],
  promoBanner: {
    id: 'promo_1',
    enabled: true,
    title: '🔥 অফিশিয়াল মেম্বারশিপ ও লাইভ পোর্টাল',
    description: 'আমাদের প্রধান ওয়েবসাইটের সার্ভিসসমূহ ও অফার দেখুন।',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80',
    linkUrl: 'https://live-chat-swart-nine.vercel.app/',
    buttonText: 'প্রধান ওয়েবসাইট ভিজিট করুন 🚀'
  }
};

export const INITIAL_CANNED_RESPONSES: CannedResponse[] = [
  {
    id: 'canned_1',
    shortcut: '/greeting',
    title: 'স্বাগতম বার্তা',
    content: 'আসসালামু আলাইকুম! আমাদের লাইভ চ্যাটে আপনাকে স্বাগতম। আমি কীভাবে আপনাকে সাহায্য করতে পারি?',
    category: 'সাধারণ'
  },
  {
    id: 'canned_2',
    shortcut: '/pricing',
    title: 'প্রাইসিং ও প্যাকেজ তথ্য',
    content: 'আমাদের সার্ভিস প্যাকেজ ও মূল্য তালিকা দেখার জন্য অনুগ্রহ করে এই লিংকে ক্লিক করুন: https://example.com/pricing। আপনার পছন্দমত প্যাকেজ বেছে নিতে পারেন।',
    category: 'সেলস'
  },
  {
    id: 'canned_3',
    shortcut: '/refund',
    title: 'রিফান্ড ও ফেরত নীতি',
    content: 'আমাদের ১৪ দিনের ক্যাশব্যাক গ্যারান্টি রয়েছে। আপনার অর্ডার নম্বর বা ট্রানজেকশন আইডি প্রদান করলে দ্রুত রিফান্ড রিকোয়েস্ট প্রসেস করা হবে।',
    category: 'বিলিং'
  },
  {
    id: 'canned_4',
    shortcut: '/closing',
    title: 'ধন্যবাদান্তে চ্যাট সমাপ্তি',
    content: 'আপনাকে ধন্যবাদ! আপনার অন্য যেকোনো প্রয়োজনে আমাদের আবার জানাতে পারেন। ভালো থাকবেন!',
    category: 'সাধারণ'
  }
];

export const INITIAL_LIVE_VISITORS: LiveVisitor[] = [];

export const INITIAL_CHATS: ChatSession[] = [];

export const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {};

