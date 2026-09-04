import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

const TAIPEI_TIMEZONE = "Asia/Taipei";

/** 將後端 UTC 時間格式化為臺灣時間。 */
export const formatTaipeiDateTime = (value?: string | null) => {
  if (!value) return "—";

  return dayjs.utc(value).tz(TAIPEI_TIMEZONE).format("YYYY-MM-DD HH:mm:ss");
};

/** 取得臺北時區的當日日期，供生日等日期欄位限制使用。 */
export const getTaipeiToday = () => dayjs().tz(TAIPEI_TIMEZONE).format("YYYY-MM-DD");
