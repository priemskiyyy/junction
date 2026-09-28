import type React from "react";
import { match } from "ts-pattern";

import { FolioShell } from "src/components/Folio/FolioShell";
import { SignInScreen } from "src/components/Folio/SignInScreen";
import { SplashScreen } from "src/components/Folio/SplashScreen";
import { WorkspaceScreen } from "src/components/Folio/WorkspaceScreen";
import { useObservable } from "src/hooks/useObservable";
import { useRuntime } from "src/hooks/useRuntime";

// Folio's whole screen follows who is signed in, and nothing else.
export const FolioApp: React.FunctionComponent = () => {
  const { app } = useRuntime();
  const identity = useObservable(app.identity);

  return (
    <FolioShell>
      {match(identity)
        .with({ status: "restoring" }, () => <SplashScreen />)
        .with({ status: "anonymous" }, () => <SignInScreen />)
        .with({ status: "authenticated" }, ({ account }) => (
          <WorkspaceScreen account={account} />
        ))
        .exhaustive()}
    </FolioShell>
  );
};
