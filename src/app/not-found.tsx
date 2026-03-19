import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0b] text-white">
      <div className="text-center">
        <p className="font-mono text-sm text-emerald-500">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 font-mono text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
          >
            Go home
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-2 font-mono text-xs font-medium text-zinc-400 transition-colors hover:bg-white/[0.06]"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
