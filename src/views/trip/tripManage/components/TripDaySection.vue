<template>
  <section class="trip-day-section" aria-labelledby="trip-editor-day-title">
    <div class="day-section-header">
      <div>
        <h3 id="trip-editor-day-title">每日行程</h3>
        <p class="day-section-description">點選每日標題展開詳細資料，依天數編排路線、餐食、住宿與交通資訊。</p>
      </div>
      <div class="day-section-actions">
        <el-button
          text
          :icon="Refresh"
          :loading="loading"
          :disabled="isBusy || loadError || hasUnsavedChanges"
          @click="loadDays()"
        >
          重新整理
        </el-button>
      </div>
    </div>

    <el-skeleton v-if="loading && days.length === 0" class="day-skeleton" :rows="8" animated aria-label="正在載入每日行程" />
    <el-alert
      v-else-if="loadError"
      class="day-alert"
      title="每日行程載入失敗，請稍後再試。"
      type="error"
      :closable="false"
      show-icon
    >
      <template #default>
        <el-button type="primary" plain :disabled="isBusy" @click="loadDays(true)">重新載入</el-button>
      </template>
    </el-alert>
    <el-empty v-else-if="days.length === 0" description="尚未建立每日行程" />

    <el-collapse v-else v-model="expandedDays" class="day-list">
      <el-collapse-item
        v-for="day in days"
        :key="day.key"
        :name="day.key"
        class="day-card"
        :class="{ 'is-dirty': isDayDirty(day) }"
      >
        <template #title>
          <div class="day-heading">
            <img
              v-if="getFirstSpotPhoto(day)"
              class="day-thumbnail"
              :src="getFirstSpotPhoto(day)"
              :alt="`第 ${day.dayNumber} 天第一個景點照片`"
            />
            <span v-else class="day-thumbnail day-thumbnail-empty" aria-hidden="true">
              <el-icon><Picture /></el-icon>
            </span>
            <el-tag class="day-number-label" type="primary" effect="plain" size="small">第 {{ day.dayNumber }} 天</el-tag>
            <span class="day-title">{{ day.title || "尚未命名" }}</span>
          </div>
        </template>

        <div class="day-card-header-actions">
          <el-tag v-if="isDayDirty(day)" type="warning" size="small">尚未儲存</el-tag>
        </div>

        <el-form
          :ref="instance => setDayFormRef(day.key, instance)"
          class="day-form"
          :model="day"
          :disabled="isBusy"
          :rules="dayRules"
          label-position="top"
          @submit.prevent
        >
          <div class="day-form-grid day-form-grid-primary">
            <el-form-item label="第幾天">
              <el-input :model-value="`第 ${day.dayNumber} 天`" readonly />
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
        <section class="spot-section">
          <div class="spot-section-header">
            <div>
              <h4>景點／活動</h4>

              <span> 共 {{ day.spots.length }} 個景點 </span>
            </div>

            <el-button type="primary" plain :disabled="isBusy" @click="openCreateSpot(day)"> ＋ 新增景點 </el-button>
          </div>

          <el-empty v-if="day.spots.length === 0" description="這一天尚未新增景點" :image-size="72" />

          <div v-else class="spot-list">
            <article v-for="spot in day.spots" :key="spot.id" class="spot-item">
              <span class="spot-order">
                {{ spot.sortOrder }}
              </span>

              <div class="spot-thumbnail">
                <img v-if="spot.imageUrl" :src="spot.imageUrl" :alt="spot.name" />

                <el-icon v-else>
                  <Picture />
                </el-icon>
              </div>

              <div class="spot-information">
                <div class="spot-title-row">
                  <h5>{{ spot.name }}</h5>

                  <el-tag v-if="spot.tag" size="small" effect="plain">
                    {{ spot.tag }}
                  </el-tag>
                </div>

                <p v-if="spot.description">
                  {{ spot.description }}
                </p>

                <p v-else class="spot-empty-description">尚未填寫景點說明</p>

                <div class="spot-meta">
                  <span v-if="spot.location"> 地點：{{ spot.location }} </span>

                  <span v-if="spot.startTime || spot.endTime">
                    時間：
                    {{ spot.startTime || "未設定" }}
                    －
                    {{ spot.endTime || "未設定" }}
                  </span>
                </div>
              </div>
              <div class="spot-actions">
                <el-button type="primary" link :disabled="spotSaving" @click="openEditSpot(day, spot)"> 編輯 </el-button>

                <el-button type="danger" link :disabled="spotSaving" @click="removeSpot(day, spot)"> 刪除 </el-button>
              </div>
            </article>
          </div>
        </section>
        <div class="day-card-footer">
          <el-button v-if="isDayDirty(day)" text :disabled="isBusy" @click="discardChanges(day)">
            {{ day.id === null ? "取消新增" : "還原變更" }}
          </el-button>
          <span v-else class="day-save-hint">文字資料已與伺服器同步</span>
          <el-button
            type="primary"
            :loading="savingKey === day.key"
            :disabled="isBusy && savingKey !== day.key"
            @click="saveDay(day)"
          >
            {{ day.id === null ? "儲存這一天" : "儲存變更" }}
          </el-button>
        </div>
      </el-collapse-item>
    </el-collapse>
    <el-dialog
      v-model="spotDialogVisible"
      :title="editingSpot ? '編輯景點／活動' : '新增景點／活動'"
      width="640px"
      :close-on-click-modal="!spotSaving"
      :close-on-press-escape="!spotSaving"
    >
      <el-form label-position="top" @submit.prevent>
        <el-form-item label="景點名稱" required>
          <el-input v-model="spotForm.name" maxlength="100" show-word-limit placeholder="例如：淺草寺" />
        </el-form-item>

        <el-form-item label="景點介紹">
          <el-input
            v-model="spotForm.description"
            type="textarea"
            :rows="4"
            maxlength="2000"
            show-word-limit
            placeholder="介紹景點特色及活動內容"
          />
        </el-form-item>
        <el-form-item label="景點照片（選填，最多一張）">
          <div class="spot-photo-editor">
            <UploadImg
              :key="spotPhotoPreview || 'new-spot-photo'"
              :image-url="spotPhotoPreview"
              defer-upload
              :file-size="5"
              :file-type="['image/jpeg', 'image/png', 'image/webp']"
              width="100%"
              height="200px"
              @update:file="setSpotPhoto"
            >
              <template #empty>
                <el-icon>
                  <Plus />
                </el-icon>

                <span>＋ 加入景點照片</span>
              </template>

              <template #tip> JPG、PNG、WebP，最多 5 MB。 </template>
            </UploadImg>

            <el-button v-if="spotPhotoFile" type="danger" plain @click="clearSpotPhoto"> 刪除照片 </el-button>
          </div>
        </el-form-item>

        <div class="spot-form-grid">
          <el-form-item label="景點類型">
            <el-select v-model="spotForm.tag" clearable placeholder="請選擇類型">
              <el-option v-for="option in spotTagOptions" :key="option.value" :label="option.label" :value="option.value" />
            </el-select>
          </el-form-item>

          <el-form-item label="地點">
            <el-input v-model="spotForm.location" maxlength="300" placeholder="例如：東京都台東區" />
          </el-form-item>

          <el-form-item label="開始時間">
            <el-time-picker
              v-model="spotForm.startTime"
              value-format="HH:mm:ss"
              format="HH:mm"
              placeholder="選擇開始時間"
              clearable
            />
          </el-form-item>

          <el-form-item label="結束時間">
            <el-time-picker
              v-model="spotForm.endTime"
              value-format="HH:mm:ss"
              format="HH:mm"
              placeholder="選擇結束時間"
              clearable
            />
          </el-form-item>
        </div>

        <el-form-item label="費用設定">
          <el-switch v-model="spotForm.includedInPrice" active-text="已包含在行程價格" inactive-text="需要額外付費" />
        </el-form-item>

        <el-form-item v-if="!spotForm.includedInPrice" label="額外費用">
          <el-input-number v-model="spotForm.extraFee" :min="0" :step="100" :precision="2" controls-position="right" />
        </el-form-item>

        <el-form-item label="備註">
          <el-input
            v-model="spotForm.note"
            type="textarea"
            :rows="3"
            maxlength="1000"
            show-word-limit
            placeholder="其他注意事項"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button :disabled="spotSaving" @click="spotDialogVisible = false"> 取消 </el-button>

        <el-button type="primary" :loading="spotSaving" @click="submitSpot">
          {{ editingSpot ? "儲存修改" : "確認新增" }}
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts" name="TripDaySection">
import { Picture, Plus, Refresh } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";

