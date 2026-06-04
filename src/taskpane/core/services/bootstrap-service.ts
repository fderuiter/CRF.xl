/**
 * @issue #28
 */
import { CRF_VARIABLE_TYPE_OPTIONS } from "../parser/form-element-utils";
import { DATA_ORIGIN_OPTIONS } from "../parser/metadata-utils";
import { getLocaleConfig } from "../locale-config";
import { syncRegistryInternal } from "../parser/template-generator";

export class BootstrapService {
  private static isBootstrapping = false;
  private static bootstrappingPromise: Promise<void> | null = null;
  private static pendingForceNew = false;

  /**
   * Main entry point for workbook scaffolding.
   * @param forceNew If true, overwrites existing system sheets with blank templates. If false (Safe-Initialization), only creates missing sheets and doesn't overwrite existing ones.
   */
  public static async bootstrap(forceNew: boolean = false): Promise<void> {
    if (this.isBootstrapping) {
      if (forceNew) {
        this.pendingForceNew = true;
        await this.bootstrappingPromise;
      } else {
        await this.bootstrappingPromise;
        return;
      }
    }

    // Re-check isBootstrapping after await - another caller may have started a new bootstrap
    if (this.isBootstrapping) {
      if (this.pendingForceNew) {
        // Another forceNew is already pending or running
        await this.bootstrappingPromise;
        return;
      }
      if (forceNew) {
        this.pendingForceNew = true;
      }
      await this.bootstrappingPromise;
      return;
    }

    // Check if a forceNew request came in while we were waiting
    if (this.pendingForceNew) {
      forceNew = true;
      this.pendingForceNew = false;
    }

    this.isBootstrapping = true;
    this.bootstrappingPromise = this.executeBootstrap(forceNew);

    try {
      await this.bootstrappingPromise;
    } finally {
      this.isBootstrapping = false;
      this.bootstrappingPromise = null;
    }
  }

  private static async executeBootstrap(forceNew: boolean): Promise<void> {
    await Excel.run(async (context) => {
      const sheets = context.workbook.worksheets;

      // Ensure clean slate
      const existingNames = context.workbook.names;
      existingNames.load("items");
      await context.sync();

      const locale = getLocaleConfig().currentLocale;

      // System Control Sheets Definition
      const controlConfigs = [
        {
          name: "_Study",
          headers: ["Protocol ID", "Study Name", "Version", "Default Language"],
          data: forceNew ? [["PROT-001", "Matrix Clinical Trial", "1.0", locale]] : [],
        },
        {
          name: "_Forms",
          headers: ["Form OID", "Form Name", "Repeating", "Page Layout"],
          data: forceNew ? [
            ["DEMO", "Demographics", "No", "Portrait"],
            ["VS", "Vital Signs", "Yes", "Portrait"],
          ] : [],
        },
        {
          name: "_Schedule",
          headers: ["Form OID", "Visit 1 (Day 0)", "Visit 2 (Day 14)", "Visit 3 (Day 28)"],
          data: [],
        },
        {
          name: "_Codelists",
          headers: ["Codelist ID", "Codelist Name", "Coded Value", "Decode"],
          data: forceNew ? [
            ["GENDER", "Gender", "M", "Male"],
            ["GENDER", "Gender", "F", "Female"],
          ] : [],
        },
        {
          name: "_Methods",
          headers: ["Method OID", "Name", "Type", "Description", "Expression", "Referenced Variables"],
          data: forceNew ? [
            [
              "M_DERIVED_BMI",
              "BMI Derivation",
              "Computation",
              "Body Mass Index",
              "[WEIGHT] / ([HEIGHT]/100)^2",
              "WEIGHT, HEIGHT",
            ],
          ] : [],
        },
      ];

      let createdAny = false;

      for (const config of controlConfigs) {
        let sheet = sheets.getItemOrNullObject(config.name);
        await context.sync();

        const isNew = sheet.isNullObject;
        if (isNew) {
          sheet = sheets.add(config.name);
          createdAny = true;
        } else if (forceNew) {
          const usedRange = sheet.getUsedRangeOrNullObject();
          await context.sync();
          if (!usedRange.isNullObject) {
            usedRange.clear();
          }
        }

        if (isNew || forceNew) {
          // Apply Headers (System sheets are Slate 900)
          const headerRange = sheet.getRangeByIndexes(0, 0, 1, config.headers.length);
          headerRange.values = [config.headers];
          headerRange.format.fill.color = "#1e293b";
          headerRange.format.font.color = "white";
          headerRange.format.font.bold = true;

          if (config.data && config.data.length > 0) {
            const dataRange = sheet.getRangeByIndexes(1, 0, config.data.length, config.headers.length);
            dataRange.values = config.data;
          }

          headerRange.format.autofitColumns();
          sheet.freezePanes.freezeRows(1);
        }
      }

      // Add CodelistDictionary named range if it doesn't exist
      const hasDictionary = existingNames.items.some(n => n.name === "CodelistDictionary");
      if (!hasDictionary || forceNew) {
        if (forceNew && hasDictionary) {
          context.workbook.names.getItem("CodelistDictionary").delete();
        }
        const clSheet = sheets.getItem("_Codelists");
        context.workbook.names.add("CodelistDictionary", clSheet.getRange("A2:A10000"));
      }

      await context.sync();

      if (forceNew) {
        // Auto-trigger the Warp Engine to generate the initial DEMO and VS sheets
        await syncRegistryInternal(context);
      }
    });
  }

