import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JobLifecycleStepper } from '../jobs/JobLifecycleStepper';
import { JobStatus } from '@/lib/types/contracts';

describe('JobLifecycleStepper', () => {
  it('renders 4 step nodes with the right labels', () => {
    render(<JobLifecycleStepper status={JobStatus.Funded} role="provider" />);
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Funded')).toBeInTheDocument();
    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('marks the current step with aria-current="step"', () => {
    render(<JobLifecycleStepper status={JobStatus.Submitted} role="evaluator" />);
    const current = screen.getByText('Submitted').closest('li');
    expect(current).toHaveAttribute('aria-current', 'step');
  });

  it('marks Open as current for Open status', () => {
    render(<JobLifecycleStepper status={JobStatus.Open} role="client" />);
    const current = screen.getByText('Open').closest('li');
    expect(current).toHaveAttribute('aria-current', 'step');
  });

  it('marks Completed as current for Completed status', () => {
    render(<JobLifecycleStepper status={JobStatus.Completed} role="client" />);
    const current = screen.getByText('Completed').closest('li');
    expect(current).toHaveAttribute('aria-current', 'step');
  });

  it('shows the branch indicator for Rejected', () => {
    render(<JobLifecycleStepper status={JobStatus.Rejected} role="client" />);
    expect(screen.getByText(/Rejected/i, { selector: 'span' })).toBeInTheDocument();
  });

  it('shows the branch indicator for PendingClientApproval', () => {
    render(<JobLifecycleStepper status={JobStatus.PendingClientApproval} role="client" />);
    expect(screen.getByText(/Awaiting client approval/i)).toBeInTheDocument();
  });

  it('shows the branch indicator for Expired', () => {
    render(<JobLifecycleStepper status={JobStatus.Expired} role="client" />);
    expect(screen.getByText(/Expired/i)).toBeInTheDocument();
  });

  it('accepts a raw number for status', () => {
    render(<JobLifecycleStepper status={6} role="client" />);
    const current = screen.getByText('Submitted').closest('li');
    expect(current).toHaveAttribute('aria-current', 'step');
  });

  it('hides the action cue when role is observer on the current step', () => {
    render(<JobLifecycleStepper status={JobStatus.Funded} role="observer" />);
    expect(screen.queryByText(/Action:/i)).not.toBeInTheDocument();
  });

  it('shows the action cue for the matching role on the current step', () => {
    render(<JobLifecycleStepper status={JobStatus.Funded} role="provider" />);
    expect(screen.getByText(/Action: Submit deliverable/i)).toBeInTheDocument();
  });
});
