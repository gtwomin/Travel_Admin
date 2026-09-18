<template>
  <el-drawer
    v-model="drawerVisible"
    class="trip-editor-drawer"
    :destroy-on-close="true"
    size="min(1100px, 100vw)"
    :title="drawerTitle"
    :close-on-click-modal="!loading && !submitting && !photoBusy && !dayBusy"
    :close-on-press-escape="!loading && !submitting && !photoBusy && !dayBusy"
    :show-close="!loading && !submitting && !photoBusy && !dayBusy"
    :before-close="handleBeforeClose"
    @closed="handleClosed"
  >
    <div class="trip-editor-content">
      <el-steps :active="currentStep" align-center class="trip-editor-steps">
        <el-step title="基本資料" />
        <el-step title="行程圖片" />
        <el-step title="每日行程" />
        <el-step title="出發梯次" />
        <el-step title="預覽與上架" />
      </el-steps>

      <div v-if="loading" class="editor-state" role="status">正在載入行程資料…</div>
      <div v-else-if="loadError" class="editor-state editor-state-error" role="alert">
        <p>行程資料載入失敗，尚未填入任何資料。</p>
        <el-button type="primary" plain @click="retryEdit">重新載入</el-button>
      </div>

      <div v-else class="trip-editor-step-panel">
        <el-form
          v-if="currentStep === 0"
          ref="formRef"
          class="trip-form"
          :model="form"
          :rules="rules"
          label-position="top"
          @submit.prevent
        >
          <el-divider content-position="left">基本資料</el-divider>
          <div class="form-grid">
            <el-form-item label="行程名稱" prop="tripName">
              <el-input v-model.trim="form.tripName" clearable placeholder="請輸入行程名稱" />
            </el-form-item>
            <el-form-item label="行程摘要" prop="summary">
              <el-input v-model="form.summary" clearable placeholder="請輸入行程摘要（選填）" />
            </el-form-item>
          </div>

          <el-divider content-position="left">商品設定</el-divider>
          <div class="form-grid">
            <el-form-item label="售價" prop="tripPrice">
              <el-input-number
                v-model="form.tripPrice"
                class="full-width"
                :min="0"
                :step="1"
                :precision="0"
                controls-position="right"
                placeholder="請輸入售價"
              />
            </el-form-item>
            <el-form-item label="出發城市" prop="departureCity">
              <el-select v-model="departureCityModel" class="full-width" placeholder="請選擇出發城市">
                <el-option v-for="city in departureCityOptions" :key="city" :label="city" :value="city" />
              </el-select>
            </el-form-item>
            <el-form-item label="國家／地區">
              <el-select v-model="selectedCountry" class="full-width" filterable clearable placeholder="全部國家／地區">
                <el-option v-for="country in countryOptions" :key="country.value" :label="country.label" :value="country.value" />
              </el-select>
              <p class="form-hint">僅篩選可選城市；切換國家／地區會保留已選城市，可跨國選擇。</p>
            </el-form-item>
            <el-form-item label="目的城市" prop="destinations">
              <el-select
                v-model="form.destinations"
                class="full-width"
                multiple
                filterable
                clearable
                :loading="cityOptionsLoading"
                placeholder="請選擇目的城市"
              >
                <el-option
                  v-for="option in filteredCityOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
              <p v-if="cityOptionsError" class="form-hint form-hint-error">目的城市選項載入失敗，請重新開啟或稍後再試。</p>
              <p v-else-if="cityOptionsLoading" class="form-hint">正在載入目的城市選項…</p>
            </el-form-item>
            <el-form-item label="預訂模式" prop="bookingMode">
              <el-select v-model="bookingModeModel" class="full-width" clearable placeholder="請選擇預訂模式">
                <el-option label="自由日期" value="FLEXIBLE_DATE" />
                <el-option label="固定梯次" value="FIXED_DEPARTURE" />
              </el-select>
            </el-form-item>
            <el-form-item label="商品類型" prop="productType">
              <el-select v-model="productTypeModel" class="full-width" clearable placeholder="請選擇商品類型">
                <el-option label="套裝行程" value="PACKAGE_TOUR" />
                <el-option label="私人包團" value="PRIVATE_GROUP" />
                <el-option label="包車行程" value="CHARTER_TOUR" />
              </el-select>
            </el-form-item>
            <el-form-item v-if="status" label="目前狀態">
              <div class="status-readonly">
                <el-tag :type="statusTagType">{{ statusLabel }}</el-tag>
                <span>狀態請於行程列表操作。</span>
              </div>
            </el-form-item>
          </div>

          <el-divider content-position="left">商品介紹</el-divider>
          <el-form-item label="商品總體介紹" prop="tripContent">
            <el-input
              v-model="form.tripContent"
              type="textarea"
              :rows="7"
              resize="vertical"
              placeholder="請輸入商品總體介紹（選填）"
            />
          </el-form-item>
        </el-form>

        <TripPhotoSection
          v-else-if="currentStep === 1 && isPersisted"
          :trip-id="persistedTripId"
          @busy-change="handlePhotoBusyChange"
          @changed="handlePhotoChanged"
        />
        <section v-else-if="currentStep === 1" class="placeholder-step" aria-labelledby="trip-editor-photo-title">
          <el-tag type="info">尚未建立行程</el-tag>
          <h3 id="trip-editor-photo-title">行程圖片</h3>
          <p>請先完成基本資料，建立行程後才能管理圖片。</p>
        </section>
        <TripDaySection
          v-else-if="currentStep === 2 && isPersisted"
          :trip-id="persistedTripId"
          @busy-change="handleDayBusyChange"
          @dirty-change="handleDayDirtyChange"
          @changed="handleDayChanged"
        />
        <section v-else-if="currentStep === 2" class="placeholder-step" aria-labelledby="trip-editor-day-title">
          <el-tag type="info">後續階段開放</el-tag>
          <h3 id="trip-editor-day-title">每日行程</h3>
          <p>每日行程與景點編排將於後續階段開放。</p>
        </section>
        <TripDepartureSection
          v-else-if="currentStep === 3 && isPersisted"
          :trip-id="persistedTripId"
          :booking-mode="form.bookingMode"
          @busy-change="handleDepartureBusyChange"
          @changed="handleDepartureChanged"
        />

        <section v-else-if="currentStep === 3" class="placeholder-step">
          <el-tag type="info">尚未建立行程</el-tag>
          <h3>出發梯次</h3>
          <p>請先建立行程，才能新增出發梯次。</p>
        </section>
        <TripPreviewSection
          v-else-if="currentStep === 4 && isPersisted"
          ref="previewSectionRef"
          :trip-id="persistedTripId"
          :trip-name="form.tripName"
          :summary="form.summary"
          :trip-price="form.tripPrice"
          :destinations="form.destinations"
          :booking-mode="form.bookingMode"
          @busy-change="handlePreviewBusyChange"
        />
      </div>
    </div>

    <template #footer>
      <div class="trip-editor-footer">
        <el-button :disabled="loading || submitting || photoBusy || dayBusy || departureBusy" @click="requestClose">{{
          isPersisted ? "關閉" : "取消 / 關閉"
        }}</el-button>
        <div v-if="!loading && !loadError" class="trip-editor-footer-actions">
          <el-button
            v-if="currentStep > 0"
            :disabled="submitting || photoBusy || dayBusy || departureBusy || (currentStep === 2 && dayDirty)"
            @click="previousStep"
          >
            上一步
          </el-button>
          <el-button v-if="currentStep === 0" type="primary" :loading="submitting" @click="saveBasicInfo">
            {{ mode === "create" ? "建立並繼續" : "儲存並繼續" }}
          </el-button>
          <el-button
            v-else-if="currentStep < 4"
            type="primary"
            :disabled="submitting || photoBusy || dayBusy || departureBusy || (currentStep === 2 && dayDirty)"
            @click="nextStep"
          >
            {{ currentStep === 2 && dayDirty ? "請先儲存每日行程" : "下一步" }}
          </el-button>
          <template v-else-if="currentStep === 4">
            <el-button :disabled="submitting || previewBusy" @click="changeTripStatus('INACTIVE')"> 儲存並下架 </el-button>

            <el-button type="primary" :loading="submitting" :disabled="previewBusy" @click="changeTripStatus('ACTIVE')">
              正式上架
            </el-button>
          </template>
        </div>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts" name="TripEditorDrawer">
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";
import { computed, reactive, ref } from "vue";

