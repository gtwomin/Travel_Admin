import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api", () => ({ default: {} }));
vi.mock("@/api/config/servicePort", () => ({
  ADMIN_SERVICE: "/api/v1/admin",
  PORT1: "/geeker"
}));

import { resolveAvatarUrl } from "@/api/modules/user";

describe("管理員頭像 URL resolver", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("保留 absolute avatar URL", () => {
    const avatarUrl = "https://cdn.example.com/avatars/member.png";

    expect(resolveAvatarUrl(avatarUrl)).toBe(avatarUrl);
  });

  it("以 absolute API base 組合 relative avatar path", () => {
    vi.stubEnv("VITE_API_URL", "https://localhost:8080");

    expect(resolveAvatarUrl("/uploads/avatars/member.png")).toBe("https://localhost:8080/uploads/avatars/member.png");
  });

  it("以 browser origin 組合 relative API base 的 avatar path", () => {
    vi.stubEnv("VITE_API_URL", "/");
    vi.stubGlobal("window", { location: { origin: "http://travel" } });

    expect(resolveAvatarUrl("/uploads/avatars/member.png")).toBe("http://travel/uploads/avatars/member.png");
  });

  it("不產生 protocol-relative uploads URL", () => {
    vi.stubEnv("VITE_API_URL", "/");
    vi.stubGlobal("window", { location: { origin: "https://travel.example.com" } });

    expect(resolveAvatarUrl("/uploads/avatars/member.png")).not.toMatch(/^\/\//);
  });
});
