import { cn } from "@/lib/utils";

interface SectionProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  withGrid?: boolean;
}

export const Section = ({
  id,
  children,
  className,
  withGrid = false,
}: SectionProps) => {
  return (
    <section
      id={id}
      className={cn("relative py-24 px-6 md:px-8", withGrid && "grid-pattern", className)}
    >
      <div className="relative z-10 mx-auto max-w-6xl">{children}</div>
    </section>
  );
};
