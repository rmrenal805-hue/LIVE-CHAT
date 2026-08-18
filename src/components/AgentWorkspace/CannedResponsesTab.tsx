import React, { useState } from 'react';
import { Zap, Plus, Search, Trash2, Tag, Copy, Check } from 'lucide-react';
import { CannedResponse } from '../../types';

interface CannedResponsesTabProps {
  cannedResponses: CannedResponse[];
  onAddCannedResponse: (data: { shortcut: string; title: string; content: string; category: string }) => void;
  onDeleteCannedResponse: (id: string) => void;
}

export const CannedResponsesTab: React.FC<CannedResponsesTabProps> = ({
  cannedResponses,
  onAddCannedResponse,
  onDeleteCannedResponse,
}) => {
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [shortcut, setShortcut] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = cannedResponses.filter(
    (c) =>
      c.shortcut.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.content.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortcut.trim() || !content.trim()) return;
    onAddCannedResponse({
      shortcut: shortcut.startsWith('/') ? shortcut : '/' + shortcut,
      title: title || shortcut,
      content,
      category,
    });
    setShortcut('');
    setTitle('');
    setContent('');
    setShowAddForm(false);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div id="canned-responses-page" className="flex-1 bg-slate-50 p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-6 h-6 text-amber-500 fill-amber-500" />
              <span>প্রস্তুতকৃত দ্রুত উত্তরসমূহ (Canned Snippets)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              গ্রাহকের সাধারণ প্রশ্নের জন্য আগে থেকে দ্রুত রিপ্লাই সেভ করে রাখুন। শর্টকাট যেমন <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">/price</code> বা <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">/hello</code> ব্যবহার করুন।
            </p>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন রিপ্লাই যোগ করুন</span>
          </button>
        </div>

        {/* Add Form Drawer */}
        {showAddForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-md space-y-4 animate-in fade-in">
            <h3 className="font-bold text-slate-900 text-sm">নতুন প্রস্তুতকৃত রিপ্লাই যোগ করুন</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">শর্টকাট (যেমন /price)</label>
                <input
                  type="text"
                  required
                  value={shortcut}
                  onChange={(e) => setShortcut(e.target.value)}
                  placeholder="/price"
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">শিরোনাম</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="মূল্য তালিকা সম্পর্কিত"
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ক্যাটাগরি</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white focus:outline-none"
                >
                  <option value="General">সাধারণ (General)</option>
                  <option value="Sales">বিক্রয় (Sales)</option>
                  <option value="Billing">বিলিং ও পেমেন্ট</option>
                  <option value="Technical">টেকনিক্যাল সাপোর্ট</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">সম্পূর্ণ উত্তর মেসেজ</label>
              <textarea
                required
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="শর্টকাট ব্যবহার করলে যে মেসেজটি গ্রাহকের কাছে যাবে..."
                className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs"
              >
                রিপ্লাই সেভ করুন
              </button>
            </div>
          </form>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="শর্টকাট, বিষয় বা কি-ওয়ার্ড দিয়ে খুঁজুন..."
            className="w-full pl-10 pr-4 py-2.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
          />
        </div>

        {/* Canned Responses Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2 hover:border-blue-200 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                    {item.shortcut}
                  </span>
                  <h4 className="font-bold text-slate-900 text-xs">{item.title}</h4>
                </div>

                <span className="text-[10px] font-semibold text-slate-500 px-2 py-0.5 bg-slate-100 rounded-full">
                  {item.category}
                </span>
              </div>

              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 whitespace-pre-wrap leading-relaxed">
                {item.content}
              </p>

              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  onClick={() => handleCopy(item.id, item.content)}
                  className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                >
                  {copiedId === item.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600">Copied to Clipboard</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => onDeleteCannedResponse(item.id)}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                  title="Delete snippet"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
