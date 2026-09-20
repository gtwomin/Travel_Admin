<template>
  <div class="table-box order-manage">
    <div v-if="memberScopedUserId" class="member-scope-banner" role="status">
      <div class="member-scope-copy">
        <span>目前僅顯示指定會員的訂單</span>
        <span class="member-scope-id">會員 ID：{{ memberScopedUserId }}</span>
      </div>
      <el-button type="primary" link @click="clearMemberScope">查看全部訂單</el-button>
    </div>
    <ProTable
      ref="proTable"
      :key="memberScopedUserId || 'all-orders'"
      :columns="columns"
      :request-api="getTableList"
      :server-sort="true"
      :show-column-sort-setting="false"
      :default-sort="{ prop: 'createdAt', order: 'descending' }"
      :search-col="{ xs: 1, sm: 2, md: 2, lg: 3, xl: 4 }"
    />
    <OrderDrawer ref="drawerRef" />
  </div>
</template>

<script setup lang="tsx" name="orderManage">
import { View } from "@element-plus/icons-vue";
import { ElButton, ElTag } from "element-plus";
import { computed, onActivated, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { AdminOrder } from "@/api/interface";
import { getAdminOrderDetail, getAdminOrderPage } from "@/api/modules/order";
import ProTable from "@/components/ProTable/index.vue";
import { ColumnProps, ProTableInstance } from "@/components/ProTable/interface";
import { useAuthStore } from "@/stores/modules/auth";
import { formatTaipeiDateTime } from "@/utils/dateFormat";
import OrderDrawer from "@/views/order/orderManage/OrderDrawer.vue";

type TagType = "success" | "info" | "warning" | "danger" | "primary";

const proTable = ref<ProTableInstance>();
const drawerRef = ref<InstanceType<typeof OrderDrawer> | null>(null);
const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const loadingOrderId = ref<number | null>(null);
let hasActivatedOnce = false;

const memberScopedUserId = computed(() => {
  const rawUserId = route.query.userId;
  if (typeof rawUserId !== "string") return undefined;

  const normalizedUserId = rawUserId.trim();
  return normalizedUserId || undefined;
});

const businessStatusOptions: Array<{
  label: string;
  value: AdminOrder.AdminOrderBusinessStatus;
  tagType: TagType;
}> = [
  { label: "待付款", value: "PENDING_PAYMENT", tagType: "warning" },
  { label: "待出發", value: "UPCOMING", tagType: "primary" },
  { label: "進行中", value: "IN_PROGRESS", tagType: "success" },
  { label: "已完成", value: "COMPLETED", tagType: "success" },
  { label: "已取消", value: "CANCELLED", tagType: "danger" },
  { label: "已失效", value: "EXPIRED", tagType: "info" },
  { label: "已付款待確認", value: "PAID_PENDING_CONFIRMATION", tagType: "warning" },
  { label: "取消處理中", value: "CANCELLATION_IN_PROGRESS", tagType: "warning" }
];

const paymentStatusOptions: Array<{
  label: string;
  value: AdminOrder.PaymentStatus;
  tagType: TagType;
}> = [
  { label: "待付款", value: "PENDING", tagType: "warning" },
  { label: "已付款", value: "PAID", tagType: "success" },
  { label: "付款失敗", value: "FAILED", tagType: "danger" },
  { label: "已取消", value: "CANCELLED", tagType: "info" },
  { label: "已退款", value: "REFUNDED", tagType: "info" },
  { label: "部分退款", value: "PARTIALLY_REFUNDED", tagType: "warning" }
];

const getBusinessStatusOption = (status: AdminOrder.AdminOrderBusinessStatus) =>
  businessStatusOptions.find(option => option.value === status);

const getPaymentStatusOption = (status: AdminOrder.PaymentStatus | null) =>
  status ? paymentStatusOptions.find(option => option.value === status) : undefined;

const formatCurrency = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") return "—";

  const amount = Number(value);
  return Number.isFinite(amount) ? `NT$ ${amount.toLocaleString("zh-TW", { maximumFractionDigits: 2 })}` : `NT$ ${value}`;
};

const renderMember = (member: AdminOrder.AdminOrderMemberSummary | null) => (
  <div class="member-cell">
    <span class="member-nickname">{member?.nickname || "—"}</span>
    <span class="member-email">{member?.email || "—"}</span>
  </div>
);

const getTableList = (params: AdminOrder.AdminOrderPageParams) =>
  getAdminOrderPage({
    ...params,
    userId: memberScopedUserId.value
  });

