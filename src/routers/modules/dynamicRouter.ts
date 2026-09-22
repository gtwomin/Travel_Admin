import { ElNotification } from "element-plus";
import { RouteRecordRaw } from "vue-router";

import { LOGIN_URL } from "@/config";
import router from "@/routers/index";
import { useAuthStore } from "@/stores/modules/auth";
import { useKeepAliveStore } from "@/stores/modules/keepAlive";
import { useTabsStore } from "@/stores/modules/tabs";
import { useUserStore } from "@/stores/modules/user";
import mittBus from "@/utils/mittBus";

const modules = import.meta.glob("@/views/**/*.vue");

const DYNAMIC_ROUTE_CATALOG: Menu.MenuOptions[] = [
  {
    path: "/orders",
    name: "orderManage",
    component: "/order/orderManage/index",
    meta: {
      icon: "Tickets",
      title: "訂單管理",
      isHide: false,
      isFull: false,
      isAffix: false,
      isKeepAlive: true,
      requiredPermission: "ADMIN_ORDER_LIST_READ"
    }
  },
  {
    path: "/system",
    name: "system",
    redirect: "/system/accountManage",
    meta: {
      icon: "Tools",
      title: "系統管理",
      isHide: false,
      isFull: false,
      isAffix: false,
      isKeepAlive: false
    },
    children: [
      {
        path: "/system/accountManage",
        name: "accountManage",
        component: "/system/accountManage/index",
        meta: {
          icon: "User",
          title: "帳號管理",
          isHide: false,
          isFull: false,
          isAffix: false,
          isKeepAlive: true,
          requiredPermission: "ADMIN_USER_LIST_READ"
        }
      }
    ]
  },
  {
    path: "/forum",
    name: "forum",
    meta: {
      icon: "ChatDotRound",
      title: "討論區管理",
      isHide: false,
      isFull: false,
      isAffix: false,
      isKeepAlive: false
    },
    children: [
      {
        path: "/forum/postManage",
        name: "postManage",
        component: "/forum/postManage/index",
        meta: {
          icon: "Document",
          title: "貼文管理",
          isHide: false,
          isFull: false,
          isAffix: false,
          isKeepAlive: true,
          requiredPermission: "POST_READ"
        }
      },
      {
        path: "/forum/reportManage",
        name: "reportManage",
        component: "/forum/reportManage/index",
        meta: {
          icon: "Warning",
          title: "檢舉管理",
          isHide: false,
          isFull: false,
          isAffix: false,
          isKeepAlive: true,
          requiredPermission: "ADMIN_REPORT_READ"
        }
      },
      {
        path: "/forum/categoryManage",
        name: "categoryManage",
        component: "/forum/categoryManage/index",
        meta: {
          icon: "CollectionTag",
          title: "分類管理",
          isHide: false,
          isFull: false,
          isAffix: false,
          isKeepAlive: true,
          requiredPermission: "CATEGORY_READ"
        }
      }
    ]
  },
  {
    path: "/order",
    name: "order",
    meta: {
      icon: "Tickets",
      title: "訂單管理",
      isHide: false,
      isFull: false,
      isAffix: false,
      isKeepAlive: false
    },
    children: [
      {
        path: "/order/orderManage",
        name: "orderManage",
        component: "/order/orderManage/index",
        meta: {
          icon: "Document",
          title: "訂單列表",
          isHide: false,
          isFull: false,
          isAffix: false,
          isKeepAlive: true,
          requiredPermission: "ADMIN_ORDER_LIST_READ"
        }
      }
    ]
  },
  {
    path: "/trip",
    name: "trip",
    redirect: "/trip/tripManage",
    meta: {
      icon: "MapLocation",
      title: "行程管理",
      isHide: false,
      isFull: false,
      isAffix: false,
      isKeepAlive: false
    },
    children: [
      {
        path: "/trip/tripManage",
        name: "tripManage",
        component: "/trip/tripManage/index",
        meta: {
          icon: "Guide",
          title: "行程列表",
          isHide: false,
          isFull: false,
          isAffix: false,
          isKeepAlive: true
        }
      }
    ]
  }
];

const dynamicRouteNames = new Set<string>();
let initPromise: Promise<void> | null = null;

const filterRoute = (route: Menu.MenuOptions, hasPermission: (permission?: string) => boolean): Menu.MenuOptions | null => {
  if (route.children?.length) {
    const children = route.children
      .map(child => filterRoute(child, hasPermission))
      .filter((child): child is Menu.MenuOptions => Boolean(child));
    return children.length ? { ...route, redirect: route.redirect || children[0].path, children } : null;
  }
  return hasPermission(route.meta.requiredPermission) ? { ...route } : null;
};

const removeDynamicRoutes = () => {
  dynamicRouteNames.forEach(name => {
    if (router.hasRoute(name)) router.removeRoute(name);
  });
  dynamicRouteNames.clear();
};

const resolveComponent = (route: Menu.MenuOptions): Menu.MenuOptions => ({
  ...route,
  component: typeof route.component === "string" ? modules[`/src/views${route.component}.vue`] : route.component,
  children: route.children?.map(resolveComponent)
});

export const isKnownPermissionPath = (path: string) =>
  DYNAMIC_ROUTE_CATALOG.some(route => route.path === path || route.children?.some(child => child.path === path));

export const initDynamicRouter = async (force = false) => {
  if (initPromise && !force) return initPromise;

  initPromise = (async () => {
    const authStore = useAuthStore();
    const userStore = useUserStore();
    await authStore.syncSession();
    removeDynamicRoutes();

    const dynamicMenus = DYNAMIC_ROUTE_CATALOG.map(route => filterRoute(route, authStore.hasPermission)).filter(
      (route): route is Menu.MenuOptions => Boolean(route)
    );
    authStore.setMenuList([authStore.authMenuListGet[0], ...dynamicMenus]);

    dynamicMenus.map(resolveComponent).forEach(route => {
      router.addRoute("layout", route as unknown as RouteRecordRaw);
      dynamicRouteNames.add(route.name);
    });

    if (!dynamicMenus.length) {
      ElNotification({
        title: "目前無其他功能權限",
        message: "目前帳號僅可使用首頁。",
        type: "info",
        duration: 3000
      });
    }

    if (!userStore.token) router.replace(LOGIN_URL);
  })()
    .catch(error => {
      useAuthStore().clearAuth();
      throw error;
    })
    .finally(() => {
      initPromise = null;
    });

  return initPromise;
};

mittBus.on("admin-token-refreshed", async () => {
  if (!useUserStore().token) return;
  await initDynamicRouter(true);
  const authStore = useAuthStore();
  const authorizedPaths = new Set(authStore.flatMenuListGet.map(item => item.path));
  const tabsStore = useTabsStore();
  const keepAliveStore = useKeepAliveStore();
  tabsStore.setTabs(
    tabsStore.tabsMenuList.filter(tab => {
      const path = tab.path.split("?")[0];
      return !isKnownPermissionPath(path) || authorizedPaths.has(path);
    })
  );
  keepAliveStore.setKeepAliveName(
    keepAliveStore.keepAliveName.filter(name => {
      const path = name.split("?")[0];
      return !isKnownPermissionPath(path) || authorizedPaths.has(path);
    })
  );
  const currentPath = router.currentRoute.value.path;
  if (isKnownPermissionPath(currentPath) && !authorizedPaths.has(currentPath)) {
    await router.replace("/403");
  }
});

export { removeDynamicRoutes };
