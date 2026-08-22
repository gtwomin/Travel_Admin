import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { ElMessage } from "element-plus";

import { ApiErrorResponse, Login, ResultData } from "@/api/interface";
import { showFullScreenLoading, tryHideFullScreenLoading } from "@/components/Loading/fullScreen";
import { LOGIN_URL } from "@/config";
import { ResultEnum } from "@/enums/httpEnum";
import router from "@/routers";
import { useUserStore } from "@/stores/modules/user";

import { AxiosCanceler } from "./helper/axiosCancel";
import { checkStatus } from "./helper/checkStatus";

export interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  loading?: boolean;
  cancel?: boolean;
  skipAuth?: boolean;
  skipRefresh?: boolean;
  _retry?: boolean;
  suppressErrorMessage?: boolean;
}

const config = {
  // 默认地址请求地址，可在 .env.** 文件中修改
  baseURL: import.meta.env.VITE_API_URL as string,
  // 设置超时时间
  timeout: ResultEnum.TIMEOUT as number,
  // 跨域时候允许携带凭证
  withCredentials: true
};

const axiosCanceler = new AxiosCanceler();

class RequestHttp {
  service: AxiosInstance;
  private csrfToken: Login.CsrfResponse | null = null;
  private csrfPromise: Promise<Login.CsrfResponse> | null = null;
  private refreshPromise: Promise<Login.TokenResponse> | null = null;