import { AdminTrip } from "@/api/interface";
import UploadImg from "@/components/Upload/Img.vue";
import {
  createAdminTripDay,
  createAdminTripSpot,
  deleteAdminTripSpot,
  getAdminTripDays,
  getAdminTripSpotPhoto,
  getAdminTripSpots,
  updateAdminTripDay,
  updateAdminTripSpot,
  uploadAdminTripSpotPhoto
} from "@/api/modules/trip";
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
  spots: AdminTrip.TripSpotResponse[];
}

const props = defineProps<{
  tripId: number;
  durationDays: number;
}>();
const emit = defineEmits<{
  changed: [];
  busyChange: [busy: boolean];
  dirtyChange: [dirty: boolean];
}>();

const days = ref<EditableTripDay[]>([]);
const expandedDays = ref<string[]>([]);
const spotDialogVisible = ref(false);
const spotSaving = ref(false);
const spotPhotoFile = ref<File | null>(null);

const spotPhotoPreview = ref("");
const spotObjectUrls = new Map<number, string>();

const selectedSpotDay = ref<EditableTripDay | null>(null);
const editingSpot = ref<AdminTrip.TripSpotResponse | null>(null);
const spotForm = reactive({
  name: "",
  description: "",

  tag: undefined as AdminTrip.SpotTag | undefined,

  location: "",

  startTime: undefined as string | undefined,

  endTime: undefined as string | undefined,

  includedInPrice: true,
  extraFee: 0,
  note: ""
});

