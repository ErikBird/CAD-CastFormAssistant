<template>
  <v-container fluid class="fill-height">
    <v-card class="h-75">
      <v-card-title>Schritt 5 - Anschluss Positionieren</v-card-title>
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
import {CSG} from "three-csg-ts";

let targetMesh, brushMesh, holeMesh
let renderer, camera, scene, controls
let clientWidth, clientHeight


let mouse = new THREE.Vector2();

export default {
  name: "PlaceAdapter",
  props: ['geometry', 'shell_thickness', 'meshes'],
  components: {
    Plane, PhongMaterial, AmbientLight, Box, Camera, Renderer, PointLight,
    Scene, Sphere, StandardMaterial, Texture
  },
  data() {
    return {
      adapterHeight : 10,
      adapterMeshes : [],
      holeMeshes: []
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
    targetMesh.geometry.computeBoundsTree();
    targetMesh.geometry.computeVertexNormals()
    scene.add(targetMesh);

    let radius_inside = 1
    let radialSegments = 32
    let brushMeshOut = new THREE.Mesh(new THREE.CylinderGeometry( 2, 2, this.adapterHeight, radialSegments ))
    let brushMeshIn = new THREE.Mesh(new THREE.CylinderGeometry( radius_inside, radius_inside, this.adapterHeight, radialSegments ))

    brushMeshOut.geometry.center()
    brushMeshIn.geometry.center()
    brushMeshOut.updateMatrix();
    brushMeshIn.updateMatrix();
    let brushGeometry = CSG.subtract(brushMeshOut, brushMeshIn)

    const brushMaterial = new THREE.MeshStandardMaterial( { color: 0xff0000 } );

    brushMesh = new THREE.Mesh( brushGeometry.geometry, brushMaterial );
    brushMesh.visible = false;
    scene.add( brushMesh );


    let holeGeometry = new THREE.CylinderGeometry( radius_inside, radius_inside, this.shell_thickness+0.1, radialSegments ).toNonIndexed ();
    holeGeometry.center()
    holeMesh = new THREE.Mesh( holeGeometry, brushMaterial );
    scene.add(holeMesh);

    // Camera Orientation setup
    targetMesh.geometry.computeBoundingBox();
    let box = new THREE.Box3()
    box.copy(targetMesh.geometry.boundingBox)
    let maximum_coordinate = Math.abs(Math.max(box.max.x, box.max.y, box.max.z))
    let distance = maximum_coordinate / Math.tan(25 * Math.PI / 180)
    camera.position.set(0, distance + 2, 0);

    camera.lookAt(new THREE.Vector3(0, 0, 0));
    this.place_meshes()

    window.addEventListener('resize', () => {
      this.resizeRenderer()
    });

    window.addEventListener( 'pointermove',  ( e ) => {
      let x = e.clientX
      let y = e.clientY
      mouse.x = (x / window.innerWidth * 3) - 1.5;
      mouse.y = (-(y / window.innerHeight) * 3) + 1;

      // disable the controls early if we're over the object because on touch screens
      // we're not constantly tracking where the cursor is.
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera( mouse, camera );
      raycaster.firstHitOnly = true;



      const intersects = raycaster.intersectObject( targetMesh, true );
      if (intersects.length>0) {
        const intersection = intersects[0];
        let face =intersection.face
        let face_normal = new THREE.Vector3(face.normal.x,face.normal.y,face.normal.z).normalize()
        let point_pos = intersection.point.clone()
        let hole_pos = intersection.point.clone()
        point_pos.addScaledVector ( face_normal, this.adapterHeight * 0.5 )
        brushMesh.position.copy(point_pos );
        brushMesh.lookAt( intersection.point.add(face_normal) );
        brushMesh.rotateX( Math.PI / 2 );
        brushMesh.updateMatrix();
        hole_pos = hole_pos.addScaledVector ( face_normal, - this.shell_thickness * 0.5)
        holeMesh.position.copy( hole_pos );
        holeMesh.lookAt( intersection.point.add(face_normal) );
        holeMesh.rotateX( Math.PI / 2 );
        holeMesh.updateMatrix();

        brushMesh.visible = true;
        holeMesh.visible = true
        controls.enabled = false;
        } else {
        brushMesh.visible = false;
        holeMesh.visible = false
        controls.enabled = true;
      }
      } );
    document.addEventListener( 'click',  () => {
      if (brushMesh.visible){
        this.adapterMeshes.push(brushMesh.clone())
        scene.add(brushMesh.clone())
        this.holeMeshes.push(holeMesh.clone())
        scene.add(holeMesh.clone())
      }
    } );

  },
  methods: {
    next(){
      this.$emit('setAdapterMeshes', this.adapterMeshes)
      this.$emit('addHoleMeshes', this.holeMeshes)
      this.$emit('setStep', 5)
    },
    place_meshes(){
      for (let i = 0; i < this.meshes.length; i++) {
        scene.add(this.meshes[i].clone())
      }
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
  }
}
</script>
