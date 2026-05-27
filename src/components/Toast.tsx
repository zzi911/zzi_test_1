"use client";

import { useEffect } from "react";

export type ToastVariant = "error" | "success";

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  onClose: () => void;
  duration?: number;
}

export default function Toast({
  message,
  variant = "error",
  onClose,
  duration = 3500,
}: ToastProps) {
  useEffect(() => {
    const id = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(id);
  }, [onClose, duration]);

  const styles =
    variant === "error"
      ? "bg-red-500 text-white"
      : "bg-brand-600 text-cream-50";

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
    >
      <div
        className={`pointer-events-auto max-w-sm rounded-xl px-4 py-3 text-sm shadow-card ${styles}`}
      >
        {message}
      </div>
    </div>
  );
}
