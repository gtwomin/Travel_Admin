<template>
  <el-drawer
    v-model="drawerVisible"
    class="trip-detail-drawer"
    :destroy-on-close="true"
    size="min(640px, 100vw)"
    title="行程詳情"
  >
    <el-skeleton v-if="loading" :rows="8" animated />
    <el-alert v-else-if="loadError" title="行程詳情載入失敗，請關閉後重試。" type="error" :closable="false" show-icon />
    <template v-else-if="currentTrip">
      <el-divider class="detail-divider" content-position="left">基本資料</el-divider>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="行程 ID">{{ currentTrip.id }}</el-descriptions-item>
        <el-descriptions-item label="狀態">
          <el-tag :type="statusTagType(currentTrip.status)">{{ statusLabel(currentTrip.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="行程名稱">
          <span class="long-text">{{ currentTrip.tripName || "—" }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="摘要">
          <span class="long-text">{{ currentTrip.summary || "—" }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="目的城市">
          <span class="long-text">{{ formatDestinations(currentTrip.destinations) }}</span>
        </el-descriptions-item>
      </el-descriptions>

      <el-divider class="detail-divider" content-position="left">販售資料</el-divider>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="售價">{{ formatPrice(currentTrip.tripPrice) }}</el-descriptions-item>
        <el-descriptions-item label="預訂模式">{{ bookingModeLabel(currentTrip.bookingMode) }}</el-descriptions-item>
        <el-descriptions-item label="商品類型">{{ productTypeLabel(currentTrip.productType) }}</el-descriptions-item>
      </el-descriptions>

      <el-divider class="detail-divider" content-position="left">商品介紹</el-divider>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="總體介紹">
          <span class="long-text">{{ currentTrip.tripContent || "—" }}</span>
        </el-descriptions-item>
      </el-descriptions>
    </template>
    <el-empty v-else description="尚未載入行程詳情" />

    <template #footer>
      <el-button @click="drawerVisible = false">關閉</el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts" name="TripDetailDrawer">
import { ref, withDefaults } from "vue";

import { AdminTrip } from "@/api/interface";
import { getAdminTripDetail } from "@/api/modules/trip";

interface TripDetailDrawerProps {
  destinationLabels?: Record<string, string>;
}

const props = withDefaults(defineProps<TripDetailDrawerProps>(), {
  destinationLabels: () => ({})
});

const drawerVisible = ref(false);
const loading = ref(false);
const loadError = ref(false);
const currentTrip = ref<AdminTrip.TripDetailResponse | null>(null);
let requestSequence = 0;

const statusOptions: Array<{ label: string; value: AdminTrip.TripStatus; tagType: "success" | "info" }> = [
  { label: "已上架", value: "ACTIVE", tagType: "success" },
  { label: "已下架", value: "INACTIVE", tagType: "info" }
];
const bookingModeLabels: Record<AdminTrip.TripBookingMode, string> = {
  FIXED_DEPARTURE: "固定出發",
  FLEXIBLE_DATE: "自由日期"
};
const productTypeLabels: Record<AdminTrip.TripProductType, string> = {
  PACKAGE_TOUR: "套裝行程",
  PRIVATE_GROUP: "私人包團",
  CHARTER_TOUR: "包車行程"
};
const statusLabel = (status: AdminTrip.TripStatus) => statusOptions.find(option => option.value === status)?.label ?? "—";
const statusTagType = (status: AdminTrip.TripStatus) => statusOptions.find(option => option.value === status)?.tagType ?? "info";
const priceFormatter = new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 });
const formatPrice = (price: number) => priceFormatter.format(price);
const formatDestinations = (destinations: AdminTrip.TravelDestination[]) =>
  destinations.length ? destinations.map(destination => props.destinationLabels[destination] ?? destination).join("、") : "—";
const bookingModeLabel = (bookingMode: AdminTrip.TripBookingMode) => bookingModeLabels[bookingMode];
const productTypeLabel = (productType: AdminTrip.TripProductType) => productTypeLabels[productType];

const acceptParams = async (tripId: number) => {
  const sequence = ++requestSequence;
  drawerVisible.value = true;
  loading.value = true;
  loadError.value = false;
  currentTrip.value = null;

  try {
    const detail = await getAdminTripDetail(tripId);
    if (sequence === requestSequence) currentTrip.value = detail;
  } catch {
    if (sequence === requestSequence) loadError.value = true;
  } finally {
    if (sequence === requestSequence) loading.value = false;
  }
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
.trip-detail-drawer :deep(.el-drawer__body) {
  min-width: 0;
  overflow-x: hidden;
}
</style>
