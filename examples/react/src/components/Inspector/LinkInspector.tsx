import { useJunction } from "@priemskiyyy/junction-react";
import { MagnifyingGlass, PaperPlaneTilt } from "@phosphor-icons/react";
import clsx from "clsx";
import type React from "react";
import { useId, useState } from "react";

import {
  INSPECTED_URL,
  INSPECTOR_PRESETS,
} from "example-shared/lab/constants/inspectorPresets";
import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { CARD_CLASS_NAME } from "example-shared/ui/styles/cardStyles";
import { FIELD_LABEL_CLASS_NAME } from "example-shared/ui/styles/fieldStyles";
import { PanelHeading } from "src/components/Common/PanelHeading";
import { InspectionResult } from "src/components/Inspector/InspectionResult";
import { useLab } from "src/hooks/useLab";

export const LinkInspector: React.FunctionComponent = () => {
  const lab = useLab();
  const junction = useJunction();
  const inputId = useId();
  const [url, setUrl] = useState(INSPECTED_URL);
  const inspection = junction.inspect("links", { url });

  return (
    <section
      aria-labelledby="inspector-title"
      className={clsx("grid gap-5 p-4 lg:grid-cols-2", CARD_CLASS_NAME)}
    >
      <div className="flex min-w-0 flex-col gap-3">
        <PanelHeading
          id="inspector-title"
          icon={MagnifyingGlass}
          title="Ask Junction about a link"
          shows="junction.inspect(): what a link would become, or why nothing would. It admits nothing and works before start()."
        />
        <label htmlFor={inputId} className={FIELD_LABEL_CLASS_NAME}>
          Link
        </label>
        <input
          id={inputId}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          spellCheck={false}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm focus-visible:outline-2 focus-visible:outline-violet-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
        <div className="flex flex-wrap gap-1.5">
          {INSPECTOR_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              aria-pressed={preset.url === url}
              onClick={() => setUrl(preset.url)}
              className={buttonStyles({
                pressed: preset.url === url,
                size: "tiny",
              })}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <div aria-live="polite">
          <InspectionResult inspection={inspection} />
        </div>
        <button
          type="button"
          onClick={() => lab.openLink(url)}
          className={clsx(
            buttonStyles({ variant: "primary", size: "small" }),
            "self-start",
          )}
        >
          <PaperPlaneTilt aria-hidden="true" size={14} weight="bold" />
          Open it on the phone
        </button>
      </div>
    </section>
  );
};
