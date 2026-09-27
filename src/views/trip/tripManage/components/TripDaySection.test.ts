import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderer, nextTick, ssrContextKey } from "vue";

const api = vi.hoisted(() => ({
  getAdminTripDays: vi.fn(),
  createAdminTripDay: vi.fn(),
  updateAdminTripDay: vi.fn(),
  createAdminTripSpot: vi.fn(),
  deleteAdminTripSpot: vi.fn(),
  getAdminTripSpotPhoto: vi.fn(),
  getAdminTripSpots: vi.fn(),
  updateAdminTripSpot: vi.fn(),
  uploadAdminTripSpotPhoto: vi.fn()
}));
vi.mock("@/api/modules/trip", () => api);
vi.mock("@/components/Upload/Img.vue", () => ({ default: {} }));
vi.mock("element-plus", () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn() },
  ElMessageBox: { confirm: vi.fn().mockResolvedValue(undefined) }
}));

import TripDaySection from "./TripDaySection.vue";

// Node renderer runs the real component setup/lifecycle without requiring a browser.
const renderer = createRenderer<object, object>({
  createElement: () => ({}),
  createText: () => ({}),
  createComment: () => ({}),
  insert: () => undefined,
  remove: () => undefined,
  setText: () => undefined,
  setElementText: () => undefined,
  patchProp: () => undefined,
  parentNode: () => null,
  nextSibling: () => null
});

interface Day {
  key: string;
  id: number | null;
  title: string;
  dayNumber: number;
}
interface State {
  days: Day[];
  expandedDays: string[];
  loading: boolean;
  spotPhotoFile: File | null;
  spotPhotoPreview: string;
  hasUnsavedChanges: boolean;
  setSpotPhoto: (file: File | null) => void;
  clearSpotPhoto: () => void;
  setDayFormRef: (key: string, instance: unknown) => void;
  saveDay: (day: Day) => Promise<void>;
  discardChanges: (day: Day) => void;
}

let unmount: (() => void) | undefined;
const mount = async (durationDays = 2) => {
  const app = renderer.createApp({ ...TripDaySection, render: () => null }, { tripId: 1, durationDays });
  app.provide(ssrContextKey, {});
  app.mount({});
  unmount = () => app.unmount();
  await nextTick();
  await Promise.resolve();
  await nextTick();
  const state = (app._instance as unknown as { setupState: State }).setupState;
  await vi.waitFor(() => expect(state.loading).toBe(false));
  return state;
};
const serverDays = [
  { id: 1, dayNumber: 1, title: "第一天" },
  { id: 2, dayNumber: 2, title: "第二天" }
];

beforeEach(() => {
  vi.clearAllMocks();
  api.getAdminTripDays.mockResolvedValue(serverDays);
  api.getAdminTripSpots.mockResolvedValue([]);
  api.getAdminTripSpotPhoto.mockRejectedValue(new Error("not found"));
  api.createAdminTripDay.mockResolvedValue({ id: 3 });
  api.createAdminTripSpot.mockResolvedValue({ id: 10 });
  api.updateAdminTripDay.mockResolvedValue(undefined);
  api.updateAdminTripSpot.mockResolvedValue(undefined);
  api.deleteAdminTripSpot.mockResolvedValue(undefined);
  api.uploadAdminTripSpotPhoto.mockResolvedValue(undefined);
  let sequence = 0;
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => `blob:preview-${++sequence}`);
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
});
afterEach(() => {
  unmount?.();
  unmount = undefined;
  vi.restoreAllMocks();
});

describe("每日行程編輯狀態", () => {
  it("依行程天數補齊未建立日期，既有日期預設收合", async () => {
    const state = await mount(3);
    expect(state.expandedDays).toEqual([]);
    expect(state.days).toHaveLength(3);
    expect(state.days[2].id).toBeNull();
    expect(state.days[2].dayNumber).toBe(3);
  });

  it("替換或清除景點照片時釋放舊的預覽 URL", async () => {
    const state = await mount();
    const firstFile = new File(["first"], "first.png", { type: "image/png" });
    const secondFile = new File(["second"], "second.png", { type: "image/png" });

    state.setSpotPhoto(firstFile);
    const firstUrl = state.spotPhotoPreview;
    state.setSpotPhoto(secondFile);
    const secondUrl = state.spotPhotoPreview;

    expect(state.spotPhotoFile).toBe(secondFile);
    expect(secondUrl).not.toBe(firstUrl);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(firstUrl);

    state.clearSpotPhoto();
    expect(state.spotPhotoFile).toBeNull();
    expect(state.spotPhotoPreview).toBe("");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(secondUrl);
  });

  it("儲存一天後保留另一個收合日期的未儲存文字", async () => {
    const state = await mount();
    state.days[0].title = "修改第一天";
    state.days[1].title = "第二天未儲存草稿";
    state.setDayFormRef("day-1", { validate: () => Promise.resolve(true) });
    api.getAdminTripDays.mockResolvedValueOnce([{ ...serverDays[0], title: "修改第一天" }, serverDays[1]]);

    await state.saveDay(state.days[0]);

    expect(state.days[1].title).toBe("第二天未儲存草稿");
    expect(api.updateAdminTripDay).toHaveBeenCalledTimes(1);
    state.discardChanges(state.days[1]);
    expect(state.days[1].title).toBe("第二天");
    expect(state.hasUnsavedChanges).toBe(false);
  });

  it("新增成功後即使重新載入失敗，重試儲存也不重複新增", async () => {
    const state = await mount(3);
    const day = state.days[2];
    day.title = "第三天";
    state.setDayFormRef(day.key, { validate: () => Promise.resolve(true) });
    api.getAdminTripDays.mockRejectedValueOnce(new Error("network"));

    await state.saveDay(day);

    expect(day.id).toBe(3);
    state.setDayFormRef(day.key, { validate: () => Promise.resolve(true) });
    await state.saveDay(day);

    expect(api.createAdminTripDay).toHaveBeenCalledTimes(1);
    expect(api.updateAdminTripDay).toHaveBeenCalledTimes(1);
  });

  it("離開元件時釋放尚未上傳的景點照片預覽", async () => {
    const state = await mount();
    state.setSpotPhoto(new File(["photo"], "spot.png", { type: "image/png" }));
    const url = state.spotPhotoPreview;

    unmount?.();
    unmount = undefined;

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
  });
});
