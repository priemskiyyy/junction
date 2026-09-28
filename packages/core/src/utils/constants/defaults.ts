/** How long an accepted intent may wait by default, in milliseconds: ten minutes. */
export const DEFAULT_EXPIRY = 600_000;

/** How many attempts an intent may take unless its definition says otherwise. */
export const DEFAULT_ATTEMPTS = 3;

/** The most attempts one definition may allow. */
export const MAX_ATTEMPTS = 10;

/** How long `start()` waits for one source's launch read by default, in milliseconds. */
export const DEFAULT_INITIAL_TIMEOUT = 2_000;

/** How long one handler attempt may run by default, in milliseconds. */
export const DEFAULT_EXECUTION_TIMEOUT = 30_000;

/** How long one storage read or write may take by default, in milliseconds. */
export const DEFAULT_STORAGE_TIMEOUT = 10_000;

/** The longest delay `setTimeout` keeps: past 2^31 - 1 milliseconds it fires at once. */
export const MAX_DURATION = 2_147_483_647;
