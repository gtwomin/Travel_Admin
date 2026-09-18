<template>
  <section class="preview-section">
    <header>
      <h3>預覽與上架</h3>
      <p>確認行程商品資訊完整後，即可正式上架。</p>
    </header>

    <el-skeleton v-if="loading" :rows="6" animated />

    <template v-else>
      <el-alert v-if="missingItems.length > 0" title="尚有資料未完成" type="warning" :closable="false" show-icon>
        <ul class="missing-list">
          <li v-for="item in missingItems" :key="item">
            {{ item }}
          </li>
        </ul>
      </el-alert>

      <el-alert v-else title="行程資料已完成，可以上架" type="success" :closable="false" show-icon />

      <article class="preview-card">
        <div class="cover-area">
          <el-image
            v-if="coverUrl"
            class="cover-image"
            :src="coverUrl"
            :preview-src-list="[coverUrl]"
            preview-teleported
            fit="cover"
          />

          <div v-else class="cover-placeholder">尚未設定封面照片</div>
        </div>

        <div class="preview-content">
          <el-tag :type="bookingMode === 'FIXED_DEPARTURE' ? 'warning' : 'success'">
            {{ bookingMode === "FIXED_DEPARTURE" ? "固定出發梯次" : "自由選擇日期" }}
          </el-tag>

          <h2>{{ tripName || "尚未命名" }}</h2>

          <p class="summary">
            {{ summary || "尚未填寫行程摘要" }}
          </p>

          <strong class="price">
            {{ formatPrice(tripPrice) }}
          </strong>
        </div>
      </article>

      <el-descriptions :column="2" border>
        <el-descriptions-item label="目的城市">
          {{ destinations.length ? destinations.join("、") : "尚未設定" }}
        </el-descriptions-item>

        <el-descriptions-item label="預訂模式">
          {{ bookingMode === "FIXED_DEPARTURE" ? "固定梯次" : "自由日期" }}
        </el-descriptions-item>

        <el-descriptions-item label="行程圖片"> {{ photoCount }} 張 </el-descriptions-item>

        <el-descriptions-item label="每日行程"> {{ dayCount }} 天 </el-descriptions-item>

        <el-descriptions-item label="出發梯次">
          <template v-if="bookingMode === 'FIXED_DEPARTURE'"> {{ departureCount }} 個梯次 </template>

          <template v-else> 不需要固定梯次 </template>
        </el-descriptions-item>
      </el-descriptions>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

import { AdminTrip } from "@/api/interface";
import { getAdminTripDays, getAdminTripDepartures, getAdminTripPhotoFile, getAdminTripPhotos } from "@/api/modules/trip";

const props = defineProps<{
  tripId: number;
  tripName: string;
  summary: string;
  tripPrice: number;
  destinations: AdminTrip.TravelDestination[];
  bookingMode: AdminTrip.TripBookingMode | null;
}>();

const emit = defineEmits<{
  busyChange: [busy: boolean];
}>();

const loading = ref(false);
const photoCount = ref(0);
const dayCount = ref(0);
const departureCount = ref(0);
const coverUrl = ref<string | null>(null);

const priceFormatter = new Intl.NumberFormat("zh-TW", {
  style: "currency",
  currency: "TWD",
  maximumFractionDigits: 0
});

const formatPrice = (price: number) => priceFormatter.format(price);

const missingItems = computed(() => {
  const result: string[] = [];

  if (!props.tripName.trim()) {
    result.push("缺少行程名稱");
  }

  if (props.tripPrice <= 0) {
    result.push("行程價格必須大於 0");
  }

  if (props.destinations.length === 0) {
    result.push("至少選擇一個目的城市");
  }

  if (photoCount.value === 0) {
    result.push("至少上傳一張行程照片");
  }

  if (dayCount.value === 0) {
    result.push("至少建立一天的每日行程");
  }

  if (props.bookingMode === "FIXED_DEPARTURE" && departureCount.value === 0) {
    result.push("固定梯次商品至少需要一個出發梯次");
  }

  return result;
});

const clearCoverUrl = () => {
  if (coverUrl.value) {
    URL.revokeObjectURL(coverUrl.value);
    coverUrl.value = null;
  }
};

const loadPreview = async () => {
  loading.value = true;
  emit("busyChange", true);
  clearCoverUrl();

  try {
    const [photos, days, departures] = await Promise.all([
      getAdminTripPhotos(props.tripId),
      getAdminTripDays(props.tripId),
      getAdminTripDepartures(props.tripId)
    ]);

    photoCount.value = photos.length;
    dayCount.value = days.length;
    departureCount.value = departures.length;

    const coverPhoto = photos[0];

    if (coverPhoto) {
      const blob = await getAdminTripPhotoFile(coverPhoto.id);

      if (blob instanceof Blob && blob.size > 0) {
        coverUrl.value = URL.createObjectURL(blob);
      }
    }
  } finally {
    loading.value = false;
    emit("busyChange", false);
  }
};

const validateForPublish = () => {
  return missingItems.value.length === 0;
};

defineExpose({
  validateForPublish
});

onMounted(() => {
  void loadPreview();
});

onBeforeUnmount(() => {
  clearCoverUrl();
});
</script>

<style scoped lang="scss">
.preview-section {
  display: grid;
  gap: 20px;
}
.preview-section header h3 {
  margin: 0 0 6px;
}
.preview-section header p {
  margin: 0;
  color: var(--el-text-color-secondary);
}
.missing-list {
  padding-left: 20px;
  margin: 8px 0 0;
}
.preview-card {
  display: grid;
  grid-template-columns:
    minmax(240px, 40%)
    minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
}
.cover-area {
  min-height: 240px;
  background: var(--el-fill-color-light);
}
.cover-image {
  width: 100%;
  height: 100%;
  min-height: 240px;
}
.cover-placeholder {
  display: grid;
  place-items: center;
  min-height: 240px;
  color: var(--el-text-color-secondary);
}
.preview-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 28px;
}
.preview-content h2 {
  margin: 14px 0 10px;
}
.summary {
  line-height: 1.7;
  color: var(--el-text-color-secondary);
}
.price {
  margin-top: auto;
  font-size: 24px;
  color: var(--el-color-danger);
}

@media (width <= 700px) {
  .preview-card {
    grid-template-columns: 1fr;
  }
}
</style>
