import { API_BASE_URL } from './auth';
import axios from 'axios';

const http = axios.create({ baseURL: API_BASE_URL, timeout: 10000 });

export async function fetchCategories() {
  const res = await http.get('/api/categories');
  const body = res.data;
  if (body?.success) return body.data;
  return body;
}
