import React from 'react';

export type M3BadgeTone = 'primary' | 'secondary' | 'tertiary' | 'error' | 'success' | 'warning' | 'neutral';

export interface M3BadgeProps {
  children: React.ReactNode;
  tone?: M3BadgeTone;
  icon?: React.ReactNode;
  className?: string;
  size?: 'small' | 'medium';
}

export const M3Badge: React.FC<M3BadgeProps> = ({
  children,
  tone = 'neutral',
  icon,
  className = '',
  size = 'small'
}) => {
  const toneClasses = {
    primary: 'bg-[#6FF7F6]/30 text-[#004F50] border border-[#006A6B]/20',
    secondary: 'bg-[#CCE8E7] text-[#051F20] border border-[#4A6363]/20',
    tertiary: 'bg-[#D2E4FF] text-[#041C35] border border-[#4A607C]/20',
    error: 'bg-[#FFDAD6] text-[#BA1A1A] border border-[#BA1A1A]/20',
    success: 'bg-[#C4EED0] text-[#0A5327] border border-[#0A5327]/20',
    warning: 'bg-[#FFE2A9] text-[#563E00] border border-[#563E00]/20',
    neutral: 'bg-[#EEF2F1] text-[#3F4948] border border-[#BEC9C8]',
  }[tone];

  const sizeClasses = size === 'small' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold tracking-wide ${toneClasses} ${sizeClasses} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
