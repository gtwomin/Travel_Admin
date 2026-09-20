<template>
  <div class="table-box post-manage">
    <ProTable
      ref="proTable"
      :columns="columns"
      :request-api="getTableList"
      :show-column-sort-setting="false"
      :search-col="{ xs: 1, sm: 2, md: 2, lg: 3, xl: 4 }"
    />
    <PostDrawer ref="drawerRef" />
  </div>
</template>

<script setup lang="tsx" name="postManage">
import { Delete, View } from "@element-plus/icons-vue";
import { ElButton, ElMessage, ElMessageBox, ElTag } from "element-plus";
import { onActivated, onMounted, reactive, ref } from "vue";

import { AdminForum } from "@/api/interface";
import { getAdminCategories, getAdminPostPage, unpublishAdminPost } from "@/api/modules/forum";
import { resolveAvatarUrl } from "@/api/modules/user";
import ProTable from "@/components/ProTable/index.vue";
import { ColumnProps, ProTableInstance, SearchRenderScope } from "@/components/ProTable/interface";
import { useAuthStore } from "@/stores/modules/auth";
import { formatTaipeiDateTime } from "@/utils/dateFormat";

import PostDrawer from "./PostDrawer.vue";

const authStore = useAuthStore();
const proTable = ref<ProTableInstance>();
const drawerRef = ref<InstanceType<typeof PostDrawer> | null>(null);
const categoryOptions = ref<AdminForum.Category[]>([]);
const categoryLookupDisabled = ref(!authStore.hasPermission("CATEGORY_READ"));
const unpublishingPostId = ref<number | null>(null);
let hasActivatedOnce = false;

const statusOptions: Array<{ label: string; value: AdminForum.PostStatus; tagType: "success" | "info" }> = [
  { label: "上架中", value: "ACTIVE", tagType: "success" },
  { label: "已下架", value: "INACTIVE", tagType: "info" }
];

const statusLabel = (status: AdminForum.PostStatus) => statusOptions.find(option => option.value === status)?.label ?? "—";

const statusTagType = (status: AdminForum.PostStatus) => statusOptions.find(option => option.value === status)?.tagType ?? "info";

const renderAuthor = (author: AdminForum.UserSummary | null) => {
  const nickname = author?.nickname || (author ? "—" : "未知使用者");
  const avatarText = author?.nickname?.slice(0, 1) || (author ? "—" : "未");
  const avatar = author?.avatar ? (
    <el-avatar size={32} src={resolveAvatarUrl(author.avatar)}>
      {avatarText}
    </el-avatar>
  ) : (
    <el-avatar size={32}>{avatarText}</el-avatar>
  );

  return (
    <div class="author-cell">
      {avatar}
      <span class="author-name" title={nickname}>
        {nickname}
      </span>
    </div>
  );
};

const handleKeywordKeydown = (event: KeyboardEvent) => {
  if (event.key !== "Enter") return;

  event.preventDefault();
  proTable.value?.search();
};

const renderKeywordSearch = ({ searchParam, placeholder, clearable }: SearchRenderScope) => (
  <el-input vModel_trim={searchParam.keyword} clearable={clearable} placeholder={placeholder} onKeydown={handleKeywordKeydown} />
);

const renderCategorySearch = ({ searchParam, placeholder, clearable }: SearchRenderScope) => (
  <el-select
    vModel={searchParam.categoryId}
    class="category-select"
    clearable={clearable}
    disabled={categoryLookupDisabled.value}
    placeholder={placeholder}
  >
    {categoryOptions.value.map(category => (
      <el-option key={category.id} label={category.name} value={category.id} />
    ))}
  </el-select>
);

type StatusSearchValue = "ALL" | AdminForum.PostStatus;

const statusSearchOptions: Array<{ label: string; value: StatusSearchValue }> = [
  { label: "全部", value: "ALL" },
  ...statusOptions.map(({ label, value }) => ({ label, value }))
];

const renderStatusSearch = ({ searchParam, placeholder, clearable }: SearchRenderScope) => (
  <el-select
    modelValue={searchParam.status ?? "ALL"}
    clearable={clearable}
    placeholder={placeholder}
    onChange={(value: StatusSearchValue) => {
      searchParam.status = value === "ALL" ? undefined : value;
    }}
  >
    {statusSearchOptions.map(option => (
      <el-option key={option.value} label={option.label} value={option.value} />
    ))}
  </el-select>
);

const getTableList = (params: AdminForum.AdminPostPageParams) => {
  const searchParam = proTable.value?.searchParam;
  if (!searchParam || searchParam.status !== undefined) return getAdminPostPage(params);

  const requestParams = { ...params };
  delete requestParams.status;
  return getAdminPostPage(requestParams);
};

