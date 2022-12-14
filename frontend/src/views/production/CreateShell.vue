<template>
  <v-container fluid class="fill-height">
    <v-sheet class="h-75"
          ref="rendersize"
          height="100%"
          justify="center"
          align="center">
        <Renderer antialias shadow ref="renderer" :orbit-ctrl="{ enableDamping: true, dampingFactor: 0.05 }">
          <Camera ref="camera"/>
          <Scene ref="scene" background="#ffffff">
            <AmbientLight :intensity="0.9"/>
            <PointLight color="#ffffff"/>
            <PointLight color="#ffffff" :intensity="0.5" :position="{ x:-1000, y:-1000}"/>
            <PointLight color="#ffffff" :intensity="0.5" :position="{ x:1000, y:1000}"/>
            <PointLight color="#ffffff" :intensity="0.5" :position="{ x:-1000, y:1000}"/>
            <PointLight color="#ffffff" :intensity="0.5" :position="{ x:1000, y:-1000}"/>
            <PointLight color="#ffffff" :intensity="0.5" :position="{ x: 0, y: 1500, z: 200}"/>
          </Scene>
        </Renderer>
    </v-sheet>
    <v-card class="mt-2">
      <v-card-title>Schritt 2 - Form Erstellen</v-card-title>
      <div class="d-flex flex-row mb-6 justify-space-between">
        <v-slider
            min="0"
            max="0.4"
            width="200"
            class="ml-10 mr-10"
            v-model="thickness"
            prepend-icon="mdi-arrow-expand-vertical"
        ></v-slider>
        <v-text-field
            variant="outlined"
            v-model="thickness"
            suffix="mm"
        ></v-text-field>
         <v-progress-circular
             v-if="loading"
          indeterminate
          color="primary"
        ></v-progress-circular>
        <v-btn v-if="!loading" class="ml-5 mr-5 mt-2" rounded color="secondary" @click="create_shell"> Update</v-btn>
      </div>
          <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
          variant="flat"
          color="primary"
          @click="$emit('setStep', 2)"
      >
        Weiter
      </v-btn>

    </v-card-actions>
    </v-card>
  </v-container>
</template>

<script>
import * as THREE from "three";
import * as Comlink from "comlink";
import {
  AmbientLight,
  Box,
  Camera,
  PhongMaterial,
  Plane,
  PointLight,
  Renderer,
  Scene,
  Sphere,
  StandardMaterial,
  Texture
} from 'troisjs';
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils";
import {VertexNormalsHelper} from "three/examples/jsm/helpers/VertexNormalsHelper";

let initial_mesh, shell_mesh
let CSG_Tool = new ComlinkWorker(new URL('/workers/webworker.js', import.meta.url), {})
export default {
  name: "CreateShell",
  props: ['initial_geometry'],
  emits: ['setGeometry', 'setThickness'],
  components: {
    Plane, PhongMaterial, AmbientLight, Box, Camera, Renderer, PointLight,
    Scene, Sphere, StandardMaterial, Texture
  },
  data() {
    return {
      thickness: 0.2,
      loading: false,
    }
  },
  mounted() {
    this.resizeRenderer()
    let scene = this.$refs.scene
    const renderer = this.$refs.renderer;
    const camera = this.$refs.camera.camera;

    // ADD PLANE
    const planeGeometry = new THREE.PlaneGeometry(2000, 2000);
    planeGeometry.rotateX(-Math.PI / 2);
    const planeMaterial = new THREE.ShadowMaterial({color: 0x000000, opacity: 0.2});
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.position.y = -200;
    plane.receiveShadow = true;
    scene.add(plane);
    const helper = new THREE.GridHelper(2000, 100);
    helper.position.y = -199;
    helper.material.opacity = 0.25;
    helper.material.transparent = true;
    scene.add(helper);

    let material = new THREE.MeshLambertMaterial({color: 0xff0000})
    initial_mesh = new THREE.Mesh(this.initial_geometry, material);
    initial_mesh.geometry.center();
    scene.add(initial_mesh);

    // Camera Orientation setup
    initial_mesh.geometry.computeBoundingBox();
    let box = new THREE.Box3()
    box.copy(initial_mesh.geometry.boundingBox)
    let maximum_coordinate = Math.abs(Math.max(box.max.x, box.max.y, box.max.z))
    let distance = maximum_coordinate / Math.tan(25 * Math.PI / 180)
    camera.position.set(0, distance + 2, 0);
    camera.lookAt(initial_mesh);
    window.addEventListener('resize', () => {
      this.resizeRenderer()
    });

    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    this.create_shell()
  },
  methods: {
    resizeRenderer() {
      const renderer = this.$refs.renderer;
      const camera = this.$refs.camera.camera;
      let clientWidth = this.$refs.rendersize.$el.clientWidth
      let clientHeight = this.$refs.rendersize.$el.clientHeight
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.three.setSize(clientWidth, clientHeight)
    },
    async create_shell() {
      let scene = this.$refs.scene
      let geometry = this.initial_geometry
      let length = this.thickness

      const material = new THREE.MeshLambertMaterial({
        color: '#36454F',
        transparent: true,
        opacity: 0.8
      })

      let loader = new THREE.BufferGeometryLoader();
      this.loading=true;
      let merged_geometry = loader.parse(await CSG_Tool.create_shell(geometry.toJSON(), length))

      if (shell_mesh !== undefined) {
        shell_mesh.geometry.dispose();
        shell_mesh.material.dispose();
        scene.remove(shell_mesh);
      }
      shell_mesh = new THREE.Mesh(merged_geometry, material);

      scene.add(shell_mesh);
      this.$emit('setThickness', this.thickness)
      this.$emit('setGeometry', merged_geometry)
      this.loading=false;
    },
  }
}
</script>

<style scoped>

</style>