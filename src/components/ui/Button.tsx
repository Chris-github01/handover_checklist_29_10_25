import React from 'react';

/**
 * ⚠️ IMPORTANT:
 * className should ONLY be used for layout (width, margin, positioning)
 * DO NOT pass colors, padding, or hover states via className
 * Use variants instead
 */
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'success' | 'risk' | 'warning';
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
  // Internal classes: variant styles (colors, padding, layout)
  const internalClasses = 'px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-brp-primary hover:bg-brp-primaryHover text-white',
    secondary: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-600 hover:bg-gray-100',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    risk: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-orange-600 hover:bg-orange-700 text-white',
  };

  // External classes: ONLY layout/positioning (e.g., w-full, opacity, flex modifiers)
  const externalClasses = className;

  const Component = as;

  return (
    <Component
      onClick={onClick}
      disabled={as === 'button' ? disabled : undefined}
      className={`${internalClasses} ${variantStyles[variant]} ${externalClasses}`}
    >
      {children}
    </Component>
  );
}