  /**
   * Prepares a form sheet with standard formatting and validation.
   */
  public static async bootstrapFormSheet(context: Excel.RequestContext, sheetName: string): Promise<Excel.Worksheet> {
    const sheets = context.workbook.worksheets;
    let crfSheet = sheets.getItemOrNullObject(sheetName);
    await context.sync();

    if (crfSheet.isNullObject) {
      crfSheet = sheets.add(sheetName);
    }

    // Always layout Authoring Interface to ensure standard headers, but don't overwrite data
    const navRange = crfSheet.getRange("A1");
    navRange.values = [["[ ← Back to Registry ]"]];
    navRange.format.font.color = "#2563eb";
    navRange.format.font.bold = true;
    navRange.hyperlink = { textToDisplay: "[ ← Back to Registry ]", address: "#'_Forms'!A1" };

    const headers = [
      "Variable Name",
      "Label",
      "Variable Type",
      "Required",
      "Length",
      "Significant Digits",
      "Minimum",
      "Maximum",
      "Show If",
      "Codelist ID",
      "Origin",
      "Method OID",
      "SDTM Domain",
      "SDTM Variable",
      "Comment",
    ];
    const headerRange = crfSheet.getRangeByIndexes(1, 0, 1, headers.length);
    headerRange.values = [headers];
    headerRange.format.fill.color = "#2563eb"; // Blue 600 for Authoring
    headerRange.format.font.color = "white";
    headerRange.format.font.bold = true;

    // Apply Contextual Data Validations
    crfSheet.getRange("C3:C1000").dataValidation.rule = {
      list: {
        inCellDropDown: true,
        source: CRF_VARIABLE_TYPE_OPTIONS.join(","),
      },
    };
    crfSheet.getRange("D3:D1000").dataValidation.rule = {
      list: { inCellDropDown: true, source: "Yes,No" },
    };
    crfSheet.getRange("J3:J1000").dataValidation.rule = {
      list: { inCellDropDown: true, source: "=CodelistDictionary" },
    };
    crfSheet.getRange("K3:K1000").dataValidation.rule = {
      list: {
        inCellDropDown: true,
        source: DATA_ORIGIN_OPTIONS.join(","),
      },
    };

    headerRange.format.autofitColumns();
    crfSheet.freezePanes.freezeRows(2);
    
    return crfSheet;
  }
}
