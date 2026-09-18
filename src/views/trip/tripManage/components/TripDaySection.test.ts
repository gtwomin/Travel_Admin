import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderer, nextTick, ssrContextKey } from "vue";

const api = vi.hoisted(() => ({
  getAdminTripDays: vi.fn(),
  createAdminTripDay: vi.fn(),
  updateAdminTripDay: vi.fn(),
  deleteAdminTripDay: vi.fn()
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
  dayPhotos: Record<string, { file: File; url: string }>;
  hasUnsavedChanges: boolean;
  addDay: () => void;
  setDayPhoto: (key: string, file: File | null) => void;
  clearDayPhoto: (key: string) => void;
  setDayFormRef: (key: string, instance: unknown) => void;
  saveDay: (day: Day) => Promise<void>;
  discardChanges: (day: Day) => void;
}

let unmount: (() => void) | undefined;
const mount = async () => {
  const app = renderer.createApp({ ...TripDaySection, render: () => null }, { tripId: 1 });
  app.provide(ssrContextKey, {});
  app.mount({});
  unmount = () => app.unmount();
  await nextTick();
  return (app._instance as unknown as { setupState: State }).setupState;
};
const serverDays = [
  { id: 1, dayNumber: 1, title: "第一天" },
  { id: 2, dayNumber: 2, title: "第二天" }
];

beforeEach(() => {
  api.getAdminTripDays.mockResolvedValue(serverDays);
  api.createAdminTripDay.mockResolvedValue({ id: 3 });
  api.updateAdminTripDay.mockResolvedValue(undefined);
  let sequence = 0;
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => `blob:preview-${++sequence}`);
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
});
afterEach(() => {
  unmount?.();
  unmount = undefined;
});

describe("每日行程編輯狀態", () => {
  it("既有日期預設收合，新增一天自動展開", async () => {
    const state = await mount();
    expect(state.expandedDays).toEqual([]);
    state.addDay();
    expect(state.expandedDays).toEqual([state.days[2].key]);
    expect(state.days[2].dayNumber).toBe(3);
  });

  it("每一天只保留一張預覽，替換及移除時釋放 URL", async () => {
    const state = await mount();
    const file = new File(["photo"], "day.png", { type: "image/png" });
    state.setDayPhoto("day-1", file);
    const firstUrl = state.dayPhotos["day-1"].url;
    state.setDayPhoto("day-1", file);
    expect(Object.keys(state.dayPhotos)).toEqual(["day-1"]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(firstUrl);
    expect(state.hasUnsavedChanges).toBe(true);
    state.clearDayPhoto("day-1");
    expect(state.hasUnsavedChanges).toBe(false);
    expect(api.createAdminTripDay).not.toHaveBeenCalled();
    expect(api.updateAdminTripDay).not.toHaveBeenCalled();
  });

  it("儲存一天後保留另一個收合日期的未儲存文字及照片", async () => {
    const state = await mount();
    state.days[0].title = "修改第一天";
    state.days[1].title = "第二天未儲存草稿";
    state.setDayPhoto("day-2", new File(["photo"], "day.png", { type: "image/png" }));
    state.setDayFormRef("day-1", { validate: () => Promise.resolve(true) });
    api.getAdminTripDays.mockResolvedValueOnce([{ ...serverDays[0], title: "修改第一天" }, serverDays[1]]);
    await state.saveDay(state.days[0]);
    expect(state.days[1].title).toBe("第二天未儲存草稿");
    expect(state.dayPhotos["day-2"]).toBeDefined();
    expect(api.updateAdminTripDay.mock.calls[0][2]).not.toHaveProperty("photo");
    state.discardChanges(state.days[1]);
    expect(state.days[1].title).toBe("第二天");
    expect(state.hasUnsavedChanges).toBe(false);
  });

  it("新增成功後即使重新載入失敗，重試儲存也不重複新增", async () => {
    const state = await mount();
    state.addDay();
    const day = state.days[2];
    day.title = "第三天";
    state.setDayPhoto(day.key, new File(["photo"], "day.png", { type: "image/png" }));
    state.setDayFormRef(day.key, { validate: () => Promise.resolve(true) });
    api.getAdminTripDays.mockRejectedValueOnce(new Error("network"));
    await state.saveDay(day);
    expect(day.id).toBe(3);
    expect(state.dayPhotos["day-3"]).toBeDefined();
    state.setDayFormRef(day.key, { validate: () => Promise.resolve(true) });
    await state.saveDay(day);
    expect(api.createAdminTripDay).toHaveBeenCalledTimes(1);
    expect(api.updateAdminTripDay).toHaveBeenCalledTimes(1);
  });

  it("離開元件時釋放所有日期的照片預覽", async () => {
    const state = await mount();
    state.setDayPhoto("day-1", new File(["photo"], "day.png", { type: "image/png" }));
    const url = state.dayPhotos["day-1"].url;
    unmount?.();
    unmount = undefined;
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
  });
});
