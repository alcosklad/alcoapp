import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * Форматирует ISO дату с сервера в локальное время устройства
 * @param {string} isoString - ISO строка даты с сервера
 * @param {string} formatStr - Формат вывода (по умолчанию 'dd.MM.yyyy HH:mm')
 * @returns {string} Отформатированная дата в локальном времени
 */
export function formatLocalDate(isoString, formatStr = 'dd.MM.yyyy HH:mm') {
  if (!isoString) return '—';
  try {
    // parseISO автоматически конвертирует в локальное время браузера
    const date = parseISO(isoString);
    return format(date, formatStr, { locale: ru });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '—';
  }
}

/**
 * Форматирует ISO дату только время
 * @param {string} isoString - ISO строка даты
 * @returns {string} Время в формате HH:mm
 */
export function formatLocalTime(isoString) {
  return formatLocalDate(isoString, 'HH:mm');
}

/**
 * Форматирует ISO дату только дату
 * @param {string} isoString - ISO строка даты
 * @returns {string} Дата в формате dd.MM.yyyy
 */
export function formatLocalDateOnly(isoString) {
  return formatLocalDate(isoString, 'dd.MM.yyyy');
}

/**
 * Форматирует ISO дату в относительный формат (сегодня, вчера, дата)
 * @param {string} isoString - ISO строка даты
 * @returns {string} Относительная дата
 */
export function formatRelativeDate(isoString) {
  if (!isoString) return '—';
  try {
    const date = parseISO(isoString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const diffDays = Math.floor((today - dateDay) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `Сегодня, ${format(date, 'HH:mm', { locale: ru })}`;
    } else if (diffDays === 1) {
      return `Вчера, ${format(date, 'HH:mm', { locale: ru })}`;
    } else if (diffDays < 7) {
      return format(date, 'EEEE, HH:mm', { locale: ru });
    } else {
      return format(date, 'dd.MM.yyyy, HH:mm', { locale: ru });
    }
  } catch (error) {
    console.error('Error formatting relative date:', error);
    return '—';
  }
}

/**
 * Получает текущую дату/время в ISO формате для отправки на сервер
 * @returns {string} ISO строка текущего времени
 */
export function getCurrentISOString() {
  return new Date().toISOString();
}

/**
 * Конвертирует локальную дату в ISO для отправки на сервер
 * @param {Date} date - Локальная дата
 * @returns {string} ISO строка
 */
export function toISOString(date) {
  return date.toISOString();
}

/**
 * Форматирует длительность в человекочитаемый формат
 * @param {number} milliseconds - Длительность в миллисекундах
 * @returns {string} Отформатированная длительность
 */
export function formatDuration(milliseconds) {
  if (!milliseconds || milliseconds < 0) return '0 мин';
  
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours} ч ${minutes} мин`;
  }
  return `${minutes} мин`;
}
