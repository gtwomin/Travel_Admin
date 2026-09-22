<template>
  <section class="trip-photo-section" aria-labelledby="trip-editor-photo-title">
    <div class="photo-section-header">
      <div>
        <h3 id="trip-editor-photo-title">行程圖片</h3>
        <p class="photo-section-description">最多上傳 11 張圖片，每張不得超過 10 MB；排序第一張會作為行程封面。</p>
      </div>
      <el-button text :icon="Refresh" :loading="loading" :disabled="isBusy" @click="loadPhotos">重新整理</el-button>
    </div>

    <div class="photo-toolbar">
      <el-upload
        action="#"
        :show-file-list="false"
        :multiple="true"
        :disabled="!hasUploadCapacity || isBusy"
        :http-request="handleUpload"
        :before-upload="beforeUpload"
        :on-error="handleUploadError"
        accept="image/*"
      >
        <el-button type="primary" :loading="isUploading" :disabled="!hasUploadCapacity || isBusy">
          <el-icon><Upload /></el-icon>
          上傳圖片
        </el-button>
      </el-upload>
      <span class="photo-count">{{ photos.length }} / {{ MAX_PHOTOS }} 張</span>
    </div>

    <p class="photo-upload-hint">支援瀏覽器可辨識的圖片格式，第一張圖片會顯示為封面。</p>

    <div v-if="loading" class="photo-state" role="status">正在載入行程圖片…</div>
    <div v-else-if="loadError" class="photo-state photo-state-error" role="alert">
      <p>行程圖片載入失敗，請稍後再試。</p>
      <el-button type="primary" plain :disabled="isBusy" @click="loadPhotos">重新載入</el-button>
    </div>
    <el-empty v-else-if="photos.length === 0" description="尚未上傳行程圖片" />

    <draggable
      v-else
      v-model="photos"
      class="photo-grid"
      item-key="id"
      handle=".photo-drag-handle"
      :animation="200"
      ghost-class="photo-card-ghost"
      chosen-class="photo-card-chosen"
      :disabled="isBusy"
      @start="handleDragStart"
      @end="handleDragEnd"
    >
      <template #item="{ element, index }">
        <article class="photo-card" :class="{ 'is-cover': index === 0 }">
          <div class="photo-preview">
            <el-image
              v-if="element.previewUrl"
              class="photo-image"
              :src="element.previewUrl"
              :preview-src-list="[element.previewUrl]"
              preview-teleported
              fit="cover"
              :alt="`第 ${index + 1} 張行程圖片`"
            />
            <div v-else class="photo-preview-state">
              <span v-if="element.previewState === 'loading'">圖片載入中…</span>
              <span v-else>圖片載入失敗</span>
            </div>
            <el-tag v-if="index === 0" class="photo-cover-tag" type="success" size="small">目前封面</el-tag>
            <span class="photo-order">第 {{ index + 1 }} 張</span>
          </div>

          <div class="photo-card-footer">
            <span class="photo-drag-handle" tabindex="0" title="拖曳調整順序" aria-label="拖曳調整順序"> ⋮⋮ </span>
            <el-button v-if="index !== 0" text type="primary" size="small" :disabled="isBusy" @click="setCover(element)">
              設為封面
            </el-button>
            <el-tag v-else type="success" effect="plain" size="small">封面</el-tag>
            <el-button
              text
              type="danger"
              size="small"
              :loading="deletingPhotoId === element.id"
              :disabled="isBusy && deletingPhotoId !== element.id"
              @click="deletePhoto(element)"
            >
              <el-icon><Delete /></el-icon>
              刪除
            </el-button>
          </div>
        </article>
      </template>
    </draggable>
  </section>
</template>

<script setup lang="ts" name="TripPhotoSection">
import { Delete, Refresh, Upload } from "@element-plus/icons-vue";
import type { UploadProps } from "element-plus";
import { ElMessage, ElMessageBox } from "element-plus";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import draggable from "vuedraggable";

import { AdminTrip } from "@/api/interface";
import {
  deleteAdminTripPhoto,
  getAdminTripPhotoFile,
  getAdminTripPhotos,
  updateAdminTripPhotoOrder,
  uploadAdminTripPhoto
} from "@/api/modules/trip";

const MAX_PHOTOS = 11;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

type PreviewState = "loading" | "loaded" | "error";

interface TripPhotoItem extends AdminTrip.TripPhotoResponse {
  previewUrl: string | null;
  previewState: PreviewState;
}

const props = defineProps<{ tripId: number }>();
const emit = defineEmits<{
  changed: [];
  busyChange: [busy: boolean];
}>();

const photos = ref<TripPhotoItem[]>([]);
const loading = ref(false);
const loadError = ref(false);
const activeUploads = ref(0);
const uploadReservations = ref(0);
const deletingPhotoId = ref<number | null>(null);
const ordering = ref(false);
const persistedOrder = ref<number[]>([]);
const dragSnapshot = ref<TripPhotoItem[] | null>(null);
let requestSequence = 0;
let disposed = false;
let uploadChanged = false;
const objectUrls = new Map<number, string>();

