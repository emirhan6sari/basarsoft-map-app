import { useEffect, useMemo } from 'react';
import { isEditableTarget } from '../../utils/mapFeatureUtils';
import { runEscapeCancelChain } from '../../utils/mapEscapeChain';

/** Esc — öncelikli iptal zinciri (OCP). */
export function useMapEscapeKey(handlers) {
  const cancel = useMemo(
    () => () => runEscapeCancelChain(handlers),
    [handlers],
  );

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (isEditableTarget(e.target)) return;
      if (cancel()) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [cancel]);
}
