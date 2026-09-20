<template>
  <div class="table-box">
    <ProTable ref="table" :columns="columns" :request-api="getAdminOrders" row-key="orderId">
      <template #tableHeader><ElButton @click="table?.getTableList()">重新整理訂單</ElButton></template>
      <template #operation="{ row }">
        <ElButton v-if="auth.hasPermission('ADMIN_ORDER_DETAIL_READ')" link type="primary" @click="showDetail(row.orderId)">
          查看明細
        </ElButton>
      </template>
    </ProTable>
    <ElDrawer v-model="drawerOpen" title="訂單明細" size="70%">
      <div v-loading="detailLoading">
        <template v-if="detail">
          <ElDescriptions :column="2" border>
            <ElDescriptionsItem label="訂單編號">{{ detail.orderNumber }}</ElDescriptionsItem>
            <ElDescriptionsItem label="訂單狀態">{{ statusLabel(detail.orderStatus) }}</ElDescriptionsItem>
            <ElDescriptionsItem label="訂單金額">{{ money(detail.totalAmount) }}</ElDescriptionsItem>
            <ElDescriptionsItem label="聯絡人">{{ detail.contact.contactName }}</ElDescriptionsItem>
            <ElDescriptionsItem label="電子郵件">{{ detail.contact.contactEmail }}</ElDescriptionsItem>
            <ElDescriptionsItem label="電話">
              {{ detail.contact.countryCode }} {{ detail.contact.contactPhone }}
            </ElDescriptionsItem>
          </ElDescriptions>

          <h3>訂購行程</h3>
          <ElTable :data="detail.items" empty-text="沒有訂購項目">
            <ElTableColumn prop="tripName" label="行程" />
            <ElTableColumn prop="quantity" label="人數" width="80" />
            <ElTableColumn label="狀態">
              <template #default="{ row }">
                {{ statusLabel(row.orderItemStatus) }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="小計">
              <template #default="{ row }">
                {{ money(row.subtotal) }}
              </template>
            </ElTableColumn>
          </ElTable>

          <h3>付款紀錄</h3>
          <ElTable :data="detail.payments" empty-text="尚未建立付款紀錄">
            <ElTableColumn prop="paymentId" label="付款 ID" width="90" />
            <ElTableColumn label="狀態">
              <template #default="{ row }">
                {{ statusLabel(row.status) }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="金額">
              <template #default="{ row }">
                {{ money(row.amount) }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="交易編號" min-width="180">
              <template #default="{ row }">
                <ElTag v-if="row.transactionId?.startsWith('MOCK-')" type="warning"> 模擬付款・未實際扣款 </ElTag>
                <div>{{ row.transactionId || "—" }}</div>
              </template>
            </ElTableColumn>
            <ElTableColumn label="付款時間" min-width="170">
              <template #default="{ row }">
                {{ date(row.paidAt) }}
              </template>
            </ElTableColumn>
          </ElTable>
        </template>
        <ElEmpty v-else-if="!detailLoading" description="無法取得訂單明細，請關閉後重試" />
      </div>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts" name="orderManage">
import { ref } from "vue";
import { ElButton, ElDescriptions, ElDescriptionsItem, ElDrawer, ElEmpty, ElTable, ElTableColumn, ElTag } from "element-plus";
import ProTable from "@/components/ProTable/index.vue";
import type { ColumnProps, ProTableInstance } from "@/components/ProTable/interface";
import { getAdminOrders, getAdminOrderDetail } from "@/api/modules/order";
import type { OrderDetail, OrderSummary } from "@/api/interface/order";
import { useAuthStore } from "@/stores/modules/auth";

const auth = useAuthStore();
const table = ref<ProTableInstance>();
const drawerOpen = ref(false);
const detailLoading = ref(false);
const detail = ref<OrderDetail>();
let detailRequest = 0;
const labels: Record<string, string> = {
  PENDING: "待付款",
  PENDING_PAYMENT: "待付款",
  PAID: "已付款",
  CONFIRMED: "已確認",
  FAILED: "付款失敗",
  CANCELLED: "已取消",
  COMPLETED: "已完成",
  EXPIRED: "已逾期",
  REFUNDED: "已退款",
  PARTIALLY_REFUNDED: "部分退款",
  CANCELLATION_REQUESTED: "申請取消中"
};
const statusLabel = (value: string | null) => (value ? labels[value] || value : "尚無付款");
const money = (value: number) =>
  new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 }).format(value);
const date = (value: string | null) => (value ? new Date(value).toLocaleString("zh-TW") : "—");
const columns: ColumnProps<OrderSummary>[] = [
  {
    prop: "orderNumber",
    label: "訂單編號",
    minWidth: 200,
    search: { el: "input", key: "keyword", label: "關鍵字", props: { placeholder: "訂單、會員或行程" } }
  },
  { prop: "primaryTripName", label: "行程", minWidth: 200 },
  { prop: "totalQuantity", label: "人數", width: 80 },
  { prop: "totalAmount", label: "金額", minWidth: 120, render: ({ row }) => money(row.totalAmount) },
  { prop: "orderStatus", label: "訂單狀態", minWidth: 120, render: ({ row }) => statusLabel(row.orderStatus) },
  {
    prop: "paymentStatus",
    label: "付款狀態",
    minWidth: 120,
    search: { el: "select" },
    enum: ["PENDING", "PAID", "FAILED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"].map(value => ({
      value,
      label: statusLabel(value)
    })),
    render: ({ row }) => statusLabel(row.paymentStatus)
  },
  { prop: "createdAt", label: "建立時間", minWidth: 180, render: ({ row }) => date(row.createdAt) },
  { prop: "operation", label: "操作", width: 110, fixed: "right" }
];
async function showDetail(id: number) {
  const request = ++detailRequest;
  drawerOpen.value = true;
  detail.value = undefined;
  detailLoading.value = true;
  try {
    const result = await getAdminOrderDetail(id);
    if (request === detailRequest) detail.value = result;
  } catch {
    // API 攔截器已顯示錯誤；保留可重試的空狀態。
  } finally {
    if (request === detailRequest) detailLoading.value = false;
  }
}
</script>
