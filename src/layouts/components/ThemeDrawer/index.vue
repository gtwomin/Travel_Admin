<template>
  <el-drawer v-model="drawerVisible" title="佈局設定" size="290px">
    <!-- 布局样式 -->
    <el-divider class="divider" content-position="center">
      <el-icon><Notification /></el-icon>
      佈局樣式
    </el-divider>
    <div class="layout-box">
      <el-tooltip effect="dark" content="縱向" placement="top" :show-after="200">
        <div :class="['layout-item layout-vertical', { 'is-active': layout == 'vertical' }]" @click="setLayout('vertical')">
          <div class="layout-dark"></div>
          <div class="layout-container">
            <div class="layout-light"></div>
            <div class="layout-content"></div>
          </div>
          <el-icon v-if="layout == 'vertical'">
            <CircleCheckFilled />
          </el-icon>
        </div>
      </el-tooltip>
      <el-tooltip effect="dark" content="經典" placement="top" :show-after="200">
        <div :class="['layout-item layout-classic', { 'is-active': layout == 'classic' }]" @click="setLayout('classic')">
          <div class="layout-dark"></div>
          <div class="layout-container">
            <div class="layout-light"></div>
            <div class="layout-content"></div>
          </div>
          <el-icon v-if="layout == 'classic'">
            <CircleCheckFilled />
          </el-icon>
        </div>
      </el-tooltip>
      <el-tooltip effect="dark" content="橫向" placement="top" :show-after="200">
        <div :class="['layout-item layout-transverse', { 'is-active': layout == 'transverse' }]" @click="setLayout('transverse')">
          <div class="layout-dark"></div>
          <div class="layout-content"></div>
          <el-icon v-if="layout == 'transverse'">
            <CircleCheckFilled />
          </el-icon>
        </div>
      </el-tooltip>
      <el-tooltip effect="dark" content="分欄" placement="top" :show-after="200">
        <div :class="['layout-item layout-columns', { 'is-active': layout == 'columns' }]" @click="setLayout('columns')">
          <div class="layout-dark"></div>
          <div class="layout-light"></div>
          <div class="layout-content"></div>
          <el-icon v-if="layout == 'columns'">
            <CircleCheckFilled />
          </el-icon>
        </div>
      </el-tooltip>
    </div>
    <div class="theme-item">
      <span>
        側邊欄反轉色
        <el-tooltip effect="dark" content="側邊欄顏色變為深色模式" placement="top">
          <el-icon><QuestionFilled /></el-icon>
        </el-tooltip>
      </span>
      <el-switch v-model="asideInverted" @change="setAsideTheme" />
    </div>
    <div class="theme-item mb50">
      <span>
        頭部反轉色
        <el-tooltip effect="dark" content="頭部顏色變為深色模式" placement="top">
          <el-icon><QuestionFilled /></el-icon>
        </el-tooltip>
      </span>
      <el-switch v-model="headerInverted" @change="setHeaderTheme" />
    </div>

    <!-- 全局主题 -->
    <el-divider class="divider" content-position="center">
      <el-icon><ColdDrink /></el-icon>
      全域主題
    </el-divider>
    <div class="theme-item">
      <span>主題顏色</span>
      <el-color-picker v-model="primary" :predefine="colorList" @change="changePrimary" />
    </div>
    <div class="theme-item">
      <span>暗黑模式</span>
      <SwitchDark />
    </div>
    <div class="theme-item">
      <span>灰色模式</span>
      <el-switch v-model="isGrey" @change="changeGreyOrWeak('grey', !!$event)" />
    </div>
    <div class="theme-item mb40">
      <span>色弱模式</span>
      <el-switch v-model="isWeak" @change="changeGreyOrWeak('weak', !!$event)" />
    </div>

    <!-- 界面设置 -->
    <el-divider class="divider" content-position="center">
      <el-icon><Setting /></el-icon>
      介面設定
    </el-divider>
    <div class="theme-item">
      <span>選單折疊</span>
      <el-switch v-model="isCollapse" />
    </div>
    <div class="theme-item">
      <span>選單手風琴</span>
      <el-switch v-model="accordion" />
    </div>
    <div class="theme-item">
      <span>浮水印</span>
      <el-switch v-model="watermark" />
    </div>
    <div class="theme-item">
      <span>麵包屑</span>
      <el-switch v-model="breadcrumb" />
    </div>
    <div class="theme-item">
      <span>麵包屑圖示</span>
      <el-switch v-model="breadcrumbIcon" />
    </div>
    <div class="theme-item">
      <span>標籤列</span>
      <el-switch v-model="tabs" />
    </div>
    <div class="theme-item">
      <span>標籤列圖示</span>
      <el-switch v-model="tabsIcon" />
    </div>
    <div class="theme-item">
      <span>頁腳</span>
      <el-switch v-model="footer" />
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { ref } from "vue";

import SwitchDark from "@/components/SwitchDark/index.vue";
import { DEFAULT_PRIMARY } from "@/config";
import { useTheme } from "@/hooks/useTheme";
import { LayoutType } from "@/stores/interface";
import { useGlobalStore } from "@/stores/modules/global";
import mittBus from "@/utils/mittBus";

const { changePrimary, changeGreyOrWeak, setAsideTheme, setHeaderTheme } = useTheme();

const globalStore = useGlobalStore();
const {
  layout,
  primary,
  isGrey,
  isWeak,
  asideInverted,
  headerInverted,
  isCollapse,
  accordion,
  watermark,
  breadcrumb,
  breadcrumbIcon,
  tabs,
  tabsIcon,
  footer
} = storeToRefs(globalStore);

// 预定义主题颜色
const colorList = [
  DEFAULT_PRIMARY,
  "#daa96e",
  "#0c819f",
  "#409eff",
  "#27ae60",
  "#ff5c93",
  "#e74c3c",
  "#fd726d",
  "#f39c12",
  "#9b59b6"
];

// 设置布局方式
const setLayout = (val: LayoutType) => {
  globalStore.setGlobalState("layout", val);
  setAsideTheme();
};

// 打开主题设置
const drawerVisible = ref(false);
mittBus.on("openThemeDrawer", () => (drawerVisible.value = true));
</script>

<style scoped lang="scss">
@use "./index";
</style>
