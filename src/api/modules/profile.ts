import http from "@/api";
import { ADMIN_SERVICE } from "@/api/config/servicePort";
import { Profile } from "@/api/interface";

export const getAdminProfileApi = () => {
  return http.getDirect<Profile.AdminProfileResponse>(`${ADMIN_SERVICE}/profile`, undefined, {
    loading: false,
    suppressErrorMessage: true
  });
};

export const updateAdminProfileApi = (params: FormData) => {
  return http.patchDirect<Profile.AdminProfileResponse>(`${ADMIN_SERVICE}/profile`, params, {
    loading: false,
    suppressErrorMessage: true
  });
};

export const changeAdminPasswordApi = (params: Profile.ChangePasswordRequest) => {
  return http.patchDirect<void>(`${ADMIN_SERVICE}/profile/password`, params, {
    loading: false,
    suppressErrorMessage: true
  });
};
