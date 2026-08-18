import React from 'react';
import {
  MessageSquare,
  Users,
  Settings as SettingsIcon,
  Eye,
  RefreshCw,
  Wifi,
  WifiOff,
  ShieldCheck,
  LogOut,
  KeyRound,
  Bell,
  BellRing
} from 'lucide-react';
import { Agent } from '../types';

interface HeaderProps {
  activeTab: 'widget_preview' | 'agent_workspace' | 'visitors' | 'canned' | 'settings' | 'admin';
  setActiveTab: (tab: 'widget_preview' | 'agent_workspace' | 'visitors' | 'canned' | 'settings' | 'admin') => void;
  isConnected: boolean;
  activeAgent: Agent;
  agents: Agent[];
  onAgentChange: (agentId: string) => void;
  onAgentStatusChange: (status: 'online' | 'away' | 'offline') => void;
  onResetDemo: () => void;
  openEmbedModal: () => void;
  openCodeGsModal: () => void;
  unreadCount: number;
  liveVisitorsCount?: number;
  isAdminLoggedIn: boolean;
  currentUser?: { username?: string; name?: string; role?: string } | null;
  openAdminLoginModal: () => void;
  onAdminLogout: () => void;
  isNotificationEnabled?: boolean;
  onRequestNotificationPermission?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isConnected,
  activeAgent,
  agents,
  onAgentChange,
  onAgentStatusChange,
  onResetDemo,
  openEmbedModal,
  openCodeGsModal,
  unreadCount,
  liveVisitorsCount = 0,
  isAdminLoggedIn,
  currentUser,
  openAdminLoginModal,
  onAdminLogout,
  isNotificationEnabled = false,
  onRequestNotificationPermission
}) => {
  const isAgentRole = currentUser?.role === 'Agent' || currentUser?.username === 'zoha366' || currentUser?.username === 'arif' || currentUser?.username === 'tanvir';

  return (
    <header id="main-app-header" className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-sm select-none">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-12 sm:h-14 gap-1.5 sm:gap-3">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-xs sm:text-sm text-slate-100 tracking-tight whitespace-nowrap">নোভাচ্যাট</span>
              <span className={`text-[8px] font-semibold uppercase px-1 py-0.2 rounded border hidden xs:inline shrink-0 ${
                isAgentRole
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
              }`}>
                {isAgentRole ? 'এজেন্ট' : 'লাইভ'}
              </span>
            </div>
          </div>

          {/* Center Navigation Tabs (Role-Based Segmented Switch) */}
          {isAdminLoggedIn ? (
            <nav className="flex items-center bg-slate-800/95 p-0.5 rounded-lg border border-slate-700/70 shrink-0 gap-0.5">
              {/* 1. Inbox / Chat Workspace - Always Available */}
              <button
                id="nav-agent-workspace-btn"
                onClick={() => setActiveTab('agent_workspace')}
                className={`relative flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'agent_workspace'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
                title="এজেন্ট ইনবক্স ও চ্যাট"
              >
                <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>ইনবক্স</span>
                {unreadCount > 0 && (
                  <span className="bg-rose-500 text-white text-[8px] font-black rounded-full min-w-[14px] h-[14px] px-0.5 flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* 2. Live Visitors - Available for Agent & Admin */}
              <button
                id="nav-live-visitors-btn"
                onClick={() => setActiveTab('visitors')}
                className={`relative flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'visitors'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-300 hover:text-white hover:bg-slate-700/50'
                }`}
                title="লাইভ ভিজিটর তালিকা"
              >
                <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-emerald-400" />
                <span>লাইভ ভিজিটর</span>
                {liveVisitorsCount > 0 && (
                  <span className="bg-emerald-500/30 text-emerald-300 text-[8px] font-bold rounded-full px-1 py-0.2 border border-emerald-500/40 hidden sm:inline">
                    {liveVisitorsCount}
                  </span>
                )}
              </button>

              {/* 3. Admin Panel - HIDDEN for Agent, Visible only for Super Admin */}
              {!isAgentRole && (
                <button
                  id="nav-admin-panel-btn"
                  onClick={() => setActiveTab('admin')}
                  className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'admin'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                      : 'text-blue-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                  title="অ্যাডমিন প্যানেল"
                >
                  <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
                  <span>অ্যাডমিন</span>
                </button>
              )}

              {/* 4. Settings - HIDDEN for Agent, Visible only for Super Admin */}
              {!isAgentRole && (
                <button
                  id="nav-settings-btn"
                  onClick={() => setActiveTab('settings')}
                  className={`hidden md:flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'settings'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                  title="গুগল শিট সেটিংস"
                >
                  <SettingsIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>গুগল শিট</span>
                </button>
              )}
            </nav>
          ) : (
            <div className="hidden sm:block text-xs text-slate-400 font-medium truncate">
              লাইভ চ্যাট উইজেট
            </div>
          )}

          {/* Right Controls Bar */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            
            {/* Logged in User Badge */}
            {isAdminLoggedIn && currentUser && (
              <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 bg-slate-800/80 rounded-lg border border-slate-700 text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-200 font-medium truncate max-w-[120px]">
                  {currentUser.name || currentUser.username}
                </span>
                <span className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                  isAgentRole
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {isAgentRole ? 'সাপোর্ট এজেন্ট' : 'এডমিন'}
                </span>
              </div>
            )}

            
            {/* Notification Toggle Bell Button */}
            {onRequestNotificationPermission && (
              <button
                id="header-notification-toggle-btn"
                onClick={onRequestNotificationPermission}
                title={isNotificationEnabled ? 'নোটিফিকেশন অন আছে' : 'নোটিফিকেশন চালু করুন'}
                className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg border transition cursor-pointer shrink-0 ${
                  isNotificationEnabled
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                }`}
              >
                {isNotificationEnabled ? (
                  <BellRing className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                ) : (
                  <Bell className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
            )}

            {!isAdminLoggedIn ? (
              <button
                id="header-admin-login-btn"
                onClick={openAdminLoginModal}
                className="h-7 sm:h-8 px-2 sm:px-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-[10px] sm:text-xs rounded-lg shadow-sm flex items-center gap-1 transition cursor-pointer shrink-0"
              >
                <KeyRound className="w-3 h-3 text-emerald-300 shrink-0" />
                <span>লগইন</span>
              </button>
            ) : (
              <button
                id="header-admin-logout-btn"
                onClick={onAdminLogout}
                className="h-7 sm:h-8 px-1.5 sm:px-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-700/50 text-rose-300 hover:text-white text-[10px] sm:text-xs font-semibold rounded-lg transition flex items-center gap-1 cursor-pointer shrink-0"
                title="এডমিন লগআউট"
              >
                <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="hidden md:inline">লগআউট</span>
              </button>
            )}

            {/* Socket Status Indicator */}
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg border text-[10px] font-semibold shrink-0 ${
                isConnected
                  ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800/60'
                  : 'bg-amber-950/50 text-amber-400 border-amber-800/60 animate-pulse'
              }`}
              title={isConnected ? 'রিয়েল-টাইম সার্ভার সংযুক্ত' : 'সার্ভারে কানেকশন হচ্ছে...'}
            >
              {isConnected ? (
                <Wifi className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 animate-spin shrink-0" />
              )}
            </div>

            {/* Reset Demo Data */}
            <button
              id="reset-demo-data-btn"
              onClick={onResetDemo}
              title="রিসেট ডেমো ডেটা"
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 rounded-lg transition shrink-0 cursor-pointer hidden xs:flex"
            >
              <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};


