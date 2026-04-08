'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useEnsName, useChainId } from 'wagmi';
import { Copy, Check, ExternalLink } from 'lucide-react';

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

const EXPLORER_BASE_URL = 'https://sepolia.etherscan.io/address/';

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
  const [copied, setCopied] = useState(false);
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
  const ensDisplay = ensName || displayAddress;

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(fullAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy address:', err);
      }
    },
    [fullAddress]
  );

  const explorerUrl = `${EXPLORER_BASE_URL}${fullAddress}`;

  const content = (
    <span
      className={`inline-flex items-center gap-1 font-mono text-sm ${className}`}
      title={fullAddress}
    >
      <span>{ensDisplay}</span>
      {copyable && (
        <button
          onClick={handleCopy}
          className="p-0.5 hover:bg-content2 rounded transition-colors"
          title="Copy address"
        >
          {copied ? (
            <Check className="w-3 h-3 text-success" />
          ) : (
            <Copy className="w-3 h-3 text-default-400 hover:text-default-600" />
          )}
        </button>
      )}
      {explorerLink && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="p-0.5 hover:bg-content2 rounded transition-colors"
          title="View on Etherscan"
        >
          <ExternalLink className="w-3 h-3 text-default-400 hover:text-default-600" />
        </a>
      )}
    </span>
  );

  if (asSpan) {
    return <span>{content}</span>;
  }

  return (
    <span className="inline-flex items-center gap-1 cursor-pointer" onClick={handleCopy}>
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
  copyable = true,
  showEns = true,
  className = '',
  ...props
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
  const ensDisplay = ensName || displayAddress;

  const defaultHref = `/identity/${checksumAddress}`;
  const linkHref = href || defaultHref;

  return (
    <Link
      href={linkHref}
      className={`inline-flex items-center gap-1 font-mono text-sm hover:text-primary transition-colors ${className}`}
      title={fullAddress}
    >
      <span>{ensDisplay}</span>
    </Link>
  );
}

export default Address;
