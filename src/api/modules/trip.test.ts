import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  getDirect: vi.fn(),
  postDirect: vi.fn(),
  patchDirect: vi.fn(),
  put: vi.fn(),
  delete: vi.fn()
}));

vi.mock("@/api", () => ({ default: api }));
vi.mock("@/api/config/servicePort", () => ({ ADMIN_SERVICE: "/api/v1/admin" }));

import {
  adaptAdminTripList,
  createAdminTrip,
  createAdminTripDay,
  createAdminTripDeparture,
  createAdminTripSpot,
  deleteAdminTripDay,
  deleteAdminTripPhoto,
  getAdminTripCities,
  getAdminTripCoverPhoto,
  getAdminTripDay,
  getAdminTripDays,
  getAdminTripDetail,
  getAdminTripDepartures,
  getAdminTripList,
  getAdminTripPhotoFile,
  getAdminTripPhotos,
  getAdminTripSpots,
  updateAdminTrip,
  updateAdminTripDay,
  updateAdminTripPhotoOrder,
  updateAdminTripStatus,
  uploadAdminTripPhoto
} from "@/api/modules/trip";
import { AdminTrip } from "@/api/interface";

const tripRequest: AdminTrip.TripBaseRequest = {
  departureCity: "高雄",
  tripName: "北海道雪祭五日",
  summary: "冬季行程",
  tripContent: "行程介紹",
  tripPrice: 48800,
  destinations: ["HOKKAIDO"],
  bookingMode: "FIXED_DEPARTURE",
  productType: "PACKAGE_TOUR"
};

const dayRequest: AdminTrip.TripDayRequest = {
  dayNumber: 1,
  title: "抵達北海道",
  content: "抵達後前往飯店",
  breakfast: "自理",
  lunch: "拉麵",
  dinner: "海鮮",
  hotel: "札幌飯店",
  transportation: "巴士",
  extraFee: 0,
  extraFeeDescription: null,
  note: null
};

const spotRequest: AdminTrip.TripSpotRequest = {
  name: "大通公園",
  description: "雪祭會場",
  tag: "ATTRACTION",
  sortOrder: 1,
  location: "札幌",
  startTime: "09:00:00",
  endTime: "11:00:00",
  includedInPrice: true,
  extraFee: 0,
  note: null
};

beforeEach(() => {
  vi.clearAllMocks();
  api.getDirect.mockResolvedValue([]);
  api.postDirect.mockResolvedValue({ id: 101 });
  api.patchDirect.mockResolvedValue(undefined);
  api.put.mockResolvedValue(undefined);
  api.delete.mockResolvedValue(undefined);
});

