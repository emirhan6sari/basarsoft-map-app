/**
 * Kategori listesi yardımcıları — API (camelCase / PascalCase) ve sıralama.
 * Harita legend, nokta ekleme popup ve admin modal aynı kaynağı kullanır.
 */

/** Tek kategori DTO'sunu normalize eder */
export function normalizeCategory(raw) {
  if (!raw) return null;
  return {
    id: raw.id ?? raw.Id,
    name: raw.name ?? raw.Name ?? '',
    displayName: raw.displayName ?? raw.DisplayName ?? raw.name ?? raw.Name ?? '',
    sortOrder: raw.sortOrder ?? raw.SortOrder ?? 0,
  };
}

/** Sıra numarasına göre artan sıralama (eşit sırada görünen ada göre) */
export function sortCategories(categories) {
  return [...(categories ?? [])]
    .map(normalizeCategory)
    .filter((c) => c.name)
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.displayName.localeCompare(b.displayName, 'tr');
    });
}

export function getCategoryKey(cat) {
  return cat?.name ?? cat?.Name ?? '';
}

export function getCategoryLabel(cat) {
  return cat?.displayName ?? cat?.DisplayName ?? getCategoryKey(cat);
}
