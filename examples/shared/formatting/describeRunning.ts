import type { JunctionSnapshot } from "@priemskiyyy/junction";

/** The attempt holding Junction's one execution slot, in the lab's words. */
export const describeRunning = (
  running: JunctionSnapshot["running"],
  getLabel: (intentId: string) => string,
) => {
  if (running === null) {
    return "Nothing: the execution slot is free.";
  }

  if (running.blocked) {
    return `${getLabel(running.intent.id)} holds the slot, past its timeout.`;
  }

  return `${getLabel(running.intent.id)} holds the slot.`;
};
