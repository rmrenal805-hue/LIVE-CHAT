import React, { useState } from 'react';
import { MessageSquare, X, Minimize2, Maximize2, ChevronDown } from 'lucide-react';
import { PreChatForm } from './PreChatForm';
import { ChatWindow } from './ChatWindow';
import { SatisfactionRating } from './SatisfactionRating';
import { ChatSession, ChatMessage, WidgetConfig } from '../../types';
import { recordChatInitiation } from '../../lib/visitorTracker';

interface CustomerChatWidgetProps {
  widgetConfig: WidgetConfig;
  chatSession: ChatSession | null;
  messages: ChatMessage[];
  onStartChat: (data: {
    customerName: string;
    customerPhone?: string;
    customerEmail: string;
    department: string;
    subject: string;
    problemIssue?: string;
    initialMessage: string;
  }) => void;
  onSendMessage: (text: string, attachments?: any[]) => void;
  onSendQuickReply: (text: string) => void;
  onTyping: (isTyping: boolean) => void;
  onSubmitRating: (rating: number, feedback: string) => void;
  onNewChat?: () => void;
  isTypingAgent?: string | null;
}

export const CustomerChatWidget: React.FC<CustomerChatWidgetProps> = ({
  widgetConfig,
  chatSession,
  messages,
  onStartChat,
  onSendMessage,
  onSendQuickReply,
  onTyping,
  onSubmitRating,
  onNewChat,
  isTypingAgent
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isRatingStep, setIsRatingStep] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const isBottomRight = widgetConfig.position === 'bottom-right';

  const handleStartChatSubmit = (data: {
    customerName: string;
    customerPhone?: string;
    customerEmail: string;
    department: string;
    subject: string;
    problemIssue?: string;
    initialMessage: string;
  }) => {
    recordChatInitiation();
    onStartChat(data);
    setIsFullScreen(true); // Automatically show full page chat box when start chat is clicked!
  };

  return (
    <>
      {/* Expanded Chat Box */}
      {isOpen && (
        <div
          id="customer-live-chat-widget-container"
          className={
            isFullScreen
              ? 'fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 md:p-6 flex flex-col items-center justify-center animate-in fade-in zoom-in-95'
              : `fixed z-40 flex flex-col items-end ${
                  isBottomRight ? 'bottom-5 right-5' : 'bottom-5 left-5'
                }`
          }
        >
          <div
            id="customer-widget-popup"
            className={
              isFullScreen
                ? 'w-full max-w-5xl h-full sm:h-[92vh] transition-all duration-300 rounded-2xl shadow-2xl overflow-hidden'
                : 'w-[320px] sm:w-[355px] h-[465px] mb-3 transition-all duration-200 animate-in fade-in slide-in-from-bottom-5'
            }
          >
            {isRatingStep ? (
              <div className="bg-white rounded-2xl h-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col justify-center">
                <SatisfactionRating
                  onSubmit={(rating, feedback) => {
                    onSubmitRating(rating, feedback);
                    setTimeout(() => {
                      setIsRatingStep(false);
                      setIsOpen(false);
                      setIsFullScreen(false);
                    }, 1500);
                  }}
                />
              </div>
            ) : !chatSession ? (
              <div className="bg-white rounded-2xl h-full shadow-2xl border border-slate-200 overflow-y-auto relative flex flex-col">
                {/* Widget Header */}
                <div
                  style={{ backgroundColor: widgetConfig.primaryColor }}
                  className="p-4 text-white flex items-center justify-between rounded-t-2xl shadow-xs shrink-0"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm leading-tight">{widgetConfig.headerTitle}</h3>
                      <p className="text-[11px] text-white/80">Support Agents Online</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setIsFullScreen(!isFullScreen)}
                      title={isFullScreen ? "স্মল উইজেটে আনুন" : "ফুল পেজ চ্যাট ভিউ"}
                      className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    >
                      {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Pre-chat Form */}
                <div className="flex-1 overflow-y-auto">
                  <PreChatForm widgetConfig={widgetConfig} onSubmit={handleStartChatSubmit} />
                </div>
              </div>
            ) : (
              <ChatWindow
                chat={chatSession}
                messages={messages}
                widgetConfig={widgetConfig}
                onSendMessage={onSendMessage}
                onSendQuickReply={onSendQuickReply}
                onTyping={onTyping}
                onEndChat={() => setIsRatingStep(true)}
                onCloseWidget={() => setIsOpen(false)}
                onNewChat={onNewChat}
                isTypingAgent={isTypingAgent}
                isFullScreen={isFullScreen}
                onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
              />
            )}
          </div>

          {/* Launcher Bubble inside non-fullscreen widget container */}
          {!isFullScreen && (
            <button
              id="widget-launcher-bubble"
              onClick={() => setIsOpen(!isOpen)}
              style={{ backgroundColor: widgetConfig.primaryColor }}
              className="w-14 h-14 rounded-full text-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 group relative ring-4 ring-white/20"
            >
              <ChevronDown className="w-6 h-6 transition-transform group-hover:translate-y-0.5" />
            </button>
          )}
        </div>
      )}

      {/* Launcher Bubble when Widget is Closed */}
      {!isOpen && (
        <div
          className={`fixed z-40 flex flex-col items-end ${
            isBottomRight ? 'bottom-5 right-5' : 'bottom-5 left-5'
          }`}
        >
          <button
            id="widget-launcher-bubble"
            onClick={() => {
              recordChatInitiation();
              setIsOpen(true);
            }}
            style={{ backgroundColor: widgetConfig.primaryColor }}
            className="w-14 h-14 rounded-full text-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 group relative ring-4 ring-white/20 cursor-pointer"
          >
            <MessageSquare className="w-6 h-6" />
            {chatSession && chatSession.unreadCountCustomer > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-bounce shadow">
                {chatSession.unreadCountCustomer}
              </span>
            )}
          </button>
        </div>
      )}
    </>
  );
};
