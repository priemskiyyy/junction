import { registerRootComponent } from "expo";
import type React from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { createIntentLab } from "example-shared/lab/createIntentLab";
import { Application } from "src/Application";
import { createDeviceLinking } from "src/utils/linking/createDeviceLinking";

// Created once, outside React, so a rerender can never launch a second Folio. On the web the page's URL belongs to the router, so links stay simulated there.
const lab = createIntentLab({
  linking: Platform.select({ web: null, default: createDeviceLinking() }),
});

const Root: React.FunctionComponent = () => (
  <SafeAreaProvider>
    <Application lab={lab} />
  </SafeAreaProvider>
);

registerRootComponent(Root);
