<template>
  <v-container fluid class="fill-height">
    <v-card class="h-75">
      <v-card-title>Schritt 3 - Fläche Markieren</v-card-title>
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
          @click="$emit('setStep', 3)"
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

let mouse = new THREE.Vector2();
let targetMesh, brushMesh
let brushActive = false;
let renderer, camera, scene, controls
let canvasWidth, canvasHeight, canvasOffsetLeft, canvasOffsetTop
THREE.Mesh.prototype.raycast = acceleratedRaycast;
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
export default {
  name: "SelectFaces",
  props: ['initial_geometry'],
  components: {
    Plane, PhongMaterial, AmbientLight, Box, Camera, Renderer, PointLight,
    Scene, Sphere, StandardMaterial, Texture
  },
  data() {
    return {
      selected_faces: []
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
      this.update_relative_mouse_position()

      // disable the controls early if we're over the object because on touch screens
      // we're not constantly tracking where the cursor is.
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      raycaster.firstHitOnly = true;

      const intersects = raycaster.intersectObject(targetMesh, true);
      if (intersects.length > 0) {
        const intersection = intersects[0];
        brushMesh.visible = true;
        brushMesh.position.copy(intersection.point);
        controls.enabled = false;
      } else {
        brushMesh.visible = false;
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
    update_relative_mouse_position() {
      let x = e.clientX
      let y = e.clientY
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
      const brushGeometry = new THREE.SphereBufferGeometry(10, 40, 40);
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
      scene.add(targetMesh);
      let wireframe = new THREE.WireframeGeometry(this.initial_geometry);

      let line = new THREE.LineSegments(wireframe);

      line.material.color.setHex(0x000000);

      scene.add(line);
    },
    add_color_to_geometry(geometry) {
      let geo_color = new THREE.Color(0x36454F);
      const positionAttribute = geometry.getAttribute('position');
      const colors = [];
      for (let i = 0; i < positionAttribute.count; i++) {

        colors.push(geo_color.r, geo_color.g, geo_color.b); // add for each vertex color data
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

      canvasOffsetLeft = window.scrollX + this.$refs.rendersize.$el.getBoundingClientRect().left
      canvasOffsetTop = window.scrollY + this.$refs.rendersize.$el.getBoundingClientRect().top
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
    render() {
      if (brushActive) {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        raycaster.firstHitOnly = true;
        const intersects = raycaster.intersectObject(targetMesh, true);
        controls.enabled = intersects.length === 0; //Disable orbit control if brush active
        if (intersects.length > 0) {
          let intersect = intersects[0];
          this.select_face(intersect)
        }
      }
    }
  }
}
</script>
