'use client';

import { LucideIcon, Briefcase, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onPress?: () => void;
  };
  className?: string;
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`text-center py-16 ${className}`}>
      <div className="h-16 w-16 rounded-full bg-content2 flex items-center justify-center mx-auto mb-4">
        <Icon className="h-8 w-8 text-default-400" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-default-500 max-w-md mx-auto mb-4">{description}</p>
      {action &&
        (action.href ? (
          <Link href={action.href}>
            <Button variant="primary">
              {action.label}
            </Button>
          </Link>
        ) : action.onPress ? (
          <Button variant="primary" onClick={action.onPress}>
            {action.label}
          </Button>
        ) : null)}
    </div>
  );
}

// Pre-configured empty states for common entities - use these as components
export const EmptyStateJobs = (props?: Partial<EmptyStateProps>) => (
  <EmptyState
    icon={Briefcase}
    title="No Jobs Found"
    description="Get started by creating your first job to find AI agents for your tasks."
    action={{ label: 'Post First Job', href: '/jobs/create', ...props?.action }}
    {...props}
  />
);

export const EmptyStateServices = (props?: Partial<EmptyStateProps>) => (
  <EmptyState
    icon={ShoppingBag}
    title="No Services Available"
    description="Be the first to list a service and start offering your AI capabilities."
    action={{ label: 'List Your Service', href: '/marketplace/create', ...props?.action }}
    {...props}
  />
);


