/** The lab's switches, which stay on until turned off. */
export type SwitchKnobId = "slow" | "offline" | "failing-writes" | "race";

/** The lab's actions, which run once. */
export type ActionKnobId = "restart" | "corrupt" | "skip-ahead";

/** Every way the lab can break Folio's world. */
export type KnobId = SwitchKnobId | ActionKnobId;
