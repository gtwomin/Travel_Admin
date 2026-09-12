import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  getDirect: vi.fn(),
  postDirect: vi.fn(),
  put: vi.fn(),
  delete: vi.fn()
}));

vi.mock("@/api", () => ({ default: api }));
vi.mock("@/api/config/servicePort", () => ({ ADMIN_SERVICE: "/api/v1/admin" }));

import {
  createAdminCategory,
  deleteAdminCategory,
  getAdminCategories,
  getAdminPostPage,
  getAdminReportPage,
  getAdminReportSummary,
  updateAdminReportStatus,
  updateAdminCategory
} from "@/api/modules/forum";

describe("討論區管理 API", () => {
  it("檢舉列表應傳送契約條件並排除未支援參數", async () => {
    api.getDirect.mockResolvedValueOnce({ list: [], total: 0, pageNum: 2, pageSize: 25 });
    const result = await getAdminReportPage({
      pageNum: 2,
      pageSize: 25,
      status: "PENDING",
      reason: "SPAM",
      targetType: "COMMENT",
      keyword: "不支援",
      sortBy: "id"
    } as Parameters<typeof getAdminReportPage>[0]);
    expect(api.getDirect).toHaveBeenCalledWith(
      "/api/v1/admin/reports",
      { pageNum: 2, pageSize: 25, status: "PENDING", reason: "SPAM", targetType: "COMMENT" },
      { loading: false }
    );
    expect(result).toEqual({ data: { list: [], total: 0, pageNum: 2, pageSize: 25 } });
  });

  it("檢舉列表未指定篩選時只送分頁參數", async () => {
    await getAdminReportPage({ pageNum: 1, pageSize: 10 });
    expect(api.getDirect).toHaveBeenCalledWith("/api/v1/admin/reports", { pageNum: 1, pageSize: 10 }, { loading: false });
  });

  it("狀態摘要應使用單一 summary endpoint", async () => {
    api.getDirect.mockResolvedValueOnce({ pending: 2, reviewed: 3, rejected: 4 });
    await expect(getAdminReportSummary()).resolves.toEqual({ pending: 2, reviewed: 3, rejected: 4 });
    expect(api.getDirect).toHaveBeenCalledWith("/api/v1/admin/reports/summary", undefined, { loading: false });
  });

  it.each(["REVIEWED", "REJECTED"] as const)("處理檢舉只送出 %s 狀態", async status => {
    await updateAdminReportStatus(7, { status });
    expect(api.put).toHaveBeenCalledWith("/api/v1/admin/reports/7", { status }, { loading: false });
  });

  it("409 應保留 rejection 供全域錯誤流程處理", async () => {
    const error = { response: { status: 409 } };
    api.put.mockRejectedValueOnce(error);
    await expect(updateAdminReportStatus(7, { status: "REVIEWED" })).rejects.toBe(error);
  });
  beforeEach(() => {
    vi.clearAllMocks();
    api.getDirect.mockResolvedValue({ list: [], total: 0, pageNum: 1, pageSize: 10 });
    api.postDirect.mockResolvedValue({ id: 3, name: "景點" });
    api.put.mockResolvedValue(undefined);
    api.delete.mockResolvedValue(undefined);
  });

  it("應將貼文搜尋條件與分頁參數原樣送至 Admin Post API", async () => {
    const params = {
      keyword: "  旅遊  ",
      status: "ACTIVE" as const,
      categoryId: 3,
      pageNum: 2,
      pageSize: 25
    };

    const result = await getAdminPostPage(params);

    expect(result).toEqual({ data: { list: [], total: 0, pageNum: 1, pageSize: 10 } });
    expect(api.getDirect).toHaveBeenCalledWith("/api/v1/admin/posts", params, { loading: false });
    expect(params).not.toHaveProperty("authorId");
    expect(params).not.toHaveProperty("sortBy");
    expect(params).not.toHaveProperty("sortOrder");
  });

  it("未選擇狀態與分類時不得自行補送額外條件", async () => {
    const params = { pageNum: 1, pageSize: 10 };

    await getAdminPostPage(params);

    expect(api.getDirect).toHaveBeenCalledWith("/api/v1/admin/posts", params, { loading: false });
    expect(params).toEqual({ pageNum: 1, pageSize: 10 });
  });

  it("應從正式分類 API 取得分類清單", async () => {
    api.getDirect.mockResolvedValueOnce([{ id: 1, name: "景點" }]);

    await expect(getAdminCategories()).resolves.toEqual([{ id: 1, name: "景點" }]);
    expect(api.getDirect).toHaveBeenCalledWith("/api/v1/admin/category", undefined, { loading: false });
  });

  it("應使用正式分類 CRUD endpoints 並只送出 name", async () => {
    const createParams = { name: "景點" };
    const updateParams = { name: "美食" };

    await createAdminCategory(createParams);
    await updateAdminCategory(3, updateParams);
    await deleteAdminCategory(3);

    expect(api.postDirect).toHaveBeenCalledWith("/api/v1/admin/category", createParams, { loading: false });
    expect(api.put).toHaveBeenCalledWith("/api/v1/admin/category/3", updateParams, { loading: false });
    expect(api.delete).toHaveBeenCalledWith("/api/v1/admin/category/3", undefined, { loading: false });
    expect(Object.keys(createParams)).toEqual(["name"]);
    expect(Object.keys(updateParams)).toEqual(["name"]);
  });
});
