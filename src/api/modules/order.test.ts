import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  getDirect: vi.fn(),
  patchDirect: vi.fn()
}));

vi.mock("@/api", () => ({ default: api }));
vi.mock("@/api/config/servicePort", () => ({ ADMIN_SERVICE: "/api/v1/admin" }));

import { AdminOrder } from "@/api/interface";
import {
  approveAdminOrderCancellation,
  getAdminOrderDetail,
  getAdminOrderPage,
  rejectAdminOrderCancellation
} from "@/api/modules/order";

describe("訂單管理 API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getDirect.mockResolvedValue({ list: [], total: 0, pageNum: 1, pageSize: 10 });
    api.patchDirect.mockResolvedValue(undefined);
  });

  it("應使用正式訂單列表 endpoint 並保留 ProTable 分頁回應 adapter", async () => {
    const backendPage = { list: [], total: 4, pageNum: 2, pageSize: 25 };
    api.getDirect.mockResolvedValueOnce(backendPage);

    await expect(getAdminOrderPage({ pageNum: 2, pageSize: 25 })).resolves.toEqual({ data: backendPage });
    expect(api.getDirect).toHaveBeenCalledWith("/api/v1/admin/orders", { pageNum: 2, pageSize: 25 }, { loading: false });
  });

  it("應在指定會員範圍時傳送 userId", async () => {
    const userId = "00000000-0000-0000-0000-000000000001";

    await getAdminOrderPage({ pageNum: 1, pageSize: 10, userId });

    expect(api.getDirect).toHaveBeenCalledWith("/api/v1/admin/orders", { pageNum: 1, pageSize: 10, userId }, { loading: false });
  });

  it("應傳送關鍵字、業務狀態與付款狀態", async () => {
    await getAdminOrderPage({
      pageNum: 1,
      pageSize: 10,
      keyword: "  ORD-2026  ",
      status: "UPCOMING",
      paymentStatus: "PAID"
    });

    expect(api.getDirect).toHaveBeenCalledWith(
      "/api/v1/admin/orders",
      { pageNum: 1, pageSize: 10, keyword: "ORD-2026", status: "UPCOMING", paymentStatus: "PAID" },
      { loading: false }
    );
  });

  it("應將兩組日期區間轉為 backend query params", async () => {
    await getAdminOrderPage({
      pageNum: 1,
      pageSize: 10,
      createdRange: ["2026-09-01", "2026-09-18"],
      departureRange: ["2026-10-01", "2026-10-31"]
    });

    expect(api.getDirect).toHaveBeenCalledWith(
      "/api/v1/admin/orders",
      {
        pageNum: 1,
        pageSize: 10,
        createdFrom: "2026-09-01",
        createdTo: "2026-09-18",
        departureFrom: "2026-10-01",
        departureTo: "2026-10-31"
      },
      { loading: false }
    );
  });

  it("應傳送 backend 定義的排序欄位與方向", async () => {
    await getAdminOrderPage({ pageNum: 1, pageSize: 50, sortBy: "departureAt", sortOrder: "asc" });

    expect(api.getDirect).toHaveBeenCalledWith(
      "/api/v1/admin/orders",
      { pageNum: 1, pageSize: 50, sortBy: "departureAt", sortOrder: "asc" },
      { loading: false }
    );
  });

  it("空白篩選與不完整日期區間不得產生無意義 query params", async () => {
    await getAdminOrderPage({
      pageNum: 1,
      pageSize: 10,
      keyword: "   ",
      createdRange: ["2026-09-01", ""] as [string, string],
      departureRange: undefined,
      sortOrder: "desc"
    });

    expect(api.getDirect).toHaveBeenCalledWith("/api/v1/admin/orders", { pageNum: 1, pageSize: 10 }, { loading: false });
  });

  it("應取得完整訂單明細並原樣保留商品與付款歷程", async () => {
    const detail: AdminOrder.AdminOrderDetailResponse = {
      orderId: 7,
      orderNumber: "ORD-20260919-0007",
      orderStatus: "CANCELLATION_REQUESTED",
      displayStatus: "CANCELLATION_IN_PROGRESS",
      totalAmount: 25800,
      createdAt: "2026-09-19T01:20:00Z",
      member: {
        userId: "6f9b1f2e-9c6c-4b92-9ce5-1ad3b92fa007",
        username: "travel-admin-test",
        nickname: "測試會員",
        email: "member@example.com"
      },
      contact: {
        contactName: "訂購聯絡人",
        contactEmail: "order@example.com",
        countryCode: "+886",
        contactPhone: "912345678",
        specialRequest: "需要靠窗座位"
      },
      items: [
        {
          orderItemId: 71,
          orderItemStatus: "PAID",
          tripId: 101,
          tripName: "東京京都八日遊",
          departureId: 1001,
          startTime: "2026-10-10T01:00:00Z",
          endTime: "2026-10-17T09:00:00Z",
          quantity: 2,
          unitPrice: 12800,
          subtotal: 25600,
          note: null,
          destinations: ["TOKYO", "KYOTO"]
        },
        {
          orderItemId: 72,
          orderItemStatus: "CONFIRMED",
          tripId: 102,
          tripName: "大阪自由行",
          departureId: 1002,
          startTime: "2026-11-01T02:00:00Z",
          endTime: "2026-11-05T09:00:00Z",
          quantity: 1,
          unitPrice: 200,
          subtotal: 200,
          note: "安排機場接送",
          destinations: ["OSAKA"]
        }
      ],
      payments: [
        {
          paymentId: 701,
          amount: 25800,
          paymentMethod: "CREDIT_CARD",
          status: "FAILED",
          merchantTradeNo: "TRADE-7001",
          transactionId: null,
          createdAt: "2026-09-19T01:21:00Z",
          paidAt: null
        },
        {
          paymentId: 702,
          amount: 25800,
          paymentMethod: "CREDIT_CARD",
          status: "PAID",
          merchantTradeNo: "TRADE-7002",
          transactionId: "TX-7002",
          createdAt: "2026-09-19T01:30:00Z",
          paidAt: "2026-09-19T01:31:00Z"
        },
        {
          paymentId: 703,
          amount: 25800,
          paymentMethod: "LINE_PAY",
          status: "PENDING",
          merchantTradeNo: "TRADE-7003",
          transactionId: null,
          createdAt: "2026-09-19T01:40:00Z",
          paidAt: null
        }
      ],
      pendingCancellation: {
        cancellationId: 8,
        status: "PENDING",
        reason: "臨時無法參加行程",
        requestedAt: "2026-09-19T02:00:00Z"
      }
    };
    api.getDirect.mockResolvedValueOnce(detail);

    await expect(getAdminOrderDetail(7)).resolves.toBe(detail);

    expect(api.getDirect).toHaveBeenCalledWith("/api/v1/admin/orders/7", {}, { loading: false });
    expect(detail.items).toHaveLength(2);
    expect(detail.payments).toHaveLength(3);
    expect(detail.payments.map(payment => payment.status)).toEqual(["FAILED", "PAID", "PENDING"]);
    expect(detail.pendingCancellation).toEqual({
      cancellationId: 8,
      status: "PENDING",
      reason: "臨時無法參加行程",
      requestedAt: "2026-09-19T02:00:00Z"
    });
  });

  it("應以可選審核說明呼叫核准取消 API", async () => {
    const response = { id: 8, status: "APPROVED" };
    api.patchDirect.mockResolvedValueOnce(response);

    await expect(approveAdminOrderCancellation(8, { adminNote: null })).resolves.toBe(response);

    expect(api.patchDirect).toHaveBeenCalledWith(
      "/api/v1/admin/order-cancellations/8/approve",
      { adminNote: null },
      { loading: false }
    );
  });

  it("應以必填審核說明呼叫拒絕取消 API", async () => {
    const response = { id: 8, status: "REJECTED" };
    api.patchDirect.mockResolvedValueOnce(response);

    await expect(rejectAdminOrderCancellation(8, { adminNote: "拒絕原因" })).resolves.toBe(response);

    expect(api.patchDirect).toHaveBeenCalledWith(
      "/api/v1/admin/order-cancellations/8/reject",
      { adminNote: "拒絕原因" },
      { loading: false }
    );
  });

  it("409 應保留取消審核 API rejection 供 Drawer 處理 stale state", async () => {
    const error = { response: { status: 409 } };
    api.patchDirect.mockRejectedValueOnce(error);

    await expect(approveAdminOrderCancellation(8, { adminNote: null })).rejects.toBe(error);
  });
});
