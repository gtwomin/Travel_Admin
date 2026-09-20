import http from "@/api";
import { ADMIN_SERVICE } from "@/api/config/servicePort";
import type { OrderDetail, OrderSummary } from "@/api/interface/order";

export const getAdminOrders = (params: { pageNum: number; pageSize: number; keyword?: string; paymentStatus?: string }) =>
  http
    .getDirect<{ list: OrderSummary[]; total: number; pageNum: number; pageSize: number }>(
      `${ADMIN_SERVICE}/orders`,
      {
        pageNum: params.pageNum,
        pageSize: params.pageSize,
        ...(params.keyword?.trim() ? { keyword: params.keyword.trim() } : {}),
        ...(params.paymentStatus ? { paymentStatus: params.paymentStatus } : {})
      },
      { loading: false }
    )
    .then(data => ({ data }));

export const getAdminOrderDetail = (id: number) =>
  http.getDirect<OrderDetail>(`${ADMIN_SERVICE}/orders/${id}`, undefined, { loading: false });
