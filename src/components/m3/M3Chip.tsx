import React from 'react';
import { X } from 'lucide-react';

export type M3ChipVariant = 'assist' | 'filter' | 'input' | 'suggestion';

export interface M3ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: M3ChipVariant;
  selected?: boolean;
  icon?: React.ReactNode;
  onDelete?: () => void;
}

export const M3Chip: React.FC<M3ChipProps> = ({
  children,
  variant = 'assist',
  selected = false,
  icon,
  onDelete,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-medium transition-all duration-200 select-none cursor-pointer focus-visible:outline-2 focus-visible:outline-[#006A6B] disabled:opacity-40 disabled:pointer-events-none';

  let stateClasses = '';
  if (selected) {
    stateClasses = 'bg-[#CCE8E7] text-[#051F20] border border-[#006A6B] font-semibold shadow-xs';
  } else {
    stateClasses = 'bg-[#FAFDFD] text-[#3F4948] border border-[#BEC9C8] hover:bg-[#EEF2F1] active:bg-[#E2E6E6]';
  }

  return (
    <button
      type="button"
      className={`${baseClasses} ${stateClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
      {onDelete && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </span>
      )}
    </button>
  );
};