const spotTagOptions: Array<{
  label: string;
  value: AdminTrip.SpotTag;
}> = [
  {
    label: "景點",
    value: "ATTRACTION"
  },
  {
    label: "餐飲",
    value: "FOOD"
  },
  {
    label: "飯店",
    value: "HOTEL"
  },
  {
    label: "交通",
    value: "TRANSPORTATION"
  },
  {
    label: "導覽",
    value: "GUIDE"
  },
  {
    label: "門票",
    value: "TICKET"
  },
  {
    label: "購物",
    value: "SHOPPING"
  },
  {
    label: "自由活動",
    value: "FREE_TIME"
  }
];
const loading = ref(false);
const loadError = ref(false);
const savingKey = ref<string | null>(null);

const dayFormRefs = new Map<string, FormInstance>();
const persistedSnapshots = reactive(new Map<string, EditableTripDay>());
let requestSequence = 0;
let newDaySequence = 0;
let disposed = false;

const isBusy = computed(() => loading.value || savingKey.value !== null);
const isDayDirty = (day: EditableTripDay) => {
  const snapshot = persistedSnapshots.get(day.key);
  return snapshot ? serializeDay(day) !== serializeDay(snapshot) : true;
};
const hasUnsavedChanges = computed(() => days.value.some(day => isDayDirty(day)));

const getFirstSpotPhoto = (day: EditableTripDay) => day.spots.find(spot => Boolean(spot.imageUrl))?.imageUrl ?? "";

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
  note: day.note ?? "",
  spots: []
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

const resetSpotForm = () => {
  spotForm.name = "";
  spotForm.description = "";
  spotForm.tag = undefined;
  spotForm.location = "";
  spotForm.startTime = undefined;
  spotForm.endTime = undefined;
  spotForm.includedInPrice = true;
  spotForm.extraFee = 0;
  spotForm.note = "";
  clearSpotPhoto();
};
const clearSpotPhoto = () => {
  if (spotPhotoFile.value && spotPhotoPreview.value.startsWith("blob:")) {
    URL.revokeObjectURL(spotPhotoPreview.value);
  }

  spotPhotoFile.value = null;
  spotPhotoPreview.value = "";
};

