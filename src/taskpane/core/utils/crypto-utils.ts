/**
 * @issue #68
 * Asynchronously generates a SHA-256 hash using the native Web Crypto API or Node crypto in tests.
 * @param input The string or ArrayBuffer to hash.
 * @returns A promise that resolves to the hex-encoded SHA-256 hash.
 */
declare var __non_webpack_require__: any;

export async function sha256Native(input: string | ArrayBuffer): Promise<string> {
  let encoder;
  if (typeof TextEncoder !== "undefined") {
    encoder = new TextEncoder();
  } else {
    // Hide require from Webpack to prevent polyfill warnings
    // @ts-ignore
    const util =
      typeof __non_webpack_require__ !== "undefined"
        ? __non_webpack_require__("util")
        : /* webpackIgnore: true */ require("util");
    encoder = new util.TextEncoder();
  }

  let subtleCrypto;
  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    subtleCrypto = window.crypto.subtle;
  } else {
    // Hide require from Webpack to prevent polyfill warnings
    // @ts-ignore
    const cryptoNode =
      typeof __non_webpack_require__ !== "undefined"
        ? __non_webpack_require__("crypto")
        : /* webpackIgnore: true */ require("crypto");
    subtleCrypto = cryptoNode.webcrypto.subtle;
  }

  let data: BufferSource;
  if (typeof input === "string") {
    data = encoder.encode(input);
  } else {
    data = input as ArrayBuffer;
  }
  const hashBuffer = await subtleCrypto.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
