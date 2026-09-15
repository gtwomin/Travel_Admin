import http from "@/api";
import { AdminForum } from "@/api/interface";
import { ADMIN_SERVICE } from "@/api/config/servicePort";

export const getAdminReportPage = (params: AdminForum.AdminReportPageParams) => {
  const { pageNum, pageSize, status, reason, targetType } = params;
  return http
    .getDirect<AdminForum.AdminReportPageResponse>(
      `${ADMIN_SERVICE}/reports`,
      {
        pageNum,
        pageSize,
        ...(status ? { status } : {}),
        ...(reason ? { reason } : {}),
        ...(targetType ? { targetType } : {})
      },
      { loading: false }
    )
    .then(data => ({ data }));
};

export const getAdminReportSummary = () =>
  http.getDirect<AdminForum.AdminReportSummary>(`${ADMIN_SERVICE}/reports/summary`, undefined, { loading: false });

export const updateAdminReportStatus = (reportId: number, params: AdminForum.AdminReportStatusParams): Promise<void> =>
  http.put(`${ADMIN_SERVICE}/reports/${reportId}`, { status: params.status }, { loading: false }).then(() => undefined);

export const getAdminPostPage = (params: AdminForum.AdminPostPageParams) => {
  return http
    .getDirect<AdminForum.AdminPostPageResponse>(`${ADMIN_SERVICE}/posts`, params, { loading: false })
    .then(data => ({ data }));
};

export const unpublishAdminPost = (postId: number): Promise<void> =>
  http.delete(`${ADMIN_SERVICE}/posts/${postId}`, undefined, { loading: false }).then(() => undefined);

export const getAdminCategories = () => {
  return http.getDirect<AdminForum.Category[]>(`${ADMIN_SERVICE}/category`, undefined, { loading: false });
};

export const createAdminCategory = (params: AdminForum.CategoryMutationParams) => {
  return http.postDirect<AdminForum.Category>(`${ADMIN_SERVICE}/category`, params, { loading: false });
};

export const updateAdminCategory = (categoryId: number, params: AdminForum.CategoryMutationParams): Promise<void> => {
  return http.put(`${ADMIN_SERVICE}/category/${categoryId}`, params, { loading: false }).then(() => undefined);
};

export const deleteAdminCategory = (categoryId: number): Promise<void> => {
  return http.delete(`${ADMIN_SERVICE}/category/${categoryId}`, undefined, { loading: false }).then(() => undefined);
};
