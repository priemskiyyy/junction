import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { createIntentLab } from "example-shared/lab/createIntentLab";
import { Application } from "src/Application";
import "src/styles.css";

const root = document.getElementById("root");

if (root === null) {
  throw new Error("The page has no #root element.");
}

// Created once, outside React, so Strict Mode cannot launch a second Folio.
const lab = createIntentLab();

createRoot(root).render(
  <StrictMode>
    <Application lab={lab} />
  </StrictMode>,
);
