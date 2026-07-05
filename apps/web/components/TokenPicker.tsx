'use client';

import { useState, type ComponentType, type CSSProperties } from 'react';
import { ChevronDown, CircleDot, Coins, DollarSign } from 'lucide-react';
import {
  ETH_TOKEN,
  USDC_TOKEN,
  getTokenMetaByAddress,
  DEFAULT_BRAND_COLOR,
  type TokenMeta,
  type TokenSymbol,
} from '@/lib/tokens';

export type { TokenMeta } from '@/lib/tokens';
export {
  ALL_TOKENS,
  USDC_TOKEN,
  ETH_TOKEN,
  SERVICE_LISTING_TOKENS,
  JOB_FUNDING_TOKENS,
  BIDDING_TOKENS,
  getTokenMetaByAddress,
} from '@/lib/tokens';

export type TokenPickerVariant = 'dropdown' | 'grid';

function getTokenIcon(symbol: TokenSymbol): ComponentType<{ className?: string; style?: CSSProperties }> {
  return symbol === 'ETH' ? CircleDot : DollarSign;
}

function brandColor(meta: TokenMeta): string {
  return meta.brandColor ?? DEFAULT_BRAND_COLOR;
}

interface BaseProps {
  selectedToken: TokenMeta;
  onSelectToken: (token: TokenMeta) => void;
  disabled?: boolean;
  tokens: TokenMeta[];
  className?: string;
  ariaLabel?: string;
}

const DEFAULT_TOKENS: TokenMeta[] = [USDC_TOKEN, ETH_TOKEN];

export function TokenPicker({
  selectedToken,
  onSelectToken,
  disabled = false,
  tokens = DEFAULT_TOKENS,
  className = '',
  ariaLabel = 'Select payment token',
  variant,
}: BaseProps & { variant: TokenPickerVariant }): JSX.Element {
  if (variant === 'dropdown') {
    return (
      <DropdownTokenPicker
        selectedToken={selectedToken}
        onSelectToken={onSelectToken}
        disabled={disabled}
        tokens={tokens}
        className={className}
        ariaLabel={ariaLabel}
      />
    );
  }
  return (
    <GridTokenPicker
      selectedToken={selectedToken}
      onSelectToken={onSelectToken}
      disabled={disabled}
      tokens={tokens}
      className={className}
      ariaLabel={ariaLabel}
    />
  );
}

function DropdownTokenPicker({
  selectedToken,
  onSelectToken,
  disabled = false,
  tokens,
  className = '',
  ariaLabel,
}: BaseProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const selected = getTokenMetaByAddress(selectedToken.address);
  const Icon = getTokenIcon(selected.symbol);

  const handleSelect = (token: TokenMeta) => {
    onSelectToken(token);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 border rounded-lg bg-content2 text-foreground focus:outline-none focus:ring-2 focus:ring-success transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-success/50 cursor-pointer'
        } ${isOpen ? 'border-success ring-2 ring-success/20' : 'border-divider'}`}
      >
        <div className="flex items-center gap-2">
          <div
            className="size-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${brandColor(selected)}22` }}
          >
            <Icon className="size-3.5" style={{ color: brandColor(selected) }} />
          </div>
          <span className="font-medium">{selected.symbol}</span>
        </div>
        <ChevronDown
          className={`size-4 text-default-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div
            role="listbox"
            aria-label={ariaLabel}
            className="absolute z-20 w-full mt-1 bg-content2 border border-divider rounded-lg shadow-lg overflow-hidden"
          >
            {tokens.map(token => {
              const TokenIcon = getTokenIcon(token.symbol);
              const isSelected = token.address === selected.address;

              return (
                <button type="button"
                  key={token.symbol}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(token)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-content3 transition-colors ${
                    isSelected ? 'bg-success/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="size-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${brandColor(token)}22` }}
                    >
                      <TokenIcon className="size-3.5" style={{ color: brandColor(token) }} />
                    </div>
                    <div className="text-left">
                      <span className="font-medium text-sm">{token.symbol}</span>
                      <p className="text-xs text-default-400">{token.name}</p>
                    </div>
                  </div>
                  {isSelected && <div className="size-2 rounded-full bg-success" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function GridTokenPicker({
  selectedToken,
  onSelectToken,
  disabled = false,
  tokens,
  className = '',
  ariaLabel,
}: BaseProps): JSX.Element {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${className}`}
    >
      {tokens.map(token => {
        const isSelected = token.address === selectedToken.address;
        return (
          <button
            type="button"
            key={token.symbol}
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelectToken(token)}
            disabled={disabled}
            className={`p-4 rounded-lg border-2 transition-all ${
              isSelected
                ? 'border-success bg-success/5'
                : 'border-divider hover:border-default-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center gap-3">
              <div
                className="size-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: brandColor(token) }}
              >
                <Coins className="size-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-medium">{token.symbol}</p>
                <p className="text-xs text-default-500">{token.name}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function TokenPickerBadge({ token }: { token: TokenMeta | string }): JSX.Element {
  const resolved =
    typeof token === 'string' ? getTokenMetaByAddress(token) : (token ?? USDC_TOKEN);
  const meta = getTokenMetaByAddress(resolved.address);
  const Icon = getTokenIcon(meta.symbol);
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${brandColor(meta)}22`, color: brandColor(meta) }}
    >
      <Icon className="size-3" />
      {meta.symbol}
    </span>
  );
}
