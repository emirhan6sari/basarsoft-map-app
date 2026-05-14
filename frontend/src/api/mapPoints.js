// ============================================================================
// MapPoints API — backend'in /api/mappoints endpoint'lerine sarmal
// ----------------------------------------------------------------------------
// React komponentleri direkt axios çağırmaz; bu modül üzerinden çağırırlar.
// Bu sayede backend kontratı değişirse sadece burayı güncelleriz.
// ============================================================================

import apiClient from './client';

const RESOURCE = '/api/mappoints';

/**
 * Tüm noktaları listeler.
 * @returns {Promise<Array<{
 *   id: string,
 *   name: string,
 *   description: string|null,
 *   longitude: number,
 *   latitude: number,
 *   createdAt: string,
 *   updatedAt: string,
 * }>>}
 */
export async function listMapPoints() {
  const { data } = await apiClient.get(RESOURCE);
  return data;
}

/**
 * Yeni nokta oluşturur.
 * @param {{ name: string, description?: string, longitude: number, latitude: number }} payload
 */
export async function createMapPoint(payload) {
  const { data } = await apiClient.post(RESOURCE, payload);
  return data;
}

/**
 * Mevcut noktayı günceller (full replace).
 */
export async function updateMapPoint(id, payload) {
  const { data } = await apiClient.put(`${RESOURCE}/${id}`, payload);
  return data;
}

/**
 * Noktayı siler.
 */
export async function deleteMapPoint(id) {
  await apiClient.delete(`${RESOURCE}/${id}`);
}