  public constructor(config: AxiosRequestConfig) {
    // instantiation
    this.service = axios.create(config);

    /**
     * @description 请求拦截器
     * 客户端发送请求 -> [请求拦截器] -> 服务器
     * token校验(JWT) : 接受服务器返回的 token,存储到 vuex/pinia/本地储存当中
     */
    this.service.interceptors.request.use(
      (config: CustomAxiosRequestConfig) => {
        const userStore = useUserStore();
        // 重复请求不需要取消，在 api 服务中通过指定的第三个参数: { cancel: false } 来控制
        config.cancel ??= true;
        if (config.cancel) axiosCanceler.addPending(config);
        // 当前请求不需要显示 loading，在 api 服务中通过指定的第三个参数: { loading: false } 来控制
        config.loading ??= true;
        if (config.loading) showFullScreenLoading();
        if (!config.skipAuth && userStore.token && config.headers && typeof config.headers.set === "function") {
          config.headers.set("Authorization", `Bearer ${userStore.token}`);
        }
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    /**
     * @description 响应拦截器
     *  服务器换返回信息 -> [拦截统一处理] -> 客户端JS获取到信息
     */
    this.service.interceptors.response.use(
      (response: AxiosResponse & { config: CustomAxiosRequestConfig }) => {
        const { data, config } = response;

        const userStore = useUserStore();
        axiosCanceler.removePending(config);
        if (config.loading) tryHideFullScreenLoading();
        // 登录失效
        if (data && typeof data === "object" && data.code == ResultEnum.OVERDUE) {
          userStore.setToken("");
          router.replace(LOGIN_URL);
          ElMessage.error(data.msg);
          return Promise.reject(data);
        }
        // 全局错误信息拦截（防止下载文件的时候返回数据流，没有 code 直接报错）
        if (data && typeof data === "object" && data.code && data.code !== ResultEnum.SUCCESS) {
          ElMessage.error(data.msg);
          return Promise.reject(data);
        }
        // 成功请求（在页面上除非特殊情况，否则不用处理失败逻辑）
        return data;
      },
      async (error: AxiosError) => {
        const { response } = error;
        const requestConfig = error.config as CustomAxiosRequestConfig | undefined;
        tryHideFullScreenLoading();

        if (
          response?.status === ResultEnum.OVERDUE &&
          requestConfig &&
          !requestConfig.skipRefresh &&
          !requestConfig._retry &&
          !this.isAuthEndpoint(requestConfig.url)
        ) {
          requestConfig._retry = true;
          try {
            const tokenResponse = await this.refreshAdminToken();
            if (requestConfig.headers && typeof requestConfig.headers.set === "function") {
              requestConfig.headers.set("Authorization", `Bearer ${tokenResponse.accessToken}`);
            }
            return this.service.request(requestConfig);
          } catch (refreshError) {
            const userStore = useUserStore();
            userStore.setToken("");
            this.clearCsrfToken();
            router.replace(LOGIN_URL);
            return Promise.reject(refreshError);
          }
        }

        if (response?.status === ResultEnum.OVERDUE && requestConfig && requestConfig._retry && !requestConfig.skipRefresh) {
          const userStore = useUserStore();
          userStore.setToken("");
          this.clearCsrfToken();
          router.replace(LOGIN_URL);
        }

        // 请求超时 && 网络错误单独判断，没有 response
        if (error.message.indexOf("timeout") !== -1) ElMessage.error("请求超时！请您稍后重试");
        if (error.message.indexOf("Network Error") !== -1) ElMessage.error("网络错误！请您稍后重试");
        // Backend error response優先使用 message / fieldErrors，否則才使用 status fallback。
        if (response && !requestConfig?.suppressErrorMessage) {
          const apiError = response.data as ApiErrorResponse | undefined;
          if (apiError?.message) {
            const fieldErrors = Array.isArray(apiError.fieldErrors)
              ? apiError.fieldErrors
                  .filter(fieldError => fieldError?.message)
                  .map(fieldError => `${fieldError.field}: ${fieldError.message}`)
              : [];
            const message = [apiError.message, ...fieldErrors].join("\n");
            ElMessage.error(message);
          } else {
            checkStatus(response.status);
          }
        }
        // 服务器结果都没有返回(可能服务器错误可能客户端断网)，断网处理:可以跳转到断网页面
        if (!window.navigator.onLine) router.replace("/500");
        return Promise.reject(error);
      }
    );
  }

  /**
   * @description 常用请求方法封装
   */
  get<T>(url: string, params?: object, _object = {}): Promise<ResultData<T>> {
    return this.service.get(url, { params, ..._object });
  }
  post<T>(url: string, params?: object | string, _object = {}): Promise<ResultData<T>> {
    return this.service.post(url, params, _object);
  }
  getDirect<T>(url: string, params?: object, _object = {}): Promise<T> {
    return this.service.get(url, { params, ..._object }) as Promise<T>;
  }
  postDirect<T>(url: string, params?: object | string, _object = {}): Promise<T> {
    return this.service.post(url, params, _object) as Promise<T>;
  }
  patchDirect<T>(url: string, params?: object | string, _object = {}): Promise<T> {
    return this.service.patch(url, params, _object) as Promise<T>;
  }
  put<T>(url: string, params?: object, _object = {}): Promise<ResultData<T>> {
    return this.service.put(url, params, _object);
  }
  delete<T>(url: string, params?: any, _object = {}): Promise<ResultData<T>> {
    return this.service.delete(url, { params, ..._object });
  }
  download(url: string, params?: object, _object = {}): Promise<BlobPart> {
    return this.service.post(url, params, { ..._object, responseType: "blob" });
  }

  async getCsrfToken(): Promise<Login.CsrfResponse> {
    if (this.csrfToken) return this.csrfToken;
    if (this.csrfPromise) return this.csrfPromise;

    this.csrfPromise = this.getDirect<Login.CsrfResponse>("/api/v1/auth/csrf", undefined, {
      skipAuth: true,
      skipRefresh: true,
      suppressErrorMessage: true,
      loading: false
    })
      .then(response => {
        this.csrfToken = response;
        return this.csrfToken;
      })
      .finally(() => {
        this.csrfPromise = null;
      });

    return this.csrfPromise;
  }

  clearCsrfToken() {
    this.csrfToken = null;
  }

  private refreshAdminToken(): Promise<Login.TokenResponse> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = this.getCsrfToken()
      .then(csrf =>
        this.postDirect<Login.TokenResponse>("/api/v1/auth/admin/refresh", undefined, {
          skipAuth: true,
          skipRefresh: true,
          suppressErrorMessage: true,
          loading: false,
          headers: {
            [csrf.headerName]: csrf.token
          }
        })
      )
      .then(response => {
        useUserStore().setToken(response.accessToken);
        return response;
      })
      .finally(() => {
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }

  private isAuthEndpoint(url?: string) {
    if (!url) return false;
    return ["/api/v1/auth/admin/login", "/api/v1/auth/admin/refresh", "/api/v1/auth/admin/logout", "/api/v1/auth/csrf"].some(
      endpoint => url.includes(endpoint)
    );
  }
}

export default new RequestHttp(config);
