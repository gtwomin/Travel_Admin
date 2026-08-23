<template>
  <div class="table-box">
    <ProTable
      ref="proTable"
      :columns="columns"
      :request-api="getTableList"
      :search-col="{ xs: 1, sm: 2, md: 2, lg: 3, xl: 4 }"
    />
    <UserDrawer ref="drawerRef" />
  </div>
</template>

<script setup lang="tsx" name="accountManage">
import { View } from "@element-plus/icons-vue";
import { ElButton, ElTag } from "element-plus";
import { reactive, ref } from "vue";

import { AdminUser } from "@/api/interface";
import { getAdminUserDetail, getAdminUserPage, updateAdminUserStatus } from "@/api/modules/user";
import ProTable from "@/components/ProTable/index.vue";
import { ColumnProps, ProTableInstance } from "@/components/ProTable/interface";
import { useAuthStore } from "@/stores/modules/auth";
import { useHandleData } from "@/hooks/useHandleData";
import UserDrawer from "@/views/proTable/components/UserDrawer.vue";

const authStore = useAuthStore();
const proTable = ref<ProTableInstance>();
const drawerRef = ref<InstanceType<typeof UserDrawer> | null>(null);

const statusOptions = [
  { label: "啟用", value: 1 },
  { label: "停用", value: 0 }
];

const getTableList = (params: AdminUser.AdminUserPageParams) => getAdminUserPage(params);

const openDetail = async (row: AdminUser.AdminUserResponse) => {
  const detail = await getAdminUserDetail(row.id);
  drawerRef.value?.acceptParams({ title: "使用者詳情", isView: true, row: detail });
};

const changeStatusApi = (params: { id: string; status: number }) => updateAdminUserStatus(params.id, params.status);

const changeStatus = async (row: AdminUser.AdminUserResponse) => {
  const nextStatus = row.status === 1 ? 0 : 1;
  await useHandleData(changeStatusApi, { id: row.id, status: nextStatus }, `切換【${row.username}】狀態`);
  proTable.value?.getTableList();
};

const columns = reactive<ColumnProps<AdminUser.AdminUserResponse>[]>([
  {
    prop: "username",
    label: "帳號",
    search: { el: "input", label: "帳號" }
  },
  {
    prop: "nickname",
    label: "暱稱",
    search: { el: "input", label: "暱稱" }
  },
  {
    prop: "email",
    label: "Email",
    search: { el: "input", label: "Email" }
  },
  {
    prop: "status",
    label: "狀態",
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
  { prop: "createdAt", label: "建立時間", width: 180 },
  { prop: "updatedAt", label: "更新時間", width: 180 },
  {
    prop: "operation",
    label: "操作",
    fixed: "right",
    width: 110,
    render: ({ row }) =>
      authStore.hasPermission("ADMIN_USER_DETAIL_READ") ? (
        <ElButton type="primary" link icon={View} onClick={() => openDetail(row)}>
          詳情
        </ElButton>
      ) : null
  }
]);
</script>
