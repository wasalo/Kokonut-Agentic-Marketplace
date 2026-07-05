'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useEnsName, useChainId } from 'wagmi';
import { ExternalLink, Check, Copy } from 'lucide-react';

function CopyButton({ text, className = '' }: { text: string; variant?: string; size?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button type="button"
      onClick={handleCopy}
      className={`inline-flex items-center justify-center rounded transition-colors ${className}`}
      aria-label={copied ? 'Address copied' : 'Copy address'}
      title={copied ? 'Copied!' : 'Copy address'}
    >
      {copied ? (
        <Check className="size-3 text-success" />
      ) : (
        <Copy className="size-3 text-default-400 hover:text-default-600" />
      )}
    </button>
  );
}

interface AddressProps {
  address: `0x${string}` | string;
  truncate?: boolean;
  truncateChars?: { start: number; end: number };
  copyable?: boolean;
  explorerLink?: boolean;
  showEns?: boolean;
  className?: string;
  asSpan?: boolean;
}

const getExplorerBaseUrl = (chainId?: number) => {
  if (chainId === 1) return 'https://etherscan.io/address/';
  if (chainId === 137) return 'https://polygonscan.com/address/';
  if (chainId === 8453) return 'https://basescan.org/address/';
  return 'https://sepolia.etherscan.io/address/';
};

function truncateAddress(address: string, truncateChars?: { start: number; end: number }): string {
  if (!address || address.length < 14) return address;
  const chars = truncateChars || { start: 6, end: 4 };
  return `${address.slice(0, chars.start + 2)}...${address.slice(-chars.end)}`;
}

export function Address({
  address,
  truncate = true,
  truncateChars,
  copyable = true,
  explorerLink = true,
  showEns = true,
  className = '',
  asSpan = false,
}: AddressProps) {
  const [mounted, setMounted] = useState(false);
  const chainId = useChainId();

  const checksumAddress = address.toLowerCase().startsWith('0x')
    ? (`0x${address.slice(2).toLowerCase()}` as `0x${string}`)
    : (address as `0x${string}`);

  const { data: ensName } = useEnsName({
    address: checksumAddress,
    chainId: 1,
    query: {
      enabled: showEns && mounted,
    },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const displayAddress = truncate ? truncateAddress(address, truncateChars) : address;
  const fullAddress = address;
  const hasEns = !!ensName;

  const explorerUrl = `${getExplorerBaseUrl(chainId)}${fullAddress}`;

  const content = (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-sm ${className}`}
      title={fullAddress}
    >
      {hasEns ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="text-primary font-medium">{ensName}</span>
          <span className="text-default-400 text-xs">({displayAddress})</span>
        </span>
      ) : (
        <span>{displayAddress}</span>
      )}
      {copyable && (
        <CopyButton
          text={fullAddress}
          variant="ghost"
          size="sm"
          className="p-0.5 h-auto min-w-0"
        />
      )}
      {explorerLink && (
        <span
          role="button"
          tabIndex={0}
          onClick={e => {
            e.stopPropagation();
            window.open(explorerUrl, '_blank', 'noopener,noreferrer');
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              window.open(explorerUrl, '_blank', 'noopener,noreferrer');
            }
          }}
          className="p-0.5 hover:bg-content2 rounded transition-colors inline-flex cursor-pointer"
          title="View on Etherscan"
        >
          <ExternalLink className="size-3 text-default-400 hover:text-default-600" />
        </span>
      )}
    </span>
  );

  if (asSpan) {
    return <span>{content}</span>;
  }

  return (
    <span className="inline-flex items-center gap-1">
      {content}
    </span>
  );
}

interface AddressLinkProps extends Omit<AddressProps, 'explorerLink'> {
  href?: string;
}

export function AddressLink({
  address,
  href,
  truncate = true,
  truncateChars,
  showEns = true,
  className = '',
}: AddressLinkProps) {
  const [mounted, setMounted] = useState(false);

  const checksumAddress = address.toLowerCase().startsWith('0x')
    ? (`0x${address.slice(2).toLowerCase()}` as `0x${string}`)
    : (address as `0x${string}`);

  const { data: ensName } = useEnsName({
    address: checksumAddress,
    chainId: 1,
    query: {
      enabled: showEns && mounted,
    },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const displayAddress = truncate ? truncateAddress(address, truncateChars) : address;
  const fullAddress = address;
  const hasEns = !!ensName;

  const defaultHref = `/identity/${checksumAddress}`;
  const linkHref = href || defaultHref;

  return (
    <Link
      href={linkHref}
      className={`inline-flex items-center gap-1 font-mono text-sm hover:text-primary transition-colors ${className}`}
      title={fullAddress}
    >
      {hasEns ? (
        <span className="inline-flex items-center gap-1">
          <span className="text-primary font-medium">{ensName}</span>
          <span className="text-default-400 text-xs">({displayAddress})</span>
        </span>
      ) : (
        <span>{displayAddress}</span>
      )}
    </Link>
  );
}

export default Address;