const setSpotPhoto = (file: File | null) => {
  clearSpotPhoto();

  if (!file) {
    return;
  }

  spotPhotoFile.value = file;

  spotPhotoPreview.value = URL.createObjectURL(file);
};
const openCreateSpot = (day: EditableTripDay) => {
  if (day.id === null) {
    ElMessage.warning("請先儲存這一天，再新增景點");
    return;
  }
  editingSpot.value = null;
  selectedSpotDay.value = day;
  resetSpotForm();
  spotDialogVisible.value = true;
};
const openEditSpot = (day: EditableTripDay, spot: AdminTrip.TripSpotResponse) => {
  if (day.id === null) {
    return;
  }

  resetSpotForm();

  selectedSpotDay.value = day;
  editingSpot.value = spot;

  spotForm.name = spot.name;
  spotForm.description = spot.description ?? "";
  spotForm.tag = spot.tag ?? undefined;
  spotForm.location = spot.location ?? "";
  spotForm.startTime = spot.startTime ?? undefined;
  spotForm.endTime = spot.endTime ?? undefined;
  spotForm.includedInPrice = spot.includedInPrice ?? true;
  spotForm.extraFee = spot.extraFee ?? 0;
  spotForm.note = spot.note ?? "";

  // 顯示原本景點照片
  spotPhotoPreview.value = spot.imageUrl ?? "";

  spotDialogVisible.value = true;
};
const submitSpot = async () => {
  const day = selectedSpotDay.value;

  if (!day || day.id === null) {
    return;
  }

  if (!spotForm.name.trim()) {
    ElMessage.warning("請輸入景點名稱");
    return;
  }

  if (spotForm.startTime && spotForm.endTime && spotForm.endTime <= spotForm.startTime) {
    ElMessage.warning("結束時間必須晚於開始時間");

    return;
  }

  spotSaving.value = true;

  try {
    const nextSortOrder =
      editingSpot.value?.sortOrder ?? (day.spots.length === 0 ? 1 : Math.max(...day.spots.map(spot => spot.sortOrder)) + 1);

    const payload: AdminTrip.TripSpotRequest = {
      name: spotForm.name.trim(),

      description: spotForm.description.trim() || null,

      tag: spotForm.tag ?? null,

      sortOrder: nextSortOrder,

      location: spotForm.location.trim() || null,

      startTime: spotForm.startTime ?? null,

      endTime: spotForm.endTime ?? null,

      includedInPrice: spotForm.includedInPrice,

      extraFee: spotForm.includedInPrice ? 0 : spotForm.extraFee,

      note: spotForm.note.trim() || null
    };

    let spotId: number;

    if (editingSpot.value) {
      spotId = editingSpot.value.id;

      await updateAdminTripSpot(props.tripId, day.id, spotId, payload);
    } else {
      const saved = await createAdminTripSpot(props.tripId, day.id, payload);

      spotId = saved.id;
    }

    // 有選擇新照片才上傳或取代
    if (spotPhotoFile.value) {
      await uploadAdminTripSpotPhoto(props.tripId, day.id, spotId, spotPhotoFile.value);
    }

    await loadDaySpots(day);

    const successMessage = editingSpot.value ? "景點修改成功" : "景點新增成功";

    spotDialogVisible.value = false;
    selectedSpotDay.value = null;
    editingSpot.value = null;

    ElMessage.success(successMessage);
  } finally {
    spotSaving.value = false;
  }
};
const removeSpot = async (day: EditableTripDay, spot: AdminTrip.TripSpotResponse) => {
  if (day.id === null) {
    return;
  }

  try {
    await ElMessageBox.confirm(`確定要永久刪除「${spot.name}」嗎？景點照片也會一起刪除。`, "刪除景點", {
      confirmButtonText: "確定刪除",
      cancelButtonText: "取消",
      type: "warning"
    });
  } catch {
    return;
  }

  spotSaving.value = true;

  try {
    await deleteAdminTripSpot(props.tripId, day.id, spot.id);

    await loadDaySpots(day);

    ElMessage.success("景點已刪除");
  } finally {
    spotSaving.value = false;
  }
};
// 載入其中一天的景點
const loadDaySpots = async (day: EditableTripDay) => {
  if (day.id === null) {
    day.spots = [];
    return;
  }

  try {
    const response = await getAdminTripSpots(props.tripId, day.id);
    const spots = (Array.isArray(response) ? response : []).sort((left, right) => left.sortOrder - right.sortOrder);

    day.spots.forEach(spot => {
      const objectUrl = spotObjectUrls.get(spot.id);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        spotObjectUrls.delete(spot.id);
      }
    });

    day.spots = await Promise.all(
      spots.map(async spot => {
        if (!spot.imageUrl) return spot;

        try {
          const blob = await getAdminTripSpotPhoto(props.tripId, day.id as number, spot.id);
          if (!(blob instanceof Blob) || blob.size === 0) return { ...spot, imageUrl: null };

          const objectUrl = URL.createObjectURL(blob);
          spotObjectUrls.set(spot.id, objectUrl);
          return { ...spot, imageUrl: objectUrl };
        } catch {
          return { ...spot, imageUrl: null };
        }
      })
    );
  } catch {
    day.spots = [];
  }
};

