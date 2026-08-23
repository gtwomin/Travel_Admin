/**
 * v-auth
 * 按鈕權限指令
 */
import type { Directive, DirectiveBinding } from "vue";

import { useAuthStore } from "@/stores/modules/auth";

const auth: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const { value } = binding;
    const authStore = useAuthStore();
    if (value instanceof Array && value.length) {
      const hasPermission = value.every(item => authStore.hasPermission(item));
      if (!hasPermission) el.remove();
    } else {
      if (!authStore.hasPermission(value)) el.remove();
    }
  }
};

export default auth;
