'use client';

import dynamic from 'next/dynamic';

const CreateJobContent = dynamic(() => import('./create-job-content'), {
  ssr: false,
  loading: () => (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse h-48 bg-content2 rounded max-w-2xl mx-auto" />
    </div>
  ),
});

export default function CreateJobPage(): JSX.Element {
  return <CreateJobContent />;
}
