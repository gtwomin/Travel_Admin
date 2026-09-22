import http from "@/api";
import { ADMIN_SERVICE } from "@/api/config/servicePort";
import { AdminOrder } from "@/api/interface";

const toDateRangeParams = (range: [string, string] | undefined, fromKey: string, toKey: string) => {
  if (!range || range.length !== 2 || !range[0] || !range[1]) return {};

  return { [fromKey]: range[0], [toKey]: range[1] };
};

export const getAdminOrderPage = (params: AdminOrder.AdminOrderPageParams) => {
  const { pageNum, pageSize, userId, keyword, status, paymentStatus, createdRange, departureRange, sortBy, sortOrder } = params;
  const normalizedUserId = userId?.trim();
  const normalizedKeyword = keyword?.trim();
  const sortParams = sortBy ? { sortBy, ...(sortOrder ? { sortOrder } : {}) } : {};

  return http
    .getDirect<AdminOrder.AdminOrderPageResponse>(
      `${ADMIN_SERVICE}/orders`,
      {
        pageNum,
        pageSize,
        ...(normalizedUserId ? { userId: normalizedUserId } : {}),
        ...(normalizedKeyword ? { keyword: normalizedKeyword } : {}),
        ...(status ? { status } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
        ...toDateRangeParams(createdRange, "createdFrom", "createdTo"),
        ...toDateRangeParams(departureRange, "departureFrom", "departureTo"),
        ...sortParams
      },
      { loading: false }
    )
    .then(data => ({ data }));
};

export const getAdminOrderDetail = (orderId: number) =>
  http.getDirect<AdminOrder.AdminOrderDetailResponse>(`${ADMIN_SERVICE}/orders/${orderId}`, {}, { loading: false });

export const approveAdminOrderCancellation = (cancellationId: number, params: AdminOrder.AdminCancellationApproveParams) =>
  http.patchDirect<AdminOrder.AdminOrderCancellationResponse>(
    `${ADMIN_SERVICE}/order-cancellations/${cancellationId}/approve`,
    params,
    { loading: false }
  );

export const rejectAdminOrderCancellation = (cancellationId: number, params: AdminOrder.AdminCancellationRejectParams) =>
  http.patchDirect<AdminOrder.AdminOrderCancellationResponse>(
    `${ADMIN_SERVICE}/order-cancellations/${cancellationId}/reject`,
    params,
    { loading: false }
  );
