<template>
<v-container fluid class="fill-height">
    <v-card class="h-75">
      <v-card-title>Schritt 6 - Download</v-card-title>
      <v-card-text>
        STL wird erstellt. Einen Moment bitte..
      </v-card-text>
        <button @click="download_stl()">Download Shell</button>
    </v-card>
  </v-container>
</template>

<script>
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
import * as THREE from "three";
import {CSG} from "three-csg-ts";
import {STLExporter} from "three/examples/jsm/exporters/STLExporter";
export default {
  name: "Generation",
   props: ['holeMeshes', 'adapterMeshes', 'geometry'],
    data() {
    return {
      mesh: {}
    }
  },
  components: {
    Plane, PhongMaterial, AmbientLight, Box, Camera, Renderer, PointLight,
    Scene, Sphere, StandardMaterial, Texture
  },
  mounted() {
    this.create_mesh()
  },
  methods: {
    download_stl(){
    let exporter = new STLExporter();
      let result = exporter.parse( this.mesh );
      let link = document.createElement( 'a' );
      link.style.display = 'none';
      document.body.appendChild( link );
      link.href = URL.createObjectURL( new Blob( [ result ], { type: 'text/plain' } ) );
      link.download = 'box.stl';
      link.click();
    },
    set_colors(geometry){
      let colors = [];
      for (let i = 0; i < geometry.attributes.position.count; i++) {
        colors.push(1, 1, 1); // add for each vertex color data
      }
      let holeColorAttribute = new THREE.Float32BufferAttribute(colors, 3);
      geometry.setAttribute('color', holeColorAttribute);
    },
    create_mesh(){
      let adapterMesh, holeMesh
      let material = new THREE.MeshBasicMaterial( { color: 0xff0000 } );
      let geo = this.geometry.clone()
      this.set_colors(geo)
      let mesh = new THREE.Mesh(geo, material)
      mesh.updateMatrix();

      for (let i = 0; i < this.holeMeshes.length; i++) {
        holeMesh = this.holeMeshes[i].clone()
        this.set_colors(holeMesh.geometry)
        holeMesh.updateMatrix();
        mesh = CSG.subtract(mesh, holeMesh)
        mesh.updateMatrix();
        holeMesh = null
      }
      for (let i = 0; i < this.adapterMeshes.length; i++) {
        adapterMesh = this.adapterMeshes[i].clone()
        this.set_colors(adapterMesh.geometry)
        adapterMesh.updateMatrix();
        mesh = CSG.union(mesh, adapterMesh)
        mesh.updateMatrix();
        adapterMesh = null
      }
      this.mesh = mesh

    },
  }
}
</script>

<style scoped>

</style>