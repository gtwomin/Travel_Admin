import http from "@/api";
import { Profile } from "@/api/interface";

export const getAdminProfileApi = () => {
  return http.getDirect<Profile.AdminProfileResponse>("/api/v1/admin/profile", undefined, {
    loading: false,
    suppressErrorMessage: true
  });
};

export const updateAdminProfileApi = (params: FormData) => {
  return http.patchDirect<Profile.AdminProfileResponse>("/api/v1/admin/profile", params, {
    loading: false,
    suppressErrorMessage: true
  });
};

export const changeAdminPasswordApi = (params: Profile.ChangePasswordRequest) => {
  return http.patchDirect<void>("/api/v1/admin/profile/password", params, {
    loading: false,
    suppressErrorMessage: true
  });
};
