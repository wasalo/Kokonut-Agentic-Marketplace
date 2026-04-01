import { redirect } from 'next/navigation';

export default function SkillsPage() {
  // Redirect old /skills to new /marketplace/skills for skill discovery
  redirect('/marketplace/skills');
}