const openDetail = (row: AdminForum.AdminPostResponse) => {
  drawerRef.value?.acceptParams(row);
};

const unpublishPost = async (row: AdminForum.AdminPostResponse) => {
  if (unpublishingPostId.value !== null || row.status !== "ACTIVE" || !authStore.hasPermission("ADMIN_POST_DELETE")) {
    return;
  }

  unpublishingPostId.value = row.id;
  try {
    await ElMessageBox.confirm(`是否下架文章【${row.title || row.id}】？`, "下架文章", {
      type: "warning",
      confirmButtonText: "下架",
      cancelButtonText: "取消"
    });
    await unpublishAdminPost(row.id);
    ElMessage.success("文章下架成功");
    await proTable.value?.getTableList();
  } catch {
    // 取消確認或 API 錯誤由流程自然結束，錯誤訊息由全域攔截器處理。
  } finally {
    unpublishingPostId.value = null;
  }
};

const loadCategories = async () => {
  if (!authStore.hasPermission("CATEGORY_READ")) return;

  try {
    categoryOptions.value = await getAdminCategories();
    categoryLookupDisabled.value = false;
  } catch {
    categoryLookupDisabled.value = true;
  }
};

const columns = reactive<ColumnProps<AdminForum.AdminPostResponse>[]>([
  {
    prop: "id",
    label: "文章 ID",
    width: 100,
    align: "center"
  },
  {
    prop: "title",
    label: "標題 / 內容摘要",
    minWidth: 280,
    align: "left",
    showOverflowTooltip: false,
    render: ({ row }) => (
      <div class="post-title-cell">
        <div class="post-title">{row.title || "—"}</div>
        <div class="post-summary">{row.content || "—"}</div>
      </div>
    ),
    search: {
      key: "keyword",
      render: renderKeywordSearch,
      label: "標題關鍵字",
      props: { placeholder: "請輸入文章標題" }
    }
  },
  {
    prop: "author",
    label: "作者",
    minWidth: 170,
    align: "left",
    render: ({ row }) => renderAuthor(row.author)
  },
  {
    prop: "categoryId",
    label: "分類",
    minWidth: 140,
    render: ({ row }) => row.categoryName || "未分類",
    search: { render: renderCategorySearch, label: "分類", props: { placeholder: "全部分類" } }
  },
  {
    prop: "status",
    label: "狀態",
    width: 110,
    enum: statusOptions,
    search: { render: renderStatusSearch, defaultValue: "ACTIVE", label: "狀態", props: { placeholder: "全部" } },
    render: ({ row }) => <ElTag type={statusTagType(row.status)}>{statusLabel(row.status)}</ElTag>
  },
  {
    prop: "viewCount",
    label: "瀏覽數",
    width: 100,
    align: "right"
  },
  {
    prop: "createAt",
    label: "發布時間",
    width: 180,
    render: ({ row }) => formatTaipeiDateTime(row.createAt)
  },
  {
    prop: "updateTime",
    label: "更新時間",
    width: 180,
    render: ({ row }) => formatTaipeiDateTime(row.updateTime)
  },
  {
    prop: "operation",
    label: "操作",
    fixed: "right",
    width: 180,
    render: ({ row }) => (
      <>
        <ElButton type="primary" link icon={View} disabled={unpublishingPostId.value !== null} onClick={() => openDetail(row)}>
          詳情
        </ElButton>
        {authStore.hasPermission("ADMIN_POST_DELETE") && row.status === "ACTIVE" ? (
          <ElButton
            type="danger"
            link
            icon={Delete}
            loading={unpublishingPostId.value === row.id}
            disabled={unpublishingPostId.value !== null}
            onClick={() => void unpublishPost(row)}
          >
            下架
          </ElButton>
        ) : null}
      </>
    )
  }
]);

onMounted(() => {
  void loadCategories();
});

onActivated(() => {
  if (!hasActivatedOnce) {
    hasActivatedOnce = true;
    return;
  }

  void Promise.all([loadCategories(), proTable.value?.getTableList()]);
});
</script>

<style scoped lang="scss">
.post-manage :deep(.post-title-cell) {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding-block: 4px;
}
.post-manage :deep(.post-title) {
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 700;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}
.post-manage :deep(.post-summary) {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  font-size: var(--el-font-size-small);
  line-height: 1.5;
  color: var(--el-text-color-secondary);
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
}
.post-manage :deep(.author-cell) {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}
.post-manage :deep(.author-cell .el-avatar) {
  flex-shrink: 0;
}
.post-manage :deep(.author-name) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.post-manage :deep(.el-table) {
  font-variant-numeric: tabular-nums;
}
.category-select {
  width: 100%;
}
</style>
