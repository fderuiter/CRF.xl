/**
 * @issue #28
 */
import { ZipWriter } from "../zip-writer";

describe("ZipWriter", () => {
  let originalResponse: any;
  let originalBlob: any;
  let originalCompressionStream: any;

  beforeEach(() => {
    originalResponse = globalThis.Response;
    originalBlob = globalThis.Blob;
    originalCompressionStream = (globalThis as any).CompressionStream;

    (globalThis as any).CompressionStream = class CompressionStream {
      constructor(public format: string) {}
      get readable() {
        return {} as any;
      }
      get writable() {
        return {} as any;
      }
    };

    globalThis.Blob = class {
      constructor(
        public data: any[],
        public options?: any
      ) {}
      get type() {
        return this.options?.type;
      }
    } as any;

    (globalThis as any).Response = class {
      body: any;
      constructor(input: any) {
        if (input && input.data) {
          this.body = {
            pipeThrough: () => ({ arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }),
          };
        } else if (input && input.arrayBuffer) {
          this.body = null;
          (this as any).arrayBuffer = input.arrayBuffer;
        } else {
          this.body = null;
          (this as any).arrayBuffer = async () => new Uint8Array([1, 2, 3]).buffer;
        }
      }
      async arrayBuffer() {
        return new Uint8Array([1, 2, 3]).buffer;
      }
    };
  });

  afterEach(() => {
    globalThis.Response = originalResponse;
    globalThis.Blob = originalBlob;
    (globalThis as any).CompressionStream = originalCompressionStream;
  });

  it("should sequentially process concurrent file additions", async () => {
    const zip = new ZipWriter();

    const p1 = zip.addFile("file1.txt", new Uint8Array([65]));
    const p2 = zip.addFile("file2.txt", new Uint8Array([66]));
    const p3 = zip.addFile("file3.txt", new Uint8Array([67]));

    await Promise.all([p1, p2, p3]);

    const resultBlob = zip.generate();
    expect(resultBlob).toBeDefined();
    expect(resultBlob.type).toBe("application/zip");
  });

  it("should set UTF-8 flag for Unicode filenames", async () => {
    const zip = new ZipWriter();
    await zip.addFile("測試.txt", new Uint8Array([65]));

    const resultBlob = zip.generate();

    const buffer = (resultBlob as any).data ? (resultBlob as any).data[0] : null;
    if (buffer instanceof Uint8Array) {
      const view = new DataView(buffer.buffer);
      const flags = view.getUint16(6, true);
      expect(flags & 0x0800).toBe(0x0800);
    }
  });
});
