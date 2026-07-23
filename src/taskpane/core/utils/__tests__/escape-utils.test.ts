import { escapeRegExp, escapeXml, escapeHtml, decodeXml } from "../escape-utils";

describe("escape-utils", () => {
  describe("escapeRegExp", () => {
    it("should escape special regular expression characters", () => {
      expect(escapeRegExp("hello.world")).toBe("hello\\.world");
      expect(escapeRegExp("item*")).toBe("item\\*");
      expect(escapeRegExp("price+")).toBe("price\\+");
      expect(escapeRegExp("($100)")).toBe("\\(\\$100\\)");
      expect(escapeRegExp("[abc]")).toBe("\\[abc\\]");
      expect(escapeRegExp("a|b")).toBe("a\\|b");
      expect(escapeRegExp("c?")).toBe("c\\?");
      expect(escapeRegExp("a^b")).toBe("a\\^b");
      expect(escapeRegExp("a{b}c")).toBe("a\\{b\\}c");
    });

    it("should handle empty or null values gracefully", () => {
      expect(escapeRegExp("")).toBe("");
      expect(escapeRegExp(null as any)).toBe("");
    });
  });

  describe("escapeXml", () => {
    it("should strip U+0000 to U+001F control characters except valid XML whitespace", () => {
      // Prohibited: \x00-\x08, \x0B, \x0C, \x0E-\x1F
      // Allowed XML whitespace: \x09 (tab), \x0A (line feed), \x0D (carriage return)
      const input = "Hello\x00World\x09Test\x0ANewline\x0BCarriage\x0DReturn\x1FDone";
      // \x00, \x0B, \x1F should be stripped. \x09, \x0A, \x0D should be preserved.
      expect(escapeXml(input)).toBe("HelloWorld\x09Test\x0ANewlineCarriage\x0DReturnDone");
    });

    it("should escape all 5 standard XML entities", () => {
      const input = "A < B && C > D || E == 'F' || G == \"H\"";
      expect(escapeXml(input)).toBe(
        "A &lt; B &amp;&amp; C &gt; D || E == &apos;F&apos; || G == &quot;H&quot;"
      );
    });

    it("should handle empty values gracefully", () => {
      expect(escapeXml("")).toBe("");
      expect(escapeXml(null as any)).toBe("");
    });
  });

  describe("escapeHtml", () => {
    it("should escape &, <, ' and \" but explicitly leave > unescaped", () => {
      const input = "A < B && C > D || E == 'F' || G == \"H\"";
      // Notice that ' becomes &#039; and > remains unescaped
      expect(escapeHtml(input)).toBe(
        "A &lt; B &amp;&amp; C > D || E == &#039;F&#039; || G == &quot;H&quot;"
      );
    });

    it("should handle empty values gracefully", () => {
      expect(escapeHtml("")).toBe("");
      expect(escapeHtml(null as any)).toBe("");
    });
  });

  describe("decodeXml", () => {
    it("should decode standard entities back to characters in the correct order", () => {
      const input = "A &lt; B &amp;&amp; C &gt; D || E == &apos;F&apos; || G == &quot;H&quot;";
      expect(decodeXml(input)).toBe("A < B && C > D || E == 'F' || G == \"H\"");
    });

    it("should handle empty values gracefully", () => {
      expect(decodeXml("")).toBe("");
      expect(decodeXml(null as any)).toBe("");
    });
  });
});
