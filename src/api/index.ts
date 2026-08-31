import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { ElMessage } from "element-plus";

import { ApiErrorResponse, ApiFieldError, Login, ResultData } from "@/api/interface";
import { showFullScreenLoading, tryHideFullScreenLoading } from "@/components/Loading/fullScreen";
import { LOGIN_URL } from "@/config";
import { ResultEnum } from "@/enums/httpEnum";
import router from "@/routers";
import { useUserStore } from "@/stores/modules/user";
import mittBus from "@/utils/mittBus";

import { axiosCanceler } from "./helper/axiosCancel";
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
  // 預設 API 位址，可在 .env.** 檔案中修改
  baseURL: import.meta.env.VITE_API_URL as string,
  // 設定逾時時間
  timeout: ResultEnum.TIMEOUT as number,
  // 跨網域請求時允許攜帶憑證
  withCredentials: true
};

class RequestHttp {
  service: AxiosInstance;
  private csrfToken: Login.CsrfResponse | null = null;
  private csrfPromise: Promise<Login.CsrfResponse> | null = null;
  private refreshPromise: Promise<Login.TokenResponse> | null = null;
  private sessionTerminating = false;

  public constructor(config: AxiosRequestConfig) {
    // instantiation
    this.service = axios.create(config);

    /**
     * @description 請求攔截器
     * 用戶端發送請求 -> [請求攔截器] -> 伺服器
     * Token 驗證（JWT）：接收伺服器回傳的 token，僅儲存於 Pinia 記憶體
     */
    this.service.interceptors.request.use(
      (config: CustomAxiosRequestConfig) => {
        const userStore = useUserStore();
        // 重複請求不需要取消，可在 API 服務中透過指定第三個參數：{ cancel: false } 控制
        config.cancel ??= true;
        if (config.cancel) axiosCanceler.addPending(config);
        // 目前請求不需要顯示 loading，可在 API 服務中透過指定第三個參數：{ loading: false } 控制
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
     * @description 回應攔截器
     *  伺服器回傳資訊 -> [攔截統一處理] -> 用戶端 JavaScript 取得資訊
     */
    this.service.interceptors.response.use(
      (response: AxiosResponse & { config: CustomAxiosRequestConfig }) => {
        const { data, config } = response;

        const userStore = useUserStore();
        axiosCanceler.clearPending(config);
        if (config.loading) tryHideFullScreenLoading();
        // 登入失效
        if (data && typeof data === "object" && data.code == ResultEnum.OVERDUE) {
          userStore.setToken("");
          router.replace(LOGIN_URL);
          ElMessage.error(data.msg);
          return Promise.reject(data);
        }
        // 全域錯誤訊息攔截（避免下載檔案時回傳資料流，因沒有 code 而直接報錯）
        if (data && typeof data === "object" && data.code && data.code !== ResultEnum.SUCCESS) {
          ElMessage.error(data.msg);
          return Promise.reject(data);
        }
        // 請求成功（頁面上除非特殊情況，否則不需要處理失敗邏輯）
        return data;
      },
      async (error: AxiosError) => {
        const { response } = error;
        const requestConfig = error.config as CustomAxiosRequestConfig | undefined;
        const errorMessage = String(error.message || "");
        if (requestConfig) axiosCanceler.clearPending(requestConfig);
        if (requestConfig?.loading) tryHideFullScreenLoading();

        if (axios.isCancel(error)) {
          return Promise.reject(error);
        }

        const userStore = useUserStore();

        if (
          response?.status === ResultEnum.OVERDUE &&
          requestConfig &&
          userStore.token &&
          !this.sessionTerminating &&
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
            if (!this.sessionTerminating) {
              axiosCanceler.removeAllPending();
              userStore.setToken("");
              this.clearCsrfToken();
              router.replace(LOGIN_URL);
            }
            return Promise.reject(refreshError);
          }
        }

        if (
          response?.status === ResultEnum.OVERDUE &&
          !this.sessionTerminating &&
          (!userStore.token || (requestConfig && requestConfig._retry && !requestConfig.skipRefresh))
        ) {
          axiosCanceler.removeAllPending();
          userStore.setToken("");
          this.clearCsrfToken();
          router.replace(LOGIN_URL);
        }

        // 請求逾時與網路錯誤分開判斷，沒有 response
        if (errorMessage.indexOf("timeout") !== -1) ElMessage.error("請求逾時！請稍後再試");
        if (errorMessage.indexOf("Network Error") !== -1) ElMessage.error("網路錯誤！請稍後再試");
        // 後端錯誤回應優先使用 message / fieldErrors，否則才使用 status fallback。
        if (response && !requestConfig?.suppressErrorMessage) {
          const apiError = response.data as ApiErrorResponse | undefined;
          if (apiError?.message) {
            const fieldErrors = Array.isArray(apiError.fieldErrors)
              ? (apiError.fieldErrors as ApiFieldError[])
                  .filter(fieldError => Boolean(fieldError?.message))
                  .map(fieldError => `${fieldError.field}: ${fieldError.message}`)
              : [];
            const message = [apiError.message, ...fieldErrors].join("\n");
            ElMessage.error(message);
          } else {
            checkStatus(response.status);
          }
        }
        // 伺服器沒有回傳結果（可能是伺服器錯誤或用戶端斷線），斷線處理：可跳轉至斷線頁面
        if (!window.navigator.onLine) router.replace("/500");
        return Promise.reject(error);
      }
    );
  }

  /**
   * @description 常用請求方法封裝
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
  postDirect<T>(url: string, params?: object | string | FormData, _object = {}): Promise<T> {
    return this.service.post(url, params, _object) as Promise<T>;
  }
  patchDirect<T>(url: string, params?: object | string | FormData, _object = {}): Promise<T> {
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

  async getCsrfToken(force = false): Promise<Login.CsrfResponse> {
    if (!force && this.csrfToken) return this.csrfToken;
    if (this.csrfPromise) return this.csrfPromise;

    this.csrfPromise = this.getDirect<Login.CsrfResponse>("/api/v1/auth/csrf", undefined, {
      skipAuth: true,
      skipRefresh: true,
      suppressErrorMessage: true,
      loading: false,
      cancel: false
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

  async refreshCsrfToken(): Promise<Login.CsrfResponse> {
    this.clearCsrfToken();
    return this.getCsrfToken(true);
  }

  clearCsrfToken() {
    this.csrfToken = null;
  }

  cancelAllPending() {
    axiosCanceler.removeAllPending();
  }

  async beginSessionTermination() {
    if (this.sessionTerminating) return;

    this.sessionTerminating = true;
    const activeRefresh = this.refreshPromise;
    if (activeRefresh) {
      try {
        await activeRefresh;
      } catch {
        // 登出仍會使用目前的 Access Token 嘗試撤銷遠端工作階段。
      }
    }
    axiosCanceler.removeAllPending();
  }

  resumeSessionLifecycle() {
    this.sessionTerminating = false;
  }

  async restoreAdminSession(): Promise<boolean> {
    this.resumeSessionLifecycle();
    try {
      await this.refreshAdminToken();
      return true;
    } catch {
      useUserStore().setToken("");
      this.clearCsrfToken();
      return false;
    }
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
          cancel: false,
          headers: {
            [csrf.headerName]: csrf.token
          }
        })
      )
      .then(response => {
        useUserStore().setToken(response.accessToken);
        mittBus.emit("admin-token-refreshed");
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
