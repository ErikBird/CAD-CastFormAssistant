<template>
  <v-navigation-drawer floating permanent location="right" class="mt-10">
    <v-timeline align="start" side="end" truncate-line="both">
      <v-timeline-item :dot-color="get_color(0)" fill-dot>
        Datei Hochladen
      </v-timeline-item>
      <v-timeline-item :dot-color="get_color(1)" fill-dot>
        Form Erstellen
      </v-timeline-item>
      <v-timeline-item :dot-color="get_color(2)" fill-dot>
        Flächen Markieren
      </v-timeline-item>
      <v-timeline-item :dot-color="get_color(3)" fill-dot>
        Perforierung Einstellen
      </v-timeline-item>
      <v-timeline-item :dot-color="get_color(4)" fill-dot>
        Anschluss Markieren
      </v-timeline-item>
      <v-timeline-item :dot-color="get_color(5)" fill-dot>
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