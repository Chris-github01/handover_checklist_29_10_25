import React from 'react';

interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  as?: 'button' | 'span';
}

export default function Button({
  variant,
  children,
  onClick,
  className = '',
  disabled = false,
  as = 'button',
}: ButtonProps) {
  const baseStyles = 'px-4 py-2 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-brp-primary hover:bg-brp-primaryHover text-white',
    secondary: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-600 hover:bg-gray-100',
  };

  const Component = as;

  return (
    <Component
      onClick={onClick}
      disabled={as === 'button' ? disabled : undefined}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </Component>
  );
}
