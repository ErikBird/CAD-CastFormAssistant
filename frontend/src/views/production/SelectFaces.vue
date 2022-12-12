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
      <v-card-title>Schritt 3 - Fläche Markieren</v-card-title>
      <v-card-actions>
        <v-btn-toggle
            v-model="brush_mode"
            rounded="0"
            color="deep-purple-accent-3"
            group
        >
          <v-btn :value=this.modes[0]>
            Markieren
          </v-btn>

          <v-btn :value=this.modes[1]>
            Rotieren
          </v-btn>

          <v-btn :value=this.modes[2]>
            Löschen
          </v-btn>
        </v-btn-toggle>
        <v-slider
            min="0.1"
            max="10"
            width="200"
            class="ml-10 mr-10"
            v-model="brush_size"
            prepend-icon="mdi-arrow-expand-vertical"
        ></v-slider>
        {{ brush_size.toFixed(2) }} mm
        <v-spacer></v-spacer>
        <v-btn
            variant="flat"
            color="primary"
            @click="$emit('setStep', 3)"
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

let mouse = new THREE.Vector2();
let targetMesh, brushMesh
let brushActive = false;
let renderer, camera, scene, controls
let canvasWidth, canvasHeight, canvasOffsetLeft, canvasOffsetTop
let color_default = new THREE.Color(0x36454F);
let color_marked = new THREE.Color(0x009900);
THREE.Mesh.prototype.raycast = acceleratedRaycast;
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
export default {
  name: "SelectFaces",
  props: ['initial_geometry'],
  emits: ['setIndices', 'setGeometry', 'addTriangle', 'deleteTriangle'],
  components: {
    Plane, PhongMaterial, AmbientLight, Box, Camera, Renderer, PointLight,
    Scene, Sphere, StandardMaterial, Texture
  },
  data() {
    return {
      modes: ['mark', 'rotate', 'delete'],
      selected_faces: [],
      brush_size: 5,
      brush_mode: "rotate",
    }
  },
  watch: {
    // Handle Orbit Controls depending on Brush Mode
    brush_mode(newBrush, oldBrush) {
      switch (newBrush) {
        case "delete":
        case "mark":
          controls.enabled = false;
          break;
        case "rotate":
          controls.enabled = true;
          break;
        default:
          console.error(`${newBrush} - Brush Mode not found!`);
      }
    }
  },
  mounted() {
    renderer = this.$refs.renderer;
    camera = this.$refs.camera.camera;
    scene = this.$refs.scene.scene;
    controls = this.$refs.renderer.three.cameraCtrl;

    this.resize_renderer()
    this.add_plane_to_scene()
    this.add_brush_to_scene()
    this.add_geometry_to_scene(this.initial_geometry)
    this.setup_camera_orientation()

    renderer.onBeforeRender(this.render);

    window.addEventListener('resize', () => {
      this.resize_renderer()
    });
    window.addEventListener('pointermove', (e) => {
      this.update_relative_mouse_position(e)
      // Orbit Controls are always disabled whenever the brush is active in some sort
      if (controls.enabled === false) {
        this.show_brush_on_intersection()
      }
    });
    window.addEventListener('pointerup', function (e) {
      brushActive = false;
    }, true);
    window.addEventListener('pointerdown', function (e) {
      brushActive = true;
    }, true);
  },
  methods: {
    update_relative_mouse_position(e) {
      let x = e.clientX
      let y = e.clientY
      // Unfortuinately I don't know why it is -10
      mouse.x = ((x - canvasOffsetLeft) / canvasWidth) * 2 - 1;
      mouse.y = (-((y - canvasOffsetTop) / canvasHeight) * 2) + 1;
    },
    setup_camera_orientation() {
      targetMesh.geometry.computeBoundingBox();
      let box = new THREE.Box3()
      box.copy(targetMesh.geometry.boundingBox)
      let maximum_coordinate = Math.abs(Math.max(box.max.x, box.max.y, box.max.z))
      let distance = maximum_coordinate / Math.tan(25 * Math.PI / 180)
      camera.position.set(0, distance + 2, 0);
      camera.lookAt(new THREE.Vector3(0, 0, 0));
    },
    add_brush_to_scene() {
      const brushGeometry = new THREE.SphereBufferGeometry(1, 40, 40);
      const brushMaterial = new THREE.MeshStandardMaterial({
        color: 0xEC407A,
        roughness: 0.75,
        metalness: 0,
        transparent: true,
        opacity: 0.5,
        premultipliedAlpha: true,
        emissive: 0xEC407A,
        emissiveIntensity: 0.5,
      });

      brushMesh = new THREE.Mesh(brushGeometry, brushMaterial);
      scene.add(brushMesh);
    },
    add_geometry_to_scene(geometry) {
      this.add_color_to_geometry(geometry)
      targetMesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({vertexColors: true}));
      targetMesh.geometry.computeBoundsTree();
      // Add the raycast function. Assumes the BVH is available on
      // the `boundsTree` variable
      THREE.Mesh.prototype.raycast = acceleratedRaycast;
      targetMesh.geometry.computeVertexNormals()
      // Update Geometry such that it contains the index to reference the selected faces
      this.$emit('setGeometry', targetMesh.geometry)
      scene.add(targetMesh);
      let wireframe = new THREE.WireframeGeometry(this.initial_geometry);

      let line = new THREE.LineSegments(wireframe);

      line.material.color.setHex(0x000000);

      scene.add(line);
    },
    add_color_to_geometry(geometry) {
      const positionAttribute = geometry.getAttribute('position');
      const colors = [];
      for (let i = 0; i < positionAttribute.count; i++) {
        colors.push(color_default.r, color_default.g, color_default.b); // add for each vertex color data
      }
      const colorAttribute = new THREE.Float32BufferAttribute(colors, 3);
      geometry.setAttribute('color', colorAttribute);
    },
    add_plane_to_scene() {
      let planeGeometry = new THREE.PlaneGeometry(2000, 2000);
      planeGeometry.rotateX(-Math.PI / 2);
      let planeMaterial = new THREE.ShadowMaterial({color: 0x000000, opacity: 0.2});
      let plane = new THREE.Mesh(planeGeometry, planeMaterial);
      plane.position.y = -200;
      plane.receiveShadow = true;
      scene.add(plane);
      let helper = new THREE.GridHelper(2000, 100);
      helper.position.y = -199;
      helper.material.opacity = 0.25;
      helper.material.transparent = true;
      scene.add(helper);
    },
    resize_renderer() {
      canvasWidth = this.$refs.rendersize.$el.clientWidth
      canvasHeight = this.$refs.rendersize.$el.clientHeight

      canvasOffsetLeft = this.$refs.rendersize.$el.getBoundingClientRect().left
      canvasOffsetTop = this.$refs.rendersize.$el.getBoundingClientRect().top
      camera.aspect = canvasWidth / canvasHeight;
      camera.updateProjectionMatrix();
      renderer.three.setSize(canvasWidth, canvasHeight)
    },
    select_face(intersection) {
      const colorAttr = intersection.object.geometry.getAttribute('color');
      const face = intersection.face;
      let color = new THREE.Color(0x009900);
      let face_color = new THREE.Color().fromBufferAttribute(colorAttr, face.a)
      if (color.getHex() !== face_color.getHex()) {
        this.selected_faces.push(face)
        this.$emit('setFaces', this.selected_faces)
        colorAttr.setXYZ(face.a, color.r, color.g, color.b);
        colorAttr.setXYZ(face.b, color.r, color.g, color.b);
        colorAttr.setXYZ(face.c, color.r, color.g, color.b);
        colorAttr.needsUpdate = true;
      }
    },
    show_brush_on_intersection() {
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      raycaster.firstHitOnly = true;

      const intersects = raycaster.intersectObject(targetMesh, true);
      if (intersects.length > 0) {
        const intersection = intersects[0];
        brushMesh.scale.setScalar(this.brush_size);
        brushMesh.visible = true;
        brushMesh.position.copy(intersection.point);
      } else {
        brushMesh.visible = false;
      }
    },
    place_sphere(position) {
      let geometry = new THREE.SphereGeometry(1, 32, 16);
      geometry.center()
      let sampleMesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({color: 0xff0000}));
      sampleMesh.position.copy(position);
      scene.add(sampleMesh);
    },
    render() {
      if (brushActive && this.brush_mode !== this.modes[1]) {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        raycaster.firstHitOnly = true;
        const res = raycaster.intersectObject(targetMesh, true);
        if (res.length > 0) {
          let geometry = targetMesh.geometry;
          let bvh = geometry.boundsTree;
          let colorAttr = geometry.getAttribute('color');
          let indexAttr = geometry.index;

          brushMesh.position.copy(res[0].point);
          controls.enabled = false;
          brushMesh.visible = true;

          const inverseMatrix = new THREE.Matrix4();
          inverseMatrix.copy(targetMesh.matrixWorld).invert();

          const sphere = new THREE.Sphere();
          sphere.center.copy(brushMesh.position).applyMatrix4(inverseMatrix);
          sphere.radius = this.brush_size;

          const indices = [];
          const triangles = [];
          const tempVec = new THREE.Vector3();
          bvh.shapecast({
            intersectsBounds: box => {
              const intersects = sphere.intersectsBox(box);
              const {min, max} = box;
              if (intersects) {
                for (let x = 0; x <= 1; x++) {
                  for (let y = 0; y <= 1; y++) {
                    for (let z = 0; z <= 1; z++) {
                      tempVec.set(
                          x === 0 ? min.x : max.x,
                          y === 0 ? min.y : max.y,
                          z === 0 ? min.z : max.z
                      );
                      if (!sphere.containsPoint(tempVec)) {
                        return INTERSECTED;
                      }
                    }
                  }
                }
                return CONTAINED;
              }
              return intersects ? INTERSECTED : NOT_INTERSECTED;
            },
            intersectsTriangle: (tri, i, contained) => {
              if (contained || tri.intersectsSphere(sphere)) {
                const i3 = 3 * i;

                triangles.push(tri)
                indices.push(i3, i3 + 1, i3 + 2);
                for (let i = 0; i < 3; i++) {
                  let i2 = indexAttr.getX(i3 + i);
                  let face_color = new THREE.Color().fromBufferAttribute(colorAttr, i2);
                  switch (this.brush_mode) {
                    case this.modes[0]:
                      if (color_marked.getHex() !== face_color.getHex()) {
                        colorAttr.setXYZ(i2, color_marked.r, color_marked.g, color_marked.b);
                      }
                      // Important to clone triangle - otherwise it iterates to next triangle once called.
                      this.$emit('addTriangle', tri.clone())
                      break;
                    case this.modes[2]:
                      if (color_default.getHex() !== face_color.getHex()) {
                        colorAttr.setXYZ(i2, color_default.r, color_default.g, color_default.b);
                      }
                      this.$emit('deleteTriangle', tri)
                      break;
                  }
                }
                colorAttr.needsUpdate = true;
              }
              return false;
            }
          });
          /*
          for (let i = 0, l = indices.length; i < l; i++) {
            const i2 = indexAttr.getX(indices[i]);
            let face_color = new THREE.Color().fromBufferAttribute(colorAttr, i2);
            switch (this.brush_mode) {
              case this.modes[0]:
                if (color_marked.getHex() !== face_color.getHex()) {
                  colorAttr.setXYZ(i2, color_marked.r, color_marked.g, color_marked.b);
                }
                break;
              case this.modes[2]:
                if (color_default.getHex() !== face_color.getHex()) {
                  colorAttr.setXYZ(i2, color_default.r, color_default.g, color_default.b);
                }
                break;
            }

          }*/
          this.$emit('setIndices', indices)
          //this.$emit('setTriangles', triangles)
          colorAttr.needsUpdate = true;
        }
      }
    }
  }
}
</script>
