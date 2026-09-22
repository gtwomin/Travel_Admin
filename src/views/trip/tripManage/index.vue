<template>
  <div class="table-box trip-manage">
    <ProTable
      ref="proTable"
      :columns="columns"
      :request-api="getTableList"
      :show-column-sort-setting="false"
      :search-col="{ xs: 1, sm: 2, md: 2, lg: 3, xl: 4 }"
    >
      <template #tableHeader>
        <div class="trip-table-header">
          <div class="trip-header-primary">
            <ElButton type="primary" :icon="CirclePlus" @click="openCreate"> 新增行程 </ElButton>
          </div>

          <div class="status-filter-list">
            <ElButton :type="quickStatus === '' ? 'primary' : 'default'" @click="applyStatusFilter('')">
              全部行程
              <strong>{{ allTripCount }}</strong>
            </ElButton>

            <ElButton :type="quickStatus === 'ACTIVE' ? 'success' : 'default'" @click="applyStatusFilter('ACTIVE')">
              已上架
              <strong>{{ activeTripCount }}</strong>
            </ElButton>

            <ElButton :type="quickStatus === 'INACTIVE' ? 'warning' : 'default'" @click="applyStatusFilter('INACTIVE')">
              已下架
              <strong>{{ inactiveTripCount }}</strong>
            </ElButton>
          </div>
        </div>
      </template>
    </ProTable>
    <TripDetailDrawer ref="detailDrawerRef" :destination-labels="cityLabels" />
    <TripEditorDrawer ref="editorDrawerRef" @saved="refreshTable" />
  </div>
</template>

<script setup lang="tsx" name="tripManage">
import { CirclePlus, Delete, Download, EditPen, Upload, View } from "@element-plus/icons-vue";
import { ElButton, ElImage, ElMessage, ElMessageBox, ElTag } from "element-plus";
import { computed, defineComponent, nextTick, onActivated, onBeforeUnmount, onMounted, reactive, ref } from "vue";

import { AdminTrip } from "@/api/interface";
import {
  adaptAdminTripList,
  AdminTripListViewParams,
  deleteAdminTrip,
  getAdminTripCities,
  getAdminTripCoverPhoto,
  getAdminTripList,
  updateAdminTripStatus
} from "@/api/modules/trip";
import ProTable from "@/components/ProTable/index.vue";
import { ColumnProps, ProTableInstance } from "@/components/ProTable/interface";

import TripDetailDrawer from "./components/TripDetailDrawer.vue";
import TripEditorDrawer from "./components/TripEditorDrawer.vue";

const cityLabels = ref<Record<string, string>>({});
type StatusFilter = "" | AdminTrip.TripStatus;

const allTrips = ref<AdminTrip.TripListResponse[]>([]);

const quickStatus = ref<StatusFilter>("");
const allTripCount = computed(() => allTrips.value.length);

const activeTripCount = computed(() => allTrips.value.filter(trip => trip.status === "ACTIVE").length);

const inactiveTripCount = computed(() => allTrips.value.filter(trip => trip.status === "INACTIVE").length);
const proTable = ref<ProTableInstance>();
const detailDrawerRef = ref<InstanceType<typeof TripDetailDrawer> | null>(null);
const editorDrawerRef = ref<InstanceType<typeof TripEditorDrawer> | null>(null);
const statusLoadingId = ref<number | null>(null);

const TripCover = defineComponent({
  name: "TripCover",
  props: {
    tripId: { type: Number, required: true },
    tripName: { type: String, required: true }
  },
  setup(props) {
    const coverTarget = ref<HTMLElement | null>(null);
    const source = ref<string | null>(null);
    const state = ref<"idle" | "loading" | "loaded" | "error">("idle");
    let observer: IntersectionObserver | null = null;
    let objectUrl: string | null = null;
    let disposed = false;

    const loadCover = async () => {
      if (disposed || state.value === "loading" || state.value === "loaded" || state.value === "error") return;

      state.value = "loading";
      try {
        const blob = await getAdminTripCoverPhoto(props.tripId);
        if (!(blob instanceof Blob)) throw new TypeError("行程封面不是有效的二進位資料");

        const nextObjectUrl = URL.createObjectURL(blob);
        if (disposed) {
          URL.revokeObjectURL(nextObjectUrl);
          return;
        }

        objectUrl = nextObjectUrl;
        source.value = nextObjectUrl;
        state.value = "loaded";
      } catch {
        if (!disposed) state.value = "error";
      }
    };

    onMounted(() => {
      if (typeof IntersectionObserver === "undefined" || !coverTarget.value) {
        void loadCover();
        return;
      }

      observer = new IntersectionObserver(
        entries => {
          if (!entries.some(entry => entry.isIntersecting)) return;
          observer?.disconnect();
          void loadCover();
        },
        { rootMargin: "120px" }
      );
      observer.observe(coverTarget.value);
    });

    onBeforeUnmount(() => {
      disposed = true;
      observer?.disconnect();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    });

    return () => (
      <div ref={coverTarget} class="trip-cover" role="img" aria-label={`${props.tripName}封面`}>
        {source.value ? (
          <ElImage class="trip-cover-image" src={source.value} fit="cover" alt={`${props.tripName}封面`} />
        ) : (
          <div class="trip-cover-placeholder">
            {state.value === "error" ? "無封面" : state.value === "loading" ? "載入中" : "等待載入"}
          </div>
        )}
      </div>
    );
  }
});

