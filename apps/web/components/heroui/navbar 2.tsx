'use client';

import { Navbar, NavbarBrand, NavbarContent, NavbarItem, Link, Button } from '@heroui/react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Sprout } from 'lucide-react';

export function NavbarComponent() {
  return (
    <Navbar className="border-b border-divider">
      <NavbarBrand>
        <Link href="/" className="flex items-center gap-2">
          <Sprout className="h-6 w-6 text-success" />
          <span className="font-bold text-lg">Kokonut</span>
        </Link>
      </NavbarBrand>
      <NavbarContent className="hidden md:flex gap-4" justify="center">
        <NavbarItem>
          <Link href="/marketplace">Marketplace</Link>
        </NavbarItem>
        <NavbarItem>
          <Link href="/jobs">Jobs</Link>
        </NavbarItem>
        <NavbarItem>
          <Link href="/review">Review</Link>
        </NavbarItem>
        <NavbarItem>
          <Link href="/dashboard">Dashboard</Link>
        </NavbarItem>
      </NavbarContent>
      <NavbarContent justify="end">
        <NavbarItem>
          <ConnectButton />
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
}
