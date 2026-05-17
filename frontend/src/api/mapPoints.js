import apiClient from './client';
import { unwrap, parseApiError } from './auth';

const RESOURCE = '/api/mappoints';

function normalizeListResult(data) {
  if (Array.isArray(data)) {
    return {
      items: data,
      totalCount: data.length,
      returnedCount: data.length,
      truncated: false,
      maxResults: data.length,
    };
  }

  const items = data?.items ?? data?.Items ?? [];
  return {
    items,
    totalCount: data?.totalCount ?? data?.TotalCount ?? items.length,
    returnedCount: data?.returnedCount ?? data?.ReturnedCount ?? items.length,
    truncated: Boolean(data?.truncated ?? data?.Truncated),
    maxResults: data?.maxResults ?? data?.MaxResults ?? items.length,
  };
}

/**
 * @param {{ minLon?: number, minLat?: number, maxLon?: number, maxLat?: number } | null} bbox
 * @param {{ signal?: AbortSignal, limit?: number }} [options]
 */
export async function listMapPoints(bbox = null, options = {}) {
  const params = {};
  if (bbox) {
    params.minLon = bbox.minLon;
    params.minLat = bbox.minLat;
    params.maxLon = bbox.maxLon;
    params.maxLat = bbox.maxLat;
  }
  if (options.limit) params.limit = options.limit;

  const response = await apiClient.get(RESOURCE, {
    params: Object.keys(params).length ? params : undefined,
    signal: options.signal,
  });
  return normalizeListResult(unwrap(response));
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

export async function importMapPoints(payload) {
  try {
    const response = await apiClient.post(`${RESOURCE}/import`, payload);
    return unwrap(response);
  } catch (error) {
    throw parseApiError(error);
  }
}
