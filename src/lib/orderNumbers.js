/**
 * Генерация уникальных номеров продаж по городам
 * Формат: {CITY_CODE}{NNNNN} (например: S00001, V00042, K00123)
 */

import pb from './pocketbase.js';
import { getCityCode } from './cityCodes.js';

/**
 * Генерировать следующий номер продажи для города
 * @param {string} cityName - Название города
 * @returns {Promise<string>} - Номер продажи (например: S00001)
 */
export async function generateOrderNumber(cityName) {
  const cityCode = getCityCode(cityName);
  
  if (!cityCode) {
    throw new Error(`Неизвестный город: ${cityName}`);
  }

  try {
    // Получаем последний заказ для этого города
    const lastOrder = await pb.collection('orders').getFirstListItem(
      `city_code = "${cityCode}"`,
      {
        sort: '-order_number',
        fields: 'order_number'
      }
    ).catch(() => null);

    let nextNumber = 1;

    if (lastOrder && lastOrder.order_number) {
      // Извлекаем число из номера (например: S00042 -> 42)
      const numberPart = lastOrder.order_number.substring(1);
      const currentNumber = parseInt(numberPart, 10);
      nextNumber = currentNumber + 1;
    }

    // Форматируем номер: код + 5 цифр с ведущими нулями
    const orderNumber = `${cityCode}${String(nextNumber).padStart(5, '0')}`;
    
    return orderNumber;
  } catch (error) {
    console.error('Error generating order number:', error);
    // В случае ошибки генерируем номер на основе timestamp
    const timestamp = Date.now().toString().slice(-5);
    return `${cityCode}${timestamp}`;
  }
}

/**
 * Проверить уникальность номера продажи
 * @param {string} orderNumber - Номер для проверки
 * @returns {Promise<boolean>} - true если номер уникален
 */
export async function isOrderNumberUnique(orderNumber) {
  try {
    const existing = await pb.collection('orders').getFirstListItem(
      `order_number = "${orderNumber}"`
    ).catch(() => null);
    
    return !existing;
  } catch (error) {
    console.error('Error checking order number uniqueness:', error);
    return false;
  }
}

/**
 * Парсинг номера продажи
 * @param {string} orderNumber - Номер продажи (например: S00042)
 * @returns {{cityCode: string, number: number}} - Разобранный номер
 */
export function parseOrderNumber(orderNumber) {
  if (!orderNumber || orderNumber.length < 2) {
    return { cityCode: null, number: null };
  }

  const cityCode = orderNumber.charAt(0);
  const numberPart = orderNumber.substring(1);
  const number = parseInt(numberPart, 10);

  return { cityCode, number };
}

/**
 * Валидация формата номера продажи
 * @param {string} orderNumber - Номер для проверки
 * @returns {boolean} - true если формат корректен
 */
export function isValidOrderNumber(orderNumber) {
  // Формат: одна буква + 5 цифр
  const pattern = /^[A-Z]\d{5}$/;
  return pattern.test(orderNumber);
}

/**
 * Генерировать номер партии для приемки
 * @param {string} cityName - Название города
 * @param {Date} date - Дата приемки
 * @returns {Promise<string>} - Номер партии (например: S-2026-02-16-001)
 */
export async function generateBatchNumber(cityName, date = new Date()) {
  const cityCode = getCityCode(cityName);
  
  if (!cityCode) {
    throw new Error(`Неизвестный город: ${cityName}`);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  try {
    // Получаем последнюю партию за этот день для этого города
    const lastBatch = await pb.collection('stocks').getFirstListItem(
      `batch_number ~ "${cityCode}-${dateStr}-%"`,
      {
        sort: '-batch_number',
        fields: 'batch_number'
      }
    ).catch(() => null);

    let sequence = 1;

    if (lastBatch && lastBatch.batch_number) {
      // Извлекаем последовательность (например: S-2026-02-16-003 -> 3)
      const parts = lastBatch.batch_number.split('-');
      const lastSequence = parseInt(parts[parts.length - 1], 10);
      sequence = lastSequence + 1;
    }

    // Форматируем: CODE-YYYY-MM-DD-SEQ
    const batchNumber = `${cityCode}-${dateStr}-${String(sequence).padStart(3, '0')}`;
    
    return batchNumber;
  } catch (error) {
    console.error('Error generating batch number:', error);
    // В случае ошибки используем timestamp
    const timestamp = Date.now().toString().slice(-3);
    return `${cityCode}-${dateStr}-${timestamp}`;
  }
}

/**
 * Парсинг номера партии
 * @param {string} batchNumber - Номер партии (например: S-2026-02-16-001)
 * @returns {{cityCode: string, date: Date, sequence: number}} - Разобранный номер
 */
export function parseBatchNumber(batchNumber) {
  if (!batchNumber) {
    return { cityCode: null, date: null, sequence: null };
  }

  const parts = batchNumber.split('-');
  if (parts.length !== 5) {
    return { cityCode: null, date: null, sequence: null };
  }

  const [cityCode, year, month, day, seq] = parts;
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const sequence = parseInt(seq, 10);

  return { cityCode, date, sequence };
}
