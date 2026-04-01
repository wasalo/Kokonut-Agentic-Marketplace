'use client';

import { Twitter, Github, MessageCircle, Globe } from 'lucide-react';
import NextLink from 'next/link';

const footerLinks = {
  product: [
    { name: 'Identity', href: '/identity' },
    { name: 'Marketplace', href: '/marketplace' },
    { name: 'Jobs', href: '/jobs' },
    { name: 'Dashboard', href: '/dashboard' },
  ],
  developers: [
    { name: 'Documentation', href: '#' },
    { name: 'API Reference', href: '#' },
    { name: 'GitHub', href: '#' },
    { name: 'Smart Contracts', href: '#' },
  ],
  company: [
    { name: 'About', href: '/about' },
    { name: 'Blog', href: '#' },
    { name: 'Careers', href: '#' },
    { name: 'Contact', href: '#' },
  ],
  legal: [
    { name: 'Privacy', href: '#' },
    { name: 'Terms', href: '#' },
    { name: 'Security', href: '#' },
  ],
};

const socialLinks = [
  { name: 'Twitter', icon: Twitter, href: '#' },
  { name: 'GitHub', icon: Github, href: '#' },
  { name: 'Discord', icon: MessageCircle, href: '#' },
  { name: 'Website', icon: Globe, href: '#' },
];

export function Footer(): JSX.Element {
  return (
    <footer className="bg-content2 border-t border-divider">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
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
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Product</h4>
            <ul className="space-y-2">
              {footerLinks.product.map(link => (
                <li key={link.name}>
                  {link.href === '#' ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-default-500 text-sm hover:text-primary transition-colors"
                    >
                      {link.name}
                    </a>
                  ) : (
                    <NextLink
                      href={link.href}
                      className="text-default-500 text-sm hover:text-primary transition-colors"
                    >
                      {link.name}
                    </NextLink>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Developers</h4>
            <ul className="space-y-2">
              {footerLinks.developers.map(link => (
                <li key={link.name}>
                  {link.href === '#' ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-default-500 text-sm hover:text-primary transition-colors"
                    >
                      {link.name}
                    </a>
                  ) : (
                    <NextLink
                      href={link.href}
                      className="text-default-500 text-sm hover:text-primary transition-colors"
                    >
                      {link.name}
                    </NextLink>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Company</h4>
            <ul className="space-y-2">
              {footerLinks.company.map(link => (
                <li key={link.name}>
                  {link.href === '#' ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-default-500 text-sm hover:text-primary transition-colors"
                    >
                      {link.name}
                    </a>
                  ) : (
                    <NextLink
                      href={link.href}
                      className="text-default-500 text-sm hover:text-primary transition-colors"
                    >
                      {link.name}
                    </NextLink>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-divider mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-default-500 text-sm">
            &copy; {new Date().getFullYear()} Kokonut. Built with ERC-8004.
          </p>
          <div className="flex gap-6">
            {footerLinks.legal.map(link =>
              link.href === '#' ? (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-default-500 text-sm hover:text-primary transition-colors"
                >
                  {link.name}
                </a>
              ) : (
                <NextLink
                  key={link.name}
                  href={link.href}
                  className="text-default-500 text-sm hover:text-primary transition-colors"
                >
                  {link.name}
                </NextLink>
              )
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
