import React from 'react';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerColor = 'primary' | 'white' | 'blue' | 'slate' | 'indigo' | 'emerald' | 'rose';
export type SpinnerVariant = 'spinner' | 'dots' | 'pulse' | 'ring' | 'bars' | 'overlay' | 'card';

export interface LoadingSpinnerProps {
  size?: SpinnerSize;
  color?: SpinnerColor;
  variant?: SpinnerVariant;
  label?: string;
  sublabel?: string;
  className?: string;
  fullWidth?: boolean;
}

const sizeClasses: Record<SpinnerSize, { icon: string; text: string; subtext: string; box: string }> = {
  xs: { icon: 'w-3 h-3', text: 'text-xs', subtext: 'text-[10px]', box: 'p-1' },
  sm: { icon: 'w-4 h-4', text: 'text-xs', subtext: 'text-[10px]', box: 'p-2' },
  md: { icon: 'w-6 h-6', text: 'text-sm', subtext: 'text-xs', box: 'p-3' },
  lg: { icon: 'w-8 h-8', text: 'text-base', subtext: 'text-xs', box: 'p-4' },
  xl: { icon: 'w-12 h-12', text: 'text-lg', subtext: 'text-sm', box: 'p-6' },
};

const colorClasses: Record<SpinnerColor, { spinner: string; text: string; bg: string }> = {
  primary: { spinner: 'text-blue-600', text: 'text-slate-700', bg: 'bg-blue-50/50' },
  white: { spinner: 'text-white', text: 'text-white', bg: 'bg-white/10' },
  blue: { spinner: 'text-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
  slate: { spinner: 'text-slate-500', text: 'text-slate-600', bg: 'bg-slate-100' },
  indigo: { spinner: 'text-indigo-600', text: 'text-indigo-900', bg: 'bg-indigo-50' },
  emerald: { spinner: 'text-emerald-600', text: 'text-emerald-800', bg: 'bg-emerald-50' },
  rose: { spinner: 'text-rose-600', text: 'text-rose-800', bg: 'bg-rose-50' },
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  variant = 'spinner',
  label,
  sublabel,
  className = '',
  fullWidth = false,
}) => {
  const currentSize = sizeClasses[size];
  const currentColor = colorClasses[color];

  if (variant === 'overlay') {
    return (
      <div className={`absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex flex-col items-center justify-center z-50 p-4 transition-all duration-200 ${className}`}>
        <div className="bg-white rounded-2xl p-5 shadow-2xl flex flex-col items-center justify-center max-w-xs text-center border border-slate-100 animate-in fade-in zoom-in-95">
          <div className="relative mb-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
            </div>
            <Sparkles className="w-4 h-4 text-amber-500 absolute -top-1 -right-1 animate-pulse" />
          </div>
          {label && <p className="text-sm font-semibold text-slate-800 mb-0.5">{label}</p>}
          {sublabel && <p className="text-xs text-slate-500">{sublabel}</p>}
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col items-center justify-center text-center ${fullWidth ? 'w-full' : ''} ${className}`}>
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        </div>
        {label && <p className="text-sm font-semibold text-slate-800">{label}</p>}
        {sublabel && <p className="text-xs text-slate-500 mt-1">{sublabel}</p>}
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]"></span>
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]"></span>
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"></span>
        {label && <span className={`ml-2 font-medium ${currentSize.text} ${currentColor.text}`}>{label}</span>}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <span className={`relative flex ${currentSize.icon}`}>
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-full w-full bg-blue-500"></span>
        </span>
        {label && <span className={`font-medium ${currentSize.text} ${currentColor.text}`}>{label}</span>}
      </div>
    );
  }

  if (variant === 'bars') {
    return (
      <div className={`inline-flex items-center gap-1 ${className}`}>
        <div className="w-1 h-4 bg-blue-600 rounded-full animate-pulse [animation-delay:-0.4s]"></div>
        <div className="w-1 h-5 bg-blue-600 rounded-full animate-pulse [animation-delay:-0.2s]"></div>
        <div className="w-1 h-3 bg-blue-600 rounded-full animate-pulse"></div>
        {label && <span className={`ml-2 font-medium ${currentSize.text} ${currentColor.text}`}>{label}</span>}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 ${fullWidth ? 'w-full justify-center' : ''} ${className}`}>
      <Loader2 className={`${currentSize.icon} ${currentColor.spinner} animate-spin shrink-0`} />
      {(label || sublabel) && (
        <div className="flex flex-col text-left">
          {label && <span className={`font-medium leading-tight ${currentSize.text} ${currentColor.text}`}>{label}</span>}
          {sublabel && <span className={`leading-tight ${currentSize.subtext} text-slate-400`}>{sublabel}</span>}
        </div>
      )}
    </div>
  );
};

export interface ButtonSpinnerProps {
  loading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  size?: SpinnerSize;
  color?: SpinnerColor;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const LoadingButton: React.FC<ButtonSpinnerProps> = ({
  loading,
  children,
  loadingText,
  size = 'sm',
  color = 'white',
  className = '',
  disabled = false,
  type = 'button',
  onClick,
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? (
        <>
          <LoadingSpinner size={size} color={color} />
          <span>{loadingText || children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

// React Custom Hook for handling loading states with smooth delay
export function useLoading(initialState = false) {
  const [isLoading, setIsLoading] = React.useState(initialState);
  const [loadingText, setLoadingText] = React.useState<string | undefined>(undefined);

  const startLoading = React.useCallback((text?: string) => {
    if (text) setLoadingText(text);
    setIsLoading(true);
  }, []);

  const stopLoading = React.useCallback(() => {
    setIsLoading(false);
    setLoadingText(undefined);
  }, []);

  const withLoading = React.useCallback(
    async <T,>(fn: () => Promise<T>, text?: string, minDurationMs = 300): Promise<T> => {
      startLoading(text);
      const startTime = Date.now();
      try {
        const result = await fn();
        const elapsed = Date.now() - startTime;
        if (elapsed < minDurationMs) {
          await new Promise((resolve) => setTimeout(resolve, minDurationMs - elapsed));
        }
        return result;
      } finally {
        stopLoading();
      }
    },
    [startLoading, stopLoading]
  );

  return {
    isLoading,
    loadingText,
    startLoading,
    stopLoading,
    withLoading,
    setIsLoading,
  };
}
