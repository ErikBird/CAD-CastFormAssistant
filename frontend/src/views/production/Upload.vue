<template>
  <v-container>
<v-card >
    <v-card-title>Schritt 1 - Datei Hochladen</v-card-title>
    <v-card-text width="100%">
      <v-file-input
        ref="file"
        :value="InitialGeometry"
        @change="this.getGeometryFromPath()"
        label="STL Datei"
        type="file"
        accept=".stl"
      >
      </v-file-input>
    </v-card-text>
  </v-card>
      <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
          variant="flat"
          color="primary"
          @click="$emit('setStep', 1)"
          :disabled="InitialGeometry===null"
        >
          Weiter
        </v-btn>
    </v-card-actions>

  </v-container>
</template>

<script>
import {STLLoader} from "three/examples/jsm/loaders/STLLoader";
import * as THREE from "three";

export default {
  name: "Upload",
  props: ['InitialGeometry'],
  emits: ['SetGeometry'],
  methods:{
    getGeometryFromPath() {
      let file = this.$refs.file.files[0];
      let url = URL.createObjectURL(file)
      let loader = new STLLoader();
      loader.load( url,  ( geometry ) => {
        this.$emit('SetGeometry', geometry)
      });
    }
  },
}

</script>

<style scoped>

</style>