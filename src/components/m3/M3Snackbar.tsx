import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type M3SnackbarType = 'success' | 'error' | 'info' | 'neutral';

export interface M3SnackbarProps {
  message: string;
  type?: M3SnackbarType;
  actionText?: string;
  onAction?: () => void;
  onClose?: () => void;
  className?: string;
}

export const M3Snackbar: React.FC<M3SnackbarProps> = ({
  message,
  type = 'neutral',
  actionText,
  onAction,
  onClose,
  className = ''
}) => {
  const icon = {
    success: <CheckCircle2 className="w-4 h-4 text-[#6FF7F6] shrink-0" />,
    error: <AlertTriangle className="w-4 h-4 text-[#FFDAD6] shrink-0" />,
    info: <Info className="w-4 h-4 text-[#D2E4FF] shrink-0" />,
    neutral: null
  }[type];

  return (
    <div
      className={`inline-flex items-center gap-3 px-4 py-3 bg-[#2D3131] text-[#EFF1F1] rounded-xl m3-elevation-3 text-xs md:text-sm font-medium shadow-lg max-w-md ${className}`}
      role="alert"
    >
      {icon}
      <span className="flex-1 leading-snug">{message}</span>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="text-[#6FF7F6] hover:underline font-semibold uppercase tracking-wider text-xs ml-2 cursor-pointer"
        >
          {actionText}
        </button>
      )}
      {onClose && (
        <button
          onClick={onClose}
          className="text-[#EFF1F1]/70 hover:text-white p-1 rounded-full hover:bg-white/10"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
