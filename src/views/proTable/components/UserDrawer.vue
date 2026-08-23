<template>
  <el-drawer v-model="drawerVisible" :destroy-on-close="true" size="450px" :title="drawerProps.title">
    <el-descriptions :column="1" border>
      <el-descriptions-item label="頭像">
        <el-avatar :size="64" :src="drawerProps.row.avatar || undefined">
          {{ drawerProps.row.username?.slice(0, 1) }}
        </el-avatar>
      </el-descriptions-item>
      <el-descriptions-item label="帳號">{{ drawerProps.row.username || "—" }}</el-descriptions-item>
      <el-descriptions-item label="暱稱">{{ drawerProps.row.nickname || "—" }}</el-descriptions-item>
      <el-descriptions-item label="Email">{{ drawerProps.row.email || "—" }}</el-descriptions-item>
      <el-descriptions-item label="狀態">
        <el-tag :type="drawerProps.row.status === 1 ? 'success' : 'danger'">
          {{ drawerProps.row.status === 1 ? "啟用" : "停用" }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="建立時間">{{ drawerProps.row.createdAt || "—" }}</el-descriptions-item>
      <el-descriptions-item label="更新時間">{{ drawerProps.row.updatedAt || "—" }}</el-descriptions-item>
    </el-descriptions>
    <template #footer>
      <el-button @click="drawerVisible = false">關閉</el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts" name="UserDrawer">
import { ref } from "vue";

import { AdminUser } from "@/api/interface";

interface DrawerProps {
  title: string;
  isView?: boolean;
  row: Partial<AdminUser.AdminUserResponse>;
}

const drawerVisible = ref(false);
const drawerProps = ref<DrawerProps>({ title: "使用者詳情", row: {} });

const acceptParams = (params: DrawerProps) => {
  drawerProps.value = params;
  drawerVisible.value = true;
};

defineExpose({ acceptParams });
</script>