const clearMemberScope = () => {
  const query = { ...route.query };
  delete query.userId;

  void router.replace({
    name: "orderManage",
    query
  });
};

const openDetail = async (row: AdminOrder.AdminOrderSummaryResponse) => {
  if (loadingOrderId.value !== null || !authStore.hasPermission("ADMIN_ORDER_DETAIL_READ")) return;

  loadingOrderId.value = row.orderId;
  try {
    const detail = await getAdminOrderDetail(row.orderId);
    drawerRef.value?.acceptParams(detail);
  } finally {
    loadingOrderId.value = null;
  }
};

const columns = reactive<ColumnProps<AdminOrder.AdminOrderSummaryResponse>[]>([
  {
    prop: "orderNumber",
    label: "訂單編號",
    minWidth: 180,
    search: { el: "input", key: "keyword", label: "關鍵字", props: { placeholder: "訂單編號 / 會員 / Email / 行程" } }
  },
  {
    prop: "member",
    label: "會員",
    minWidth: 210,
    showOverflowTooltip: false,
    render: ({ row }) => renderMember(row.member)
  },
  {
    prop: "primaryTripName",
    label: "行程",
    minWidth: 210,
    render: ({ row }) => row.primaryTripName || "—"
  },
  {
    prop: "departureAt",
    label: "出發日期",
    width: 180,
    sortable: "custom",
    search: {
      el: "date-picker",
      key: "departureRange",
      label: "出發日期",
      props: { type: "daterange", valueFormat: "YYYY-MM-DD" }
    },
    render: ({ row }) => formatTaipeiDateTime(row.earliestDepartureAt)
  },
  {
    prop: "totalQuantity",
    label: "人數",
    width: 90,
    align: "right"
  },
  {
    prop: "totalAmount",
    label: "總金額",
    width: 140,
    align: "right",
    sortable: "custom",
    render: ({ row }) => formatCurrency(row.totalAmount)
  },
  {
    prop: "displayStatus",
    label: "訂單狀態",
    width: 150,
    enum: businessStatusOptions,
    search: { el: "select", key: "status", label: "訂單狀態", props: { placeholder: "全部" } },
    render: ({ row }) => {
      const option = getBusinessStatusOption(row.displayStatus);
      return <ElTag type={option?.tagType ?? "info"}>{option?.label ?? "—"}</ElTag>;
    }
  },
  {
    prop: "paymentStatus",
    label: "付款狀態",
    width: 140,
    enum: paymentStatusOptions,
    search: { el: "select", label: "付款狀態", props: { placeholder: "全部" } },
    render: ({ row }) => {
      const option = getPaymentStatusOption(row.paymentStatus);
      return <ElTag type={option?.tagType ?? "info"}>{option?.label ?? "未建立付款"}</ElTag>;
    }
  },
  {
    prop: "createdAt",
    label: "下單時間",
    width: 180,
    sortable: "custom",
    sortOrders: ["ascending", "descending"],
    search: {
      el: "date-picker",
      key: "createdRange",
      label: "下單日期",
      props: { type: "daterange", valueFormat: "YYYY-MM-DD" }
    },
    render: ({ row }) => formatTaipeiDateTime(row.createdAt)
  },
  {
    prop: "operation",
    label: "操作",
    fixed: "right",
    width: 100,
    render: ({ row }) =>
      authStore.hasPermission("ADMIN_ORDER_DETAIL_READ") ? (
        <ElButton
          type="primary"
          link
          icon={View}
          loading={loadingOrderId.value === row.orderId}
          disabled={loadingOrderId.value !== null}
          onClick={() => openDetail(row)}
        >
          詳情
        </ElButton>
      ) : null
  }
]);

onActivated(() => {
  if (!hasActivatedOnce) {
    hasActivatedOnce = true;
    return;
  }

  void proTable.value?.getTableList();
});
</script>

<style scoped lang="scss">
.order-manage {
  min-width: 0;
}
.member-scope-banner {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 12px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-5);
  border-radius: var(--el-border-radius-base);
}
.member-scope-copy {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  min-width: 0;
}
.member-scope-id {
  overflow-wrap: anywhere;
}
.order-manage :deep(.member-cell) {
  display: grid;
  gap: 4px;
  min-width: 0;
  text-align: left;
}
.order-manage :deep(.member-nickname),
.order-manage :deep(.member-email) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.order-manage :deep(.member-email) {
  font-size: var(--el-font-size-small);
  color: var(--el-text-color-secondary);
}
.order-manage :deep(.el-table) {
  font-variant-numeric: tabular-nums;
}

@media (width <= 768px) {
  .member-scope-banner {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
