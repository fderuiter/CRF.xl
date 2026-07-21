/**
 * @issue #387
 */

import { InteractionRequiredAuthError, PublicClientApplication } from "@azure/msal-browser";
import { Client } from "@microsoft/microsoft-graph-client";

export interface IAuthProvider {
  initialize(): Promise<void>;
  getAllAccounts(): any[];
  loginPopup(request: any): Promise<any>;
  acquireTokenSilent(request: any): Promise<any>;
  acquireTokenPopup(request: any): Promise<any>;
}

export interface IGraphRequest {
  expand(value: string): IGraphRequest;
  top(value: number): IGraphRequest;
  get(): Promise<any>;
  post(body: any): Promise<any>;
  patch(body: any): Promise<any>;
}

export interface IGraphProvider {
  api(path: string): IGraphRequest;
}

export class MockAuthProvider implements IAuthProvider {
  private accounts: any[] = [];

  public simulateLoginState(loggedIn: boolean) {
    if (loggedIn) {
      this.accounts = [
        { homeAccountId: "mock-id", name: "Mock User", username: "mock@example.com" },
      ];
    } else {
      this.accounts = [];
    }
  }

  async initialize(): Promise<void> {
    // Initial state: not logged in by default
  }

  getAllAccounts(): any[] {
    return this.accounts;
  }

  async loginPopup(_request: any): Promise<any> {
    this.simulateLoginState(true);
    return { account: this.accounts[0] };
  }

  async acquireTokenSilent(_request: any): Promise<any> {
    if (this.accounts.length === 0) {
      throw new InteractionRequiredAuthError("Mock interaction required");
    }
    return { accessToken: "mock-access-token" };
  }

  async acquireTokenPopup(_request: any): Promise<any> {
    this.simulateLoginState(true);
    return { accessToken: "mock-access-token" };
  }
}

export class MockGraphProvider implements IGraphProvider {
  public mockData: any = {
    driveItem: {
      id: "mock-drive-item-id",
      parentReference: {
        driveId: "mock-drive-id",
        siteId: "mock-site-id",
      },
    },
    list: {
      id: "mock-list-id",
      list: {
        enableVersioning: false,
        requireCheckout: true,
      },
    },
    columns: {
      value: [],
    },
    permissions: [{ id: "mock-permission" }],
  };

  api(path: string): IGraphRequest {
    const wrap = (): IGraphRequest => ({
      expand: () => wrap(),
      top: () => wrap(),
      get: async () => {
        if (path.includes("driveItem")) return this.mockData.driveItem;
        if (path.includes("/list")) {
          if (path.includes("/lists/")) return undefined;
          return this.mockData.list;
        }
        if (path.includes("/columns")) return this.mockData.columns;
        if (path.includes("/permissions")) return this.mockData.permissions;
        return {};
      },
      post: async (body: any) => {
        if (path.includes("/columns")) {
          this.mockData.columns.value.push({ name: body.name });
          return {};
        }
        return {};
      },
      patch: async (body: any) => {
        if (path.includes("/lists/")) {
          if (body.list) {
            this.mockData.list.list = { ...this.mockData.list.list, ...body.list };
          }
          return {};
        }
        if (path.includes("listItem/fields")) {
          return {};
        }
        return {};
      },
    });
    return wrap();
  }
}

export class MSALAuthProvider implements IAuthProvider {
  constructor(private pca: PublicClientApplication) {}

  async initialize(): Promise<void> {
    await this.pca.initialize();
  }

  getAllAccounts(): any[] {
    return this.pca.getAllAccounts();
  }

  async loginPopup(request: any): Promise<any> {
    return await this.pca.loginPopup(request);
  }

  async acquireTokenSilent(request: any): Promise<any> {
    return await this.pca.acquireTokenSilent(request);
  }

  async acquireTokenPopup(request: any): Promise<any> {
    return await this.pca.acquireTokenPopup(request);
  }
}

export class MSGraphProvider implements IGraphProvider {
  constructor(private client: Client) {}

  api(path: string): IGraphRequest {
    const req = this.client.api(path);
    const wrap = (r: any): IGraphRequest => ({
      expand: (val: string) => wrap(r.expand(val)),
      top: (val: number) => wrap(r.top(val)),
      get: () => r.get(),
      post: (body: any) => r.post(body),
      patch: (body: any) => r.patch(body),
    });
    return wrap(req);
  }
}
