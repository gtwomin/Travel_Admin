import type { AdminTrip } from "@/api/interface";

export type TripPresetCountryCode = "TW" | "JP" | "KR" | "TH" | "SG" | "MY" | "CN" | "HK" | "MO";

export interface TripPresetSpot {
  name: string;
  description: string;
  tag: AdminTrip.SpotTag;
  location: string;
  startTime: string | null;
  endTime: string | null;
  includedInPrice: boolean;
  extraFee: number;
  note: string;
}

export interface TripPresetDay {
  dayNumber: number;
  title: string;
  content: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  hotel: string;
  transportation: string;
  extraFee: number;
  extraFeeDescription: string;
  note: string;
  spots: TripPresetSpot[];
}

export interface TripPreset {
  code: string;
  countryCode: TripPresetCountryCode | "GENERIC";
  label: string;
  tripName: string;
  summary: string;
  tripContent: string;
  tripPrice: number;
  destinations: AdminTrip.TravelDestination[];
  departureCity: AdminTrip.DepartureCity;
  bookingMode: AdminTrip.TripBookingMode;
  productType: AdminTrip.TripProductType;
  durationDays: number;
  days: TripPresetDay[];
}

interface PresetSource {
  code: string;
  countryCode: TripPresetCountryCode;
  countryName: string;
  cityName: string;
  destination: AdminTrip.TravelDestination;
  price: number;
  highlights: [string, string, string];
}

const createSpot = (name: string, location: string, startTime: string, description: string): TripPresetSpot => ({
  name,
  description,
  tag: "ATTRACTION",
  location,
  startTime,
  endTime: null,
  includedInPrice: true,
  extraFee: 0,
  note: "實際參觀順序可能依交通與現場狀況調整。"
});

const createPreset = (source: PresetSource): TripPreset => ({
  code: source.code,
  countryCode: source.countryCode,
  label: `${source.cityName}經典四天三夜`,
  tripName: `${source.cityName}經典四天三夜`,
  summary: `${source.highlights.join("、")}精選行程`,
  tripContent: `走訪${source.countryName}${source.cityName}代表性景點，結合城市文化、在地美食與自由活動時間，適合第一次造訪的旅客。`,
  tripPrice: source.price,
  destinations: [source.destination],
  departureCity: "台北",
  bookingMode: "FIXED_DEPARTURE",
  productType: "PACKAGE_TOUR",
  durationDays: 4,
  days: [
    {
      dayNumber: 1,
      title: `抵達${source.cityName}・城市初體驗`,
      content: `抵達後由專車接送，前往${source.highlights[0]}及周邊街區，感受城市風貌。`,
      breakfast: "敬請自理",
      lunch: "機上餐食或敬請自理",
      dinner: "在地特色料理",
      hotel: `${source.cityName}市區飯店或同級`,
      transportation: "機場接送、專車",
      extraFee: 0,
      extraFeeDescription: "",
      note: "抵達時間將依實際航班調整。",
      spots: [createSpot(source.highlights[0], source.cityName, "15:00:00", `造訪${source.highlights[0]}，認識當地城市特色。`)]
    },
    {
      dayNumber: 2,
      title: `${source.cityName}經典景點巡禮`,
      content: `安排${source.highlights[1]}與周邊熱門景點，晚上保留自由探索時間。`,
      breakfast: "飯店早餐",
      lunch: "當地風味餐",
      dinner: "敬請自理",
      hotel: `${source.cityName}市區飯店或同級`,
      transportation: "專車、大眾運輸",
      extraFee: 0,
      extraFeeDescription: "",
      note: "請穿著方便步行的鞋子。",
      spots: [createSpot(source.highlights[1], source.cityName, "10:00:00", `深入體驗${source.highlights[1]}的景觀與文化。`)]
    },
    {
      dayNumber: 3,
      title: `文化體驗・${source.highlights[2]}`,
      content: `前往${source.highlights[2]}，午後安排購物或自由活動。`,
      breakfast: "飯店早餐",
      lunch: "特色料理",
      dinner: "敬請自理",
      hotel: `${source.cityName}市區飯店或同級`,
      transportation: "專車",
      extraFee: 0,
      extraFeeDescription: "",
      note: "自由活動期間請留意集合時間。",
      spots: [
        createSpot(source.highlights[2], source.cityName, "09:30:00", `走訪${source.highlights[2]}，體驗具代表性的在地風情。`)
      ]
    },
    {
      dayNumber: 4,
      title: `${source.cityName}自由活動・返程`,
      content: "早餐後保留短暫自由活動時間，依航班時間前往機場。",
      breakfast: "飯店早餐",
      lunch: "敬請自理",
      dinner: "機上餐食或敬請自理",
      hotel: "",
      transportation: "專車、機場接送",
      extraFee: 0,
      extraFeeDescription: "",
      note: "請提前整理行李並確認護照與隨身物品。",
      spots: []
    }
  ]
});

