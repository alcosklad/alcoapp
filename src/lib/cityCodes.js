/**
 * Маппинг городов на коды для номеров продаж
 * Формат номера: {CODE}-{NNNN} (например: PM-0001, EK-0042)
 */

export const CITY_CODES = {
  'Волгоград': 'VG',
  'Воронеж': 'VR',
  'Иркутск': 'IR',
  'Казань': 'KZ',
  'Калининград': 'KL',
  'Красноярск': 'KR',
  'НН': 'NN',
  'Нижний Новгород': 'NN',
  'Омск': 'OM',
  'Пермь': 'PM',
  'Самара': 'SM',
  'Саратов': 'SR',
  'Сочи': 'SO',
  'СПБ': 'SP',
  'Санкт-Петербург': 'SP',
  'Сургут': 'SU',
  'Уфа': 'UF',
  'КЛД': 'KL',
  'НСК': 'NS',
  'Краснодар': 'KD',
  'Екатеринбург': 'EK',
  'Новосибирск': 'NS',
  'Челябинск': 'CH',
  'Ростов': 'RS',
  'Тюмень': 'TM',
  'Барнаул': 'BR',
  'Владивосток': 'VL',
  'Хабаровск': 'HB',
  'Ярославль': 'YR'
};

// Обратный маппинг: код -> город
export const CODE_TO_CITY = Object.fromEntries(
  Object.entries(CITY_CODES).map(([city, code]) => [code, city])
);

/**
 * Получить код города
 * @param {string} cityName - Название города
 * @returns {string|null} - Код города или null если не найден
 */
export function getCityCode(cityName) {
  return CITY_CODES[cityName] || null;
}

/**
 * Получить название города по коду
 * @param {string} code - Код города
 * @returns {string|null} - Название города или null если не найден
 */
export function getCityByCode(code) {
  return CODE_TO_CITY[code] || null;
}

/**
 * Проверить валидность кода города
 * @param {string} code - Код города
 * @returns {boolean}
 */
export function isValidCityCode(code) {
  return code in CODE_TO_CITY;
}

/**
 * Получить список всех городов
 * @returns {string[]}
 */
export function getAllCities() {
  return Object.keys(CITY_CODES);
}

/**
 * Получить список всех кодов
 * @returns {string[]}
 */
export function getAllCodes() {
  return Object.values(CITY_CODES);
}

