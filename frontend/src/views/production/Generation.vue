<template>
    <v-container>
<v-card >
          <v-card-title>Schritt 6 - Generierung des Modells</v-card-title>
  <v-card-text :v-if="!is_generated">
    Bitte warten. Die STL Datei wird generiert...
  </v-card-text>
  </v-card>
      <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
          variant="flat"
          color="primary"
          @click="download_stl()"
          :disabled="!is_generated"
        >
          Download
        </v-btn>
        <v-spacer></v-spacer>
    </v-card-actions>

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
      is_generated:false,
      mesh: {}
    }
  },
  components: {
    Plane, PhongMaterial, AmbientLight, Box, Camera, Renderer, PointLight,
    Scene, Sphere, StandardMaterial, Texture
  },
  mounted(){
     this.$nextTick( () => {
                this.create_mesh()
            })
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

      let maxLength = Math.min(this.holeMeshes.length,10)
      for (let i = 0; i < maxLength; i++) {
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
      this.is_generated = true

    },
  }
}
</script>

<style scoped>

</style>