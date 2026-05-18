// Üst menü modları → panel / modal açma (OCP: yeni mod buraya eklenir)
import { useEffect } from 'react';

export function useMapActiveMode(activeMode, onModeConsumed, handlers) {
  useEffect(() => {
    if (!activeMode) return;

    const action = handlers[activeMode];
    if (action) {
      action();
      onModeConsumed?.();
    }
  }, [activeMode, onModeConsumed, handlers]);
}
