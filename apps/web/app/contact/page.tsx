'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useAccount } from 'wagmi';
import { Address } from '@/components/Address';
import { DS, btn } from '@/lib/design-system';
import { Button } from '@/components/ui/Button';

export default function ContactPage() {
  const { isConnected, address } = useAccount();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'general',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const categories = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'technical', label: 'Technical Issue' },
    { value: 'feedback', label: 'Platform Feedback' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'security', label: 'Security Vulnerability' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.message) return;

    await new Promise(resolve => setTimeout(resolve, 1000));
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className={DS.spacing.page + ' max-w-2xl'}>
        <div className={DS.cards.padded + ' text-center'}>
          <MessageSquare className="w-12 h-12 text-success mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Message Sent!</h1>
          <p className="text-default-500 mb-4">
            Thank you for reaching out. We&apos;ll get back to you as soon as possible.
          </p>
          <Button onClick={() => setSubmitted(false)}>Send Another Message</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={DS.spacing.page + ' max-w-2xl'}>
      <div className="text-center mb-8">
        <h1 className={DS.typography.pageTitle}>Contact Us</h1>
        <p className={DS.typography.pageSubtitle}>
          Have questions or feedback? We&apos;d love to hear from you.
        </p>
      </div>

      <div className={DS.cards.padded}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={DS.spacing.formField}>
            <label htmlFor="name" className={DS.labels.base}>Name</label>
            <input
              id="name"
              name="name"
              type="text"
              className={DS.inputs.base}
              placeholder="Your name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className={DS.spacing.formField}>
            <label htmlFor="email" className={DS.labels.base}>Email *</label>
            <input
              id="email"
              name="email"
              type="email"
              className={DS.inputs.base}
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className={DS.spacing.formField}>
            <label htmlFor="category" className={DS.labels.base}>Category</label>
            <select
              id="category"
              name="category"
              className={DS.inputs.select}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className={DS.spacing.formField}>
            <label htmlFor="message" className={DS.labels.base}>Message *</label>
            <textarea
              id="message"
              name="message"
              className={DS.inputs.base + ' ' + DS.inputs.textarea}
              placeholder="Tell us what's on your mind..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={!formData.email || !formData.message}
              className="w-full"
            >
              Send Message
            </Button>
          </div>
        </form>
      </div>

      <p className="text-sm text-default-400 mt-4 text-center">
        For urgent issues, email us directly at{' '}
        <a href="mailto:support@kokonut.network" className="text-primary hover:underline">
          support@kokonut.network
        </a>
      </p>

      {isConnected && address && (
        <div className="mt-4 text-center text-xs text-default-400">
          Connected wallet: <Address address={address} truncate />
        </div>
      )}
    </div>
  );
}