"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn(
          "fixed top-0 z-50 w-full border-b backdrop-blur-xl transition-all duration-300",
          scrolled
            ? "border-border bg-background/80 shadow-[0_1px_30px_-8px_rgba(155,126,200,0.1)]"
            : "border-transparent bg-transparent"
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo />

          {/* Desktop nav — centered */}
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link, i) => (
              <div key={link.label} className="flex items-center">
                <a
                  href={link.href}
                  className="rounded-xl px-3 py-1.5 text-sm text-muted transition-colors duration-200 hover:text-foreground"
                >
                  {link.label}
                </a>
                {i < NAV_LINKS.length - 1 && (
                  <span className="mx-1 h-1 w-1 rounded-full bg-brand/20" />
                )}
              </div>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-3 md:flex">
            <Button variant="ghost" size="sm" href="/auth/login">
              Log in
            </Button>
            <Button size="sm" href="/auth/register">
              Deploy Now
            </Button>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-xl p-2 text-muted transition-colors hover:text-foreground md:hidden"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu — full screen overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-background/98 backdrop-blur-xl md:hidden"
          >
            <div className="flex h-full flex-col items-center justify-center gap-8">
              {NAV_LINKS.map((link, i) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                  className="text-2xl font-medium text-foreground transition-colors hover:text-brand"
                >
                  {link.label}
                </motion.a>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ delay: NAV_LINKS.length * 0.06, duration: 0.3 }}
                className="mt-4 flex flex-col gap-3"
              >
                <Button variant="secondary" size="lg" href="/auth/login">
                  Log in
                </Button>
                <Button size="lg" href="/auth/register">
                  Deploy Now
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