const loadDays = async (preserveDrafts = false) => {
  if (disposed) {
    return false;
  }

  const sequence = ++requestSequence;

  loading.value = true;
  loadError.value = false;

  try {
    const response = await getAdminTripDays(props.tripId);

    if (disposed || sequence !== requestSequence) {
      return false;
    }

    const nextDays = (Array.isArray(response) ? response : [])
      .map(toEditableDay)
      .sort((left, right) => left.dayNumber - right.dayNumber || (left.id ?? 0) - (right.id ?? 0));

    const drafts = preserveDrafts ? days.value.filter(isDayDirty) : [];

    const draftSnapshots = new Map(drafts.map(day => [day.key, persistedSnapshots.get(day.key)]));

    saveSnapshots(nextDays);

    for (const draft of drafts) {
      const index = nextDays.findIndex(day => day.key === draft.key);

      if (index >= 0) {
        nextDays[index] = draft;
      } else {
        nextDays.push(draft);
      }

      const snapshot = draftSnapshots.get(draft.key);

      if (snapshot) {
        persistedSnapshots.set(draft.key, snapshot);
      } else {
        persistedSnapshots.delete(draft.key);
      }
    }

    const durationDays = props.durationDays;

    if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 10) {
      ElMessage.error("行程天數資料不正確，請先回基本資料確認並儲存。");

      loadError.value = true;

      return false;
    }

    // 保留已存在內容，只補上缺少的天數
    for (let dayNumber = 1; dayNumber <= durationDays; dayNumber += 1) {
      const exists = nextDays.some(day => day.dayNumber === dayNumber);

      if (exists) {
        continue;
      }

      newDaySequence += 1;

      nextDays.push({
        key: `new-${newDaySequence}`,
        id: null,
        dayNumber,
        title: "",
        content: "",
        breakfast: "",
        lunch: "",
        dinner: "",
        hotel: "",
        transportation: "",
        extraFee: 0,
        extraFeeDescription: "",
        note: "",
        spots: []
      });
    }

    days.value = nextDays.sort((left, right) => left.dayNumber - right.dayNumber);

    expandedDays.value = expandedDays.value.filter(key => nextDays.some(day => day.key === key));

    // 載入每一天的景點
    await Promise.all(days.value.filter(day => day.id !== null).map(day => loadDaySpots(day)));

    return true;
  } catch {
    if (!disposed && sequence === requestSequence) {
      loadError.value = true;
    }

    return false;
  } finally {
    if (!disposed && sequence === requestSequence) {
      loading.value = false;
    }
  }
};

const refreshAfterMutation = async (successMessage: string) => {
  const refreshed = await loadDays(true);
  if (refreshed) {
    ElMessage.success(successMessage);
  } else {
    ElMessage.warning("資料已儲存，但每日行程重新整理失敗，請稍後重新整理。");
  }
  emit("changed");
};

const saveDay = async (day: EditableTripDay) => {
  if (isBusy.value) {
    return;
  }

  const form = dayFormRefs.get(day.key);

  const valid = await form?.validate().catch(() => false);

  if (!valid) {
    return;
  }

  savingKey.value = day.key;

  try {
    const payload = toDayPayload(day);

    // 新增每日行程
    if (day.id === null) {
      const saved = await createAdminTripDay(props.tripId, payload);

      const oldKey = day.key;

      day.id = saved.id;
      day.key = `day-${saved.id}`;

      expandedDays.value = expandedDays.value.map(key => (key === oldKey ? day.key : key));
    } else {
      // 修改既有每日行程文字資料
      await updateAdminTripDay(props.tripId, day.id, payload);
    }

    if (day.id === null) {
      throw new Error("每日行程儲存後沒有取得 ID");
    }

    persistedSnapshots.set(day.key, cloneDay(day));

    await refreshAfterMutation("每日行程儲存成功");
  } catch {
    // API 錯誤訊息由全域攔截器顯示
  } finally {
    savingKey.value = null;
  }
};

