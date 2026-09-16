<template>
  <section class="trip-day-section" aria-labelledby="trip-editor-day-title">
    <div class="day-section-header">
      <div>
        <h3 id="trip-editor-day-title">每日行程</h3>
        <p class="day-section-description">依天數編排每日路線、餐食、住宿與交通資訊；儲存後會立即從伺服器重新載入。</p>
      </div>
      <div class="day-section-actions">
        <el-button text :icon="Refresh" :loading="loading" :disabled="isBusy || loadError" @click="loadDays">重新整理</el-button>
        <el-button type="primary" :icon="Plus" :disabled="isBusy || loadError" @click="addDay">新增一天</el-button>
      </div>
    </div>

    <div v-if="loading && days.length === 0" class="day-state" role="status">正在載入每日行程…</div>
    <div v-else-if="loadError" class="day-state day-state-error" role="alert">
      <p>每日行程載入失敗，請稍後再試。</p>
      <el-button type="primary" plain :disabled="isBusy" @click="loadDays">重新載入</el-button>
    </div>
    <el-empty v-else-if="days.length === 0" description="尚未建立每日行程">
      <el-button type="primary" :disabled="isBusy" @click="addDay">新增第一天</el-button>
    </el-empty>

    <div v-else class="day-list">
      <article v-for="day in days" :key="day.key" class="day-card" :class="{ 'is-dirty': isDayDirty(day) }">
        <div class="day-card-header">
          <div class="day-heading">
            <span class="day-number-label">DAY {{ day.dayNumber }}</span>
            <div>
              <h4>{{ day.title || "尚未命名" }}</h4>
              <p>{{ day.id === null ? "尚未儲存" : `每日行程 ID：${day.id}` }}</p>
            </div>
          </div>
          <div class="day-card-header-actions">
            <el-tag v-if="isDayDirty(day)" type="warning" size="small">尚未儲存</el-tag>
            <el-button text type="danger" :disabled="isBusy" :loading="deletingKey === day.key" @click="deleteDay(day)">
              刪除一天
            </el-button>
          </div>
        </div>

        <el-form
          :ref="instance => setDayFormRef(day.key, instance)"
          class="day-form"
          :model="day"
          :rules="dayRules"
          label-position="top"
          @submit.prevent
        >
          <div class="day-form-grid day-form-grid-primary">
            <el-form-item label="第幾天" prop="dayNumber">
              <el-input-number
                v-model="day.dayNumber"
                class="full-width"
                :min="1"
                :step="1"
                :precision="0"
                controls-position="right"
              />
            </el-form-item>
            <el-form-item label="路線標題" prop="title">
              <el-input v-model="day.title" clearable maxlength="100" show-word-limit placeholder="例如：京都市區文化巡禮" />
            </el-form-item>
          </div>

          <el-form-item label="當日行程內容" prop="content">
            <el-input v-model="day.content" type="textarea" :rows="4" resize="vertical" placeholder="請輸入當日詳細行程" />
          </el-form-item>

          <el-divider content-position="left">餐食與住宿</el-divider>
          <div class="day-form-grid day-form-grid-meals">
            <el-form-item label="早餐" prop="breakfast">
              <el-input v-model="day.breakfast" clearable maxlength="100" placeholder="例如：飯店早餐" />
            </el-form-item>
            <el-form-item label="午餐" prop="lunch">
              <el-input v-model="day.lunch" clearable maxlength="100" placeholder="例如：當地料理" />
            </el-form-item>
            <el-form-item label="晚餐" prop="dinner">
              <el-input v-model="day.dinner" clearable maxlength="100" placeholder="例如：自理" />
            </el-form-item>
            <el-form-item label="住宿" prop="hotel">
              <el-input v-model="day.hotel" clearable maxlength="150" placeholder="例如：京都市區飯店" />
            </el-form-item>
          </div>

          <el-form-item label="交通方式" prop="transportation">
            <el-input v-model="day.transportation" clearable maxlength="200" placeholder="例如：遊覽車、電車" />
          </el-form-item>

          <el-divider content-position="left">費用與備註</el-divider>
          <div class="day-form-grid day-form-grid-fee">
            <el-form-item label="每人額外費用" prop="extraFee">
              <el-input-number
                v-model="day.extraFee"
                class="full-width"
                :min="0"
                :step="100"
                :precision="2"
                controls-position="right"
              />
            </el-form-item>
            <el-form-item label="額外費用說明" prop="extraFeeDescription">
              <el-input v-model="day.extraFeeDescription" clearable maxlength="500" placeholder="例如：自費活動費用" />
            </el-form-item>
          </div>
          <el-form-item label="其他注意事項" prop="note">
            <el-input
              v-model="day.note"
              type="textarea"
              :rows="3"
              resize="vertical"
              maxlength="1000"
              show-word-limit
              placeholder="請輸入當日注意事項（選填）"
            />
          </el-form-item>
        </el-form>

        <div class="day-card-footer">
          <el-button v-if="isDayDirty(day)" text @click="discardChanges(day)">
            {{ day.id === null ? "取消新增" : "還原變更" }}
          </el-button>
          <span v-else class="day-save-hint">資料已與伺服器同步</span>
          <el-button
            type="primary"
            :loading="savingKey === day.key"
            :disabled="isBusy && savingKey !== day.key"
            @click="saveDay(day)"
          >
            {{ day.id === null ? "儲存這一天" : "儲存變更" }}
          </el-button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts" name="TripDaySection">
