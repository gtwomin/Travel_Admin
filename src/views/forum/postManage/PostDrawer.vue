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
          <template v-if="currentRow.content">
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="post-content" v-html="renderedContent"></div>
          </template>
          <span v-else>—</span>
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
import { renderForumContent } from "@/utils/renderForumContent";

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

const renderedContent = computed(() => (currentRow.value ? renderForumContent(currentRow.value.content) : ""));

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
.long-text {
  display: block;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.post-content {
  display: block;
  line-height: 1.7;
  overflow-wrap: anywhere;
  white-space: normal;
}
.post-content :deep(p) {
  margin: 0 0 12px;
}
.post-content :deep(p:last-child) {
  margin-bottom: 0;
}
.post-content :deep(.forum-inline-image) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 12px 0;
  border-radius: 8px;
}
.post-content :deep(.forum-align-center) {
  text-align: center;
}
.post-content :deep(.forum-color-red) {
  color: #dc2626;
}
.post-content :deep(.forum-color-orange) {
  color: #ea580c;
}
.post-content :deep(.forum-color-green) {
  color: #16a34a;
}
.post-content :deep(.forum-color-blue) {
  color: #2563eb;
}
.post-content :deep(.forum-color-purple) {
  color: #9333ea;
}
.post-content :deep(.forum-color-gray) {
  color: #4b5563;
}
.post-content :deep(.forum-font-pmingliu) {
  font-family: PMingLiU, "新細明體", serif;
}
.post-content :deep(.forum-font-mingliu) {
  font-family: MingLiU, "細明體", serif;
}
.post-content :deep(.forum-font-dfkaisb) {
  font-family: DFKai-SB, "標楷體", BiauKai, "Kaiti TC", cursive;
}
.post-content :deep(.forum-font-jhenghei) {
  font-family: "Microsoft JhengHei", "微軟正黑體", sans-serif;
}
.post-content :deep(.forum-font-arial) {
  font-family: Arial, sans-serif;
}
.post-content :deep(.forum-font-arialblack) {
  font-family: "Arial Black", Arial, sans-serif;
}
.post-content :deep(.forum-font-comicsans) {
  font-family: "Comic Sans MS", "Comic Sans", cursive;
}
.post-content :deep(.forum-font-couriernew) {
  font-family: "Courier New", Courier, monospace;
}
.post-content :deep(.forum-font-msmincho) {
  font-family: "MS Mincho", "MS 明朝", serif;
}
.post-content :deep(.forum-font-tahoma) {
  font-family: Tahoma, Geneva, sans-serif;
}
.post-content :deep(.forum-font-timesnewroman) {
  font-family: "Times New Roman", Times, serif;
}
.post-content :deep(.forum-font-verdana) {
  font-family: Verdana, Geneva, sans-serif;
}
.post-content :deep(.forum-size-sm) {
  font-size: var(--el-font-size-small);
}
.post-content :deep(.forum-size-md) {
  font-size: var(--el-font-size-base);
}
.post-content :deep(.forum-size-lg) {
  font-size: var(--el-font-size-large);
}
.post-content :deep(.forum-size-xl) {
  font-size: 1.25rem;
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