const discardChanges = (day: EditableTripDay) => {
  if (day.id === null) {
    days.value = days.value.filter(item => item.key !== day.key);
    persistedSnapshots.delete(day.key);
    expandedDays.value = expandedDays.value.filter(key => key !== day.key);
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
    expandedDays.value = [];
    spotObjectUrls.forEach(url => URL.revokeObjectURL(url));
    spotObjectUrls.clear();
    void loadDays();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  clearSpotPhoto();
  spotObjectUrls.forEach(url => URL.revokeObjectURL(url));
  spotObjectUrls.clear();
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
  margin-bottom: 16px;
}
.day-section-header h3 {
  margin: 0 0 4px;
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
.day-skeleton {
  padding: 8px 0 16px;
}
.day-alert {
  margin-bottom: 16px;
}
.day-list {
  display: grid;
  gap: 16px;
  margin-top: 16px;
  border: none;
}
.day-card {
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--el-border-radius-base);
  box-shadow: var(--el-box-shadow-lighter);
}
.day-card.is-dirty {
  border-color: var(--el-color-warning-light-5);
}
.day-card :deep(.el-collapse-item__header) {
  height: auto;
  min-height: 88px;
  padding: 16px 20px;
  line-height: 1.5;
  background: var(--el-fill-color-extra-light);
  border-bottom: none;
}
.day-card :deep(.el-collapse-item__wrap) {
  border-bottom: none;
}
.day-card :deep(.el-collapse-item__content) {
  padding: 0 20px 20px;
}
.day-heading {
  display: flex;
  flex: 1;
  gap: 12px;
  min-width: 0;
  padding-right: 12px;
  text-align: left;
}
.day-title {
  flex: 1;
  font-size: var(--el-font-size-medium);
  font-weight: 600;
  overflow-wrap: anywhere;
}
.day-thumbnail {
  flex-shrink: 0;
  width: 80px;
  height: 52px;
  object-fit: cover;
  border-radius: var(--el-border-radius-small);
}
.day-thumbnail-empty {
  display: grid;
  place-items: center;
  font-size: 24px;
  color: var(--el-text-color-placeholder);
  background: var(--el-fill-color);
}
.day-photo-editor {
  display: grid;
  gap: 12px;
  width: 100%;
  max-width: 560px;
}
.day-number-label {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
}
.day-card-header-actions {
  gap: 8px;
  justify-content: flex-end;
  padding: 12px 0;
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
.spot-section {
  padding-top: 20px;
  margin-top: 20px;
  border-top: 1px solid var(--el-border-color-lighter);
}
.spot-section-header {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.spot-section-header > div {
  display: flex;
  gap: 10px;
  align-items: center;
}
.spot-section-header h4 {
  margin: 0;
  font-size: 16px;
  color: var(--el-text-color-primary);
}
.spot-section-header span {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.spot-list {
  display: grid;
  gap: 12px;
}
.spot-item {
  display: grid;
  grid-template-columns: 36px 112px minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 14px;
  background: var(--el-fill-color-extra-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
}
.spot-actions {
  display: flex;
  align-items: center;
  white-space: nowrap;
}
.spot-order {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  font-weight: 700;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 50%;
}
.spot-thumbnail {
  display: grid;
  place-items: center;
  width: 112px;
  height: 72px;
  overflow: hidden;
  color: var(--el-text-color-placeholder);
  background: var(--el-fill-color);
  border-radius: var(--el-border-radius-small);
}
.spot-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.spot-information {
  min-width: 0;
}
.spot-title-row {
  display: flex;
  gap: 10px;
  align-items: center;
}
.spot-title-row h5 {
  margin: 0;
  font-size: 15px;
  color: var(--el-text-color-primary);
}
.spot-information p {
  display: -webkit-box;
  margin: 6px 0;
  overflow: hidden;
  -webkit-line-clamp: 2;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  -webkit-box-orient: vertical;
}
.spot-empty-description {
  color: var(--el-text-color-placeholder) !important;
}
.spot-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.spot-photo-editor {
  display: grid;
  gap: 12px;
  width: 100%;
  max-width: 420px;
}

@media (width <= 768px) {
  .spot-form-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .day-thumbnail {
    width: 72px;
    height: 48px;
  }
  .day-heading {
    flex-wrap: wrap;
    gap: 10px;
  }
  .day-title {
    min-width: 120px;
  }
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
  .day-card :deep(.el-collapse-item__header) {
    padding: 12px;
  }
  .day-card :deep(.el-collapse-item__content) {
    padding: 0 12px 16px;
  }
  .spot-item {
    grid-template-columns: 32px minmax(0, 1fr);
  }
  .spot-thumbnail {
    grid-column: 1 / -1;
    width: 100%;
    height: 150px;
  }
  .spot-information {
    grid-column: 1 / -1;
  }
  .spot-section-header,
  .spot-section-header > div {
    align-items: flex-start;
  }
  .spot-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }
}
</style>
