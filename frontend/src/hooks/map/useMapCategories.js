// Kategori listesi — DB senkronu (legend, modallar)
import { useCallback, useEffect, useState } from 'react';
import { fetchCategories } from '../../api/categories';
import { registerCategories } from '../../utils/mapPointStyles';

export function useMapCategories(loggedIn) {
  const [categories, setCategories] = useState([]);

  const reloadCategories = useCallback(() => {
    if (!loggedIn) return Promise.resolve();
    return fetchCategories()
      .then((cats) => {
        const categoryList = cats ?? [];
        registerCategories(categoryList);
        setCategories(categoryList);
      })
      .catch((err) => console.error('Kategoriler yüklenemedi:', err));
  }, [loggedIn]);

  useEffect(() => {
    reloadCategories();
  }, [reloadCategories]);

  return { categories, reloadCategories };
}
