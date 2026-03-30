interface BadgeProps {
  children: React.ReactNode;
  variant: 'info' | 'highlight' | 'success' | 'warning';
  className?: string;
}

export function Badge({ children, variant, className = '' }: BadgeProps) {
  const variantStyles = {
    info: 'bg-gray-100 text-gray-700',
    highlight: 'bg-brp-primarySoft text-brp-primary',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-orange-100 text-orange-700',
  };

  return (
    <span
      className={`px-2 py-1 rounded-md text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
