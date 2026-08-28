import { computed, reactive, toRefs } from "vue";

import { Table } from "./interface";

/**
 * @description table 頁面操作方法封裝
 * @param {Function} api 取得表格資料的 API 方法（必填）
 * @param {Object} initParam 取得資料的初始化參數（選填，預設為 {}）
 * @param {Boolean} isPageable 是否有分頁（選填，預設為 true）
 * @param {Function} dataCallBack 處理後端回傳資料的方法（選填）
 */
export const useTable = (
  api?: (params: any) => Promise<any>,
  initParam: object = {},
  isPageable: boolean = true,
  dataCallBack?: (data: any) => any,
  requestError?: (error: any) => void
) => {
  const state = reactive<Table.StateProps>({
    // 表格資料
    tableData: [],
    // 分頁資料
    pageable: {
      // 目前頁數
      pageNum: 1,
      // 每頁顯示筆數
      pageSize: 10,
      // 總筆數
      total: 0
    },
    // 查詢參數（僅包含查詢條件）
    searchParam: {},
    // 初始化預設查詢參數
    searchInitParam: {},
    // 總參數（包含分頁與查詢參數）
    totalParam: {},
    // 伺服器排序參數
    sortParam: {}
  });

  /**
   * @description 分頁查詢參數（僅包含分頁與表格欄位排序，其他排序方式可自行設定）
   */
  const pageParam = computed({
    get: () => {
      return {
        pageNum: state.pageable.pageNum,
        pageSize: state.pageable.pageSize
      };
    },
    set: (newVal: any) => {
      console.log("分頁更新後的值", newVal);
    }
  });

  /**
   * @description 取得表格資料
   * @return void
   * */
  const getTableList = async () => {
    if (!api) return;
    try {
      // 將既有查詢、初始化、分頁與排序參數合併為總參數
      state.totalParam = {
        ...state.totalParam,
        ...initParam,
        ...(isPageable ? pageParam.value : {}),
        ...state.sortParam
      };
      let { data } = await api({ ...state.searchInitParam, ...state.totalParam });
      if (dataCallBack) {
        data = dataCallBack(data);
      }

      state.tableData = isPageable ? data.list : data;
      // 解構後端回傳的分頁資料（若有分頁則更新分頁資訊）
      if (isPageable) {
        state.pageable.total = data.total;
      }
    } catch (error) {
      if (requestError) {
        requestError(error);
      }
    }
  };

  /**
   * @description 更新查詢參數
   * @return void
   * */
  const updatedTotalParam = () => {
    state.totalParam = {};
    // 處理查詢參數，可在此為查詢參數加上自訂前綴
    let nowSearchParam: Table.StateProps["searchParam"] = {};
    // 避免手動清空輸入框時仍攜帶參數（可在此自訂查詢參數前綴）
    for (let key in state.searchParam) {
      // 某些情況下 false／0 也應該攜帶參數
      if (state.searchParam[key] || state.searchParam[key] === false || state.searchParam[key] === 0) {
        nowSearchParam[key] = state.searchParam[key];
      }
    }
    Object.assign(state.totalParam, nowSearchParam);
  };

  /**
   * @description 查詢表格資料
   * @return void
   * */
  const search = () => {
    state.pageable.pageNum = 1;
    updatedTotalParam();
    getTableList();
  };

  /**
   * @description 重設表格資料
   * @return void
   * */
  const reset = () => {
    state.pageable.pageNum = 1;
    // 重設搜尋表單時，一併恢復預設搜尋參數
    state.searchParam = { ...state.searchInitParam };
    state.sortParam = {};
    updatedTotalParam();
    getTableList();
  };

  /**
   * @description 每頁筆數變更
   * @param {Number} val 目前筆數
   * @return void
   * */
  const handleSizeChange = (val: number) => {
    state.pageable.pageNum = 1;
    state.pageable.pageSize = val;
    getTableList();
  };

  /**
   * @description 目前頁數變更
   * @param {Number} val 目前頁數
   * @return void
   * */
  const handleCurrentChange = (val: number) => {
    state.pageable.pageNum = val;
    getTableList();
  };

  const handleSortChange = (prop?: string, order?: "asc" | "desc") => {
    state.sortParam = prop && order ? { sortBy: prop, sortOrder: order } : {};
    state.pageable.pageNum = 1;
    getTableList();
  };

  return {
    ...toRefs(state),
    getTableList,
    search,
    reset,
    handleSizeChange,
    handleCurrentChange,
    handleSortChange,
    updatedTotalParam
  };
};
