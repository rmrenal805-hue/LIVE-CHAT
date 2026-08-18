import React, { useState } from 'react';
import { Code, Copy, Check, X, FileCode2, ExternalLink, ShieldCheck, Download } from 'lucide-react';

interface CodeGsModalProps {
  isOpen: boolean;
  onClose: () => void;
  webAppUrl?: string;
}

export const CODE_GS_SCRIPT = `// ========================================================
// NovaChat (নোভাচ্যাট) - Google Apps Script (Code.gs)
// ========================================================
// ১. আপনার Google Sheet ওপেন করে Extensions > Apps Script-এ যান।
// ২. এই সমস্ত কোড পেস্ট করে Save করুন।
// ৩. Deploy > New Deployment > Select type: Web App
// ৪. Who has access: "Anyone" সিলেক্ট করে Deploy করুন।
// ========================================================

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // ১. লগইন হিস্ট্রি সিঙ্ক (Login History Sheet)
    if (data.type === 'login_log') {
      var loginSheet = ss.getSheetByName("লগইন হিস্ট্রি (Login Sheet)") || ss.insertSheet("লগইন হিস্ট্রি (Login Sheet)");
      if (loginSheet.getLastRow() === 0) {
        loginSheet.appendRow([
          "সময় (Timestamp)",
          "ইউজারনেম (Username)",
          "নাম (Name)",
          "রোল (Role)",
          "ইমেইল (Email)",
          "ডিপার্টমেন্ট (Department)"
        ]);
        var hRange = loginSheet.getRange(1, 1, 1, 6);
        hRange.setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
      }
      if (data.loginData) {
        var ld = data.loginData;
        loginSheet.appendRow([
          ld.timestamp || new Date().toLocaleString("bn-BD"),
          ld.username || "",
          ld.name || "",
          ld.role || "",
          ld.email || "",
          ld.department || ""
        ]);
      }
      return ContentService
        .createTextOutput(JSON.stringify({ result: "success", type: "login_log" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ২. এডমিন ও এজেন্ট ইউজার অ্যাকাউন্টস সিঙ্ক (Admin & Agent Accounts Sheet)
    if (data.type === 'admin_sheet') {
      var adminSheet = ss.getSheetByName("এডমিন ইউজার তালিকা (Admin Users)") || ss.insertSheet("এডমিন ইউজার তালিকা (Admin Users)");
      adminSheet.clear(); // রিফ্রেশ টেবিল
      adminSheet.appendRow([
        "আইডি (ID)",
        "ইউজারনেম (Username)",
        "পাসওয়ার্ড (Password)",
        "নাম (Name)",
        "রোল (Role)",
        "ইমেইল (Email)",
        "ডিপার্টমেন্ট (Department)",
        "অ্যাকাউন্ট তৈরির সময় (Created At)",
        "সর্বশেষ লগইন (Last Login)"
      ]);
      var hRange2 = adminSheet.getRange(1, 1, 1, 9);
      hRange2.setFontWeight("bold").setBackground("#2563eb").setFontColor("#ffffff");

      if (data.adminUsers && data.adminUsers.length > 0) {
        data.adminUsers.forEach(function(u) {
          adminSheet.appendRow([
            u.id || "",
            u.username || "",
            u.password || "",
            u.name || "",
            u.role || "",
            u.email || "",
            u.department || "",
            u.createdAt || "",
            u.lastLoginAt || ""
          ]);
        });
      }
      return ContentService
        .createTextOutput(JSON.stringify({ result: "success", type: "admin_sheet" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ৩. লাইভ চ্যাট মেসেজ সিঙ্ক (Live Chat Messages)
    var sheet = ss.getActiveSheet();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "সময় (Timestamp)",
        "চ্যাট আইডি (Chat ID)",
        "গ্রাহকের নাম (Customer Name)",
        "ইমেইল / ফোন (Email/Phone)",
        "ডিপার্টমেন্ট (Department)",
        "স্ট্যাটাস (Status)",
        "প্রেরক (Sender)",
        "মেসেজ (Message)",
        "স্টার রেটিং (Rating)"
      ]);
      var headerRange = sheet.getRange(1, 1, 1, 9);
      headerRange.setFontWeight("bold").setBackground("#059669").setFontColor("#ffffff");
    }
    
    if (data.rows && data.rows.length > 0) {
      data.rows.forEach(function(r) {
        sheet.appendRow([
          r.timestamp || new Date().toLocaleString("bn-BD"),
          r.chatId || "",
          r.customerName || "",
          r.customerEmail || "",
          r.department || "সাধারণ সাপোর্ট",
          r.status || "active",
          r.sender || "",
          r.content || "",
          r.rating || ""
        ]);
      });
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ result: "success", count: data.rows ? data.rows.length : 0 }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: "active",
      app: "NovaChat Google Apps Script Webhook",
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

export const CodeGsModal: React.FC<CodeGsModalProps> = ({ isOpen, onClose, webAppUrl }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(CODE_GS_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([CODE_GS_SCRIPT], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Code.gs';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <FileCode2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>Google Apps Script - Code.gs</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950">
                  ১০০% ফ্রি
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                গুগল শিটে এপিআই কি ছাড়াই অটোমেটিক লাইভ চ্যাট মেসেজ সেভ করার জন্য এই কোডটি ব্যবহার করুন।
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Instruction steps */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-emerald-900/50 space-y-2 text-slate-300">
            <h4 className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
              <ShieldCheck className="w-4 h-4" />
              <span>কিভাবে আপনার Google Sheet-এ যুক্ত করবেন:</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300 leading-relaxed">
              <li>আপনার <strong>Google Sheet</strong> ব্রাউজারে তৈরি করুন বা খুলুন।</li>
              <li>উপরের মেনু থেকে <strong>Extensions &gt; Apps Script</strong> এ ক্লিক করুন।</li>
              <li>সেখানে থাকা ডিফল্ট কোডটি মুছে দিয়ে নিচের সম্পূর্ণ <strong>Code.gs</strong> পেস্ট করুন।</li>
              <li>উপরে ডান কোনায় <strong>Deploy &gt; New deployment</strong> এ চাপ দিন।</li>
              <li><i>Select type</i> আইকনে চেপে <strong>Web app</strong> সিলেক্ট করুন এবং <i>Who has access</i> ঘরে <strong>"Anyone"</strong> নির্বাচন করে Deploy দিন।</li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-400 text-xs font-mono">Code.gs Script Content:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadFile}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1.5 transition text-xs font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Code.gs ফাইল ডাউনলোড</span>
              </button>
              <button
                onClick={handleCopy}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg flex items-center gap-1.5 shadow-md transition text-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'কোড কপি হয়েছে!' : 'Code.gs কপি করুন'}</span>
              </button>
            </div>
          </div>

          {/* Code Viewer */}
          <div className="relative">
            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] leading-relaxed text-emerald-300 overflow-x-auto max-h-80 select-all">
              {CODE_GS_SCRIPT}
            </pre>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
};