describe("行程管理 API 契約", () => {
  it.each([
    [{ departureCity: "桃園" }, "桃園"],
    [{ DepartureCity: "台中" }, "台中"],
    [{ departureCity: "台北", DepartureCity: "高雄" }, "台北"],
    [{ departureCity: null }, null],
    [{}, null]
  ])("詳情正規化出發城市欄位 %j", async (response, expected) => {
    api.getDirect.mockResolvedValueOnce(response);
    const detail = await getAdminTripDetail(101);
    expect(detail.departureCity).toBe(expected);
  });

  it("列表、詳情與縣市選項不得送出不存在的查詢參數", async () => {
    await getAdminTripList();
    await getAdminTripDetail(101);
    await getAdminTripCities();

    expect(api.getDirect).toHaveBeenNthCalledWith(1, "/api/v1/admin/trips", undefined, { loading: false });
    expect(api.getDirect).toHaveBeenNthCalledWith(2, "/api/v1/admin/trips/101", undefined, { loading: false });
    expect(api.getDirect).toHaveBeenNthCalledWith(3, "/api/v1/admin/trips/cities", undefined, { loading: false });
  });

  it("新增行程固定送出 INACTIVE，且排除未列入契約的欄位", async () => {
    const params = {
      ...tripRequest,
      status: "ACTIVE",
      comment: "不支援",
      createdAt: "2026-01-01T00:00:00Z"
    } as unknown as AdminTrip.TripCreateRequest;

    await createAdminTrip(params);

    expect(api.postDirect).toHaveBeenCalledWith(
      "/api/v1/admin/trips",
      { ...tripRequest, status: "INACTIVE" },
      { loading: false }
    );
    expect(api.postDirect.mock.calls[0][1]).not.toHaveProperty("comment");
    expect(api.postDirect.mock.calls[0][1]).not.toHaveProperty("createdAt");
  });

  it("修改行程不得送出 status 或其他唯讀欄位", async () => {
    const params = {
      ...tripRequest,
      status: "ACTIVE",
      id: 101,
      updatedAt: "2026-01-01T00:00:00Z"
    } as unknown as AdminTrip.TripUpdateRequest;

    await updateAdminTrip(101, params);

    expect(api.put).toHaveBeenCalledWith("/api/v1/admin/trips/101", tripRequest, { loading: false });
    expect(api.put.mock.calls[0][1]).not.toHaveProperty("status");
    expect(api.put.mock.calls[0][1]).not.toHaveProperty("id");
  });

  it("上下架只送出 ACTIVE 或 INACTIVE 狀態", async () => {
    const params = { status: "ACTIVE", comment: "不支援" } as unknown as AdminTrip.TripStatusRequest;

    await updateAdminTripStatus(101, params);

    expect(api.patchDirect).toHaveBeenCalledWith("/api/v1/admin/trips/101/status", { status: "ACTIVE" }, { loading: false });
  });
});

describe("行程列表前端 adapter", () => {
  const trips: AdminTrip.TripListResponse[] = [
    {
      id: 1,
      tripName: "台北城市漫遊",
      summary: "台北市區行程",
      tripPrice: 12800,
      destinations: ["TAIPEI"],
      status: "ACTIVE"
    },
    {
      id: 2,
      tripName: "北海道雪祭五日",
      summary: "冬季雪祭行程",
      tripPrice: 48800,
      destinations: ["HOKKAIDO"],
      status: "INACTIVE"
    },
    {
      id: 3,
      tripName: "北海道溫泉七日",
      summary: "北海道深度旅遊",
      tripPrice: 66800,
      destinations: ["HOKKAIDO"],
      status: "INACTIVE"
    }
  ];

  it("只在前端套用關鍵字、狀態與分頁，並忽略未知查詢欄位", () => {
    expect(
      adaptAdminTripList(trips, {
        keyword: "雪祭",
        status: "INACTIVE",
        pageNum: 1,
        pageSize: 10,
        sortBy: "createdAt",
        sortOrder: "desc"
      })
    ).toEqual({ list: [trips[1]], total: 1 });
  });

  it("回傳符合 ProTable 的分頁結果", () => {
    expect(adaptAdminTripList(trips, { pageNum: 2, pageSize: 2 })).toEqual({ list: [trips[2]], total: 3 });
  });

  it("不使用目的縣市作為關鍵字搜尋欄位", () => {
    expect(adaptAdminTripList(trips, { keyword: "HOKKAIDO" })).toEqual({ list: [], total: 0 });
  });
});