import { AdminTrip } from "@/api/interface";
import {
  createAdminTrip,
  getAdminTripCities,
  getAdminTripDetail,
  updateAdminTrip,
  updateAdminTripStatus
} from "@/api/modules/trip";

import TripDaySection from "./TripDaySection.vue";
import TripPhotoSection from "./TripPhotoSection.vue";
import TripDepartureSection from "./TripDepartureSection.vue";
import TripPreviewSection from "./TripPreviewSection.vue";

type EditorMode = "create" | "edit";
type WizardStep = 0 | 1 | 2 | 3 | 4;

interface TripFormModel {
  departureCity: AdminTrip.DepartureCity | null;
  tripName: string;
  summary: string;
  tripPrice: number;
  destinations: AdminTrip.TravelDestination[];
  bookingMode: AdminTrip.TripBookingMode | null;
  productType: AdminTrip.TripProductType | null;
  tripContent: string;
}

const emit = defineEmits<{ saved: [] }>();

const createDefaultForm = (): TripFormModel => ({
  departureCity: null,
  tripName: "",
  summary: "",
  tripPrice: 0,
  destinations: [],
  bookingMode: "FLEXIBLE_DATE",
  productType: "PACKAGE_TOUR",
  tripContent: ""
});

const drawerVisible = ref(false);
const mode = ref<EditorMode>("create");
const departureBusy = ref(false);
const previewBusy = ref(false);
const previewSectionRef = ref<{
  validateForPublish: () => boolean;
} | null>(null);
const tripId = ref<number | null>(null);
const currentStep = ref<WizardStep>(0);
const status = ref<AdminTrip.TripStatus | null>(null);
const loading = ref(false);
const submitting = ref(false);
const loadError = ref(false);
const photoBusy = ref(false);
const dayBusy = ref(false);
const dayDirty = ref(false);
const formRef = ref<FormInstance>();
const form = reactive<TripFormModel>(createDefaultForm());
const cityOptions = ref<AdminTrip.CityOptionResponse[]>([]);
const cityOptionsLoading = ref(false);
const cityOptionsError = ref(false);
const departureCityOptions: AdminTrip.DepartureCity[] = ["高雄", "台中", "台北", "桃園"];
// 國家／地區僅用於前端篩選，儲存時維持 destinations 的既有 API 契約。
const countryOptions = [
  { value: "TW", label: "台灣" },
  { value: "JP", label: "日本" },
  { value: "KR", label: "韓國" },
  { value: "TH", label: "泰國" },
  { value: "SG", label: "新加坡" },
  { value: "MY", label: "馬來西亞" },
  { value: "CN", label: "中國" },
  { value: "HK", label: "香港" },
  { value: "MO", label: "澳門" }
] as const;
type CountryCode = (typeof countryOptions)[number]["value"];
const destinationCountries: Record<AdminTrip.TravelDestination, CountryCode> = {
  TAIPEI: "TW",
  KAOHSIUNG: "TW",
  TOKYO: "JP",
  OSAKA: "JP",
  KYOTO: "JP",
  HOKKAIDO: "JP",
  SEOUL: "KR",
  BUSAN: "KR",
  BANGKOK: "TH",
  CHIANG_MAI: "TH",
  SINGAPORE: "SG",
  KUALA_LUMPUR: "MY",
  SHANGHAI: "CN",
  HONG_KONG: "HK",
  MACAU: "MO"
};
const selectedCountry = ref<CountryCode | "">("");
const filteredCityOptions = computed(() =>
  selectedCountry.value
    ? cityOptions.value.filter(option => destinationCountries[option.value] === selectedCountry.value)
    : cityOptions.value
);
let requestSequence = 0;

