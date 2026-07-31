import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useNotificationsStore } from '../../src/store/notifications.js';

describe('notifications store', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('open() shows the message with default primary color', () => {
    const store = useNotificationsStore();
    store.open({ text: 'guardado' });
    expect(store.show).toBe(true);
    expect(store.text).toBe('guardado');
    expect(store.color).toBe('primary');
  });

  it('open() respects an explicit color', () => {
    const store = useNotificationsStore();
    store.open({ text: 'error', color: 'error' });
    expect(store.color).toBe('error');
  });

  it('close() hides the notification', () => {
    const store = useNotificationsStore();
    store.open({ text: 'x' });
    store.close();
    expect(store.show).toBe(false);
  });
});
