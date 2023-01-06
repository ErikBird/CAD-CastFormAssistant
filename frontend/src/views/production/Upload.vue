<template>
  <v-sheet height="100%" class="d-flex justify-end align-center">
    <v-card class='ma-5' width="50%">
      <v-card-title>Schritt 1 - Datei Hochladen</v-card-title>
      <v-card-text>
        Wir unterstützen STL und OBJ Dateien bis 10 MB.
        <v-progress-linear
            v-if="loading"
            :model-value="loadValue"
            indeterminate
            height="10"
        ></v-progress-linear>

        <v-file-input
            v-if="!loading"
            ref="file"
            :rules="rules"
            :value="InitialGeometry"
            @change="this.getGeometryFromPath()"
            label="3D Model hochladen"
            type="file"
            variant="outlined"
            accept="model/stl, model/obj"
        >
        </v-file-input>
      </v-card-text>
    </v-card>
  </v-sheet>
</template>

<script>
import {STLLoader} from "three/examples/jsm/loaders/STLLoader";
import {OBJLoader} from "three/examples/jsm/loaders/OBJLoader";

export default {
  name: "Upload",
  data() {
    return {
      loading: false,
      loadValue: 0,
      rules: [
      value => {
        return !value || !value.length || value[0].size < 10000000 || 'Model size should be less than 10 MB!'
      },],
    }
  },
  props: ['InitialGeometry'],
  emits: ['SetGeometry', 'setStep'],
  methods: {
    onProgress(xhr) {
      if (xhr.lengthComputable) {
        const percentComplete = xhr.loaded / xhr.total * 100;
        this.loadValue = Math.round(percentComplete, 2);
      }
    },
    getGeometryFromPath() {
      let file = this.$refs.file.files[0];
      let url = URL.createObjectURL(file)
      if (file.size < 10000000) {

        if (file.type === 'model/stl') {
          this.loading = true
          let loader = new STLLoader();
          loader.load(url, (geometry) => {
            this.loading = false
            this.$emit('SetGeometry', geometry)
            this.$emit('setStep', 1)
          }, this.onProgress);
        } else if (file.type === 'model/obj') {
          this.loading = true
          let loader = new OBJLoader();
          loader.load(url, (obj) => {
            this.loading = false
            this.$emit('SetGeometry', obj.children[0].geometry)
            this.$emit('setStep', 1)
          }, this.onProgress);
        } else {
          console.log(file.type)
          alert('Something went wront with the file format. No loader has been found.')
        }
      }
    }
  },
}

</script>

<style scoped>

</style>