<!-- 📚📚📚 Pro-Table 文档: https://juejin.cn/post/7166068828202336263 -->

<template>
  <!-- 查詢表單 -->
  <SearchForm
    v-show="isShowSearch"
    :search="_search"
    :reset="_reset"
    :columns="searchColumns"
    :search-param="searchParam"
    :search-col="searchCol"
  />

  <!-- 表格主體 -->
  <div class="card table-main">
    <!-- 表格標頭與操作按鈕 -->
    <div class="table-header">
      <div class="header-button-lf">
        <slot name="tableHeader" :selected-list="selectedList" :selected-list-ids="selectedListIds" :is-selected="isSelected" />
      </div>
      <div v-if="toolButton" class="header-button-ri">
        <slot name="toolButton">
          <el-button v-if="showToolButton('refresh')" :icon="Refresh" circle @click="getTableList" />
          <el-button v-if="showToolButton('setting') && columns.length" :icon="Operation" circle @click="openColSetting" />
          <el-button
            v-if="showToolButton('search') && searchColumns?.length"
            :icon="Search"
            circle
            @click="isShowSearch = !isShowSearch"
          />
        </slot>
      </div>
    </div>
    <!-- 表格主體 -->
    <el-table
      v-bind="$attrs"
      :id="uuid"
      ref="tableRef"
      :data="processTableData"
      :border="border"
      :row-key="rowKey"
      :default-sort="defaultSort"
      @selection-change="selectionChange"
      @sort-change="handleTableSortChange"
    >
      <!-- 預設插槽 -->
      <slot />
      <template v-for="item in tableColumns" :key="item">
        <!-- selection || radio || index || expand || sort -->
        <el-table-column
          v-if="item.type && columnTypes.includes(item.type)"
          v-bind="item"
          :align="item.align ?? 'center'"
          :reserve-selection="item.type == 'selection'"
        >
          <template #default="scope">
            <!-- 展開 -->
            <template v-if="item.type == 'expand'">
              <component :is="item.render" v-bind="scope" v-if="item.render" />
              <slot v-else :name="item.type" v-bind="scope" />
            </template>
            <!-- 單選 -->
            <el-radio v-if="item.type == 'radio'" v-model="radio" :label="scope.row[rowKey]">
              <i></i>
            </el-radio>
            <!-- 排序拖曳 -->
            <el-tag v-if="item.type == 'sort'" class="move">
              <el-icon> <DCaret /></el-icon>
            </el-tag>
          </template>
        </el-table-column>
        <!-- 其他欄位 -->
        <TableColumn v-else :column="item">
          <template v-for="slot in Object.keys($slots)" #[slot]="scope">
            <slot :name="slot" v-bind="scope" />
          </template>
        </TableColumn>
      </template>
      <!-- 插入表格最後一列之後的插槽 -->
      <template #append>
        <slot name="append" />
      </template>
      <!-- 無資料 -->
      <template #empty>
        <div class="table-empty">
          <slot name="empty">
            <img src="@/assets/images/notData.png" alt="notData" />
            <div>暫無資料</div>
          </slot>
        </div>
      </template>
    </el-table>
    <!-- 分頁元件 -->
    <slot name="pagination">
      <Pagination
        v-if="pagination"
        :pageable="pageable"
        :handle-size-change="handleSizeChange"
        :handle-current-change="handleCurrentChange"
      />
    </slot>
  </div>
  <!-- 欄位設定 -->
  <ColSetting v-if="toolButton" ref="colRef" v-model:col-setting="colSetting" :show-sort="showColumnSortSetting" />
</template>

<script setup lang="ts" name="ProTable">
import { Operation, Refresh, Search } from "@element-plus/icons-vue";
import { ElTable } from "element-plus";
import Sortable from "sortablejs";
import { computed, nextTick, onMounted, provide, reactive, ref, unref, watch } from "vue";

import { BreakPoint } from "@/components/Grid/interface";
import { ColumnProps, TypeProps } from "@/components/ProTable/interface";
import SearchForm from "@/components/SearchForm/index.vue";
import { useSelection } from "@/hooks/useSelection";
import { useTable } from "@/hooks/useTable";
import { generateUUID, handleProp } from "@/utils";

import ColSetting from "./components/ColSetting.vue";
import Pagination from "./components/Pagination.vue";
import TableColumn from "./components/TableColumn.vue";

