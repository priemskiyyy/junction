import type { IntentOutcome } from "src/types/IntentOutcome";

/**
 * A consumer's handler: the validated payload first, the execution second. A
 * normal return acknowledges; an outcome from the execution rejects or
 * retries; a throw fails the attempt.
 *
 * @example
 * ```ts
 * const handleAnnouncement: IntentHandler<{ announcementId: string }, unknown> = ({ announcementId }) => {
 *   announcements.open(announcementId);
 * };
 * ```
 */
export type IntentHandler<TPayload, TExecution> = (
  payload: TPayload,
  execution: TExecution,
) => void | IntentOutcome | Promise<void | IntentOutcome>;
