<template>
  <section class="departure-section">
    <header class="section-header">
      <div>
        <h3>出發梯次</h3>
        <p>設定這項旅遊商品可供買家選擇的出發及結束時間。</p>
      </div>

      <el-button type="primary" :disabled="loading" @click="showCreateForm = true"> 新增梯次 </el-button>
    </header>

    <el-alert
      v-if="bookingMode === 'FLEXIBLE_DATE'"
      title="目前是自由日期商品"
      description="自由日期商品通常不需要建立固定梯次；如有指定可預訂日期，仍可在這裡新增。"
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
        <el-form-item label="出發時間" required>
          <el-date-picker
            v-model="form.startTime"
            type="datetime"
            class="full-width"
            placeholder="選擇出發日期與時間"
            :disabled-date="disablePastDate"
          />
        </el-form-item>

        <el-form-item label="結束時間" required>
          <el-date-picker
            v-model="form.endTime"
            type="datetime"
            class="full-width"
            placeholder="選擇結束日期與時間"
            :disabled-date="disablePastDate"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button :disabled="submitting" @click="showCreateForm = false"> 取消 </el-button>

        <el-button type="primary" :loading="submitting" @click="submitDeparture"> 確認新增 </el-button>
      </template>
    </el-dialog>

    <div v-if="loading" class="state-box">正在載入出發梯次……</div>

    <el-empty v-else-if="departures.length === 0" description="目前尚未建立出發梯次" />

    <el-table v-else :data="departures" border stripe>
      <el-table-column prop="id" label="梯次 ID" width="100" />

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
        <template #default="{ row }"> {{ calculateDays(row.startTime, row.endTime) }} 天 </template>
      </el-table-column>
    </el-table>
  </section>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { onMounted, reactive, ref } from "vue";

import { AdminTrip } from "@/api/interface";
import { createAdminTripDeparture, getAdminTripDepartures } from "@/api/modules/trip";

const props = defineProps<{
  tripId: number;
  bookingMode: AdminTrip.TripBookingMode | null;
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
  startTime: Date | undefined;
  endTime: Date | undefined;
}>({
  startTime: undefined,
  endTime: undefined
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
  if (!form.startTime || !form.endTime) {
    ElMessage.warning("請選擇出發時間與結束時間");
    return;
  }

  if (form.endTime <= form.startTime) {
    ElMessage.warning("結束時間必須晚於出發時間");
    return;
  }

  submitting.value = true;
  setBusy(true);

  try {
    await createAdminTripDeparture(props.tripId, {
      startTime: form.startTime.toISOString(),
      endTime: form.endTime.toISOString()
    });

    ElMessage.success("出發梯次新增成功");

    form.startTime = undefined;
    form.endTime = undefined;
    showCreateForm.value = false;

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
