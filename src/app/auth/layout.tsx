export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="noise-bg grid-pattern relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Radial glow behind form */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-brand/[0.07] blur-[120px]"
      />

      {/* Content sits above the glow */}
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}
