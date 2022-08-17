<template>
  <v-navigation-drawer floating permanent location="right">
    <v-timeline align="start" side="end">
      <v-timeline-item :dot-color="get_color(0)">
        Datei Hochladen
      </v-timeline-item>
      <v-timeline-item :dot-color="get_color(1)">
        Form Erstellen
      </v-timeline-item>
      <v-timeline-item :dot-color="get_color(2)">
        Flächen Markieren
      </v-timeline-item>
      <v-timeline-item :dot-color="get_color(3)">
        Perforierung Einstellen
      </v-timeline-item>
      <v-timeline-item :dot-color="get_color(4)">
        Anschluss Markieren
      </v-timeline-item>
      <v-timeline-item :dot-color="get_color(5)">
        Download
      </v-timeline-item>
    </v-timeline>
  </v-navigation-drawer>
</template>

<script>
export default {
  name: "Timeline",
  props: ['current_step'],
  methods: {
    get_color(step) {
      if (this.current_step === step) {
        return 'green'
      } else {
        return 'grey'
      }
    }
  }
}
</script>

<style scoped>

</style>