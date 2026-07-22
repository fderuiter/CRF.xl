const JSDOMEnvironment = require('jest-environment-jsdom').default || require('jest-environment-jsdom');

class CustomJSDOMEnvironment extends JSDOMEnvironment {
  constructor(config, context) {
    super(config, context);
  }

  async setup() {
    await super.setup();
    // Expose Node 20+ native web globals into the JSDOM sandbox
    this.global.fetch = fetch;
    this.global.Headers = Headers;
    this.global.Request = Request;
    this.global.Response = Response;
  }

  async teardown() {
    if (this.global) {
      if (typeof this.global.Event === 'function' && typeof this.global.dispatchEvent === 'function') {
        const unloadEvent = new this.global.Event('unload');
        this.global.dispatchEvent(unloadEvent);
      }
      delete this.global.fetch;
      delete this.global.Headers;
      delete this.global.Request;
      delete this.global.Response;
    }
    await super.teardown();
  }
}

module.exports = CustomJSDOMEnvironment;
