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
        <el-descriptions-item label="出發城市">{{ currentTrip.departureCity || "未設定" }}</el-descriptions-item>
        <el-descriptions-item label="目的城市">
          <span class="long-text">{{ formatDestinations(currentTrip.destinations) }}</span>
        </el-descriptions-item>
      </el-descriptions>
      <el-divider class="detail-divider" content-position="left"> 行程圖片 </el-divider>

      <el-empty v-if="photos.length === 0" description="尚未上傳行程圖片" />

      <div v-else class="detail-photo-grid">
        <article v-for="(photo, index) in photos" :key="photo.id" class="detail-photo-card">
          <el-image
            v-if="photo.previewUrl"
            class="detail-photo-image"
            :src="photo.previewUrl"
            :preview-src-list="photoPreviewUrls"
            :initial-index="index"
            preview-teleported
            fit="cover"
            :alt="`第 ${index + 1} 張行程圖片`"
          />

          <div v-else class="detail-photo-error">圖片載入失敗</div>

          <el-tag v-if="index === 0" class="cover-tag" type="success" size="small"> 封面 </el-tag>
        </article>
      </div>
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
      <el-divider class="detail-divider" content-position="left"> 出發梯次 </el-divider>

      <el-alert
        v-if="currentTrip.bookingMode === 'FLEXIBLE_DATE'"
        title="自由日期行程"
        description="此行程由買家自行選擇預訂日期，不使用固定出發梯次。"
        type="info"
        :closable="false"
        show-icon
      />

      <el-empty v-else-if="departures.length === 0" description="目前尚未設定出發梯次" />

      <el-table v-else :data="departures" border stripe size="small">
        <el-table-column prop="id" label="ID" width="70" />

        <el-table-column label="出發日期" min-width="170">
          <template #default="{ row }">
            {{ formatDateTime(row.startTime) }}
          </template>
        </el-table-column>

        <el-table-column label="結束日期" min-width="170">
          <template #default="{ row }">
            {{ formatDateTime(row.endTime) }}
          </template>
        </el-table-column>

        <el-table-column label="天數" width="80">
          <template #default="{ row }"> {{ calculateDays(row.startTime, row.endTime) }} 天 </template>
        </el-table-column>
      </el-table>
    </template>
    <el-empty v-else description="尚未載入行程詳情" />

    <template #footer>
      <el-button @click="drawerVisible = false">關閉</el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts" name="TripDetailDrawer">
import { computed, onBeforeUnmount, ref } from "vue";

import { AdminTrip } from "@/api/interface";
import { getAdminTripDetail, getAdminTripDepartures, getAdminTripPhotoFile, getAdminTripPhotos } from "@/api/modules/trip";
interface DetailPhoto extends AdminTrip.TripPhotoResponse {
  previewUrl: string | null;
}
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
const departures = ref<AdminTrip.TripDepartureResponse[]>([]);
const photos = ref<DetailPhoto[]>([]);

const photoPreviewUrls = computed(() => photos.value.map(photo => photo.previewUrl).filter((url): url is string => Boolean(url)));

const objectUrls = new Set<string>();
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
const formatDateTime = (value: string) => {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
};

const calculateDays = (startTime: string, endTime: string) => {
  const start = new Date(startTime);
  const end = new Date(endTime);

  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / millisecondsPerDay));
};
const clearPhotoPreviews = () => {
  for (const url of objectUrls) {
    URL.revokeObjectURL(url);
  }

  objectUrls.clear();
  photos.value = [];
};

const createPhotoPreviews = async (photoList: AdminTrip.TripPhotoResponse[], sequence: number) => {
  const result = await Promise.all(
    photoList.map(async photo => {
      try {
        const blob = await getAdminTripPhotoFile(photo.id);

        if (!(blob instanceof Blob) || blob.size === 0) {
          throw new Error("照片資料無效");
        }

        const previewUrl = URL.createObjectURL(blob);

        if (sequence !== requestSequence) {
          URL.revokeObjectURL(previewUrl);
          return null;
        }

        objectUrls.add(previewUrl);

        return {
          ...photo,
          previewUrl
        };
      } catch {
        return {
          ...photo,
          previewUrl: null
        };
      }
    })
  );

  if (sequence === requestSequence) {
    photos.value = result.filter((photo): photo is DetailPhoto => photo !== null);
  }
};
const acceptParams = async (tripId: number) => {
  const sequence = ++requestSequence;
  drawerVisible.value = true;
  loading.value = true;
  loadError.value = false;
  currentTrip.value = null;
  departures.value = [];
  clearPhotoPreviews();

  try {
    const [detail, departureList, photoList] = await Promise.all([
      getAdminTripDetail(tripId),
      getAdminTripDepartures(tripId),
      getAdminTripPhotos(tripId)
    ]);

    if (sequence !== requestSequence) {
      return;
    }

    currentTrip.value = detail;
    departures.value = departureList;

    await createPhotoPreviews(photoList, sequence);
  } catch {
    if (sequence === requestSequence) {
      loadError.value = true;
    }
  } finally {
    if (sequence === requestSequence) {
      loading.value = false;
    }
  }
};
onBeforeUnmount(() => {
  requestSequence += 1;
  clearPhotoPreviews();
});
defineExpose({ acceptParams });
</script>

<style scoped lang="scss">
.detail-photo-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.detail-photo-card {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
}
.detail-photo-image {
  width: 100%;
  height: 100%;
}
.detail-photo-error {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: var(--el-text-color-secondary);
}
.cover-tag {
  position: absolute;
  top: 8px;
  left: 8px;
}

@media (width <= 520px) {
  .detail-photo-grid {
    grid-template-columns: 1fr;
  }
}
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
