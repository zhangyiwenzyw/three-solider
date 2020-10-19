import Vue from 'vue'
import Router from 'vue-router'
import Park from '@/components/Park'
import Solider from '@/components/Solider'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/Park',
      name: 'Park',
      component: Park
    },
    {
      path: '/',
      name: 'Solider',
      component: Solider
    }
  ]
})