export interface ProTableProps {
  columns: ColumnProps[]; // 欄位設定項目 ==> 必填
  data?: any[]; // 靜態 table data 資料，若存在則不使用 requestApi 回傳資料 ==> 選填
  requestApi?: (params: any) => Promise<any>; // 取得表格資料的 API ==> 選填
  requestAuto?: boolean; // 是否自動執行 API 請求 ==> 選填（預設為 true）
  requestError?: (params: any) => void; // 監聽表格 API 請求錯誤 ==> 選填
  dataCallback?: (data: any) => any; // 處理回傳資料的回呼函式 ==> 選填
  title?: string; // 表格標題 ==> 選填
  pagination?: boolean; // 是否需要分頁元件 ==> 選填（預設為 true）
  initParam?: any; // 初始化請求參數 ==> 選填（預設為 {}）
  border?: boolean; // 是否顯示垂直邊框 ==> 選填（預設為 true）
  toolButton?: ("refresh" | "setting" | "search")[] | boolean; // 是否顯示表格功能按鈕 ==> 選填（預設為 true）
  rowKey?: string; // 資料列的 Key，用於最佳化 Table 渲染及多選指定 id ==> 選填（預設為 id）
  searchCol?: number | Record<BreakPoint, number>; // 表格搜尋項目各欄寬度設定 ==> 選填 { xs: 1, sm: 2, md: 2, lg: 3, xl: 4 }
  serverSort?: boolean; // 是否使用伺服器排序
  showColumnSortSetting?: boolean; // 是否在列設定顯示排序開關
  defaultSort?: { prop: string; order: "ascending" | "descending" }; // 伺服器排序清除後的預設欄位與方向
}

// 接收父元件參數並設定預設值
const props = withDefaults(defineProps<ProTableProps>(), {
  columns: () => [],
  requestAuto: true,
  pagination: true,
  initParam: {},
  border: true,
  toolButton: true,
  rowKey: "id",
  searchCol: () => ({ xs: 1, sm: 2, md: 2, lg: 3, xl: 4 }),
  serverSort: false,
  showColumnSortSetting: true
});

// table 實例
const tableRef = ref<InstanceType<typeof ElTable>>();

// 產生元件唯一 ID
const uuid = ref("id-" + generateUUID());

// 欄位類型
const columnTypes: TypeProps[] = ["selection", "radio", "index", "expand", "sort"];

// 是否顯示搜尋模組
const isShowSearch = ref(true);

// 控制 ToolButton 顯示
const showToolButton = (key: "refresh" | "setting" | "search") => {
  return Array.isArray(props.toolButton) ? props.toolButton.includes(key) : props.toolButton;
};

// 單選值
const radio = ref("");

// 表格多選 Hooks
const { selectionChange, selectedList, selectedListIds, isSelected } = useSelection(props.rowKey);

// 表格操作 Hooks
const {
  tableData,
  pageable,
  searchParam,
  searchInitParam,
  getTableList,
  search,
  reset,
  handleSizeChange,
  handleCurrentChange,
  handleSortChange
} = useTable(props.requestApi, props.initParam, props.pagination, props.dataCallback, props.requestError);

const suppressSortChange = ref(false);

const restoreDefaultSort = () => {
  if (!props.defaultSort) return;
  suppressSortChange.value = true;
  tableRef.value?.sort(props.defaultSort.prop, props.defaultSort.order);
  suppressSortChange.value = false;
};

const handleTableSortChange = ({ prop, order }: { prop?: string; order?: "ascending" | "descending" | null }) => {
  if (!props.serverSort || suppressSortChange.value) return;

  const sortOrder = order === "ascending" ? "asc" : order === "descending" ? "desc" : undefined;
  handleSortChange(prop, sortOrder);
  if (!prop || !sortOrder) restoreDefaultSort();
};

// 清空選取資料列表
const clearSelection = () => tableRef.value!.clearSelection();

// 初始化表格資料並啟用拖曳排序
onMounted(async () => {
  if (props.columns.some(column => column.type === "sort")) {
    await nextTick();
    dragSort();
  }

  if (props.requestAuto) {
    getTableList();
  }

  if (props.data) {
    pageable.value.total = props.data.length;
  }
});

// 處理表格資料
const processTableData = computed(() => {
  if (!props.data) return tableData.value;
  if (!props.pagination) return props.data;
  return props.data.slice(
    (pageable.value.pageNum - 1) * pageable.value.pageSize,
    pageable.value.pageSize * pageable.value.pageNum
  );
});

