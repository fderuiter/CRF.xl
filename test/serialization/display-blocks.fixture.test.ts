/** @jest-environment node */
import fs from "fs";
import {
  collectDisplayBlocks,
  collectValidationMessages,
  displayBlocksFixturePath,
  parseDisplayBlocksFixture,
} from "./display-blocks.shared";

describe("Display blocks fixture parsing", () => {
  it("parses heading, instruction, and separator rows as display blocks with source row indexes", async () => {
    expect(fs.existsSync(displayBlocksFixturePath)).toBe(true);

    const study = await parseDisplayBlocksFixture();
    const displayBlocks = collectDisplayBlocks(study);

    expect(displayBlocks).toHaveLength(3);
    expect(displayBlocks).toEqual([
      expect.objectContaining({
        nodeType: "display",
        displayType: "heading",
        content: "Demographics",
        _sourceRowIndex: 2,
      }),
      expect.objectContaining({
        nodeType: "display",
        displayType: "instruction",
        content: "Complete all required fields below.",
        _sourceRowIndex: 3,
      }),
      expect.objectContaining({
        nodeType: "display",
        displayType: "separator",
        content: "",
        _sourceRowIndex: 5,
      }),
    ]);
  });

  it("lets the validator ignore display blocks while still validating real questions", async () => {
    const study = await parseDisplayBlocksFixture();
    const messages = await collectValidationMessages(study);

    expect(messages).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining("Missing Variable Name"),
        expect.stringContaining("Missing Codelist definition"),
        expect.stringContaining("Duplicate Variable Name"),
      ])
    );
    expect(messages).toHaveLength(0);
  });
});
