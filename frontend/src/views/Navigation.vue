<template>
  <v-app>
    <!--DashboardCoreAppBar/-->
   <DashboardCoreDrawer/>
    <DashboardCoreView/>
    <!--SelectTriangleExample/-->
  </v-app>
</template>


<script lang="ts">
import { defineComponent } from 'vue'
import DashboardCoreAppBar from '../components/core/AppBar.vue'
import DashboardCoreDrawer from '../components/core/AppDrawer.vue'
import DashboardCoreView from'../components/core/View.vue'
import SelectTriangleExample from "../components/SelectTriangleExample.vue";

export default defineComponent({
  name: 'Navigation',

  components: {
    SelectTriangleExample,
    DashboardCoreAppBar,
    DashboardCoreDrawer,
    DashboardCoreView
  },
})
</script>