const isUploading = computed(() => activeUploads.value > 0);
const hasUploadCapacity = computed(() => photos.value.length + uploadReservations.value < MAX_PHOTOS);
const isBusy = computed(() => loading.value || isUploading.value || ordering.value || deletingPhotoId.value !== null);

const sameOrder = (left: number[], right: number[]) =>
  left.length === right.length && left.every((photoId, index) => photoId === right[index]);

const revokeObjectUrls = () => {
  for (const objectUrl of objectUrls.values()) URL.revokeObjectURL(objectUrl);
  objectUrls.clear();
};

const updatePhotoPreview = (photoId: number, previewUrl: string, sequence: number) => {
  if (disposed || sequence !== requestSequence) {
    URL.revokeObjectURL(previewUrl);
    return;
  }

  objectUrls.set(photoId, previewUrl);
  const photo = photos.value.find(item => item.id === photoId);
  if (!photo) {
    URL.revokeObjectURL(previewUrl);
    objectUrls.delete(photoId);
    return;
  }

  photo.previewUrl = previewUrl;
  photo.previewState = "loaded";
};

const loadPhotoPreview = async (photo: TripPhotoItem, sequence: number) => {
  try {
    const blob = await getAdminTripPhotoFile(photo.id);
    if (!(blob instanceof Blob) || blob.size === 0) throw new TypeError("行程圖片不是有效的二進位資料");

    const previewUrl = URL.createObjectURL(blob);
    updatePhotoPreview(photo.id, previewUrl, sequence);
  } catch {
    if (disposed || sequence !== requestSequence) return;
    const currentPhoto = photos.value.find(item => item.id === photo.id);
    if (currentPhoto) currentPhoto.previewState = "error";
  }
};

const loadPhotos = async () => {
  if (disposed) return;

  const sequence = ++requestSequence;
  loading.value = true;
  loadError.value = false;
  revokeObjectUrls();
  photos.value = [];
  persistedOrder.value = [];

  try {
    const response = await getAdminTripPhotos(props.tripId);
    if (disposed || sequence !== requestSequence) return;

    const nextPhotos = (Array.isArray(response) ? response : []).map(photo => ({
      ...photo,
      previewUrl: null,
      previewState: "loading" as PreviewState
    }));
    photos.value = nextPhotos;
    persistedOrder.value = nextPhotos.map(photo => photo.id);
    await Promise.all(nextPhotos.map(photo => loadPhotoPreview(photo, sequence)));
  } catch {
    if (disposed || sequence !== requestSequence) return;
    photos.value = [];
    persistedOrder.value = [];
    loadError.value = true;
  } finally {
    if (!disposed && sequence === requestSequence) loading.value = false;
  }
};

const beforeUpload: UploadProps["beforeUpload"] = rawFile => {
  if (!hasUploadCapacity.value) {
    ElMessage.warning(`每個行程最多只能有 ${MAX_PHOTOS} 張圖片`);
    return false;
  }

  if (!rawFile.type.startsWith("image/")) {
    ElMessage.warning("只能上傳圖片檔案");
    return false;
  }

  if (rawFile.size > MAX_FILE_SIZE_BYTES) {
    ElMessage.warning("單張圖片不能超過 10 MB");
    return false;
  }

  uploadReservations.value += 1;
  return true;
};

const handleUpload: UploadProps["httpRequest"] = async options => {
  uploadReservations.value = Math.max(0, uploadReservations.value - 1);
  activeUploads.value += 1;

  try {
    const savedPhoto = await uploadAdminTripPhoto(props.tripId, options.file);
    options.onSuccess(savedPhoto);
    uploadChanged = true;
  } catch (error) {
    const uploadError = error instanceof Error ? error : new Error("圖片上傳失敗");
    options.onError(
      Object.assign(uploadError, {
        status: 0,
        method: options.method,
        url: options.action
      })
    );
  } finally {
    activeUploads.value -= 1;
    if (activeUploads.value === 0) {
      await loadPhotos();
      if (uploadChanged && !disposed) {
        uploadChanged = false;
        emit("changed");
      }
    }
  }
};

const handleDragStart = () => {
  if (isBusy.value) return;
  dragSnapshot.value = photos.value.map(photo => ({ ...photo }));
};

const persistPhotoOrder = async (nextPhotos: TripPhotoItem[], previousPhotos: TripPhotoItem[], successMessage: string) => {
  if (isBusy.value) return;

  const photoIds = nextPhotos.map(photo => photo.id);
  if (sameOrder(photoIds, persistedOrder.value)) return;

  photos.value = nextPhotos;
  ordering.value = true;
  try {
    await updateAdminTripPhotoOrder(props.tripId, { photoIds });
    photos.value = photos.value.map((photo, index) => ({ ...photo, sortOrder: index + 1 }));
    persistedOrder.value = photoIds;
    ElMessage.success(successMessage);
    emit("changed");
  } catch {
    photos.value = previousPhotos.map((photo, index) => ({ ...photo, sortOrder: index + 1 }));
    persistedOrder.value = previousPhotos.map(photo => photo.id);
  } finally {
    ordering.value = false;
  }
};