import { Plus, Refresh } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";
import { computed, onBeforeUnmount, ref, watch } from "vue";

import { AdminTrip } from "@/api/interface";
import { createAdminTripDay, deleteAdminTripDay, getAdminTripDays, updateAdminTripDay } from "@/api/modules/trip";

interface EditableTripDay {
  key: string;
  id: number | null;
  dayNumber: number;
  title: string;
  content: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  hotel: string;
  transportation: string;
  extraFee: number;
  extraFeeDescription: string;
  note: string;
}

const props = defineProps<{ tripId: number }>();
const emit = defineEmits<{
  changed: [];
  busyChange: [busy: boolean];
  dirtyChange: [dirty: boolean];
}>();

const days = ref<EditableTripDay[]>([]);
const loading = ref(false);
const loadError = ref(false);
const savingKey = ref<string | null>(null);
const deletingKey = ref<string | null>(null);
const dayFormRefs = new Map<string, FormInstance>();
const persistedSnapshots = new Map<string, EditableTripDay>();
let requestSequence = 0;
let newDaySequence = 0;
let disposed = false;

const isBusy = computed(() => loading.value || savingKey.value !== null || deletingKey.value !== null);
const isDayDirty = (day: EditableTripDay) => {
  const snapshot = persistedSnapshots.get(day.key);
  return snapshot ? serializeDay(day) !== serializeDay(snapshot) : true;
};
const hasUnsavedChanges = computed(() => days.value.some(day => isDayDirty(day)));

const optionalText = (value: string) => value.trim() || null;

const toDayPayload = (day: EditableTripDay): AdminTrip.TripDayRequest => ({
  dayNumber: day.dayNumber,
  title: day.title.trim(),
  content: optionalText(day.content),
  breakfast: optionalText(day.breakfast),
  lunch: optionalText(day.lunch),
  dinner: optionalText(day.dinner),
  hotel: optionalText(day.hotel),
  transportation: optionalText(day.transportation),
  extraFee: day.extraFee,
  extraFeeDescription: optionalText(day.extraFeeDescription),
  note: optionalText(day.note)
});

const serializeDay = (day: EditableTripDay) => JSON.stringify(toDayPayload(day));

const cloneDay = (day: EditableTripDay): EditableTripDay => ({ ...day });

const toEditableDay = (day: AdminTrip.TripDayResponse): EditableTripDay => ({
  key: `day-${day.id}`,
  id: day.id,
  dayNumber: day.dayNumber,
  title: day.title ?? "",
  content: day.content ?? "",
  breakfast: day.breakfast ?? "",
  lunch: day.lunch ?? "",
  dinner: day.dinner ?? "",
  hotel: day.hotel ?? "",
  transportation: day.transportation ?? "",
  extraFee: day.extraFee ?? 0,
  extraFeeDescription: day.extraFeeDescription ?? "",
  note: day.note ?? ""
});

const validateDayNumber = (_rule: unknown, value: unknown, callback: (error?: Error) => void) => {
  if (!Number.isInteger(value) || Number(value) < 1) {
    callback(new Error("每日行程必須是大於等於 1 的整數"));
    return;
  }
  callback();
};

