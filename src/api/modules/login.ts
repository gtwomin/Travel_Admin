import http from "@/api";
import { PORT1 } from "@/api/config/servicePort";
import { Login } from "@/api/interface/index";
import authButtonList from "@/assets/json/authButtonList.json";
import authMenuList from "@/assets/json/authMenuList.json";

/**
 * @description 使用者登入
 * @param params Login.ReqLoginForm
 * @returns Promise<Login.ResLogin>
 */
export const loginApi = (params: Login.ReqLoginForm) => {
  return http.postDirect<Login.TokenResponse>(`/api/v1/auth/admin/login`, params, {
    loading: false,
    skipAuth: true,
    skipRefresh: true
  });
  // return http.post<Login.ResLogin>(PORT1 + `/login`, params, { loading: false }); // 控制目前請求不顯示 loading
  // return http.post<Login.ResLogin>(PORT1 + `/login`, {}, { params }); // post 請求攜帶 query 參數  ==>  ?username=admin&password=123456
  // return http.post<Login.ResLogin>(PORT1 + `/login`, qs.stringify(params)); // post 請求攜帶表單參數  ==>  application/x-www-form-urlencoded
  // return http.get<Login.ResLogin>(PORT1 + `/login?${qs.stringify(params, { arrayFormat: "repeat" })}`); // get 請求可以攜帶陣列等複雜參數
};

/**
 * @description 取得目前登入管理員的角色與權限
 */
export const getAdminSessionApi = () => {
  return http.getDirect<Login.AdminSessionResponse>("/api/v1/auth/admin/me", undefined, {
    loading: false
  });
};

/**
 * @description 取得選單列表
 * @returns Promise<Menu.MenuOptions[]>
 */
export const getAuthMenuListApi = () => {
  return http.get<Menu.MenuOptions[]>(PORT1 + `/menu/list`, {}, { loading: false });
  // 若要將選單改為本機資料，請註解上一行程式碼，並引入本機 authMenuList.json 資料
  return authMenuList;
};

/**
 * @description 取得按鈕權限
 * @returns Promise<Login.ResAuthButtons>
 */
export const getAuthButtonListApi = () => {
  return http.get<Login.ResAuthButtons>(PORT1 + `/auth/buttons`, {}, { loading: false });
  // 若要將按鈕權限改為本機資料，請註解上一行程式碼，並引入本機 authButtonList.json 資料
  return authButtonList;
};

/**
 * @description 使用者登出
 */
export const logoutApi = async () => {
  try {
    const csrf = await http.getCsrfToken();
    return await http.postDirect<void>("/api/v1/auth/admin/logout", undefined, {
      skipRefresh: true,
      headers: {
        [csrf.headerName]: csrf.token
      }
    });
  } finally {
    http.clearCsrfToken();
  }
};
