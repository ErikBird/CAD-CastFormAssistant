import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils";

const loader = new THREE.BufferGeometryLoader();

export const CSG_Tools = {

    async create_shell(geometry, length) {
        geometry = loader.parse(geometry)
        let inverted_geometry = geometry.clone()
        inverted_geometry = loader.parse(await this.insideOut(inverted_geometry.toJSON()))
        inverted_geometry.computeVertexNormals()

        let diluted_geometry_json = await this.dilute_geometry(geometry.toJSON(), length)
        let diluted_geometry = loader.parse(diluted_geometry_json)

        let merged_geometry = BufferGeometryUtils.mergeBufferGeometries(
            [diluted_geometry, inverted_geometry], true)

        return merged_geometry.toJSON()
    },
    async insideOut(geometry) {
        geometry = loader.parse(geometry)
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
        return geometry.toJSON()
    },
    async dilute_geometry(geometry, length) {
        geometry = loader.parse(geometry)
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
            dilutedVertes[f] = position.array[f] + x / normals_array.length * length
            dilutedVertes[f + 1] = position.array[f + 1] + y / normals_array.length * length
            dilutedVertes[f + 2] = position.array[f + 2] + z / normals_array.length * length
        }
        geometry_copy.setAttribute('position', new THREE.BufferAttribute(dilutedVertes, 3));
        return geometry_copy.toJSON()
    },
};
export default CSG_Tools;