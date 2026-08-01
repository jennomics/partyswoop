'use client';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

export default function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  if (!message) return null;

  return (
    <div className="border-t border-rule px-4 py-3 text-ink-72" role="alert">
      <div className="flex items-center justify-between gap-2">
        <p className="text-body">{message}</p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="min-h-[var(--target-min)] text-body text-ink-72 underline"
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
