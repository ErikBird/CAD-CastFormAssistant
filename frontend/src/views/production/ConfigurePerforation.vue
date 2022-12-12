<template>
  <v-container fluid class="fill-height">
    <v-sheet
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
    </v-sheet>
    <v-card class="mt-2">
      <v-card-title>Schritt 4 - Perforierung Einstellen</v-card-title>
      <v-card-text>
        <div class="d-flex flex-row mb-6 justify-space-between">
          <v-slider
              min="0.1"
              max="2"
              width="200"
              class="ml-10 mr-10"
              v-model="radius"
              prepend-icon="mdi-radius"
          ></v-slider>
          <v-chip class="mr-5">{{ parseFloat(radius.toFixed(2)) }} mm</v-chip>
          <v-slider
              min="1.5"
              max="5"
              width="200"
              class="ml-10 mr-10"
              v-model="point_distance"
              prepend-icon="mdi-map-marker-distance"
          ></v-slider>
          <v-chip class="mr-5">{{ parseFloat(point_distance.toFixed(2)) }} mm</v-chip>
          <v-slider
              min="1"
              max="5"
              width="200"
              class="ml-10 mr-10"
              v-model="margin"
              prepend-icon="mdi-billiards-rack"
          ></v-slider>
          <v-chip class="mr-5">{{ parseFloat(point_distance.toFixed(2)) }} mm</v-chip>
          <v-progress-circular
              v-if="loading"
              indeterminate
              color="primary"
          ></v-progress-circular>
          <v-btn v-if="!loading" class="ml-5 mr-5" rounded color="secondary" @click="place_hole_grid"> Update</v-btn>
        </div>
      </v-card-text>
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


    </v-card>
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
  props: ['geometry', 'indices', 'shell_thickness', 'triangles'],
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
      meshes: [],
      loading: false
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
    targetMesh = new THREE.Mesh(this.geometry, new THREE.MeshLambertMaterial({
      color: '#36454F',
    }));

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
    next() {
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
    clear_meshes() {
      scene.children.forEach(function (child) {
        if (child instanceof THREE.Mesh) {
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
    place_sphere(position) {
      let geometry = new THREE.SphereGeometry(0.2, 32, 16);
      geometry.center()
      let sampleMesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({color: 0xff0000}));
      sampleMesh.position.copy(position);
      this.meshes.push(sampleMesh.clone())
      scene.add(sampleMesh);
    },
    place_hole(point_pos, face_normal) {
      let sampleGeometry = new THREE.CylinderGeometry(this.radius, this.radius, this.shell_thickness + 0.1, 8).toNonIndexed()
      let sampleMesh = new THREE.Mesh(sampleGeometry, new THREE.MeshBasicMaterial({color: 0xff0000}));
      point_pos.addScaledVector(face_normal, -this.shell_thickness * 0.5)
      sampleMesh.lookAt(face_normal);
      sampleMesh.position.copy(point_pos.clone());
      sampleMesh.rotateX(Math.PI / 2);
      // Make sure the .matrix of each mesh is current
      sampleMesh.updateMatrix();
      sampleMesh.name = "sample"; // To keep track of all intersections and dispose them on parameter change
      this.meshes.push(sampleMesh.clone())
      scene.add(sampleMesh);
    },
    test_triangles() {
      for (let triangle of this.triangles) {

        let face_normal = new THREE.Vector3();
        triangle.getNormal(face_normal);
        face_normal.normalize()


        let a = triangle.a
        let b = triangle.b
        let c = triangle.c

        this.place_sphere(a)
        this.place_sphere(b)
        this.place_sphere(c)
      }
    },

    add_arrow(dir, origin) {
      const arrowHelper = new THREE.ArrowHelper(dir, origin, 5, 0xffff00);
      scene.add(arrowHelper);
    },
    get_hypotenuse(triangle) {
      /*
      * Returns the start and end point of the hypotenuses as well as the third point in the triangle
      * */
      let a = triangle.a.clone()
      let b = triangle.b.clone()
      let c = triangle.c.clone()
      let hypo_start, hypo_end, third
      let hypotenuse_length = Math.max(a.distanceTo(b), a.distanceTo(c), b.distanceTo(c))

      switch (hypotenuse_length) {
        case a.distanceTo(b):
          hypo_start = a.clone()
          hypo_end = b.clone()
          third = c.clone()
          break;
        case a.distanceTo(c):
          hypo_start = a.clone()
          hypo_end = b.clone()
          third = c.clone()
          break;
        case b.distanceTo(c):
          hypo_start = b.clone()
          hypo_end = c.clone()
          third = a.clone()
          break;
        default:
          console.error('Error while determining the hypotenuse of triangle:', triangle)
      }
      return {hypo_start, hypo_end, third, hypotenuse_length};
    },
    get_vectors(triangle) {
      let {hypo_start, hypo_end, third, hypotenuse_length} = this.get_hypotenuse(triangle)
      let hypo = hypo_end.clone().sub(hypo_start).normalize()
      //this.add_arrow(hypo, hypo_start)

      //this.place_sphere(hypo_start)
      //this.place_sphere(hypo_end)

      let vector = third.clone().sub(hypo_start)
      // http://immersivemath.com/ila/ch03_dotproduct/ch03.html
      //  Orthogonal Projection
      let projection_vector = hypo.multiplyScalar(vector.dot(hypo) / hypo.lengthSq())
      let middle_point = hypo_start.clone().add(projection_vector)
      let height = middle_point.distanceTo(third)
      let ortho = third.clone().sub(middle_point).normalize()
      //this.place_sphere(middle_point)
      //this.add_arrow(ortho, middle_point)
      return {hypo_start, hypo, ortho, hypotenuse_length, height}
    },
    shrink_triangle_by_margin(triangle, margin) {
      let a = triangle.a.clone()
      let b = triangle.b.clone()
      let c = triangle.c.clone()


      let ab = a.clone().sub(b).normalize()
      let ac = a.clone().sub(c).normalize()
      let bc = b.clone().sub(c).normalize()
      let ba = b.clone().sub(a).normalize()
      let cb = c.clone().sub(b).normalize()
      let ca = c.clone().sub(a).normalize()

      let pos_a = a.addScaledVector(ab, -margin).addScaledVector(ac, -margin)
      let pos_b = b.addScaledVector(ba, -margin).addScaledVector(bc, -margin)
      let pos_c = c.addScaledVector(ca, -margin).addScaledVector(cb, -margin)
      return new THREE.Triangle(pos_a, pos_b, pos_c)
    },
    perforate(triangle) {
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

      let {hypo_start, hypo, ortho, hypotenuse_length, height} = this.get_vectors(triangle)
      let face_normal = new THREE.Vector3();
      triangle.getNormal(face_normal);
      face_normal.normalize()
      for (let vec_length = 0; vec_length <= hypotenuse_length; vec_length += this.point_distance) {
        for (let vec_height = 0; vec_height <= height; vec_height += this.point_distance) {
          let point_pos = hypo_start.clone().addScaledVector(hypo.normalize(), vec_length + this.margin).addScaledVector(ortho.normalize(), vec_height + this.margin)
          if (isInside(this.shrink_triangle_by_margin(triangle, this.margin), point_pos)) {

            this.place_hole(point_pos, face_normal)
          }
        }
      }

    },
    place_hole_grid() {
      //this.test_triangles()
      this.clear_meshes()
      for (let triangle of this.triangles) {
        this.perforate(triangle);
      }

    }
  }
}
</script>

<style scoped>

</style>