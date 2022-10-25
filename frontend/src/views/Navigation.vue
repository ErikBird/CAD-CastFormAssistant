<template>
  <v-app>
   <DashboardCoreDrawer/>
    <DashboardCoreView/>
  </v-app>
</template>


<script lang="ts">
import { defineComponent } from 'vue'
import DashboardCoreDrawer from '../components/core/AppDrawer.vue'
import DashboardCoreView from'../components/core/View.vue'

export default defineComponent({
  name: 'Navigation',

  components: {
    DashboardCoreDrawer,
    DashboardCoreView
  },
})
</script>
