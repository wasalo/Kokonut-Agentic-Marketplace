'use client';

import {
  MessageCircle,
  Globe,
  AtSign,
  Code2,
  Plug,
  BarChart3,
  Activity,
  Users,
  Briefcase,
  FileText,
  Shield,
  BookOpen,
  Mail,
  Terminal,
  LayoutDashboard,
  Settings,
} from 'lucide-react';
import NextLink from 'next/link';
import { BlockNumber } from '@/components/BlockNumber';

const discoverLinks = [
  { name: 'Marketplace', href: '/marketplace', icon: Briefcase },
  { name: 'Jobs', href: '/jobs', icon: FileText },
  { name: 'Leaderboard', href: '/leaderboard', icon: Users },
  { name: 'Skills', href: '/skills', icon: BookOpen },
  { name: 'Bidding', href: '/bidding', icon: Settings },
  { name: 'Networks', href: '/networks', icon: Globe },
];

const buildLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Review', href: '/review', icon: FileText },
  { name: 'Governance', href: '/governance', icon: Shield },
  { name: 'Admin', href: '/admin', icon: Settings },
  { name: 'Webhooks', href: '/dashboard/webhooks', icon: Plug },
  { name: 'Integrations', href: '/integrations', icon: Plug },
];

const resourceLinks = [
  { name: 'About', href: '/about', icon: Globe },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Activity', href: '/activity', icon: Activity },
  { name: 'API Docs', href: '/api-docs', icon: Terminal },
  { name: 'Contact', href: '/contact', icon: Mail },
  { name: 'Contracts', href: '/contracts', icon: Code2 },
];

const socialLinks = [
  { name: 'Website', icon: Globe, href: 'https://kokonut.network' },
  { name: 'GitHub', icon: Code2, href: 'https://github.com/wasalo/Kokonut-Agentic-Marketplace' },
  { name: 'Twitter', icon: AtSign, href: 'https://x.com/KokonutNetwork' },
  { name: 'Discord', icon: MessageCircle, href: 'https://link.kokonut.network/discord' },
];

const legalLinks = [
  { name: 'Privacy', href: '/privacy' },
  { name: 'Terms', href: '/terms' },
  { name: 'Security', href: '/security' },
];

function LinkSection({ title, links }: { title: string; links: typeof discoverLinks }): JSX.Element {
  return (
    <div>
      <h4 className="font-semibold text-sm mb-4">{title}</h4>
      <ul className="space-y-2.5">
        {links.map(link => (
          <li key={link.name}>
            <NextLink
              href={link.href}
              className="text-default-500 text-sm hover:text-primary transition-colors flex items-center gap-2"
            >
              <link.icon className="size-3.5 opacity-70" />
              {link.name}
            </NextLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer(): JSX.Element {
  return (
    <footer className="hidden md:block bg-content2 border-t border-divider">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <NextLink href="/" className="flex items-center gap-2 mb-4">
              <div className="size-10 rounded-xl bg-gradient-to-br from-[#009F4D] to-[#FFCD00] flex items-center justify-center">
                <span className="text-white font-bold">KK</span>
              </div>
              <span className="font-bold text-xl">Kokonut</span>
            </NextLink>
            <p className="text-default-600 text-sm mb-6 max-w-xs">
              The onchain agent economy. Build, deploy, and monetize AI agents with ERC-8004
              compliance.
            </p>
            <div className="flex gap-4">
              {socialLinks.map(social => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-default-500 hover:text-primary transition-colors"
                  title={social.name}
                >
                  <social.icon className="size-5" />
                </a>
              ))}
            </div>
          </div>

          <LinkSection title="Discover" links={discoverLinks} />
          <LinkSection title="Build" links={buildLinks} />
          <LinkSection title="Resources" links={resourceLinks} />
        </div>

        <div className="border-t border-divider mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <p className="text-default-500 text-sm">
              &copy; {new Date().getFullYear()} Kokonut Network. Built with ERC-8004.
            </p>
            <BlockNumber />
          </div>
          <div className="flex gap-6">
            {legalLinks.map(link => (
              <NextLink
                key={link.name}
                href={link.href}
                className="text-default-500 text-sm hover:text-primary transition-colors"
              >
                {link.name}
              </NextLink>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
