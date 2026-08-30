import { createApp } from "vue";

// iconfont css
import "@/assets/iconfont/iconfont.scss";
// element css
import "element-plus/dist/index.css";
// element dark css
import "element-plus/theme-chalk/dark/css-vars.css";
// custom styles
import "@/styles/index.scss";
// svg icons
import "virtual:svg-icons-register";

// element icons
import * as Icons from "@element-plus/icons-vue";
// element plus
import ElementPlus from "element-plus";

import http from "@/api";
// custom directives
import directives from "@/directives/index";
// vue i18n
import I18n from "@/languages/index";
// vue Router
import router from "@/routers";
// pinia store
import pinia from "@/stores";
// errorHandler
import errorHandler from "@/utils/errorHandler";

import App from "./App.vue";

const LEGACY_USER_STORAGE_KEY = "geeker-user";

const bootstrap = async () => {
  localStorage.removeItem(LEGACY_USER_STORAGE_KEY);

  const app = createApp(App);
  app.config.errorHandler = errorHandler;

  // register the element Icons component
  Object.keys(Icons).forEach(key => {
    app.component(key, Icons[key as keyof typeof Icons]);
  });

  app.use(ElementPlus).use(directives).use(pinia);
  await http.restoreAdminSession();
  app.use(router).use(I18n).mount("#app");
};

void bootstrap();
