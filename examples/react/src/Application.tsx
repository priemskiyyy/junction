import { JunctionProvider } from "@priemskiyyy/junction-react";
import clsx from "clsx";
import type React from "react";

import type { IntentLab } from "example-shared/lab/types/IntentLab";
import { PAGE_CLASS_NAME } from "example-shared/ui/styles/pageStyles";
import { DevicePhone } from "src/components/Device/DevicePhone";
import { Footer } from "src/components/Footer/Footer";
import { Header } from "src/components/Header/Header";
import { Hero } from "src/components/Hero/Hero";
import { InboxPanel } from "src/components/Inbox/InboxPanel";
import { JunctionViewPanel } from "src/components/Inbox/JunctionViewPanel";
import { LinkInspector } from "src/components/Inspector/LinkInspector";
import { LabPanel } from "src/components/Lab/LabPanel";
import { LatestPanel } from "src/components/Latest/LatestPanel";
import { OccurrencesPanel } from "src/components/Occurrences/OccurrencesPanel";
import { OutsidePanel } from "src/components/Outside/OutsidePanel";
import { Section } from "src/components/Section/Section";
import { TimelinePanel } from "src/components/Timeline/TimelinePanel";
import { LabContext } from "src/context/LabContext";
import { useObservable } from "src/hooks/useObservable";

type ApplicationProps = { lab: IntentLab };

export const Application: React.FunctionComponent<ApplicationProps> = ({
  lab,
}) => {
  const runtime = useObservable(lab.runtime);

  return (
    <LabContext.Provider value={lab}>
      <JunctionProvider junction={runtime.junction}>
        <Header />
        <main className={clsx(PAGE_CLASS_NAME, "flex flex-col gap-16 py-8")}>
          <Hero />
          <Section
            id="device"
            hint="Swipe Folio away to quit it, then tap the Brand brief link in Messages. Folio launches from the link, the intent waits for someone to sign in, and signing in as Ada opens the document."
          >
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem_minmax(0,1fr)]">
              <OutsidePanel />
              <DevicePhone />
              <LatestPanel />
            </div>
          </Section>
          <Section
            id="inbox"
            hint="Signed in as Ada, turn on Split view and tap Launch plan. Both panes show Design, so both claim it and Junction waits rather than guess. Switch the bottom pane to Finance, and the top pane takes it."
          >
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
              <InboxPanel />
              <JunctionViewPanel />
            </div>
          </Section>
          <Section
            id="door"
            hint="Pick A lookalike host: no route owns it, so it never becomes an intent. Pick An id with a space: the route matches, and the schema refuses the payload."
          >
            <LinkInspector />
          </Section>
          <Section
            id="occurrences"
            hint="Run both experiments. Two taps on one link are two intents. One press the platform hands over twice is one intent, because its identifiers say so."
          >
            <OccurrencesPanel />
          </Section>
          <Section
            id="lab"
            hint="Turn on Slow documents, tap Brand brief as Ada, and switch to Grace while it loads. The attempt is invalidated before it commits, so Grace never sees Ada's document. The intent is interrupted, and Retry in the inbox runs it for Ada alone."
          >
            <div className="grid items-start gap-6 xl:grid-cols-2">
              <LabPanel />
              <TimelinePanel />
            </div>
          </Section>
        </main>
        <Footer />
      </JunctionProvider>
    </LabContext.Provider>
  );
};
