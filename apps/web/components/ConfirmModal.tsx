'use client';

import { AlertTriangle, AlertCircle, Info, X, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
  isPending?: boolean;
}

export function ConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isPending = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <AlertCircle className="w-6 h-6 text-danger" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-warning" />;
      default:
        return <Info className="w-6 h-6 text-primary" />;
    }
  };

  const getConfirmButtonClass = () => {
    const base = 'px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50';
    switch (variant) {
      case 'danger':
        return `${base} bg-danger hover:bg-danger-600 text-white`;
      case 'warning':
        return `${base} bg-warning hover:bg-warning-600 text-black`;
      default:
        return `${base} bg-primary hover:bg-primary-600 text-white`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-background border border-divider rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 text-default-400 hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4 mb-4">
          {getIcon()}
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
        </div>

        <p className="text-default-600 mb-6">{message}</p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 rounded-lg border border-divider hover:bg-content2 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button onClick={onConfirm} disabled={isPending} className={getConfirmButtonClass()}>
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
