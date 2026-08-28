import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { Login, Profile } from "@/api/interface";
import { getAdminProfileApi } from "@/api/modules/profile";
import { getAdminSessionApi } from "@/api/modules/login";
import { getAllBreadcrumbList, getFlatMenuList, getShowMenuList } from "@/utils";

export const useAuthStore = defineStore("geeker-auth", () => {
  const homeMenu: Menu.MenuOptions = {
    path: "/home/index",
    name: "home",
    component: "/home/index",
    meta: {
      icon: "HomeFilled",
      title: "首頁",
      isLink: "",
      isHide: false,
      isFull: false,
      isAffix: true,
      isKeepAlive: true
    }
  };
  // 按鈕權限列表
  const authButtonList = ref<{ [key: string]: string[] }>({});
  const session = ref<Login.AdminSessionResponse | null>(null);
  const profile = ref<Profile.AdminProfileResponse | null>(null);
  const profileLoading = ref(false);
  const profileLoaded = ref(false);
  let profilePromise: Promise<Profile.AdminProfileResponse | null> | null = null;
  const permissions = ref<string[]>([]);
  const initialized = ref(false);
  // 選單權限列表
  const authMenuList = ref<Menu.MenuOptions[]>([homeMenu]);
  // 目前頁面的 router name，用於按鈕權限篩選
  const routeName = ref<string>("");

  // 按鈕權限列表
  const authButtonListGet = computed(() => authButtonList.value);
  const permissionsGet = computed(() => permissions.value);
  // 選單權限列表 ==> 此處的選單尚未經過任何處理
  const authMenuListGet = computed(() => authMenuList.value);
  // 選單權限列表 ==> 左側選單渲染，需要移除 isHide == true 的選單
  const showMenuListGet = computed(() => getShowMenuList(authMenuList.value));
  // 選單權限列表 ==> 扁平化後的一維選單，主要用來新增動態路由
  const flatMenuListGet = computed(() => getFlatMenuList(authMenuList.value));
  // 遞迴處理後的所有麵包屑導覽列表
  const breadcrumbListGet = computed(() => getAllBreadcrumbList(authMenuList.value));

  const hasPermission = (permission?: string) => !permission || permissions.value.includes(permission);

  const setSession = (newSession: Login.AdminSessionResponse) => {
    session.value = newSession;
    permissions.value = [...new Set(newSession.permissions)].sort();
    authButtonList.value = { "*": permissions.value };
    initialized.value = true;
  };

  const syncSession = async () => {
    const currentSession = await getAdminSessionApi();
    setSession(currentSession);
    await loadProfile();
    return currentSession;
  };

  const setProfile = (newProfile: Profile.AdminProfileResponse | null) => {
    profile.value = newProfile;
    profileLoaded.value = Boolean(newProfile);
  };

  const loadProfile = async (force = false) => {
    if (!force && profileLoaded.value && profile.value) return profile.value;
    if (profilePromise) return profilePromise;

    profileLoading.value = true;
    profilePromise = getAdminProfileApi()
      .then(currentProfile => {
        setProfile(currentProfile);
        return currentProfile;
      })
      .catch(() => {
        profile.value = null;
        profileLoaded.value = false;
        return null;
      })
      .finally(() => {
        profileLoading.value = false;
        profilePromise = null;
      });

    return profilePromise;
  };

  const setMenuList = (menus: Menu.MenuOptions[]) => {
    authMenuList.value = menus;
  };

  const clearAuth = () => {
    session.value = null;
    profile.value = null;
    profileLoaded.value = false;
    permissions.value = [];
    authButtonList.value = {};
    initialized.value = false;
    authMenuList.value = [homeMenu];
  };

  // Set RouteName
  const setRouteName = async (name: string) => {
    routeName.value = name;
  };

  return {
    authButtonList,
    session,
    permissions,
    profile,
    profileLoading,
    profileLoaded,
    initialized,
    authMenuList,
    routeName,
    authButtonListGet,
    permissionsGet,
    authMenuListGet,
    showMenuListGet,
    flatMenuListGet,
    breadcrumbListGet,
    hasPermission,
    syncSession,
    loadProfile,
    setProfile,
    setSession,
    setMenuList,
    clearAuth,
    setRouteName
  };
});
