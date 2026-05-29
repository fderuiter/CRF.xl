/** @jest-environment node */
import fs from "fs";
import path from "path";
import {
  expectedDisplayBlocksDocxPath,
  expectedDisplayBlocksDocxXmlPath,
  expectedDisplayBlocksOdmPath,
  extractDocxDocumentXml,
  parseDisplayBlocksFixture,
} from "./display-blocks.shared";
import { generateDocxBuffer } from "../../src/taskpane/core/generators/docx/docx-builder";
import { generateOdmXml } from "../../src/taskpane/core/generators/cdisc/odm-builder";

describe("Display block export proofing", () => {
  it("drops display blocks from ODM ItemRef and ItemDef generation", async () => {
    const study = await parseDisplayBlocksFixture();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-20T06:18:37.658Z"));
    const xml = await generateOdmXml(study);
    jest.useRealTimers();

    if (process.env.UPDATE_DISPLAY_BLOCK_FIXTURES === "1") {
      fs.writeFileSync(expectedDisplayBlocksOdmPath, xml, "utf-8");
    }

    expect(fs.existsSync(expectedDisplayBlocksOdmPath)).toBe(true);
    expect(xml).toBe(fs.readFileSync(expectedDisplayBlocksOdmPath, "utf-8"));
    expect(xml).not.toContain("Demographics");
    expect(xml).not.toContain("Complete all required fields below.");
    expect(xml).not.toContain('ItemRef ItemOID="IGNORED_BLOCK"');
    expect(xml).not.toContain('ItemDef OID="IGNORED_BLOCK"');
  });

  it("renders display blocks into DOCX without handwriting affordances", async () => {
    const study = await parseDisplayBlocksFixture();
    const buffer = await generateDocxBuffer(study);
    const outputPath = path.join(
      path.dirname(expectedDisplayBlocksDocxPath),
      "actual-display-blocks.docx"
    );
    fs.writeFileSync(outputPath, buffer);

    if (process.env.UPDATE_DISPLAY_BLOCK_FIXTURES === "1") {
      fs.copyFileSync(outputPath, expectedDisplayBlocksDocxPath);
      fs.writeFileSync(
        expectedDisplayBlocksDocxXmlPath,
        extractDocxDocumentXml(outputPath),
        "utf-8"
      );
    }

    expect(fs.existsSync(expectedDisplayBlocksDocxPath)).toBe(true);
    expect(fs.existsSync(expectedDisplayBlocksDocxXmlPath)).toBe(true);

    const xml = extractDocxDocumentXml(outputPath);
    expect(xml).toBe(fs.readFileSync(expectedDisplayBlocksDocxXmlPath, "utf-8").trim());
    expect(xml).toContain("Demographics");
    expect(xml).toContain("Complete all required fields below.");
    expect(xml).not.toContain(
      'Demographics</w:t></w:r><w:r><w:t xml:space="preserve"> ____________________________________'
    );
    expect(xml).not.toContain(
      'Complete all required fields below.</w:t></w:r><w:r><w:t xml:space="preserve"> ____________________________________'
    );

    fs.rmSync(outputPath, { force: true });
  });
});
