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

  export interface AdminUserResponse {
    id: string;
    username: string;
    nickname: string;
    email: string;
    avatar: string | null;
    status: number;
    createdAt: string;
    updatedAt: string;
  }

  export interface AdminUserPageResponse {
    list: AdminUserResponse[];
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

  export interface AdminUserProfileUpdateParams {
    nickname: string;
    email: string;
    avatar?: File;
    removeAvatar: boolean;
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
