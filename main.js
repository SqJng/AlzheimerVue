import Vue from 'vue'
import App from './App.vue'
import router from './router'
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import VueRouter from 'vue-router'
import store from './store'
import { webSocketService } from './utils/websocket';

Vue.config.productionTip = false


Vue.use(ElementUI);
Vue.use(VueRouter)
webSocketService.connect()//找个地方先建立连接

new Vue({
  store,
  router,
  render: h => h(App),
}).$mount('#app')
