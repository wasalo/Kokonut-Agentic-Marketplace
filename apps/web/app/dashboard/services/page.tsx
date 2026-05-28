import { redirect } from 'next/navigation';

export default function DashboardServicesPage() {
  redirect('/marketplace?tab=studio');
}
