<template>
  <div class="upload-box">
    <el-upload
      :id="uuid"
      action="#"
      :class="['upload', self_disabled ? 'disabled' : '', drag ? 'no-border' : '']"
      :multiple="false"
      :disabled="self_disabled"
      :show-file-list="false"
      :http-request="handleHttpUpload"
      :before-upload="beforeUpload"
      :on-success="props.deferUpload ? undefined : uploadSuccess"
      :on-error="props.deferUpload ? undefined : uploadError"
      :drag="drag"
      :accept="fileType.join(',')"
    >
      <template v-if="displayImageUrl">
        <img :src="displayImageUrl" class="upload-image" />
        <div class="upload-handle" @click.stop>
          <div v-if="!self_disabled" class="handle-icon" @click="editImg">
            <el-icon><Edit /></el-icon>
            <span>編輯</span>
          </div>
          <div class="handle-icon" @click="imgViewVisible = true">
            <el-icon><ZoomIn /></el-icon>
            <span>查看</span>
          </div>
          <div v-if="!self_disabled" class="handle-icon" @click="deleteImg">
            <el-icon><Delete /></el-icon>
            <span>刪除</span>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="upload-empty">
          <slot name="empty">
            <el-icon><Plus /></el-icon>
            <!-- <span>請上傳圖片</span> -->
          </slot>
        </div>
      </template>
    </el-upload>
    <div class="el-upload__tip">
      <slot name="tip"></slot>
    </div>
    <el-image-viewer v-if="imgViewVisible" :url-list="[displayImageUrl]" @close="imgViewVisible = false" />
  </div>
</template>

<script setup lang="ts" name="UploadImg">
import type { UploadProps, UploadRequestOptions } from "element-plus";
import { ElNotification, formContextKey, formItemContextKey } from "element-plus";
import { computed, inject, onBeforeUnmount, ref } from "vue";

import { uploadImg } from "@/api/modules/upload";
import { generateUUID } from "@/utils";

interface UploadFileProps {
  imageUrl?: string; // 圖片地址 ==> 非必傳
  api?: (params: any) => Promise<any>; // 圖片上傳 API 方法 ==> 非必傳
  deferUpload?: boolean; // 是否只建立本機預覽，等待外層表單提交時再上傳
  drag?: boolean; // 是否支援拖曳上傳 ==> 非必傳（預設為 true）
  disabled?: boolean; // 是否停用上傳元件 ==> 非必傳（預設為 false）
  fileSize?: number; // 圖片大小限制 ==> 非必傳（預設為 5MB）
  fileType?: File.ImageMimeType[]; // 圖片類型限制 ==> 非必傳
  height?: string; // 元件高度 ==> 非必傳（預設為 150px）
  width?: string; // 元件寬度 ==> 非必傳（預設為 150px）
  borderRadius?: string; // 元件圓角 ==> 非必傳（預設為 8px）
}

// 接受父元件參數
const props = withDefaults(defineProps<UploadFileProps>(), {
  imageUrl: "",
  deferUpload: false,
  drag: true,
  disabled: false,
  fileSize: 5,
  fileType: () => ["image/jpeg", "image/png", "image/gif"],
  height: "150px",
  width: "150px",
  borderRadius: "8px"
});

// 產生元件唯一 ID
const uuid = ref("id-" + generateUUID());

// 查看圖片
const imgViewVisible = ref(false);
const localPreviewUrl = ref("");
const displayImageUrl = computed(() => localPreviewUrl.value || props.imageUrl);
// 取得 el-form 元件內容
const formContext = inject(formContextKey, void 0);
// 取得 el-form-item 元件內容
const formItemContext = inject(formItemContextKey, void 0);
// 判斷是否停用上傳與刪除
const self_disabled = computed(() => {
  return props.disabled || formContext?.disabled;
});

/**
 * @description 圖片上傳
 * @param options 上傳設定
 * */
const emit = defineEmits<{
  "update:imageUrl": [value: string];
  "update:file": [value: File | null];
}>();
const handleHttpUpload = async (options: UploadRequestOptions) => {
  if (props.deferUpload) {
    if (localPreviewUrl.value) URL.revokeObjectURL(localPreviewUrl.value);
    localPreviewUrl.value = URL.createObjectURL(options.file);
    emit("update:file", options.file);
    emit("update:imageUrl", localPreviewUrl.value);
    options.onSuccess({});
    return;
  }
  let formData = new FormData();
  formData.append("file", options.file);
  try {
    const api = props.api ?? uploadImg;
    const { data } = await api(formData);
    emit("update:imageUrl", data.fileUrl);
    // 呼叫 el-form 內部的驗證方法
    if (formItemContext?.prop) {
      formContext?.validateField([formItemContext.prop as string]);
    }
  } catch (error) {
    options.onError(error as any);
  }
};

