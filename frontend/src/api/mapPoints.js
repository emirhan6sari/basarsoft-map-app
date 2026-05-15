import apiClient from './client';
import { unwrap } from './auth';

const RESOURCE = '/api/mappoints';

export async function listMapPoints() {
  const response = await apiClient.get(RESOURCE);
  return unwrap(response);
}

export async function createMapPoint(payload) {
  const response = await apiClient.post(RESOURCE, payload);
  return unwrap(response);
}

export async function updateMapPoint(id, payload) {
  const response = await apiClient.put(`${RESOURCE}/${id}`, payload);
  return unwrap(response);
}

export async function getMapPoint(id) {
  const response = await apiClient.get(`${RESOURCE}/${id}`);
  return unwrap(response);
}

export async function deleteMapPoint(id) {
  const response = await apiClient.delete(`${RESOURCE}/${id}`);
  if (response.status === 204) return true;
  return unwrap(response);
}
