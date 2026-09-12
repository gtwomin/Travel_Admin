<template>
  <el-dialog
    v-model="dialogVisible"
    title="新增分類"
    width="min(480px, calc(100vw - 32px))"
    draggable
    :close-on-click-modal="false"
    :destroy-on-close="true"
  >
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="82px" @submit.prevent>
      <el-form-item label="分類名稱" prop="name">
        <el-input v-model="formData.name" placeholder="請輸入分類名稱" clearable @keyup.enter="handleSubmit" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">新增</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts" name="CategoryDialog">
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { reactive, ref } from "vue";

import { AdminForum } from "@/api/interface";

interface DialogParams {
  api: (params: AdminForum.CategoryMutationParams) => Promise<unknown>;
  getTableList?: () => Promise<unknown> | unknown;
}

const dialogVisible = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance>();
const dialogParams = ref<DialogParams | null>(null);
const formData = reactive<AdminForum.CategoryMutationParams>({ name: "" });

const validateName = (_rule: unknown, value: unknown, callback: (error?: string | Error) => void) => {
  if (typeof value !== "string" || !value.trim()) {
    callback(new Error("分類名稱不可為空"));
    return;
  }
  callback();
};

const rules: FormRules = {
  name: [{ validator: validateName, trigger: "blur" }]
};

const openDialog = (params: DialogParams) => {
  dialogParams.value = params;
  formData.name = "";
  formRef.value?.clearValidate();
  dialogVisible.value = true;
};

const handleSubmit = async () => {
  const params = dialogParams.value;
  if (!params) return;

  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    await params.api({ name: formData.name.trim() });
    ElMessage.success("分類新增成功");
    await params.getTableList?.();
    dialogVisible.value = false;
  } catch {
    // 全域 HTTP 攔截器已負責顯示 API 錯誤，Dialog 保持開啟。
  } finally {
    submitting.value = false;
  }
};

defineExpose({ openDialog });
</script>
