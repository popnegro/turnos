import React from 'react';

export interface M3LinearProgressProps {
  indeterminate?: boolean;
  value?: number; // 0 to 100
  className?: string;
}

export const M3LinearProgress: React.FC<M3LinearProgressProps> = ({
  indeterminate = false,
  value = 0,
  className = ''
}) => {
  return (
    <div
      className={`relative w-full h-1 bg-[#CCE8E7] rounded-full overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {indeterminate ? (
        <div className="absolute top-0 bottom-0 left-0 bg-[#006A6B] rounded-full animate-pulse w-2/3" />
      ) : (
        <div
          className="h-full bg-[#006A6B] rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      )}
    </div>
  );
};
