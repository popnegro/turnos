import React from 'react';

export type M3CardVariant = 'elevated' | 'filled' | 'outlined';

export interface M3CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: M3CardVariant;
  interactive?: boolean;
  selected?: boolean;
}

export const M3Card: React.FC<M3CardProps> = ({
  children,
  variant = 'filled',
  interactive = false,
  selected = false,
  className = '',
  ...props
}) => {
  const baseClasses = 'rounded-2xl transition-all duration-200 overflow-hidden';
  
  const variantClasses = {
    elevated: 'bg-[#FAFDFD] m3-elevation-1 hover:m3-elevation-2',
    filled: 'bg-[#EEF2F1] border border-transparent',
    outlined: 'bg-[#FFFFFF] border border-[#BEC9C8]',
  }[variant];

  const interactiveClasses = interactive
    ? 'cursor-pointer hover:border-[#006A6B] active:scale-[0.99] select-none'
    : '';

  const selectedClasses = selected
    ? 'bg-[#CCE8E7] border-2 border-[#006A6B] m3-elevation-2 ring-2 ring-[#006A6B]/20 text-[#051F20]'
    : '';

  return (
    <div
      className={`${baseClasses} ${variantClasses} ${interactiveClasses} ${selectedClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
