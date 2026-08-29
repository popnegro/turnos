import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

export interface M3TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  supportingText?: string;
  errorText?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  variant?: 'outlined' | 'filled';
}

export const M3TextField = forwardRef<HTMLInputElement, M3TextFieldProps>(({
  label,
  supportingText,
  errorText,
  leadingIcon,
  trailingIcon,
  variant = 'outlined',
  id,
  className = '',
  disabled,
  value,
  ...props
}, ref) => {
  const inputId = id || `m3-input-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const isError = Boolean(errorText);

  return (
    <div className={`flex flex-col gap-1 w-full text-left ${className}`}>
      <label
        htmlFor={inputId}
        className={`text-xs font-semibold uppercase tracking-wider select-none transition-colors ${
          isError
            ? 'text-[#BA1A1A]'
            : disabled
            ? 'text-[#191C1C]/38'
            : 'text-[#3F4948]'
        }`}
      >
        {label}
      </label>

      <div
        className={`relative flex items-center w-full rounded-xl transition-all duration-200 ${
          variant === 'outlined'
            ? `border ${
                isError
                  ? 'border-[#BA1A1A] ring-1 ring-[#BA1A1A] bg-[#FFDAD6]/20'
                  : 'border-[#6F7979]/60 hover:border-[#191C1C] focus-within:border-[#006A6B] focus-within:ring-2 focus-within:ring-[#006A6B]/20 bg-white'
              }`
            : `bg-[#EEF2F1] border-b-2 ${
                isError
                  ? 'border-[#BA1A1A] bg-[#FFDAD6]/30'
                  : 'border-[#6F7979] focus-within:border-[#006A6B] hover:bg-[#E2E6E6]'
              }`
        } ${disabled ? 'opacity-50 pointer-events-none bg-[#E8ECEC]' : ''}`}
      >
        {leadingIcon && (
          <div className="pl-3.5 pr-1.5 flex items-center justify-center text-[#3F4948] shrink-0">
            {leadingIcon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          value={value}
          className={`w-full py-3 text-sm text-[#191C1C] placeholder:text-[#6F7979] bg-transparent outline-none disabled:text-[#191C1C]/38 ${
            leadingIcon ? 'pl-1' : 'pl-3.5'
          } ${trailingIcon || isError ? 'pr-1' : 'pr-3.5'}`}
          {...props}
        />

        {isError ? (
          <div className="pr-3.5 flex items-center justify-center text-[#BA1A1A] shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
        ) : (
          trailingIcon && (
            <div className="pr-3.5 flex items-center justify-center text-[#3F4948] shrink-0">
              {trailingIcon}
            </div>
          )
        )}
      </div>

      {(errorText || supportingText) && (
        <p
          className={`text-xs px-1 ${
            isError ? 'text-[#BA1A1A] font-medium' : 'text-[#3F4948]'
          }`}
        >
          {errorText || supportingText}
        </p>
      )}
    </div>
  );
});

M3TextField.displayName = 'M3TextField';
