import { JunctionProvider } from "@priemskiyyy/junction-react";
import type React from "react";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { IntentLab } from "example-shared/lab/types/IntentLab";
import { BreakScreen } from "src/components/Break/BreakScreen";
import { AnswerToast } from "src/components/Chrome/AnswerToast";
import { AppHeader } from "src/components/Chrome/AppHeader";
import { TabBar } from "src/components/Chrome/TabBar";
import { InboxScreen } from "src/components/Inbox/InboxScreen";
import { TimelineScreen } from "src/components/Timeline/TimelineScreen";
import { TryScreen } from "src/components/Try/TryScreen";
import { LabContext } from "src/context/LabContext";
import { useObservable } from "src/hooks/useObservable";
import type { TabId } from "src/types/TabId";
import { COLORS } from "src/utils/constants/colors";
import { TAB_BAR_HEIGHT } from "src/utils/constants/layout";
import { TABS } from "src/utils/constants/tabs";

type ApplicationProps = { lab: IntentLab };

const SCREENS = {
  try: TryScreen,
  inbox: InboxScreen,
  timeline: TimelineScreen,
  break: BreakScreen,
} satisfies Record<TabId, React.FunctionComponent>;

export const Application: React.FunctionComponent<ApplicationProps> = ({
  lab,
}) => {
  const runtime = useObservable(lab.runtime);
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabId>("try");

  return (
    <LabContext.Provider value={lab}>
      <JunctionProvider junction={runtime.junction}>
        <View style={styles.app}>
          <AppHeader />
          <View style={styles.screens}>
            {TABS.map(({ id }) => {
              const Screen = SCREENS[id];

              // Hidden, never unmounted: Folio's consumers keep owning their intents on every tab.
              return (
                <View
                  key={id}
                  style={[styles.screen, id === tab ? null : styles.hidden]}
                >
                  <Screen />
                </View>
              );
            })}
          </View>
          <AnswerToast
            bottom={TAB_BAR_HEIGHT + Math.max(insets.bottom, 8) + 8}
          />
          <TabBar tab={tab} onChange={setTab} />
        </View>
      </JunctionProvider>
    </LabContext.Provider>
  );
};

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: COLORS.background },
  screens: { flex: 1 },
  screen: { flex: 1 },
  hidden: { display: "none" },
});
