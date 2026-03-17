"use client";

/**
 * Subtle ambient background — soft radial glows that drift slowly.
 * No floating objects, no particles. Just warm atmospheric light.
 */
export const BobaBackground = () => {
  return (
    <div className="pointer-events-none fixed inset-0 -z-1 overflow-hidden" aria-hidden>
      {/* Large taro glow — top left */}
      <div
        className="absolute -left-[20%] -top-[10%] h-[60vh] w-[60vh] rounded-full opacity-[0.07]"
        style={{
          background: "radial-gradient(circle, #9B7EC8 0%, transparent 70%)",
          animation: "bgDrift1 25s ease-in-out infinite",
        }}
      />
      {/* Warm accent glow — bottom right */}
      <div
        className="absolute -bottom-[15%] -right-[15%] h-[50vh] w-[50vh] rounded-full opacity-[0.05]"
        style={{
          background: "radial-gradient(circle, #D4A574 0%, transparent 70%)",
          animation: "bgDrift2 30s ease-in-out infinite",
        }}
      />
      {/* Small brand glow — mid right */}
      <div
        className="absolute right-[10%] top-[40%] h-[30vh] w-[30vh] rounded-full opacity-[0.04]"
        style={{
          background: "radial-gradient(circle, #C4A8E0 0%, transparent 70%)",
          animation: "bgDrift3 20s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes bgDrift1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(5vw, 3vh); }
        }
        @keyframes bgDrift2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-4vw, -2vh); }
        }
        @keyframes bgDrift3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-3vw, 4vh); }
        }
      `}</style>
    </div>
  );
};