const serializeForm = (value: TripFormModel) =>
  JSON.stringify({
    departureCity: value.departureCity,
    tripName: value.tripName,
    summary: value.summary,
    tripPrice: value.tripPrice,
    destinations: value.destinations,
    bookingMode: value.bookingMode,
    productType: value.productType,
    tripContent: value.tripContent
  });

const savedFormSnapshot = ref(serializeForm(form));
const isDirty = computed(() => serializeForm(form) !== savedFormSnapshot.value);
const hasPendingChanges = computed(() => isDirty.value || dayDirty.value);
const isPersisted = computed(() => tripId.value !== null);
const persistedTripId = computed(() => tripId.value ?? 0);
const drawerTitle = computed(() => (mode.value === "create" ? "新增行程" : "編輯行程"));
const statusLabel = computed(() => (status.value === "ACTIVE" ? "已上架" : status.value === "INACTIVE" ? "已下架" : "—"));
const statusTagType = computed<"success" | "info">(() => (status.value === "ACTIVE" ? "success" : "info"));
const departureCityModel = computed<AdminTrip.DepartureCity | undefined>({
  get: () => form.departureCity ?? undefined,
  set: value => {
    form.departureCity = value ?? null;
  }
});
const bookingModeModel = computed<AdminTrip.TripBookingMode | undefined>({
  get: () => form.bookingMode ?? undefined,
  set: value => {
    form.bookingMode = value ?? null;
  }
});
const productTypeModel = computed<AdminTrip.TripProductType | undefined>({
  get: () => form.productType ?? undefined,
  set: value => {
    form.productType = value ?? null;
  }
});

