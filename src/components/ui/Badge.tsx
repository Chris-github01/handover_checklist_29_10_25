import { Video as LucideIcon } from 'lucide-react';

/**
 * 🚨 BADGE COMPONENT - DESIGN SYSTEM ENFORCEMENT
 *
 * CRITICAL RULES:
 * 1. Badges MUST use BurnRatePro tokens only (no hex values)
 * 2. Badges MUST NOT accept arbitrary color classes
 * 3. Badges MUST represent system state or logic (not decoration)
 * 4. Badges are semantic indicators - use variants that match data meaning
 *
 * ALLOWED VARIANTS:
 * - success: Positive states, completions, approvals
 * - warning: Alerts, pending actions, cautions
 * - danger: Errors, critical states, deletions
 * - info: Informational, neutral states
 * - neutral: Default, inactive, or non-critical states
 * - premium: Highlighted, featured, or special states
 *
 * FORBIDDEN:
 * - Creating badges with custom colors via className
 * - Using badges for purely decorative purposes
 * - Bypassing the variant system
 *
 * USAGE:
 * <Badge variant="success">Active</Badge>
 * <Badge variant="warning" icon={AlertCircle} size="lg">Pending</Badge>
 * <Badge variant="danger" onClick={handleClick}>Delete</Badge>
 */

interface BadgeProps {
  children: React.ReactNode;
  variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'premium';
  icon?: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export function Badge({
  children,
  variant,
  icon: Icon,
  size = 'md',
  onClick
}: BadgeProps) {
  const variantStyles = {
    success: 'bg-green-100 text-green-700',
    warning: 'bg-orange-100 text-orange-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    neutral: 'bg-brp-grayLight text-brp-gray',
    premium: 'bg-brp-primarySoft text-brp-primary',
  };

  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-xs gap-1',
    md: 'px-2 py-1 text-xs gap-1',
    lg: 'px-3 py-1.5 text-sm gap-1.5',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  const Component = onClick ? 'button' : 'span';

  return (
    <Component
      onClick={onClick}
      className={`inline-flex items-center rounded-md font-medium ${sizeStyles[size]} ${variantStyles[variant]} ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
    >
      {Icon && <Icon size={iconSizes[size]} />}
      {children}
    </Component>
  );
}
