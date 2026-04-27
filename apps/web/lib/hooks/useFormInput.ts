'use client';

import { useState, useCallback, useEffect } from 'react';

interface UseFormInputOptions<T = string> {
  initialValue?: T;
  validate?: (value: T) => string | null;
  onChange?: (value: T) => void;
}

interface UseFormInputReturn<T = string> {
  value: T;
  setValue: (value: T) => void;
  error: string | null;
  isValid: boolean;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleBlur: () => void;
  reset: () => void;
}

export function useFormInput<T = string>(
  options: UseFormInputOptions<T> = {}
): UseFormInputReturn<T> {
  const initialValue = options.initialValue || ('' as T);
  const [value, setValue] = useState<T>(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const validate = useCallback((val: T): string | null => {
    if (options.validate) {
      return options.validate(val);
    }
    return null;
  }, [options.validate]);

  const isValid = useCallback((): boolean => {
    const validationError = validate(value);
    return validationError === null;
  }, [validate, value]);

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const newValue = e.target.value as T;
    setValue(newValue);

    if (options.onChange) {
      options.onChange(newValue);
    }

    if (touched) {
      const validationError = validate(newValue);
      setError(validationError);
    }
  }, [options, validate, touched]);

  const handleBlur = useCallback(() => {
    setTouched(true);
    const validationError = validate(value);
    setError(validationError);
  }, [validate, value]);

  const reset = useCallback(() => {
    setValue(initialValue);
    setError(null);
    setTouched(false);
  }, [initialValue]);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return {
    value,
    setValue,
    error,
    isValid: isValid(),
    handleChange,
    handleBlur,
    reset,
  };
}

interface UseNumberInputOptions extends UseFormInputOptions<string> {
  min?: number;
  max?: number;
  decimals?: number;
}

interface UseNumberInputReturn extends UseFormInputReturn<string> {
  numberValue: number;
}

export function useNumberInput(
  options: UseNumberInputOptions = {}
): UseNumberInputReturn {
  const validate = useCallback((value: string): string | null => {
    if (!value || value === '') {
      return options.validate ? options.validate(value) : null;
    }

    const num = parseFloat(value);
    if (isNaN(num)) {
      return 'Invalid number';
    }

    if (options.min !== undefined && num < options.min) {
      return `Minimum value is ${options.min}`;
    }

    if (options.max !== undefined && num > options.max) {
      return `Maximum value is ${options.max}`;
    }

    return null;
  }, [options.min, options.max, options.validate]);

  const {
    value,
    setValue,
    error,
    isValid,
    handleChange,
    handleBlur,
    reset,
  } = useFormInput({ ...options, validate });

  const numberValue = value ? parseFloat(value) : 0;

  return {
    value,
    setValue,
    error,
    isValid,
    handleChange,
    handleBlur,
    reset,
    numberValue,
  };
}

export default useFormInput;