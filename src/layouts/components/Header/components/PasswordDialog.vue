<template>
  <el-dialog v-model="dialogVisible" title="修改密碼" width="500px" draggable :close-on-click-modal="false">
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="96px" @submit.prevent>
      <el-form-item label="目前密碼" prop="currentPassword" :error="currentPasswordError">
        <el-input v-model="formData.currentPassword" type="password" show-password autocomplete="current-password" />
      </el-form-item>
      <el-form-item label="新密碼" prop="newPassword">
        <el-input v-model="formData.newPassword" type="password" show-password autocomplete="new-password" />
      </el-form-item>
      <el-form-item label="確認新密碼" prop="confirmPassword">
        <el-input v-model="formData.confirmPassword" type="password" show-password autocomplete="new-password" />
      </el-form-item>
      <div class="password-tip">密碼長度須為 8 至 64 個字元，且至少包含一個英文字母與一個數字。</div>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">儲存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { reactive, ref } from "vue";

import { type ApiErrorResponse } from "@/api/interface";
import { changeAdminPasswordApi } from "@/api/modules/profile";

const dialogVisible = ref(false);
const submitting = ref(false);
const currentPasswordError = ref("");
const formRef = ref<FormInstance>();
const formData = reactive({
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
});

const validatePassword = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (!value) return callback(new Error("新密碼不能為空"));
  if (value.length < 8 || value.length > 64) {
    return callback(new Error("新密碼長度須介於 8 至 64 個字元"));
  }
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return callback(new Error("新密碼至少須包含一個英文字母與一個數字"));
  }
  if (value === formData.currentPassword) {
    return callback(new Error("新密碼不得與目前密碼相同"));
  }
  callback();
};

const validateConfirmation = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (!value) return callback(new Error("請再次輸入新密碼"));
  if (value !== formData.newPassword) return callback(new Error("兩次輸入的新密碼不一致"));
  callback();
};

const rules: FormRules = {
  currentPassword: [{ required: true, message: "目前密碼不能為空", trigger: "blur" }],
  newPassword: [{ validator: validatePassword, trigger: "blur" }],
  confirmPassword: [{ validator: validateConfirmation, trigger: "blur" }]
};

const resetForm = () => {
  formData.currentPassword = "";
  formData.newPassword = "";
  formData.confirmPassword = "";
  currentPasswordError.value = "";
  formRef.value?.clearValidate();
};

const openDialog = () => {
  resetForm();
  dialogVisible.value = true;
};

const getApiError = (error: unknown) => {
  if (!error || typeof error !== "object" || !("response" in error)) return undefined;
  const response = (error as { response?: { data?: ApiErrorResponse } }).response;
  return response?.data;
};

const handleSubmit = async () => {
  currentPasswordError.value = "";
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    await changeAdminPasswordApi({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword
    });
    ElMessage.success("密碼修改成功，請重新登入");
    dialogVisible.value = false;
    emit("success");
  } catch (error) {
    const apiError = getApiError(error);
    if (apiError?.code === "CURRENT_PASSWORD_MISMATCH") {
      currentPasswordError.value = apiError.message;
      return;
    }
    ElMessage.error(apiError?.message ?? "密碼修改失敗，請稍後再試");
  } finally {
    submitting.value = false;
  }
};

const emit = defineEmits<{
  success: [];
}>();

defineExpose({ openDialog });
</script>

<style scoped lang="scss">
.password-tip {
  margin-left: 96px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}
</style>
