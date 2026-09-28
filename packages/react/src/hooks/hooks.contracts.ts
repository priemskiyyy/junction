import { intent, Junction } from "@priemskiyyy/junction";
import type { Intents, SourceStatus, Sources } from "@priemskiyyy/junction";
import { expectTypeOf } from "vitest";
import { z } from "zod";

import type { JunctionProviderProps } from "src/context/JunctionProvider";
import type { createJunction } from "src/hooks/junction.fixture";
import { useInbox } from "src/hooks/useInbox";
import { useIntent } from "src/hooks/useIntent";
import { useJunction } from "src/hooks/useJunction";
import { useSourceStatus } from "src/hooks/useSourceStatus";
import type {
  RegisteredExecution,
  RegisteredInboxEntry,
  RegisteredIntentName,
  RegisteredJunction,
  RegisteredPayload,
  RegisteredSourceName,
} from "src/types/Register";

const other = new Junction({
  intents: { showBanner: intent(z.object({ bannerId: z.string() })) },
});

// The binding's tests register their Junction, so every export is typed by it.
expectTypeOf<RegisteredJunction>().toEqualTypeOf<
  ReturnType<typeof createJunction>["junction"]
>();
expectTypeOf<RegisteredIntentName>().toEqualTypeOf<
  "openDocument" | "showAnnouncement"
>();
expectTypeOf<RegisteredSourceName>().toEqualTypeOf<"links">();
expectTypeOf<RegisteredPayload<"showAnnouncement">>().toEqualTypeOf<{
  announcementId: string;
}>();
expectTypeOf<RegisteredExecution<"openDocument">["account"]>().toEqualTypeOf<{
  id: string;
}>();
expectTypeOf<
  RegisteredExecution<"showAnnouncement">["account"]
>().toEqualTypeOf<null>();

// @ts-expect-error The provider refuses a Junction other than the registered one.
export const unregistered: JunctionProviderProps["junction"] = other;

// @ts-expect-error The provider publishes a Junction.
export const withoutJunction: JunctionProviderProps = { children: null };

// Unregistered, the provider takes the untyped Junction, which no typed Junction is, so registration cannot be forgotten.
expectTypeOf(other).not.toExtend<Junction<Intents, Sources>>();

export const useTypeContracts = () => {
  expectTypeOf(useJunction()).toEqualTypeOf<RegisteredJunction>();
  expectTypeOf(useInbox()).toEqualTypeOf<RegisteredInboxEntry[]>();
  expectTypeOf(useInbox((inbox) => inbox.length)).toEqualTypeOf<number>();
  expectTypeOf(useSourceStatus("links")).toEqualTypeOf<SourceStatus>();

  expectTypeOf(
    useIntent(
      "openDocument",
      async ({ documentId }, { account, signal, commit }) => {
        expectTypeOf(documentId).toEqualTypeOf<string>();
        expectTypeOf(account).toEqualTypeOf<{ id: string }>();
        expectTypeOf(signal).toEqualTypeOf<AbortSignal>();

        return commit(() => {});
      },
      {
        match: ({ workspaceId }) => workspaceId === "workspace-7",
        ready: true,
        scope: "workspace-7",
      },
    ),
  ).toEqualTypeOf<void>();

  useIntent("showAnnouncement", ({ announcementId }, { account, reject }) => {
    expectTypeOf(announcementId).toEqualTypeOf<string>();
    expectTypeOf(account).toEqualTypeOf<null>();

    return reject("dismissed");
  });

  // @ts-expect-error An undeclared intent.
  useIntent("openInvoice", () => {});

  // @ts-expect-error A handler returns an outcome or nothing, never data.
  useIntent("showAnnouncement", () => "done");

  useIntent("showAnnouncement", () => {}, {
    // @ts-expect-error A matcher reads its own intent's payload.
    match: ({ documentId }) => documentId === "document-42",
  });

  // @ts-expect-error An undeclared source.
  useSourceStatus("notifications");

  // @ts-expect-error A selector reads the inbox.
  useInbox((inbox: number) => inbox);
};
