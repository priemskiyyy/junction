import { CircleNotch, Signpost } from "@phosphor-icons/react";
import type React from "react";

export const SplashScreen: React.FunctionComponent = () => (
  <div
    role="status"
    className="flex flex-1 flex-col items-center justify-center gap-4 bg-violet-600 text-white"
  >
    <Signpost aria-hidden="true" size={48} weight="duotone" />
    <p className="flex items-center gap-2 text-sm font-medium">
      <CircleNotch
        aria-hidden="true"
        size={14}
        weight="bold"
        className="motion-safe:animate-spin"
      />
      Restoring who is signed in
    </p>
  </div>
);
