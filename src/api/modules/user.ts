import http from "@/api";
import { ADMIN_SERVICE, PORT1 } from "@/api/config/servicePort";
import { AdminUser, ResPage, User } from "@/api/interface/index";

export const getAdminUserPage = (params: AdminUser.AdminUserPageParams) => {
  return http
    .getDirect<AdminUser.AdminUserPageResponse>(`${ADMIN_SERVICE}/users`, params, { loading: false })
    .then(data => ({ data }));
};

export const getAdminUserDetail = (userId: string) => {
  return http.getDirect<AdminUser.AdminUserResponse>(`${ADMIN_SERVICE}/users/${userId}`, undefined, { loading: false });
};

export const updateAdminUserStatus = (userId: string, status: number) => {
  return http.patchDirect<AdminUser.AdminUserResponse>(`${ADMIN_SERVICE}/users/${userId}/status`, { status }, { loading: false });
};

export const updateAdminUserProfile = (userId: string, params: FormData) => {
  return http.patchDirect<AdminUser.AdminUserResponse>(`${ADMIN_SERVICE}/users/${userId}/profile`, params, { loading: false });
};

export const resolveAvatarUrl = (avatar: string | null | undefined) => {
  if (!avatar) return "";
  if (/^https?:\/\//i.test(avatar)) return avatar;
  const baseUrl = String(import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
  return `${baseUrl}/${avatar.replace(/^\//, "")}`;
};

/**
 * @description 取得使用者列表
 * @param params User.ReqUserParams
 * @returns Promise<ResPage<User.ResUserList>>
 */
export const getUserList = (params: User.ReqUserParams) => {
  return http.post<ResPage<User.ResUserList>>(PORT1 + `/user/list`, params);
};

/**
 * @description 取得樹狀使用者列表
 * @param params User.ReqUserParams
 * @returns Promise<ResPage<User.ResUserList>>
 */
export const getUserTreeList = (params: User.ReqUserParams) => {
  return http.post<ResPage<User.ResUserList>>(PORT1 + `/user/tree/list`, params);
};

/**
 * @description 新增使用者
 * @param params { id: string }
 * @returns Promise<void>
 */
export const addUser = (params: { id: string }) => {
  return http.post(PORT1 + `/user/add`, params);
};

/**
 * @description 批次新增使用者
 * @param params FormData
 * @returns Promise<void>
 */
export const batchAddUser = (params: FormData) => {
  return http.post(PORT1 + `/user/import`, params);
};

/**
 * @description 編輯使用者
 * @param params { id: string }
 * @returns Promise<void>
 */
export const editUser = (params: { id: string }) => {
  return http.post(PORT1 + `/user/edit`, params);
};

/**
 * @description 刪除使用者
 * @param params { id: string[] }
 * @returns Promise<void>
 */
export const deleteUser = (params: { id: string[] }) => {
  return http.post(PORT1 + `/user/delete`, params);
};

/**
 * @description 切換使用者狀態
 * @param params { id: string; status: number }
 * @returns Promise<void>
 */
export const changeUserStatus = (params: { id: string; status: number }) => {
  return http.post(PORT1 + `/user/change`, params);
};

/**
 * @description 重設使用者密碼
 * @param params { id: string }
 * @returns Promise<void>
 */
export const resetUserPassWord = (params: { id: string }) => {
  return http.post(PORT1 + `/user/rest_password`, params);
};

/**
 * @description 匯出使用者資料
 * @param params User.ReqUserParams
 * @returns Promise<void>
 */
export const exportUserInfo = (params: User.ReqUserParams) => {
  return http.download(PORT1 + `/user/export`, params);
};

/**
 * @description 取得使用者狀態字典
 * @returns Promise<User.ResStatus[]>
 */
export const getUserStatus = () => {
  return http.get<User.ResStatus[]>(PORT1 + `/user/status`);
};

/**
 * @description 取得使用者性別字典
 * @returns Promise<User.ResGender[]>
 */
export const getUserGender = () => {
  return http.get<User.ResGender[]>(PORT1 + `/user/gender`);
};

/**
 * @description 取得使用者部門列表
 * @returns Promise<User.ResDepartment[]>
 */
export const getUserDepartment = () => {
  return http.get<User.ResDepartment[]>(PORT1 + `/user/department`, {}, { cancel: false });
};

/**
 * @description 取得使用者角色字典
 * @returns Promise<User.ResRole[]>
 */
export const getUserRole = () => {
  return http.get<User.ResRole[]>(PORT1 + `/user/role`);
};
