import React from 'react';

export interface M3DividerProps {
  className?: string;
  inset?: boolean;
}

export const M3Divider: React.FC<M3DividerProps> = ({ className = '', inset = false }) => {
  return (
    <hr
      className={`border-t border-[#BEC9C8]/40 my-3 ${
        inset ? 'mx-4' : 'w-full'
      } ${className}`}
    />
  );
};