const handleDragEnd = () => {
  const previousPhotos = dragSnapshot.value;
  dragSnapshot.value = null;
  if (!previousPhotos) return;

  void persistPhotoOrder([...photos.value], previousPhotos, "圖片排序已更新");
};

const setCover = (photo: TripPhotoItem) => {
  if (isBusy.value || photos.value[0]?.id === photo.id) return;

  const previousPhotos = photos.value.map(item => ({ ...item }));
  const nextPhotos = [photo, ...photos.value.filter(item => item.id !== photo.id)];
  void persistPhotoOrder(nextPhotos, previousPhotos, "封面已更新");
};

const deletePhoto = async (photo: TripPhotoItem) => {
  if (isBusy.value) return;

  try {
    await ElMessageBox.confirm(`確定刪除第 ${photo.sortOrder} 張行程圖片嗎？`, "刪除行程圖片", {
      type: "warning",
      confirmButtonText: "刪除",
      cancelButtonText: "取消"
    });
  } catch {
    return;
  }

  deletingPhotoId.value = photo.id;
  try {
    await deleteAdminTripPhoto(photo.id);
    ElMessage.success("行程圖片已刪除");
    await loadPhotos();
    if (!disposed) emit("changed");
  } catch {
    // API 錯誤訊息由全域攔截器處理，保留目前圖片清單讓使用者重試。
  } finally {
    deletingPhotoId.value = null;
  }
};

const handleUploadError = () => {
  ElMessage.error("圖片上傳失敗，請稍後再試");
};

watch(isBusy, busy => emit("busyChange", busy), { immediate: true });

watch(
  () => props.tripId,
  () => {
    void loadPhotos();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  disposed = true;
  requestSequence += 1;
  revokeObjectUrls();
  dragSnapshot.value = null;
});
</script>

<style scoped lang="scss">
.trip-photo-section {
  padding: 0 4px;
}
.photo-section-header,
.photo-toolbar,
.photo-card-footer {
  display: flex;
  align-items: center;
}
.photo-section-header {
  gap: 16px;
  justify-content: space-between;
  margin-bottom: 20px;
}
.photo-section-header h3 {
  margin: 0 0 8px;
  font-size: var(--el-font-size-large);
  color: var(--el-text-color-primary);
}
.photo-section-description,
.photo-upload-hint {
  margin: 0;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}
.photo-toolbar {
  gap: 12px;
  justify-content: space-between;
}
.photo-count {
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-secondary);
}
.photo-upload-hint {
  margin-top: 8px;
  font-size: var(--el-font-size-small);
}
.photo-state {
  display: grid;
  gap: 16px;
  justify-items: center;
  min-height: 220px;
  padding: 48px 24px;
  color: var(--el-text-color-secondary);
  text-align: center;
}
.photo-state p {
  margin: 0;
}
.photo-state-error {
  color: var(--el-color-danger);
}
.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  margin-top: 24px;
}
.photo-card {
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  transition:
    border-color var(--el-transition-duration-fast),
    box-shadow var(--el-transition-duration-fast);
}
.photo-card.is-cover {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary-light-5);
}
.photo-card-ghost {
  opacity: 0.45;
}
.photo-card-chosen {
  box-shadow: var(--el-box-shadow-light);
}
.photo-preview {
  position: relative;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: var(--el-fill-color-light);
}
.photo-image,
.photo-image :deep(.el-image__inner) {
  display: block;
  width: 100%;
  height: 100%;
}
.photo-preview-state {
  display: grid;
  place-items: center;
  height: 100%;
  padding: 16px;
  color: var(--el-text-color-secondary);
  text-align: center;
}
.photo-cover-tag {
  position: absolute;
  top: 10px;
  left: 10px;
}
.photo-order {
  position: absolute;
  right: 10px;
  bottom: 10px;
  padding: 3px 7px;
  font-size: var(--el-font-size-extra-small);
  color: var(--el-color-white);
  background: rgb(0 0 0 / 55%);
  border-radius: var(--el-border-radius-small);
}
.photo-card-footer {
  gap: 4px;
  min-height: 48px;
  padding: 8px 10px;
}
.photo-drag-handle {
  flex: 0 0 auto;
  padding: 4px 2px;
  font-size: var(--el-font-size-large);
  line-height: 1;
  color: var(--el-text-color-secondary);
  letter-spacing: -4px;
  cursor: grab;
  outline: none;
}
.photo-drag-handle:focus-visible {
  border-radius: var(--el-border-radius-small);
  box-shadow: 0 0 0 2px var(--el-color-primary-light-5);
}
.photo-card-footer .el-button:last-child {
  margin-left: auto;
}

@media (width <= 600px) {
  .photo-section-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .photo-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
