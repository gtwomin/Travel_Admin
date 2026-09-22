<template>
  <section class="departure-section">
    <header class="section-header">
      <div>
        <h3>出發梯次</h3>
        <p>固定梯次只需選擇出發日期，系統會依行程天數自動計算結束日期。</p>
      </div>

      <el-button type="primary" :disabled="loading" @click="showCreateForm = true"> 新增梯次 </el-button>
    </header>

    <el-alert
      v-if="bookingMode === 'FLEXIBLE_DATE'"
      title="目前是自由日期商品"
      description="自由日期商品由買家自行選擇出發日期，通常不需要建立固定梯次。"
      type="info"
      :closable="false"
      show-icon
    />

    <el-alert
      v-else
      :title="`固定梯次行程共 ${durationDays} 天`"
      description="選擇出發日期後，系統會自動計算結束日期。"
      type="info"
      :closable="false"
      show-icon
    />

    <el-dialog
      v-model="showCreateForm"
      title="新增出發梯次"
      width="520px"
      :close-on-click-modal="!submitting"
      :close-on-press-escape="!submitting"
    >
      <el-form label-position="top">
        <el-form-item label="出發日期" required>
          <el-date-picker
            v-model="form.startDate"
            type="date"
            class="full-width"
            placeholder="請從日曆選擇出發日期"
            :disabled-date="disablePastDate"
          />
        </el-form-item>

        <el-form-item label="結束日期">
          <el-input
            :model-value="calculatedEndDate ? calculatedEndDate.toLocaleDateString('zh-TW') : '請先選擇出發日期'"
            readonly
          />
        </el-form-item>

        <el-alert :title="`本行程共 ${durationDays} 天，結束日期會自動計算`" type="info" :closable="false" show-icon />
      </el-form>

      <template #footer>
        <el-button :disabled="submitting" @click="showCreateForm = false"> 取消 </el-button>

        <el-button type="primary" :loading="submitting" @click="submitDeparture"> 確認新增 </el-button>
      </template>
    </el-dialog>

    <div v-if="loading" class="state-box">正在載入出發梯次……</div>

    <el-empty v-else-if="departures.length === 0" description="目前尚未建立出發梯次" />

    <el-table v-else :data="departures" border stripe>
      <el-table-column type="index" label="梯次" width="80">
        <template #default="{ $index }"> 第 {{ $index + 1 }} 梯 </template>
      </el-table-column>

      <el-table-column label="出發日期" min-width="190">
        <template #default="{ row }">
          {{ formatDateTime(row.startTime) }}
        </template>
      </el-table-column>

      <el-table-column label="結束日期" min-width="190">
        <template #default="{ row }">
          {{ formatDateTime(row.endTime) }}
        </template>
      </el-table-column>

      <el-table-column label="旅遊天數" width="120">
        <template #default="{ row }">
          {{ calculateDays(row.startTime, row.endTime) }}
          天
        </template>
      </el-table-column>

      <el-table-column label="操作" width="110" fixed="right">
        <template #default="{ row }">
          <el-button
            type="danger"
            link
            :disabled="bookingMode === 'FIXED_DEPARTURE' && departures.length <= 1"
            @click="removeDeparture(row)"
          >
            刪除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <p v-if="bookingMode === 'FIXED_DEPARTURE' && departures.length === 1" class="minimum-hint">
      固定梯次至少必須保留一筆，因此目前唯一的梯次無法刪除。
    </p>
  </section>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { computed, onMounted, reactive, ref } from "vue";

import type { AdminTrip } from "@/api/interface";
import { createAdminTripDeparture, deleteAdminTripDeparture, getAdminTripDepartures } from "@/api/modules/trip";

const props = defineProps<{
  tripId: number;
  bookingMode: AdminTrip.TripBookingMode | null;
  durationDays: number;
}>();

const emit = defineEmits<{
  changed: [];
  busyChange: [busy: boolean];
}>();

const departures = ref<AdminTrip.TripDepartureResponse[]>([]);

const loading = ref(false);
const submitting = ref(false);
const showCreateForm = ref(false);

const form = reactive<{
  startDate: Date | undefined;
}>({
  startDate: undefined
});

const calculatedEndDate = computed(() => {
  if (!form.startDate) {
    return undefined;
  }

  const endDate = new Date(form.startDate);

  endDate.setDate(endDate.getDate() + Math.max(props.durationDays, 1) - 1);

  return endDate;
});

const setBusy = (busy: boolean) => {
  emit("busyChange", busy);
};

const loadDepartures = async () => {
  loading.value = true;
  setBusy(true);

  try {
    departures.value = await getAdminTripDepartures(props.tripId);
  } finally {
    loading.value = false;
    setBusy(false);
  }
};

const submitDeparture = async () => {
  if (!form.startDate || !calculatedEndDate.value) {
    ElMessage.warning("請選擇出發日期");
    return;
  }

  const startTime = new Date(form.startDate);

  startTime.setHours(8, 0, 0, 0);

  const endTime = new Date(calculatedEndDate.value);

  endTime.setHours(18, 0, 0, 0);

  submitting.value = true;
  setBusy(true);

  try {
    await createAdminTripDeparture(props.tripId, {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
    });

    ElMessage.success("出發梯次新增成功");

    form.startDate = undefined;
    showCreateForm.value = false;

    await loadDepartures();
    emit("changed");
  } finally {
    submitting.value = false;
    setBusy(false);
  }
};

const removeDeparture = async (departure: AdminTrip.TripDepartureResponse) => {
  if (props.bookingMode === "FIXED_DEPARTURE" && departures.value.length <= 1) {
    ElMessage.warning("固定梯次至少必須保留一筆");
    return;
  }

  try {
    await ElMessageBox.confirm("確定要刪除這個出發梯次嗎？", "刪除梯次", {
      type: "warning",
      confirmButtonText: "確定刪除",
      cancelButtonText: "取消"
    });
  } catch {
    return;
  }

  submitting.value = true;
  setBusy(true);

  try {
    await deleteAdminTripDeparture(props.tripId, departure.id);

    ElMessage.success("梯次已刪除");

    await loadDepartures();
    emit("changed");
  } finally {
    submitting.value = false;
    setBusy(false);
  }
};

const disablePastDate = (date: Date) => {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  return date.getTime() < today.getTime();
};

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

onMounted(() => {
  void loadDepartures();
});
</script>

<style scoped lang="scss">
.departure-section {
  display: grid;
  gap: 20px;
}
.section-header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
}
.section-header h3 {
  margin: 0 0 6px;
  color: var(--el-text-color-primary);
}
.section-header p {
  margin: 0;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}
.full-width {
  width: 100%;
}
.state-box {
  display: grid;
  place-items: center;
  min-height: 180px;
  color: var(--el-text-color-secondary);
}
</style>
