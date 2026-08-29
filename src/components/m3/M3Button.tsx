import React from 'react';
import { Loader2 } from 'lucide-react';

export type M3ButtonVariant = 'filled' | 'elevated' | 'tonal' | 'outlined' | 'text';
export type M3ButtonSize = 'small' | 'medium' | 'large';

export interface M3ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: M3ButtonVariant;
  size?: M3ButtonSize;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

export const M3Button: React.FC<M3ButtonProps> = ({
  children,
  variant = 'filled',
  size = 'medium',
  icon,
  trailingIcon,
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  // Base classes according to Material 3 specs (40px min height, 20px padding, rounded-full)
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 select-none cursor-pointer disabled:cursor-not-allowed disabled:pointer-events-none relative overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2';

  // Size styling
  const sizeClasses = {
    small: 'h-9 px-4 text-xs rounded-full gap-1.5 min-h-[36px]',
    medium: 'h-11 px-6 text-sm rounded-full gap-2 min-h-[44px]',
    large: 'h-13 px-8 text-base rounded-full gap-2.5 min-h-[48px]',
  }[size];

  // Variant styling
  const variantClasses = {
    filled: 'bg-[#006A6B] text-white hover:bg-[#005455] active:bg-[#003F40] shadow-sm hover:shadow m3-elevation-1 disabled:bg-[#191C1C]/12 disabled:text-[#191C1C]/38 disabled:shadow-none focus-visible:outline-[#006A6B]',
    elevated: 'bg-[#FAFDFD] text-[#006A6B] hover:bg-[#F4F7F7] active:bg-[#EEF2F1] m3-elevation-1 hover:m3-elevation-2 disabled:bg-[#191C1C]/12 disabled:text-[#191C1C]/38 disabled:shadow-none',
    tonal: 'bg-[#CCE8E7] text-[#051F20] hover:bg-[#BDE0DF] active:bg-[#AED7D6] disabled:bg-[#191C1C]/12 disabled:text-[#191C1C]/38',
    outlined: 'border border-[#6F7979] text-[#006A6B] hover:bg-[#006A6B]/8 active:bg-[#006A6B]/12 disabled:border-[#191C1C]/12 disabled:text-[#191C1C]/38',
    text: 'text-[#006A6B] hover:bg-[#006A6B]/8 active:bg-[#006A6B]/12 disabled:text-[#191C1C]/38',
  }[variant];

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${widthClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        icon && <span className="shrink-0 inline-flex items-center">{icon}</span>
      )}
      <span className="truncate">{children}</span>
      {!loading && trailingIcon && <span className="shrink-0 inline-flex items-center">{trailingIcon}</span>}
    </button>
  );
};