// 監聽頁面 initParam 變更並重新取得表格資料
watch(() => props.initParam, getTableList, { deep: true });

// 接收 columns 並設定為響應式
const tableColumns = reactive<ColumnProps[]>(props.columns);

// 將 columns 扁平化
const flatColumns = computed(() => flatColumnsFunc(tableColumns));

// 定義 enumMap 儲存 enum 值（避免非同步請求無法格式化儲存格內容或填入搜尋下拉選項）
const enumMap = ref(new Map<string, { [key: string]: any }[]>());
const setEnumMap = async ({ prop, enum: enumValue }: ColumnProps) => {
  if (!enumValue) return;

  // 若目前 enumMap 已存在相同值則直接返回
  if (enumMap.value.has(prop!) && (typeof enumValue === "function" || enumMap.value.get(prop!) === enumValue)) return;

  // 若目前 enum 為靜態資料，直接儲存至 enumMap
  if (typeof enumValue !== "function") return enumMap.value.set(prop!, unref(enumValue!));

  // 避免 API 執行或儲存較慢造成重複請求，先儲存 []，回傳後再更新
  enumMap.value.set(prop!, []);

  // 若 enum 來自後端資料，呼叫請求並儲存至 enumMap
  const { data } = await enumValue();
  enumMap.value.set(prop!, data);
};

// 注入 enumMap
provide("enumMap", enumMap);

// columns 扁平化方法
const flatColumnsFunc = (columns: ColumnProps[], flatArr: ColumnProps[] = []) => {
  columns.forEach(async col => {
    if (col._children?.length) flatArr.push(...flatColumnsFunc(col._children));
    flatArr.push(col);

    // 為欄位設定 isShow、isSetting 與 isFilterEnum 預設值
    col.isShow = col.isShow ?? true;
    col.isSetting = col.isSetting ?? true;
    col.isFilterEnum = col.isFilterEnum ?? true;

    // 設定 enumMap
    await setEnumMap(col);
  });
  return flatArr.filter(item => !item._children?.length);
};

// 篩選需要搜尋的設定項目並排序
const searchColumns = computed(() => {
  return flatColumns.value
    ?.filter(item => item.search?.el || item.search?.render)
    .sort((a, b) => a.search!.order! - b.search!.order!);
});

// 設定搜尋表單預設排序與項目預設值
searchColumns.value?.forEach((column, index) => {
  column.search!.order = column.search?.order ?? index + 2;
  const key = column.search?.key ?? handleProp(column.prop!);
  const defaultValue = column.search?.defaultValue;
  if (defaultValue !== undefined && defaultValue !== null) {
    searchParam.value[key] = defaultValue;
    searchInitParam.value[key] = defaultValue;
  }
});

// 欄位設定：篩選不需要設定的欄位
const colRef = ref();
const colSetting = tableColumns!.filter(item => {
  const { type, prop, isSetting } = item;
  return !columnTypes.includes(type!) && prop !== "operation" && isSetting;
});
const openColSetting = () => colRef.value.openColSetting();

// 定義 emit 事件
const emit = defineEmits<{
  search: [];
  reset: [];
  dragSort: [{ newIndex?: number; oldIndex?: number }];
}>();

const _search = () => {
  search();
  emit("search");
};

const _reset = () => {
  if (props.serverSort) {
    suppressSortChange.value = true;
    tableRef.value?.clearSort();
    suppressSortChange.value = false;
    restoreDefaultSort();
  }
  reset();
  emit("reset");
};

// 表格拖曳排序
const dragSort = () => {
  const tbody = document.querySelector(`#${uuid.value} tbody`);
  if (!(tbody instanceof HTMLElement)) return;

  Sortable.create(tbody, {
    handle: ".move",
    animation: 300,
    onEnd({ newIndex, oldIndex }) {
      const [removedItem] = processTableData.value.splice(oldIndex!, 1);
      processTableData.value.splice(newIndex!, 0, removedItem);
      emit("dragSort", { newIndex, oldIndex });
    }
  });
};

// 暴露給父元件的參數與方法（外部需要的內容可由此提供）
defineExpose({
  element: tableRef,
  tableData: processTableData,
  radio,
  pageable,
  searchParam,
  searchInitParam,
  isSelected,
  selectedList,
  selectedListIds,

  // 以下為函式
  getTableList,
  search,
  reset,
  handleSizeChange,
  handleCurrentChange,
  clearSelection,
  enumMap
});
</script>
