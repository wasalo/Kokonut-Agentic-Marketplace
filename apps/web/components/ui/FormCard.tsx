'use client';

import { DS } from '@/lib/design-system';
import type { ReactNode } from 'react';

interface FormCardProps {
  /** Card title */
  title: string;
  /** Optional description/subtitle */
  description?: string;
  /** Main content */
  children: ReactNode;
  /** Optional icon next to title */
  icon?: ReactNode;
  /** Action buttons in footer */
  actions?: ReactNode;
  /** Extra CSS classes */
  className?: string;
}

/**
 * Standardized form container.
 * Use this for all form pages to maintain consistent layout.
 *
 * @example
 * <FormCard
 *   title="Create Job"
 *   description="Fund a new job"
 *   icon={<Briefcase />}
 *   actions={
 *     <ButtonGroup>
 *       <Button variant="ghost">Cancel</Button>
 *       <Button variant="primary">Create</Button>
 *     </ButtonGroup>
 *   }
 * >
 *   <FormSection title="Basic Info">…</FormSection>
 * </FormCard>
 */
export function FormCard({
  title,
  description,
  children,
  icon,
  actions,
  className = '',
}: FormCardProps) {
  return (
    <div className={`${DS.cards.padded} max-w-2xl mx-auto ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h2 className={DS.typography.sectionTitle}>
          {icon && <span className="text-primary">{icon}</span>}
          {title}
        </h2>
        {description && <p className={DS.typography.pageSubtitle}>{description}</p>}
      </div>

      {/* Content */}
      <div className="space-y-6">{children}</div>

      {/* Footer Actions */}
      {actions && <div className={DS.actions.wrapper}>{actions}</div>}
    </div>
  );
}

interface FormSectionProps {
  /** Section title */
  title?: string;
  /** Whether to show a divider above this section */
  divider?: boolean;
  children: ReactNode;
}

/**
 * Section within a FormCard.
 * Groups related form fields with an optional title.
 */
export function FormSection({
  title,
  divider = false,
  children,
}: FormSectionProps) {
  return (
    <div className={divider ? DS.formSection.divider : ''}>
      {title && <h3 className={DS.formSection.title}>{title}</h3>}
      <div className="space-y-4">{children}</div>
    </div>
  );
}
