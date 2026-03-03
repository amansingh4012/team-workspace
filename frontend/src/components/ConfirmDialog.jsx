import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Reusable confirmation dialog with focus trap.
 *
 * Props:
 *   open        – boolean controlling visibility
 *   title       – dialog heading (default "Are you sure?")
 *   message     – body text
 *   confirmText – primary button label (default "Confirm")
 *   cancelText  – secondary button label (default "Cancel")
 *   variant     – "danger" | "warning" | "info" (default "danger")
 *   loading     – show spinner on confirm button
 *   onConfirm   – callback when user confirms
 *   onCancel    – callback when user cancels
 */
const ConfirmDialog = ({
  open,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const confirmRef = useRef(null);

  /* Auto-focus confirm button when dialog opens */
  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  const colors = {
    danger: {
      icon: 'text-red-400 bg-red-500/10',
      btn: 'bg-red-600 hover:bg-red-500 focus:ring-red-500/50',
    },
    warning: {
      icon: 'text-amber-400 bg-amber-500/10',
      btn: 'bg-amber-600 hover:bg-amber-500 focus:ring-amber-500/50',
    },
    info: {
      icon: 'text-indigo-400 bg-indigo-500/10',
      btn: 'bg-indigo-600 hover:bg-indigo-500 focus:ring-indigo-500/50',
    },
  }[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-gray-900 border border-gray-800 rounded-xl shadow-xl max-w-sm w-full mx-4 p-6 animate-fade-in">
        <div className="flex items-start gap-4">
          <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colors.icon}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-100 mb-1">{title}</h3>
            <p className="text-sm text-gray-400">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm text-white rounded-lg font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 disabled:opacity-50 ${colors.btn}`}
          >
            {loading ? 'Please wait…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
