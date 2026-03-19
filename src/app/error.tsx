"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0b] text-white">
      <div className="text-center">
        <p className="font-mono text-sm text-red-500">ERROR</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 font-mono text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
