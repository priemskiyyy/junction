import { Signpost } from "@phosphor-icons/react";
import type React from "react";

export const FolioMark: React.FunctionComponent = () => (
  <span className="flex items-center gap-1.5 font-semibold tracking-tight">
    <span
      aria-hidden="true"
      className="inline-flex size-6 items-center justify-center rounded-md bg-violet-600 text-white"
    >
      <Signpost size={14} weight="bold" />
    </span>
    Folio
  </span>
);
