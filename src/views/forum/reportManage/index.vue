<template>
  <div class="table-box report-manage">
    <el-tabs v-model="activeStatus" @tab-change="changeStatus">
      <el-tab-pane
        v-for="tab in statusOptions"
        :key="tab.value"
        :name="tab.value"
        :label="`${tab.label} ${summary[tab.count]}`"
      />
    </el-tabs>
    <ProTable
      ref="proTable"
      :columns="columns"
      :request-api="getTableList"
      :show-column-sort-setting="false"
      :search-col="{ xs: 1, sm: 2, md: 2, lg: 2, xl: 2 }"
    />
    <ReportDrawer ref="drawer" @processed="refresh" />
  </div>
</template>

<script setup lang="tsx" name="reportManage">
import { onActivated, onMounted, reactive, ref } from "vue";
import { ElAvatar, ElButton, ElTag } from "element-plus";
import { AdminForum } from "@/api/interface";
import { getAdminReportPage, getAdminReportSummary } from "@/api/modules/forum";
import { resolveAvatarUrl } from "@/api/modules/user";
import ProTable from "@/components/ProTable/index.vue";
import { ColumnProps, ProTableInstance } from "@/components/ProTable/interface";
import { formatTaipeiDateTime } from "@/utils/dateFormat";
import ReportDrawer from "./ReportDrawer.vue";

const proTable = ref<ProTableInstance>();
const drawer = ref<InstanceType<typeof ReportDrawer>>();
const activeStatus = ref<AdminForum.ReportStatus>("PENDING");
const summary = reactive<AdminForum.AdminReportSummary>({ pending: 0, reviewed: 0, rejected: 0 });
const statusOptions = [
  { value: "PENDING", label: "待處理", count: "pending", tagType: "warning" },
  { value: "REVIEWED", label: "已處理", count: "reviewed", tagType: "success" },
  { value: "REJECTED", label: "已駁回", count: "rejected", tagType: "info" }
] as const;
const reasons = [
  { value: "MISINFORMATION", label: "不實資訊" },
  { value: "SPAM", label: "垃圾訊息／廣告" },
  { value: "HARASSMENT", label: "騷擾或謾罵" },
  { value: "SCAM_OR_ILLEGAL", label: "詐騙或非法交易" },
  { value: "PRIVACY_VIOLATION", label: "未經同意公開他人私人資訊或內容" },
  { value: "ADULT_CONTENT", label: "不雅／成人內容" }
];
const renderUser = (user: AdminForum.UserSummary | null) => (
  <div class="user-cell">
    <ElAvatar size={32} src={user?.avatar ? resolveAvatarUrl(user.avatar) : undefined}>
      {user?.nickname?.slice(0, 1) || (user ? "—" : "未")}
    </ElAvatar>
    <span>{user?.nickname || (user ? "—" : "未知使用者")}</span>
  </div>
);
const columns = reactive<ColumnProps<AdminForum.AdminReportResponse>[]>([
  { prop: "id", label: "檢舉 ID", width: 100 },
  {
    prop: "target",
    label: "被檢舉內容",
    minWidth: 340,
    showOverflowTooltip: false,
    search: { el: "select", key: "targetType", label: "內容類型", props: { placeholder: "全部" } },
    enum: [
      { value: "POST", label: "貼文" },
      { value: "COMMENT", label: "留言" }
    ],
    render: ({ row }) => (
      <div class="target-cell">
        <div>
          <ElTag type="info" size="small">
            {row.target.type === "POST" ? "貼文" : "留言"}
          </ElTag>
        </div>
        {row.target.type === "POST" && <strong class="target-title">{row.target.title}</strong>}
        <div class="content-summary">{row.target.content || "—"}</div>
        {row.target.type === "COMMENT" && <div class="parent-title">所屬文章：{row.target.parentPost?.title || "—"}</div>}
      </div>
    )
  },
  { prop: "target.author", label: "被檢舉者", minWidth: 150, render: ({ row }) => renderUser(row.target.author) },
  { prop: "reporter", label: "檢舉人", minWidth: 150, render: ({ row }) => renderUser(row.reporter) },
  {
    prop: "reason",
    label: "檢舉原因",
    minWidth: 200,
    enum: reasons,
    search: { el: "select", props: { placeholder: "全部" } },
    render: ({ row }) => (
      <ElTag class="reason-tag" type="info">
        {reasons.find(reason => reason.value === row.reason)?.label || "—"}
      </ElTag>
    )
  },
  {
    prop: "status",
    label: "狀態",
    width: 110,
    render: ({ row }) => {
      const option = statusOptions.find(tab => tab.value === row.status);
      return <ElTag type={option?.tagType}>{option?.label || "—"}</ElTag>;
    }
  },
  { prop: "createAt", label: "檢舉時間", width: 190, render: ({ row }) => formatTaipeiDateTime(row.createAt) },
  {
    prop: "operation",
    label: "操作",
    width: 100,
    fixed: "right",
    render: ({ row }) => (
      <ElButton link type="primary" onClick={() => drawer.value?.acceptParams(row)}>
        {row.status === "PENDING" ? "審核" : "查看"}
      </ElButton>
    )
  }
]);
const getTableList = (params: AdminForum.AdminReportPageParams) => getAdminReportPage({ ...params, status: activeStatus.value });
const loadSummary = async () => {
  try {
    Object.assign(summary, await getAdminReportSummary());
  } catch {
    /* 錯誤由全域攔截器顯示。 */
  }
};
const refresh = async () => {
  await Promise.all([proTable.value?.getTableList(), loadSummary()]);
};
const changeStatus = () => {
  if (proTable.value) proTable.value.pageable.pageNum = 1;
  void proTable.value?.getTableList();
};
onMounted(loadSummary);
let hasActivatedOnce = false;
onActivated(() => {
  if (!hasActivatedOnce) {
    hasActivatedOnce = true;
    return;
  }
  void refresh();
});
</script>

<style scoped lang="scss">
.report-manage {
  min-width: 0;
}
.report-manage > .el-tabs {
  flex-shrink: 0;
}
:deep(.target-cell) {
  display: grid;
  gap: 4px;
  min-width: 0;
  text-align: left;
}
:deep(.target-title),
:deep(.parent-title) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
:deep(.content-summary) {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  color: var(--el-text-color-secondary);
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
}
:deep(.parent-title) {
  color: var(--el-text-color-secondary);
}
:deep(.user-cell) {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}
:deep(.user-cell .el-avatar) {
  flex-shrink: 0;
}
:deep(.user-cell span:last-child) {
  overflow-wrap: anywhere;
}
:deep(.reason-tag) {
  height: auto;
  line-height: 1.5;
  text-align: left;
  white-space: normal;
}
</style>
