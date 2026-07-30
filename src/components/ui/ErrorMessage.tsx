'use client';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

export default function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  if (!message) return null;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800" role="alert">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{message}</p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-600 hover:text-red-800 text-lg leading-none"
            aria-label="Dismiss error"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
}
