import LogRocket from 'logrocket';

// Replaces logrocket-vuex. Logs action names only: the editor store holds
// full query result sets, and serializing them on every state change would
// jank the main thread and ship customer data rows to LogRocket.
export function logrocketPlugin({ store }) {
  store.$onAction(({ name }) => {
    LogRocket.log(`pinia action ${store.$id}/${name}`);
  });
}
