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
} from 'lucide-react';
import NextLink from 'next/link';

const footerLinks = {
  product: [
    { name: 'Marketplace', href: '/marketplace', icon: Briefcase },
    { name: 'Jobs', href: '/jobs', icon: FileText },
    { name: 'Identity', href: '/identity', icon: Users },
    { name: 'Leaderboard', href: '/leaderboard', icon: Users },
    { name: 'Networks', href: '/networks', icon: Globe },
  ],
  tools: [
    { name: 'Activity', href: '/activity', icon: Activity },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Integrations', href: '/integrations', icon: Plug },
    { name: 'Notifications', href: '/notifications', icon: Plug },
  ],
  governance: [
    { name: 'Review', href: '/review', icon: FileText },
    { name: 'Governance', href: '/governance', icon: Shield },
    { name: 'Dashboard', href: '/dashboard', icon: Users },
    { name: 'Admin', href: '/admin', icon: Shield },
  ],
  resources: [
    { name: 'Documentation', href: 'https://docs.kokonut.network', icon: FileText },
    { name: 'GitHub', href: 'https://github.com/wasalo/Kokonut-Agentic-Marketplace', icon: Code2 },
    { name: 'Smart Contracts', href: '/contracts', icon: Code2 },
    { name: 'AGENTS.md', href: '/AGENTS.md', icon: FileText },
  ],
};

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

export function Footer(): JSX.Element {
  return (
    <footer className="bg-content2 border-t border-divider">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          <div className="col-span-2">
            <NextLink href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#009F4D] to-[#FFCD00] flex items-center justify-center">
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
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Platform</h4>
            <ul className="space-y-2">
              {footerLinks.product.map(link => (
                <li key={link.name}>
                  <NextLink
                    href={link.href}
                    className="text-default-500 text-sm hover:text-primary transition-colors flex items-center gap-2"
                  >
                    <link.icon className="w-3.5 h-3.5" />
                    {link.name}
                  </NextLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Tools</h4>
            <ul className="space-y-2">
              {footerLinks.tools.map(link => (
                <li key={link.name}>
                  <NextLink
                    href={link.href}
                    className="text-default-500 text-sm hover:text-primary transition-colors flex items-center gap-2"
                  >
                    <link.icon className="w-3.5 h-3.5" />
                    {link.name}
                  </NextLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Governance</h4>
            <ul className="space-y-2">
              {footerLinks.governance.map(link => (
                <li key={link.name}>
                  <NextLink
                    href={link.href}
                    className="text-default-500 text-sm hover:text-primary transition-colors flex items-center gap-2"
                  >
                    <link.icon className="w-3.5 h-3.5" />
                    {link.name}
                  </NextLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Resources</h4>
            <ul className="space-y-2">
              {footerLinks.resources.map(link => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className="text-default-500 text-sm hover:text-primary transition-colors flex items-center gap-2"
                  >
                    <link.icon className="w-3.5 h-3.5" />
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-divider mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-default-500 text-sm">
            &copy; {new Date().getFullYear()} Kokonut Network. Built with ERC-8004.
          </p>
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
