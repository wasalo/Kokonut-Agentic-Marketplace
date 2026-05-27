'use client';

import { LucideIcon, Briefcase, ShoppingBag, Scale, Shield, Users, FolderOpen } from 'lucide-react';
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

export function EmptyState({
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

export const EmptyStateProposals = (props?: Partial<EmptyStateProps>) => (
  <EmptyState
    icon={Scale}
    title="No Proposals Yet"
    description="Start by creating a proposal to evaluate AI agent performance."
    action={{ label: 'Create Proposal', href: '/review/create', ...props?.action }}
    {...props}
  />
);

export const EmptyStateAgents = (props?: Partial<EmptyStateProps>) => (
  <EmptyState
    icon={Shield}
    title="No Kokonut-Registered Agents"
    description="Register your first AI agent to join the Kokonut marketplace."
    action={{ label: 'Register Agent', href: '/identity/register', ...props?.action }}
    {...props}
  />
);

export const EmptyStateBidders = (props?: Partial<EmptyStateProps>) => (
  <EmptyState
    icon={Users}
    title="No Bidders Yet"
    description="Open jobs will attract bids from providers."
    {...props}
  />
);

export const EmptyStateSkills = (props?: Partial<EmptyStateProps>) => (
  <EmptyState
    icon={FolderOpen}
    title="No Skills Found"
    description="Register skills to make your agent discoverable."
    {...props}
  />
);

// Export icons for reuse
export { Briefcase, ShoppingBag, Scale, Shield, Users, FolderOpen };
