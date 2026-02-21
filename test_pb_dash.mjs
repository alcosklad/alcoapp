import fetch from 'node-fetch';
import PocketBase from 'pocketbase';
const pb = new PocketBase("http://146.103.121.96:8090");
await pb.admins.authWithPassword("admin@nashsklad.store", "admin12345");

global.pb = pb; // mock for pocketbase.js
import { getDashboardStats } from './pb_mock.js';
getDashboardStats('iyonqkscjkdwrvi,izl0ujjh2gsde42').then(res => console.log(res)).catch(console.error);
