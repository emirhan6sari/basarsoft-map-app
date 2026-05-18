/**
 * Esc iptali — öncelik sırasına göre handler zinciri (OCP: yeni mod = yeni handler).
 * İlk true dönen handler iptali tamamlar.
 */
export function runEscapeCancelChain(handlers) {
  for (const handler of handlers) {
    if (typeof handler === 'function' && handler()) return true;
  }
  return false;
}
