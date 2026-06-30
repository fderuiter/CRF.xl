if (typeof Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init) {
      this.body = body;
      this.status = init ? init.status || 200 : 200;
      this.headers = new Map(Object.entries(init ? init.headers || {} : {}));
      this.ok = this.status >= 200 && this.status < 300;
    }
    json() {
      return Promise.resolve(JSON.parse(this.body));
    }
  };
}
