<template>
  <el-dropdown trigger="click">
    <div class="avatar">
      <img src="@/assets/images/avatar.gif" alt="avatar" />
    </div>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item @click="openDialog('infoRef')">
          <el-icon><User /></el-icon>{{ $t("header.personalData") }}
        </el-dropdown-item>
        <el-dropdown-item @click="openDialog('passwordRef')">
          <el-icon><Edit /></el-icon>{{ $t("header.changePassword") }}
        </el-dropdown-item>
        <el-dropdown-item divided @click="logout">
          <el-icon><SwitchButton /></el-icon>{{ $t("header.logout") }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
  <!-- infoDialog -->
  <InfoDialog ref="infoRef"></InfoDialog>
  <!-- passwordDialog -->
  <PasswordDialog ref="passwordRef"></PasswordDialog>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { ref } from "vue";
import { useRouter } from "vue-router";

import { logoutApi } from "@/api/modules/login";
import { LOGIN_URL } from "@/config";
import { resetRouter } from "@/routers";
import { useKeepAliveStore } from "@/stores/modules/keepAlive";
import { useTabsStore } from "@/stores/modules/tabs";
import { useUserStore } from "@/stores/modules/user";

import InfoDialog from "./InfoDialog.vue";
import PasswordDialog from "./PasswordDialog.vue";

const router = useRouter();
const userStore = useUserStore();
const tabsStore = useTabsStore();
const keepAliveStore = useKeepAliveStore();

// 登出
const logout = () => {
  ElMessageBox.confirm("您是否確認要登出？", "溫馨提示", {
    confirmButtonText: "確定",
    cancelButtonText: "取消",
    type: "warning"
  }).then(async () => {
    try {
      await logoutApi();
      ElMessage.success("登出成功！");
    } catch {
      ElMessage.warning("後端登出未完成，已清除本機登入狀態！");
    } finally {
      userStore.setToken("");
      resetRouter();
      tabsStore.setTabs([]);
      keepAliveStore.setKeepAliveName([]);
      router.replace(LOGIN_URL);
    }
  });
};

// 開啟修改密碼與個人資料彈窗
const infoRef = ref<InstanceType<typeof InfoDialog> | null>(null);
const passwordRef = ref<InstanceType<typeof PasswordDialog> | null>(null);
const openDialog = (ref: string) => {
  if (ref == "infoRef") infoRef.value?.openDialog();
  if (ref == "passwordRef") passwordRef.value?.openDialog();
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
