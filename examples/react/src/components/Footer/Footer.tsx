import type React from "react";

export const Footer: React.FunctionComponent = () => (
  <footer className="border-t border-zinc-200/70 dark:border-zinc-800">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-8 text-sm text-zinc-500 sm:px-6">
      <span>
        The phone, its SDKs, Folio&apos;s server and its storage all run inside
        this page. The adapters are the published Junction packages.
      </span>
      <a
        href="https://github.com/priemskiyyy/junction"
        className="underline-offset-2 hover:underline sm:ml-auto"
      >
        Junction on GitHub
      </a>
    </div>
  </footer>
);