const validateTripName = (_rule: unknown, value: unknown, callback: (error?: Error) => void) => {
  if (typeof value !== "string" || !value.trim()) {
    callback(new Error("行程名稱不可為空"));
    return;
  }
  callback();
};

const validateTripPrice = (_rule: unknown, value: unknown, callback: (error?: Error) => void) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    callback(new Error("售價必須大於 0"));
    return;
  }
  callback();
};

const validateDestinations = (_rule: unknown, value: unknown, callback: (error?: Error) => void) => {
  if (!Array.isArray(value) || value.length === 0) {
    callback(new Error("至少選擇一個目的城市"));
    return;
  }
  callback();
};

const rules: FormRules = {
  tripName: [{ required: true, validator: validateTripName, trigger: "blur" }],
  tripPrice: [{ required: true, validator: validateTripPrice, trigger: ["change", "blur"] }],
  destinations: [{ required: true, validator: validateDestinations, trigger: "change" }]
};

const toTripPayload = (): AdminTrip.TripBaseRequest => ({
  departureCity: form.departureCity,
  tripName: form.tripName.trim(),
  summary: form.summary.trim() || null,
  tripContent: form.tripContent.trim() || null,
  tripPrice: form.tripPrice,
  destinations: [...form.destinations],
  bookingMode: form.bookingMode,
  productType: form.productType
});

const resetForm = () => {
  selectedCountry.value = "";
  Object.assign(form, createDefaultForm());
  savedFormSnapshot.value = serializeForm(form);
  formRef.value?.clearValidate();
};

