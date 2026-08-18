import React, { useState } from 'react';
import { X, Sparkles, Check, Play, RefreshCw, Palette, Layers, Zap } from 'lucide-react';
import { LoadingSpinner, SpinnerSize, SpinnerColor, SpinnerVariant } from '../LoadingSpinner';

interface SpinnerSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySpinnerSettings?: (settings: SpinnerConfig) => void;
}

export interface SpinnerConfig {
  variant: SpinnerVariant;
  color: SpinnerColor;
  size: SpinnerSize;
  label: string;
  sublabel: string;
  speed: 'slow' | 'normal' | 'fast';
}

const SPINNER_PRESETS: { id: SpinnerVariant; name: string; description: string; icon: string }[] = [
  { id: 'spinner', name: 'ক্লাসিক স্পিনার (Classic)', description: 'স্ট্যান্ডার্ড স্মুথ রাউন্ডেড স্পিনিং লোডার', icon: '🔄' },
  { id: 'ring', name: 'ডুয়াল রিং (Dual Ring)', description: 'ডাবল অপোজিট রোটেটিং রিং অ্যানিমেশন', icon: '🪐' },
  { id: 'pulse', name: 'পালস রেডার (Pulse Radar)', description: 'স্মুথ ব্রিদিং ও পালসিং সার্কেল ইফেক্ট', icon: '💫' },
  { id: 'dots', name: 'বাউন্সিং ডটস (Dots Wave)', description: 'তিনটি ডটের স্মুথ ওয়েব অ্যানিমেশন', icon: '⚪' },
  { id: 'bars', name: 'অ্যাকোলাইজার বার্স (Bars)', description: 'মিউজিক্যাল স্পেকট্রাম লোডিং অ্যানিমেশন', icon: '📊' },
  { id: 'card', name: 'কার্ড লোডার (Card Box)', description: 'শেডো ব্যাকগ্রাউন্ড সহ সেন্টার্ড লোডার বক্স', icon: '🔲' },
  { id: 'overlay', name: 'ফুলস্ক্রিন ওভারলে (Overlay)', description: 'ব্যাকড্রপ ব্লার সহ প্রিমিয়াম ফুলস্ক্রিন লোডার', icon: '✨' },
];

const COLOR_OPTIONS: { id: SpinnerColor; name: string; bg: string }[] = [
  { id: 'primary', name: 'ডিফল্ট ব্লু', bg: 'bg-blue-600' },
  { id: 'indigo', name: 'রয়াল ইন্ডিগো', bg: 'bg-indigo-600' },
  { id: 'emerald', name: 'ভাইব্রেন্ট গ্রিন', bg: 'bg-emerald-600' },
  { id: 'rose', name: 'রুবি রেড', bg: 'bg-rose-600' },
  { id: 'slate', name: 'ডার্ক স্লেট', bg: 'bg-slate-800' },
  { id: 'white', name: 'সলিড হোয়াইট', bg: 'bg-slate-300' },
];