const statusOptions: Array<{ label: string; value: AdminTrip.TripStatus; tagType: "success" | "info" }> = [
  { label: "已上架", value: "ACTIVE", tagType: "success" },
  { label: "已下架", value: "INACTIVE", tagType: "info" }
];

const statusLabel = (status: AdminTrip.TripStatus) => statusOptions.find(option => option.value === status)?.label ?? "—";
const statusTagType = (status: AdminTrip.TripStatus) => statusOptions.find(option => option.value === status)?.tagType ?? "info";
const priceFormatter = new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 });
const formatPrice = (price: number) => priceFormatter.format(price);
const formatDestination = (destination: AdminTrip.TravelDestination) => cityLabels.value[destination] ?? destination;

const getTableList = async (params: AdminTripListViewParams) => {
  const trips = await getAdminTripList();

  allTrips.value = trips;

  return {
    data: adaptAdminTripList(trips, params)
  };
};
const applyStatusFilter = (status: StatusFilter) => {
  quickStatus.value = status;

  if (!proTable.value) {
    return;
  }

  proTable.value.searchParam.status = status;

  proTable.value.search();
};
const openDetail = (row: AdminTrip.TripListResponse) => {
  detailDrawerRef.value?.acceptParams(row.id);
};

const openCreate = () => {
  editorDrawerRef.value?.openCreate();
};

const openEdit = (tripId: number) => {
  editorDrawerRef.value?.openEdit(tripId);
};

const refreshTable = () => proTable.value?.getTableList() ?? Promise.resolve();

// 等待搜尋元件更新 v-model，再沿用 ProTable 搜尋流程並回到第一頁。
const searchTrips = async () => {
  await nextTick();
  proTable.value?.search();
};
const handleStatusChange = (value: unknown) => {
  quickStatus.value = value === "ACTIVE" || value === "INACTIVE" ? value : "";

  void searchTrips();
};
const searchOnEnter = (event: KeyboardEvent) => {
  if (event.key !== "Enter" || event.isComposing) return;
  event.preventDefault();
  void searchTrips();
};

const toggleStatus = async (row: AdminTrip.TripListResponse) => {
  if (statusLoadingId.value !== null) return;

  const nextStatus: AdminTrip.TripStatus = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  const actionLabel = nextStatus === "ACTIVE" ? "上架" : "下架";

  try {
    await ElMessageBox.confirm(`是否${actionLabel}行程【${row.tripName || row.id}】？`, `${actionLabel}行程`, {
      type: "warning",
      confirmButtonText: actionLabel,
      cancelButtonText: "取消"
    });
    statusLoadingId.value = row.id;
    await updateAdminTripStatus(row.id, { status: nextStatus });
    ElMessage.success(`行程${actionLabel}成功`);
    await proTable.value?.getTableList();
  } catch {
    // 取消確認或 API 錯誤由流程自然結束，錯誤訊息由全域攔截器處理。
  } finally {
    statusLoadingId.value = null;
  }
};
const deleteTrip = async (row: AdminTrip.TripListResponse) => {
  if (statusLoadingId.value !== null) {
    return;
  }

  if (row.status === "ACTIVE") {
    ElMessage.warning("已上架行程不能永久刪除，請先下架");

    return;
  }

  try {
    await ElMessageBox.confirm(`確定要永久刪除「${row.tripName}」嗎？刪除後將無法復原。`, "永久刪除行程", {
      type: "error",
      confirmButtonText: "確定刪除",
      cancelButtonText: "取消",
      distinguishCancelAndClose: true
    });

    statusLoadingId.value = row.id;

    await deleteAdminTrip(row.id);

    ElMessage.success("行程已永久刪除");

    await proTable.value?.getTableList();
  } catch {
    // 使用者取消時不處理；
    // 後端拒絕刪除時，由全域攔截器顯示錯誤。
  } finally {
    statusLoadingId.value = null;
  }
};
const loadCityLabels = async () => {
  if (Object.keys(cityLabels.value).length) return;

  try {
    const options = await getAdminTripCities();
    cityLabels.value = Object.fromEntries(options.map(option => [option.value, option.label]));
  } catch {
    // 列表仍可使用 Backend 的 enum 值顯示，錯誤訊息由全域攔截器處理。
  }
};

