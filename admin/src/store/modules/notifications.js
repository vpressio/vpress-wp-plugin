export default {
  namespaced: true,
  state: {
    text: 'Hello world!',
    show: false,
    color: 'success',
    timeout: 3000
  },
  mutations: {
    SHOW_NOTIFICATION(state, payload) {
      state.text = payload.text;
      state.color = payload.color ? payload.color : 'primary'
      state.show = true
    },
    CLOSE_NOTIFICATION(state) {
      state.show =  false
    }
  },
  actions: {
    open({ commit }, payload) {
      commit('SHOW_NOTIFICATION', payload)
    },
    close({commit}) {
      commit('CLOSE_NOTIFICATION')
    }
  }
}
