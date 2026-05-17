/** PROXIMITY_WARNING (409) — kullanıcı onaylarsa confirmProximityWarning ile yeniden dener. */
export async function withProximityConfirm(saveFn, payload) {
  try {
    return await saveFn(payload);
  } catch (err) {
    if (err.code !== 'PROXIMITY_WARNING' || payload.confirmProximityWarning) throw err;

    const ok = window.confirm(
      `${err.message}\n\nYine de kaydetmek istiyor musunuz?`,
    );
    if (!ok) throw err;

    return saveFn({ ...payload, confirmProximityWarning: true });
  }
}
