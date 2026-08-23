import { createRouter, createWebHashHistory, createWebHistory } from "vue-router";

import { LOGIN_URL, ROUTER_WHITE_LIST } from "@/config";
import NProgress from "@/config/nprogress";
import { errorRouter, STATIC_ROUTE_NAMES, staticRouter } from "@/routers/modules/staticRouter";
import { initDynamicRouter, isKnownPermissionPath, removeDynamicRoutes } from "@/routers/modules/dynamicRouter";
import { useAuthStore } from "@/stores/modules/auth";
import { useUserStore } from "@/stores/modules/user";

const mode = import.meta.env.VITE_ROUTER_MODE;

const routerMode = {
  hash: () => createWebHashHistory(),
  history: () => createWebHistory()
};

/**
 * @description 📚 路由參數設定說明
 * @param path ==> 路由選單存取路徑
 * @param name ==> 路由 name（對應頁面元件 name，可用作 KeepAlive 快取識別與按鈕權限篩選）
 * @param redirect ==> 路由重新導向位址
 * @param component ==> 檢視元件檔案路徑
 * @param meta ==> 路由選單中繼資料
 * @param meta.icon ==> 選單與麵包屑對應的圖示
 * @param meta.title ==> 路由標題（用於 document.title || 選單名稱）
 * @param meta.activeMenu ==> 目前路由為詳情頁時，需要高亮的選單
 * @param meta.isLink ==> 路由外部連結時填寫的網址
 * @param meta.isHide ==> 是否在選單中隱藏（通常列表詳情頁需要隱藏）
 * @param meta.isFull ==> 選單是否全螢幕（例如資料大屏頁面）
 * @param meta.isAffix ==> 選單是否固定在頁籤中（首頁通常是固定項）
 * @param meta.isKeepAlive ==> 目前路由是否快取
 * */
const router = createRouter({
  history: routerMode[mode](),
  routes: [...staticRouter, ...errorRouter],
  strict: false,
  scrollBehavior: () => ({ left: 0, top: 0 })
});

/**
 * @description 路由攔截 beforeEach
 * */
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore();
  const authStore = useAuthStore();

  // 1.NProgress 開始
  NProgress.start();

  // 2.動態設定標題
  const title = import.meta.env.VITE_GLOB_APP_TITLE;
  document.title = to.meta.title ? `${to.meta.title} - ${title}` : title;

  // 3.判斷是否存取登入頁，有 Token 就停留在目前頁面，沒有 Token 則重設路由至登入頁
  if (to.path.toLocaleLowerCase() === LOGIN_URL) {
    if (userStore.token) return next(from.fullPath);
    resetRouter();
    return next();
  }

  // 4.判斷存取頁面是否位於路由白名單（靜態路由）中，若存在則直接放行
  if (ROUTER_WHITE_LIST.includes(to.path)) return next();

  // 5.判斷是否有 Token，沒有則重新導向至 login 頁面
  if (!userStore.token) return next({ path: LOGIN_URL, replace: true });

  if (!authStore.initialized) {
    try {
      await initDynamicRouter();
      return next({ path: to.fullPath, replace: true });
    } catch {
      userStore.setToken("");
      return next({ path: LOGIN_URL, replace: true });
    }
  }

  if (isKnownPermissionPath(to.path) && !authStore.flatMenuListGet.some(item => item.path === to.path)) {
    return next({ path: "/403", replace: true });
  }

  // 6.存儲 routerName 做按鈕權限篩選
  authStore.setRouteName(to.name as string);

  // 7.正常存取頁面
  next();
});

/**
 * @description 重設路由
 * */
export const resetRouter = () => {
  const authStore = useAuthStore();
  removeDynamicRoutes();
  authStore.clearAuth();
  authStore.flatMenuListGet.forEach(route => {
    const { name } = route;
    if (name && !STATIC_ROUTE_NAMES.has(name) && router.hasRoute(name)) router.removeRoute(name);
  });
};

/**
 * @description 路由導覽錯誤
 * */
router.onError(error => {
  NProgress.done();
  console.warn("路由錯誤", error.message);
});

/**
 * @description 路由導覽結束
 * */
router.afterEach(() => {
  NProgress.done();
});

export default router;
