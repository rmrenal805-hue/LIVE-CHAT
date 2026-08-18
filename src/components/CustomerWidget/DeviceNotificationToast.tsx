import React, { useState, useEffect } from 'react';
import { Bell, X, Volume2, ExternalLink, MessageSquare, Sparkles, Zap } from 'lucide-react';
import { DeviceNotification } from '../../types';

interface DeviceNotificationToastProps {
  notification: DeviceNotification | null;
  onDismiss: () => void;
  onOpenChat: () => void;
}

// Synthesizer Web Audio chime player (instant, offline-safe, zero external dependencies)
export function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // Pleasant 3-note support chime: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz)
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc1.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.35);

    // Vibration on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  } catch (e) {
    // Audio context might be restricted before user gesture
  }
}

export const DeviceNotificationToast: React.FC<DeviceNotificationToastProps> = ({
  notification,
  onDismiss,
  onOpenChat,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      if (notification.soundEnabled !== false) {
        playNotificationSound();
      }

      // Try native browser notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const nativeNotif = new Notification(notification.title, {
            body: notification.body,
            icon: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
          });
          nativeNotif.onclick = () => {
            window.focus();
            if (notification.actionType === 'open_chat') {
              onOpenChat();
            } else if (notification.actionType === 'open_url' && notification.actionUrl) {
              window.open(notification.actionUrl, '_blank');
            }
          };
        } catch (e) {}
      }

      // Auto dismiss after 15 seconds if not urgent
      if (notification.priority !== 'urgent') {
        const timer = setTimeout(() => {
          setIsVisible(false);
          setTimeout(onDismiss, 300);
        }, 15000);
        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [notification]);

  if (!notification || !isVisible) return null;

  const handleActionClick = () => {
    if (notification.actionType === 'open_chat') {
      onOpenChat();
    } else if (notification.actionType === 'open_url' && notification.actionUrl) {
      window.open(notification.actionUrl, '_blank');
    }
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div className="fixed top-5 right-5 sm:right-6 z-[99999] max-w-sm w-full animate-in slide-in-from-top-4 duration-300 pointer-events-auto shadow-2xl">
      <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl border-2 border-blue-500/50 p-4 shadow-2xl space-y-3 relative overflow-hidden ring-4 ring-blue-500/10">
        {/* Glowing top line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-teal-400 animate-pulse" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 pt-0.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-lg shadow-md shrink-0 border border-white/20 animate-bounce">
              🔔
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                  {notification.senderName || 'এডমিন নোটিশ'}
                </span>
                {notification.priority === 'urgent' && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-rose-500/30 text-rose-300 border border-rose-500/40">
                    URGENT
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-white leading-snug">
                {notification.title}
              </h4>
            </div>
          </div>

          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onDismiss, 300);
            }}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            title="বন্ধ করুন"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body message */}
        <p className="text-xs text-slate-300 leading-relaxed pl-0.5">
          {notification.body}
        </p>

        {/* Action Button */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>লাইভ নোটিফিকেশন</span>
          </div>

          {notification.actionType === 'open_chat' && (
            <button
              onClick={handleActionClick}
              className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>চ্যাট খুলুন</span>
            </button>
          )}

          {notification.actionType === 'open_url' && notification.actionUrl && (
            <button
              onClick={handleActionClick}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>অফার দেখুন</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
