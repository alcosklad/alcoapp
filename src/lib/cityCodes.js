/**
 * Маппинг городов на однобуквенные коды для номеров продаж
 * Формат номера: {CODE}{NNNNN} (например: S00001, V00042)
 */

export const CITY_CODES = {
  'Волгоград': 'V',
  'Воронеж': 'W',
  'Иркутск': 'I',
  'Казань': 'K',
  'Калининград': 'L',
  'Красноярск': 'R',
  'НН': 'N',
  'Омск': 'O',
  'Пермь': 'P',
  'Самара': 'S',
  'Саратов': 'T',
  'Сочи': 'C',
  'СПБ': 'B',
  'Сургут': 'U',
  'Уфа': 'F'
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
