<!-- eslint-disable vue/html-closing-bracket-newline -->
<template>
  <el-drawer
    v-model="visible"
    class="order-drawer"
    destroy-on-close
    size="min(880px, 100vw)"
    title="訂單詳情"
    :close-on-click-modal="!reviewLoading"
    :close-on-press-escape="!reviewLoading"
    :show-close="!reviewLoading"
  >
    <template v-if="detail">
      <el-divider content-position="left">訂單資訊</el-divider>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="訂單編號">{{ detail.orderNumber }}</el-descriptions-item>
        <el-descriptions-item label="訂單 ID">{{ detail.orderId }}</el-descriptions-item>
        <el-descriptions-item label="訂單狀態">
          <el-tag :type="businessStatusOption(detail.displayStatus).tagType">
            {{ businessStatusOption(detail.displayStatus).label }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="原始狀態">
          {{ orderStatusLabels[detail.orderStatus] }}（{{ detail.orderStatus }}）
        </el-descriptions-item>
        <el-descriptions-item label="總金額">{{ formatCurrency(detail.totalAmount) }}</el-descriptions-item>
        <el-descriptions-item label="下單時間">{{ formatTaipeiDateTime(detail.createdAt) }}</el-descriptions-item>
      </el-descriptions>

      <template v-if="detail.pendingCancellation">
        <el-divider content-position="left">取消申請</el-divider>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="取消申請 ID">{{ detail.pendingCancellation.cancellationId }}</el-descriptions-item>
          <el-descriptions-item label="狀態">
            <el-tag :type="cancellationStatusOption(detail.pendingCancellation.status).tagType">
              {{ cancellationStatusOption(detail.pendingCancellation.status).label }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="申請時間">
            {{ formatTaipeiDateTime(detail.pendingCancellation.requestedAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="會員取消原因">
            <span class="long-text">{{ detail.pendingCancellation.reason }}</span>
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="canReview" class="cancellation-review">
          <el-form @submit.prevent>
            <el-form-item label="審核說明" label-position="top">
              <el-input
                v-model="adminNote"
                type="textarea"
                :rows="4"
                maxlength="1000"
                show-word-limit
                :disabled="reviewLoading"
                placeholder="請輸入審核說明（拒絕取消時必填）"
              />
              <div v-if="reviewValidationMessage" class="review-validation-message">
                {{ reviewValidationMessage }}
              </div>
            </el-form-item>
            <div class="cancellation-review-actions">
              <el-button type="danger" plain :loading="reviewLoading" :disabled="reviewLoading" @click="rejectCancellation">
                拒絕取消
              </el-button>
              <el-button type="primary" :loading="reviewLoading" :disabled="reviewLoading" @click="approveCancellation">
                同意取消
              </el-button>
            </div>
          </el-form>
          <p class="cancellation-review-warning">同意後訂單與訂單項目將改為已取消，本流程不會自動執行退款。</p>
        </div>
      </template>

      <el-divider content-position="left">會員資料</el-divider>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="會員 ID">{{ detail.member.userId }}</el-descriptions-item>
        <el-descriptions-item label="帳號">{{ detail.member.username }}</el-descriptions-item>
        <el-descriptions-item label="暱稱">{{ displayValue(detail.member.nickname) }}</el-descriptions-item>
        <el-descriptions-item label="Email">{{ displayValue(detail.member.email) }}</el-descriptions-item>
      </el-descriptions>

      <el-divider content-position="left">訂購聯絡資訊</el-divider>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="聯絡人">{{ detail.contact.contactName }}</el-descriptions-item>
        <el-descriptions-item label="Email">{{ detail.contact.contactEmail }}</el-descriptions-item>
        <el-descriptions-item label="電話">{{
          formatPhone(detail.contact.countryCode, detail.contact.contactPhone)
        }}</el-descriptions-item>
        <el-descriptions-item label="特殊需求">{{ displayValue(detail.contact.specialRequest) }}</el-descriptions-item>
      </el-descriptions>

      <el-divider content-position="left">訂單商品</el-divider>
      <div v-if="detail.items.length" class="table-scroll">
        <el-table :data="detail.items" border class="detail-table">
          <el-table-column label="行程" min-width="180">
            <template #default="scope">
              <span class="long-text">{{ scope.row.tripName }}</span>
              <small class="secondary-text">目的地：{{ formatDestinations(scope.row.destinations) }}</small>
            </template>
          </el-table-column>
          <el-table-column label="出發時間" min-width="170">
            <template #default="scope">{{ formatTaipeiDateTime(scope.row.startTime) }}</template>
          </el-table-column>
          <el-table-column label="結束時間" min-width="170">
            <template #default="scope">{{ formatTaipeiDateTime(scope.row.endTime) }}</template>
          </el-table-column>
          <el-table-column prop="quantity" label="人數" width="80" align="right" />
          <el-table-column label="單價" width="130" align="right">
            <template #default="scope">{{ formatCurrency(scope.row.unitPrice) }}</template>
          </el-table-column>
          <el-table-column label="小計" width="130" align="right">
            <template #default="scope">{{ formatCurrency(scope.row.subtotal) }}</template>
          </el-table-column>
          <el-table-column label="狀態" width="150">
            <template #default="scope">
              <el-tag :type="itemStatusOption(scope.row.orderItemStatus).tagType">
                {{ itemStatusOption(scope.row.orderItemStatus).label }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="備註" min-width="180">
            <template #default="scope"
              ><span class="long-text">{{ displayValue(scope.row.note) }}</span></template
            >
          </el-table-column>
        </el-table>
      </div>
      <div v-else class="empty-state">尚無訂單商品</div>

      <el-divider content-position="left">付款紀錄</el-divider>
      <div v-if="detail.payments.length" class="table-scroll">
        <el-table :data="detail.payments" border class="detail-table payment-table">
          <el-table-column prop="paymentId" label="付款 ID" width="100" />
          <el-table-column label="付款方式" width="130">
            <template #default="scope">{{ paymentMethodLabels[scope.row.paymentMethod] }}</template>
          </el-table-column>
          <el-table-column label="狀態" width="140">
            <template #default="scope">
              <el-tag :type="paymentStatusOption(scope.row.status).tagType">
                {{ paymentStatusOption(scope.row.status).label }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="金額" width="130" align="right">
            <template #default="scope">{{ formatCurrency(scope.row.amount) }}</template>
          </el-table-column>
          <el-table-column label="建立時間" min-width="170">
            <template #default="scope">{{ formatTaipeiDateTime(scope.row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="付款時間" min-width="170">
            <template #default="scope">{{ formatTaipeiDateTime(scope.row.paidAt) }}</template>
          </el-table-column>
          <el-table-column prop="merchantTradeNo" label="特店交易編號" min-width="180" show-overflow-tooltip />
          <el-table-column label="交易編號" min-width="160" show-overflow-tooltip>
            <template #default="scope">{{ displayValue(scope.row.transactionId) }}</template>
          </el-table-column>
        </el-table>
      </div>
      <div v-else class="empty-state">尚無付款紀錄</div>
    </template>

    <template #footer>
      <el-button :disabled="reviewLoading" @click="visible = false">關閉</el-button>
    </template>
  </el-drawer>
</template>
<!-- eslint-enable vue/html-closing-bracket-newline -->

<script setup lang="ts" name="OrderDrawer">
import { computed, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";

import { AdminOrder } from "@/api/interface";
import { approveAdminOrderCancellation, getAdminOrderDetail, rejectAdminOrderCancellation } from "@/api/modules/order";
import { formatTaipeiDateTime } from "@/utils/dateFormat";

type TagType = "success" | "info" | "warning" | "danger" | "primary";

const visible = ref(false);
const detail = ref<AdminOrder.AdminOrderDetailResponse | null>(null);
const reviewLoading = ref(false);
const adminNote = ref("");
const reviewValidationMessage = ref("");
const emit = defineEmits<{ reviewed: [] }>();

const businessStatusOptions: Record<AdminOrder.AdminOrderBusinessStatus, { label: string; tagType: TagType }> = {
  PENDING_PAYMENT: { label: "付款未完成", tagType: "warning" },
  UPCOMING: { label: "待出發", tagType: "primary" },
  IN_PROGRESS: { label: "進行中", tagType: "success" },
  COMPLETED: { label: "已完成", tagType: "success" },
  CANCELLED: { label: "已取消", tagType: "danger" },
  EXPIRED: { label: "已失效", tagType: "info" },
  PAID_PENDING_CONFIRMATION: { label: "已付款待確認", tagType: "warning" },
  CANCELLATION_IN_PROGRESS: { label: "取消處理中", tagType: "warning" }
};

const orderStatusLabels: Record<AdminOrder.OrderStatus, string> = {
  PENDING_PAYMENT: "付款未完成",
  PAID: "已付款",
  CONFIRMED: "已確認",
  CANCELLATION_REQUESTED: "申請取消",
  CANCELLED: "已取消",
  COMPLETED: "已完成",
  EXPIRED: "已失效"
};

const itemStatusOptions: Record<AdminOrder.OrderItemStatus, { label: string; tagType: TagType }> = {
  PENDING_PAYMENT: { label: "付款未完成", tagType: "warning" },
  PAID: { label: "已付款", tagType: "success" },
  CONFIRMED: { label: "已確認", tagType: "primary" },
  CANCELLATION_REQUESTED: { label: "申請取消", tagType: "warning" },
  CANCELLED: { label: "已取消", tagType: "danger" },
  COMPLETED: { label: "已完成", tagType: "success" },
  EXPIRED: { label: "已失效", tagType: "info" }
};

const paymentStatusOptions: Record<AdminOrder.PaymentStatus, { label: string; tagType: TagType }> = {
  PENDING: { label: "付款處理中", tagType: "warning" },
  PAID: { label: "已付款", tagType: "success" },
  FAILED: { label: "付款失敗", tagType: "danger" },
  CANCELLED: { label: "已取消", tagType: "info" },
  REFUNDED: { label: "已退款", tagType: "info" },
  PARTIALLY_REFUNDED: { label: "部分退款", tagType: "warning" }
};

const paymentMethodLabels: Record<AdminOrder.PaymentMethod, string> = {
  CREDIT_CARD: "信用卡",
  BANK_TRANSFER: "銀行轉帳",
  LINE_PAY: "LINE Pay"
};

const cancellationStatusOptions: Record<AdminOrder.CancellationStatus, { label: string; tagType: TagType }> = {
  PENDING: { label: "待審核", tagType: "warning" },
  APPROVED: { label: "已同意", tagType: "success" },
  REJECTED: { label: "已拒絕", tagType: "info" },
  REFUNDING: { label: "退款處理中", tagType: "warning" },
  REFUNDED: { label: "已退款", tagType: "success" },
  REFUND_FAILED: { label: "退款失敗", tagType: "danger" }
};

const destinationLabels: Record<string, string> = {
  TAIPEI: "臺北",
  KAOHSIUNG: "高雄",
  TOKYO: "東京",
  OSAKA: "大阪",
  KYOTO: "京都",
  HOKKAIDO: "北海道",
  SEOUL: "首爾",
  BUSAN: "釜山",
  BANGKOK: "曼谷",
  CHIANG_MAI: "清邁",
  SINGAPORE: "新加坡",
  KUALA_LUMPUR: "吉隆坡",
  SHANGHAI: "上海",
  HONG_KONG: "香港",
  MACAU: "澳門"
};

const businessStatusOption = (status: AdminOrder.AdminOrderBusinessStatus) =>
  businessStatusOptions[status] ?? { label: "—", tagType: "info" as const };
const itemStatusOption = (status: AdminOrder.OrderItemStatus) =>
  itemStatusOptions[status] ?? { label: "—", tagType: "info" as const };
const paymentStatusOption = (status: AdminOrder.PaymentStatus) =>
  paymentStatusOptions[status] ?? { label: "—", tagType: "info" as const };
const cancellationStatusOption = (status: AdminOrder.CancellationStatus) =>
  cancellationStatusOptions[status] ?? { label: "—", tagType: "info" as const };

const displayValue = (value: string | null | undefined) => value || "—";

const formatPhone = (countryCode: string | null | undefined, phone: string | null | undefined) =>
  [countryCode, phone].filter(Boolean).join(" ") || "—";

const formatCurrency = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") return "—";

  const amount = Number(value);
  return Number.isFinite(amount) ? `NT$ ${amount.toLocaleString("zh-TW", { maximumFractionDigits: 2 })}` : `NT$ ${value}`;
};

const formatDestinations = (destinations: string[]) =>
  destinations.length ? destinations.map(destination => destinationLabels[destination] ?? destination).join(" / ") : "—";

const canReview = computed(
  () => detail.value?.pendingCancellation?.status === "PENDING" && detail.value.orderStatus === "CANCELLATION_REQUESTED"
);

const isConflictError = (error: unknown) => {
  if (!error || typeof error !== "object" || !("response" in error)) return false;

  const response = (error as { response?: { status?: number } }).response;
  return response?.status === 409;
};

const refreshDetailAfterReview = async (orderId: number) => {
  detail.value = await getAdminOrderDetail(orderId);
  adminNote.value = "";
  reviewValidationMessage.value = "";
  emit("reviewed");
};

const approveCancellation = async () => {
  if (reviewLoading.value || !canReview.value || !detail.value?.pendingCancellation) return;

  reviewLoading.value = true;
  reviewValidationMessage.value = "";
  const orderId = detail.value.orderId;
  const cancellationId = detail.value.pendingCancellation.cancellationId;
  try {
    await ElMessageBox.confirm(
      "確定同意這筆取消申請嗎？同意後訂單與訂單項目將改為已取消，本流程不會自動執行退款。",
      "確認同意取消",
      { type: "warning", confirmButtonText: "同意取消", cancelButtonText: "取消" }
    );

    if (!canReview.value) return;

    await approveAdminOrderCancellation(cancellationId, { adminNote: adminNote.value.trim() || null });
    await refreshDetailAfterReview(orderId);
    ElMessage.success("取消申請已同意");
  } catch (error) {
    if (isConflictError(error)) {
      await refreshDetailAfterReview(orderId).catch(() => undefined);
    }
  } finally {
    reviewLoading.value = false;
  }
};

const rejectCancellation = async () => {
  if (reviewLoading.value || !canReview.value || !detail.value?.pendingCancellation) return;

  const note = adminNote.value.trim();
  if (!note) {
    reviewValidationMessage.value = "拒絕取消時必須填寫拒絕原因";
    ElMessage.warning("拒絕取消時必須填寫拒絕原因");
    return;
  }

  reviewLoading.value = true;
  reviewValidationMessage.value = "";
  const orderId = detail.value.orderId;
  const cancellationId = detail.value.pendingCancellation.cancellationId;
  try {
    await ElMessageBox.confirm("確定拒絕這筆取消申請嗎？訂單將恢復為已確認狀態。", "確認拒絕取消", {
      type: "warning",
      confirmButtonText: "拒絕取消",
      cancelButtonText: "取消"
    });

    if (!canReview.value) return;

    await rejectAdminOrderCancellation(cancellationId, { adminNote: note });
    await refreshDetailAfterReview(orderId);
    ElMessage.success("取消申請已拒絕");
  } catch (error) {
    if (isConflictError(error)) {
      await refreshDetailAfterReview(orderId).catch(() => undefined);
    }
  } finally {
    reviewLoading.value = false;
  }
};

const acceptParams = (orderDetail: AdminOrder.AdminOrderDetailResponse) => {
  if (reviewLoading.value) return;

  detail.value = orderDetail;
  adminNote.value = "";
  reviewValidationMessage.value = "";
  visible.value = true;
};

defineExpose({ acceptParams });
</script>

<style scoped lang="scss">
.order-drawer :deep(.el-drawer__body) {
  min-width: 0;
  overflow-x: hidden;
}
.table-scroll {
  min-width: 0;
}
.long-text {
  display: block;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.secondary-text {
  display: block;
  color: var(--el-text-color-secondary);
  overflow-wrap: anywhere;
}
.cancellation-review {
  padding: 16px;
  margin-top: 16px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
}
.cancellation-review :deep(.el-form-item) {
  margin-bottom: 12px;
}
.review-validation-message {
  margin-top: 4px;
  font-size: var(--el-font-size-small);
  line-height: 1.5;
  color: var(--el-color-danger);
}
.cancellation-review-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}
.cancellation-review-actions .el-button {
  margin-left: 0;
}
.cancellation-review-warning {
  margin: 12px 0 0;
  font-size: var(--el-font-size-small);
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}
.empty-state {
  padding: 12px 0;
  color: var(--el-text-color-secondary);
  text-align: center;
}

@media (width <= 520px) {
  .cancellation-review {
    padding: 12px;
  }
  .cancellation-review-actions {
    flex-direction: column;
  }
  .cancellation-review-actions .el-button {
    width: 100%;
  }
}
</style>
