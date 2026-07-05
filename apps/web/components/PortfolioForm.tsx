'use client';

import { useState } from 'react';
import { Plus, X, ExternalLink, Loader2, CheckCircle2 } from 'lucide-react';
import { Card } from '@heroui/react';
import { Input, Textarea } from '@/components/ui/Input';
import { card } from '@/lib/design-system';

export interface PortfolioItem {
  title: string;
  description: string;
  link?: string;
  image?: string;
}

const MAX_PORTFOLIO_ITEMS = 10;

interface PortfolioFormProps {
  portfolio: PortfolioItem[];
  onChange: (portfolio: PortfolioItem[]) => void;
  isSaving?: boolean;
  saveSuccess?: boolean;
}

export function PortfolioForm({ portfolio, onChange, isSaving, saveSuccess }: PortfolioFormProps) {
  const [newItem, setNewItem] = useState<PortfolioItem>({
    title: '',
    description: '',
    link: '',
    image: '',
  });

  const handleAddItem = () => {
    if (portfolio.length >= MAX_PORTFOLIO_ITEMS) return;
    if (!newItem.title.trim() || !newItem.description.trim()) return;

    onChange([...portfolio, { ...newItem }]);
    setNewItem({ title: '', description: '', link: '', image: '' });
  };

  const handleRemoveItem = (index: number) => {
    onChange(portfolio.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: keyof PortfolioItem, value: string) => {
    const updated = [...portfolio];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <Card className={card('padded', 'p-6')}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          Portfolio
          <span className="text-sm font-normal text-default-500">
            ({portfolio.length}/{MAX_PORTFOLIO_ITEMS})
          </span>
        </h2>
      </div>

      {portfolio.length > 0 && (
        <div className="space-y-3 mb-6">
          {portfolio.map((item, index) => (
            <div key={index} className="p-3 bg-content2 rounded-lg border border-divider">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    placeholder="Title"
                    value={item.title}
                    onChange={e => handleUpdateItem(index, 'title', e.target.value)}
                    className="w-full bg-transparent border-none text-sm font-medium focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={item.description}
                    onChange={e => handleUpdateItem(index, 'description', e.target.value)}
                    className="w-full bg-transparent border-none text-sm text-default-500 focus:outline-none mt-1"
                  />
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                    >
                      {item.link.slice(0, 30)}...
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
                <button type="button"
                  onClick={() => handleRemoveItem(index)}
                  className="p-1 text-default-400 hover:text-danger transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {portfolio.length < MAX_PORTFOLIO_ITEMS && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-default-600">Add New Portfolio Item</div>
          <Input
            type="text"
            label="Title *"
            value={newItem.title}
            onChange={e => setNewItem({ ...newItem, title: e.target.value })}
          />
          <Textarea
            label="Description *"
            value={newItem.description}
            onChange={e => setNewItem({ ...newItem, description: e.target.value })}
            rows={2}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              type="url"
              label="Link (optional)"
              value={newItem.link}
              onChange={e => setNewItem({ ...newItem, link: e.target.value })}
            />
            <Input
              type="url"
              label="Image URL (optional)"
              value={newItem.image}
              onChange={e => setNewItem({ ...newItem, image: e.target.value })}
            />
          </div>
          <button type="button"
            disabled={!newItem.title.trim() || !newItem.description.trim()}
            onClick={handleAddItem}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="size-4" />
            Add Item
          </button>
        </div>
      )}

      {portfolio.length >= MAX_PORTFOLIO_ITEMS && (
        <p className="text-sm text-default-500">
          Maximum portfolio items reached ({MAX_PORTFOLIO_ITEMS}).
        </p>
      )}

      {saveSuccess && (
        <div className="flex items-center gap-2 text-success text-sm mt-4">
          <CheckCircle2 className="size-4" />
          Portfolio saved successfully!
        </div>
      )}

      {isSaving && (
        <div className="flex items-center gap-2 text-default-500 text-sm mt-4">
          <Loader2 className="size-4 animate-spin" />
          Saving portfolio...
        </div>
      )}
    </Card>
  );
}