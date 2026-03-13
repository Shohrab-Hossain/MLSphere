import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import './assets/styles/layout-utilities.css'

// Auto-register all base components globally

const app = createApp(App)

app.config.globalProperties.$flash = (message, type = 'info', duration = 3000) => {
	store.dispatch('ui/showToast', { message, type, duration })
}

app
	.use(router)
	.use(store)
	.mount('#app')
