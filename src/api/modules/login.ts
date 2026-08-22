import http from "@/api";
import { PORT1 } from "@/api/config/servicePort";
import { Login } from "@/api/interface/index";
import authButtonList from "@/assets/json/authButtonList.json";
import authMenuList from "@/assets/json/authMenuList.json";

/**
 * @description 用户登录
 * @param params Login.ReqLoginForm
 * @returns Promise<Login.ResLogin>
 */
export const loginApi = (params: Login.ReqLoginForm) => {
  return http.postDirect<Login.TokenResponse>(`/api/v1/auth/admin/login`, params, {
    loading: false,
    skipAuth: true,
    skipRefresh: true
  });
  // return http.post<Login.ResLogin>(PORT1 + `/login`, params, { loading: false }); // 控制当前请求不显示 loading
  // return http.post<Login.ResLogin>(PORT1 + `/login`, {}, { params }); // post 请求携带 query 参数  ==>  ?username=admin&password=123456
  // return http.post<Login.ResLogin>(PORT1 + `/login`, qs.stringify(params)); // post 请求携带表单参数  ==>  application/x-www-form-urlencoded
  // return http.get<Login.ResLogin>(PORT1 + `/login?${qs.stringify(params, { arrayFormat: "repeat" })}`); // get 请求可以携带数组等复杂参数
};

/**
 * @description 获取菜单列表
 * @returns Promise<Menu.MenuOptions[]>
 */
export const getAuthMenuListApi = () => {
  return http.get<Menu.MenuOptions[]>(PORT1 + `/menu/list`, {}, { loading: false });
  // 如果想让菜单变为本地数据，注释上一行代码，并引入本地 authMenuList.json 数据
  return authMenuList;
};

/**
 * @description 获取按钮权限
 * @returns Promise<Login.ResAuthButtons>
 */
export const getAuthButtonListApi = () => {
  return http.get<Login.ResAuthButtons>(PORT1 + `/auth/buttons`, {}, { loading: false });
  // 如果想让按钮权限变为本地数据，注释上一行代码，并引入本地 authButtonList.json 数据
  return authButtonList;
};

/**
 * @description 用户退出登录
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
