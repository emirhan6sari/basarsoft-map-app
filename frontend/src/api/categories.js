// Kategori API — GET herkese açık; CRUD yalnızca Admin
import apiClient from './client';
import { unwrap } from './auth';

/** Tüm kategoriler (legend, dropdown) */
export async function fetchCategories() {
  const res = await apiClient.get('/api/categories');
  return unwrap(res);
}

export async function createCategory(payload) {
  const res = await apiClient.post('/api/categories', payload);
  return unwrap(res);
}

export async function updateCategory(id, payload) {
  const res = await apiClient.put(`/api/categories/${id}`, payload);
  return unwrap(res);
}

export async function deleteCategory(id) {
  await apiClient.delete(`/api/categories/${id}`);
}
