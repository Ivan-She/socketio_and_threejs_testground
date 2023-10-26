import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import Stats from 'three/examples/jsm/libs/stats.module'
import { GUI } from 'dat.gui'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import TWEEN from '@tweenjs/tween.js'
import { io } from 'socket.io-client'
import { create } from 'domain'

const scene = new THREE.Scene()
//scene.background = new THREE.Color(0xfffdf2)

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
)
camera.position.z = 4

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

//Setting up light for scene
const spotLight = new THREE.SpotLight()
spotLight.position.y = 3
spotLight.position.z = 4
spotLight.position.x = 1
spotLight.penumbra = 0.7
spotLight.intensity = 0.7
spotLight.castShadow = true;
spotLight.shadow.mapSize.width = 1024;
spotLight.shadow.mapSize.height = 1024;
scene.add(spotLight)
const spotLightHelper = new THREE.SpotLightHelper(spotLight)
scene.add(spotLightHelper)
const ambientLight = new THREE.AmbientLight(0xfffdf2, 0.5)
scene.add(ambientLight)

//Orbit controls from Three
const controls = new OrbitControls(camera, renderer.domElement) 

//Creating floorpanel
const planeGeometry = new THREE.PlaneGeometry(20, 20)
const plane = new THREE.Mesh(planeGeometry, new THREE.MeshPhongMaterial())
plane.rotateX(-Math.PI / 2)
plane.position.y = -0.5
plane.receiveShadow = true
scene.add(plane)

//Geomentry for charecter and it's material
const charGeo = new THREE.BoxGeometry()
const material = new THREE.MeshNormalMaterial()
//const material = new THREE.MeshBasicMaterial({ color: 0xffff8e})
const myObject3D = new THREE.Object3D()
myObject3D.position.x = Math.random() * 4 - 2
myObject3D.position.z = Math.random() * 4 - 2

//Grid for scene if needed
// const gridHelper = new THREE.GridHelper(10, 10)
// gridHelper.position.y = -0.5
// scene.add(gridHelper)

//Updating on web window resize
window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    render()
}


let myId = ''
let myName = prompt("Whata is your name?")
while (myName == ''|| myName == null)
{
   myName = prompt("Whata is your name?")
}

let timestamp = 0
const clientCubes: { [id: string]: THREE.Mesh } = {}
const socket = io()
socket.on('connect', function () {
    console.log('connect')
})
socket.on('disconnect', function (message: any) {
    console.log('disconnect ' + message)
})
socket.on('id', (id: any) => {
    myId = id
    setInterval(() => {
        socket.emit('update', {
            n: myName,
            t: Date.now(),
            p: myObject3D.position,
            r: myObject3D.rotation,
        })
    }, 50)
})
socket.on('clients', (clients: any) => {
    let pingStatsHtml = 'Socket Ping Stats<br/><br/>'
    Object.keys(clients).forEach((p) => {
        timestamp = Date.now()
        pingStatsHtml += p + ' ' + (timestamp - clients[p].t) + 'ms<br/>'
        if (!clientCubes[p]) {

            clientCubes[p] = new THREE.Mesh(charGeo, material)
            clientCubes[p].name = p
            clientCubes[p].castShadow = true;
            scene.add(clientCubes[p])
        } else {
            if (clients[p].p) {
                new TWEEN.Tween(clientCubes[p].position)
                    .to(
                        {
                            x: clients[p].p.x,
                            y: clients[p].p.y,
                            z: clients[p].p.z,
                        },
                        50
                    )
                    .start()
            }
            if (clients[p].r) {
                new TWEEN.Tween(clientCubes[p].rotation)
                    .to(
                        {
                            x: clients[p].r._x,
                            y: clients[p].r._y,
                            z: clients[p].r._z,
                        },
                        50
                    )
                    .start()
            }
        }
    })
    ;(document.getElementById('pingStats') as HTMLDivElement).innerHTML =
        pingStatsHtml
})
socket.on('removeClient', (id: string) => {
    scene.remove(scene.getObjectByName(id) as THREE.Object3D)
})

const stats = new Stats()
document.body.appendChild(stats.dom)

// Creaitin box controls via GUI
const gui = new GUI()
const cubeFolder = gui.addFolder('Cube')
const cubePositionFolder = cubeFolder.addFolder('Position')
cubePositionFolder.add(myObject3D.position, 'x', -5, 5)
cubePositionFolder.add(myObject3D.position, 'z', -5, 5)
cubePositionFolder.open()
const cubeRotationFolder = cubeFolder.addFolder('Rotation')
cubeRotationFolder.add(myObject3D.rotation, 'x', 0, Math.PI * 2, 0.01)
cubeRotationFolder.add(myObject3D.rotation, 'y', 0, Math.PI * 2, 0.01)
cubeRotationFolder.add(myObject3D.rotation, 'z', 0, Math.PI * 2, 0.01)
cubeRotationFolder.open()
cubeFolder.open()

// Chat elements and function
const buttonSend = document.getElementById('but1');
const textField = document.getElementById('messageBox') as HTMLInputElement;
const messages = document.getElementById('messages') as HTMLUListElement

buttonSend?.addEventListener("click", ()=>{
    chatEvent();
})
textField?.addEventListener("keypress", (event)=>{
    if(event.key === "Enter")
    {
    chatEvent();
    }
})
function chatEvent(){
    var value = textField?.value
    socket.emit('newMessageToServer', {text:value})
    textField.value = '';
}

// Getting message from socket to clients on server
socket.on('newMessageToClients', (newMessage) =>{
    //console.log(newMessage.text);
    const sentHour = new Date(newMessage.timestamp).getHours()
    const sentMinuts = new Date(newMessage.timestamp).getMinutes()
    console.log(sentHour+":"+sentMinuts)
    if(newMessage.text)
    {
        messages.innerHTML += "<li>" + "["+ sentHour+":"+sentMinuts+ "]" + newMessage.clientName +":"+newMessage.text +"</li>"
    }
})


const animate = function () {
    requestAnimationFrame(animate)
    spotLightHelper.update()
    controls.update()
    TWEEN.update()

    if (clientCubes[myId]) {
        camera.lookAt(clientCubes[myId].position)
    }
    render()
    stats.update()
}

const render = function () {
    renderer.render(scene, camera)
}

animate()