declare const __non_webpack_require__: ((id: string) => any) | undefined;

/**
 * @issue #68
 * Asynchronously generates a SHA-256 hash using the native Web Crypto API or Node crypto in tests.
 * @param input The string or ArrayBuffer to hash.
 * @returns A promise that resolves to the hex-encoded SHA-256 hash.
 */
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
        : typeof require !== "undefined"
          ? /* webpackIgnore: true */ require("util")
          : null;
    if (util) {
      encoder = new util.TextEncoder();
    }
  }

  let subtleCrypto;
  if (typeof globalThis !== "undefined" && globalThis.crypto && globalThis.crypto.subtle) {
    subtleCrypto = globalThis.crypto.subtle;
  } else if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    subtleCrypto = window.crypto.subtle;
  } else if (typeof self !== "undefined" && self.crypto && self.crypto.subtle) {
    subtleCrypto = self.crypto.subtle;
  } else {
    // Hide require from Webpack to prevent polyfill warnings
    // @ts-ignore
    const cryptoNode =
      typeof __non_webpack_require__ !== "undefined"
        ? __non_webpack_require__("crypto")
        : typeof require !== "undefined"
          ? /* webpackIgnore: true */ require("crypto")
          : null;

    if (cryptoNode) {
      if (cryptoNode.webcrypto && cryptoNode.webcrypto.subtle) {
        subtleCrypto = cryptoNode.webcrypto.subtle;
      } else {
        // Fallback for Node environments without webcrypto (e.g. older Jest JSDOM)
        const hash = cryptoNode.createHash("sha256");
        hash.update(typeof input === "string" ? input : Buffer.from(input));
        return hash.digest("hex");
      }
    }
  }

  if (!subtleCrypto) {
    throw new Error("No crypto implementation available in this environment.");
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
