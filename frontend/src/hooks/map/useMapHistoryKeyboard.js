import { useCallback, useEffect, useState } from 'react';
import { isEditableTarget } from '../../utils/mapFeatureUtils';

export function useMapHistoryKeyboard(loggedIn, history) {
  const [historyError, setHistoryError] = useState(null);

  const handleHistoryUndo = useCallback(() => {
    setHistoryError(null);
    history.undo().catch((err) => setHistoryError(err.message ?? 'Geri alınamadı.'));
  }, [history]);

  const handleHistoryRedo = useCallback(() => {
    setHistoryError(null);
    history.redo().catch((err) => setHistoryError(err.message ?? 'Yineleme başarısız.'));
  }, [history]);

  useEffect(() => {
    if (!loggedIn) return;

    const onKeyDown = (e) => {
      if (isEditableTarget(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      const isRedo = e.key === 'y' || (e.key === 'z' && e.shiftKey);
      const isUndo = e.key === 'z' && !e.shiftKey;
      if (!isUndo && !isRedo) return;

      e.preventDefault();
      setHistoryError(null);
      const action = isRedo ? history.redo : history.undo;
      action().catch((err) => setHistoryError(err.message ?? 'İşlem uygulanamadı.'));
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [loggedIn, history.undo, history.redo]);

  return { historyError, setHistoryError, handleHistoryUndo, handleHistoryRedo };
}