export const tripPresets: TripPreset[] = [
  createPreset({
    code: "TW_TAIPEI_4D",
    countryCode: "TW",
    countryName: "台灣",
    cityName: "台北",
    destination: "TAIPEI",
    price: 16800,
    highlights: ["台北101", "故宮博物院", "九份老街"]
  }),
  createPreset({
    code: "JP_TOKYO_4D",
    countryCode: "JP",
    countryName: "日本",
    cityName: "東京",
    destination: "TOKYO",
    price: 39800,
    highlights: ["淺草寺", "東京晴空塔", "台場"]
  }),
  createPreset({
    code: "KR_SEOUL_4D",
    countryCode: "KR",
    countryName: "韓國",
    cityName: "首爾",
    destination: "SEOUL",
    price: 29800,
    highlights: ["景福宮", "北村韓屋村", "南山首爾塔"]
  }),
  createPreset({
    code: "TH_BANGKOK_4D",
    countryCode: "TH",
    countryName: "泰國",
    cityName: "曼谷",
    destination: "BANGKOK",
    price: 26800,
    highlights: ["大皇宮", "鄭王廟", "水上市場"]
  }),
  createPreset({
    code: "SG_CITY_4D",
    countryCode: "SG",
    countryName: "新加坡",
    cityName: "新加坡",
    destination: "SINGAPORE",
    price: 31800,
    highlights: ["濱海灣花園", "魚尾獅公園", "聖淘沙"]
  }),
  createPreset({
    code: "MY_KL_4D",
    countryCode: "MY",
    countryName: "馬來西亞",
    cityName: "吉隆坡",
    destination: "KUALA_LUMPUR",
    price: 27800,
    highlights: ["雙子星塔", "獨立廣場", "黑風洞"]
  }),
  createPreset({
    code: "CN_SHANGHAI_4D",
    countryCode: "CN",
    countryName: "中國",
    cityName: "上海",
    destination: "SHANGHAI",
    price: 28800,
    highlights: ["外灘", "豫園", "陸家嘴"]
  }),
  createPreset({
    code: "HK_CITY_4D",
    countryCode: "HK",
    countryName: "香港",
    cityName: "香港",
    destination: "HONG_KONG",
    price: 28800,
    highlights: ["維多利亞港", "太平山", "大嶼山"]
  }),
  createPreset({
    code: "MO_CITY_4D",
    countryCode: "MO",
    countryName: "澳門",
    cityName: "澳門",
    destination: "MACAU",
    price: 25800,
    highlights: ["大三巴牌坊", "議事亭前地", "路氹金光大道"]
  })
];

export const genericTripPreset: TripPreset = createPreset({
  code: "GENERIC_CITY_4D",
  countryCode: "TW",
  countryName: "目的地",
  cityName: "城市精選",
  destination: "TAIPEI",
  price: 25000,
  highlights: ["城市地標", "文化景點", "特色街區"]
});

genericTripPreset.countryCode = "GENERIC";
genericTripPreset.label = "通用城市四天三夜範本";

export const findTripPreset = (code: string) => [...tripPresets, genericTripPreset].find(preset => preset.code === code) ?? null;

export const getTripPresetsByCountry = (countryCode: TripPresetCountryCode | "") => [
  ...tripPresets.filter(preset => preset.countryCode === countryCode),
  genericTripPreset
];
