import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActiveJobsForService } from '../marketplace/ActiveJobsForService';
import { useJobs, type Job } from '@/lib/hooks/useJobs';

vi.mock('@/lib/hooks/useJobs', () => ({
  useJobs: vi.fn(),
  isOpenJob: vi.fn((job: Job) => job.status === 0),
}));

const mockUseJobs = vi.mocked(useJobs);

function job(overrides: Partial<Job>): Job {
  return {
    id: 1n,
    client: '0xclient',
    provider: '0xprovider',
    evaluator: '0xevaluator',
    status: 0,
    budget: 1000000n,
    paymentToken: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    expiredAt: 0n,
    description: 'Test job',
    deliverable: '0x',
    serviceId: 1n,
    hook: '0x0000000000000000000000000000000000000000',
    ...overrides,
  };
}

describe('ActiveJobsForService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when there are no matching jobs', () => {
    mockUseJobs.mockReturnValue({ jobs: [], isLoading: false } as never);
    const { container } = render(<ActiveJobsForService serviceId={1n} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing while loading', () => {
    mockUseJobs.mockReturnValue({ jobs: [], isLoading: true } as never);
    const { container } = render(<ActiveJobsForService serviceId={1n} />);
    expect(container.firstChild).toBeNull();
  });

  it('only renders jobs matching the given serviceId', () => {
    mockUseJobs.mockReturnValue({
      jobs: [
        job({ id: 1n, serviceId: 1n, description: 'match' }),
        job({ id: 2n, serviceId: 2n, description: 'no match' }),
        job({ id: 3n, serviceId: 1n, description: 'match too' }),
      ],
      isLoading: false,
    } as never);
    render(<ActiveJobsForService serviceId={1n} />);
    expect(screen.getByText('Job #1')).toBeInTheDocument();
    expect(screen.getByText('Job #3')).toBeInTheDocument();
    expect(screen.queryByText('Job #2')).not.toBeInTheDocument();
  });

  it('caps the rendered list at 5 entries', () => {
    const jobs: Job[] = [];
    for (let i = 1; i <= 8; i++) {
      jobs.push(job({ id: BigInt(i), serviceId: 1n, description: `Job ${i}` }));
    }
    mockUseJobs.mockReturnValue({ jobs, isLoading: false } as never);
    render(<ActiveJobsForService serviceId={1n} />);
    expect(screen.getByText('Job #1')).toBeInTheDocument();
    expect(screen.getByText('Job #5')).toBeInTheDocument();
    expect(screen.queryByText('Job #6')).not.toBeInTheDocument();
  });

  it('omits closed jobs even when the serviceId matches', () => {
    mockUseJobs.mockReturnValue({
      jobs: [
        job({ id: 1n, serviceId: 1n, status: 0, description: 'open' }),
        job({ id: 2n, serviceId: 1n, status: 3, description: 'closed' }),
      ],
      isLoading: false,
    } as never);
    render(<ActiveJobsForService serviceId={1n} />);
    expect(screen.getByText('Job #1')).toBeInTheDocument();
    expect(screen.queryByText('Job #2')).not.toBeInTheDocument();
  });

  it('renders a "View all" link to /marketplace?tab=jobs&serviceId={id}', () => {
    mockUseJobs.mockReturnValue({
      jobs: [job({ id: 1n, serviceId: 42n })],
      isLoading: false,
    } as never);
    render(<ActiveJobsForService serviceId={42n} />);
    const link = screen.getByRole('link', { name: /View all/i });
    expect(link.getAttribute('href')).toBe('/marketplace?tab=jobs&serviceId=42');
  });

  it('deep-links each job row to /jobs/[id]', () => {
    mockUseJobs.mockReturnValue({
      jobs: [job({ id: 7n, serviceId: 1n })],
      isLoading: false,
    } as never);
    render(<ActiveJobsForService serviceId={1n} />);
    const row = screen.getByRole('link', { name: /Job #7/i });
    expect(row.getAttribute('href')).toBe('/jobs/7');
  });
});
