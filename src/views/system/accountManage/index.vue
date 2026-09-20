<template>
  <div class="table-box">
    <ProTable
      ref="proTable"
      :columns="columns"
      :request-api="getTableList"
      :server-sort="true"
      :show-column-sort-setting="false"
      :default-sort="{ prop: 'createdAt', order: 'descending' }"
      :search-col="{ xs: 1, sm: 2, md: 2, lg: 3, xl: 4 }"
    />
    <UserDrawer ref="drawerRef" @view-orders="viewUserOrders" />
  </div>
</template>

<script setup lang="tsx" name="accountManage">
import { EditPen, View } from "@element-plus/icons-vue";
import { ElButton, ElTag } from "element-plus";
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { AdminUser } from "@/api/interface";
import { getAdminUserDetail, getAdminUserPage, updateAdminUserProfile, updateAdminUserStatus } from "@/api/modules/user";
import ProTable from "@/components/ProTable/index.vue";
import { ColumnProps, ProTableInstance } from "@/components/ProTable/interface";
import { useAuthStore } from "@/stores/modules/auth";
import { useHandleData } from "@/hooks/useHandleData";
import { formatTaipeiDateTime } from "@/utils/dateFormat";
import UserDrawer from "@/views/proTable/components/UserDrawer.vue";

const authStore = useAuthStore();
const router = useRouter();
const proTable = ref<ProTableInstance>();
const drawerRef = ref<InstanceType<typeof UserDrawer> | null>(null);

const statusOptions = [
  { label: "啟用", value: 1 },
  { label: "停用", value: 0 }
];

const getTableList = (params: AdminUser.AdminUserPageParams) => getAdminUserPage(params);

const openDetail = async (row: AdminUser.AdminUserSummaryResponse) => {
  const detail = await getAdminUserDetail(row.id);
  drawerRef.value?.acceptParams({ title: "使用者詳情", mode: "view", row: detail });
};

const viewUserOrders = (userId: string) => {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) return;

  void router.push({
    name: "orderManage",
    query: { userId: normalizedUserId }
  });
};

const openEdit = async (row: AdminUser.AdminUserSummaryResponse) => {
  const detail = await getAdminUserDetail(row.id);
  drawerRef.value?.acceptParams({
    title: "編輯使用者",
    mode: "edit",
    row: detail,
    api: params => updateAdminUserProfile(row.id, params),
    getTableList: async () => proTable.value?.getTableList()
  });
};

const changeStatusApi = (params: { id: string; status: number }) => updateAdminUserStatus(params.id, params.status);

const changeStatus = async (row: AdminUser.AdminUserSummaryResponse) => {
  const nextStatus = row.status === 1 ? 0 : 1;
  await useHandleData(changeStatusApi, { id: row.id, status: nextStatus }, `切換【${row.username}】狀態`);
  proTable.value?.getTableList();
};

const columns = reactive<ColumnProps<AdminUser.AdminUserSummaryResponse>[]>([
  {
    prop: "username",
    label: "帳號",
    sortable: "custom",
    search: { el: "input", label: "帳號" }
  },
  {
    prop: "nickname",
    label: "暱稱",
    sortable: "custom",
    search: { el: "input", label: "暱稱" }
  },
  {
    prop: "email",
    label: "Email",
    sortable: "custom",
    search: { el: "input", label: "Email" }
  },
  {
    prop: "status",
    label: "狀態",
    sortable: "custom",
    enum: statusOptions,
    search: { el: "select", label: "狀態" },
    render: ({ row }) =>
      authStore.hasPermission("ADMIN_USER_STATUS_UPDATE") ? (
        <el-switch
          model-value={row.status}
          active-value={1}
          inactive-value={0}
          active-text="啟用"
          inactive-text="停用"
          onChange={() => changeStatus(row)}
        />
      ) : (
        <ElTag type={row.status === 1 ? "success" : "danger"}>{row.status === 1 ? "啟用" : "停用"}</ElTag>
      )
  },
  {
    prop: "createdAt",
    label: "建立時間",
    width: 180,
    sortable: "custom",
    render: ({ row }) => formatTaipeiDateTime(row.createdAt)
  },
  {
    prop: "updatedAt",
    label: "更新時間",
    width: 180,
    sortable: "custom",
    render: ({ row }) => formatTaipeiDateTime(row.updatedAt)
  },
  {
    prop: "operation",
    label: "操作",
    fixed: "right",
    width: 170,
    render: ({ row }) =>
      authStore.hasPermission("ADMIN_USER_DETAIL_READ") ? (
        <>
          <ElButton type="primary" link icon={View} onClick={() => openDetail(row)}>
            詳情
          </ElButton>
          {authStore.hasPermission("ADMIN_USER_PROFILE_UPDATE") ? (
            <ElButton type="warning" link icon={EditPen} onClick={() => openEdit(row)}>
              編輯
            </ElButton>
          ) : null}
        </>
      ) : null
  }
]);
</script>