const validateTitle = (_rule: unknown, value: unknown, callback: (error?: Error) => void) => {
  if (typeof value !== "string" || !value.trim()) {
    callback(new Error("路線標題不可為空"));
    return;
  }
  callback();
};

const validateExtraFee = (_rule: unknown, value: unknown, callback: (error?: Error) => void) => {
  if (value !== null && value !== undefined && (typeof value !== "number" || !Number.isFinite(value) || value < 0)) {
    callback(new Error("額外費用不能小於 0"));
    return;
  }
  callback();
};

const dayRules: FormRules = {
  dayNumber: [{ required: true, validator: validateDayNumber, trigger: ["change", "blur"] }],
  title: [{ required: true, validator: validateTitle, trigger: "blur" }],
  extraFee: [{ validator: validateExtraFee, trigger: ["change", "blur"] }]
};

const setDayFormRef = (key: string, instance: unknown) => {
  if (instance) {
    dayFormRefs.set(key, instance as FormInstance);
  } else {
    dayFormRefs.delete(key);
  }
};

const saveSnapshots = (nextDays: EditableTripDay[]) => {
  persistedSnapshots.clear();
  nextDays.forEach(day => persistedSnapshots.set(day.key, cloneDay(day)));
};

const loadDays = async () => {
  if (disposed) return false;

  const sequence = ++requestSequence;
  loading.value = true;
  loadError.value = false;
  try {
    const response = await getAdminTripDays(props.tripId);
    if (disposed || sequence !== requestSequence) return false;

    const nextDays = (Array.isArray(response) ? response : [])
      .map(toEditableDay)
      .sort((left, right) => left.dayNumber - right.dayNumber || (left.id ?? 0) - (right.id ?? 0));
    days.value = nextDays;
    saveSnapshots(nextDays);
    return true;
  } catch {
    if (!disposed && sequence === requestSequence) loadError.value = true;
    return false;
  } finally {
    if (!disposed && sequence === requestSequence) loading.value = false;
  }
};

const addDay = () => {
  if (isBusy.value || loadError.value) return;

  const nextDayNumber = days.value.reduce((maximum, day) => Math.max(maximum, day.dayNumber), 0) + 1;
  newDaySequence += 1;
  days.value.push({
    key: `new-${newDaySequence}`,
    id: null,
    dayNumber: nextDayNumber,
    title: "",
    content: "",
    breakfast: "",
    lunch: "",
    dinner: "",
    hotel: "",
    transportation: "",
    extraFee: 0,
    extraFeeDescription: "",
    note: ""
  });
};

const refreshAfterMutation = async (successMessage: string) => {
  const refreshed = await loadDays();
  if (refreshed) {
    ElMessage.success(successMessage);
  } else {
    ElMessage.warning("資料已儲存，但每日行程重新整理失敗，請稍後重新整理。");
  }
  emit("changed");
};

const saveDay = async (day: EditableTripDay) => {
  if (isBusy.value) return;

  const form = dayFormRefs.get(day.key);
  const valid = await form?.validate().catch(() => false);
  if (!valid) return;

  savingKey.value = day.key;
  try {
    const payload = toDayPayload(day);
    if (day.id === null) {
      await createAdminTripDay(props.tripId, payload);
      await refreshAfterMutation("每日行程新增成功");
    } else {
      await updateAdminTripDay(props.tripId, day.id, payload);
      await refreshAfterMutation("每日行程更新成功");
    }
  } catch {
    // API 錯誤訊息由全域攔截器處理，保留目前編輯內容讓使用者修正後重試。
  } finally {
    savingKey.value = null;
  }
};

const deleteDay = async (day: EditableTripDay) => {
  if (isBusy.value) return;

  const dayId = day.id;
  const isDraft = dayId === null;
  try {
    await ElMessageBox.confirm(
      isDraft ? "確定移除尚未儲存的每日行程嗎？" : `確定刪除第 ${day.dayNumber} 天嗎？刪除後無法復原。`,
      isDraft ? "移除每日行程草稿" : "刪除每日行程",
      { type: "warning", confirmButtonText: isDraft ? "移除" : "刪除", cancelButtonText: "取消" }
    );
  } catch {
    return;
  }

  if (isDraft) {
    days.value = days.value.filter(item => item.key !== day.key);
    persistedSnapshots.delete(day.key);
    ElMessage.success("每日行程草稿已移除");
    return;
  }

  deletingKey.value = day.key;
  try {
    await deleteAdminTripDay(props.tripId, dayId);
    await refreshAfterMutation("每日行程已刪除");
  } catch {
    // API 錯誤訊息由全域攔截器處理，保留目前清單讓使用者重試。
  } finally {
    deletingKey.value = null;
  }
};

