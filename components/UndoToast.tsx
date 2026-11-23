'use client';

import React from 'react';
import { X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  onUndo?: () => void;
}

interface UndoToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export function UndoToast({ toast, onDismiss }: UndoToastProps) {
  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-neutral-900 border-2 border-neutral-700 text-neutral-100 text-xs font-mono px-4 py-3 rounded-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      <span>{toast.text}</span>
      {toast.onUndo && (
        <button
          onClick={() => {
            toast.onUndo?.();
            onDismiss();
          }}
          className="px-2 py-1 bg-[#CCFF00] text-black font-bold text-[11px] rounded hover:bg-lime-300 transition-colors cursor-pointer"
        >
          Undo
        </button>
      )}
      <button
        onClick={onDismiss}
        className="text-neutral-500 hover:text-neutral-300 ml-1 cursor-pointer"
        aria-label="Dismiss message"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
