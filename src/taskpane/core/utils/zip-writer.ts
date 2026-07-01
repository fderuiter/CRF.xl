/**
 * @issue #28
 */
export class ZipWriter {
  private files: { name: string; data: Uint8Array; compressedData: Uint8Array; crc: number }[] = [];

  async addFile(name: string, data: Uint8Array) {
    if (typeof (window as any).CompressionStream === "undefined") {
      throw new Error("COMPRESSION_NOT_SUPPORTED");
    }
    
    const crcTable = this.getCRCTable();
    let crc = 0 ^ (-1);
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xFF];
    }
    crc = (crc ^ (-1)) >>> 0;

    const stream = new Response(new Blob([data as any])).body!.pipeThrough(new (window as any).CompressionStream("deflate-raw"));
    const compressedBuffer = await new Response(stream).arrayBuffer();
    const compressedData = new Uint8Array(compressedBuffer);
    
    this.files.push({ name, data, compressedData, crc });
  }

  generate(): Blob {
    let outputSize = 0;
    
    const encoder = new TextEncoder();
    for (const file of this.files) {
      const nameBytes = encoder.encode(file.name);
      outputSize += 30 + nameBytes.length; // Local file header
      outputSize += file.compressedData.length; // Data
      outputSize += 46 + nameBytes.length; // Central dir header
    }
    outputSize += 22; // EOCD

    const out = new Uint8Array(outputSize);
    let offset = 0;
    const view = new DataView(out.buffer);

    const centralDirOffsets: number[] = [];
    const encoder2 = new TextEncoder();

    // Write Local File Headers & Data
    for (const file of this.files) {
      centralDirOffsets.push(offset);
      const nameBytes = encoder2.encode(file.name);
      
      view.setUint32(offset, 0x04034b50, true); offset += 4;
      view.setUint16(offset, 20, true); offset += 2;
      view.setUint16(offset, 0, true); offset += 2;
      view.setUint16(offset, 8, true); offset += 2;
      view.setUint16(offset, 0, true); offset += 2;
      view.setUint16(offset, 0, true); offset += 2;
      view.setUint32(offset, file.crc, true); offset += 4;
      view.setUint32(offset, file.compressedData.length, true); offset += 4;
      view.setUint32(offset, file.data.length, true); offset += 4;
      view.setUint16(offset, nameBytes.length, true); offset += 2;
      view.setUint16(offset, 0, true); offset += 2;
      
      out.set(nameBytes, offset); offset += nameBytes.length;
      out.set(file.compressedData, offset); offset += file.compressedData.length;
    }

    const centralDirStart = offset;

    // Write Central Directory Headers
    for (let i = 0; i < this.files.length; i++) {
      const file = this.files[i];
      const nameBytes = encoder2.encode(file.name);

      view.setUint32(offset, 0x02014b50, true); offset += 4;
      view.setUint16(offset, 20, true); offset += 2;
      view.setUint16(offset, 20, true); offset += 2;
      view.setUint16(offset, 0, true); offset += 2;
      view.setUint16(offset, 8, true); offset += 2;
      view.setUint16(offset, 0, true); offset += 2;
      view.setUint16(offset, 0, true); offset += 2;
      view.setUint32(offset, file.crc, true); offset += 4;
      view.setUint32(offset, file.compressedData.length, true); offset += 4;
      view.setUint32(offset, file.data.length, true); offset += 4;
      view.setUint16(offset, nameBytes.length, true); offset += 2;
      view.setUint16(offset, 0, true); offset += 2;
      view.setUint16(offset, 0, true); offset += 2;
      view.setUint16(offset, 0, true); offset += 2;
      view.setUint16(offset, 0, true); offset += 2;
      view.setUint32(offset, 0, true); offset += 4;
      view.setUint32(offset, centralDirOffsets[i], true); offset += 4;
      
      out.set(nameBytes, offset); offset += nameBytes.length;
    }

    const centralDirSize = offset - centralDirStart;

    // Write End of Central Directory
    view.setUint32(offset, 0x06054b50, true); offset += 4;
    view.setUint16(offset, 0, true); offset += 2;
    view.setUint16(offset, 0, true); offset += 2;
    view.setUint16(offset, this.files.length, true); offset += 2;
    view.setUint16(offset, this.files.length, true); offset += 2;
    view.setUint32(offset, centralDirSize, true); offset += 4;
    view.setUint32(offset, centralDirStart, true); offset += 4;
    view.setUint16(offset, 0, true); offset += 2;

    return new Blob([out], { type: "application/zip" });
  }

  private _crcTable?: number[];
  private getCRCTable(): number[] {
    if (this._crcTable) return this._crcTable;
    let c;
    const crcTable = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      crcTable[n] = c;
    }
    this._crcTable = crcTable;
    return crcTable;
  }
}
