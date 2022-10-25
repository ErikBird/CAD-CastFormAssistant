<template>
  <v-container fluid class="fill-height">
    <v-card class="h-75">
      <v-card-title>Schritt 4 - Perforierung Einstellen</v-card-title>
        <div class="d-flex flex-row mb-6 justify-space-between">
        <v-slider
            :disabled="slider_disabled"
            min="0.1"
            max="2"
            width="200"
            @update:modelValue="place_hole_grid"
            class="ml-10 mr-10"
            v-model="radius"
            prepend-icon="mdi-radius"
        ></v-slider>
          <v-chip class="mr-5">{{ parseFloat(radius.toFixed(2)) }} mm</v-chip>
          <v-slider
              :disabled="slider_disabled"
            min="1.5"
            max="5"
            width="200"
            @update:modelValue="place_hole_grid"
            class="ml-10 mr-10"
            v-model="point_distance"
            prepend-icon="mdi-map-marker-distance"
        ></v-slider>
        <v-chip class="mr-5">{{ parseFloat(point_distance.toFixed(2)) }} mm</v-chip>
          <v-slider
              :disabled="slider_disabled"
            min="1"
            max="5"
            width="200"
            @update:modelValue="place_hole_grid"
            class="ml-10 mr-10"
            v-model="margin"
            prepend-icon="mdi-billiards-rack"
        ></v-slider>
        <v-chip class="mr-5">{{ parseFloat(point_distance.toFixed(2)) }} mm</v-chip>


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
            <AmbientLight color="#333333" :intensity="0.9"/>
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
        @click="next"
        >
          Weiter
        </v-btn>
      </v-card-actions>
  </v-container>
</template>

<script>
import * as THREE from "three";
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
import {MeshSurfaceSampler} from "three/examples/jsm/math/MeshSurfaceSampler";
import {CSG} from "three-csg-ts";