export const SpinnerSetupModal: React.FC<SpinnerSetupModalProps> = ({
  isOpen,
  onClose,
  onApplySpinnerSettings,
}) => {
  const [selectedVariant, setSelectedVariant] = useState<SpinnerVariant>('spinner');
  const [selectedColor, setSelectedColor] = useState<SpinnerColor>('primary');
  const [selectedSize, setSelectedSize] = useState<SpinnerSize>('lg');
  const [label, setLabel] = useState<string>('তথ্য লোড হচ্ছে...');
  const [sublabel, setSublabel] = useState<string>('দয়া করে অপেক্ষা করুন...');
  const [isLiveTesting, setIsLiveTesting] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleTestLiveOverlay = () => {
    setIsLiveTesting(true);
    setTimeout(() => {
      setIsLiveTesting(false);
    }, 2500);
  };

  const handleSaveConfig = () => {
    const config: SpinnerConfig = {
      variant: selectedVariant,
      color: selectedColor,
      size: selectedSize,
      label,
      sublabel,
      speed: 'normal',
    };
    try {
      localStorage.setItem('novachat_spinner_config', JSON.stringify(config));
    } catch {
      // safe fallback
    }
    if (onApplySpinnerSettings) {
      onApplySpinnerSettings(config);
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      
      {/* Live Overlay Test Preview */}
      {isLiveTesting && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-center text-center max-w-xs border border-slate-200 animate-in zoom-in-95">
            <LoadingSpinner
              variant={selectedVariant === 'overlay' ? 'spinner' : selectedVariant}
              color={selectedColor}
              size={selectedSize}
              label={label}
              sublabel={sublabel}
            />
            <button
              onClick={() => setIsLiveTesting(false)}
              className="mt-4 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              বন্ধ করুন (ESC)
            </button>
          </div>
        </div>
      )}

      {/* Main Modal Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-900">
        
        {/* Modal Top Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-amber-300 shadow-inner">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-1.5">
                <span>স্পিনার মডেল ও লোডার সেটআপ</span>
                <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                  PRO
                </span>
              </h3>
              <p className="text-[10px] text-slate-300">
                অ্যাপের সকল লোডিং স্টেট, ড্রাফট ও ডেটা ফেচিং স্পিনার কনফিগার করুন
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* Live Preview Box */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-2xl border border-slate-800 text-white flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden shadow-inner">
            <div className="absolute top-2.5 left-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>লাইভ স্পিনার প্রিভিউ</span>
            </div>

            <div className="py-2">
              <LoadingSpinner
                variant={selectedVariant}
                color={selectedColor === 'slate' ? 'white' : selectedColor}
                size={selectedSize}
                label={label}
                sublabel={sublabel}
              />
            </div>

            <div className="absolute bottom-2.5 right-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestLiveOverlay}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 shadow-sm transition cursor-pointer"
              >
                <Play className="w-2.5 h-2.5 fill-white" />
                <span>ফুলস্ক্রিন টেস্ট</span>
              </button>
            </div>
          </div>

          {/* Spinner Style Selector */}
          <div>
            <label className="font-bold text-slate-800 flex items-center gap-1.5 mb-2">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>স্পিনার অ্যানিমেশন স্টাইল সিলেক্ট করুন:</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SPINNER_PRESETS.map((pst) => (
                <button
                  key={pst.id}
                  onClick={() => setSelectedVariant(pst.id)}
                  className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2 cursor-pointer ${
                    selectedVariant === pst.id
                      ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 text-blue-950 font-bold'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="text-base">{pst.icon}</span>
                  <div className="min-w-0">
                    <p className="font-bold text-[11px] leading-tight truncate">{pst.name}</p>
                    <p className="text-[9px] text-slate-500 leading-tight mt-0.5">{pst.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Color & Size Controls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Color Theme */}
            <div>
              <label className="font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                <Palette className="w-3.5 h-3.5 text-indigo-600" />
                <span>কালার থিম:</span>
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedColor(c.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] transition cursor-pointer ${
                      selectedColor === c.id
                        ? 'bg-slate-900 text-white font-bold border-slate-900 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${c.bg} shrink-0 ring-1 ring-slate-300`} />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Size Selector */}
            <div>
              <label className="font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>সাইজ স্কেলিং:</span>
              </label>
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                {(['sm', 'md', 'lg', 'xl'] as SpinnerSize[]).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSelectedSize(sz)}
                    className={`flex-1 py-1 text-center font-bold text-[11px] rounded-lg transition uppercase cursor-pointer ${
                      selectedSize === sz
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Custom Labels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 mb-1 block text-[11px]">
                প্রধান টেক্সট (Main Label):
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="যেমন: তথ্য লোড হচ্ছে..."
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 mb-1 block text-[11px]">
                সাব-টেক্সট (Sub Label):
              </label>
              <input
                type="text"
                value={sublabel}
                onChange={(e) => setSublabel(e.target.value)}
                placeholder="যেমন: দয়া করে অপেক্ষা করুন..."
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-300 transition text-xs cursor-pointer"
          >
            বাতিল
          </button>

          <button
            type="button"
            onClick={handleSaveConfig}
            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-md transition text-xs flex items-center gap-1.5 cursor-pointer"
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>সফলভাবে সংরক্ষিত!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>স্পিনার মডেল সেভ ও অ্যাপ্লাই করুন</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
