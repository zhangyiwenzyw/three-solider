<template>
  <div id='container'>
    <div class="btn-group">
      <div class="slider">
        <el-slider :value="sliderPercent" @input="inputSilder"></el-slider>
      </div>
      <button @click="pause">{{ btnText }}</button>
    </div>
  </div>
</template>
<script>
import * as THREE from 'three'
import OrbitControls from 'three-orbitcontrols'
import { OBJLoader, MTLLoader } from 'three-obj-mtl-loader'
import GLTFLoader from 'three/examples/js/loaders/GLTFLoader'
import { Scene, PerspectiveCamera } from 'three'
import DragControls from 'three/examples/js/controls/DragControls'
import TransformControls from 'three/examples/js/controls/TransformControls'

// import TGALoader from 'three/examples/js/loaders/TGALoader'
// import DDSLoader from 'three/examples/js/loaders/DDSLoader'
export default {
  data () {
    return {
      camera: null,
      scene: null,
      renderer: null,
      light: null,
      elements: [],
      btnText: 'pause',
      AnimationAction: null,
      AnimTime: 0,
      duration: 202,
      originPos: new THREE.Vertex(0, 0, 0)
    }
  },
  mounted () {
    this.init()
    window.addEventListener('resize', () => this.onWindowResize())
  },
  computed: {
    sliderPercent: {
      get () {
        return this.AnimTime / this.duration * 100
      },
      set (val) {
        // this.AnimationAction.time = this.duration * val
      }
    }
  },
  watch: {
    'AnimationAction.time' (val) {
      this.AnimTime = val
    },
    'AnimationAction.paused' (val) {
      val ? this.btnText = 'play' : this.btnText = 'pause'
    }
  },
  methods: {
    init () {
      // 添加操作器
      let container = this.container = document.getElementById('container')
      this.scene = new Scene()
      this.scene.background = new THREE.Color(0x000000)

      this.camera = new PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100000)
      this.camera.position.set(0, 100, 100)
      // this.camera.lookAt({x: 0, y: 0, z: 0})

      this.scene.add(new THREE.AmbientLight(0x999999))// 环境光

      this.createAxisHelper()

      this.renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true // 设置透明
      })
      // 设置颜色
      this.renderer.setClearColor(0xffffff, 0)
      // 设置分辨率
      this.renderer.setPixelRatio(window.devicePixelRatio)
      this.renderer.setSize(container.clientWidth, container.clientHeight)
      container.appendChild(this.renderer.domElement)

      this.controls = new OrbitControls(
        this.camera,
        this.renderer.domElement
      )
      // this.addEarth()
      this.controls.enabled = true
      this.objLoader = new OBJLoader()
      this.mtlLoader = new MTLLoader()
      this.loadObjWithMaterials('b1', '/static/objs/building/', 'outdoor_building_ljz_02.obj', 'outdoor_building_ljz_02.mtl', new THREE.Vector3(0, 0, 20), 0.1)
      this.loadObjWithMaterials('b2', '/static/objs/building/', 'outdoor_building_ljz_14.obj', 'outdoor_building_ljz_14.mtl', new THREE.Vector3(-50, -8, 40), 0.04)
      this.createCurve()
      // this.creatGroupLine()
      this.render()
      setTimeout(() => {
        this.initDragControls()
      }, 2000)
      this.addMouseDownEvent()
      this.addMouseMoveEvent()
      this.addMouseUpEvent()
    },
    render () {
      window.requestAnimationFrame(() => this.render())
      this.camera.lookAt(this.originPos)
      this.renderer.render(this.scene, this.camera)
      this.mixer.update(this.clock.getDelta())
      // this.texture.offset.x -= 0.001
      // this.texture.offset.y += 0.001
    },
    createAxisHelper () {
      const axes = new THREE.AxisHelper(100)
      // axes.position.set(0, 0, 0)
      this.scene.add(axes)
    },
    createPlane () {
      const planeBufferGeometry = new THREE.PlaneBufferGeometry(100, 100)
      this.plane = new THREE.Mesh(planeBufferGeometry, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }))
      this.plane.name = 'plane'
      this.plane.rotateX(-Math.PI / 2)
      this.scene.add(this.plane)
      let grid = new THREE.GridHelper(100, 10) // 大小， 格子大小， 中线颜色， 格子线颜色
      this.scene.add(grid)
      this.plane.receiveShadow = true
    },
    addMouseDownEvent () {
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
            if (item.object instanceof THREE.AxesHelper) {
              // item.object.rotateY(Math.PI / 180 * 30)
              item.object.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 180 * 30)
            }
          })
        }
      })
    },
    addMouseMoveEvent () {
      this.renderer.domElement.addEventListener('mousemove', event => {
      })
    },
    addMouseUpEvent () {
      this.renderer.domElement.addEventListener('mouseup', event => {
        this.curMouseDown = false
      })
    },
    convertTo3DCoordinate (clientX, clientY) {
      let mv = new THREE.Vector3(
        (clientX / this.container.clientWidth) * 2 - 1,
        -(clientY / this.container.clientHeight) * 2 + 1,
        -1)
      mv.unproject(this.camera) // 将一个向量转成threejs坐标
      return mv
    },
    onWindowResize () {
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
      this.camera.aspect = this.container.clientWidth / this.container.clientHeight
      this.camera.updateProjectionMatrix()
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
        this.elements.push(obj)
      })
    },
    deleteGroup (group) {
      // console.log(group);
      if (!group) return
      // 删除掉所有的模型组内的mesh
      group.traverse(function (item) {
        if (item instanceof THREE.Mesh) {
          item.geometry.dispose() // 删除几何体
          item.material.dispose() // 删除材质
        }
      })
    },
    createCurve () {
      let curve = this.curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(100, 60, -240),
        new THREE.Vector3(10, 100, 20),
        new THREE.Vector3(8, 100, 40),
        new THREE.Vector3(-20, 80, 100)
      ])
      let curve2 = this.curve2 = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-20, 80, 100),
        new THREE.Vector3(-60, 40, 40),
        new THREE.Vector3(-80, 40, -100),
        new THREE.Vector3(100, 60, -240)
      ])
      let points = curve.getPoints(100)
      let points2 = curve2.getPoints(100)
      let geometry = new THREE.Geometry()
      let geometry2 = new THREE.Geometry()
      // 把从曲线轨迹上获得的顶点坐标赋值给几何体
      geometry.vertices = points
      geometry2.vertices = points2
      let material = new THREE.LineBasicMaterial({
        color: 0x4488ff
      })
      let material2 = new THREE.LineBasicMaterial({
        color: 0x4488ff
      })
      let line = new THREE.Line(geometry, material)
      let line2 = new THREE.Line(geometry2, material2)

      line.visible = false
      line2.visible = false
      this.scene.add(line)
      this.scene.add(line2)

      // 通过Threejs的帧动画相关API播放网格模型沿着曲线做动画运动

      // 声明一个数组用于存储时间序列
      let arr = []
      for (let i = 0; i < 202; i++) {
        arr.push(i)
      }
      // 生成一个时间序列
      let times = this.times = new Float32Array(arr)

      let posArr = []
      points.forEach(elem => {
        posArr.push(elem.x, elem.y, elem.z)
      })
      points2.forEach(elem => {
        posArr.push(elem.x, elem.y, elem.z)
      })

      // 创建一个和时间序列相对应的位置坐标系列
      var values = new Float32Array(posArr)
      // 创建一个帧动画的关键帧数据，曲线上的位置序列对应一个时间序列
      var posTrack = new THREE.KeyframeTrack('.position', times, values)
      let duration = this.duration = 202
      let clip = new THREE.AnimationClip('default', duration, [posTrack])
      let mixer = this.mixer = new THREE.AnimationMixer(this.camera)
      let AnimationAction = this.AnimationAction = mixer.clipAction(clip)
      // AnimationAction.loop = THREE.LoopOnce
      AnimationAction.timeScale = 20
      AnimationAction.play()

      this.clock = new THREE.Clock()
    },
    pause () {
      console.log(this.AnimationAction)
      this.AnimationAction.paused = !this.AnimationAction.paused
    },
    inputSilder (val) {
      this.AnimationAction.paused = true
      this.AnimTime = this.AnimationAction.time = this.duration * (val / 100)
      this.AnimationAction.paused = false
    },
    creatGroupLine () {
      let geometry = new THREE.BoxBufferGeometry(0.05, 5, 0.05)

      let material = new THREE.MeshPhongMaterial({ map: THREE.ImageUtils.loadTexture('./static/贴图/飞光渐变.png') })
      let group = new THREE.Group()

      for (let i = 0; i < 20; i++) {
        let cube = new THREE.Mesh(geometry, material)
        let xNum = Math.random()
        let yNum = Math.random()
        let zNum = Math.random()
        cube.position.set(100 * xNum - 50, 50 * yNum, 100 * zNum - 100)
        group.add(cube)
      }
      this.scene.add(group)
    },
    addEarth () {
      const radius = 600
      let earthGeo = new THREE.SphereGeometry(radius, 100, 100)
      let texture = this.texture = new THREE.TextureLoader().load('static/贴图/环境光/星光2.jpg')
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      console.log(texture)
      let earthMater = new THREE.MeshPhongMaterial({
        map: texture,
        side: THREE.DoubleSide
      })
      let earthMesh = new THREE.Mesh(earthGeo, earthMater)
      var box = new THREE.Box3().setFromObject(earthMesh)
      console.log(box.min, box.max, box.getSize())
      this.scene.add(earthMesh)
    },
    initDragControls () {
      // 添加平移控件
      let transformControls = new TransformControls(this.camera, this.renderer.domElement)
      this.scene.add(transformControls)
      // transformControls.setMode('rotate') // 旋转
      // 过滤不是 Mesh 的物体,例如辅助网格对象
      let objects = []

      for (let i = 0; i < this.scene.children.length; i++) {
        // console.log(this.scene.children[i], this.scene.children[i].isGroup)
        if (this.scene.children[i].isGroup) {
          objects.push(this.scene.children[i])
        }
      }
      // console.log('initDragControls', this.scene.children, objects)
      // 初始化拖拽控件
      let dragControls = new DragControls(objects, this.camera, this.renderer.domElement)

      transformControls.addEventListener('dragging-changed', (event) => {
        this.controls.enabled = !event.value
      })

      // transformControls.addEventListener('mouseDown', (evt) => {
      //   // 平移开始时禁用相机控件
      //   this.orbitControls.enabled = false
      // })
      // transformControls.addEventListener('mouseUp', (evt) => {
      // // 平移结束时启用相机控件
      //   this.orbitControls.enabled = true
      // })
      // 鼠标略过事件
      dragControls.addEventListener('hoveron', (event) => {
        // 让变换控件对象和选中的对象绑定
        transformControls.attach(event.object)
      })

      // 开始拖拽
      dragControls.addEventListener('dragstart', (event) => {
        this.controls.enabled = false
      })

      dragControls.addEventListener('drag', (event) => {
        event.object.parent.position.copy(event.object.position) // parent的位置更新为object的位置
        event.object.position.set(0, 0, 0) // 相对于parent来说, position置为原始状态
      })
      // 拖拽结束
      dragControls.addEventListener('dragend', (event) => {
        this.controls.enabled = true
      })
    },
    loadArmGlft () {
      this.gltfLoader = new GLTFLoader()
      this.gltfLoader.load('static/block1.gltf', (gltf) => {
        console.log(gltf)
        let object = gltf.scene
        object.children.forEach((obj) => {
          obj.material.emissive = new THREE.Color('#ccc')
          obj.material.emissiveIntensity = 1
          obj.material.emissiveMap = obj.material.map
        })
        this.scene.add(object)
      })
    }
  }
}
</script>
<style lang="scss">
#container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  box-sizing: border-box;
  .btn-group {
    position: absolute;
    width: 80%;
    height: 80px;
    display: flex;
    align-items: center;
    box-sizing: border-box;
    button {
      width: 50px;
      margin-left: 10px;
    }
    .slider{
      flex: 1;
    }
  }
}
</style>
