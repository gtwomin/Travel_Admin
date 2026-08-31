import qs from "qs";

import type { CustomAxiosRequestConfig } from "../index";

// 儲存每個請求的識別與 AbortController。
const pendingMap = new Map<string, AbortController>();

// 序列化參數，確保物件屬性順序一致。
const sortedStringify = (obj: any) => {
  return qs.stringify(obj, { arrayFormat: "repeat", sort: (a, b) => a.localeCompare(b) });
};

// 取得請求的唯一識別。
export const getPendingUrl = (config: CustomAxiosRequestConfig) => {
  return [config.method, config.url, sortedStringify(config.data), sortedStringify(config.params)].join("&");
};

export class AxiosCanceler {
  /**
   * @description 新增請求
   * @param {Object} config
   * @return void
   */
  addPending(config: CustomAxiosRequestConfig) {
    // 請求開始前取消相同識別的舊請求。
    this.cancelPending(config);
    const url = getPendingUrl(config);
    const controller = new AbortController();
    config.signal = controller.signal;
    pendingMap.set(url, controller);
  }

  /**
   * @description 取消相同識別的請求並移除登記
   * @param {Object} config
   */
  cancelPending(config: CustomAxiosRequestConfig) {
    const url = getPendingUrl(config);
    const controller = pendingMap.get(url);
    if (controller) {
      controller.abort();
      pendingMap.delete(url);
    }
  }

  /**
   * @description 請求完成後，只移除屬於目前 config 的登記
   */
  clearPending(config: CustomAxiosRequestConfig) {
    const url = getPendingUrl(config);
    const controller = pendingMap.get(url);
    if (controller && controller.signal === config.signal) pendingMap.delete(url);
  }

  /**
   * @description 清空所有 pending 請求
   */
  removeAllPending() {
    pendingMap.forEach(controller => {
      if (controller) controller.abort();
    });
    pendingMap.clear();
  }
}

export const axiosCanceler = new AxiosCanceler();
