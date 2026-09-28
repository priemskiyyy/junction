import type React from "react";
import { StyleSheet, View } from "react-native";
import { match } from "ts-pattern";

import { Callout } from "src/components/Common/Callout";
import { FolioShell } from "src/components/Folio/FolioShell";
import { RestoringScreen } from "src/components/Folio/RestoringScreen";
import { SignInScreen } from "src/components/Folio/SignInScreen";
import { WorkspaceScreen } from "src/components/Folio/WorkspaceScreen";
import { useObservable } from "src/hooks/useObservable";
import { useRuntime } from "src/hooks/useRuntime";

// Folio's whole screen follows who is signed in, and nothing else.
export const FolioApp: React.FunctionComponent = () => {
  const { app } = useRuntime();
  const identity = useObservable(app.identity);
  const { panes, banner } = useObservable(app.navigation);

  return (
    <FolioShell>
      <View style={styles.app}>
        {banner === null ? null : (
          <View style={styles.banner}>
            <Callout
              tone={banner.tone}
              text={banner.text}
              onDismiss={app.dismissBanner}
            />
          </View>
        )}
        {match(identity)
          .with({ status: "restoring" }, () => <RestoringScreen />)
          .with({ status: "anonymous" }, () => <SignInScreen />)
          .with({ status: "authenticated" }, ({ account }) => {
            const [pane] = panes;

            if (pane === undefined) {
              return null;
            }

            return <WorkspaceScreen account={account} pane={pane} />;
          })
          .exhaustive()}
      </View>
    </FolioShell>
  );
};

const styles = StyleSheet.create({
  app: { flex: 1 },
  banner: { paddingHorizontal: 12, paddingTop: 12 },
});
