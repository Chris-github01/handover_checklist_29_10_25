import React, { ReactNode } from 'react';

/**
 * 🚨 CARD COMPONENT SYSTEM - DESIGN SYSTEM ENFORCEMENT
 *
 * CRITICAL RULES:
 * 1. Cards MUST use BurnRatePro tokens only (no hex values)
 * 2. Cards MUST NOT accept arbitrary styling via className
 * 3. Cards represent decision units or content containers (not generic layout divs)
 * 4. Use semantic variants that match the card's purpose
 *
 * ALLOWED VARIANTS:
 * - default: Standard content containers, neutral information
 * - highlight: Featured content, primary actions, important sections
 * - success: Positive outcomes, completions, approvals
 * - warning: Cautions, alerts, pending states
 * - risk: Critical alerts, errors, dangerous actions
 *
 * INTERACTIVE MODE:
 * - Adds hover effects with brp-primary border and gold glow shadow
 * - Use for clickable cards, selectable items, navigation cards
 *
 * FORBIDDEN:
 * - Using Card as a generic layout <div> wrapper
 * - Passing background, border, or shadow classes via className
 * - Creating cards without semantic meaning
 * - Inline styles
 *
 * USAGE:
 * <Card variant="default">
 *   <CardHeader>Title</CardHeader>
 *   <CardContent>Content here</CardContent>
 *   <CardFooter>Actions</CardFooter>
 * </Card>
 *
 * <Card variant="highlight" interactive>
 *   <CardHeader>Featured Item</CardHeader>
 *   <CardContent>Click to explore</CardContent>
 * </Card>
 */

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'highlight' | 'success' | 'warning' | 'risk';
  interactive?: boolean;
  className?: string;
}

interface CardSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

function stripForbiddenClasses(className: string = ''): string {
  return className
    .split(' ')
    .filter(cls => {
      return !cls.startsWith('bg-') &&
             !cls.startsWith('border-') &&
             !cls.startsWith('shadow-') &&
             !cls.startsWith('rounded-');
    })
    .join(' ');
}

export function Card({
  children,
  variant = 'default',
  interactive = false,
  className = '',
  ...props
}: CardProps) {
  const variantStyles = {
    default: 'bg-white border-brp-grayBorder',
    highlight: 'bg-white border-brp-primary shadow-[0_0_20px_rgba(244,178,35,0.15)]',
    success: 'bg-white border-green-200 shadow-[0_0_20px_rgba(34,197,94,0.1)]',
    warning: 'bg-white border-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.1)]',
    risk: 'bg-white border-red-200 shadow-[0_0_20px_rgba(239,68,68,0.1)]',
  };

  const interactiveStyles = interactive
    ? 'cursor-pointer transition-all duration-200 hover:border-brp-primary hover:shadow-[0_0_30px_rgba(244,178,35,0.25)]'
    : '';

  const sanitizedClassName = stripForbiddenClasses(className);

  return (
    <div
      className={`rounded-2xl shadow-lg border ${variantStyles[variant]} ${interactiveStyles} ${sanitizedClassName}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }: CardSectionProps) {
  const sanitizedClassName = stripForbiddenClasses(className);

  return (
    <div className={`px-6 py-4 border-b border-brp-grayBorder ${sanitizedClassName}`} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = '', ...props }: CardSectionProps) {
  const sanitizedClassName = stripForbiddenClasses(className);

  return (
    <div className={`px-6 py-4 ${sanitizedClassName}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }: CardSectionProps) {
  const sanitizedClassName = stripForbiddenClasses(className);

  return (
    <div className={`px-6 py-4 border-t border-brp-grayBorder ${sanitizedClassName}`} {...props}>
      {children}
    </div>
  );
}
