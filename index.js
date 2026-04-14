import Vue from 'vue'
import Vuex from 'vuex'
import { webSocketService } from '@/utils/websocket'

Vue.use(Vuex)

export default new Vuex.Store({
    state: {
      user: JSON.parse(localStorage.getItem('honey-user') || '{}')
    },
    mutations: {
      UPDATE_USER(state, user) {
        state.user = user
        localStorage.setItem('honey-user', JSON.stringify(user))
      }
    },
    actions: {
      // 本地更新用户并通过WebSocket广播
      updateUser({ commit }, user) {
        // 提交本地状态更新
        commit('UPDATE_USER', user)
        // 通过WebSocket广播到其他浏览器
        webSocketService.sendUserUpdate(user)
      },
      
      // 仅更新本地状态，由WebSocket消息触发,用于接收端
      receiveUserUpdate({ commit }, user) {
        commit('UPDATE_USER', user)
      }
    },
    getters: {
      // 全局user
      QJuser: state => state.user || ''
    }
  })