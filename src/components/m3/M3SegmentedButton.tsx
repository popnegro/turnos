import React from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface M3SegmentedButtonProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'small' | 'medium';
}

export function M3SegmentedButton<T extends string>({
  options,
  value,
  onChange,
  className = '',
  size = 'medium'
}: M3SegmentedButtonProps<T>) {
  const heightClass = size === 'small' ? 'h-9 text-xs' : 'h-10 text-xs md:text-sm';

  return (
    <div
      className={`inline-flex p-1 bg-[#EEF2F1] rounded-2xl border border-[#BEC9C8]/60 overflow-hidden ${className}`}
      role="group"
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(opt.value)}
            className={`${heightClass} px-3.5 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-[#006A6B] focus-visible:outline-none ${
              isSelected
                ? 'bg-[#006A6B] text-white shadow-sm font-semibold'
                : 'text-[#3F4948] hover:text-[#191C1C] hover:bg-[#E2E6E6]/60'
            }`}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
            {opt.badge !== undefined && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isSelected
                    ? 'bg-[#6FF7F6] text-[#002020]'
                    : 'bg-[#BEC9C8]/40 text-[#3F4948]'
                }`}
              >
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
