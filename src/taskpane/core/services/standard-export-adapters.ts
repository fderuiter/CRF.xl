/**
 * @issue #28
 */
import { generateOdmXml } from "../generators/cdisc/odm-builder";
import { generateDocxBlob } from "../generators/docx/docx-builder";
import { generatePdfBlob } from "../generators/pdf/pdf-builder";
import {
  ExportAdapter,
  ExportAdapterContext,
  ExportAdapterResult,
} from "./compliance-export-service";

export class DocxExportAdapter implements ExportAdapter {
  async generate(context: ExportAdapterContext): Promise<ExportAdapterResult[]> {
    const blob = await generateDocxBlob(context.currentStudy, context.options?.exportOptions);
    const data = await blob.arrayBuffer();
    const rawProtocolId = context.currentStudy.metadata.protocolId || "UNKNOWN";
    const protocolId = rawProtocolId.replace(/[\/\\]/g, "_").replace(/\.\./g, "__");
    return [
      {
        fileName: `${protocolId}_Annotated_CRF.docx`,
        data,
      },
    ];
  }
}

export class PdfExportAdapter implements ExportAdapter {
  async generate(context: ExportAdapterContext): Promise<ExportAdapterResult[]> {
    const blob = await generatePdfBlob(
      context.currentStudy,
      context.validationIssues,
      context.auditSummary,
      context.options?.exportOptions
    );
    const data = await blob.arrayBuffer();
    const rawProtocolId = context.currentStudy.metadata.protocolId || "UNKNOWN";
    const protocolId = rawProtocolId.replace(/[\/\\]/g, "_").replace(/\.\./g, "__");
    return [
      {
        fileName: `${protocolId}_Annotated_CRF.pdf`,
        data,
      },
    ];
  }
}

export class OdmXmlExportAdapter implements ExportAdapter {
  async generate(context: ExportAdapterContext): Promise<ExportAdapterResult[]> {
    const { xml, diagnostics } = await generateOdmXml(context.currentStudy, {
      bestEffort: true,
      exportOptions: context.options?.exportOptions,
    });
    const rawProtocolId = context.currentStudy.metadata.protocolId || "UNKNOWN";
    const protocolId = rawProtocolId.replace(/[\/\\]/g, "_").replace(/\.\./g, "__");
    const results: ExportAdapterResult[] = [
      {
        fileName: `${protocolId}_ODM_Specification.xml`,
        data: await new Blob([xml]).arrayBuffer(),
      },
    ];

    if (diagnostics) {
      results.push({
        fileName: `${protocolId}_ODM_Diagnostics.txt`,
        data: await new Blob([diagnostics]).arrayBuffer(),
      });
    }

    return results;
  }
}