const resetEditorState = () => {
  requestSequence += 1;
  mode.value = "create";
  tripId.value = null;
  currentStep.value = 0;
  status.value = null;
  loading.value = false;
  submitting.value = false;
  loadError.value = false;
  photoBusy.value = false;
  dayBusy.value = false;
  dayDirty.value = false;
  resetForm();
};
const handleDepartureBusyChange = (busy: boolean) => {
  departureBusy.value = busy;
};

const handleDepartureChanged = () => {
  emit("saved");
};
const handlePreviewBusyChange = (busy: boolean) => {
  previewBusy.value = busy;
};
const handlePhotoBusyChange = (busy: boolean) => {
  photoBusy.value = busy;
};

const handlePhotoChanged = () => {
  emit("saved");
};

const handleDayBusyChange = (busy: boolean) => {
  dayBusy.value = busy;
};

const handleDayDirtyChange = (dirty: boolean) => {
  dayDirty.value = dirty;
};

const handleDayChanged = () => {
  emit("saved");
};

const loadCityOptions = async () => {
  if (cityOptionsLoading.value || cityOptions.value.length) return;

  cityOptionsLoading.value = true;
  cityOptionsError.value = false;
  try {
    cityOptions.value = await getAdminTripCities();
  } catch {
    cityOptionsError.value = true;
  } finally {
    cityOptionsLoading.value = false;
  }
};

const loadEditDetail = async (id: number, requestId: number) => {
  try {
    const detail = await getAdminTripDetail(id);
    if (requestId !== requestSequence) return;

    Object.assign(form, {
      departureCity: detail.departureCity ?? null,
      tripName: detail.tripName ?? "",
      summary: detail.summary ?? "",
      tripPrice: detail.tripPrice,
      destinations: [...detail.destinations],
      bookingMode: detail.bookingMode ?? null,
      productType: detail.productType ?? null,
      tripContent: detail.tripContent ?? ""
    });
    status.value = detail.status;
    savedFormSnapshot.value = serializeForm(form);
    loadError.value = false;
  } catch {
    if (requestId === requestSequence) loadError.value = true;
  } finally {
    if (requestId === requestSequence) loading.value = false;
  }
};

const openCreate = () => {
  resetEditorState();
  drawerVisible.value = true;
  void loadCityOptions();
};

const openEdit = (id: number) => {
  resetEditorState();
  mode.value = "edit";
  tripId.value = id;
  loading.value = true;
  drawerVisible.value = true;
  const requestId = ++requestSequence;
  void loadCityOptions();
  void loadEditDetail(id, requestId);
};

const retryEdit = () => {
  if (mode.value !== "edit" || tripId.value === null || loading.value) return;

  loadError.value = false;
  loading.value = true;
  const requestId = ++requestSequence;
  void loadEditDetail(tripId.value, requestId);
};

const saveBasicInfo = async () => {
  if (loading.value || submitting.value || loadError.value) return;

  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    const payload = toTripPayload();
    if (mode.value === "create" && tripId.value === null) {
      const createdTrip = await createAdminTrip(payload);
      tripId.value = createdTrip.id;
      status.value = "INACTIVE";
      mode.value = "edit";
      ElMessage.success("行程新增成功");
    } else {
      if (tripId.value === null) return;
      await updateAdminTrip(tripId.value, payload);
      ElMessage.success("行程更新成功");
    }

    savedFormSnapshot.value = serializeForm(form);
    emit("saved");
    currentStep.value = 1;
  } catch {
    // API 錯誤訊息由全域攔截器處理，保留 Drawer 讓使用者修正後重試。
  } finally {
    submitting.value = false;
  }
};

const previousStep = () => {
  if (
    submitting.value ||
    photoBusy.value ||
    dayBusy.value ||
    (currentStep.value === 2 && dayDirty.value) ||
    currentStep.value === 0
  )
    return;
  currentStep.value = (currentStep.value - 1) as WizardStep;
};

