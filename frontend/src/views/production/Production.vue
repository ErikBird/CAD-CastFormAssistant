<template>
  <Timeline :current_step=step></Timeline>
  <Upload
      v-if="step===0"
      @setStep="setStep"
      @set-geometry="setGeometry"/>
  <CreateShell
      v-if="step===1"
      :initial_geometry="initialGeometry"
      @setStep="setStep"
      @set-thickness="setThickness"
      @set-geometry="setShellGeometry"/>
  <SelectFaces
      v-if="step===2"
      :initial_geometry="shellGeometry"
      @setStep="setStep"
      @set-geometry="setShellGeometry"
      @add-triangle="addSelectedTriangle"
      @delete-triangle="deleteSelectedTriangle"
      @set-indices="setSelectedIndices"/>
    <ConfigurePerforation
        v-if="step===3"
        :geometry="shellGeometry"
        :shell_thickness="shellThickness"
        :indices="selectedIndices"
        :triangles="getSelectedTriangles()"
        @setStep="setStep"
        @set-radius="setRadius"
        @set-pd="setPointDistance"
        @set-margin="setMargin"
        @set-hole-meshes="setHoleMeshes"
    />
  <PlaceAdapter
  v-if="step===4"
  @set-adapter-meshes="setAdapterMeshes"
  @setStep="setStep"
  @add-hole-meshes="addHoleMeshes"
  :shell_thickness="shellThickness"
  :geometry="shellGeometry"
  :meshes="subtractMeshes"
  />
  <Generation
      v-if="step===5"
      :geometry="shellGeometry"
      :holeMeshes="subtractMeshes"
      :adapterMeshes="unionMeshes"
      />
</template>

<script>
import * as stableStringify from 'json-stable-stringify';
import Timeline from "./Timeline.vue";
import Upload from "./Upload.vue";
import SelectFaces from "./SelectFaces.vue";
import CreateShell from "./CreateShell.vue";
import ConfigurePerforation from "./ConfigurePerforation.vue"
import PlaceAdapter from "./PlaceAdapter.vue"
import Generation from './Generation.vue'
export default {
  name: "Production",
  components: {CreateShell, SelectFaces, Upload, Timeline, ConfigurePerforation, PlaceAdapter, Generation},
  data () {
    return {
      step: 0,
      initialGeometry: null,
      shellThickness: null,
      shellGeometry: null,
      selectedIndices: [],
      selectedTriangles: new Map(),
      subtractMeshes: [],
      unionMeshes: [],
      holeRadius: null,
      holeDistance: null,
      holeBorderMargin: null,
    }
  },
  methods: {
    async getHashFromObject(obj) {
      function buf2Base64(buffer) {
        return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)));
      }

      let inputBytes = new TextEncoder().encode(stableStringify(obj));
      return buf2Base64(await window.crypto.subtle.digest('SHA-256', inputBytes));
    },
    setStep(n) {
      this.step = n
    },
    setGeometry(geometry) {
      this.initialGeometry = geometry
    },
    setThickness(thickness) {
      this.shellThickness = thickness
    },
    setShellGeometry(geometry) {
      this.shellGeometry = geometry
    },
    async addSelectedTriangle(triangle) {
      let hash = await this.getHashFromObject(triangle)
      this.selectedTriangles.set(hash, triangle)
    },
    async deleteSelectedTriangle(triangle) {
      this.selectedTriangles.delete(await this.getHashFromObject(triangle))
    },
    getSelectedTriangles() {
      return Array.from(this.selectedTriangles.values())
    },
    setSelectedIndices(indeces) {
      this.selectedIndices = indeces
    },
    setHoleMeshes(meshes) {
      this.subtractMeshes = meshes
    },
    addHoleMeshes(meshes) {

      this.subtractMeshes.push(...meshes)
    },
    setAdapterMeshes(meshes){
      this.unionMeshes = meshes
    },
    setRadius(radius){
      this.holeRadius = radius
    },
    setPointDistance(point_distance){
      this.holeDistance = point_distance
    },
    setMargin(margin){
      this.holeBorderMargin = margin
    }
  }
}
</script>

<style scoped>

</style>