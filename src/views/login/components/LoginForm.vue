<template>
  <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" size="large">
    <el-form-item prop="username">
      <el-input v-model="loginForm.username" placeholder="使用者名稱：admin / user">
        <template #prefix>
          <el-icon class="el-input__icon">
            <user />
          </el-icon>
        </template>
      </el-input>
    </el-form-item>
    <el-form-item prop="password">
      <el-input v-model="loginForm.password" type="password" placeholder="密碼：123456" show-password autocomplete="new-password">
        <template #prefix>
          <el-icon class="el-input__icon">
            <lock />
          </el-icon>
        </template>
      </el-input>
    </el-form-item>
  </el-form>
  <div class="login-btn">
    <el-button :icon="CircleClose" round size="large" @click="resetForm(loginFormRef)"> 重設 </el-button>
    <el-button :icon="UserFilled" round size="large" type="primary" :loading="loading" @click="login(loginFormRef)">
      登入
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { CircleClose, UserFilled } from "@element-plus/icons-vue";
import type { ElForm } from "element-plus";
import { ElNotification } from "element-plus";
import { onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

// import { getTimeState } from "@/utils";
import { Login } from "@/api/interface";
import { loginApi } from "@/api/modules/login";
import { HOME_URL } from "@/config";
import { useKeepAliveStore } from "@/stores/modules/keepAlive";
import { useTabsStore } from "@/stores/modules/tabs";
import { useUserStore } from "@/stores/modules/user";

const router = useRouter();
const userStore = useUserStore();
const tabsStore = useTabsStore();
const keepAliveStore = useKeepAliveStore();

type FormInstance = InstanceType<typeof ElForm>;
const loginFormRef = ref<FormInstance>();
const loginRules = reactive({
  username: [{ required: true, message: "請輸入使用者名稱", trigger: "blur" }],
  password: [{ required: true, message: "請輸入密碼", trigger: "blur" }]
});

const loading = ref(false);
const loginForm = reactive<Login.ReqLoginForm>({
  username: "",
  password: ""
});

// login
const login = (formEl: FormInstance | undefined) => {
  if (!formEl) return;
  formEl.validate(async valid => {
    if (!valid) return;
    loading.value = true;
    try {
      // 1.执行登录接口
      const response = await loginApi(loginForm);
      userStore.setToken(response.accessToken);

      // 2.清空 tabs、keepAlive 数据
      tabsStore.setTabs([]);
      keepAliveStore.setKeepAliveName([]);

      // 3.跳转到首页
      router.push(HOME_URL);
      // ElNotification({
      //   title: getTimeState(),
      //   message: "欢迎登录 Geeker-Admin",
      //   type: "success",
      //   duration: 3000
      // });
      ElNotification({
        title: "React 付費版本 🔥🔥🔥",
        dangerouslyUseHTMLString: true,
        message: "預覽地址：<a href='https://pro.spicyboy.cn'>https://pro.spicyboy.cn</a>",
        type: "success",
        duration: 8000
      });
    } finally {
      loading.value = false;
    }
  });
};

// resetForm
const resetForm = (formEl: FormInstance | undefined) => {
  if (!formEl) return;
  formEl.resetFields();
};

onMounted(() => {
  // 监听 enter 事件（调用登录）
  document.onkeydown = (e: KeyboardEvent) => {
    if (e.code === "Enter" || e.code === "enter" || e.code === "NumpadEnter") {
      if (loading.value) return;
      login(loginFormRef.value);
    }
  };
});

onBeforeUnmount(() => {
  document.onkeydown = null;
});
</script>

<style scoped lang="scss">
@use "../index";
</style>
