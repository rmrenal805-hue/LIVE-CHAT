import React, { useState } from 'react';
import { Search, Star, Clock, AlertCircle, CheckCircle2, UserX, MessageSquare, Smile, Frown, Meh } from 'lucide-react';
import { ChatSession, ChatStatus, ChatMessage } from '../../types';
import { analyzeChatSessionSentiment } from '../../utils/sentiment';

interface ConversationListProps {
  chats: ChatSession[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  activeFilter: 'all' | 'unassigned' | 'active' | 'waiting' | 'resolved' | 'starred' | 'frustrated' | 'happy';
  setActiveFilter: (filter: 'all' | 'unassigned' | 'active' | 'waiting' | 'resolved' | 'starred' | 'frustrated' | 'happy') => void;
  messagesMap?: Record<string, ChatMessage[]>;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  chats,
  selectedChatId,
  onSelectChat,
  activeFilter,
  setActiveFilter,
  messagesMap,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter logic
  const filteredChats = chats.filter((chat) => {
    // Search query
    const matchesSearch =
      chat.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (chat.subject && chat.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      chat.department.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'starred') return chat.isStarred;
    if (activeFilter === 'unassigned') return chat.status === 'unassigned' || !chat.assignedAgentId;
    if (activeFilter === 'frustrated') {
      const sentiment = analyzeChatSessionSentiment(messagesMap?.[chat.id] || [], chat.lastMessage);
      return sentiment.sentiment === 'frustrated';
    }
    if (activeFilter === 'happy') {
      const sentiment = analyzeChatSessionSentiment(messagesMap?.[chat.id] || [], chat.lastMessage);
      return sentiment.sentiment === 'happy';
    }
    if (activeFilter === 'all') return true;
    return chat.status === activeFilter;
  });

  return (
    <div id="agent-inbox-pane" className="w-full border-r border-slate-200 bg-white flex flex-col h-full shrink-0">
      
      {/* Inbox Top Search & Filters */}
      <div className="p-3.5 border-b border-slate-200 space-y-3 bg-slate-50/50">
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="agent-chat-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="গ্রাহকের নাম, ইমেইল বা বিষয় খুঁজুন..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs no-scrollbar">
          {[
            { id: 'all', label: 'সব চ্যাট' },
            { id: 'frustrated', label: '😠 অসন্তুষ্ট' },
            { id: 'happy', label: '😊 সন্তুষ্ট' },
            { id: 'unassigned', label: 'অ্যাসাইন ছাড়া' },
            { id: 'active', label: 'চলতি চ্যাট' },
            { id: 'waiting', label: 'অপেক্ষমাণ' },
            { id: 'resolved', label: 'সমাধানকৃত' },
            { id: 'starred', label: 'স্টার চিহ্নিত' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                activeFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Cards List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {filteredChats.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="font-medium">কোনো চ্যাট পাওয়া যায়নি</p>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isSelected = chat.id === selectedChatId;
            const hasUnread = chat.unreadCountAgent > 0;
            const chatMsgs = messagesMap?.[chat.id] || [];
            const sentiment = analyzeChatSessionSentiment(chatMsgs, chat.lastMessage);

            return (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`p-3.5 cursor-pointer transition flex items-start gap-3 border-l-4 ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-600'
                    : hasUnread
                    ? 'bg-white border-blue-400 font-semibold'
                    : 'bg-white border-transparent hover:bg-slate-50'
                }`}
              >
                {/* Customer Avatar */}
                <div className="relative shrink-0">
                  <img
                    src={chat.customer.avatar}
                    alt={chat.customer.name}
                    className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200"
                  />
                  {chat.isStarred && (
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 absolute -top-1 -right-1" />
                  )}
                </div>

                {/* Conversation Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{chat.customer.name}</h4>
                    <span className="text-[10px] text-slate-400 shrink-0">{chat.lastMessageTime}</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className="text-[10px] font-mono text-slate-600 font-bold truncate bg-slate-100 px-1.5 py-0.5 rounded-md">
                      🆔 {chat.id}
                    </span>

                    {/* Sentiment Indicator Badge */}
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${sentiment.badgeClass}`}
                      title={`কাস্টমার মনোভাব স্কোর: ${sentiment.score}`}
                    >
                      <span>{sentiment.emoji}</span>
                      <span>{sentiment.labelEn}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono mb-1.5">
                    <span className="bg-blue-50 text-blue-700 border border-blue-200/80 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-1">
                      📱 {chat.customer.phone || '01712345678'}
                    </span>
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-1">
                      🌐 IP: {chat.customer.ipAddress || '103.205.132.42'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                        {chat.department}
                      </span>

                      {/* Status pill */}
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium uppercase tracking-wider ${
                          chat.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : chat.status === 'unassigned'
                            ? 'bg-amber-100 text-amber-700'
                            : chat.status === 'waiting'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {chat.status}
                      </span>
                    </div>

                    {/* Unread Badge */}
                    {hasUnread && (
                      <span className="bg-rose-600 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                        {chat.unreadCountAgent}টি নতুন
                      </span>
                    )}
                  </div>

                  {/* Last Message Snippet */}
                  {chat.lastMessage && (
                    <p className={`text-xs truncate ${hasUnread ? 'font-bold text-slate-900 bg-amber-100/60 px-1.5 py-0.5 rounded' : 'text-slate-500'}`}>
                      💬 {chat.lastMessage}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