describe("行程照片 API 契約", () => {
  it("上傳照片只使用 file multipart 欄位", async () => {
    const file = new File(["image"], "cover.png", { type: "image/png" });

    await uploadAdminTripPhoto(101, file);

    expect(api.postDirect).toHaveBeenCalledWith("/api/v1/admin/trips/101/photos", expect.any(FormData), { cancel: false });
    const formData = api.postDirect.mock.calls[0][1] as FormData;
    const uploadedFile = formData.get("file") as File;
    expect(uploadedFile.name).toBe("cover.png");
    expect(uploadedFile.type).toBe("image/png");
    expect(formData.get("comment")).toBeNull();
  });

  it("照片查詢、二進位讀取、排序與刪除使用正式 endpoints", async () => {
    await getAdminTripPhotos(101);
    await getAdminTripCoverPhoto(101);
    await getAdminTripPhotoFile(7);
    await updateAdminTripPhotoOrder(101, { photoIds: [7, 8] });
    await deleteAdminTripPhoto(7);

    expect(api.getDirect).toHaveBeenNthCalledWith(1, "/api/v1/admin/trips/101/photos", undefined, { loading: false });
    expect(api.getDirect).toHaveBeenNthCalledWith(2, "/api/v1/admin/trips/101/photos/cover", undefined, {
      loading: false,
      responseType: "blob",
      suppressErrorMessage: true
    });
    expect(api.getDirect).toHaveBeenNthCalledWith(3, "/api/v1/admin/trip-photos/7/file", undefined, {
      loading: false,
      responseType: "blob"
    });
    expect(api.put).toHaveBeenCalledWith("/api/v1/admin/trips/101/photos/order", { photoIds: [7, 8] }, { loading: false });
    expect(api.delete).toHaveBeenCalledWith("/api/v1/admin/trip-photos/7", undefined, { loading: false });
  });
});

describe("每日行程 API 契約", () => {
  it("每日行程新增與修改只送出正式 DTO 欄位", async () => {
    const params = {
      ...dayRequest,
      id: 11,
      tripId: 101,
      createdAt: "2026-01-01T00:00:00Z"
    } as unknown as AdminTrip.TripDayRequest;

    await createAdminTripDay(101, params);
    await updateAdminTripDay(101, 11, params);

    expect(api.postDirect).toHaveBeenCalledWith("/api/v1/admin/trips/101/days", dayRequest, { loading: false });
    expect(api.put).toHaveBeenCalledWith("/api/v1/admin/trips/101/days/11", dayRequest, { loading: false });
    expect(api.postDirect.mock.calls[0][1]).not.toHaveProperty("id");
    expect(api.put.mock.calls[0][1]).not.toHaveProperty("createdAt");
  });

  it("每日行程完整 CRUD 使用正式 endpoints", async () => {
    await getAdminTripDays(101);
    await getAdminTripDay(101, 11);
    await deleteAdminTripDay(101, 11);

    expect(api.getDirect).toHaveBeenNthCalledWith(1, "/api/v1/admin/trips/101/days", undefined, { loading: false });
    expect(api.getDirect).toHaveBeenNthCalledWith(2, "/api/v1/admin/trips/101/days/11", undefined, { loading: false });
    expect(api.delete).toHaveBeenCalledWith("/api/v1/admin/trips/101/days/11", undefined, { loading: false });
  });
});

describe("每日景點 API 契約", () => {
  it("景點新增只送出目前支援的 request DTO 欄位", async () => {
    const params = {
      ...spotRequest,
      id: 21,
      imageUrl: "/not-supported",
      createdAt: "2026-01-01T00:00:00Z"
    } as unknown as AdminTrip.TripSpotRequest;

    await createAdminTripSpot(101, 11, params);
    await getAdminTripSpots(101, 11);

    expect(api.postDirect).toHaveBeenCalledWith("/api/v1/admin/trips/101/days/11/spots", spotRequest, { loading: false });
    expect(api.postDirect.mock.calls[0][1]).not.toHaveProperty("imageUrl");
    expect(api.getDirect).toHaveBeenCalledWith("/api/v1/admin/trips/101/days/11/spots", undefined, { loading: false });
  });
});

describe("出發梯次 API 契約", () => {
  it("新增梯次只送出 startTime 與 endTime", async () => {
    const params = {
      startTime: "2026-10-01T08:00:00Z",
      endTime: "2026-10-03T18:00:00Z",
      capacity: 20,
      price: 50000
    } as unknown as AdminTrip.TripDepartureRequest;

    await createAdminTripDeparture(101, params);
    await getAdminTripDepartures(101);

    expect(api.postDirect).toHaveBeenCalledWith(
      "/api/v1/admin/trips/101/departures",
      { startTime: params.startTime, endTime: params.endTime },
      { loading: false }
    );
    expect(api.getDirect).toHaveBeenCalledWith("/api/v1/admin/trips/101/departures", undefined, { loading: false });
  });
});
