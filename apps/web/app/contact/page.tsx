'use client';

import { useState } from 'react';
import { Button, Card } from '@heroui/react';
import { MessageSquare } from 'lucide-react';
import { useAccount } from 'wagmi';

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
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <Card className="p-8 text-center">
          <MessageSquare className="w-12 h-12 text-success mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Message Sent!</h1>
          <p className="text-default-500 mb-4">
            Thank you for reaching out. We&apos;ll get back to you as soon as possible.
          </p>
          <Button onPress={() => setSubmitted(false)}>Send Another Message</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
        <p className="text-default-500">
          Have questions or feedback? We&apos;d love to hear from you.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="name" className="text-sm font-medium">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              className="w-full p-2 rounded-lg border border-divider bg-default"
              placeholder="Your name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">Email *</label>
            <input
              id="email"
              name="email"
              type="email"
              className="w-full p-2 rounded-lg border border-divider bg-default"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="category" className="text-sm font-medium">Category</label>
            <select
              id="category"
              name="category"
              className="w-full p-2 rounded-lg border border-divider bg-default"
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

          <div className="space-y-1">
            <label htmlFor="message" className="text-sm font-medium">Message *</label>
            <textarea
              id="message"
              name="message"
              className="w-full p-2 rounded-lg border border-divider bg-default min-h-[120px]"
              placeholder="Tell us what's on your mind..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              isDisabled={!formData.email || !formData.message}
            >
              Send Message
            </Button>
          </div>
        </form>
      </Card>

      <p className="text-sm text-default-400 mt-4 text-center">
        For urgent issues, email us directly at{' '}
        <a href="mailto:support@kokonut.network" className="text-primary hover:underline">
          support@kokonut.network
        </a>
      </p>

      {isConnected && address && (
        <div className="mt-4 text-center text-xs text-default-400">
          Connected wallet: {address.slice(0, 6)}...{address.slice(-4)}
        </div>
      )}
    </div>
  );
}