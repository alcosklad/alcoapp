/**
 * PocketBase клиент для серверных скриптов (Node.js)
 * Используется в миграциях и других серверных задачах
 */

import PocketBase from 'pocketbase';

const pb = new PocketBase('http://146.103.121.96:8090');

// Отключаем автоотмену запросов
pb.autoCancellation(false);

export default pb;
