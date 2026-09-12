<template>
  <!-- eslint-disable vue/html-closing-bracket-newline -->
  <el-drawer
    v-model="visible"
    class="report-drawer"
    destroy-on-close
    size="min(640px, 100vw)"
    title="檢舉詳情"
    :close-on-click-modal="!loading"
    :close-on-press-escape="!loading"
    :show-close="!loading"
  >
    <template v-if="row">
      <el-divider content-position="left">檢舉資訊</el-divider>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="檢舉 ID">{{ row.id }}</el-descriptions-item>
        <el-descriptions-item label="原因"
          ><el-tag class="reason-tag" type="info">{{ reasonLabels[row.reason] }}</el-tag></el-descriptions-item
        >
        <el-descriptions-item label="狀態"
          ><el-tag :type="statusTypes[row.status]">{{ statusLabels[row.status] }}</el-tag></el-descriptions-item
        >
        <el-descriptions-item label="檢舉人"
          ><div class="user-cell">
            <el-avatar :size="32" :src="row.reporter?.avatar ? resolveAvatarUrl(row.reporter.avatar) : undefined">{{
              avatarText(row.reporter)
            }}</el-avatar
            ><span>{{ userName(row.reporter) }}</span>
          </div></el-descriptions-item
        >
        <el-descriptions-item label="檢舉時間">{{ formatTaipeiDateTime(row.createAt) }}</el-descriptions-item>
      </el-descriptions>
      <el-divider content-position="left">被檢舉內容</el-divider>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="類型">{{ row.target.type === "POST" ? "貼文" : "留言" }}</el-descriptions-item>
        <el-descriptions-item :label="row.target.type === 'POST' ? '文章 ID' : '留言 ID'">{{
          row.target.id
        }}</el-descriptions-item>
        <el-descriptions-item :label="row.target.type === 'POST' ? '作者' : '留言者'"
          ><div class="user-cell">
            <el-avatar :size="32" :src="row.target.author?.avatar ? resolveAvatarUrl(row.target.author.avatar) : undefined">{{
              avatarText(row.target.author)
            }}</el-avatar
            ><span>{{ userName(row.target.author) }}</span>
          </div></el-descriptions-item
        >
        <el-descriptions-item v-if="row.target.type === 'POST'" label="標題"
          ><strong class="long-text">{{ row.target.title || "—" }}</strong></el-descriptions-item
        >
        <template v-else>
          <el-descriptions-item label="所屬文章"
            ><span class="long-text">{{ row.target.parentPost?.title || "—" }}</span></el-descriptions-item
          >
          <el-descriptions-item label="所屬文章 ID">{{ row.target.parentPost?.id ?? "—" }}</el-descriptions-item>
        </template>
        <el-descriptions-item label="建立時間">{{ formatTaipeiDateTime(row.target.createAt) }}</el-descriptions-item>
        <el-descriptions-item label="完整內容"
          ><span class="long-text">{{ row.target.content || "—" }}</span></el-descriptions-item
        >
      </el-descriptions>
      <template v-if="canProcess">
        <el-divider content-position="left">處理操作</el-divider>
        <p>完成後無法再次修改處理結果。</p>
        <div class="process-actions">
          <el-button type="danger" plain :loading="loading" :disabled="loading" @click="process('REJECTED')">駁回檢舉</el-button>
          <el-button type="primary" :loading="loading" :disabled="loading" @click="process('REVIEWED')">標記已處理</el-button>
        </div>
      </template>
    </template>
    <template #footer><el-button :disabled="loading" @click="visible = false">關閉</el-button></template>
  </el-drawer>
  <!-- eslint-enable vue/html-closing-bracket-newline -->
</template>

<script setup lang="ts" name="ReportDrawer">
import { computed, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { AdminForum } from "@/api/interface";
import { updateAdminReportStatus } from "@/api/modules/forum";
import { resolveAvatarUrl } from "@/api/modules/user";
import { useAuthStore } from "@/stores/modules/auth";
import { formatTaipeiDateTime } from "@/utils/dateFormat";
const emit = defineEmits<{ processed: [] }>();
const authStore = useAuthStore();
const visible = ref(false);
const loading = ref(false);
const row = ref<AdminForum.AdminReportResponse | null>(null);
const reasonLabels: Record<AdminForum.ReportReason, string> = {
  MISINFORMATION: "不實資訊",
  SPAM: "垃圾訊息／廣告",
  HARASSMENT: "騷擾或謾罵",
  SCAM_OR_ILLEGAL: "詐騙或非法交易",
  PRIVACY_VIOLATION: "未經同意公開他人私人資訊或內容",
  ADULT_CONTENT: "不雅／成人內容"
};
const statusLabels = { PENDING: "待處理", REVIEWED: "已處理", REJECTED: "已駁回" };
const statusTypes = { PENDING: "warning", REVIEWED: "success", REJECTED: "info" } as const;
const userName = (user: AdminForum.UserSummary | null) => user?.nickname || (user ? "—" : "未知使用者");
const avatarText = (user: AdminForum.UserSummary | null) => user?.nickname?.slice(0, 1) || (user ? "—" : "未");
const canProcess = computed(() => row.value?.status === "PENDING" && authStore.hasPermission("ADMIN_REPORT_STATUS_UPDATE"));
const acceptParams = (report: AdminForum.AdminReportResponse) => {
  if (loading.value) return;
  row.value = report;
  visible.value = true;
};
const process = async (status: AdminForum.AdminReportStatusParams["status"]) => {
  if (loading.value || !canProcess.value || !row.value) return;
  loading.value = true;
  const reportId = row.value.id;
  try {
    await ElMessageBox.confirm(
      `${status === "REVIEWED" ? "確定將此檢舉標記為已處理" : "確定駁回此檢舉"}？完成後無法再次修改處理結果。`,
      "確認處理檢舉",
      { type: "warning", confirmButtonText: "確認", cancelButtonText: "取消" }
    );
    if (!canProcess.value) return;
    await updateAdminReportStatus(reportId, { status });
    ElMessage.success(status === "REVIEWED" ? "檢舉已標記為已處理" : "檢舉已駁回");
    visible.value = false;
    emit("processed");
  } catch {
    /* 取消確認不提示；API 錯誤由全域攔截器顯示。 */
  } finally {
    loading.value = false;
  }
};
defineExpose({ acceptParams });
</script>

<style scoped lang="scss">
.long-text {
  display: block;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.user-cell {
  display: flex;
  gap: 8px;
  align-items: center;
  overflow-wrap: anywhere;
}
.user-cell .el-avatar {
  flex-shrink: 0;
}
.reason-tag {
  height: auto;
  line-height: 1.5;
  white-space: normal;
}
.process-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.process-actions .el-button {
  margin-left: 0;
}
.report-drawer :deep(.el-drawer__body) {
  min-width: 0;
  overflow-x: hidden;
}
</style>
