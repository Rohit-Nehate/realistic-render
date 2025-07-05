import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'lil-gui'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js'

const gui = new dat.GUI()
const gltfLoader = new GLTFLoader()


//update material fo real


const uupdateMaterial = ()=>{

scene.traverse((child)=>{
    if(child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial){
        console.log(child)

        child.material.envMap = environmentMap
         child.material.roughness = 1
        child.material.envMapIntensity = 5/2
    }
})



}


/**
 * envoinmennt map\

 */


const cubetextureLoader = new THREE.CubeTextureLoader()

const environmentMap = cubetextureLoader.load([
    'textures/environmentMaps/2/px.jpg',
    'textures/environmentMaps/2/nx.jpg',
    'textures/environmentMaps/2/py.jpg',
    'textures/environmentMaps/2/ny.jpg',
    'textures/environmentMaps/2/pz.jpg',
    'textures/environmentMaps/2/nz.jpg'
])


let mixer = null
environmentMap.encoding = THREE.sRGBEncoding
gltfLoader.load('models/city_soldier_outdated/scene.gltf',
    (gltf)=>{
       
        mixer = new THREE.AnimationMixer(gltf.scene)
       const action = mixer.clipAction(gltf.animations[0])
       action.play()

    gltf.scene.scale.set(5,5,5)
    gltf.scene.position.y = -6
    gltf.scene.rotation.y = Math.PI * .75
    
        scene.add(gltf.scene)

        gui.add(gltf.scene.rotation,'y').min(-Math.PI).max(Math.PI).step(.01).name('modelRoration')
       uupdateMaterial()
    }
);


// Debug



// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()
scene.background = environmentMap

/**
 * Test sphere
 */
// const testSphere = new THREE.Mesh(
//     new THREE.SphereGeometry(1, 32, 32),
//     new THREE.MeshStandardMaterial()
// )
// scene.add(testSphere)



//lights 

const directionalLight = new THREE.DirectionalLight('#ffffff',5)
directionalLight.position.set(1.5,3,-3)
scene.add(directionalLight)

//dat gui twicks 
gui.add(directionalLight, 'intensity').min(0).max(10).step(0.001).name('directionIntensity')
gui.add(directionalLight.position, 'x').min(-5).max(5).step(0.001).name('directionX')
gui.add(directionalLight.position, 'y').min(-5).max(5).step(0.001).name('directionY')
gui.add(directionalLight.position, 'z').min(-5).max(5).step(0.001).name('directionZ')


/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(4, 1, - 4)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.physicallyCorrectLights = true 
renderer.outputEncoding = THREE.sRGBEncoding 
renderer.toneMapping = THREE.LinearToneMapping
renderer.toneMappingExposure = 1.5
 

gui.add(renderer, 'toneMappingExposure').min(0).max(5).step(.002).name("ToneExposure")

gui.add(renderer, 'toneMapping',{
    no: THREE.NoToneMapping,
    Liner: THREE.LinearToneMapping,
    Reinhard: THREE.ReinhardToneMapping,
    cineon: THREE.CineonToneMapping,
    ACEF: THREE.ACESFilmicToneMapping
})
/**
 * Animate
 */

let clock = new THREE.Clock()
let laterTime =0 
const tick = () =>
{

    const elapsedTime = clock.getElapsedTime()
const alphaTime = elapsedTime - laterTime
laterTime = elapsedTime
        // model animation

    if(mixer!=null){
        mixer.update(alphaTime)
    }

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()