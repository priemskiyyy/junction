/** A timestamp as a 24-hour clock time with seconds. */
export const formatClockTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("en-GB", { hour12: false });
