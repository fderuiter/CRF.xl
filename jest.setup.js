const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.Response = class Response {
  constructor(body, init) {
    this.body = body;
    this.status = init?.status || 200;
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = new Headers(init?.headers);
  }
  json() { return Promise.resolve(typeof this.body === 'string' ? JSON.parse(this.body) : this.body); }
};
global.Headers = class Headers {
  constructor(init) { this.map = new Map(Object.entries(init || {})); }
  get(key) { return this.map.get(key) || null; }
  set(key, val) { this.map.set(key, val); }
};
global.fetch = jest.fn();

// Clear sessionStorage between tests
