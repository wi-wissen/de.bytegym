import LoginPage from './pages/LoginPage.vue'
import MainPage from './pages/MainPage.vue'
import StartTab from './pages/StartTab.vue'
import ProgressTab from './pages/ProgressTab.vue'
import StudioTab from './pages/StudioTab.vue'
import LeaderboardTab from './pages/LeaderboardTab.vue'
import { sessionStore } from './store/session.js'

export default [
  {
    path: '/',
    component: MainPage,
    beforeEnter: function ({ resolve, reject, router }) {
      if (sessionStore.isLoggedIn) {
        resolve()
      } else {
        router.navigate('/login/')
        reject()
      }
    }
  },
  { path: '/login/', component: LoginPage },
  { path: '/start/', component: StartTab },
  { path: '/progress/', component: ProgressTab },
  { path: '/studio/', component: StudioTab },
  { path: '/leaderboard/', component: LeaderboardTab },
]
