export type ToastType = 'success' | 'error' | 'info';

// Tiny event-based toast helper: call toast('success', 'Saved!') from anywhere.
// <ToastHost /> (mounted once in the root layout) listens and renders them.
export function toast(type: ToastType, message: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('embrione:toast', { detail: { type, message } }),
  );
}
