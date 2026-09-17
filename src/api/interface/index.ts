// 請求回應參數（不含 data）
export interface Result {
  code: string;
  msg: string;
}

// 請求回應參數（含 data）
export interface ResultData<T = any> extends Result {
  data: T;
}

// 分頁回應參數
export interface ResPage<T> {
  list: T[];
  pageNum: number;
  pageSize: number;
  total: number;
}

// 分頁請求參數
export interface ReqPage {
  pageNum: number;
  pageSize: number;
}

// 檔案上傳模組
export namespace Upload {
  export interface ResFileUrl {
    fileUrl: string;
  }
}

// 登入模組
export namespace Login {
  export interface ReqLoginForm {
    username: string;
    password: string;
  }
  export interface TokenResponse {
    accessToken: string;
    tokenType: string;
    expiresIn: number;
  }
  export interface CsrfResponse {
    headerName: string;
    parameterName: string;
    token: string;
  }
  export interface ResLogin {
    access_token: string;
  }
  export interface ResAuthButtons {
    [key: string]: string[];
  }
  export interface AdminSessionResponse {
    userId: string;
    username: string;
    roles: string[];
    permissions: string[];
  }
}

export namespace Profile {
  export interface AdminProfileResponse {
    userId: string;
    username: string;
    nickname: string | null;
    email: string | null;
    avatar: string | null;
    roles: string[];
  }

  export interface AdminProfileForm {
    nickname: string;
    email: string;
    avatar: string;
  }

  export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
  }
}

export namespace AdminUser {
  export type AdminUserSortField = "username" | "nickname" | "email" | "status" | "createdAt" | "updatedAt";
  export type AdminUserSortOrder = "asc" | "desc";

  export interface AdminUserSummaryResponse {
    id: string;
    username: string;
    nickname: string | null;
    email: string | null;
    avatar: string | null;
    status: number;
    createdAt: string;
    updatedAt: string;
  }

  export interface AdminUserDetailResponse extends AdminUserSummaryResponse {
    isEmailVerified: boolean;
    phone: string | null;
    birthday: string | null;
    bio: string | null;
  }

  export interface AdminUserPageResponse {
    list: AdminUserSummaryResponse[];
    total: number;
    pageNum: number;
    pageSize: number;
  }

  export interface AdminUserPageParams extends ReqPage {
    username?: string;
    nickname?: string;
    email?: string;
    status?: number;
    sortBy?: AdminUserSortField;
    sortOrder?: AdminUserSortOrder;
  }

  export interface AdminUpdateUserProfileParams {
    nickname?: string;
    email?: string;
    phone?: string;
    birthday?: string;
    avatar?: File;
    removeAvatar?: boolean;
  }
}

// 討論區管理模組
export namespace AdminForum {
  export type PostStatus = "ACTIVE" | "INACTIVE";

  export interface UserSummary {
    id: string;
    nickname: string | null;
    avatar: string | null;
  }

  export interface AdminPostResponse {
    id: number;
    title: string;
    content: string;
    viewCount: number;
    status: PostStatus;
    createAt: string | null;
    updateTime: string | null;
    categoryId: number | null;
    categoryName: string | null;
    author: UserSummary | null;
  }

  export interface AdminPostPageResponse {
    list: AdminPostResponse[];
    total: number;
    pageNum: number;
    pageSize: number;
  }

  export interface AdminPostPageParams extends ReqPage {
    keyword?: string;
    status?: PostStatus;
    categoryId?: number;
  }

  export interface Category {
    id: number;
    name: string;
  }

  export interface CategoryMutationParams {
    name: string;
  }

  export type ReportStatus = "PENDING" | "REVIEWED" | "REJECTED";
  export type ReportReason = "MISINFORMATION" | "SPAM" | "HARASSMENT" | "SCAM_OR_ILLEGAL" | "PRIVACY_VIOLATION" | "ADULT_CONTENT";
  export type ReportTargetType = "POST" | "COMMENT";
  export interface AdminReportParentPost {
    id: number;
    title: string;
  }
  export type AdminReportTarget = {
    id: number;
    content: string;
    author: UserSummary | null;
    createAt: string | null;
  } & ({ type: "POST"; title: string } | { type: "COMMENT"; parentPost: AdminReportParentPost | null });
  export interface AdminReportResponse {
    id: number;
    reason: ReportReason;
    status: ReportStatus;
    createAt: string | null;
    reporter: UserSummary | null;
    target: AdminReportTarget;
  }
  export interface AdminReportPageParams extends ReqPage {
    status?: ReportStatus;
    reason?: ReportReason;
    targetType?: ReportTargetType;
  }
  export interface AdminReportPageResponse extends ReqPage {
    list: AdminReportResponse[];
    total: number;
  }
  export interface AdminReportSummary {
    pending: number;
    reviewed: number;
    rejected: number;
  }
  export interface AdminReportStatusParams {
    status: "REVIEWED" | "REJECTED";
  }
}

