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
  tripName?: string;
  tripContent?: string;
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
  label: source.tripName ?? `${source.cityName}經典四天三夜`,
  tripName: source.tripName ?? `${source.cityName}經典四天三夜`,
  summary: `${source.highlights.join("、")}精選行程`,
  tripContent:
    source.tripContent ??
    `走訪${source.countryName}${source.cityName}代表性景點，結合城市文化、在地美食與自由活動時間，適合第一次造訪的旅客。`,
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
    highlights: ["台北101", "故宮博物院", "九份老街"],
    tripName: "台北風華3日｜台北101・故宮巡禮・九份山城",
    tripContent:
      "從台北101的都會風景出發，走進故宮博物院欣賞典藏文物，再前往九份老街，沿著山城階梯感受巷弄與茶樓交織的懷舊氣息。3天2夜串聯城市地標、文化藝術與山城風光，搭配在地風味餐食及自由探索時間，從不同角度認識台北與周邊的旅行魅力。"
  }),
  createPreset({
    code: "JP_TOKYO_4D",
    countryCode: "JP",
    countryName: "日本",
    cityName: "東京",
    destination: "TOKYO",
    price: 39800,
    highlights: ["淺草寺", "東京晴空塔", "台場"],
    tripName: "東京漫遊4日｜淺草古韻・晴空塔地標・台場海濱",
    tripContent:
      "走訪淺草寺與周邊街區，感受東京保留至今的傳統風情；來到晴空塔一帶，欣賞現代城市地標，再到台場享受開闊的海濱景致。四天三夜結合文化散策、都會風景與購物時光，保留自由探索的空間，讓初次造訪東京的旅客，也能找到自己喜歡的旅行節奏。"
  }),
  createPreset({
    code: "KR_SEOUL_4D",
    countryCode: "KR",
    countryName: "韓國",
    cityName: "首爾",
    destination: "SEOUL",
    price: 29800,
    highlights: ["景福宮", "北村韓屋村", "南山首爾塔"],
    tripName: "首爾慢遊4日｜景福宮・北村韓屋・南山首爾塔",
    tripContent:
      "走進景福宮，欣賞宮殿建築的細節與氣勢，再沿著北村韓屋村的街巷，感受傳統屋瓦與城市生活交融的風景。行程串聯南山首爾塔周邊景致，搭配韓式風味餐食與自由逛街時間，在四天三夜中體驗首爾的歷史韻味與現代活力，適合喜歡文化漫遊、拍照與城市探索的旅客。"
  }),
  createPreset({
    code: "TH_BANGKOK_4D",
    countryCode: "TH",
    countryName: "泰國",
    cityName: "曼谷",
    destination: "BANGKOK",
    price: 26800,
    highlights: ["大皇宮", "鄭王廟", "水上市場"],
    tripName: "曼谷風情4日｜大皇宮・鄭王廟・水上市場漫遊",
    tripContent:
      "從大皇宮的華麗建築，到鄭王廟獨具特色的塔身細節，循著曼谷的經典地標，感受泰式文化與藝術之美。再走訪水上市場，體驗沿水而生的交易風景與熱鬧氣息。四天三夜搭配在地特色料理及自由活動時間，讓文化參訪與城市閒逛相互穿插，留下充滿色彩與滋味的曼谷回憶。"
  }),
  createPreset({
    code: "SG_CITY_4D",
    countryCode: "SG",
    countryName: "新加坡",
    cityName: "新加坡",
    destination: "SINGAPORE",
    price: 31800,
    highlights: ["濱海灣花園", "魚尾獅公園", "聖淘沙"],
    tripName: "新加坡花園假期4日｜濱海灣花園・魚尾獅・聖淘沙",
    tripContent:
      "走訪濱海灣花園，欣賞綠意與現代設計交織的城市景觀，在魚尾獅公園留下經典合影，再前往聖淘沙感受悠閒的島嶼氛圍。四天三夜串聯新加坡代表地標，搭配在地風味餐食與自由探索時間，從濱海風光到城市街景，體驗花園城市豐富而多元的樣貌。"
  }),
  createPreset({
    code: "MY_KL_4D",
    countryCode: "MY",
    countryName: "馬來西亞",
    cityName: "吉隆坡",
    destination: "KUALA_LUMPUR",
    price: 27800,
    highlights: ["雙子星塔", "獨立廣場", "黑風洞"],
    tripName: "吉隆坡探索4日｜雙子星塔・獨立廣場・黑風洞",
    tripContent:
      "以雙子星塔的現代天際線揭開旅程，走訪獨立廣場，感受吉隆坡的歷史街景，再前往黑風洞，欣賞石灰岩地形與宗教文化交織的獨特景觀。四天三夜串聯城市地標與文化景點，搭配在地風味餐食及自由活動，認識吉隆坡多元文化共存的日常風貌。"
  }),
  createPreset({
    code: "CN_SHANGHAI_4D",
    countryCode: "CN",
    countryName: "中國",
    cityName: "上海",
    destination: "SHANGHAI",
    price: 28800,
    highlights: ["外灘", "豫園", "陸家嘴"],
    tripName: "上海風華4日｜外灘建築・豫園雅韻・陸家嘴天際線",
    tripContent:
      "沿著外灘欣賞各具風格的歷史建築，走進豫園感受傳統園林的雅致，再前往陸家嘴，近距離感受摩天大樓匯聚的都會氣勢。四天三夜串聯上海經典風景，搭配地方特色料理與自由探索時間，在園林、街區與江岸之間，讀出這座城市兼容古典與現代的獨特個性。"
  }),
  createPreset({
    code: "HK_CITY_3D",
    countryCode: "HK",
    countryName: "香港",
    cityName: "香港",
    destination: "HONG_KONG",
    price: 28800,
    highlights: ["維多利亞港", "太平山", "大嶼山"],
    tripName: "香港山海漫遊3日｜維多利亞港・太平山・大嶼山",
    tripContent:
      "從維多利亞港的海港風光出發，前往太平山欣賞城市與山海交織的景致，再走訪大嶼山，感受香港不同於繁華市區的一面。3天2夜結合經典地標、自然風景與在地飲食，保留自由逛街及探索時間，讓旅客在熱鬧都會與悠閒山海之間，體驗香港豐富的旅行層次。"
  }),
  createPreset({
    code: "MO_CITY_3D",
    countryCode: "MO",
    countryName: "澳門",
    cityName: "澳門",
    destination: "MACAU",
    price: 25800,
    highlights: ["大三巴牌坊", "議事亭前地", "路氹金光大道"],
    tripName: "澳門拾光3日｜大三巴・議事亭前地・路氹金光大道",
    tripContent:
      "從大三巴牌坊出發，走進議事亭前地與周邊街巷，欣賞葡式建築與在地生活交織的街景，再前往路氹金光大道，感受大型度假村建築匯聚的華麗氣勢。3天2夜串聯歷史街區與現代休閒區域，搭配特色餐食及自由探索時間，在步行與停留之間，細細品味澳門的城市風情。"
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
