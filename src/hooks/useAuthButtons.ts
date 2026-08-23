import { computed } from "vue";
import { useAuthStore } from "@/stores/modules/auth";

/**
 * @description 頁面按鈕權限
 * */
export const useAuthButtons = () => {
  const authStore = useAuthStore();
  const BUTTONS = computed(() => {
    const currentPageAuthButton: { [key: string]: boolean } = {};
    authStore.permissions.forEach(item => (currentPageAuthButton[item] = true));
    return currentPageAuthButton;
  });

  return {
    BUTTONS
  };
};
