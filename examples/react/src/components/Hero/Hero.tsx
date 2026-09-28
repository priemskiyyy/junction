import { Flask, LinkSimple } from "@phosphor-icons/react";
import type React from "react";

import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { HeroStep } from "src/components/Hero/HeroStep";
import { scrollToElement } from "src/utils/scrollToElement";

export const Hero: React.FunctionComponent = () => (
  <section
    aria-label="Overview"
    className="grid gap-6 rounded-3xl border border-violet-200 bg-linear-to-br from-violet-50 via-violet-50/70 to-sky-50/60 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center dark:border-violet-900/60 dark:from-violet-950/30 dark:via-zinc-950 dark:to-sky-950/20"
  >
    <div className="flex flex-col gap-4">
      <p className="font-mono text-sm font-semibold tracking-widest text-violet-700 uppercase dark:text-violet-300">
        A Junction demo
      </p>
      <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
        Every entry point lands where it belongs
      </h2>
      <p className="max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-400">
        Folio is a small documents app on a phone inside this page. Links,
        notifications, home screen shortcuts and invite installs reach it from
        outside, through the real Junction adapters over simulated SDKs.
        Junction turns each one into a typed intent, holds it until the screen
        that owns it is mounted and ready, and runs it once.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => scrollToElement("device")}
          className={buttonStyles({ variant: "primary" })}
        >
          <LinkSimple aria-hidden="true" size={16} weight="bold" />
          Tap a link
        </button>
        <button
          type="button"
          onClick={() => scrollToElement("lab")}
          className={buttonStyles({ variant: "ghost" })}
        >
          <Flask aria-hidden="true" size={16} weight="bold" />
          Open the lab
        </button>
      </div>
    </div>
    <ol aria-label="How to use this page" className="flex flex-col gap-2.5">
      <HeroStep
        number={1}
        title="Open something from outside"
        description="Tap a link, press a notification or pick a shortcut, while Folio runs or after it quit."
      />
      <HeroStep
        number={2}
        title="See who takes it, and why it waits"
        description="The inbox names the screen that owns each intent, and what it waits for."
      />
      <HeroStep
        number={3}
        title="Break it"
        description="Switch accounts mid-run, fail storage, restart Folio. The timeline shows what Junction kept true."
      />
    </ol>
  </section>
);
