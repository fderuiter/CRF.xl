export type ExcelCellValue = string | number | boolean;

export class MockRange {
  constructor(
    private sheet: MockWorksheet,
    private rowStart: number,
    private colStart: number,
    private rowCount: number,
    private colCount: number
  ) {}

  load() {}

  get values(): ExcelCellValue[][] {
    return this.sheet.rows.slice(this.rowStart, this.rowStart + this.rowCount);
  }

  set values(v: ExcelCellValue[][]) {
    for (let i = 0; i < v.length; i++) {
      this.sheet.rows[this.rowStart + i] = v[i];
    }
  }

  clear(_clearType?: string) {}
}

export class MockUsedRange {
  constructor(private sheet: MockWorksheet) {}

  load() {}

  get values(): ExcelCellValue[][] {
    return this.sheet.rows;
  }

  get rowCount(): number {
    return this.sheet.rows.length;
  }

  clear(_clearType?: string) {}
}

export class MockWorksheet {
  public name: string;
  public isNullObject: boolean;
  public protection: { protected: boolean };
  public rows: ExcelCellValue[][];
  private throwOnGetUsedRange?: Error;

  constructor(
    name: string,
    isNullObject: boolean,
    protection: { protected: boolean },
    rows: ExcelCellValue[][]
  ) {
    this.name = name;
    this.isNullObject = isNullObject;
    this.protection = protection;
    this.rows = rows;
  }

  load() {}

  setThrowOnGetUsedRange(error: Error) {
    this.throwOnGetUsedRange = error;
  }

  getUsedRange() {
    if (this.throwOnGetUsedRange) {
      throw this.throwOnGetUsedRange;
    }
    return new MockUsedRange(this);
  }

  getRangeByIndexes(rowStart: number, colStart: number, rowCount: number, colCount: number) {
    return new MockRange(this, rowStart, colStart, rowCount, colCount);
  }
}

export class OfficeMockEnvironment {
  private sheets = new Map<string, MockWorksheet>();
  private namedItems = new Map<string, { isNullObject: boolean; delete: () => void }>();
  private syncError?: Error;

  public get Excel() {
    const self = this;
    const mockContext = {
      workbook: {
        worksheets: {
          getItemOrNullObject: (name: string) => {
            if (self.sheets.has(name)) {
              return self.sheets.get(name)!;
            }
            return {
              isNullObject: true,
              load: () => {},
            };
          },
        },
        names: {
          getItemOrNullObject: (name: string) => {
            if (self.namedItems.has(name)) {
              return self.namedItems.get(name)!;
            }
            return {
              isNullObject: true,
              load: () => {},
              delete: () => {},
            };
          },
          add: (name: string) => {
            self.namedItems.set(name, {
              isNullObject: false,
              delete: () => self.namedItems.delete(name),
            });
          },
        },
      },
      sync: async () => {
        if (self.syncError) {
          throw self.syncError;
        }
      },
    };

    return {
      run: async (fn: (ctx: any) => Promise<unknown>) => fn(mockContext),
    };
  }

  public registerSheet(
    name: string,
    config: {
      isNullObject?: boolean;
      protection?: { protected: boolean };
      rows?: ExcelCellValue[][];
    } = {}
  ) {
    const sheet = new MockWorksheet(
      name,
      config.isNullObject ?? false,
      config.protection ?? { protected: false },
      config.rows ?? []
    );
    this.sheets.set(name, sheet);
    return sheet;
  }

  public registerNamedItem(name: string) {
    this.namedItems.set(name, { isNullObject: false, delete: () => this.namedItems.delete(name) });
  }

  public setSyncError(error: Error) {
    this.syncError = error;
  }

  public reset() {
    this.sheets.clear();
    this.namedItems.clear();
    this.syncError = undefined;
  }
}
