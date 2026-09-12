<template>
  <el-drawer v-model="drawerVisible" class="post-drawer" :destroy-on-close="true" size="min(560px, 100vw)" title="貼文詳情">
    <template v-if="currentRow">
      <el-divider class="detail-divider" content-position="left">基本資料</el-divider>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="文章 ID">{{ currentRow.id }}</el-descriptions-item>
        <el-descriptions-item label="狀態">
          <el-tag :type="statusTagType(currentRow.status)">{{ statusLabel(currentRow.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="標題">
          <span class="long-text">{{ currentRow.title || "—" }}</span>
        </el-descriptions-item>
      </el-descriptions>

      <el-divider class="detail-divider" content-position="left">文章內容</el-divider>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="完整內容">
          <span class="post-content">{{ currentRow.content || "—" }}</span>
        </el-descriptions-item>
      </el-descriptions>

      <el-divider class="detail-divider" content-position="left">發布資訊</el-divider>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="作者">
          <div class="author-cell">
            <el-avatar v-if="currentRow.author?.avatar" :size="32" :src="resolveAvatarUrl(currentRow.author.avatar)">
              {{ authorAvatarText }}
            </el-avatar>
            <el-avatar v-else :size="32">{{ authorAvatarText }}</el-avatar>
            <span>{{ authorName }}</span>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="分類">{{ currentRow.categoryName || "未分類" }}</el-descriptions-item>
        <el-descriptions-item label="瀏覽數">{{ currentRow.viewCount }}</el-descriptions-item>
      </el-descriptions>

      <el-divider class="detail-divider" content-position="left">系統資訊</el-divider>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="發布時間">{{ formatTaipeiDateTime(currentRow.createAt) }}</el-descriptions-item>
        <el-descriptions-item label="更新時間">{{ formatTaipeiDateTime(currentRow.updateTime) }}</el-descriptions-item>
      </el-descriptions>
    </template>

    <template #footer>
      <el-button @click="drawerVisible = false">關閉</el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts" name="PostDrawer">
import { computed, ref } from "vue";

import { AdminForum } from "@/api/interface";
import { resolveAvatarUrl } from "@/api/modules/user";
import { formatTaipeiDateTime } from "@/utils/dateFormat";

const statusOptions: Array<{ label: string; value: AdminForum.PostStatus; tagType: "success" | "info" }> = [
  { label: "上架中", value: "ACTIVE", tagType: "success" },
  { label: "已下架", value: "INACTIVE", tagType: "info" }
];

const drawerVisible = ref(false);
const currentRow = ref<AdminForum.AdminPostResponse | null>(null);

const statusLabel = (status: AdminForum.PostStatus) => statusOptions.find(option => option.value === status)?.label ?? "—";

const statusTagType = (status: AdminForum.PostStatus): "success" | "info" =>
  statusOptions.find(option => option.value === status)?.tagType ?? "info";

const authorName = computed(() => {
  if (!currentRow.value?.author) return "未知使用者";
  return currentRow.value.author.nickname || "—";
});

const authorAvatarText = computed(() => {
  if (!currentRow.value?.author) return "未";
  return currentRow.value.author.nickname?.slice(0, 1) || "—";
});

const acceptParams = (row: AdminForum.AdminPostResponse) => {
  currentRow.value = row;
  drawerVisible.value = true;
};

defineExpose({ acceptParams });
</script>

<style scoped lang="scss">
.detail-divider :deep(.el-divider__text.is-left) {
  left: 0;
  padding: 0 12px;
}
.long-text,
.post-content {
  display: block;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.author-cell {
  display: flex;
  gap: 8px;
  align-items: center;
}
.post-drawer :deep(.el-drawer__body) {
  min-width: 0;
  overflow-x: hidden;
}
</style>
