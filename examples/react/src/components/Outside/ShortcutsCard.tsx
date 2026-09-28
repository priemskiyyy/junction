import { SquaresFour } from "@phosphor-icons/react";
import type React from "react";

import { SHORTCUTS } from "example-shared/device/constants/shortcuts";
import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { OutsideCard } from "src/components/Outside/OutsideCard";
import { useLab } from "src/hooks/useLab";

export const ShortcutsCard: React.FunctionComponent = () => {
  const lab = useLab();

  return (
    <OutsideCard
      icon={SquaresFour}
      title="Home screen shortcuts"
      source="shortcuts"
      factory="quickActions()"
    >
      <div className="flex flex-wrap gap-2">
        {SHORTCUTS.map((shortcut) => (
          <button
            key={shortcut.action.id}
            type="button"
            aria-label={`Shortcut: ${shortcut.title}`}
            onClick={() => lab.chooseShortcut(shortcut)}
            className={buttonStyles({ size: "small" })}
          >
            {shortcut.title}
          </button>
        ))}
      </div>
    </OutsideCard>
  );
};
