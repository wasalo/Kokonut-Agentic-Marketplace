'use client';

import { useState, useCallback, useEffect } from 'react';
import { useEnsAddress } from 'wagmi';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import { validateAddress } from '@/lib/hooks/useValidation';
import { formatAddress } from '@/lib/utils';

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  label?: string;
  error?: string | null;
  disabled?: boolean;
  showValidation?: boolean;
  resolveEns?: boolean;
  className?: string;
}

export function AddressInput({
  value,
  onChange,
  onBlur,
  placeholder = '0x...',
  label,
  error: externalError,
  disabled = false,
  showValidation = true,
  resolveEns = false,
  className = '',
}: AddressInputProps) {
  const [internalError, setInternalError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isValidFormat = value.length === 0 || validateAddress(value) === null;

  const { data: ensAddress, isLoading: isEnsLoading } = useEnsAddress({
    name: value,
    chainId: 1,
    query: {
      enabled: resolveEns && mounted && value.endsWith('.eth') && !isValidFormat,
    },
  });

  const isValid = value.length === 0 || (isValidFormat && !internalError);
  const showError = touched && !isValid && (externalError || internalError);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (touched && value && !isValidFormat) {
      setInternalError('Invalid Ethereum address format');
    } else {
      setInternalError(null);
    }
  }, [value, isValidFormat, touched]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);
    },
    [onChange]
  );

  const handleBlur = useCallback(() => {
    setTouched(true);
    onBlur?.();
  }, [onBlur]);

  const handlePaste = useCallback((_e: React.ClipboardEvent) => {
    setTouched(true);
  }, []);

  return (
    <div className={`space-y-1 ${className}`}>
      {label && <label className="block text-sm font-medium">{label}</label>}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={disabled || isEnsLoading}
          className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm font-mono ring-offset-background transition-colors
            ${
              showError
                ? 'border-danger focus-visible:ring-danger'
                : 'border-input focus-visible:ring-success'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            placeholder:text-muted-foreground
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
            disabled:cursor-not-allowed disabled:opacity-50
            bg-background`}
        />
        {showValidation && mounted && value && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isEnsLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-default-400" />
            ) : isValid ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <AlertCircle className="w-4 h-4 text-danger" />
            )}
          </div>
        )}
      </div>
      {showError && (
        <p className="text-xs text-danger flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {externalError || internalError}
        </p>
      )}
      {resolveEns && value.endsWith('.eth') && ensAddress && (
        <p className="text-xs text-success flex items-center gap-1">
          <Check className="w-3 h-3" />
          Resolved: {formatAddress(ensAddress)}
        </p>
      )}
    </div>
  );
}

export default AddressInput;
