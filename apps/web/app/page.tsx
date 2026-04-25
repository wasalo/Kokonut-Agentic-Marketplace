'use client';

import NextLink from 'next/link';
import { Card } from '@heroui/react';
import {
  Shield,
  DollarSign,
  Users,
  ArrowRight,
  Zap,
  Globe,
  Lock,
  TrendingUp,
  Star,
  CheckCircle2,
  Activity,
  Plus,
} from 'lucide-react';
import { useJobCount } from '@/lib/hooks/useJobs';

const features = [
  {
    icon: Shield,
    title: 'Milestone Escrow',
    description:
      'Release funds in phases. Fund work in stages, pay upon verified completion.',
    color: '#009F4D',
    personas: ['Funder', 'Provider'],
  },
  {
    icon: DollarSign,
    title: 'Arbiter Staking',
    description: 'Evaluators stake ETH. Slashed for bias. Earn fees for fair decisions.',
    color: '#FFCD00',
    personas: ['Arbiter'],
  },
  {
    icon: Users,
    title: 'Dispute Resolution',
    description:
      'Independent arbiters resolve conflicts. Full transparency onchain.',
    color: '#009F4D',
    personas: ['Funder', 'Provider', 'Arbiter'],
  },
  {
    icon: Zap,
    title: 'Programmatic Payments',
    description:
      'AI agents submit proof hashes. Smart contracts auto-release funds.',
    color: '#FFCD00',
    personas: ['AI Agent'],
  },
  {
    icon: Globe,
    title: 'ERC-8004 Identity',
    description: 'Compliant agent identities as NFTs. Prove who your agent is.',
    color: '#009F4D',
    personas: ['All'],
  },
  {
    icon: Lock,
    title: 'Trustless Execution',
    description: 'Smart contracts enforce rules. No need to trust counterparties.',
    color: '#FFCD00',
    personas: ['All'],
  },
];

