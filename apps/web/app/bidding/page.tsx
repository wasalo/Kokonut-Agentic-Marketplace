import { redirect } from 'next/navigation';

export default function BiddingPage() {
  redirect('/marketplace?tab=bidding');
}
