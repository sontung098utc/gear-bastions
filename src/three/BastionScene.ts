import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { soundEngine } from '../audio/soundEngine';
import { getBastionMaxHp, getCrossbowDamage, getFireInterval } from '../state/storage';
import {
  ActiveBoosterMode,
  BarDef,
  DefenseType,
  EnemyType,
  GearDef,
  HudSnapshot,
  LevelConfig,
  PinDef,
  PlayerUpgrades,
} from '../types/game';
import {
  buildCannonTurret,
  buildCrossbowTurret,
  buildEnemyModel,
  buildFlameTrap,
  buildGearAssembly,
  buildPinMesh,
  createMaterialLibrary,
  MaterialLibrary,
  orientToFace,
} from './models';
import { createProceduralTextures, ProceduralTextureSet } from './textures';

// Pre-allocated scratch math objects (Zero GC inside render loop)
const _v3A = new THREE.Vector3();
const _v3B = new THREE.Vector3();
const _v3C = new THREE.Vector3();
const _projVec = new THREE.Vector3();

const PATH_0: THREE.Vector3[] = [
  new THREE.Vector3(-2.15, 0, 3.85),
  new THREE.Vector3(1.65, 0, 3.55),
  new THREE.Vector3(1.45, 0, 2.05),
  new THREE.Vector3(0.0, 0, 1.35),
  new THREE.Vector3(0.0, 0, 0.72),
];

const PATH_1: THREE.Vector3[] = [
  new THREE.Vector3(2.35, 0, 3.75),
  new THREE.Vector3(1.45, 0, 2.05),
  new THREE.Vector3(0.0, 0, 1.35),
  new THREE.Vector3(0.0, 0, 0.72),
];

const TRAP_POS = new THREE.Vector3(0.85, 0.03, 1.75);
const DEFAULT_CAM_POS = new THREE.Vector3(2.4, 6.2, 11.8);
const DEFAULT_CAM_TARGET = new THREE.Vector3(0, 1.15, 0.85);

interface PinRuntime {
  def: PinDef;
  group: THREE.Group;
  hitBox: THREE.Mesh;
  pinMaterial: THREE.MeshStandardMaterial;
  originalColor: THREE.Color;
  removed: boolean;
  animatingOut: boolean;
  animProgress: number;
  shakeTimer: number;
  flashTimer: number;
  basePos: THREE.Vector3;
  slideVec: THREE.Vector3;
}

interface BarRuntime {
  def: BarDef;
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  removed: boolean;
  dropping: boolean;
  dropVel: number;
  flashTimer: number;
}

interface GearRuntime {
  def: GearDef;
  group: THREE.Group;
  rustCrusts: THREE.Mesh[];
  hitBox: THREE.Mesh;
  gearMat: THREE.MeshPhysicalMaterial;
  targetRing?: THREE.Mesh;
  rustLevel: number; // 0 = clean, 1 = half, 2 = full rust
  snapped: boolean;
  snappingProgress: number;
  snapStartPos: THREE.Vector3;
  socketPos: THREE.Vector3;
  shakeTimer: number;
  flashTimer: number;
  spinning: boolean;
}

interface EnemyRuntime {
  id: number;
  type: EnemyType;
  root: THREE.Group;
  bodyMesh: THREE.Mesh;
  hpBarBg: THREE.Mesh;
  hpBarFill: THREE.Mesh;
  hp: number;
  maxHp: number;
  speed: number;
  gateDamage: number;
  path: THREE.Vector3[];
  waypointIndex: number;
  walkPhase: number;
  hitFlash: number;
  baseBodyColor: THREE.Color;
}

interface ProjectileRuntime {
  kind: 'bolt' | 'cannonball';
  mesh: THREE.Mesh;
  startPos: THREE.Vector3;
  pos: THREE.Vector3;
  targetEnemyId: number;
  targetLastPos: THREE.Vector3;
  speed: number;
  damage: number;
  aoeRadius: number;
  flightT: number;
  flightDuration: number;
}

interface ParticleRuntime {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface WaveSchedulerItem {
  triggerTime: number;
  type: EnemyType;
  pathIndex: 0 | 1;
  spawned: boolean;
}

export interface BastionCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onVictory: (snapshot: HudSnapshot) => void;
  onDefeat: (snapshot: HudSnapshot, reason: 'hp' | 'timeout') => void;
  onBoosterConsumed: (booster: 'hammer') => void;
  onFloatingText: (x: number, y: number, text: string, color: string) => void;
}

export class BastionScene {
  private container: HTMLElement;
  private callbacks: BastionCallbacks;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private textures: ProceduralTextureSet;
  private mats: MaterialLibrary;

  private dioramaGroup = new THREE.Group();
  private keepGroup = new THREE.Group();
  private levelObjectsGroup = new THREE.Group();
  private combatGroup = new THREE.Group();
  private stoneWallMeshes: THREE.Mesh[] = [];
  private trimMeshes: THREE.Mesh[] = [];
  private dualPathGroup = new THREE.Group();
  private goldenStoneMat: THREE.MeshStandardMaterial;

  // Defenses
  private crossbowTurret: ReturnType<typeof buildCrossbowTurret> | null = null;
  private cannonTurret: ReturnType<typeof buildCannonTurret> | null = null;
  private flameTrap: ReturnType<typeof buildFlameTrap> | null = null;
  private crossbowCooldown = 0;
  private cannonCooldown = 0;
  private flameCooldown = 0;
  private flameAnimTimer = 0;

  // Raycasting & Pointer
  private raycaster = new THREE.Raycaster();
  private pointerDownPos = new THREE.Vector2();
  private pointerDownTime = 0;

  // Game Runtime State
  private currentLevel: LevelConfig | null = null;
  private upgrades: PlayerUpgrades = { crossbowDamage: 1, fireRate: 1, bastionMaxHp: 1 };
  private isPlaying = false;
  private isPaused = false;
  private goldenSkin = false;
  private boosterMode: ActiveBoosterMode = 'none';

  private hp = 100;
  private maxHp = 100;
  private elapsedLevelTime = 0;
  private timeRemaining: number | null = null;
  private freezeRemaining = 0;
  private tapsUsed = 0;
  private rotatedToBack = false;
  private cameraResetting = false;
  private cameraShake = 0;

  private pins: PinRuntime[] = [];
  private bars: BarRuntime[] = [];
  private gears: GearRuntime[] = [];
  private activeDefenses = new Set<DefenseType>();
  private enemies: EnemyRuntime[] = [];
  private projectiles: ProjectileRuntime[] = [];
  private particles: ParticleRuntime[] = [];
  private spawnQueue: WaveSchedulerItem[] = [];
  private nextEnemyId = 1;
  private hudSyncTimer = 0;

