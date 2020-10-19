<template>
    <div id='container'>
        <div class="btn_group">
          <button @click="changeMode">切换模式</button>
        </div>
        <div id="control" v-show="isPlayerMode"></div>
    </div>
</template>
<script>
import * as THREE from 'three'
import { Scene, PerspectiveCamera, AnimationMixer, AmbientLight, Vector3 } from 'three'
import { OBJLoader, MTLLoader } from 'three-obj-mtl-loader'
import GLTFLoader from 'three/examples/js/loaders/GLTFLoader'
import DragControls from 'three/examples/js/controls/DragControls'
// import FBXLoader from 'three/examples/js/loaders/FBXLoader'
// import OrbitControls from 'three-orbitcontrols'
import FirstPersonControls from 'three/examples/js/controls/FirstPersonControls'
import TWEEN from '@tweenjs/tween.js'

// import { OBJLoader, MTLLoader } from 'three-obj-mtl-loader'

export default {
  data () {
    return {
      player: {},
      animations: {},
      colliders: [],
      isPlayerMode: true
    }
  },
  mounted () {
    this.init()
    window.addEventListener('resize', () => this.onWindowResize())
  },
  beforeDestroy () {
  },
  computed: {
    action: {
      set (name) {
        this.player.mixer.stopAllAction()
        const action = this.player.mixer.clipAction(this.animations[name])
        action.time = 0
        this.player.action = name
        this.player.actionTime = Date.now()
        this.player.actionName = name
        action.fadeIn(0.5)
        action.play()
      },
      get () {
        if (this.player === undefined || this.player.actionName === undefined) return ''
        return this.player.actionName
      }
    },
    activeCamera: {
      set (object) {
        this.player.cameras.active = object
      },
      get () {
        return this.player.cameras.active
      }
    }
  },
  watch: {
  },
  methods: {
    init () {
      // 添加操作器
      let container = this.container = document.getElementById('container')
      this.scene = new Scene()
      this.scene.background = new THREE.Color(0x000000)

      this.camera = new PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000000)
      this.camera.position.set(0, 200, 450)

      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true // 设置透明
      })
      // 设置颜色
      this.renderer.setClearColor(0xffffff, 0)

      // 设置分辨率
      this.renderer.setPixelRatio(window.devicePixelRatio)
      this.renderer.setSize(container.clientWidth, container.clientHeight)
      container.appendChild(this.renderer.domElement)

      this.clock = new THREE.Clock()
      let controls = this.controls = new FirstPersonControls(
        this.camera,
        this.renderer.domElement
      )

      controls.lookSpeed = 0.1 // 鼠标移动查看的速度
      controls.movementSpeed = 200 // 相机移动速度
      controls.noFly = true
      controls.constrainVertical = true // 约束垂直
      controls.mouseDragOn = true

      this.scene.add(new AmbientLight(0xFFFFFF, 1))

      this.animationMixer = new AnimationMixer(this.scene)

      this.createPointLight({x: 200, y: 100, z: 200}, 'red')
      this.createPointLight({x: -200, y: 100, z: -200}, 'yellow')

      this.initSkybox()
      this.createFloor()
      this.loadGlft()
      this.createVideo()
      this.createColliders()
      // this.loadArmGlft()
      this.render()
      this.onMouseDownEvent()
      this.initPlayerControl()
      this.initDragControls()
    },
    onWindowResize () {
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
      this.camera.aspect = this.container.clientWidth / this.container.clientHeight
    },
    render () {
      window.requestAnimationFrame(() => this.render())
      TWEEN.update()
      const dt = this.clock.getDelta()
      if (this.isPlayerMode) {
        if (this.player.mixer !== undefined) this.player.mixer.update(dt)
        if (this.player.action === 'Walk') {
          const elapsedTime = Date.now() - this.player.actionTime
          if (elapsedTime > 1000 && this.player.move) {
            this.action = 'Run'
          }
        }
        if (this.player.move) this.movePlayer(dt)
      } else {
        this.controls.update(dt)
      }
      this.renderer.render(this.scene, this.camera)
    },
    initSkybox () {
      const boxGeometry = new THREE.BoxGeometry(5000, 1200, 5000)
      const skyboxMaterial = [
        new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('static/贴图/concrete5.jpg'), side: THREE.DoubleSide}),
        new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('static/贴图/concrete5.jpg'), side: THREE.DoubleSide}),
        new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('static/贴图/skybox.jpg'), side: THREE.DoubleSide}),
        new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('static/贴图/concrete5.jpg'), side: THREE.DoubleSide}),
        new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('static/贴图/concrete5.jpg'), side: THREE.DoubleSide}),
        new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('static/贴图/concrete5.jpg'), side: THREE.DoubleSide})
      ]
      let earthMesh = new THREE.Mesh(boxGeometry, skyboxMaterial)
      earthMesh.position.set(0, 599, 0)
      this.scene.add(earthMesh)
      this.colliders.push(earthMesh)
    },
    changeMode () {
      this.isPlayerMode = !this.isPlayerMode
    },
    createFloor () {
      const groundTexture = new THREE.TextureLoader().load('static/贴图/concrete3.jpg')
      groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping
      groundTexture.repeat.set(4, 4)
      groundTexture.anisotropy = 16
      const groundMaterial = new THREE.MeshLambertMaterial({map: groundTexture})

      var groundGeometry = new THREE.PlaneGeometry(4000, 4000)

      let floor = this.floor = new THREE.Mesh(groundGeometry, groundMaterial)
      floor.name = 'floor'
      floor.rotateX(-Math.PI / 2)
      this.scene.add(floor)
    },
    onMouseDownEvent () {
      this.renderer.domElement.addEventListener('mousedown', event => {
        this.curMouseDown = true
        const { offsetX, offsetY } = event
        let x = (offsetX / this.container.clientWidth) * 2 - 1
        let y = -(offsetY / this.container.clientHeight) * 2 + 1
        const mousePoint = new THREE.Vector2(x, y)

        const raycaster = new THREE.Raycaster()
        raycaster.setFromCamera(mousePoint, this.camera)

        let intersects = this.intersects = raycaster.intersectObjects(this.scene.children, true)

        if (intersects.length) {
          console.log('intersects', intersects)
          intersects.forEach((item) => {
            if (item.object.name === 'floor') {
              this.cameraMove(intersects[0].point, 500)
            }
          })
        }
      })
    },
    loadGlft () {
      this.gltfLoader = new GLTFLoader()
      this.gltfLoader.load('static/Soldier.glb', (gltf) => {
        let object = gltf.scene
        object.name = 'Soldier'
        object.scale.set(100, 100, 100)
        object.mixer = new AnimationMixer(object)

        this.player.mixer = object.mixer
        this.player.root = object.mixer.getRoot()
        this.player.object = new THREE.Object3D()
        this.scene.add(this.player.object)
        this.player.object.add(object)

        window.object = this.player.object

        const walkAnimationClip = gltf.animations.find(animationsClip => animationsClip.name === 'Walk')
        const idleAnimationClip = gltf.animations.find(animationsClip => animationsClip.name === 'Idle')
        const RunAnimationClip = gltf.animations.find(animationsClip => animationsClip.name === 'Run')

        this.animations.Idle = idleAnimationClip
        this.animations.Walk = walkAnimationClip
        this.animations.Run = RunAnimationClip

        this.action = 'Idle'
        const back = new THREE.Object3D()
        back.position.set(0, 200, 450)
        back.parent = this.player.object
        this.player.cameras = { back }
        this.activeCamera = this.player.cameras.back

        console.log(this.player.object)
      })
    },
    createColliders () {
      const geometry = new THREE.BoxGeometry(250, 200, 250)
      const material = new THREE.MeshBasicMaterial({color: 0x333, wireframe: true})

      this.colliders = []

      for (let x = -2000; x < 2000; x += 500) {
        for (let z = -2000; z < 2000; z += 500) {
          if (x === 0 && z === 0) continue
          const box = new THREE.Mesh(geometry, material)
          box.position.set(x, 125, z)
          this.scene.add(box)
          this.colliders.push(box)
        }
      }
    },
    createPointLight (pos, color) {
      let light = this.pointLight = new THREE.PointLight(color, 3, 1500)
      light.position.set(pos.x, pos.y, pos.z)
      this.scene.add(light)
      let sphereGeometry = new THREE.SphereBufferGeometry(30, 30, 30)
      let meterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color)
      })
      let sphere = new THREE.Mesh(sphereGeometry, meterial)
      sphere.position.set(pos.x, pos.y, pos.z)
      let group = new THREE.Group()
      group.add(sphere)
      group.add(light)
      this.scene.add(group)
    },
    cameraMove (toP, time) {
      var tween = new TWEEN.Tween(this.camera.position)
        .to(toP, time)
        .easing(TWEEN.Easing.Quadratic.InOut)
      //   const y = this.camera.position.y
      const update = () => {
        this.camera.position.set(
          this.camera.position.x,
          200,
          this.camera.position.z
        )
      }
      tween.onUpdate(update)
      tween.start()
      return tween
    },
    createVideo () {
      let time = (new Date()).getTime()
      let video = document.createElement('video')
      video.src = `static/1920x1080.mp4?t=${time}`
      video.autoload = true
      video.preload = 'auto'
      video.autoplay = 'autoplay'

      // video对象作为VideoTexture参数创建纹理对象
      let texture = this.videoTexture = new THREE.VideoTexture(video)

      let geometry = new THREE.PlaneGeometry(1200, 600)
      let material = this.videoMat = new THREE.MeshPhongMaterial({
        map: texture
      })

      let mesh = this.videoMesh = new THREE.Mesh(geometry, material) // 网格模型对象Mesh
      mesh.position.set(200, 400, -2400)
      mesh.name = 'videoMesh'
      this.scene.add(mesh)
    },
    loadObjWithMaterials (id, baseUrl, objName, mtlName, position, multiplyScalar) {
      let mtlLoader = new MTLLoader()
      mtlLoader.setPath(baseUrl)
      mtlLoader.load(mtlName, materials => {
        materials.preload()
        this.loadObj(id, baseUrl, objName, multiplyScalar, position, materials)
      })
    },
    loadObj (id, baseUrl, objName, multiplyScalar, position, materials) {
      let obj = {id: id, isTips: false, cylis: []}
      if (!multiplyScalar) {
        multiplyScalar = 1
      }

      let manager = new THREE.LoadingManager()
      let loader = new OBJLoader(manager)
      loader.setMaterials(materials)
      obj.materials = materials
      loader.setPath(baseUrl)
      loader.load(objName, object => {
        object.name = objName
        object.children.forEach((obj) => {
          obj.material.emissive = new THREE.Color(1, 1, 1)
          obj.material.emissiveIntensity = 1
          obj.material.emissiveMap = obj.material.map
        })

        // 显示比例
        object.scale.multiplyScalar(multiplyScalar)
        // 加入到页面中
        this.scene.add(object)
        object.castShadow = true
        object.receiveShadow = true
        obj.model = object
        if (position) {
          object.position.set(position.x, position.y, position.z)
        }
      })
    },
    loadArmGlft () {
      this.gltfLoader.load(`static/armobj/528.gltf`, (gltf) => {
        console.log(gltf)
        let object = gltf.scene
        object.scale.set(2, 2, 2)
        object.children.forEach((obj) => {
          if (obj instanceof THREE.Mesh) {
            // obj.material.emissive = new THREE.Color('#ccc')
            obj.material.emissiveIntensity = 1
            obj.material.emissiveMap = obj.material.map
          }
          if (obj instanceof THREE.Group) {
            obj.children.forEach((mesh) => {
              mesh.material.emissiveIntensity = 1
              mesh.material.emissiveMap = mesh.material.map
            })
          }
        })
        this.scene.add(object)
      })
    },
    initDragControls () {
      // 过滤不是 Mesh 的物体,例如辅助网格对象
      let objects = []

      for (let i = 0; i < this.scene.children.length; i++) {
        // console.log(this.scene.children[i], this.scene.children[i].isGroup)
        if (this.scene.children[i].isGroup) {
          objects.push(this.scene.children[i])
        }
      }
      // 初始化拖拽控件
      let dragControls = new DragControls(objects, this.camera, this.renderer.domElement)

      // 开始拖拽
      dragControls.addEventListener('dragstart', (event) => {
        this.controls.enabled = false
      })
      dragControls.addEventListener('drag', (event) => {
        event.object.parent.position.copy(event.object.position) // parent的位置更新为object的位置
        event.object.parent.children.forEach(children => {
          children.position.set(0, 0, 0)
        })
      })
      // 拖拽结束
      dragControls.addEventListener('dragend', (event) => {
        event.object.parent.children.forEach(children => {
          children.position.copy(event.object.parent.position)
        })
        event.object.parent.position.set(0, 0, 0)
        this.controls.enabled = true
      })
    },
    movePlayer (dt) {
      const playerPos = this.player.object.position.clone()
      playerPos.y += 60
      let dir = new THREE.Vector3()
      this.player.object.getWorldDirection(dir)

      dir.negate()

      let blocked = false
      const colliders = this.colliders

      let raycaster = new THREE.Raycaster(playerPos, dir)

      let intersect = raycaster.intersectObjects(colliders)
      if (intersect.length > 0) {
        if (intersect[0].distance < 50) blocked = true
      }

      if (!blocked) {
        const pos = this.player.object.position.clone()
        const speed = (this.player.action === 'Run') ? 120 : 40
        this.player.object.translateZ(dt * -speed)
        pos.y += 200
        this.camera.lookAt(pos)
        this.camera.position.lerp(this.player.cameras.active.getWorldPosition(new THREE.Vector3()), 0.05)
      }
    },
    initPlayerControl () {
      let dc = new window.g.DataContainer()
      let diagram = this.diagram = new window.g.Canvas(dc)
      diagram.addToDom(document.getElementById('control'))

      let arc = new window.g.Node()
      arc.setStyle({
        shape: 'ellipse',
        borderColor: '#fff',
        width: 80,
        height: 80,
        position: {
          x: 100,
          y: 100
        }
      })
      arc.setAttr({type: 'arc'})
      arc.setImage(`/static/rocker.jpg`)

      let arc2 = new window.g.Node()
      arc2.setStyle({
        shape: 'ellipse',
        borderColor: '#fff',
        width: 120,
        height: 120,
        position: {
          x: 100,
          y: 100
        }
      })
      arc2.setAttr({type: 'arc'})
      arc2.setImage(`/static/rocker.jpg`)
      dc.add(arc2)
      dc.add(arc)

      diagram.addEventListener('mouseMoveData', (e) => {
        let pos1 = e.data.getPosition()
        let vecControl = new THREE.Vector2(pos1.x, pos1.y)
        let vecCenter = new THREE.Vector2(100, 100)
        if (vecControl.x === vecCenter.x && vecControl.y === vecCenter.y) return
        if (this.player.actionName === 'Idle') {
          this.action = 'Walk'
        }
        this.player.move = true
        let playerPos = this.player.object.position

        let pos = this.movedirPos = new Vector3(playerPos.x + 100 - vecControl.x, playerPos.y, playerPos.z + 100 - vecControl.y)

        this.player.object.lookAt(pos)

        let v1 = vecCenter.clone().sub(new THREE.Vector2(0, 1))
        let v2 = vecCenter.clone().sub(vecControl)
        let cosAngle = v1.dot(v2) / (v1.length() * v2.length())
        let angle = Math.acos(cosAngle)

        this.lastAngle = angle

        // let distance = vecControl.distanceTo(vecCenter)
        // if (distance >= 60) {
        // }
      })

      diagram.addEventListener('onMouseupData', (e) => {
        e.data.setPosition({
          x: 100,
          y: 100
        })
        this.player.move = false
        this.action = 'Idle'
      })
    }
  }
}
</script>
<style lang="scss">
#container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  box-sizing: border-box;
  #control {
    width: 200px;
    height: 200px;
  }
  .btn_group{
    position: absolute;
    top: 20px;
    left: 50px;
  }
}
</style>
