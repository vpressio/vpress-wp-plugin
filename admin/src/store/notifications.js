import { defineStore } from 'pinia';

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    text: 'Hello world!',
    show: false,
    color: 'success',
    timeout: 3000
  }),
  actions: {
    open(payload) {
      this.text = payload.text;
      this.color = payload.color ? payload.color : 'primary';
      this.show = true;
    },
    close() {
      this.show = false;
    }
  }
});
