'use client';

import { DS } from '@/lib/design-system';
import type { ReactNode } from 'react';

interface DashboardCardProps {
  /** Card title */
  title: string;
  /** Optional description/subtitle */
  description?: string;
  /** Main content */
  children: ReactNode;
  /** Optional icon next to title */
  icon?: ReactNode;
  /** Visual style variant */
  variant?: 'default' | 'glass' | 'interactive';
  /** Action buttons in footer */
  actions?: ReactNode;
  /** Extra CSS classes */
  className?: string;
}

/**
 * Standardized card for dashboard sections.
 * Unifies padding, borders, and glassmorphism across Arbiter, Evaluator,
 * Activity, and all other dashboard modules.
 *
 * @example
 * <DashboardCard
 *   title="Arbiter Status"
 *   icon={<Gavel className="size-5" />}
 *   variant="glass"
 * >
 *   ...
 * </DashboardCard>
 */
export function DashboardCard({
  title,
  description,
  children,
  icon,
  variant = 'default',
  actions,
  className = '',
}: DashboardCardProps) {
  const variantClasses = {
    default: DS.cards.padded,
    glass: DS.cards.glass,
    interactive: DS.cards.interactive,
  };

  return (
    <div className={`${variantClasses[variant]} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {icon && <span className="text-primary">{icon}</span>}
          <h2 className={DS.typography.sectionTitle}>{title}</h2>
        </div>
      </div>
      {description && <p className={`${DS.typography.pageSubtitle} mb-4`}>{description}</p>}

      {/* Content */}
      <div className="space-y-4">{children}</div>

      {/* Footer Actions */}
      {actions && <div className="mt-4 pt-4 border-t border-divider">{actions}</div>}
    </div>
  );
}
