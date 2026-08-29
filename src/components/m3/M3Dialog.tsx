import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface M3DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const M3Dialog: React.FC<M3DialogProps> = ({
  open,
  onClose,
  title,
  icon,
  children,
  actions,
  maxWidth = 'md'
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Scrim */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Surface Container Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="m3-dialog-title"
        className={`relative z-10 w-full ${maxWidthClass} bg-[#FAFDFD] text-[#191C1C] rounded-3xl m3-elevation-3 border border-[#BEC9C8]/40 p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-10 h-10 rounded-full bg-[#CCE8E7] text-[#006A6B] flex items-center justify-center shrink-0">
                {icon}
              </div>
            )}
            <h3 id="m3-dialog-title" className="text-xl font-semibold tracking-tight text-[#191C1C]">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#3F4948] hover:text-[#191C1C] p-1.5 rounded-full hover:bg-[#EEF2F1] transition-colors focus-visible:ring-2 focus-visible:ring-[#006A6B] focus-visible:outline-none"
            aria-label="Cerrar diálogo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="text-sm text-[#3F4948] leading-relaxed max-h-[70vh] overflow-y-auto">
          {children}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#BEC9C8]/30">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
