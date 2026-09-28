/** How many nonterminal intents the inbox holds; an admission past it is refused. */
export const INBOX_CAPACITY = 32;

/** How many UTF-8 bytes of canonical payload the inbox holds across its intents. */
export const INBOX_PAYLOAD_SIZE = 262_144;

/** How many UTF-8 bytes one canonical payload may take. */
export const PAYLOAD_SIZE = 16_384;

/** How many UTF-8 bytes one normalized source input may take. */
export const INPUT_SIZE = 65_536;

/** How many characters one raw URL may have. */
export const URL_LENGTH = 8_192;

/** How deep a payload or a source input may nest. */
export const MAX_DEPTH = 16;

/** How many terminal entries the interaction ledger keeps. */
export const LEDGER_CAPACITY = 1_024;

/** How long the interaction ledger keeps a terminal entry, in milliseconds: one day. */
export const LEDGER_RETENTION = 86_400_000;

/** How many characters an account id, a rejection reason or an interaction key may have. */
export const IDENTIFIER_LENGTH = 160;
