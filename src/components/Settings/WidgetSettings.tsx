import React, { useState } from 'react';
import { Settings, Save, Check, Palette, Bot, Sliders, FileSpreadsheet, ExternalLink, RefreshCw, AlertCircle, Copy, Download, Code, CheckCircle2, Bell, Send } from 'lucide-react';
import { WidgetConfig } from '../../types';

interface WidgetSettingsProps {
  widgetConfig: WidgetConfig;
  onSaveSettings: (updated: Partial<WidgetConfig>) => void;
}

const PRESET_COLORS = [
  { name: 'রয়েল ব্লু', hex: '#2563eb' },
  { name: 'ইন্ডিগো', hex: '#4f46e5' },
  { name: 'ভায়োলেট', hex: '#7c3aed' },
  { name: 'এমেরাল্ড গ্রিন', hex: '#059669' },
  { name: 'রোজ রেড', hex: '#e11d48' },
  { name: 'ডার্ক স্লেট', hex: '#0f172a' },
];

export const WidgetSettings: React.FC<WidgetSettingsProps> = ({ widgetConfig, onSaveSettings }) => {
  const [config, setConfig] = useState<WidgetConfig>({ ...widgetConfig });
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Google Sheets Integration State
  const [webAppUrl, setWebAppUrl] = useState(
    widgetConfig.appsScriptUrl || 'https://script.google.com/macros/s/AKfycbwu5k4e4-cs6tvC7Xc9tADJu24yuBvzV6ccZAl4HG4d8T3y_eTRxbP05V0lMzmU2rHz/exec'
  );
  const [accessToken, setAccessToken] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ url?: string; count?: number; error?: string; message?: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeSyncTab, setActiveSyncTab] = useState<'no_api' | 'csv' | 'oauth'>('no_api');

  // Telegram Testing State
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    setTelegramStatus(null);
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: config.telegramBotToken,
          chatId: config.telegramChatId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTelegramStatus({ success: true, message: data.message });
      } else {
        setTelegramStatus({ error: data.error });
      }
    } catch (err: any) {
      setTelegramStatus({ error: err.message || 'নেটওয়ার্ক কানেকশন সমস্যা' });
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedConfig = { ...config, appsScriptUrl: webAppUrl.trim() };
    onSaveSettings(updatedConfig);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  // Google Apps Script Code Snippet for Two-Way Google Sheet <-> Admin Sync
  const hostOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
  const APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    if (sheet.getLastRow() == 0) {
      sheet.appendRow(["Timestamp", "Chat ID", "Customer Name", "Email", "Department", "Status", "Sender", "Message", "Rating"]);
    }
    
    if (data.rows && data.rows.length > 0) {
      data.rows.forEach(function(r) {
        sheet.appendRow([r.timestamp, r.chatId, r.customerName, r.customerEmail, r.department, r.status, r.sender, r.content, r.rating]);
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify({result: "success"})).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({result: "error", message: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

// 📱 Auto Forward New SMS from Google Sheet / Mobile App to NovaChat Admin Panel
function forwardSmsToNovaAdmin(phone, message, customerName) {
  var ADMIN_WEBHOOK = "${hostOrigin}/api/webhook/sms";
  var payload = {
    phone: phone,
    message: message,
    customerName: customerName || "SMS Customer"
  };
  
  UrlFetchApp.fetch(ADMIN_WEBHOOK, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  });
}`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  // Sync without API Key via Google Apps Script Webhook
  const handleSyncAppsScript = async () => {
    if (!webAppUrl.trim()) {
      setSyncResult({ error: 'অনুগ্রহ করে আপনার গুগল অ্যাপস স্ক্রিপ্ট (Google Apps Script) ওয়েব অ্যাপ URL প্রদান করুন।' });
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch('/api/sheets/apps-script-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webAppUrl: webAppUrl.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSyncResult({
          message: data.message || 'গুগল শিটে চ্যাট ডেটা সফলভাবে সিঙ্ক হয়েছে!',
          count: data.rowsExported,
        });
      } else {
        setSyncResult({ error: data.error || 'গুগল শিটে সিঙ্ক করতে ব্যর্থ হয়েছে।' });
      }
    } catch (err: any) {
      setSyncResult({ error: err.message || 'নেটওয়ার্ক বা ওয়েব হুক কানেকশনে সমস্যা হয়েছে।' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync using OAuth Access Token
  const handleSyncOAuth = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      let tokenToUse = accessToken;
      if (!tokenToUse) {
        tokenToUse = prompt('আপনার Google OAuth Access Token টি লিখুন বা পেস্ট করুন:') || '';
      }

      if (!tokenToUse) {
        setSyncResult({ error: 'গুগল শিট কানেক্ট করার জন্য OAuth অ্যাকসেস টোকেন প্রয়োজন।' });
        setIsSyncing(false);
        return;
      }

      const res = await fetch('/api/sheets/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: tokenToUse,
          spreadsheetId: spreadsheetId || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSyncResult({
          url: data.spreadsheetUrl,
          count: data.rowsExported,
          message: 'গুগল স্প্রেডশিটে সফলভাবে লাইভ চ্যাট মেসেজ সেভ হয়েছে!',
        });
        if (data.spreadsheetId) setSpreadsheetId(data.spreadsheetId);
      } else {
        setSyncResult({ error: data.error || 'গুগল শিট সিঙ্ক করতে ব্যর্থ হয়েছে।' });
      }
    } catch (err: any) {
      setSyncResult({ error: err.message || 'গুগল শিট সিঙ্ক প্রক্রিয়ায় ত্রুটি ঘটেছে।' });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div id="settings-page" className="flex-1 bg-slate-50 p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-6 h-6 text-blue-600" />
              <span>লাইভ চ্যাট ও গুগল শিট সেটিংস</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              গুগল শিটে অটোমেটিক মেসেজ স্টোরেজ, এআই অ্যাসিস্ট্যান্ট কনফিগারেশন এবং লাইভ চ্যাট উইজেট ডিজাইন কাস্টমাইজ করুন।
            </p>
          </div>

          <button
            form="widget-settings-form"
            type="submit"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center justify-center gap-2 transition"
          >
            {savedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            <span>{savedSuccess ? 'সেটিংস সেভ হয়েছে!' : 'সেটিংস সেভ করুন'}</span>
          </button>
        </div>

        {/* GOOGLE SHEETS LIVE CHAT STORAGE CARD (API ছাড়া বা সহজ উপায়ে) */}
        <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 text-white rounded-2xl p-5 border border-emerald-700/50 shadow-md space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-300">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <span>গুগল শিট চ্যাট স্টোরেজ সিস্টেম</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950">
                    এপিআই ছাড়া (No API Required)
                  </span>
                </h3>
                <p className="text-xs text-emerald-200/80">
                  কোনো পেইড বা জটিল এপিআই ছাড়াই সরাসরি গুগল শিটে সমস্ত কাস্টমার চ্যাট, মোবাইল নম্বর ও তথ্য সেভ করুন।
                </p>
              </div>
            </div>

            {/* Sync Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-emerald-800/60 self-start md:self-auto text-xs">
              <button
                type="button"
                onClick={() => setActiveSyncTab('no_api')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeSyncTab === 'no_api' ? 'bg-emerald-500 text-slate-950' : 'text-emerald-200 hover:text-white'
                }`}
              >
                অ্যাপস স্ক্রিপ্ট (No API)
              </button>
              <button
                type="button"
                onClick={() => setActiveSyncTab('csv')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeSyncTab === 'csv' ? 'bg-emerald-500 text-slate-950' : 'text-emerald-200 hover:text-white'
                }`}
              >
                CSV এক্সপোর্ট
              </button>
              <button
                type="button"
                onClick={() => setActiveSyncTab('oauth')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeSyncTab === 'oauth' ? 'bg-emerald-500 text-slate-950' : 'text-emerald-200 hover:text-white'
                }`}
              >
                OAuth টোকেন
              </button>
            </div>
          </div>

          {/* TAB 1: NO API - Apps Script Webhook */}
          {activeSyncTab === 'no_api' && (
            <div className="bg-slate-900/70 border border-emerald-800/60 rounded-xl p-4 space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5 text-sm">
                  <Code className="w-4 h-4 text-emerald-400" />
                  <span>উপায় ১: গুগল অ্যাপস স্ক্রিপ্ট ওয়েব হুক (১০০% ফ্রি ও এপিআই ছাড়া)</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg flex items-center gap-1 transition"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'কোড কপি হয়েছে!' : 'স্ক্রিপ্ট কোড কপি করুন'}</span>
                </button>
              </div>

              {/* Step by step guide */}
              <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <li>আপনার <strong>Google Sheet</strong> খুলে মেনু থেকে <strong>Extensions &gt; Apps Script</strong> এ যান।</li>
                <li>পুরানো সব কোড মুছে দিয়ে উপরের <strong>'স্ক্রিপ্ট কোড কপি করুন'</strong> বাটন চেপে কোডটি পেস্ট করুন।</li>
                <li>উপরে ডান কোনায় <strong>Deploy &gt; New deployment</strong> এ চাপ দিন।</li>
                <li>Select type &gt; <strong>Web app</strong> দিন এবং <i>Who has access</i> ঘরে <strong>"Anyone"</strong> নির্বাচন করে Deploy করুন।</li>
                <li>প্রাপ্ত <strong>Web app URL</strong> টি নিচের ঘরে পেস্ট করে সিঙ্ক চাপুন!</li>
              </ol>

              <div>
                <label className="block font-semibold text-emerald-200 mb-1">Google Apps Script Web App URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={webAppUrl}
                    onChange={(e) => setWebAppUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 p-2.5 bg-slate-950 border border-emerald-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={handleSyncAppsScript}
                    disabled={isSyncing}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl flex items-center gap-2 shadow-md transition shrink-0"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'সিঙ্ক হচ্ছে...' : 'গুগল শিটে সেভ করুন'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Direct CSV Export for Google Sheets */}
          {activeSyncTab === 'csv' && (
            <div className="bg-slate-900/70 border border-emerald-800/60 rounded-xl p-4 space-y-3 text-xs">
              <span className="font-bold text-emerald-300 flex items-center gap-1.5 text-sm">
                <Download className="w-4 h-4 text-emerald-400" />
                <span>উপায় ২: ডাইরেক্ট গুগল শিট ফরম্যাট ডাউনলোড</span>
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                এক ক্লিকেই সমস্ত লাইভ চ্যাট ডায়ালগ, গ্রাহকের নাম, ইমেইল, সময় এবং চ্যাট রেটিং গুগল শিট রেডি CSV ফাইল হিসেবে ডাউনলোড করুন। ডাউনলোড করা ফাইলটি সরাসরি Google Sheets-এ `File &gt; Import` করে নিতে পারবেন।
              </p>
              <a
                href="/api/sheets/csv"
                download="live_chat_storage.csv"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-md transition"
              >
                <Download className="w-4 h-4" />
                <span>গুগল শিট ফাইল ডাউনলোড করুন (CSV)</span>
              </a>
            </div>
          )}

          {/* TAB 3: OAuth Token Sync */}
          {activeSyncTab === 'oauth' && (
            <div className="bg-slate-900/70 border border-emerald-800/60 rounded-xl p-4 space-y-3 text-xs">
              <span className="font-bold text-emerald-300 flex items-center gap-1.5 text-sm">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>উপায় ৩: গুগল OAuth অ্যাকসেস টোকেন সিঙ্ক</span>
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-emerald-200 mb-1">Google OAuth Access Token</label>
                  <input
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="Bearer Access Token পেস্ট করুন..."
                    className="w-full p-2.5 bg-slate-950 border border-emerald-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-emerald-200 mb-1">Spreadsheet ID (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                    placeholder="ফাঁকা রাখলে নতুন শিট তৈরি হবে..."
                    className="w-full p-2.5 bg-slate-950 border border-emerald-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSyncOAuth}
                disabled={isSyncing}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl flex items-center gap-2 shadow-md transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'সিঙ্ক হচ্ছে...' : 'OAuth দিয়ে স্প্রেডশিটে সেভ করুন'}</span>
              </button>
            </div>
          )}

          {/* Sync Status Notifications */}
          {syncResult?.error && (
            <div className="bg-rose-950/90 border border-rose-500/50 p-3 rounded-xl flex items-center gap-2 text-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{syncResult.error}</span>
            </div>
          )}

          {syncResult?.message && (
            <div className="bg-emerald-950/90 border border-emerald-400/50 p-3 rounded-xl flex items-center justify-between text-xs text-emerald-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold text-emerald-300">{syncResult.message}</span>
                  <p className="text-[11px] text-emerald-200/80 mt-0.5">
                    মোট {syncResult.count || 0} টি চ্যাট মেসেজ ও লিড স্প্রেডশিটে সেভ হয়েছে।
                  </p>
                </div>
              </div>
              {syncResult.url && (
                <a
                  href={syncResult.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg flex items-center gap-1.5 transition shrink-0"
                >
                  <span>শিট ওপেন করুন</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* SETTINGS FORM */}
        <form id="widget-settings-form" onSubmit={handleSubmit} className="space-y-6 text-xs text-slate-700">
          
          {/* Visual Styling */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Palette className="w-4 h-4 text-blue-600" />
              <span>উইজেট হেডার ও কালার থিম</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">হেডার টাইটেল (বাংলা)</label>
                <input
                  type="text"
                  value={config.headerTitle}
                  onChange={(e) => setConfig({ ...config, headerTitle: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">উইজেটের অবস্থান (Position)</label>
                <select
                  value={config.position}
                  onChange={(e) => setConfig({ ...config, position: e.target.value as any })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none"
                >
                  <option value="bottom-right">নিচে ডান পাশে (Bottom Right)</option>
                  <option value="bottom-left">নিচে বাম পাশে (Bottom Left)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1.5">ব্র্যান্ডিং কালার থিম</label>
              <div className="flex items-center gap-3 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c.hex}
                    onClick={() => setConfig({ ...config, primaryColor: c.hex })}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                      config.primaryColor === c.hex ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-200'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full shadow-2xs" style={{ backgroundColor: c.hex }} />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">স্বাগতম শুভেচ্ছা মেসেজ</label>
              <input
                type="text"
                value={config.welcomeMessage}
                onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">কানেক্টেড ওয়েবসাইট লিংক (Website URL)</label>
              <input
                type="text"
                value={config.websiteUrl || 'https://live-chat-swart-nine.vercel.app/'}
                onChange={(e) => setConfig({ ...config, websiteUrl: e.target.value })}
                placeholder="https://live-chat-swart-nine.vercel.app/"
                className="w-full p-2.5 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                ফায়ারবেস ডেটাবেসে আপনার চ্যাট উইজেট ব্যাকএন্ডের সাথে যুক্ত লাইভ ওয়েবসাইট ইউআরএল।
              </p>
            </div>
          </div>

          {/* AI Auto-Responder */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Bot className="w-4 h-4 text-indigo-600" />
                <span>জেমি নাই (Gemini) এআই অটো-রেসপন্ডার</span>
              </h3>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enableAiAutoReply}
                  onChange={(e) => setConfig({ ...config, enableAiAutoReply: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">এআই সহকারীর নাম</label>
                <input
                  type="text"
                  value={config.botName}
                  onChange={(e) => setConfig({ ...config, botName: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">এআই বটের অ্যাভাটার ইমেজ URL</label>
                <input
                  type="text"
                  value={config.botAvatar}
                  onChange={(e) => setConfig({ ...config, botAvatar: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">এআই সিস্টেমের নির্দেশিকা ও তথ্য প্রসঙ্গ (Prompt)</label>
              <textarea
                rows={4}
                value={config.aiSystemPrompt}
                onChange={(e) => setConfig({ ...config, aiSystemPrompt: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none leading-relaxed"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                গ্রাহকদের অটোমেটিক বাংলা উত্তর দেওয়ার জন্য Gemini 3.6 Flash এই ইনস্ট্রাকশনটি ব্যবহার করবে।
              </p>
            </div>
          </div>

          {/* Department Routing */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              <span>ডিপার্টমেন্ট ও প্রি-চ্যাট ফর্ম</span>
            </h3>

            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={config.requirePreChatForm}
                onChange={(e) => setConfig({ ...config, requirePreChatForm: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span>চ্যাট শুরু করার আগে গ্রাহকের নাম ও কন্টাক্ট ফর্ম বাধ্যতামূলক করুন</span>
            </label>

            <div>
              <label className="block font-semibold mb-1">সক্রিয় ডিপার্টমেন্ট তালিকা (কমা দিয়ে আলাদা করুন)</label>
              <input
                type="text"
                value={config.departments.join(', ')}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    departments: e.target.value.split(',').map((d) => d.trim()).filter(Boolean),
                  })
                }
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          {/* Telegram Bot Notification Settings */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-600" />
                <span>টেলিগ্রাম বট নোটিফিকেশন সেটিংস (Telegram Bot Alerts)</span>
              </h3>
              <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                ইনস্ট্যান্ট এসএমএস নোটিফিকেশন
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              নতুন কোনো কাস্টমার ওয়েবসাইট চ্যাটে বার্তা পাঠালে বা চ্যাট শুরু করলে সাথে সাথে আপনার টেলিগ্রাম গ্রুপ বা চ্যাটে অটোমেটিক ইনস্ট্যান্ট অ্যালার্ট নোটিফিকেশন মেসেজ চলে যাবে।
            </p>

            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={config.telegramNotificationsEnabled ?? true}
                onChange={(e) => setConfig({ ...config, telegramNotificationsEnabled: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span>নতুন কাস্টমার মেসেজে টেলিগ্রাম নোটিফিকেশন অ্যালার্ট চালু রাখুন</span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block font-semibold text-xs text-slate-700 mb-1">
                  Telegram Bot Token
                </label>
                <input
                  type="text"
                  placeholder="যেমন: 123456789:ABCdefGhIJK..."
                  value={config.telegramBotToken || ''}
                  onChange={(e) => setConfig({ ...config, telegramBotToken: e.target.value.trim() })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none text-xs font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  টেলিগ্রামে <b>@BotFather</b> দিয়ে বট তৈরি করে বটের API Token এখানে দিন।
                </p>
              </div>

              <div>
                <label className="block font-semibold text-xs text-slate-700 mb-1">
                  Telegram Chat ID / Group ID
                </label>
                <input
                  type="text"
                  placeholder="যেমন: 987654321 বা -100123456789"
                  value={config.telegramChatId || ''}
                  onChange={(e) => setConfig({ ...config, telegramChatId: e.target.value.trim() })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none text-xs font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  <b>@userinfobot</b> বা গ্রুপে বট অ্যাড করে গ্রুপের Chat ID পাবেন।
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={testingTelegram}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition border border-blue-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {testingTelegram ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-blue-600" />
                )}
                <span>টেস্ট নোটিফিকেশন পাঠান</span>
              </button>

              {telegramStatus && (
                <div className="text-xs font-semibold">
                  {telegramStatus.success ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      {telegramStatus.message}
                    </span>
                  ) : (
                    <span className="text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {telegramStatus.error}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