const nextStep = () => {
  if (
    submitting.value ||
    photoBusy.value ||
    dayBusy.value ||
    (currentStep.value === 2 && dayDirty.value) ||
    currentStep.value >= 4 ||
    !isPersisted.value
  ) {
    return;
  }
  currentStep.value = (currentStep.value + 1) as WizardStep;
};
const changeTripStatus = async (nextStatus: AdminTrip.TripStatus) => {
  if (tripId.value === null || submitting.value || previewBusy.value) {
    return;
  }

  if (nextStatus === "ACTIVE" && !previewSectionRef.value?.validateForPublish()) {
    ElMessage.warning("請先完成所有必要資料再上架");

    return;
  }

  submitting.value = true;

  try {
    await updateAdminTripStatus(tripId.value, {
      status: nextStatus
    });

    status.value = nextStatus;
    emit("saved");

    ElMessage.success(nextStatus === "ACTIVE" ? "行程已成功上架" : "行程已儲存至下架區");

    drawerVisible.value = false;
  } finally {
    submitting.value = false;
  }
};
const confirmCloseIfDirty = async () => {
  if (!hasPendingChanges.value) return true;

  try {
    await ElMessageBox.confirm("目前修改尚未儲存，確定離開？", "確認離開", {
      type: "warning",
      confirmButtonText: "確定離開",
      cancelButtonText: "繼續編輯"
    });
    return true;
  } catch {
    return false;
  }
};

const requestClose = async () => {
  if (loading.value || submitting.value || photoBusy.value || dayBusy.value) return;
  if (await confirmCloseIfDirty()) drawerVisible.value = false;
};

const handleBeforeClose = (done: () => void) => {
  if (loading.value || submitting.value || photoBusy.value || dayBusy.value) return;
  void confirmCloseIfDirty().then(shouldClose => {
    if (shouldClose) done();
  });
};

const handleClosed = () => {
  resetEditorState();
};

defineExpose({ openCreate, openEdit });
</script>

<style scoped lang="scss">
.trip-editor-drawer :deep(.el-drawer__body) {
  min-width: 0;
  overflow-x: hidden;
}
.trip-editor-content {
  min-height: 100%;
}
.trip-editor-steps {
  margin-bottom: 28px;
}
.trip-editor-step-panel {
  max-width: 960px;
  margin: 0 auto;
}
.trip-form {
  padding: 0 4px;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 24px;
}
.full-width {
  width: 100%;
}
.status-readonly {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  min-height: 32px;
  color: var(--el-text-color-secondary);
}
.form-hint {
  margin: 4px 0 0;
  font-size: var(--el-font-size-small);
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}
.form-hint-error {
  color: var(--el-color-danger);
}
.placeholder-step {
  display: grid;
  justify-items: start;
  min-height: 280px;
  padding: 32px;
  background: var(--el-fill-color-lighter);
  border: 1px dashed var(--el-border-color);
  border-radius: var(--el-border-radius-base);
}
.placeholder-step h3 {
  margin: 20px 0 8px;
  font-size: var(--el-font-size-large);
  color: var(--el-text-color-primary);
}
.placeholder-step p {
  margin: 0;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}
.editor-state {
  display: grid;
  gap: 16px;
  justify-items: center;
  min-height: 280px;
  padding: 48px 24px;
  color: var(--el-text-color-secondary);
  text-align: center;
}
.editor-state p {
  margin: 0;
}
.editor-state-error {
  color: var(--el-color-danger);
}
.trip-editor-footer {
  display: flex;
  gap: 12px;
  justify-content: space-between;
}
.trip-editor-footer-actions {
  display: flex;
  gap: 8px;
}

@media (width <= 768px) {
  .trip-editor-steps :deep(.el-step__title) {
    font-size: var(--el-font-size-small);
  }
  .form-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .placeholder-step {
    min-height: 220px;
    padding: 24px;
  }
  .trip-editor-footer {
    flex-direction: column-reverse;
    align-items: stretch;
  }
  .trip-editor-footer-actions {
    justify-content: flex-end;
  }
}
</style>
