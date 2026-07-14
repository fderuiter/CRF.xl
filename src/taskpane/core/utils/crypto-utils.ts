/**
 * @issue #352
 * Asynchronously generates a SHA-256 hash using the native Web Crypto API or Node crypto in tests.
 * @param input The string or ArrayBuffer to hash.
 * @returns A promise that resolves to the hex-encoded SHA-256 hash.
 */
export async function sha256Native(input: string | ArrayBuffer): Promise<string> {
  let encoder;
  if (typeof TextEncoder !== "undefined") {
    encoder = new TextEncoder();
  } else {
    const util = require("util");
    encoder = new util.TextEncoder();
  }

  let subtleCrypto;
  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    subtleCrypto = window.crypto.subtle;
  } else {
    const crypto = require("crypto");
    subtleCrypto = crypto.webcrypto.subtle;
  }

  let data: BufferSource;
  if (typeof input === "string") {
    data = encoder.encode(input);
  } else {
    data = input;
  }
  const hashBuffer = await subtleCrypto.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
