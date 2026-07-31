import LogRocket from 'logrocket';

// Replaces logrocket-vuex: mirrors every store action + state change into LogRocket.
export function logrocketPlugin({ store }) {
  store.$onAction(({ name, args }) => {
    LogRocket.log(`pinia action ${store.$id}/${name}`, args);
  });
  store.$subscribe((mutation, state) => {
    LogRocket.log(`pinia state ${store.$id}`, { type: mutation.type, state });
  });
}
