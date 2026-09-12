<template>
  <div class="table-box">
    <ProTable ref="proTable" :columns="columns" :request-api="getTableList" :pagination="false" :show-column-sort-setting="false">
      <template #tableHeader>
        <ElButton
          v-if="authStore.hasPermission('ADMIN_CATEGORY_CREATE')"
          type="primary"
          :icon="CirclePlus"
          @click="openCreateDialog"
        >
          新增分類
        </ElButton>
      </template>
    </ProTable>
    <CategoryDialog ref="createDialogRef" />
    <CategoryDrawer ref="drawerRef" />
  </div>
</template>

<script setup lang="tsx" name="categoryManage">
import { CirclePlus, Delete, EditPen } from "@element-plus/icons-vue";
import { ElButton, ElMessage, ElMessageBox } from "element-plus";
import { reactive, ref } from "vue";

import { createAdminCategory, deleteAdminCategory, getAdminCategories, updateAdminCategory } from "@/api/modules/forum";
import { AdminForum } from "@/api/interface";
import ProTable from "@/components/ProTable/index.vue";
import { ColumnProps, ProTableInstance } from "@/components/ProTable/interface";
import { useAuthStore } from "@/stores/modules/auth";

import CategoryDialog from "./CategoryDialog.vue";
import CategoryDrawer from "./CategoryDrawer.vue";

const authStore = useAuthStore();
const proTable = ref<ProTableInstance>();
const createDialogRef = ref<InstanceType<typeof CategoryDialog> | null>(null);
const drawerRef = ref<InstanceType<typeof CategoryDrawer> | null>(null);

const getTableList = () => getAdminCategories().then(data => ({ data }));

const refreshTable = () => proTable.value?.getTableList() ?? Promise.resolve();

const openCreateDialog = () => {
  createDialogRef.value?.openDialog({
    api: createAdminCategory,
    getTableList: refreshTable
  });
};

const openEditDrawer = (row: AdminForum.Category) => {
  drawerRef.value?.acceptParams({
    mode: "edit",
    row,
    api: params => updateAdminCategory(row.id, params),
    getTableList: refreshTable
  });
};

const deleteCategory = async (row: AdminForum.Category) => {
  try {
    await ElMessageBox.confirm(`是否刪除分類【${row.name}】？`, "刪除分類", {
      type: "warning",
      confirmButtonText: "刪除",
      cancelButtonText: "取消"
    });
    await deleteAdminCategory(row.id);
    ElMessage.success("分類刪除成功");
    await refreshTable();
  } catch {
    // 取消確認或 API 錯誤由流程自然結束，錯誤訊息由全域攔截器處理。
  }
};

const columns = reactive<ColumnProps<AdminForum.Category>[]>([
  {
    prop: "id",
    label: "分類 ID",
    width: 110,
    align: "center"
  },
  {
    prop: "name",
    label: "分類名稱",
    minWidth: 240,
    showOverflowTooltip: true
  },
  {
    prop: "operation",
    label: "操作",
    fixed: "right",
    width: 170,
    render: ({ row }) => (
      <>
        {authStore.hasPermission("ADMIN_CATEGORY_UPDATE") ? (
          <ElButton type="warning" link icon={EditPen} onClick={() => openEditDrawer(row)}>
            編輯
          </ElButton>
        ) : null}
        {authStore.hasPermission("ADMIN_CATEGORY_DELETE") ? (
          <ElButton type="danger" link icon={Delete} onClick={() => deleteCategory(row)}>
            刪除
          </ElButton>
        ) : null}
      </>
    )
  }
]);
</script>
