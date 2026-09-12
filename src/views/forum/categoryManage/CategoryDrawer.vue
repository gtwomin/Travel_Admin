<template>
  <el-drawer v-model="drawerVisible" :destroy-on-close="true" size="min(450px, 100vw)" :title="drawerTitle">
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="82px" @submit.prevent>
      <el-form-item label="分類名稱" prop="name">
        <el-input v-model="formData.name" placeholder="請輸入分類名稱" clearable @keyup.enter="handleSubmit" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="drawerVisible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">儲存</el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts" name="CategoryDrawer">
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { computed, reactive, ref } from "vue";

import { AdminForum } from "@/api/interface";

interface DrawerParams {
  mode: "create" | "edit";
  row?: AdminForum.Category;
  api: (params: AdminForum.CategoryMutationParams) => Promise<unknown>;
  getTableList?: () => Promise<unknown> | unknown;
}

const drawerVisible = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance>();
const drawerParams = ref<DrawerParams | null>(null);
const formData = reactive<AdminForum.CategoryMutationParams>({ name: "" });

const drawerTitle = computed(() => (drawerParams.value?.mode === "edit" ? "編輯分類" : "新增分類"));

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

const acceptParams = (params: DrawerParams) => {
  drawerParams.value = params;
  formData.name = params.row?.name ?? "";
  drawerVisible.value = true;
};

const handleSubmit = async () => {
  if (!drawerParams.value) return;

  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    await drawerParams.value.api({ name: formData.name.trim() });
    ElMessage.success(drawerParams.value.mode === "create" ? "分類新增成功" : "分類更新成功");
    await drawerParams.value.getTableList?.();
    drawerVisible.value = false;
  } finally {
    submitting.value = false;
  }
};

defineExpose({ acceptParams });
</script>