// https://www.reddit.com/r/proceduralgeneration/comments/9duuso/how_would_i_evenly_distribute_points_on_a_3d_mesh/
import {
  acceleratedRaycast,
  computeBoundsTree,
  CONTAINED,
  disposeBoundsTree,
  INTERSECTED,
  NOT_INTERSECTED
} from "three-mesh-bvh";
let targetMesh
let renderer, camera, scene, controls
let clientWidth, clientHeight
THREE.Mesh.prototype.raycast = acceleratedRaycast;
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
export default {
  name: "SelectFaces",
  props: ['geometry', 'faces', 'shell_thickness'],
  emits: ['setGeometry', 'setThickness'],
  components: {
    Plane, PhongMaterial, AmbientLight, Box, Camera, Renderer, PointLight,
    Scene, Sphere, StandardMaterial, Texture
  },
  data() {
    return {
      radius: 1,// point radius
      point_distance: 3, // Distance between the points
      margin: 3, // Minimal margin within the triangle before the points start
      slider_disabled: false,
      meshes: []
    }
  },
  mounted() {
    this.resizeRenderer()
    renderer = this.$refs.renderer.renderer;
    camera = this.$refs.camera.camera;
    scene = this.$refs.scene.scene;
    controls = this.$refs.renderer.three.cameraCtrl;

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

    // Mesh setup
    targetMesh = new THREE.Mesh(this.geometry, new THREE.MeshLambertMaterial({color:'#36454F'}));
    scene.add(targetMesh);

    // Camera Orientation setup
    targetMesh.geometry.computeBoundingBox();
    let box = new THREE.Box3()
    box.copy(targetMesh.geometry.boundingBox)
    let maximum_coordinate = Math.abs(Math.max(box.max.x, box.max.y, box.max.z))
    let distance = maximum_coordinate / Math.tan(25 * Math.PI / 180)
    camera.position.set(0, distance + 2, 0);

    camera.lookAt(new THREE.Vector3(0, 0, 0));
    this.place_hole_grid()
    window.addEventListener('resize', () => {
      this.resizeRenderer()
    });

  },
  methods: {
    next(){
      this.$emit('setRadius', this.radius)
      this.$emit('setPD', this.point_distance)
      this.$emit('setMargin', this.margin)
      this.$emit('setHoleMeshes', this.meshes)
      this.$emit('setStep', 4)
    },
    resizeRenderer() {
      const renderer = this.$refs.renderer;
      const camera = this.$refs.camera.camera;
      clientWidth = this.$refs.rendersize.$el.clientWidth
      clientHeight = this.$refs.rendersize.$el.clientHeight
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.three.setSize(clientWidth, clientHeight)
    },
    clear_meshes(){
      scene.children.forEach(function(child) {
        if(child instanceof THREE.Mesh){
          if (child.name === "sample") {
            child.geometry.dispose();
            child.material.dispose();
            scene.remove(child)
          }
        }
      });
      this.meshes = []
      renderer.renderLists.dispose();
    },
    place_hole_grid(){
      this.slider_disabled = true
      /* A function to check whether point P lies inside a Face */
      function isInside(triangle, p) {
        function numbersCloseEnoughToEqual(n1, n2) {
          return n1.toPrecision(4) === n2.toPrecision(4)
        }
        let A = triangle.getArea()
        let A1 = new THREE.Triangle(p, triangle.b, triangle.c).getArea()
        let A2 = new THREE.Triangle(triangle.a, p, triangle.c).getArea()
        let A3 = new THREE.Triangle(triangle.a, triangle.b, p).getArea()
        return numbersCloseEnoughToEqual(A, A1 + A2 + A3);
      }
      this.clear_meshes()

      let pos = targetMesh.geometry.attributes.position;


      let colors = [];
      let holeGeometry = new THREE.CylinderGeometry( this.radius, this.radius, this.shell_thickness+0.1, 8 ).toNonIndexed ();
      holeGeometry.center()
      for (let i = 0; i < holeGeometry.attributes.position.count; i++) {
        colors.push(1, 1, 1); // add for each vertex color data
      }
      let holeColorAttribute = new THREE.Float32BufferAttribute(colors, 3);
      holeGeometry.setAttribute('color', holeColorAttribute);
      let sampleMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000 } );
      for ( let i = 0; i < this.faces.length; i ++ ) {
        let face = this.faces[i]
        let face_normal = new THREE.Vector3(face.normal.x,face.normal.y,face.normal.z).normalize()

        let a = new THREE.Vector3()
            a.fromBufferAttribute(pos, face.a)
        let b = new THREE.Vector3()
            b.fromBufferAttribute(pos, face.b)
        let c = new THREE.Vector3()
            c.fromBufferAttribute(pos, face.c)
        let ab = a.clone().sub(b).normalize()
        let ac = a.clone().sub(c).normalize()
        let bc = b.clone().sub(c).normalize()
        let ba = b.clone().sub(a).normalize()
        let cb = c.clone().sub(b).normalize()
        let ca = c.clone().sub(a).normalize()

        let pos_a = a.addScaledVector ( ab, - this.margin ).addScaledVector ( ac, - this.margin )
        let pos_b = b.addScaledVector ( ba, - this.margin ).addScaledVector ( bc, - this.margin )
        let pos_c = c.addScaledVector ( ca, - this.margin ).addScaledVector ( cb, - this.margin )
        let face_with_margin = new THREE.Triangle(pos_a,pos_b,pos_c)

        for (let vec_len = 0; vec_len <= pos_a.distanceTo(pos_c) ;  vec_len += this.point_distance){
          let row_num = 0
          let point_pos = pos_a.clone().addScaledVector ( ac, - vec_len ).addScaledVector ( bc, row_num * this.point_distance  )
          while (isInside(face_with_margin, point_pos||row_num<1)){
          //  while(row_num<6){
            let sampleGeometry = holeGeometry.clone()
            let sampleMesh = new THREE.Mesh( sampleGeometry, sampleMaterial );
            point_pos.addScaledVector ( face_normal, - this.shell_thickness * 0.5)
            sampleMesh.lookAt( face_normal );
            sampleMesh.position.copy( point_pos );
            sampleMesh.rotateX( Math.PI / 2 );
            // Make sure the .matrix of each mesh is current
            sampleMesh.updateMatrix();
            sampleMesh.name = "sample"; // To keep track of all intersections and dispose them on parameter change
            this.meshes.push(sampleMesh.clone())
            scene.add( sampleMesh );
            row_num ++
            point_pos = pos_a.clone().addScaledVector ( ac, - vec_len ).addScaledVector ( bc, row_num * this.point_distance  )
          }
        }
      }
      this.slider_disabled = false
    },
  }
}
</script>

<style scoped>

</style>