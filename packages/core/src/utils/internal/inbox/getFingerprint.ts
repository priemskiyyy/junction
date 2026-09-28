// cyrb53, a public-domain 53-bit hash: an interaction key's fingerprint stays a few characters however large its payload.
export const getFingerprint = (name: string, text: string) => {
  const value = `${name}\u0000${text}`;

  let first = 0xdeadbeef;
  let second = 0x41c6ce57;

  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);

    first = Math.imul(first ^ unit, 2654435761);
    second = Math.imul(second ^ unit, 1597334677);
  }

  first = Math.imul(first ^ (first >>> 16), 2246822507);
  first ^= Math.imul(second ^ (second >>> 13), 3266489909);
  second = Math.imul(second ^ (second >>> 16), 2246822507);
  second ^= Math.imul(first ^ (first >>> 13), 3266489909);

  return (4294967296 * (2097151 & second) + (first >>> 0)).toString(36);
};
