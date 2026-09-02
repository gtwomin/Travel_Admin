import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  beginSessionTermination: vi.fn(),
  clearCsrfToken: vi.fn(),
  postDirect: vi.fn(),
  refreshCsrfToken: vi.fn()
}));

vi.mock("@/api", () => ({ default: api }));
vi.mock("@/api/config/servicePort", () => ({
  AUTH_SERVICE: "/api/v1/auth",
  PORT1: "/geeker"
}));

import { logoutApi } from "@/api/modules/login";

describe("管理員 Logout API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.beginSessionTermination.mockResolvedValue(undefined);
    api.refreshCsrfToken.mockResolvedValue({
      headerName: "X-XSRF-TOKEN",
      parameterName: "_csrf",
      token: "stale-memory-token"
    });
    api.postDirect.mockResolvedValue(undefined);
  });

  it("應維持 single-flight 並交由 Axios 自動處理 XSRF Header", async () => {
    const first = logoutApi();
    const second = logoutApi();

    expect(second).toBe(first);
    await first;

    expect(api.beginSessionTermination).toHaveBeenCalledTimes(1);
    expect(api.refreshCsrfToken).toHaveBeenCalledTimes(1);
    expect(api.postDirect).toHaveBeenCalledTimes(1);
    expect(api.postDirect).toHaveBeenCalledWith("/api/v1/auth/admin/logout", undefined, {
      cancel: false,
      skipRefresh: true,
      suppressErrorMessage: true
    });
    expect(api.postDirect.mock.calls[0][2]).not.toHaveProperty("headers");
  });

  it("遠端 Logout 失敗時不得觸發另一條 Refresh 流程", async () => {
    const error = new Error("logout failed");
    api.postDirect.mockRejectedValue(error);

    await expect(logoutApi()).rejects.toBe(error);

    expect(api.postDirect).toHaveBeenCalledTimes(1);
    expect(api.postDirect.mock.calls[0][2]).toMatchObject({
      cancel: false,
      skipRefresh: true
    });
  });
});
