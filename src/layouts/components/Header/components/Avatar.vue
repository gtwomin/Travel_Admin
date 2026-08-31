<template>
  <el-dropdown trigger="click">
    <div class="avatar">
      <el-avatar :size="40" :src="avatarUrl || undefined">
        {{ avatarInitial }}
      </el-avatar>
    </div>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item @click="openDialog('info')">
          <el-icon><User /></el-icon>{{ $t("header.personalData") }}
        </el-dropdown-item>
        <el-dropdown-item @click="openDialog('password')">
          <el-icon><Edit /></el-icon>{{ $t("header.changePassword") }}
        </el-dropdown-item>
        <el-dropdown-item divided :disabled="logoutLoading" @click="logout">
          <el-icon><SwitchButton /></el-icon>{{ $t("header.logout") }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
  <!-- infoDialog -->
  <InfoDialog ref="infoRef"></InfoDialog>
  <!-- passwordDialog -->
  <PasswordDialog ref="passwordRef" @success="handlePasswordChanged"></PasswordDialog>
</template>

<script setup lang="ts">
import axios from "axios";
import { ElMessage, ElMessageBox } from "element-plus";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

import { logoutApi } from "@/api/modules/login";
import { resolveAvatarUrl } from "@/api/modules/user";
import { LOGIN_URL } from "@/config";
import { resetRouter } from "@/routers";
import { useAuthStore } from "@/stores/modules/auth";
import { useKeepAliveStore } from "@/stores/modules/keepAlive";
import { useTabsStore } from "@/stores/modules/tabs";
import { useUserStore } from "@/stores/modules/user";

import InfoDialog from "./InfoDialog.vue";
import PasswordDialog from "./PasswordDialog.vue";

const router = useRouter();
const userStore = useUserStore();
const authStore = useAuthStore();
const tabsStore = useTabsStore();
const keepAliveStore = useKeepAliveStore();
const logoutLoading = ref(false);

const avatarUrl = computed(() => resolveAvatarUrl(authStore.profile?.avatar));
const avatarInitial = computed(() => {
  const username = authStore.profile?.username || authStore.session?.username || "?";
  return Array.from(username)[0] || "?";
});

const clearLocalSession = () => {
  userStore.setToken("");
  authStore.clearAuth();
  resetRouter();
  tabsStore.setTabs([]);
  keepAliveStore.setKeepAliveName([]);
};

// 登出
const logout = async () => {
  if (logoutLoading.value) return;
  logoutLoading.value = true;

  try {
    await ElMessageBox.confirm("您是否確認要登出？", "提示", {
      confirmButtonText: "確定",
      cancelButtonText: "取消",
      type: "warning"
    });
  } catch {
    logoutLoading.value = false;
    return;
  }

  try {
    await logoutApi();
    ElMessage.success("登出成功！");
  } catch (error) {
    if (!axios.isCancel(error)) {
      ElMessage.warning("後端登出未完成，已清除本機登入狀態！");
    }
  } finally {
    clearLocalSession();
    await router.replace(LOGIN_URL);
    logoutLoading.value = false;
  }
};

const handlePasswordChanged = () => {
  clearLocalSession();
  router.replace(LOGIN_URL);
};

// 開啟修改密碼與個人資料彈窗
const infoRef = ref<InstanceType<typeof InfoDialog> | null>(null);
const passwordRef = ref<InstanceType<typeof PasswordDialog> | null>(null);
const openDialog = (dialog: "info" | "password") => {
  if (dialog === "info") infoRef.value?.openDialog();
  if (dialog === "password") passwordRef.value?.openDialog();
};
</script>

<style scoped lang="scss">
.avatar {
  width: 40px;
  height: 40px;
  overflow: hidden;
  cursor: pointer;
  border-radius: 50%;
  img {
    width: 100%;
    height: 100%;
  }
}
</style>
