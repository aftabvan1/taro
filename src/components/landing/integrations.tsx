"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/section";
import { bouncyContainer, bouncyItem } from "@/lib/animation-variants";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const INTEGRATIONS = [
  { name: "Gmail", bg: "#EA4335", icon: "M" },
  { name: "Slack", bg: "#611F69", icon: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.52-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.52V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.166 0a2.528 2.528 0 0 1 2.521 2.522v6.312zm-2.521 10.124a2.528 2.528 0 0 1 2.521 2.52A2.528 2.528 0 0 1 15.166 24a2.528 2.528 0 0 1-2.521-2.522v-2.52h2.521zm0-1.271a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.312A2.528 2.528 0 0 1 24 15.166a2.528 2.528 0 0 1-2.522 2.521h-6.312z"/>
    </svg>
  )},
  { name: "GitHub", bg: "#24292e", icon: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  )},
  { name: "Notion", bg: "#000000", icon: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.002 2.05c-.42-.326-.98-.7-2.055-.607L3.01 2.69c-.467.047-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.166V6.354c0-.606-.233-.933-.748-.886l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V8.162l-1.168-.093c-.093-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.214-.14c-.094-.514.28-.886.747-.933z"/>
    </svg>
  )},
  { name: "Discord", bg: "#5865F2", icon: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  )},
  { name: "Trello", bg: "#0079BF", icon: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M21 0H3C1.343 0 0 1.343 0 3v18c0 1.656 1.343 3 3 3h18c1.656 0 3-1.344 3-3V3c0-1.657-1.344-3-3-3zM10.44 18.18c0 .795-.645 1.44-1.44 1.44H4.56c-.795 0-1.44-.646-1.44-1.44V4.56c0-.795.645-1.44 1.44-1.44H9c.795 0 1.44.645 1.44 1.44v13.62zm10.44-6c0 .794-.645 1.44-1.44 1.44H15c-.795 0-1.44-.646-1.44-1.44V4.56c0-.795.645-1.44 1.44-1.44h4.44c.795 0 1.44.645 1.44 1.44v7.62z"/>
    </svg>
  )},
  { name: "Google Sheets", bg: "#34A853", icon: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M11.318 12.545H7.91v-1.909h3.41v1.91zM14.728 0v6h6l-6-6zm1.363 10.636h-3.41v1.91h3.41v-1.91zm0 3.273h-3.41v1.909h3.41v-1.91zM20.727 6.5v15.864c0 .904-.732 1.636-1.636 1.636H4.909a1.636 1.636 0 0 1-1.636-1.636V1.636C3.273.732 4.005 0 4.909 0h9.318v6.5h6.5zM7.91 16.182h8.181V9.273H7.91v6.909zm0-1.364h3.41v-1.909H7.91v1.91z"/>
    </svg>
  )},
  { name: "Linear", bg: "#5E6AD2", icon: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M1.064 13.476a.756.756 0 0 1 .003-1.066L11.49 2.003a.7568.7568 0 0 1 1.066-.003l9.44 9.397a.7568.7568 0 0 1 .003 1.066l-9.397 9.44a.7568.7568 0 0 1-1.066.004l-9.44-9.398a.765.765 0 0 1-.032-.033Z"/>
    </svg>
  )},
  { name: "Figma", bg: "#F24E1E", icon: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M15.852 8.981h-4.588V0h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.491-4.49 4.491zM12.735 7.51h3.117c1.665 0 3.019-1.355 3.019-3.019s-1.355-3.019-3.019-3.019h-3.117V7.51zm0 8.943h-4.588c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588v8.98zM4.117 11.963c0 1.665 1.354 3.02 3.019 3.02h3.117V8.944H7.136c-1.665 0-3.019 1.354-3.019 3.019zm16.225 4.49c0-2.476-2.014-4.49-4.49-4.49h-4.588v4.49c0 2.476 2.014 4.49 4.588 4.49 2.476 0 4.49-2.014 4.49-4.49z"/>
    </svg>
  )},
  { name: "Jira", bg: "#0052CC", icon: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23 .262H11.447a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24.005 12.748V1.264A1.003 1.003 0 0 0 23 .262z"/>
    </svg>
  )},
  { name: "Stripe", bg: "#635BFF", icon: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-7.076-2.19l-.893 5.575C4.746 22.754 7.757 24 11.29 24c2.6 0 4.507-.672 5.703-1.793 1.591-1.463 2.394-3.285 2.394-5.612-.015-4.159-2.545-5.812-5.411-7.445z"/>
    </svg>
  )},
];

export const Integrations = () => {
  return (
    <Section id="integrations">
      <motion.div
        variants={bouncyContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
      >
        {/* Heading */}
        <motion.div variants={bouncyItem} className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            <span className="text-gradient">850+</span> Integrations
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted">
            Your agents can talk to the tools you already use. One-click auth,
            zero config — they just work.
          </p>
        </motion.div>

        {/* Logo strip */}
        <motion.div
          variants={bouncyItem}
          className="flex flex-wrap items-center justify-center gap-3 sm:gap-4"
        >
          {INTEGRATIONS.map((integration) => (
            <motion.div
              key={integration.name}
              whileHover={{
                scale: 1.12,
                y: -4,
                transition: { type: "spring", stiffness: 400, damping: 15 },
              }}
              className="group relative"
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-[14px] text-white shadow-lg ring-1 ring-white/10 transition-shadow duration-300 group-hover:shadow-xl sm:h-14 sm:w-14 sm:rounded-2xl"
                style={{ backgroundColor: integration.bg }}
                title={integration.name}
              >
                {typeof integration.icon === "string" ? (
                  <span className="text-lg font-bold sm:text-xl">
                    {integration.icon}
                  </span>
                ) : (
                  integration.icon
                )}
              </div>

              {/* Tooltip */}
              <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-card px-2 py-1 font-mono text-[10px] text-muted opacity-0 ring-1 ring-border transition-opacity duration-200 group-hover:opacity-100">
                {integration.name}
              </div>
            </motion.div>
          ))}

          {/* +850 more */}
          <Link href="/dashboard/integrations" className="group">
            <motion.div
              whileHover={{
                scale: 1.05,
                transition: { type: "spring", stiffness: 400, damping: 15 },
              }}
              className="flex h-12 w-auto items-center gap-1.5 rounded-[14px] border border-border bg-card/80 px-4 font-mono text-sm text-muted transition-colors duration-300 hover:border-brand/30 hover:text-brand-light sm:h-14 sm:rounded-2xl sm:px-5 sm:text-base"
            >
              +850 more
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </motion.div>
          </Link>
        </motion.div>
      </motion.div>
    </Section>
  );
};
