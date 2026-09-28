import type React from "react";

import type { Tone } from "example-shared/types/Tone";
import { monogramStyles } from "example-shared/ui/styles/monogramStyles";

type MonogramProps = {
  text: string;
  tone: Tone;
  shape?: "round" | "tile" | "small";
};

export const Monogram: React.FunctionComponent<MonogramProps> = ({
  text,
  tone,
  shape = "tile",
}) => (
  <span aria-hidden="true" className={monogramStyles({ tone, shape })}>
    {text}
  </span>
);
