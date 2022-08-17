import {createRouter, createWebHashHistory} from 'vue-router';

import Navigation from '../views/Navigation.vue'
import Production from '../views/production/Production.vue'
const routes = [
  { path: '/', component: Navigation,
  children: [
      { path: '/production', component: Production },
  ]
  },

]

// 3. Create the router instance and pass the `routes` option
// You can pass in additional options here, but let's
// keep it simple for now.
const router =  createRouter({
  // 4. Provide the history implementation to use. We are using the hash history for simplicity here.
  history: createWebHashHistory(),
  routes, // short for `routes: routes`
})

export default router;