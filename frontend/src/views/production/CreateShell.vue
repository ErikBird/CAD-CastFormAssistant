<template>
  <v-container fluid class="fill-height">
    <v-card class="h-75">
      <v-card-title>Schritt 2 - Form Erstellen</v-card-title>
      <div class="d-flex flex-row mb-6 justify-space-between">
        <v-slider
            min="0.1"
            max="5"
            width="200"
            @update:modelValue="create_shell"
            class="ml-10 mr-10"
            v-model="thickness"
            prepend-icon="mdi-arrow-expand-vertical"
        ></v-slider>
        <v-chip class="mr-5">{{ parseFloat(thickness.toFixed(2)) }} mm</v-chip>

      </div>
      <v-card-text
          ref="rendersize"
          class="h-75"
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
      </v-card-text>


    </v-card>
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
      thickness: 1,
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

    let material = new THREE.MeshLambertMaterial({color:0xff0000})
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

    const axesHelper = new THREE.AxesHelper( 5 );
    scene.add( axesHelper );

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
        color:'#36454F',
        transparent: true,
        opacity: 0.8
    })

      let loader = new THREE.BufferGeometryLoader();
      this.loading=true;
      let merged_geometry = loader.parse(await CSG_Tool.create_shell(geometry.toJSON(), length))

      if (shell_mesh !== undefined){
        shell_mesh.geometry.dispose();
        shell_mesh.material.dispose();
        scene.remove( shell_mesh );
      }
      shell_mesh = new THREE.Mesh( merged_geometry, material );

      scene.add( shell_mesh );
      this.$emit('setThickness', this.thickness)
      this.$emit('setGeometry', merged_geometry)
    },

    insideOut(geometry) {
      let position = geometry.getAttribute('position');
      let invertedPositions = new Float32Array(position.array.length);
      for (let p = 0; p < position.array.length; p += 9) {
        // https://newbedev.com/in-what-order-should-i-send-my-vertices-to-opengl-for-culling
        // Change the order~direction of the triangle
        //  A
        //  |\
        //  | \
        //  |  \
        //  B---C
        // A->B->C would be front facing (counter-clockwise order), A->C->B would be rear-facing (clockwise order).
        // One has to flip two points

        // A -> B
        invertedPositions[p + 3] = position.array[p]
        invertedPositions[p + 4] = position.array[p + 1]
        invertedPositions[p + 5] = position.array[p + 2]
        // B -> A
        invertedPositions[p] = position.array[p + 3]
        invertedPositions[p + 1] = position.array[p + 4]
        invertedPositions[p + 2] = position.array[p + 5]
        // C -> C
        invertedPositions[p + 6] = position.array[p + 6]
        invertedPositions[p + 7] = position.array[p + 7]
        invertedPositions[p + 8] = position.array[p + 8]
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(invertedPositions, 3));
    },
    dilute_geometry(geometry, length, visualize_normals = false) {
      let compute_normals = function (normal, position) {
        // create new normals
        const vertices_normals = {}
        for (let f = 0; f < normal.array.length; f += 3) {
          let dir = new THREE.Vector3(normal.array[f], normal.array[f + 1], normal.array[f + 2])
          dir.normalize()
          origin = new THREE.Vector3(position.array[f], position.array[f + 1], position.array[f + 2]);

          let key = [origin.x, origin.y, origin.z].join(',')
          let normals = [dir]
          if (Object.hasOwn(vertices_normals, key)) {
            normals = [...vertices_normals[key], dir]
          }
          vertices_normals[key] = normals
        }
        return vertices_normals;
      };
      geometry.computeVertexNormals();
      geometry.normalizeNormals()
      let geometry_copy = geometry.clone()
      let normal = geometry.getAttribute('normal');
      let position = geometry.getAttribute('position');
      let vertices_normals = compute_normals(normal, position)
      let dilutedVertes = new Float32Array(normal.array.length);
      let scene = this.$refs.scene
      for (let f = 0; f < normal.array.length; f += 3) {

        let normals_array = vertices_normals[[position.array[f], position.array[f + 1], position.array[f + 2]].join(',')]
        let x = 0
        let y = 0
        let z = 0
        for (let idx = 0; idx < normals_array.length; idx++) {
          x += normals_array[idx].x
          y += normals_array[idx].y
          z += normals_array[idx].z
        }
        if (visualize_normals){
          let origin = new THREE.Vector3(position.array[f], position.array[f + 1], position.array[f + 2]);
          let dir = new THREE.Vector3(x/normals_array.length, y/normals_array.length, z/normals_array.length);
          let helper = new THREE.ArrowHelper(dir, origin, length, 0x00ff00);
          helper.position.copy(origin);

          scene.add(helper);
        }
        dilutedVertes[f] = position.array[f] + x / normals_array.length * length
        dilutedVertes[f + 1] = position.array[f + 1] + y / normals_array.length * length
        dilutedVertes[f + 2] = position.array[f + 2] + z / normals_array.length * length
      }
      geometry_copy.setAttribute('position', new THREE.BufferAttribute(dilutedVertes, 3));
      return geometry_copy
    },
  }
}
</script>

<style scoped>

</style>