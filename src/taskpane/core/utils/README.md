# Utils API

This directory contains utility functions.

- `Logger`
- `ZipWriter`
  - `addFile(name, data): Promise<void>`
  - `generate(): Blob`
- `escape-utils`
  - `escapeRegExp(value: string): string`
  - `escapeXml(unsafe: string): string`
  - `escapeHtml(unsafe: string): string`
  - `decodeXml(value: string): string`