const columns = reactive<ColumnProps<AdminTrip.TripListResponse>[]>([
  {
    prop: "cover",
    label: "封面",
    width: 96,
    align: "center",
    isSetting: false,
    render: ({ row }) => <TripCover tripId={row.id} tripName={row.tripName} />
  },
  {
    prop: "tripName",
    label: "行程名稱 / 摘要",
    minWidth: 280,
    showOverflowTooltip: false,
    search: {
      el: "input",
      key: "keyword",
      label: "行程關鍵字",
      props: {
        placeholder: "輸入行程名稱或摘要，按 Enter 搜尋",
        onKeydown: searchOnEnter,
        onClear: searchTrips
      }
    },
    render: ({ row }) => (
      <div class="trip-title-cell">
        <div class="trip-name" title={row.tripName}>
          {row.tripName || "—"}
        </div>
        <div class="trip-summary">{row.summary || "尚無摘要"}</div>
      </div>
    )
  },
  {
    prop: "destinations",
    label: "目的城市",
    minWidth: 190,
    showOverflowTooltip: false,
    render: ({ row }) => (
      <div class="destination-list">
        {row.destinations.length
          ? row.destinations.map(destination => (
              <ElTag key={destination} type="info" size="small">
                {formatDestination(destination)}
              </ElTag>
            ))
          : "—"}
      </div>
    )
  },
  {
    prop: "tripPrice",
    label: "售價",
    width: 140,
    align: "right",
    render: ({ row }) => formatPrice(row.tripPrice)
  },
  {
    prop: "status",
    label: "狀態",
    width: 110,
    enum: [
      { label: "全部行程", value: "" },
      { label: "已下架行程", value: "INACTIVE" },
      { label: "已上架行程", value: "ACTIVE" }
    ],
    search: {
      el: "select",
      label: "狀態",
      defaultValue: "",
      props: {
        placeholder: "全部行程",
        clearable: false,
        onChange: handleStatusChange
      }
    },
    render: ({ row }) => <ElTag type={statusTagType(row.status)}>{statusLabel(row.status)}</ElTag>
  },
  {
    prop: "operation",
    label: "操作",
    fixed: "right",
    width: 340,
    render: ({ row }) => (
      <>
        <ElButton type="primary" link icon={View} disabled={statusLoadingId.value !== null} onClick={() => openDetail(row)}>
          詳情
        </ElButton>
        <ElButton type="warning" link icon={EditPen} disabled={statusLoadingId.value !== null} onClick={() => openEdit(row.id)}>
          編輯
        </ElButton>
        <ElButton
          type={row.status === "ACTIVE" ? "danger" : "success"}
          link
          icon={row.status === "ACTIVE" ? Download : Upload}
          loading={statusLoadingId.value === row.id}
          disabled={statusLoadingId.value !== null}
          onClick={() => void toggleStatus(row)}
        >
          {row.status === "ACTIVE" ? "下架" : "上架"}
        </ElButton>
        <ElButton
          type="danger"
          link
          icon={Delete}
          loading={statusLoadingId.value === row.id}
          disabled={statusLoadingId.value !== null}
          onClick={() => void deleteTrip(row)}
        >
          刪除
        </ElButton>
      </>
    )
  }
]);

onMounted(() => {
  void loadCityLabels();
});

let hasActivatedOnce = false;
onActivated(() => {
  if (!hasActivatedOnce) {
    hasActivatedOnce = true;
    return;
  }

  void proTable.value?.getTableList();
});
</script>

<style scoped lang="scss">
.trip-table-header {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 14px;
  align-items: stretch;
}
.trip-header-primary {
  display: flex;
  justify-content: flex-start;
}
.status-filter-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.status-filter-list :deep(.el-button) {
  margin-left: 0;
}
.status-filter-list strong {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 20px;
  padding: 0 6px;
  margin-left: 6px;
  font-size: 12px;
  background: rgb(255 255 255 / 20%);
  border-radius: 999px;
}

@media (width <= 768px) {
  .trip-table-header {
    flex-direction: column;
    align-items: stretch;
  }
  .trip-table-header > .el-button {
    align-self: flex-start;
  }
}
.trip-manage {
  min-width: 0;
}
.trip-manage :deep(.el-table) {
  font-variant-numeric: tabular-nums;
}
.trip-cover {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 48px;
  margin: 0 auto;
  overflow: hidden;
  background: var(--el-fill-color-light);
  border-radius: var(--el-border-radius-base);
}
.trip-cover :deep(.el-image),
.trip-cover :deep(.el-image__inner) {
  display: block;
  width: 100%;
  height: 100%;
}
.trip-cover-placeholder {
  padding: 4px;
  font-size: var(--el-font-size-extra-small);
  line-height: 1.4;
  color: var(--el-text-color-secondary);
  text-align: center;
}
.trip-title-cell {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding-block: 4px;
}
.trip-name,
.trip-summary {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.trip-name {
  font-weight: 700;
  color: var(--el-text-color-primary);
}
.trip-summary {
  font-size: var(--el-font-size-small);
  color: var(--el-text-color-secondary);
}
.destination-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>
