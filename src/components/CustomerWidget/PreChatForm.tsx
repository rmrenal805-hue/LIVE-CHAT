import React, { useState } from 'react';
import { Send, User, Mail, Phone, HelpCircle } from 'lucide-react';
import { WidgetConfig, SUPPORT_PROBLEM_OPTIONS, type SupportProblemIssue } from '../../types';
import { LoadingSpinner } from '../LoadingSpinner';
import { getSavedCustomerProfile, saveCustomerProfile } from '../../lib/visitorIdentity';

interface PreChatFormProps {
  widgetConfig: WidgetConfig;
  onSubmit: (data: {
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    department: string;
    subject: string;
    problemIssue?: string;
    initialMessage: string;
  }) => void;
}

export const PreChatForm: React.FC<PreChatFormProps> = ({ widgetConfig, onSubmit }) => {
  const savedProfile = getSavedCustomerProfile();
  const [customerName, setCustomerName] = useState(savedProfile.name || '');
  const [customerPhone, setCustomerPhone] = useState(savedProfile.phone || '');
  const [customerEmail, setCustomerEmail] = useState(savedProfile.email || '');
  const [problemIssue, setProblemIssue] = useState<SupportProblemIssue>('withdraw_problem');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('অনুগ্রহ করে আপনার নাম এবং মোবাইল নম্বর প্রদান করুন।');
      return;
    }
    const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      alert('অনুগ্রহ করে একটি সঠিক ১০ বা ১১ ডিজিটের মোবাইল নম্বর প্রদান করুন (যেমন: 01712345678)।');
      return;
    }

    // Save profile locally so customer identity is retained across sessions
    saveCustomerProfile(customerName.trim(), cleanPhone, customerEmail.trim());

    const selectedOption = SUPPORT_PROBLEM_OPTIONS.find((opt) => opt.value === problemIssue);
    const calculatedSubject = selectedOption?.bangla || 'সাপোর্ট অনুসন্ধান';
    const autoInitialMessage = `হ্যালো, আমার বিষয়: ${calculatedSubject}। অনুগ্রহ করে সহায়তা করুন।`;
    const defaultDept = widgetConfig.departments[0] || 'গ্রাহক সহায়তা (Customer Support)';

    setIsSubmitting(true);
    setTimeout(() => {
      onSubmit({
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        customerEmail: customerEmail.trim(),
        department: defaultDept,
        subject: calculatedSubject,
        problemIssue,
        initialMessage: autoInitialMessage,
      });
      setIsSubmitting(false);
    }, 300);
  };

  return (
    <form onSubmit={handleSubmit} id="pre-chat-form" className="p-5 space-y-3.5 text-slate-800">
      <div className="text-center mb-2">
        <h3 className="font-semibold text-slate-900 text-base">লাইভ চ্যাট শুরু করুন</h3>
        <p className="text-xs text-slate-500 mt-0.5">সাপোর্ট এজেন্টের সাথে সরাসরি কথা বলতে তথ্য দিন।</p>
      </div>

      {/* Full Name */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">আপনার নাম *</label>
        <div className="relative">
          <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="prechat-name-input"
            type="text"
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="যেমন: তানজিলা পারভীন"
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>
      </div>

      {/* Phone Number */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">মোবাইল নম্বর * (চ্যাট আইডি তৈরিতে ব্যবহৃত)</label>
        <div className="relative">
          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="prechat-phone-input"
            type="tel"
            required
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="01712345678"
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-mono"
          />
        </div>
      </div>

      {/* Email Address */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">ইমেইল ঠিকানা (ঐচ্ছিক)</label>
        <div className="relative">
          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="prechat-email-input"
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="tanjila@example.com"
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>
      </div>

      {/* Problem Issue Selection */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          সমস্যার ধরন / বিষয় নির্বাচন করুন *
        </label>
        <div className="relative">
          <HelpCircle className="w-4 h-4 text-amber-500 absolute left-3 top-2.5" />
          <select
            id="prechat-problem-issue-select"
            value={problemIssue}
            onChange={(e) => setProblemIssue(e.target.value as SupportProblemIssue)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-amber-300 rounded-lg bg-amber-50/50 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition cursor-pointer"
          >
            {SUPPORT_PROBLEM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.icon} {opt.bangla}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Submit Button */}
      <button
        id="prechat-start-chat-btn"
        type="submit"
        disabled={isSubmitting}
        style={{ backgroundColor: widgetConfig.primaryColor }}
        className="w-full py-2.5 px-4 text-white text-xs font-semibold rounded-lg shadow-md hover:opacity-95 transition flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer mt-2"
      >
        {isSubmitting ? (
          <LoadingSpinner size="xs" color="white" label="সংযুক্ত হচ্ছে..." />
        ) : (
          <>
            <span>চ্যাট শুরু করুন</span>
            <Send className="w-3.5 h-3.5" />
          </>
        )}
      </button>
    </form>
  );
};
