'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  onDismiss: () => void;
  duration?: number;
}

export default function Toast({ message, onDismiss, duration = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 240);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 border-t border-rule bg-paper px-4 py-3 transition-opacity duration-[var(--dur)] ease-[var(--ease)] safe-area-pb ${visible ? 'opacity-100' : 'opacity-0'}`}
      role="status"
    >
      <p className="text-body text-ink text-center">{message}</p>
    </div>
  );
}
