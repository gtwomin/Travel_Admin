import http from "@/api";
import { ADMIN_SERVICE } from "@/api/config/servicePort";
import { AdminTrip } from "@/api/interface";

const toTripPayload = (params: AdminTrip.TripBaseRequest) => {
  const { tripName, summary, tripContent, tripPrice, destinations, bookingMode, productType, departureCity, durationDays } =
    params;

  return {
    tripName,
    summary,
    tripContent,
    tripPrice,
    destinations,
    bookingMode,
    productType,
    departureCity,
    durationDays
  };
};

const toTripDayPayload = (params: AdminTrip.TripDayRequest) => {
  const { dayNumber, title, content, breakfast, lunch, dinner, hotel, transportation, extraFee, extraFeeDescription, note } =
    params;

  return {
    dayNumber,
    title,
    content,
    breakfast,
    lunch,
    dinner,
    hotel,
    transportation,
    extraFee,
    extraFeeDescription,
    note
  };
};

const toTripSpotPayload = (params: AdminTrip.TripSpotRequest) => {
  const { name, description, tag, sortOrder, location, startTime, endTime, includedInPrice, extraFee, note } = params;

  return {
    name,
    description,
    tag,
    sortOrder,
    location,
    startTime,
    endTime,
    includedInPrice,
    extraFee,
    note
  };
};

const toTripDeparturePayload = (params: AdminTrip.TripDepartureRequest) => {
  const { startTime, endTime } = params;
  return { startTime, endTime };
};

export interface AdminTripListViewParams {
  keyword?: unknown;
  status?: unknown;
  pageNum?: unknown;
  pageSize?: unknown;
  [key: string]: unknown;
}

export interface AdminTripListViewResult {
  list: AdminTrip.TripListResponse[];
  total: number;
}

const normalizePositiveInteger = (value: unknown, fallback: number) => {
  const normalized = typeof value === "number" ? value : Number(value);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : fallback;
};

/**
 * @description 將完整行程陣列轉成 ProTable 使用的前端篩選與分頁資料。
 * 此 adapter 不會改變 getAdminTripList 的無參數 HTTP 契約。
 */
export const adaptAdminTripList = (
  trips: AdminTrip.TripListResponse[],
  params: AdminTripListViewParams = {}
): AdminTripListViewResult => {
  const keyword = typeof params.keyword === "string" ? params.keyword.trim().toLocaleLowerCase() : "";
  const status = params.status === "ACTIVE" || params.status === "INACTIVE" ? params.status : undefined;
  const filteredTrips = trips.filter(trip => {
    const searchableText = [trip.tripName, trip.summary ?? ""].join(" ").toLocaleLowerCase();
    return (!keyword || searchableText.includes(keyword)) && (!status || trip.status === status);
  });
  const pageNum = normalizePositiveInteger(params.pageNum, 1);
  const pageSize = normalizePositiveInteger(params.pageSize, 10);
  const startIndex = (pageNum - 1) * pageSize;

  return {
    list: filteredTrips.slice(startIndex, startIndex + pageSize),
    total: filteredTrips.length
  };
};

export const getAdminTripList = () =>
  http.getDirect<AdminTrip.TripListResponse[]>(`${ADMIN_SERVICE}/trips`, undefined, { loading: false });

export const getAdminTripDetail = async (tripId: number): Promise<AdminTrip.TripDetailResponse> => {
  // 相容目前後端 DTO 的 DepartureCity 命名與舊資料未回傳欄位的情況。
  const detail = await http.getDirect<AdminTrip.TripDetailResponse & { DepartureCity?: AdminTrip.DepartureCity | null }>(
    `${ADMIN_SERVICE}/trips/${tripId}`,
    undefined,
    { loading: false }
  );
  return { ...detail, departureCity: detail.departureCity ?? detail.DepartureCity ?? null };
};

export const createAdminTrip = (params: AdminTrip.TripCreateRequest) =>
  http.postDirect<AdminTrip.TripCreateResponse>(
    `${ADMIN_SERVICE}/trips`,
    { ...toTripPayload(params), status: "INACTIVE" },
    { loading: false }
  );

export const updateAdminTrip = (tripId: number, params: AdminTrip.TripUpdateRequest): Promise<void> =>
  http.put(`${ADMIN_SERVICE}/trips/${tripId}`, toTripPayload(params), { loading: false }).then(() => undefined);

export const updateAdminTripStatus = (tripId: number, params: AdminTrip.TripStatusRequest): Promise<void> =>
  http
    .patchDirect<void>(`${ADMIN_SERVICE}/trips/${tripId}/status`, { status: params.status }, { loading: false })
    .then(() => undefined);
export const deleteAdminTrip = (tripId: number): Promise<void> =>
  http
    .delete(`${ADMIN_SERVICE}/trips/${tripId}`, undefined, {
      loading: false
    })
    .then(() => undefined);
export const getAdminTripCities = () =>
  http.getDirect<AdminTrip.CityOptionResponse[]>(`${ADMIN_SERVICE}/trips/cities`, undefined, { loading: false });

