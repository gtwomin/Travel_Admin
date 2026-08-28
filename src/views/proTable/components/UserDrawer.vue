<template>
  <el-drawer v-model="drawerVisible" :destroy-on-close="true" size="450px" :title="drawerProps.title">
    <template v-if="drawerProps.mode === 'view'">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="頭像">
          <el-image
            v-if="currentRow.avatar"
            class="avatar-preview"
            :src="resolveAvatarUrl(currentRow.avatar)"
            :preview-src-list="[resolveAvatarUrl(currentRow.avatar)]"
            fit="cover"
          />
          <el-avatar v-else :size="64">{{ currentRow.username?.slice(0, 1) }}</el-avatar>
        </el-descriptions-item>
        <el-descriptions-item label="帳號">{{ currentRow.username || "—" }}</el-descriptions-item>
        <el-descriptions-item label="暱稱">{{ currentRow.nickname || "—" }}</el-descriptions-item>
        <el-descriptions-item label="Email">{{ currentRow.email || "—" }}</el-descriptions-item>
        <el-descriptions-item label="狀態">
          <el-tag :type="currentRow.status === 1 ? 'success' : 'danger'">
            {{ currentRow.status === 1 ? "啟用" : "停用" }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="建立時間">
          {{ formatTaipeiDateTime(currentRow.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="更新時間">
          {{ formatTaipeiDateTime(currentRow.updatedAt) }}
        </el-descriptions-item>
      </el-descriptions>
    </template>

    <el-form v-else ref="formRef" :model="formData" :rules="rules" label-width="82px">
      <el-form-item label="頭像" prop="avatar">
        <UploadImg
          v-model:image-url="formData.avatar"
          v-model:file="avatarFile"
          defer-upload
          width="135px"
          height="135px"
          :file-size="3"
          :file-type="['image/jpeg', 'image/png', 'image/webp']"
          @update:file="handleAvatarFileChange"
        >
          <template #empty>
            <el-icon><Avatar /></el-icon>
            <span>請上傳頭像</span>
          </template>
          <template #tip>JPEG、PNG 或 WebP，大小不可超過 3MB</template>
        </UploadImg>
      </el-form-item>
      <el-form-item label="帳號">
        <el-input :model-value="formData.username" disabled />
      </el-form-item>
      <el-form-item label="暱稱" prop="nickname">
        <el-input v-model="formData.nickname" maxlength="128" show-word-limit clearable />
      </el-form-item>
      <el-form-item label="Email" prop="email">
        <el-input v-model="formData.email" maxlength="255" clearable />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="drawerVisible = false">取消</el-button>
      <el-button v-if="drawerProps.mode === 'edit'" type="primary" :loading="submitting" @click="handleSubmit">
        儲存
      </el-button>
      <el-button v-else @click="drawerVisible = false">關閉</el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts" name="UserDrawer">
import { Avatar } from "@element-plus/icons-vue";
import { ElMessage, FormInstance, FormRules } from "element-plus";
import { reactive, ref } from "vue";

import { AdminUser } from "@/api/interface";
import { resolveAvatarUrl } from "@/api/modules/user";
import UploadImg from "@/components/Upload/Img.vue";
import { formatTaipeiDateTime } from "@/utils/dateFormat";

interface DrawerProps {
  title: string;
  mode?: "view" | "edit";
  isView?: boolean;
  row: Record<string, any>;
  api?: (params: any) => Promise<any>;
  getTableList?: () => Promise<any>;
}

interface NormalizedDrawerProps {
  title: string;
  mode: "view" | "edit";
  row: Record<string, any>;
  api?: (params: any) => Promise<any>;
  getTableList?: () => Promise<any>;
}

const drawerVisible = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance>();
const drawerProps = ref<NormalizedDrawerProps>({ title: "使用者詳情", mode: "view", row: {} });
const currentRow = ref<Partial<AdminUser.AdminUserResponse>>({});
const originalAvatar = ref<string | null>(null);
const avatarFile = ref<File | null>(null);
const removeAvatar = ref(false);
const formData = reactive({ username: "", nickname: "", email: "", avatar: "" });

const rules: FormRules = {
  nickname: [{ max: 128, message: "暱稱長度不可超過 128 個字元", trigger: "blur" }],
  email: [{ type: "email", message: "信箱格式不正確", trigger: "blur" }]
};

const acceptParams = (params: DrawerProps) => {
  drawerProps.value = {
    title: params.title,
    mode: params.mode ?? (params.isView ? "view" : "edit"),
    row: params.row,
    api: params.api,
    getTableList: params.getTableList
  };
  currentRow.value = { ...params.row } as Partial<AdminUser.AdminUserResponse>;
  originalAvatar.value = params.row.avatar ?? null;
  avatarFile.value = null;
  removeAvatar.value = false;
  formData.username = params.row.username ?? "";
  formData.nickname = params.row.nickname ?? "";
  formData.email = params.row.email ?? "";
  formData.avatar = params.row.avatar ? resolveAvatarUrl(params.row.avatar) : "";
  drawerVisible.value = true;
};

const handleAvatarFileChange = (file: File | null) => {
  avatarFile.value = file;
  if (file) removeAvatar.value = false;
  else if (!formData.avatar) removeAvatar.value = Boolean(originalAvatar.value);
};

const handleSubmit = async () => {
  if (!drawerProps.value.api || !currentRow.value.id) return;
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  const form = new FormData();
  form.append("nickname", formData.nickname);
  form.append("email", formData.email);
  form.append("removeAvatar", String(removeAvatar.value));
  if (avatarFile.value) form.append("avatar", avatarFile.value);

  submitting.value = true;
  try {
    await drawerProps.value.api(form);
    ElMessage.success("使用者資料更新成功");
    await drawerProps.value.getTableList?.();
    drawerVisible.value = false;
  } finally {
    submitting.value = false;
  }
};

defineExpose({ acceptParams });
</script>

<style scoped lang="scss">
.avatar-preview {
  width: 64px;
  height: 64px;
  cursor: zoom-in;
  border-radius: 50%;
}
</style>
