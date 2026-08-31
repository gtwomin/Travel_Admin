<template>
  <el-dialog v-model="dialogVisible" title="個人資訊" width="520px" draggable :close-on-click-modal="false">
    <el-skeleton v-if="loading" :rows="5" animated />
    <template v-else-if="!editing">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="頭像">
          <el-image
            v-if="displayProfile.avatar"
            class="avatar-preview"
            :src="avatarUrl"
            :preview-src-list="[avatarUrl]"
            fit="cover"
          />
          <el-avatar v-else :size="64">{{ avatarInitial }}</el-avatar>
        </el-descriptions-item>
        <el-descriptions-item label="帳號">{{ displayProfile.username || "—" }}</el-descriptions-item>
        <el-descriptions-item label="暱稱">{{ displayProfile.nickname || "—" }}</el-descriptions-item>
        <el-descriptions-item label="Email">{{ displayProfile.email || "—" }}</el-descriptions-item>
        <el-descriptions-item label="角色">
          <el-tag v-for="role in displayProfile.roles" :key="role" class="role-tag">
            {{ formatRole(role) }}
          </el-tag>
          <span v-if="!displayProfile.roles.length">—</span>
        </el-descriptions-item>
      </el-descriptions>
    </template>
    <el-form v-else ref="formRef" :model="formData" :rules="rules" label-width="72px">
      <el-form-item label="頭像" prop="avatar">
        <UploadImg
          :key="uploadKey"
          v-model:image-url="formData.avatar"
          v-model:file="avatarFile"
          defer-upload
          width="120px"
          height="120px"
          :file-size="3"
          :file-type="['image/jpeg', 'image/png', 'image/webp']"
          @update:file="handleAvatarFileChange"
        >
          <template #empty>
            <el-icon><AvatarIcon /></el-icon>
            <span>請上傳頭像</span>
          </template>
          <template #tip>JPEG、PNG 或 WebP，大小不可超過 3MB</template>
        </UploadImg>
      </el-form-item>
      <el-form-item label="帳號">
        <el-input :model-value="displayProfile.username" disabled />
      </el-form-item>
      <el-form-item label="暱稱" prop="nickname">
        <el-input v-model="formData.nickname" maxlength="128" show-word-limit clearable />
      </el-form-item>
      <el-form-item label="Email" prop="email">
        <el-input v-model="formData.email" maxlength="255" clearable />
      </el-form-item>
      <el-form-item label="角色">
        <el-tag v-for="role in displayProfile.roles" :key="role" class="role-tag">
          {{ formatRole(role) }}
        </el-tag>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="editing ? cancelEdit() : (dialogVisible = false)">
        {{ editing ? "取消" : "關閉" }}
      </el-button>
      <el-button v-if="!loading && !editing" type="primary" @click="beginEdit">編輯</el-button>
      <el-button v-if="editing" type="primary" :loading="submitting" @click="handleSubmit">儲存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { Avatar as AvatarIcon } from "@element-plus/icons-vue";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { computed, reactive, ref } from "vue";

import { Profile } from "@/api/interface";
import { updateAdminProfileApi } from "@/api/modules/profile";
import { resolveAvatarUrl } from "@/api/modules/user";
import UploadImg from "@/components/Upload/Img.vue";
import { useAuthStore } from "@/stores/modules/auth";

const dialogVisible = ref(false);
const editing = ref(false);
const loading = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance>();
const authStore = useAuthStore();
const avatarFile = ref<File | null>(null);
const originalAvatar = ref<string | null>(null);
const removeAvatar = ref(false);
const uploadKey = ref(0);
const formData = reactive<Profile.AdminProfileForm>({
  nickname: "",
  email: "",
  avatar: ""
});

const fallbackProfile = computed<Profile.AdminProfileResponse>(() => ({
  userId: authStore.session?.userId ?? "",
  username: authStore.session?.username ?? "",
  nickname: null,
  email: null,
  avatar: null,
  roles: authStore.session?.roles ?? []
}));

const displayProfile = computed(() => authStore.profile ?? fallbackProfile.value);
const avatarUrl = computed(() => resolveAvatarUrl(displayProfile.value.avatar));
const avatarInitial = computed(() => Array.from(displayProfile.value.username || "?")[0] || "?");

const rules: FormRules = {
  nickname: [{ max: 128, message: "暱稱長度不可超過 128 個字元", trigger: "blur" }],
  email: [{ type: "email", message: "信箱格式不正確", trigger: "blur" }]
};

const roleMap: Record<string, string> = {
  ROLE_ADMIN: "管理員",
  ROLE_USER: "一般使用者"
};

const formatRole = (role: string) => roleMap[role] || role;

const resetForm = () => {
  uploadKey.value += 1;
  const currentProfile = displayProfile.value;
  formData.nickname = currentProfile.nickname ?? "";
  formData.email = currentProfile.email ?? "";
  formData.avatar = resolveAvatarUrl(currentProfile.avatar);
  originalAvatar.value = currentProfile.avatar;
  avatarFile.value = null;
  removeAvatar.value = false;
};

const openDialog = async () => {
  dialogVisible.value = true;
  editing.value = false;
  if (!authStore.profile) {
    loading.value = true;
    const profile = await authStore.loadProfile(true);
    loading.value = false;
    if (!profile) ElMessage.warning("個人資訊載入失敗，請稍後再試");
  }
  resetForm();
};

const beginEdit = () => {
  resetForm();
  editing.value = true;
};

const cancelEdit = () => {
  editing.value = false;
  resetForm();
};

const handleAvatarFileChange = (file: File | null) => {
  avatarFile.value = file;
  if (file) {
    removeAvatar.value = false;
  } else if (!formData.avatar) {
    removeAvatar.value = Boolean(originalAvatar.value);
  }
};

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  const form = new FormData();
  form.append("nickname", formData.nickname);
  form.append("email", formData.email);
  form.append("removeAvatar", String(removeAvatar.value));
  if (avatarFile.value) form.append("avatar", avatarFile.value);

  submitting.value = true;
  try {
    const updatedProfile = await updateAdminProfileApi(form);
    authStore.setProfile(updatedProfile);
    editing.value = false;
    resetForm();
    ElMessage.success("個人資訊更新成功");
  } catch {
    ElMessage.error("個人資訊更新失敗，請稍後再試");
  } finally {
    submitting.value = false;
  }
};

defineExpose({ openDialog });
</script>

<style scoped lang="scss">
.avatar-preview {
  width: 64px;
  height: 64px;
  cursor: zoom-in;
  border-radius: 50%;
}
.role-tag + .role-tag {
  margin-left: 8px;
}
</style>
