import { createPinia } from 'pinia';
import { logrocketPlugin } from './logrocketPlugin.js';

export const pinia = createPinia();
pinia.use(logrocketPlugin);

export { useWorkspaceStore } from './workspace.js';
export { useNotificationsStore } from './notifications.js';
export { useEditorStore } from './editor.js';