const discardChanges = (day: EditableTripDay) => {
  if (day.id === null) {
    days.value = days.value.filter(item => item.key !== day.key);
    persistedSnapshots.delete(day.key);
    return;
  }

  const snapshot = persistedSnapshots.get(day.key);
  if (!snapshot) return;
  Object.assign(day, cloneDay(snapshot));
  dayFormRefs.get(day.key)?.clearValidate();
};

watch(isBusy, busy => emit("busyChange", busy), { immediate: true });
watch(hasUnsavedChanges, dirty => emit("dirtyChange", dirty), { immediate: true });

watch(
  () => props.tripId,
  () => {
    void loadDays();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  disposed = true;
  requestSequence += 1;
  dayFormRefs.clear();
  persistedSnapshots.clear();
});
</script>

<style scoped lang="scss">
.trip-day-section {
  padding: 0 4px;
}
.day-section-header,
.day-section-actions,
.day-card-header,
.day-heading,
.day-card-header-actions,
.day-card-footer {
  display: flex;
  align-items: center;
}
.day-section-header {
  gap: 16px;
  justify-content: space-between;
  margin-bottom: 8px;
}
.day-section-header h3 {
  margin: 0 0 8px;
  font-size: var(--el-font-size-large);
  color: var(--el-text-color-primary);
}
.day-section-description,
.day-save-hint {
  margin: 0;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}
.day-section-actions {
  flex-shrink: 0;
  gap: 8px;
}
.day-state {
  display: grid;
  gap: 16px;
  justify-items: center;
  min-height: 220px;
  padding: 48px 24px;
  color: var(--el-text-color-secondary);
  text-align: center;
}
.day-state p {
  margin: 0;
}
.day-state-error {
  color: var(--el-color-danger);
}
.day-list {
  display: grid;
  gap: 20px;
  margin-top: 24px;
}
.day-card {
  padding: 20px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--el-border-radius-base);
  box-shadow: var(--el-box-shadow-lighter);
}
.day-card.is-dirty {
  border-color: var(--el-color-warning-light-5);
}
.day-card-header {
  gap: 16px;
  justify-content: space-between;
  padding-bottom: 16px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.day-heading {
  gap: 14px;
  min-width: 0;
}
.day-number-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 68px;
  min-height: 36px;
  padding: 0 10px;
  font-size: var(--el-font-size-small);
  font-weight: 700;
  color: var(--el-color-primary);
  letter-spacing: 0.04em;
  background: var(--el-color-primary-light-9);
  border-radius: var(--el-border-radius-base);
}
.day-heading h4 {
  margin: 0 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--el-font-size-medium);
  color: var(--el-text-color-primary);
  white-space: nowrap;
}
.day-heading p {
  margin: 0;
  font-size: var(--el-font-size-small);
  color: var(--el-text-color-secondary);
}
.day-card-header-actions {
  flex-shrink: 0;
  gap: 8px;
}
.day-form {
  min-width: 0;
}
.day-form-grid {
  display: grid;
  gap: 0 20px;
}
.day-form-grid-primary,
.day-form-grid-fee {
  grid-template-columns: minmax(140px, 0.45fr) minmax(0, 1fr);
}
.day-form-grid-meals {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.full-width {
  width: 100%;
}
.day-card-footer {
  gap: 12px;
  justify-content: space-between;
  padding-top: 16px;
  margin-top: 8px;
  border-top: 1px solid var(--el-border-color-lighter);
}
.day-save-hint {
  font-size: var(--el-font-size-small);
}

@media (width <= 768px) {
  .day-section-header,
  .day-card-header {
    flex-direction: column;
    align-items: stretch;
  }
  .day-section-actions,
  .day-card-header-actions {
    justify-content: flex-end;
  }
  .day-form-grid-primary,
  .day-form-grid-meals,
  .day-form-grid-fee {
    grid-template-columns: minmax(0, 1fr);
  }
  .day-card {
    padding: 16px;
  }
}
</style>
