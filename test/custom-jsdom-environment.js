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
}

module.exports = CustomJSDOMEnvironment;
