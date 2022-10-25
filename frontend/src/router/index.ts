import {createRouter, createWebHashHistory} from 'vue-router';

import Navigation from '../views/Navigation.vue'
import Production from '../views/production/Production.vue'

const routes = [
    {
        path: '/',
        name: 'home',
        redirect: '/production',
        component: Navigation,
        children:
            [
                {
                    path: '/production',
                    name: 'production',
                    component: Production
                }
            ]
    },

]
const router = createRouter({
    history: createWebHashHistory(),
    routes: routes
})

export default router;