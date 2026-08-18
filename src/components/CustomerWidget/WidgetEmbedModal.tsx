import React, { useState } from 'react';
import { X, Copy, Check, Code, Globe } from 'lucide-react';
import { WidgetConfig } from '../../types';

interface WidgetEmbedModalProps {
  isOpen: boolean;
  onClose: () => void;
  widgetConfig: WidgetConfig;
}

export const WidgetEmbedModal: React.FC<WidgetEmbedModalProps> = ({ isOpen, onClose, widgetConfig }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const scriptCode = `<!-- NovaChat Live Chat Widget Embed Code -->
<script
  src="https://cdn.novachat.io/v1/widget.js"
  data-app-id="app_nova_9921"
  data-color="${widgetConfig.primaryColor}"
  data-title="${widgetConfig.headerTitle}"
  data-position="${widgetConfig.position}"
  async
></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div id="embed-code-modal" className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Code className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Embed Live Chat Code</h3>
            <p className="text-xs text-slate-500">Copy and paste this script right before the &lt;/body&gt; tag on your website.</p>
          </div>
        </div>

        <div className="bg-slate-950 rounded-xl p-4 text-slate-200 text-xs font-mono relative overflow-x-auto border border-slate-800">
          <pre>{scriptCode}</pre>
          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-sans font-medium flex items-center gap-1.5 transition border border-slate-700"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-300" />
                <span>Copy Snippet</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-4 bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-start gap-2 text-xs text-slate-600">
          <Globe className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <p>
            Works with standard HTML sites, WordPress, Shopify, Next.js, Webflow, Wix, and Squarespace.
          </p>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