// 行程管理模組
export namespace AdminTrip {
  export type DepartureCity = "高雄" | "台中" | "台北" | "桃園";
  export type TripStatus = "ACTIVE" | "INACTIVE";
  export type TravelDestination =
    | "TAIPEI"
    | "KAOHSIUNG"
    | "TOKYO"
    | "OSAKA"
    | "KYOTO"
    | "HOKKAIDO"
    | "SEOUL"
    | "BUSAN"
    | "BANGKOK"
    | "CHIANG_MAI"
    | "SINGAPORE"
    | "KUALA_LUMPUR"
    | "SHANGHAI"
    | "HONG_KONG"
    | "MACAU";
  export type TripBookingMode = "FIXED_DEPARTURE" | "FLEXIBLE_DATE";
  export type TripProductType = "PACKAGE_TOUR" | "PRIVATE_GROUP" | "CHARTER_TOUR";
  export type SpotTag = "ATTRACTION" | "FOOD" | "HOTEL" | "TRANSPORTATION" | "GUIDE" | "TICKET" | "SHOPPING" | "FREE_TIME";

  export interface TripListResponse {
    id: number;
    tripName: string;
    summary: string | null;
    tripPrice: number;
    destinations: TravelDestination[];
    status: TripStatus;
  }

  export interface TripDetailResponse extends TripListResponse {
    departureCity: DepartureCity | null;
    tripContent: string | null;
    bookingMode: TripBookingMode;
    productType: TripProductType;
  }

  export interface TripBaseRequest {
    departureCity: DepartureCity | null;
    tripName: string;
    summary: string | null;
    tripContent: string | null;
    tripPrice: number;
    destinations: TravelDestination[];
    bookingMode: TripBookingMode | null;
    productType: TripProductType | null;
  }

  export type TripCreateRequest = TripBaseRequest;
  export type TripUpdateRequest = TripBaseRequest;

  export interface TripCreateResponse {
    id: number;
  }

  export interface TripStatusRequest {
    status: TripStatus;
  }

  export interface CityOptionResponse {
    value: TravelDestination;
    label: string;
  }

  export interface TripPhotoResponse {
    id: number;
    sortOrder: number;
    imageUrl: string;
  }

  export interface TripPhotoOrderRequest {
    photoIds: number[];
  }

  export interface TripDayRequest {
    dayNumber: number;
    title: string;
    content: string | null;
    breakfast: string | null;
    lunch: string | null;
    dinner: string | null;
    hotel: string | null;
    transportation: string | null;
    extraFee: number | null;
    extraFeeDescription: string | null;
    note: string | null;
  }

  export interface TripDayResponse extends TripDayRequest {
    id: number;
    tripId: number;
    createdAt: string;
    updatedAt: string;
  }

  export interface TripSpotRequest {
    name: string;
    description: string | null;
    tag: SpotTag | null;
    sortOrder: number;
    location: string | null;
    startTime: string | null;
    endTime: string | null;
    includedInPrice: boolean | null;
    extraFee: number | null;
    note: string | null;
  }

  export interface TripSpotResponse extends TripSpotRequest {
    id: number;
    tripId: number;
    tripDayId: number;
    imageUrl: string | null;
    createdAt: string;
    updatedAt: string;
  }

  export interface TripDepartureRequest {
    startTime: string;
    endTime: string;
  }

  export interface TripDepartureResponse extends TripDepartureRequest {
    id: number;
    tripId: number;
  }
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  timestamp: string;
  status: number;
  code: string;
  message: string;
  path: string;
  fieldErrors: ApiFieldError[];
}

// 使用者管理模組
export namespace User {
  export interface ReqUserParams extends ReqPage {
    username: string;
    gender: number;
    idCard: string;
    email: string;
    address: string;
    createTime: string[];
    status: number;
  }
  export interface ResUserList {
    id: string;
    username: string;
    gender: number;
    user: { detail: { age: number } };
    idCard: string;
    email: string;
    address: string;
    createTime: string;
    status: number;
    avatar: string;
    photo: any[];
    children?: ResUserList[];
  }
  export interface ResStatus {
    userLabel: string;
    userValue: number;
  }
  export interface ResGender {
    genderLabel: string;
    genderValue: number;
  }
  export interface ResDepartment {
    id: string;
    name: string;
    children?: ResDepartment[];
  }
  export interface ResRole {
    id: string;
    name: string;
    children?: ResDepartment[];
  }
}
