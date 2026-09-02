import { AxiosError } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const setToken = vi.fn<(token: string) => void>();
  const userStore = { token: "", setToken };
  setToken.mockImplementation(token => {
    userStore.token = token;
  });

  return {
    axiosCanceler: {
      addPending: vi.fn(),
      clearPending: vi.fn(),
      removeAllPending: vi.fn()
    },
    checkStatus: vi.fn(),
    hideLoading: vi.fn(),
    messageError: vi.fn(),
    mittEmit: vi.fn(),
    routerReplace: vi.fn(),
    showLoading: vi.fn(),
    userStore
  };
});

vi.mock("element-plus", () => ({
  ElMessage: { error: mocks.messageError }
}));
vi.mock("@/components/Loading/fullScreen", () => ({
  showFullScreenLoading: mocks.showLoading,
  tryHideFullScreenLoading: mocks.hideLoading
}));
vi.mock("@/config", () => ({ LOGIN_URL: "/login" }));
vi.mock("@/enums/httpEnum", () => ({
  ResultEnum: { OVERDUE: 401, SUCCESS: 200, TIMEOUT: 10000 }
}));
vi.mock("@/routers", () => ({ default: { replace: mocks.routerReplace } }));
vi.mock("@/stores/modules/user", () => ({
  useUserStore: () => mocks.userStore
}));
vi.mock("@/utils/mittBus", () => ({ default: { emit: mocks.mittEmit } }));
vi.mock("@/api/helper/axiosCancel", () => ({
  axiosCanceler: mocks.axiosCanceler
}));
vi.mock("@/api/helper/checkStatus", () => ({ checkStatus: mocks.checkStatus }));

import http, { RequestHttp } from "@/api";

const csrfResponse = {
  headerName: "X-XSRF-TOKEN",
  parameterName: "_csrf",
  token: "csrf-token-from-cookie"
};

const responseFor = (config: any, data: unknown, status = 200) => ({
  config,
  data,
  headers: {},
  status,
  statusText: status === 200 ? "OK" : "Unauthorized"
});

const rejectedResponseFor = (config: any, data: unknown, status = 401) =>
  Promise.reject(new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, responseFor(config, data, status)));

describe("認證生命週期 HTTP client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userStore.token = "";
    vi.stubGlobal("window", { navigator: { onLine: true } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("應集中啟用 Axios 原生 XSRF 設定", () => {
    expect(http.service.defaults.withCredentials).toBe(true);
    expect(http.service.defaults.xsrfCookieName).toBe("XSRF-TOKEN");
    expect(http.service.defaults.xsrfHeaderName).toBe("X-XSRF-TOKEN");
    expect(http.service.defaults.withXSRFToken).toBe(true);
  });

  it("同時初始化多個 CSRF 請求時只送出一次初始化請求", async () => {
    const adapter = vi.fn(async (config: any) => responseFor(config, csrfResponse));
    const instance = new RequestHttp({
      adapter,
      baseURL: "https://api.example.test"
    });

    const [first, second] = await Promise.all([instance.getCsrfToken(), instance.getCsrfToken()]);

    expect(adapter).toHaveBeenCalledTimes(1);
    expect(first).toEqual(csrfResponse);
    expect(second).toEqual(csrfResponse);
  });

  it("Refresh 只確保 CSRF Cookie 已初始化，不再手動覆寫 XSRF Header", async () => {
    let refreshConfig: any;
    const adapter = vi.fn(async (config: any) => {
      if (config.url?.endsWith("/csrf")) {
        return responseFor(config, csrfResponse);
      }

      if (config.url?.endsWith("/admin/refresh")) {
        refreshConfig = config;
        return responseFor(config, {
          accessToken: "refreshed-access",
          tokenType: "Bearer",
          expiresIn: 1800
        });
      }

      throw new Error(`未預期的請求：${config.url}`);
    });
    const instance = new RequestHttp({
      adapter,
      baseURL: "https://api.example.test",
      withCredentials: true,
      withXSRFToken: true,
      xsrfCookieName: "XSRF-TOKEN",
      xsrfHeaderName: "X-XSRF-TOKEN"
    });

    await expect(instance.restoreAdminSession()).resolves.toBe(true);

    expect(refreshConfig.headers.get("X-XSRF-TOKEN")).not.toBe(csrfResponse.token);
    expect(mocks.userStore.setToken).toHaveBeenCalledWith("refreshed-access");
  });

  it("登出期間遇到 401 時不得再次觸發自動 Refresh", async () => {
    const adapter = vi.fn((config: any) => rejectedResponseFor(config, { code: "AUTHENTICATION_REQUIRED" }));
    const instance = new RequestHttp({
      adapter,
      baseURL: "https://api.example.test"
    });
    mocks.userStore.token = "stale-access";

    await instance.beginSessionTermination();

    await expect(
      instance.getDirect("/api/v1/admin/users", undefined, {
        cancel: false,
        loading: false
      })
    ).rejects.toBeInstanceOf(Error);

    expect(adapter).toHaveBeenCalledTimes(1);
    expect(adapter.mock.calls.some(([config]) => config.url?.endsWith("/admin/refresh"))).toBe(false);
  });

  it("Refresh Session 失效時應清除本機 Access Token", async () => {
    const adapter = vi.fn((config: any) => {
      if (config.url?.endsWith("/csrf")) {
        return Promise.resolve(responseFor(config, csrfResponse));
      }

      return rejectedResponseFor(config, { code: "INVALID_TOKEN" });
    });
    const instance = new RequestHttp({
      adapter,
      baseURL: "https://api.example.test"
    });
    mocks.userStore.token = "stale-access";

    await expect(instance.restoreAdminSession()).resolves.toBe(false);

    expect(mocks.userStore.setToken).toHaveBeenCalledWith("");
    expect(adapter).toHaveBeenCalledTimes(2);
  });
});
