<template>
  <!-- 欄位設定 -->
  <el-drawer v-model="drawerVisible" title="欄位設定" size="450px">
    <div class="table-main">
      <el-table :data="colSetting" :border="true" row-key="prop" default-expand-all :tree-props="{ children: '_children' }">
        <el-table-column prop="label" align="center" label="欄名" />
        <el-table-column v-slot="scope" prop="isShow" align="center" label="顯示">
          <el-switch v-model="scope.row.isShow"></el-switch>
        </el-table-column>
        <el-table-column v-if="showSort" v-slot="scope" prop="sortable" align="center" label="排序">
          <el-switch v-model="scope.row.sortable"></el-switch>
        </el-table-column>
        <template #empty>
          <div class="table-empty">
            <img src="@/assets/images/notData.png" alt="notData" />
            <div>暫無可設定欄位</div>
          </div>
        </template>
      </el-table>
    </div>
  </el-drawer>
</template>

<script setup lang="ts" name="ColSetting">
import { ref } from "vue";

import { ColumnProps } from "@/components/ProTable/interface";

withDefaults(
  defineProps<{
    colSetting: ColumnProps[];
    showSort?: boolean;
  }>(),
  { showSort: true }
);

const drawerVisible = ref<boolean>(false);

const openColSetting = () => {
  drawerVisible.value = true;
};

defineExpose({
  openColSetting
});
</script>

<style scoped lang="scss">
.cursor-move {
  cursor: move;
}
</style>
