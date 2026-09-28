import type React from "react";

import { ExperimentCard } from "src/components/Occurrences/ExperimentCard";

export const OccurrencesPanel: React.FunctionComponent = () => (
  <div className="grid gap-4 md:grid-cols-2">
    <ExperimentCard id="tap-twice" />
    <ExperimentCard id="delivered-twice" />
  </div>
);