/**
 * @description 刪除圖片
 * */
const deleteImg = () => {
  if (localPreviewUrl.value) {
    URL.revokeObjectURL(localPreviewUrl.value);
    localPreviewUrl.value = "";
  }
  emit("update:file", null);
  emit("update:imageUrl", "");
};

/**
 * @description 編輯圖片
 * */
const editImg = () => {
  const dom = document.querySelector(`#${uuid.value} .el-upload__input`);
  if (dom) {
    dom.dispatchEvent(new MouseEvent("click"));
  }
};

/**
 * @description 上傳前驗證檔案
 * @param rawFile 選取的檔案
 * */
const beforeUpload: UploadProps["beforeUpload"] = rawFile => {
  const imgSize = rawFile.size / 1024 / 1024 <= props.fileSize;
  const imgType = props.fileType.includes(rawFile.type as File.ImageMimeType);
  if (!imgType)
    ElNotification({
      title: "提示",
      message: "圖片格式不符合要求！",
      type: "warning"
    });
  if (!imgSize)
    setTimeout(() => {
      ElNotification({
        title: "提示",
        message: `圖片大小不可超過 ${props.fileSize}MB！`,
        type: "warning"
      });
    }, 0);
  return imgType && imgSize;
};

/**
 * @description 圖片上傳成功
 * */
const uploadSuccess = () => {
  ElNotification({
    title: "提示",
    message: "圖片上傳成功！",
    type: "success"
  });
};

/**
 * @description 圖片上傳錯誤
 * */
const uploadError = () => {
  ElNotification({
    title: "提示",
    message: "圖片上傳失敗，請重新上傳！",
    type: "error"
  });
};

onBeforeUnmount(() => {
  if (localPreviewUrl.value) URL.revokeObjectURL(localPreviewUrl.value);
});
</script>

<style scoped lang="scss">
.is-error {
  .upload {
    :deep(.el-upload),
    :deep(.el-upload-dragger) {
      border: 1px dashed var(--el-color-danger) !important;
      &:hover {
        border-color: var(--el-color-primary) !important;
      }
    }
  }
}
:deep(.disabled) {
  .el-upload,
  .el-upload-dragger {
    cursor: not-allowed !important;
    background: var(--el-disabled-bg-color);
    border: 1px dashed var(--el-border-color-darker) !important;
    &:hover {
      border: 1px dashed var(--el-border-color-darker) !important;
    }
  }
}
.upload-box {
  .no-border {
    :deep(.el-upload) {
      border: none !important;
    }
  }
  :deep(.upload) {
    .el-upload {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: v-bind(width);
      height: v-bind(height);
      overflow: hidden;
      border: 1px dashed var(--el-border-color-darker);
      border-radius: v-bind(borderRadius);
      transition: var(--el-transition-duration-fast);
      &:hover {
        border-color: var(--el-color-primary);
        .upload-handle {
          opacity: 1;
        }
      }
      .el-upload-dragger {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        padding: 0;
        overflow: hidden;
        background-color: transparent;
        border: 1px dashed var(--el-border-color-darker);
        border-radius: v-bind(borderRadius);
        &:hover {
          border: 1px dashed var(--el-color-primary);
        }
      }
      .el-upload-dragger.is-dragover {
        background-color: var(--el-color-primary-light-9);
        border: 2px dashed var(--el-color-primary) !important;
      }
      .upload-image {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      .upload-empty {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        line-height: 30px;
        color: var(--el-color-info);
        .el-icon {
          font-size: 28px;
          color: var(--el-text-color-secondary);
        }
      }
      .upload-handle {
        position: absolute;
        top: 0;
        right: 0;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        cursor: pointer;
        background: rgb(0 0 0 / 60%);
        opacity: 0;
        transition: var(--el-transition-duration-fast);
        .handle-icon {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0 6%;
          color: aliceblue;
          .el-icon {
            margin-bottom: 40%;
            font-size: 130%;
            line-height: 130%;
          }
          span {
            font-size: 85%;
            line-height: 85%;
          }
        }
      }
    }
  }
  .el-upload__tip {
    line-height: 18px;
    text-align: center;
  }
}
</style>