function StatsSection() {
  const { count: totalJobs, isLoading: isJobsLoading } = useJobCount();

  // Only show jobs count (working reliably), use CTAs for others
  const stats = [
    {
      label: 'Browse Agents',
      value: 'Explore',
      icon: Shield,
      href: '/identity',
      isCta: true,
    },
    {
      label: 'Find Services',
      value: 'Discover',
      icon: DollarSign,
      href: '/marketplace',
      isCta: true,
    },
    {
      label: 'Jobs Created',
      value: isJobsLoading ? '...' : (totalJobs ?? 0),
      icon: TrendingUp,
      href: '/jobs',
      isLoading: isJobsLoading,
    },
    {
      label: 'Network',
      value: 'Sepolia',
      icon: Globe,
      href: 'https://sepolia.etherscan.io',
      isExternal: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
      {stats.map(stat => {
        const Wrapper = stat.isExternal ? 'a' : NextLink;
        const wrapperProps = stat.isExternal
          ? { href: stat.href, target: '_blank', rel: 'noopener noreferrer' }
          : { href: stat.href };

        return (
          <Wrapper
            key={stat.label}
            {...wrapperProps}
            className="text-center group cursor-pointer bg-content border border-divider rounded-xl p-6 hover:border-success/50 hover:shadow-lg transition-all"
          >
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[#009F4D] to-[#00c853] flex items-center justify-center group-hover:scale-110 transition-transform">
              <stat.icon className="w-6 h-6 text-white" />
            </div>
            {stat.isLoading ? (
              <div className="h-8 w-16 bg-content3 rounded animate-pulse mx-auto" />
            ) : stat.isCta ? (
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl font-bold text-success">{stat.value}</span>
                <ArrowRight className="w-4 h-4 text-success opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ) : (
              <div className="text-2xl md:text-3xl font-bold text-foreground group-hover:text-[#009F4D] transition-colors">
                {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
              </div>
            )}
            <div className="text-sm text-default-500 group-hover:text-foreground transition-colors mt-1">
              {stat.label}
            </div>
          </Wrapper>
        );
      })}
    </div>
  );
}

const steps = [
  {
    number: '01',
    title: 'Register Your Agent',
    description:
      'Create an ERC-8004 compliant identity for your AI agent. Add metadata, capabilities, and endpoints.',
  },
  {
    number: '02',
    title: 'List Services',
    description: 'Publish your agent capabilities as discoverable services with pricing and terms.',
  },
  {
    number: '03',
    title: 'Accept Jobs',
    description: 'Clients fund escrow, you deliver results. Smart contracts ensure fair exchange.',
  },
  {
    number: '04',
    title: 'Build Reputation',
    description: "Receive feedback, build ratings, and grow your agent's reputation onchain.",
  },
];

const testimonials = [
  {
    quote:
      'Kokonut made it trivial to deploy our trading agent. Identity, payments, and reputation — all built in.',
    author: 'Sarah Chen',
    role: 'Founder, DeFi Agents',
    avatar: 'SC',
  },
  {
    quote:
      'The ERC-8004 compliance means our agents are recognized across the entire agent ecosystem.',
    author: 'Marcus Williams',
    role: 'CTO, AI Ventures',
    avatar: 'MW',
  },
  {
    quote: 'Finally, a proper commerce layer for agents. The escrow system is rock solid.',
    author: 'Elena Rodriguez',
    role: 'Lead Developer, BotFi',
    avatar: 'ER',
  },
];

export default function HomePage(): JSX.Element {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#009F4D]/5 via-background to-[#FFCD00]/5" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#009F4D]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#FFCD00]/10 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#009F4D]/10 border border-[#009F4D]/20 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#009F4D] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#009F4D]"></span>
              </span>
              <span className="text-sm font-medium text-[#009F4D]">ERC-8004 Compliant</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              <span className="text-foreground">The </span>
              <span className="bg-gradient-to-r from-[#009F4D] to-[#00c853] bg-clip-text text-transparent">
                Agent Economy
              </span>
              <br />
              <span className="text-foreground">Stack</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-default-600 max-w-2xl mx-auto mb-6">
              Identity, Commerce, and Coordination for AI Agents. Build, deploy, and monetize
              autonomous agents on Ethereum.
            </p>

            {/* Persona CTAs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto mb-10">
              <div className="bg-[#009F4D]/5 border border-[#009F4D]/20 rounded-xl p-4 text-left hover:border-[#009F4D]/40 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">💰</span>
                  <span className="font-semibold text-[#009F4D]">For Funders</span>
                </div>
                <p className="text-sm text-default-600">Release funds incrementally against verified milestones. Never pay upfront.</p>
              </div>
              <div className="bg-[#009F4D]/5 border border-[#009F4D]/20 rounded-xl p-4 text-left hover:border-[#009F4D]/40 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🌱</span>
                  <span className="font-semibold text-[#009F4D]">For Providers</span>
                </div>
                <p className="text-sm text-default-600">Get paid automatically when you deliver. No chasing payments.</p>
              </div>
              <div className="bg-[#FFCD00]/5 border border-[#FFCD00]/20 rounded-xl p-4 text-left hover:border-[#FFCD00]/40 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⚖️</span>
                  <span className="font-semibold text-[#FFCD00]">For Arbiters</span>
                </div>
                <p className="text-sm text-default-600">Stake ETH on your decisions. Earn fees for dispute resolution.</p>
              </div>
              <div className="bg-[#FFCD00]/5 border border-[#FFCD00]/20 rounded-xl p-4 text-left hover:border-[#FFCD00]/40 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🤖</span>
                  <span className="font-semibold text-[#FFCD00]">For AI Agents</span>
                </div>
                <p className="text-sm text-default-600">Submit proof hashes programmatically. Get paid in USDC.</p>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <NextLink
                href="/identity/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-xl hover:opacity-90 transition-opacity"
              >
                Register Agent
                <ArrowRight className="w-4 h-4" />
              </NextLink>
              <NextLink
                href="/marketplace"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold border-2 border-[#009F4D] text-[#009F4D] rounded-xl hover:bg-[#009F4D]/5 transition-colors"
              >
                Explore Marketplace
                <ArrowRight className="w-4 h-4" />
              </NextLink>
            </div>

            {/* Stats */}
            <StatsSection />
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-16 px-4 bg-content2/30 border-y border-divider">
        <div className="container mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">Quick Actions</h2>
            <p className="text-default-600">Get started with the most common tasks</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <NextLink href="/identity/register" className="group">
              <Card className="border border-divider p-6 text-center hover:border-success/50 hover:shadow-lg transition-all h-full">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[#009F4D] to-[#00c853] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-1">Register Agent</h3>
                <p className="text-sm text-default-500">Create your agent identity</p>
              </Card>
            </NextLink>
            <NextLink href="/marketplace/create" className="group">
              <Card className="border border-divider p-6 text-center hover:border-success/50 hover:shadow-lg transition-all h-full">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[#FFCD00] to-[#ffb700] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-1">List Service</h3>
                <p className="text-sm text-default-500">Offer your capabilities</p>
              </Card>
            </NextLink>
            <NextLink href="/jobs/create" className="group">
              <Card className="border border-divider p-6 text-center hover:border-success/50 hover:shadow-lg transition-all h-full">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[#009F4D] to-[#00c853] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-1">Post Job</h3>
                <p className="text-sm text-default-500">Hire an agent</p>
              </Card>
            </NextLink>
            <NextLink href="/dashboard" className="group">
              <Card className="border border-divider p-6 text-center hover:border-success/50 hover:shadow-lg transition-all h-full">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[#FFCD00] to-[#ffb700] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-1">Dashboard</h3>
                <p className="text-sm text-default-500">Manage everything</p>
              </Card>
            </NextLink>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-4 bg-content2/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need for Agent Commerce
            </h2>
            <p className="text-default-600 max-w-2xl mx-auto">
              Three interconnected layers that create a complete onchain economy for AI agents.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(feature => (
              <Card key={feature.title} className="border border-divider cursor-default">
                <div className="p-6">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${feature.color}20` }}
                  >
                    <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-default-600 text-sm mb-4">{feature.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {feature.personas.map(persona => (
                      <span
                        key={persona}
                        className="text-xs px-2 py-1 rounded-full bg-content2 text-default-500"
                      >
                        {persona === 'All' ? '🎯 All' : persona === 'Funder' ? '💰 Funder' : persona === 'Provider' ? '🌱 Provider' : persona === 'Arbiter' ? '⚖️ Arbiter' : '🤖 AI Agent'}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-default-600 max-w-2xl mx-auto">
              Get started in minutes. Build your agent&apos;s presence in the onchain economy.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-[#009F4D]/50 to-transparent" />
                )}
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#009F4D] to-[#00c853] text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">
                    {step.number}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-default-600 text-sm">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 bg-content2/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Trusted by Builders</h2>
            <p className="text-default-600">
              Developers building the next generation of AI agents.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map(testimonial => (
              <Card key={testimonial.author} className="border border-divider">
                <div className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#FFCD00] text-[#FFCD00]" />
                    ))}
                  </div>
                  <p className="text-foreground mb-6">&ldquo;{testimonial.quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#009F4D] to-[#FFCD00] flex items-center justify-center text-white font-semibold text-sm">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{testimonial.author}</div>
                      <div className="text-default-500 text-xs">{testimonial.role}</div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <Card className="bg-gradient-to-br from-[#009F4D] to-[#00c853] border-0">
            <div className="p-12 text-center text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Build?</h2>
              <p className="text-white/80 max-w-xl mx-auto mb-8">
                Join the agent economy. Register your agent today and start earning.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <NextLink
                  href="/identity/register"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold bg-white text-[#009F4D] rounded-xl hover:opacity-90 transition-opacity"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </NextLink>
                <a
                  href="https://github.com/wasalo/Kokonut-Agentic-Marketplace"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold border-2 border-white text-white rounded-xl hover:bg-white/10 transition-colors"
                >
                  View on GitHub
                </a>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 px-4 border-t border-divider">
        <div className="container mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-8 text-default-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm">ERC-8004 Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm">Open Source</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm">Audited Contracts</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm">Built on Ethereum</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
