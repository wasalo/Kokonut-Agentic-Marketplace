/**
 * @file Design System Tokens
 * @description Single source of truth for all design tokens in the Kokonut marketplace.
 * Use these tokens instead of hardcoding values to maintain UI consistency.
 */

export const DS = {
  /** Brand colors */
  colors: {
    primary: '#009F4D',
    secondary: '#FFCD00',
    primaryHover: '#007a3d',
    success: '#00c853',
    danger: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    /** Chart palette — for recharts <Bar fill>, <Line stroke>, <Cell fill>, etc. */
    chart: ['#009F4D', '#00c853', '#FFCD00', '#FFB800', '#FF6B6B'] as const,
  },

  /** Button variants — use these className strings for consistency */
  buttons: {
    /** Primary CTA: gradient green, white text */
    primary:
      'inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed',

    /** Secondary: outlined green */
    secondary:
      'inline-flex items-center justify-center gap-2 px-5 py-2.5 border-2 border-[#009F4D] text-[#009F4D] font-semibold rounded-lg hover:bg-[#009F4D]/5 disabled:opacity-50 disabled:cursor-not-allowed',

    /** Danger: red background */
    danger:
      'inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-danger text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',

    /** Ghost: subtle border, hover background */
    ghost:
      'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-divider hover:bg-content2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',

    /** Icon-only button */
    icon: 'inline-flex items-center justify-center p-2 rounded-lg text-default-400 hover:text-foreground hover:bg-content2 transition-colors disabled:opacity-50',

    /** Link-style text button */
    link: 'inline-flex items-center gap-1 text-sm text-primary hover:text-primary-600 transition-colors disabled:opacity-50',
  },

  /** Input fields */
  inputs: {
    /** Base input: bg-content2, consistent focus ring */
    base: 'w-full px-3 py-2 bg-content2 border border-divider rounded-lg text-foreground placeholder:text-default-400 focus:outline-none focus:ring-2 focus:ring-[#009F4D] focus:border-transparent disabled:opacity-50',

    /** Textarea variant */
    textarea: 'resize-none min-h-[120px]',

    /** Select dropdown */
    select: 'w-full px-3 py-2 bg-content2 border border-divider rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-[#009F4D] focus:border-transparent disabled:opacity-50',
  },

  /** Labels for form fields */
  labels: {
    base: 'block text-sm font-medium mb-1.5 text-foreground',
  },

  /** Cards and containers */
  cards: {
    /** Base card */
    base: 'bg-background border border-divider rounded-xl',

    /** Card with standard padding */
    padded: 'bg-background border border-divider rounded-xl p-4 md:p-6',

    /** Interactive card with hover effect */
    interactive:
      'bg-background border border-divider rounded-xl p-4 md:p-6 hover:border-[#009F4D]/30 hover:shadow-sm transition-all',

    /** Card that is also clickable */
    clickable:
      'bg-background border border-divider rounded-xl p-4 md:p-6 hover:border-[#009F4D]/30 hover:shadow-sm transition-all cursor-pointer',

    /** Glassmorphism card */
    glass: 'glass-card rounded-xl p-4 md:p-6 glass-card-hover transition-all',

    /** Glassmorphism interactive */
    glassInteractive: 'glass-card rounded-xl p-4 md:p-6 glass-card-hover hover:border-[#009F4D]/30 transition-all cursor-pointer',
  },

  /**
   * Status badge colors — reconciled with `apps/web/components/StatusBadge.tsx`
   * (the canonical 30+ callsite component). 10% opacity + semantic text color.
   * Keep these values in sync with StatusBadge's `statusConfig` table.
   */
  badges: {
    open: 'bg-primary/10 text-primary',
    funded: 'bg-success/10 text-success',
    submitted: 'bg-warning/10 text-warning',
    completed: 'bg-success/10 text-success',
    rejected: 'bg-danger/10 text-danger',
    expired: 'bg-danger/10 text-danger',
    active: 'bg-success/10 text-success',
    inactive: 'bg-default/10 text-default-500',
    pending: 'bg-warning/10 text-warning',
    confirmed: 'bg-success/10 text-success',
    failed: 'bg-danger/10 text-danger',
  },

  /** Typography scale */
  typography: {
    /** Page title (h1) */
    pageTitle: 'text-3xl font-bold text-foreground',

    /** Page subtitle/description */
    pageSubtitle: 'text-default-500 mt-1',

    /** Section title (h2) */
    sectionTitle: 'text-xl font-semibold text-foreground flex items-center gap-2',

    /** Card title (h3) */
    cardTitle: 'text-lg font-semibold text-foreground',

    /** Small label */
    label: 'text-sm font-medium text-foreground',
  },

  /** Spacing and layout */
  spacing: {
    /** Standard page container */
    page: 'container mx-auto px-4 py-8',

    /** Section vertical spacing */
    section: 'space-y-4',

    /** Gap between form fields */
    formField: 'space-y-1.5',
  },

  /** Empty state */
  emptyState: {
    wrapper: 'text-center py-12',
    icon: 'size-16 text-default-300 mx-auto mb-4',
    title: 'text-lg font-semibold text-foreground mb-2',
    message: 'text-sm text-default-500 mb-4 max-w-md mx-auto',
  },

  /** Page header with back navigation */
  pageHeader: {
    backLink:
      'inline-flex items-center gap-2 text-sm text-default-500 hover:text-foreground transition-colors mb-4',
  },

  /** Pagination buttons */
  pagination: {
    button:
      'px-3 py-1.5 text-sm border border-divider rounded-lg hover:bg-content2 transition-colors disabled:opacity-30',
    active: 'bg-content2 font-medium',
  },

  /** Form section */
  formSection: {
    title: 'text-lg font-semibold text-foreground mb-4',
    divider: 'border-t border-divider pt-6 mt-6',
  },

  /** Section actions (buttons at bottom of card) */
  actions: {
    wrapper: 'flex gap-3 justify-end pt-4 border-t border-divider',
  },
} as const;

/** Convenience helper for merging button classes */
export function btn(variant: keyof typeof DS.buttons, extra?: string): string {
  const base = DS.buttons[variant];
  return extra ? `${base} ${extra}` : base;
}

/** Convenience helper for merging input classes */
export function input(type?: 'textarea'): string {
  const base = DS.inputs.base;
  return type === 'textarea' ? `${base} ${DS.inputs.textarea}` : base;
}

/** Convenience helper for card classes */
export function card(variant: keyof typeof DS.cards, extra?: string): string {
  const base = DS.cards[variant];
  return extra ? `${base} ${extra}` : base;
}
