// Self-destructing service worker: unregisters the PWA worker shipped by the
// old Vue CLI build so stale precached assets stop being served.
self.addEventListener('install', () => {
  self.skipWaiting();
});
self.addEventListener('activate', async () => {
  await self.registration.unregister();
  const clientList = await self.clients.matchAll({ type: 'window' });
  clientList.forEach((client) => client.navigate(client.url));
});