  // Shared projectile/particle geometries
  private particleGeo = new THREE.BoxGeometry(0.09, 0.09, 0.09);
  private boltGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.34, 6);
  private cannonballGeo = new THREE.SphereGeometry(0.11, 10, 10);

  // Loop management
  private frameId = 0;
  private lastTimestamp = 0;
  private disposed = false;

  // Bound listeners
  private onResizeBound: () => void;
  private onPointerDownBound: (e: PointerEvent) => void;
  private onPointerUpBound: (e: PointerEvent) => void;

  constructor(container: HTMLElement, callbacks: BastionCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 480);
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x131b2e);
    this.scene.fog = new THREE.FogExp2(0x131b2e, 0.016);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const aspect = width / height;
    const fov = THREE.MathUtils.clamp(50 * (0.56 / Math.max(aspect, 0.42)), 45, 62);
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 80);
    this.camera.position.copy(DEFAULT_CAM_POS);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(DEFAULT_CAM_TARGET);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 8.2;
    this.controls.maxDistance = 16.5;
    this.controls.minPolarAngle = 0.35;
    this.controls.maxPolarAngle = 1.32;
    this.controls.addEventListener('start', () => {
      this.cameraResetting = false;
    });
    this.controls.update();

    this.raycaster.layers.set(1);

    // Textures & Materials
    this.textures = createProceduralTextures(this.renderer.capabilities.getMaxAnisotropy());
    this.mats = createMaterialLibrary(this.textures);
    this.goldenStoneMat = new THREE.MeshStandardMaterial({
      map: this.textures.goldMarbleMap,
      bumpMap: this.textures.stoneBump,
      bumpScale: 0.025,
      roughness: 0.45,
      metalness: 0.18,
    });

    this.setupLighting();
    this.buildStaticDiorama();

    this.scene.add(this.dioramaGroup);
    this.dioramaGroup.add(this.keepGroup);
    this.dioramaGroup.add(this.levelObjectsGroup);
    this.dioramaGroup.add(this.combatGroup);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.onResizeBound = () => this.handleResize();
    this.onPointerDownBound = (e: PointerEvent) => this.handlePointerDown(e);
    this.onPointerUpBound = (e: PointerEvent) => this.handlePointerUp(e);

    window.addEventListener('resize', this.onResizeBound);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDownBound);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUpBound);

    this.lastTimestamp = performance.now();
    this.startLoop();
  }

  private setupLighting() {
    const hemi = new THREE.HemisphereLight(0x9ec5ff, 0x3b2c20, 0.85);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.2);
    keyLight.position.set(6.5, 11, 7.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = this.isSoftwareGl ? 512 : 1024;
    keyLight.shadow.mapSize.height = this.isSoftwareGl ? 512 : 1024;
    const d = 6.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 30;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.75);
    rimLight.position.set(-6, 5, -8);
    this.scene.add(rimLight);
  }

  private buildStaticDiorama() {
    // 1. Octagonal Stone Plinth Base
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(4.35, 4.65, 0.55, 8),
      this.mats.stoneDark
    );
    plinth.position.set(0, -0.275, 0.75);
    plinth.receiveShadow = true;
    this.dioramaGroup.add(plinth);

    const brassRim = new THREE.Mesh(
      new THREE.CylinderGeometry(4.38, 4.42, 0.07, 8),
      this.mats.brass
    );
    brassRim.position.set(0, -0.02, 0.75);
    this.dioramaGroup.add(brassRim);
    this.trimMeshes.push(brassRim);

    const turfTop = new THREE.Mesh(
      new THREE.CylinderGeometry(4.2, 4.2, 0.04, 8),
      this.mats.turf
    );
    turfTop.position.set(0, 0.0, 0.75);
    turfTop.receiveShadow = true;
    this.dioramaGroup.add(turfTop);

    // 2. Bastion Keep Core (centered at (0, 0, -0.7))
    const keepBody = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.65, 2.5), this.mats.stone);
    keepBody.position.set(0, 1.325, -0.7);
    keepBody.castShadow = true;
    keepBody.receiveShadow = true;
    this.keepGroup.add(keepBody);
    this.stoneWallMeshes.push(keepBody);

    // Keep upper parapet ledge
    const keepCap = new THREE.Mesh(new THREE.BoxGeometry(3.22, 0.18, 2.72), this.mats.stoneDark);
    keepCap.position.set(0, 2.68, -0.7);
    keepCap.castShadow = true;
    keepCap.receiveShadow = true;
    this.keepGroup.add(keepCap);

    // 4 Corner Towers
    const towerCoords: [number, number][] = [
      [-1.48, 0.48],
      [1.48, 0.48],
      [-1.48, -1.88],
      [1.48, -1.88],
    ];
    for (const [tx, tz] of towerCoords) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 2.85, 8), this.mats.stone);
      tower.position.set(tx, 1.425, tz);
      tower.castShadow = true;
      tower.receiveShadow = true;
      this.keepGroup.add(tower);
      this.stoneWallMeshes.push(tower);

      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.45, 0.2, 8), this.mats.stoneDark);
      cap.position.set(tx, 2.85, tz);
      cap.castShadow = true;
      this.keepGroup.add(cap);

      const trim = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 6, 12), this.mats.brass);
      trim.rotation.x = Math.PI / 2;
      trim.position.set(tx, 2.74, tz);
      this.keepGroup.add(trim);
      this.trimMeshes.push(trim);
    }

    // Battlement merlons around roof perimeter
    const merlonGeo = new THREE.BoxGeometry(0.28, 0.24, 0.16);
    for (let x = -1.0; x <= 1.0; x += 0.5) {
      for (const z of [0.58, -1.98]) {
        const m = new THREE.Mesh(merlonGeo, this.mats.stone);
        m.position.set(x, 2.88, z);
        m.castShadow = true;
        this.keepGroup.add(m);
        this.stoneWallMeshes.push(m);
      }
    }

    // Front Bastion Gate (z = 0.56)
    const gateFrame = new THREE.Mesh(new THREE.BoxGeometry(1.16, 1.32, 0.18), this.mats.stoneDark);
    gateFrame.position.set(0, 0.66, 0.58);
    gateFrame.castShadow = true;
    this.keepGroup.add(gateFrame);

    const gateDoor = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.1, 0.12), this.mats.woodWalnut);
    gateDoor.position.set(0, 0.55, 0.63);
    gateDoor.receiveShadow = true;
    this.keepGroup.add(gateDoor);

    // Iron portcullis ribs
    for (let i = -2; i <= 2; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.05, 6), this.mats.iron);
      bar.position.set(i * 0.16, 0.55, 0.70);
      this.keepGroup.add(bar);
    }

    // Twin Ember Torches flanking the gate
    for (const side of [-0.72, 0.72]) {
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.12), this.mats.iron);
      bracket.position.set(side, 1.02, 0.64);
      this.keepGroup.add(bracket);

      const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), this.mats.ember);
      flame.position.set(side, 1.18, 0.68);
      this.keepGroup.add(flame);
    }

    // 3. Stone Cobble Road (Path 0)
    this.buildRoadSegments(PATH_0, this.dioramaGroup);
    this.buildPortalArch(PATH_0[0], 0.15, this.dioramaGroup);

    // Dual Path (visible only on Level 9)
    this.buildRoadSegments(PATH_1, this.dualPathGroup);
    this.buildPortalArch(PATH_1[0], -0.4, this.dualPathGroup);
    this.dualPathGroup.visible = false;
    this.dioramaGroup.add(this.dualPathGroup);

    // 4. Decorative Low-Poly Courtyard Rocks/Trees outside road
    const rockGeo = new THREE.DodecahedronGeometry(0.24, 0);
    const rockCoords: [number, number, number][] = [
      [-3.1, 0.14, 1.5],
      [3.15, 0.14, 1.1],
      [-2.8, 0.16, -1.3],
      [2.9, 0.14, -1.6],
      [-0.8, 0.12, 3.1],
    ];
    for (const [rx, ry, rz] of rockCoords) {
      const rock = new THREE.Mesh(rockGeo, this.mats.stoneDark);
      rock.position.set(rx, ry, rz);
      rock.rotation.set(rx, rz, 0.4);
      rock.scale.set(1.1, 0.75, 0.9);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.dioramaGroup.add(rock);
    }
  }

  private buildRoadSegments(waypoints: THREE.Vector3[], parent: THREE.Group) {
    for (let i = 0; i < waypoints.length - 1; i++) {
      const a = waypoints[i];
      const b = waypoints[i + 1];
      const dist = a.distanceTo(b);
      const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
      const angle = Math.atan2(b.x - a.x, b.z - a.z);

      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.04, dist + 0.32), this.mats.cobble);
      seg.position.set(mid.x, 0.02, mid.z);
      seg.rotation.y = angle;
      seg.receiveShadow = true;
      parent.add(seg);
    }
  }

  private buildPortalArch(pos: THREE.Vector3, rotY: number, parent: THREE.Group) {
    const portal = new THREE.Group();
    portal.position.copy(pos);
    portal.rotation.y = rotY;

    for (const side of [-0.52, 0.52]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.25, 0.24), this.mats.stoneDark);
      pillar.position.set(side, 0.625, 0);
      pillar.castShadow = true;
      portal.add(pillar);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.26, 0.3), this.mats.stoneDark);
    lintel.position.set(0, 1.32, 0);
    lintel.castShadow = true;
    portal.add(lintel);

    const vortex = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 14), this.mats.portalGlow);
    vortex.rotation.x = Math.PI / 2;
    vortex.position.set(0, 0.68, 0);
    portal.add(vortex);

    parent.add(portal);
  }

  public setGoldenSkin(enabled: boolean) {
    this.goldenSkin = enabled;
    const targetWallMat = enabled ? this.goldenStoneMat : this.mats.stone;

    for (const mesh of this.stoneWallMeshes) {
      mesh.material = targetWallMat;
    }
    for (const trim of this.trimMeshes) {
      trim.material = enabled ? this.mats.masterGold : this.mats.brass;
    }
  }

  public showTitleDiorama() {
    this.clearLevelRuntime();
    this.currentLevel = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.dualPathGroup.visible = false;
    this.cameraResetting = true;
  }

  public setUpgrades(upgrades: PlayerUpgrades) {
    this.upgrades = upgrades;
    const newMaxHp = getBastionMaxHp(upgrades);
    if (newMaxHp > this.maxHp) {
      this.hp += newMaxHp - this.maxHp;
    }
    this.maxHp = newMaxHp;
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
  }

  public setBoosterMode(mode: ActiveBoosterMode) {
    this.boosterMode = mode;
  }

  public resetCamera() {
    this.cameraResetting = true;
  }

  public activateFreeze(seconds: number) {
    this.freezeRemaining = Math.max(this.freezeRemaining, seconds);
    soundEngine.playFreeze();
    this.emitHud();
  }

  public reviveBastion(hpPercent: number, freezeSeconds: number) {
    this.hp = Math.max(1, Math.round(this.maxHp * hpPercent));
    this.freezeRemaining = Math.max(this.freezeRemaining, freezeSeconds);
    // Push back enemies too close to the gate so they don't instantly hit again
    for (const e of this.enemies) {
      if (e.root.position.z < 1.6) {
        e.waypointIndex = Math.max(1, e.waypointIndex - 1);
        e.root.position.copy(e.path[e.waypointIndex - 1]);
      }
    }
    this.isPlaying = true;
    this.isPaused = false;
    soundEngine.playFreeze();
    this.emitHud();
  }

  public loadLevel(level: LevelConfig, upgrades: PlayerUpgrades, startPlaying: boolean) {
    this.clearLevelRuntime();
    this.currentLevel = level;
    this.upgrades = upgrades;
    this.isPlaying = startPlaying;
    this.isPaused = false;
    this.boosterMode = 'none';

    this.maxHp = getBastionMaxHp(upgrades);
    this.hp = this.maxHp;
    this.elapsedLevelTime = 0;
    this.timeRemaining = level.timeLimitSeconds ?? null;
    this.freezeRemaining = 0;
    this.tapsUsed = 0;
    this.rotatedToBack = false;
    this.crossbowCooldown = 0.2;
    this.cannonCooldown = 0.5;
    this.flameCooldown = 0;
    this.flameAnimTimer = 0;

    this.dualPathGroup.visible = Boolean(level.dualPath);

    // Build Defenses present in this level
    if (level.defenses.includes('crossbow')) {
      this.crossbowTurret = buildCrossbowTurret(this.mats);
      this.crossbowTurret.root.position.set(-1.48, 2.95, 0.48);
      this.levelObjectsGroup.add(this.crossbowTurret.root);
    }
    if (level.defenses.includes('cannon')) {
      this.cannonTurret = buildCannonTurret(this.mats);
      this.cannonTurret.root.position.set(1.48, 2.95, 0.48);
      this.levelObjectsGroup.add(this.cannonTurret.root);
    }
    if (level.defenses.includes('flame')) {
      this.flameTrap = buildFlameTrap(this.mats);
      this.flameTrap.root.position.copy(TRAP_POS);
      this.levelObjectsGroup.add(this.flameTrap.root);
    }

    // Build Pins
    for (const pinDef of level.pins) {
      const built = buildPinMesh(pinDef, this.mats);
      built.hitBox.userData = { interactType: 'pin', id: pinDef.id };
      this.levelObjectsGroup.add(built.group);

      this.pins.push({
        def: pinDef,
        group: built.group,
        hitBox: built.hitBox,
        pinMaterial: built.pinMaterial,
        originalColor: built.pinMaterial.color.clone(),
        removed: false,
        animatingOut: false,
        animProgress: 0,
        shakeTimer: 0,
        flashTimer: 0,
        basePos: new THREE.Vector3(...pinDef.position),
        slideVec: new THREE.Vector3(...pinDef.slideDir).normalize(),
      });
    }

    // Build Overlapping Locking Bars
    for (const barDef of level.bars) {
      const mat = this.mats.iron.clone();
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(barDef.length, 0.11, 0.08), mat);
      orientToFace(mesh, barDef.face);
      mesh.position.set(...barDef.position);
      if (barDef.rotation) {
        mesh.rotation.set(...barDef.rotation);
      }
      mesh.castShadow = true;
      this.levelObjectsGroup.add(mesh);

      this.bars.push({
        def: barDef,
        mesh,
        mat,
        removed: false,
        dropping: false,
        dropVel: 0,
        flashTimer: 0,
      });
    }

    // Build Gears
    for (const gearDef of level.gears) {
      const radius = gearDef.radius ?? 0.3;
      const built = buildGearAssembly(radius, gearDef.kind, gearDef.face, this.mats);
      const socketPos = new THREE.Vector3(...gearDef.socketPosition);
      const startPos =
        gearDef.kind === 'loose' && gearDef.loosePosition
          ? new THREE.Vector3(...gearDef.loosePosition)
          : socketPos.clone();

      built.gearGroup.position.copy(startPos);
      if (gearDef.kind === 'loose') {
        built.gearGroup.rotation.set(-Math.PI / 2, 0, 0);
      }
      built.hitBox.userData = { interactType: 'gear', id: gearDef.id };
      this.levelObjectsGroup.add(built.gearGroup);

      let targetRing: THREE.Mesh | undefined;
      if (gearDef.kind === 'loose') {
        const ringMat = new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          emissive: 0xd97706,
          emissiveIntensity: 0.9,
          roughness: 0.3,
        });
        targetRing = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.88, 0.03, 8, 24), ringMat);
        orientToFace(targetRing, gearDef.face);
        targetRing.position.copy(socketPos);
        this.levelObjectsGroup.add(targetRing);

        // Axle pin at socket
        const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 8), this.mats.iron);
        orientToFace(axle, gearDef.face);
        axle.rotateX(Math.PI / 2);
        axle.position.copy(socketPos);
        this.levelObjectsGroup.add(axle);
      }

      this.gears.push({
        def: gearDef,
        group: built.gearGroup,
        rustCrusts: built.rustCrusts,
        hitBox: built.hitBox,
        gearMat: built.gearMat,
        targetRing,
        rustLevel: gearDef.kind === 'rusty' ? 2 : 0,
        snapped: gearDef.kind !== 'loose',
        snappingProgress: gearDef.kind !== 'loose' ? 1 : 0,
        snapStartPos: startPos.clone(),
        socketPos,
        shakeTimer: 0,
        flashTimer: 0,
        spinning: false,
      });
    }

    // Build wave scheduler
    for (const wave of level.waves) {
      for (let i = 0; i < wave.count; i++) {
        this.spawnQueue.push({
          triggerTime: wave.delay + i * wave.interval,
          type: wave.type,
          pathIndex: wave.pathIndex ?? 0,
          spawned: false,
        });
      }
    }

    this.recomputeMechanisms(false);
    this.cameraResetting = true;
    this.emitHud();
  }

  private clearLevelRuntime() {
    this.pins = [];
    this.bars = [];
    this.gears = [];
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.spawnQueue = [];
    this.activeDefenses.clear();
    this.crossbowTurret = null;
    this.cannonTurret = null;
    this.flameTrap = null;

    while (this.levelObjectsGroup.children.length > 0) {
      this.levelObjectsGroup.remove(this.levelObjectsGroup.children[0]);
    }
    while (this.combatGroup.children.length > 0) {
      this.combatGroup.remove(this.combatGroup.children[0]);
    }
  }

  private isEntityCleared(id: string): boolean {
    const pin = this.pins.find((p) => p.def.id === id);
    if (pin) return pin.removed || pin.animatingOut;

    const bar = this.bars.find((b) => b.def.id === id);
    if (bar) return bar.removed || bar.dropping;

    const gear = this.gears.find((g) => g.def.id === id);
    if (gear) return gear.snapped && gear.rustLevel === 0;

    return true;
  }

  private isPinBlocked(pin: PinRuntime): boolean {
    return pin.def.blockedBy.some((blockerId) => !this.isEntityCleared(blockerId));
  }

  private isGearBlocked(gear: GearRuntime): boolean {
    return (gear.def.blockedBy ?? []).some((blockerId) => !this.isEntityCleared(blockerId));
  }

  private highlightBlockers(blockerIds: string[]) {
    for (const bId of blockerIds) {
      const p = this.pins.find((item) => item.def.id === bId && !item.removed);
      if (p) p.flashTimer = 0.35;
      const b = this.bars.find((item) => item.def.id === bId && !item.removed);
      if (b) b.flashTimer = 0.35;
    }
  }

  private handlePointerDown(e: PointerEvent) {
    soundEngine.unlock();
    this.pointerDownPos.set(e.clientX, e.clientY);
    this.pointerDownTime = performance.now();
  }

  private handlePointerUp(e: PointerEvent) {
    if (!this.isPlaying || this.isPaused) return;
    const dx = e.clientX - this.pointerDownPos.x;
    const dy = e.clientY - this.pointerDownPos.y;
    const distSq = dx * dx + dy * dy;
    const elapsed = performance.now() - this.pointerDownTime;
    // Ignore orbit drags
    if (distSq > 100 || elapsed > 450) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hits = this.raycaster.intersectObjects(this.levelObjectsGroup.children, true);
    if (hits.length === 0) return;

    for (const hit of hits) {
      const data = hit.object.userData;
      if (data?.interactType === 'pin') {
        this.handlePinTap(data.id);
        return;
      }
      if (data?.interactType === 'gear') {
        this.handleGearTap(data.id);
        return;
      }
    }
  }

  private handlePinTap(id: string) {
    const pin = this.pins.find((p) => p.def.id === id);
    if (!pin || pin.removed || pin.animatingOut) return;

    this.tapsUsed++;
    const worldPos = new THREE.Vector3();
    pin.group.getWorldPosition(worldPos);

    if (this.boosterMode === 'hammer') {
      // Hammer breaks any pin even if blocked!
      this.boosterMode = 'none';
      this.callbacks.onBoosterConsumed('hammer');
      pin.animatingOut = true;
      soundEngine.playHammerSmash();
      this.spawnParticles(worldPos, 0xfbbf24, 14);
      this.emitFloatingTextAt(worldPos, 'SMASH!', '#fbbf24');
      this.checkBarsAndMechanisms();
      this.emitHud();
      return;
    }

    if (this.isPinBlocked(pin)) {
      pin.shakeTimer = 0.34;
      pin.flashTimer = 0.34;
      this.highlightBlockers(pin.def.blockedBy);
      soundEngine.playBlockedClank();
      this.emitFloatingTextAt(worldPos, 'BLOCKED', '#f87171');
      this.emitHud();
      return;
    }

    pin.animatingOut = true;
    soundEngine.playPinPop();
    this.spawnParticles(worldPos, 0xd97706, 9);
    this.checkBarsAndMechanisms();
    this.emitHud();
  }

  private handleGearTap(id: string) {
    const gear = this.gears.find((g) => g.def.id === id);
    if (!gear) return;

    this.tapsUsed++;
    const worldPos = new THREE.Vector3();
    gear.group.getWorldPosition(worldPos);

    // Hammer instantly cleans rusty gear or unlocks blocked gear!
    if (this.boosterMode === 'hammer' && (gear.rustLevel > 0 || !gear.snapped)) {
      this.boosterMode = 'none';
      this.callbacks.onBoosterConsumed('hammer');
      gear.rustLevel = 0;
      gear.rustCrusts.forEach((c) => (c.visible = false));
      if (!gear.snapped) {
        gear.snapped = true;
        gear.snappingProgress = 0;
        if (gear.targetRing) gear.targetRing.visible = false;
      }
      soundEngine.playHammerSmash();
      this.spawnParticles(worldPos, 0xfbbf24, 16);
      this.emitFloatingTextAt(worldPos, 'CLEANED!', '#fbbf24');
      this.recomputeMechanisms(true);
      this.emitHud();
      return;
    }

    if (this.isGearBlocked(gear)) {
      gear.shakeTimer = 0.34;
      gear.flashTimer = 0.34;
      if (gear.def.blockedBy) this.highlightBlockers(gear.def.blockedBy);
      soundEngine.playBlockedClank();
      this.emitFloatingTextAt(worldPos, 'SHAFT LOCKED', '#f87171');
      this.emitHud();
      return;
    }

    if (gear.def.kind === 'rusty' && gear.rustLevel > 0) {
      gear.rustLevel--;
      if (gear.rustLevel === 1) {
        if (gear.rustCrusts[0]) gear.rustCrusts[0].visible = false;
        soundEngine.playRustBreak(false);
        this.spawnParticles(worldPos, 0xb45309, 10);
        this.emitFloatingTextAt(worldPos, '1 MORE TAP!', '#fb923c');
      } else {
        gear.rustCrusts.forEach((c) => (c.visible = false));
        soundEngine.playRustBreak(true);
        this.spawnParticles(worldPos, 0xf59e0b, 16);
        this.emitFloatingTextAt(worldPos, 'GEAR ACTIVE!', '#34d399');
        this.recomputeMechanisms(true);
      }
      this.emitHud();
      return;
    }

    if (gear.def.kind === 'loose' && !gear.snapped) {
      gear.snapped = true;
      gear.snappingProgress = 0;
      if (gear.targetRing) gear.targetRing.visible = false;
      soundEngine.playGearSnap();
      this.spawnParticles(gear.socketPos, 0xfbbf24, 14);
      this.emitFloatingTextAt(gear.socketPos, 'SNAPPED!', '#34d399');
      this.recomputeMechanisms(true);
      this.emitHud();
    }
  }

  private checkBarsAndMechanisms() {
    for (const bar of this.bars) {
      if (bar.removed || bar.dropping) continue;
      const allCleared = bar.def.heldByPins.every((pid) => this.isEntityCleared(pid));
      if (allCleared) {
        bar.dropping = true;
      }
    }
    this.recomputeMechanisms(true);
  }

  private recomputeMechanisms(announce: boolean) {
    if (!this.currentLevel) return;

    // Spin gears that are unblocked, snapped, and rust-free
    for (const gear of this.gears) {
      const ready = gear.snapped && gear.rustLevel === 0 && !this.isGearBlocked(gear);
      if (ready && !gear.spinning) {
        gear.spinning = true;
        if (announce && gear.def.kind === 'driven') {
          soundEngine.playGearSnap();
        }
      }
    }

    for (const def of this.currentLevel.defenses) {
      const wasActive = this.activeDefenses.has(def);
      if (wasActive) continue;

      const initiallyActive = this.currentLevel.initiallyActiveDefenses?.includes(def);
      const reqPins = this.pins.filter((p) => p.def.unlocksDefense === def);
      const reqGears = this.gears.filter((g) => g.def.activatesDefense === def);

      const pinsOk = reqPins.every((p) => p.removed || p.animatingOut);
      const gearsOk = reqGears.every((g) => g.snapped && g.rustLevel === 0 && !this.isGearBlocked(g));

      if (initiallyActive || (pinsOk && gearsOk && (reqPins.length > 0 || reqGears.length > 0))) {
        this.activeDefenses.add(def);
        if (announce) {
          soundEngine.playGearSnap();
          const label =
            def === 'crossbow'
              ? 'CROSSBOW ONLINE!'
              : def === 'flame'
              ? 'EMBER TRAP ARMED!'
              : 'CANNON READY!';
          const pos =
            def === 'crossbow'
              ? new THREE.Vector3(-1.48, 3.5, 0.48)
              : def === 'cannon'
              ? new THREE.Vector3(1.48, 3.5, 0.48)
              : TRAP_POS.clone().add(new THREE.Vector3(0, 0.8, 0));
          this.emitFloatingTextAt(pos, label, '#4ade80');
        }
      }
    }

    // Update status gems on turrets & flame trap
    if (this.crossbowTurret) {
      const mat = this.crossbowTurret.statusLight.material as THREE.MeshStandardMaterial;
      const on = this.activeDefenses.has('crossbow');
      mat.color.setHex(on ? 0x22c55e : 0x475569);
      mat.emissive.setHex(on ? 0x16a34a : 0x000000);
      mat.emissiveIntensity = on ? 1.4 : 0;
    }
    if (this.cannonTurret) {
      const mat = this.cannonTurret.statusLight.material as THREE.MeshStandardMaterial;
      const on = this.activeDefenses.has('cannon');
      mat.color.setHex(on ? 0xf59e0b : 0x475569);
      mat.emissive.setHex(on ? 0xd97706 : 0x000000);
      mat.emissiveIntensity = on ? 1.4 : 0;
    }
    if (this.flameTrap) {
      const mat = this.flameTrap.emberCore.material as THREE.MeshStandardMaterial;
      const on = this.activeDefenses.has('flame');
      mat.emissiveIntensity = on ? 1.35 : 0.15;
    }
  }

  private spawnEnemy(type: EnemyType, pathIndex: 0 | 1) {
    const built = buildEnemyModel(type, this.mats);
    const path = pathIndex === 1 && this.currentLevel?.dualPath ? PATH_1 : PATH_0;
    built.root.position.copy(path[0]);
    this.combatGroup.add(built.root);

    const hp = type === 'boss' ? 820 : type === 'heavy' ? 210 : type === 'shield' ? 125 : 55;
    const speed = type === 'boss' ? 0.40 : type === 'heavy' ? 0.62 : type === 'shield' ? 0.72 : 0.95;
    const gateDamage = type === 'boss' ? 100 : type === 'heavy' ? 30 : type === 'shield' ? 22 : 15;

    const bodyMat = built.bodyMesh.material as THREE.MeshStandardMaterial;

    this.enemies.push({
      id: this.nextEnemyId++,
      type,
      root: built.root,
      bodyMesh: built.bodyMesh,
      hpBarBg: built.hpBarBg,
      hpBarFill: built.hpBarFill,
      hp,
      maxHp: hp,
      speed,
      gateDamage,
      path,
      waypointIndex: 1,
      walkPhase: Math.random() * Math.PI * 2,
      hitFlash: 0,
      baseBodyColor: bodyMat.color.clone(),
    });
  }

  private spawnParticles(origin: THREE.Vector3, hexColor: number, count: number) {
    const mat = new THREE.MeshBasicMaterial({ color: hexColor });
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.particleGeo, mat);
      mesh.position.copy(origin);
      this.combatGroup.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.5;
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(Math.cos(angle) * speed, 1.8 + Math.random() * 2.6, Math.sin(angle) * speed),
        life: 0,
        maxLife: 0.35 + Math.random() * 0.25,
      });
    }
  }

  private emitFloatingTextAt(worldPos: THREE.Vector3, text: string, color: string) {
    _projVec.copy(worldPos).project(this.camera);
    if (_projVec.z > 1) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const x = ((_projVec.x + 1) / 2) * w;
    const y = (-(_projVec.y - 1) / 2) * h;
    this.callbacks.onFloatingText(x, y, text, color);
  }

  private applyDamageToEnemy(enemy: EnemyRuntime, dmg: number, isCrit = false) {
    enemy.hp -= dmg;
    enemy.hitFlash = 0.14;
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    enemy.hpBarFill.scale.x = Math.max(0.001, ratio);
    enemy.hpBarFill.position.x = -(1 - ratio) * (enemy.type === 'boss' ? 0.52 : 0.255);

    _v3A.copy(enemy.root.position).add(new THREE.Vector3(0, enemy.type === 'boss' ? 1.6 : 0.95, 0));
    this.emitFloatingTextAt(_v3A, `-${Math.round(dmg)}`, isCrit ? '#fbbf24' : '#ffffff');

    if (enemy.hp <= 0) {
      soundEngine.playImpact(enemy.type === 'boss');
      this.spawnParticles(
        enemy.root.position.clone().add(new THREE.Vector3(0, 0.5, 0)),
        enemy.type === 'boss' ? 0xf59e0b : 0xef4444,
        enemy.type === 'boss' ? 28 : 12
      );
      this.combatGroup.remove(enemy.root);
    }
  }

  private startLoop() {
    const tick = (now: number) => {
      if (this.disposed) return;
      const rawDt = (now - this.lastTimestamp) / 1000;
      this.lastTimestamp = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      this.update(dt, now * 0.001);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(() => tick(performance.now()));
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.frameId = window.setTimeout(() => tick(performance.now()), 16);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private update(dt: number, elapsedSec: number) {
    // Camera reset damping
    if (this.cameraResetting) {
      const k = 1 - Math.exp(-8 * dt);
      this.camera.position.lerp(DEFAULT_CAM_POS, k);
      this.controls.target.lerp(DEFAULT_CAM_TARGET, k);
      if (this.camera.position.distanceTo(DEFAULT_CAM_POS) < 0.05) {
        this.camera.position.copy(DEFAULT_CAM_POS);
        this.controls.target.copy(DEFAULT_CAM_TARGET);
        this.cameraResetting = false;
      }
    }

    // Track if player orbited to see back of Bastion (for Lv4 hint)
    if (!this.rotatedToBack && this.camera.position.z < -2.2) {
      this.rotatedToBack = true;
    }

    // Idle turntable rotation on title screen
    if (!this.isPlaying && this.currentLevel === null) {
      this.dioramaGroup.rotation.y += dt * 0.25;
    } else if (!this.isPlaying) {
      this.dioramaGroup.rotation.y = THREE.MathUtils.damp(this.dioramaGroup.rotation.y, 0, 5, dt);
    } else {
      this.dioramaGroup.rotation.y = 0;
    }

    // Camera shake decay
    if (this.cameraShake > 0) {
      this.cameraShake = Math.max(0, this.cameraShake - dt * 3.5);
      this.dioramaGroup.position.x = (Math.random() - 0.5) * this.cameraShake * 0.14;
      this.dioramaGroup.position.y = (Math.random() - 0.5) * this.cameraShake * 0.08;
    } else {
      this.dioramaGroup.position.set(0, 0, 0);
    }

    this.controls.update();

    if (!this.isPlaying || this.isPaused || !this.currentLevel) return;

    this.elapsedLevelTime += dt;
    if (this.freezeRemaining > 0) {
      this.freezeRemaining = Math.max(0, this.freezeRemaining - dt);
    }

    // Level 9 countdown timer
    if (this.timeRemaining !== null) {
      this.timeRemaining = Math.max(0, this.timeRemaining - dt);
      if (this.timeRemaining <= 0 && (this.enemies.length > 0 || this.spawnQueue.some((s) => !s.spawned))) {
        this.isPlaying = false;
        soundEngine.playDefeat();
        this.callbacks.onDefeat(this.buildSnapshot(), 'timeout');
        return;
      }
    }

    // Spawn waves
    for (const item of this.spawnQueue) {
      if (!item.spawned && this.elapsedLevelTime >= item.triggerTime) {
        item.spawned = true;
        this.spawnEnemy(item.type, item.pathIndex);
      }
    }

    // Animate Pins
    for (const pin of this.pins) {
      if (pin.animatingOut && !pin.removed) {
        pin.animProgress = Math.min(1, pin.animProgress + dt * 4.2);
        const ease = 1 - Math.pow(1 - pin.animProgress, 3);
        _v3A.copy(pin.slideVec).multiplyScalar(ease * 0.9);
        pin.group.position.copy(pin.basePos).add(_v3A);
        pin.group.scale.setScalar(Math.max(0.01, 1 - ease * 0.85));
        if (pin.animProgress >= 1) {
          pin.removed = true;
          pin.group.visible = false;
        }
      } else if (!pin.removed) {
        if (pin.shakeTimer > 0) {
          pin.shakeTimer = Math.max(0, pin.shakeTimer - dt);
          const jitter = Math.sin(pin.shakeTimer * 60) * 0.06;
          _v3A.copy(pin.slideVec).multiplyScalar(jitter);
          pin.group.position.copy(pin.basePos).add(_v3A);
        } else {
          pin.group.position.copy(pin.basePos);
        }
        if (pin.flashTimer > 0) {
          pin.flashTimer = Math.max(0, pin.flashTimer - dt);
          pin.pinMaterial.emissive.setHex(0xdc2626);
          pin.pinMaterial.emissiveIntensity = pin.flashTimer * 4.0;
        } else {
          pin.pinMaterial.emissive.setHex(pin.def.isMasterLock ? 0x452800 : 0x000000);
          pin.pinMaterial.emissiveIntensity = pin.def.isMasterLock ? 0.35 : 0;
        }
      }
    }

    // Animate Bars dropping
    for (const bar of this.bars) {
      if (bar.dropping && !bar.removed) {
        bar.dropVel += dt * 14;
        bar.mesh.position.y -= bar.dropVel * dt;
        bar.mesh.rotation.z += dt * 2.5;
        if (bar.mesh.position.y < -0.5) {
          bar.removed = true;
          bar.mesh.visible = false;
        }
      } else if (!bar.removed) {
        if (bar.flashTimer > 0) {
          bar.flashTimer = Math.max(0, bar.flashTimer - dt);
          bar.mat.emissive.setHex(0xf59e0b);
          bar.mat.emissiveIntensity = bar.flashTimer * 3.5;
        } else {
          bar.mat.emissive.setHex(0x000000);
          bar.mat.emissiveIntensity = 0;
        }
      }
    }

    // Animate Gears
    for (const gear of this.gears) {
      if (gear.snapped && gear.snappingProgress < 1) {
        gear.snappingProgress = Math.min(1, gear.snappingProgress + dt * 3.6);
        const t = 1 - Math.pow(1 - gear.snappingProgress, 3);
        gear.group.position.lerpVectors(gear.snapStartPos, gear.socketPos, t);
        gear.group.position.y += Math.sin(t * Math.PI) * 0.55;
        orientToFace(gear.group, gear.def.face);
      } else if (!gear.snapped && gear.def.loosePosition) {
        // Gentle idle hover for loose gear
        gear.group.position.y = gear.def.loosePosition[1] + Math.sin(elapsedSec * 3.0) * 0.05;
        if (gear.targetRing) {
          gear.targetRing.rotation.z += dt * 1.5;
        }
      }

      if (gear.spinning && gear.snappingProgress >= 1) {
        gear.group.rotateZ(dt * 2.4);
      }

      if (gear.shakeTimer > 0) {
        gear.shakeTimer = Math.max(0, gear.shakeTimer - dt);
        gear.group.position.x =
          (gear.snapped ? gear.socketPos.x : gear.snapStartPos.x) + Math.sin(gear.shakeTimer * 55) * 0.05;
      }

      if (gear.flashTimer > 0) {
        gear.flashTimer = Math.max(0, gear.flashTimer - dt);
        gear.gearMat.emissive.setHex(0xdc2626);
        gear.gearMat.emissiveIntensity = gear.flashTimer * 3.5;
      } else {
        gear.gearMat.emissive.setHex(0x000000);
        gear.gearMat.emissiveIntensity = 0;
      }
    }

    // Update Enemies
    const frozen = this.freezeRemaining > 0;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.hp <= 0) {
        this.enemies.splice(i, 1);
        continue;
      }

      // Billboard HP bar toward camera
      e.hpBarBg.quaternion.copy(this.camera.quaternion);
      e.hpBarFill.quaternion.copy(this.camera.quaternion);

      const bodyMat = e.bodyMesh.material as THREE.MeshStandardMaterial;
      if (e.hitFlash > 0) {
        e.hitFlash = Math.max(0, e.hitFlash - dt);
        bodyMat.emissive.setHex(0xffffff);
        bodyMat.emissiveIntensity = 0.85;
      } else if (frozen) {
        bodyMat.emissive.setHex(0x38bdf8);
        bodyMat.emissiveIntensity = 0.45;
      } else {
        bodyMat.emissive.setHex(0x000000);
        bodyMat.emissiveIntensity = 0;
      }

      if (!frozen) {
        const targetWp = e.path[e.waypointIndex];
        _v3A.subVectors(targetWp, e.root.position);
        _v3A.y = 0;
        const dist = _v3A.length();
        if (dist < 0.12) {
          if (e.waypointIndex < e.path.length - 1) {
            e.waypointIndex++;
          } else {
            // Reached Bastion Gate!
            this.hp = Math.max(0, this.hp - e.gateDamage);
            this.cameraShake = e.type === 'boss' ? 1.2 : 0.55;
            soundEngine.playImpact(e.type === 'boss');
            this.spawnParticles(
              new THREE.Vector3(0, 0.65, 0.72),
              0xef4444,
              e.type === 'boss' ? 24 : 10
            );
            this.emitFloatingTextAt(new THREE.Vector3(0, 1.3, 0.75), `-${e.gateDamage} GATE`, '#ef4444');
            this.combatGroup.remove(e.root);
            this.enemies.splice(i, 1);

            if (this.hp <= 0) {
              this.isPlaying = false;
              soundEngine.playDefeat();
              this.callbacks.onDefeat(this.buildSnapshot(), 'hp');
              return;
            }
            continue;
          }
        } else {
          _v3A.normalize();
          e.root.position.addScaledVector(_v3A, e.speed * dt);
          const targetAngle = Math.atan2(_v3A.x, _v3A.z);
          e.root.rotation.y = targetAngle;
          e.walkPhase += dt * (e.type === 'boss' ? 5 : 10);
          e.root.position.y = Math.abs(Math.sin(e.walkPhase)) * (e.type === 'boss' ? 0.03 : 0.06);
        }
      }
    }

    // Turret Combat
    this.updateDefenses(dt);
    this.updateProjectiles(dt);
    this.updateParticles(dt);

    // Victory check
    const allSpawned = this.spawnQueue.every((s) => s.spawned);
    if (allSpawned && this.enemies.length === 0 && this.hp > 0) {
      this.isPlaying = false;
      soundEngine.playVictory();
      this.callbacks.onVictory(this.buildSnapshot());
      return;
    }

    this.hudSyncTimer += dt;
    if (this.hudSyncTimer >= 0.1) {
      this.hudSyncTimer = 0;
      this.emitHud();
    }
  }

  private findNearestEnemy(origin: THREE.Vector3, maxRange: number): EnemyRuntime | null {
    let best: EnemyRuntime | null = null;
    let bestDist = maxRange;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const d = origin.distanceTo(e.root.position);
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  private updateDefenses(dt: number) {
    const damage = getCrossbowDamage(this.upgrades);
    const interval = getFireInterval(this.upgrades);

    // 1. Crossbow Turret
    if (this.crossbowTurret && this.activeDefenses.has('crossbow')) {
      this.crossbowCooldown = Math.max(0, this.crossbowCooldown - dt);
      const origin = this.crossbowTurret.root.position;
      const target = this.findNearestEnemy(origin, 9.5);
      if (target) {
        const angle = Math.atan2(
          target.root.position.x - origin.x,
          target.root.position.z - origin.z
        );
        this.crossbowTurret.swivelHead.rotation.y = angle;

        if (this.crossbowCooldown <= 0) {
          this.crossbowCooldown = interval;
          soundEngine.playCrossbowShot();
          const bolt = new THREE.Mesh(this.boltGeo, this.mats.brass);
          bolt.rotation.x = Math.PI / 2;
          const startPos = origin.clone().add(new THREE.Vector3(0, 0.36, 0));
          bolt.position.copy(startPos);
          this.combatGroup.add(bolt);

          this.projectiles.push({
            kind: 'bolt',
            mesh: bolt,
            startPos: startPos.clone(),
            pos: startPos,
            targetEnemyId: target.id,
            targetLastPos: target.root.position.clone().add(new THREE.Vector3(0, 0.45, 0)),
            speed: 13.5,
            damage,
            aoeRadius: 0,
            flightT: 0,
            flightDuration: 0.25,
          });
        }
      }
    }

    // 2. Heavy Cannon / Mortar
    if (this.cannonTurret && this.activeDefenses.has('cannon')) {
      this.cannonCooldown = Math.max(0, this.cannonCooldown - dt);
      const origin = this.cannonTurret.root.position;
      const target = this.findNearestEnemy(origin, 10.0);
      if (target) {
        const angle = Math.atan2(
          target.root.position.x - origin.x,
          target.root.position.z - origin.z
        );
        this.cannonTurret.swivelHead.rotation.y = angle;

        if (this.cannonCooldown <= 0) {
          this.cannonCooldown = Math.max(1.2, interval * 2.4);
          soundEngine.playCannonShot();
          const ball = new THREE.Mesh(this.cannonballGeo, this.mats.iron);
          const startPos = origin.clone().add(new THREE.Vector3(0, 0.48, 0));
          ball.position.copy(startPos);
          this.combatGroup.add(ball);

          const targetPos = target.root.position.clone().add(new THREE.Vector3(0, 0.3, 0));
          const dist = startPos.distanceTo(targetPos);
          this.projectiles.push({
            kind: 'cannonball',
            mesh: ball,
            startPos: startPos.clone(),
            pos: startPos,
            targetEnemyId: target.id,
            targetLastPos: targetPos,
            speed: 7.5,
            damage: Math.round(damage * 2.15),
            aoeRadius: 1.35,
            flightT: 0,
            flightDuration: Math.max(0.45, dist / 7.5),
          });
        }
      }
    }

    // 3. Flame / Spike Floor Trap
    if (this.flameTrap && this.activeDefenses.has('flame')) {
      this.flameCooldown = Math.max(0, this.flameCooldown - dt);
      if (this.flameAnimTimer > 0) {
        this.flameAnimTimer = Math.max(0, this.flameAnimTimer - dt);
        this.flameTrap.spikesGroup.position.y = this.flameAnimTimer > 0.15 ? 0.14 : -0.18;
      }

      if (this.flameCooldown <= 0) {
        const triggered = this.enemies.some((e) => e.root.position.distanceTo(TRAP_POS) < 0.95);
        if (triggered) {
          this.flameCooldown = 1.65;
          this.flameAnimTimer = 0.42;
          soundEngine.playFlameTrap();
          this.spawnParticles(TRAP_POS.clone().add(new THREE.Vector3(0, 0.25, 0)), 0xff5a1f, 16);
          const trapDmg = Math.round(28 + damage * 0.45);
          for (const e of this.enemies) {
            if (e.root.position.distanceTo(TRAP_POS) < 1.25) {
              this.applyDamageToEnemy(e, trapDmg, false);
            }
          }
        }
      }
    }
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const target = this.enemies.find((e) => e.id === p.targetEnemyId && e.hp > 0);
      if (target) {
        p.targetLastPos.copy(target.root.position).add(new THREE.Vector3(0, 0.45, 0));
      }

      if (p.kind === 'bolt') {
        _v3B.subVectors(p.targetLastPos, p.pos);
        const dist = _v3B.length();
        if (dist < 0.28) {
          if (target) {
            this.applyDamageToEnemy(target, p.damage, false);
          }
          this.spawnParticles(p.pos, 0xfde047, 5);
          this.combatGroup.remove(p.mesh);
          this.projectiles.splice(i, 1);
        } else {
          _v3B.normalize();
          p.pos.addScaledVector(_v3B, p.speed * dt);
          p.mesh.position.copy(p.pos);
          p.mesh.lookAt(p.targetLastPos);
          p.mesh.rotateX(Math.PI / 2);
        }
      } else {
        // Arcing cannonball
        p.flightT += dt / p.flightDuration;
        const t = Math.min(1, p.flightT);
        p.pos.lerpVectors(p.startPos, p.targetLastPos, t);
        p.pos.y += Math.sin(t * Math.PI) * 1.9;
        p.mesh.position.copy(p.pos);

        if (t >= 1) {
          // AoE blast
          this.cameraShake = Math.max(this.cameraShake, 0.35);
          soundEngine.playImpact(true);
          this.spawnParticles(p.targetLastPos, 0xf97316, 18);
          for (const e of this.enemies) {
            if (e.root.position.distanceTo(p.targetLastPos) <= p.aoeRadius) {
              this.applyDamageToEnemy(e, p.damage, true);
            }
          }
          this.combatGroup.remove(p.mesh);
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life += dt;
      if (pt.life >= pt.maxLife) {
        this.combatGroup.remove(pt.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      pt.vel.y -= 9.5 * dt;
      pt.mesh.position.addScaledVector(pt.vel, dt);
      pt.mesh.rotation.x += dt * 8;
      pt.mesh.rotation.y += dt * 6;
      const scale = Math.max(0.05, 1 - pt.life / pt.maxLife);
      pt.mesh.scale.setScalar(scale);
    }
  }

  private buildSnapshot(): HudSnapshot {
    const remainingToSpawn = this.spawnQueue.filter((s) => !s.spawned).length;
    const totalWaves = this.currentLevel ? this.currentLevel.waves.length : 1;
    let waveIdx = 1;
    if (this.currentLevel) {
      for (let i = 0; i < this.currentLevel.waves.length; i++) {
        if (this.elapsedLevelTime >= this.currentLevel.waves[i].delay) {
          waveIdx = i + 1;
        }
      }
    }
    const puzzleSolved =
      this.pins.every((p) => p.removed || p.animatingOut) &&
      this.gears.every((g) => g.snapped && g.rustLevel === 0);

    return {
      hp: this.hp,
      maxHp: this.maxHp,
      waveIndex: waveIdx,
      totalWaves,
      enemiesRemaining: this.enemies.length + remainingToSpawn,
      tapsUsed: this.tapsUsed,
      timeRemaining: this.timeRemaining,
      freezeRemaining: this.freezeRemaining,
      activeDefenses: Array.from(this.activeDefenses),
      puzzleSolved,
      rotatedToBack: this.rotatedToBack,
    };
  }

  private emitHud() {
    this.callbacks.onHudUpdate(this.buildSnapshot());
  }

  private handleResize() {
    if (this.disposed) return;
    const width = Math.max(this.container.clientWidth, 320);
    const height = Math.max(this.container.clientHeight, 480);
    const aspect = width / height;
    this.camera.fov = THREE.MathUtils.clamp(50 * (0.56 / Math.max(aspect, 0.42)), 45, 62);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.onResizeBound);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDownBound);
    this.renderer.domElement.removeEventListener('pointerup', this.onPointerUpBound);
    this.controls.dispose();
    this.goldenStoneMat.dispose();
    this.textures.dispose();
    this.mats.dispose();
    this.particleGeo.dispose();
    this.boltGeo.dispose();
    this.cannonballGeo.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
