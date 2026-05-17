import { useCallback, useRef, useState } from 'react';
import { createMapPoint, updateMapPoint, deleteMapPoint } from '../api/mapPoints';

const MAX_HISTORY = 50;

function clonePoint(dto) {
  return dto ? { ...dto } : null;
}

function toCreatePayload(point) {
  return {
    name: point.name,
    number: point.number,
    description: point.description ?? undefined,
    category: point.category,
    longitude: point.longitude,
    latitude: point.latitude,
    xMercator: point.xMercator,
    yMercator: point.yMercator,
  };
}

/**
 * Harita noktası CRUD için oturum içi undo/redo.
 * @param {{ onSync: (event: { op: 'add'|'remove'|'update'|'batchAdd'|'batchRemove', point?: object, id?: string, points?: object[] }) => void }} options
 */
export function useMapPointHistory({ onSync }) {
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [lastError, setLastError] = useState(null);

  const bump = useCallback(() => setTick((t) => t + 1), []);

  const pushUndo = useCallback((entry) => {
    undoStack.current.push(entry);
    if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift();
    redoStack.current = [];
    bump();
  }, [bump]);

  const recordCreate = useCallback((point) => {
    pushUndo({ type: 'create', point: clonePoint(point) });
  }, [pushUndo]);

  const recordBatchCreate = useCallback((points) => {
    if (!points?.length) return;
    pushUndo({ type: 'batchCreate', points: points.map(clonePoint) });
  }, [pushUndo]);

  const recordUpdate = useCallback((before, after) => {
    pushUndo({ type: 'update', before: clonePoint(before), after: clonePoint(after) });
  }, [pushUndo]);

  const recordDelete = useCallback((point) => {
    pushUndo({ type: 'delete', point: clonePoint(point) });
  }, [pushUndo]);

  const clear = useCallback(() => {
    undoStack.current = [];
    redoStack.current = [];
    setLastError(null);
    bump();
  }, [bump]);

  const runUndo = useCallback(async () => {
    if (busy || undoStack.current.length === 0) return;

    const entry = undoStack.current.pop();
    setBusy(true);
    setLastError(null);

    try {
      if (entry.type === 'create') {
        await deleteMapPoint(entry.point.id);
        onSync({ op: 'remove', id: entry.point.id });
        redoStack.current.push(entry);
      } else if (entry.type === 'batchCreate') {
        const ids = entry.points.map((p) => p.id);
        await Promise.all(ids.map((id) => deleteMapPoint(id)));
        onSync({ op: 'batchRemove', ids });
        redoStack.current.push(entry);
      } else if (entry.type === 'delete') {
        const created = await createMapPoint(toCreatePayload(entry.point));
        onSync({ op: 'add', point: created });
        redoStack.current.push({ type: 'delete', point: created });
      } else if (entry.type === 'update') {
        const updated = await updateMapPoint(entry.before.id, toCreatePayload(entry.before));
        onSync({ op: 'update', point: updated });
        redoStack.current.push(entry);
      }
      bump();
    } catch (err) {
      undoStack.current.push(entry);
      setLastError(err.message ?? 'Geri alınamadı.');
      throw err;
    } finally {
      setBusy(false);
    }
  }, [busy, onSync, bump]);

  const runRedo = useCallback(async () => {
    if (busy || redoStack.current.length === 0) return;

    const entry = redoStack.current.pop();
    setBusy(true);
    setLastError(null);

    try {
      if (entry.type === 'create') {
        const created = await createMapPoint(toCreatePayload(entry.point));
        onSync({ op: 'add', point: created });
        undoStack.current.push({ type: 'create', point: created });
      } else if (entry.type === 'batchCreate') {
        const createdList = await Promise.all(
          entry.points.map((p) => createMapPoint(toCreatePayload(p))),
        );
        onSync({ op: 'batchAdd', points: createdList });
        undoStack.current.push({ type: 'batchCreate', points: createdList });
      } else if (entry.type === 'delete') {
        await deleteMapPoint(entry.point.id);
        onSync({ op: 'remove', id: entry.point.id });
        undoStack.current.push(entry);
      } else if (entry.type === 'update') {
        const updated = await updateMapPoint(entry.after.id, toCreatePayload(entry.after));
        onSync({ op: 'update', point: updated });
        undoStack.current.push(entry);
      }
      bump();
    } catch (err) {
      redoStack.current.push(entry);
      setLastError(err.message ?? 'Yineleme başarısız.');
      throw err;
    } finally {
      setBusy(false);
    }
  }, [busy, onSync, bump]);

  return {
    recordCreate,
    recordBatchCreate,
    recordUpdate,
    recordDelete,
    undo: runUndo,
    redo: runRedo,
    clear,
    busy,
    lastError,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    tick,
  };
}
