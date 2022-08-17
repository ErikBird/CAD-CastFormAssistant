<template>
      <v-navigation-drawer color="transparent" permanent floating>
              <v-list
                nav
                dense
                rounded>
          <v-list-item to="/production" prepend-icon="mdi-chart-timeline-variant" title="Produktion" value="produktion"></v-list-item>
          <v-list-item disabled prepend-icon="mdi-printer-3d" title="Druckhistorie" value="supervisors"></v-list-item>
          <v-list-item disabled prepend-icon="mdi-flask" title="Verbrauch" value="clockin"></v-list-item>
        </v-list>
    </v-navigation-drawer>
</template>

<script>
export default {
  name: "DashboardCoreDrawer",
  props: ['user_menu'],
}
</script>

<style scoped>

</style>