export const uploadAdminTripPhoto = (tripId: number, file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  return http.postDirect<AdminTrip.TripPhotoResponse>(`${ADMIN_SERVICE}/trips/${tripId}/photos`, formData, {
    cancel: false
  });
};

export const getAdminTripPhotos = (tripId: number) =>
  http.getDirect<AdminTrip.TripPhotoResponse[]>(`${ADMIN_SERVICE}/trips/${tripId}/photos`, undefined, { loading: false });

export const getAdminTripCoverPhoto = (tripId: number) =>
  http.getDirect<Blob>(`${ADMIN_SERVICE}/trips/${tripId}/photos/cover`, undefined, {
    loading: false,
    responseType: "blob",
    suppressErrorMessage: true
  });

export const getAdminTripPhotoFile = (photoId: number) =>
  http.getDirect<Blob>(`${ADMIN_SERVICE}/trip-photos/${photoId}/file`, undefined, {
    loading: false,
    responseType: "blob"
  });

export const updateAdminTripPhotoOrder = (tripId: number, params: AdminTrip.TripPhotoOrderRequest): Promise<void> =>
  http
    .put(`${ADMIN_SERVICE}/trips/${tripId}/photos/order`, { photoIds: params.photoIds }, { loading: false })
    .then(() => undefined);

export const deleteAdminTripPhoto = (photoId: number): Promise<void> =>
  http.delete(`${ADMIN_SERVICE}/trip-photos/${photoId}`, undefined, { loading: false }).then(() => undefined);

export const createAdminTripDay = (tripId: number, params: AdminTrip.TripDayRequest) =>
  http.postDirect<AdminTrip.TripDayResponse>(`${ADMIN_SERVICE}/trips/${tripId}/days`, toTripDayPayload(params), {
    loading: false
  });

export const getAdminTripDays = (tripId: number) =>
  http.getDirect<AdminTrip.TripDayResponse[]>(`${ADMIN_SERVICE}/trips/${tripId}/days`, undefined, { loading: false });

export const getAdminTripDay = (tripId: number, dayId: number) =>
  http.getDirect<AdminTrip.TripDayResponse>(`${ADMIN_SERVICE}/trips/${tripId}/days/${dayId}`, undefined, {
    loading: false
  });

export const updateAdminTripDay = (tripId: number, dayId: number, params: AdminTrip.TripDayRequest): Promise<void> =>
  http.put(`${ADMIN_SERVICE}/trips/${tripId}/days/${dayId}`, toTripDayPayload(params), { loading: false }).then(() => undefined);

export const deleteAdminTripDay = (tripId: number, dayId: number): Promise<void> =>
  http.delete(`${ADMIN_SERVICE}/trips/${tripId}/days/${dayId}`, undefined, { loading: false }).then(() => undefined);
// 上傳或更換每日行程照片
export const uploadAdminTripDayPhoto = (tripId: number, dayId: number, file: File): Promise<void> => {
  const formData = new FormData();

  formData.append("file", file);

  return http
    .postDirect<void>(`${ADMIN_SERVICE}/trips/${tripId}/days/${dayId}/photo`, formData, {
      loading: false,
      cancel: false
    })
    .then(() => undefined);
};

// 取得每日行程照片
export const getAdminTripDayPhoto = (tripId: number, dayId: number) =>
  http.getDirect<Blob>(`${ADMIN_SERVICE}/trips/${tripId}/days/${dayId}/photo`, undefined, {
    loading: false,
    responseType: "blob",
    suppressErrorMessage: true
  });

// 刪除每日行程照片
export const deleteAdminTripDayPhoto = (tripId: number, dayId: number): Promise<void> =>
  http
    .delete(`${ADMIN_SERVICE}/trips/${tripId}/days/${dayId}/photo`, undefined, {
      loading: false
    })
    .then(() => undefined);
export const createAdminTripSpot = (tripId: number, tripDayId: number, params: AdminTrip.TripSpotRequest) =>
  http.postDirect<AdminTrip.TripSpotResponse>(
    `${ADMIN_SERVICE}/trips/${tripId}/days/${tripDayId}/spots`,
    toTripSpotPayload(params),
    { loading: false }
  );

export const getAdminTripSpots = (tripId: number, tripDayId: number) =>
  http.getDirect<AdminTrip.TripSpotResponse[]>(`${ADMIN_SERVICE}/trips/${tripId}/days/${tripDayId}/spots`, undefined, {
    loading: false
  });

export const createAdminTripDeparture = (tripId: number, params: AdminTrip.TripDepartureRequest) =>
  http.postDirect<AdminTrip.TripDepartureResponse>(
    `${ADMIN_SERVICE}/trips/${tripId}/departures`,
    toTripDeparturePayload(params),
    { loading: false }
  );

export const getAdminTripDepartures = (tripId: number) =>
  http.getDirect<AdminTrip.TripDepartureResponse[]>(`${ADMIN_SERVICE}/trips/${tripId}/departures`, undefined, {
    loading: false
  });
export const deleteAdminTripDeparture = (tripId: number, departureId: number): Promise<void> =>
  http
    .delete(`${ADMIN_SERVICE}/trips/${tripId}/departures/${departureId}`, undefined, {
      loading: false
    })
    .then(() => undefined);
