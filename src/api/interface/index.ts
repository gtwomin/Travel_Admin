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

// 訂單管理模組
export namespace AdminOrder {
  export type AdminOrderBusinessStatus =
    | "PENDING_PAYMENT"
    | "UPCOMING"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED"
    | "EXPIRED"
    | "PAID_PENDING_CONFIRMATION"
    | "CANCELLATION_IN_PROGRESS";

  export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED" | "PARTIALLY_REFUNDED";

  export type OrderStatus =
    "PENDING_PAYMENT" | "PAID" | "CONFIRMED" | "CANCELLATION_REQUESTED" | "CANCELLED" | "COMPLETED" | "EXPIRED";

  export type CancellationStatus = "PENDING" | "APPROVED" | "REJECTED" | "REFUNDING" | "REFUNDED" | "REFUND_FAILED";

  export type AdminOrderSortField = "createdAt" | "departureAt" | "totalAmount";
  export type AdminOrderSortOrder = "asc" | "desc";

  export interface AdminOrderMemberSummary {
    userId: string;
    nickname: string | null;
    email: string | null;
  }

  export interface AdminOrderMemberDetail {
    userId: string;
    username: string;
    nickname: string | null;
    email: string | null;
  }

  export interface AdminOrderContact {
    contactName: string;
    contactEmail: string;
    countryCode: string;
    contactPhone: string;
    specialRequest: string | null;
  }

  export type OrderItemStatus =
    "PENDING_PAYMENT" | "PAID" | "CONFIRMED" | "CANCELLATION_REQUESTED" | "CANCELLED" | "COMPLETED" | "EXPIRED";

  export type PaymentMethod = "CREDIT_CARD" | "BANK_TRANSFER" | "LINE_PAY";

  export interface AdminOrderDetailItem {
    orderItemId: number;
    orderItemStatus: OrderItemStatus;
    tripId: number;
    tripName: string;
    departureId: number;
    startTime: string;
    endTime: string;
    quantity: number;
    unitPrice: number | string;
    subtotal: number | string;
    note: string | null;
    destinations: string[];
  }

  export interface AdminOrderPayment {
    paymentId: number;
    amount: number | string;
    paymentMethod: PaymentMethod;
    status: PaymentStatus;
    merchantTradeNo: string;
    transactionId: string | null;
    createdAt: string;
    paidAt: string | null;
  }

  export interface AdminOrderPendingCancellation {
    cancellationId: number;
    status: CancellationStatus;
    reason: string;
    requestedAt: string;
  }

  export interface AdminOrderCancellationResponse {
    id: number;
    orderId: number;
    orderNumber: string;
    reason: string;
    status: CancellationStatus;
    adminNote: string | null;
    refundAmount: number | string | null;
    refundId: number | null;
    requestedAt: string;
    reviewedAt: string | null;
    updatedAt: string;
  }

  export interface AdminCancellationApproveParams {
    adminNote: string | null;
  }

  export interface AdminCancellationRejectParams {
    adminNote: string;
  }

  export interface AdminOrderSummaryResponse {
    orderId: number;
    orderNumber: string;
    member: AdminOrderMemberSummary;
    primaryTripName: string | null;
    itemCount: number;
    earliestDepartureAt: string | null;
    latestEndTime: string | null;
    totalQuantity: number;
    totalAmount: number | string;
    orderStatus: OrderStatus;
    displayStatus: AdminOrderBusinessStatus;
    paymentStatus: PaymentStatus | null;
    createdAt: string;
  }

  export interface AdminOrderDetailResponse {
    orderId: number;
    orderNumber: string;
    orderStatus: OrderStatus;
    displayStatus: AdminOrderBusinessStatus;
    totalAmount: number | string;
    createdAt: string;
    member: AdminOrderMemberDetail;
    contact: AdminOrderContact;
    items: AdminOrderDetailItem[];
    payments: AdminOrderPayment[];
    pendingCancellation: AdminOrderPendingCancellation | null;
  }

  export type AdminOrderPageResponse = ResPage<AdminOrderSummaryResponse>;

  export interface AdminOrderPageParams extends ReqPage {
    userId?: string;
    keyword?: string;
    status?: AdminOrderBusinessStatus;
    paymentStatus?: PaymentStatus;
    createdRange?: [string, string];
    departureRange?: [string, string];
    sortBy?: AdminOrderSortField;
    sortOrder?: AdminOrderSortOrder;
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
