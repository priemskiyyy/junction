/** A scheme followed by `://`: the only URL shape Junction routes. */
export const URL_PREFIX = /^([A-Za-z][A-Za-z0-9+.-]*):\/\//;

/** The characters a host may hold, in either case: ASCII only, so an internationalized host arrives in punycode. */
export const HOST = /^[a-z0-9._-]*$/i;
