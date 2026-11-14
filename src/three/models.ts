import * as THREE from 'three';
import { BastionFace, EnemyType, PinDef } from '../types/game';
import { ProceduralTextureSet } from './textures';

export interface MaterialLibrary {
  stone: THREE.MeshStandardMaterial;
  stoneDark: THREE.MeshStandardMaterial;
  brass: THREE.MeshPhysicalMaterial;
  iron: THREE.MeshStandardMaterial;
  woodOak: THREE.MeshStandardMaterial;
  woodWalnut: THREE.MeshStandardMaterial;
  masterGold: THREE.MeshPhysicalMaterial;
  rust: THREE.MeshStandardMaterial;
  ember: THREE.MeshStandardMaterial;
  turf: THREE.MeshStandardMaterial;
  cobble: THREE.MeshStandardMaterial;
  portalGlow: THREE.MeshStandardMaterial;
  contactShadow: THREE.MeshBasicMaterial;
  dispose: () => void;
}

export function createMaterialLibrary(tex: ProceduralTextureSet): MaterialLibrary {
  const stone = new THREE.MeshStandardMaterial({
    map: tex.stoneMap,
    bumpMap: tex.stoneBump,
    bumpScale: 0.03,
    roughness: 0.85,
    metalness: 0.05,
  });

  const stoneDark = new THREE.MeshStandardMaterial({
    color: 0x6f685f,
    bumpMap: tex.stoneBump,
    bumpScale: 0.025,
    roughness: 0.9,
    metalness: 0.08,
  });

  const brass = new THREE.MeshPhysicalMaterial({
    color: 0xe6b44c,
    map: tex.brassBrushMap,
    metalness: 0.88,
    roughness: 0.24,
    clearcoat: 0.35,
    clearcoatRoughness: 0.2,
  });

  const iron = new THREE.MeshStandardMaterial({
    color: 0x3b424d,
    metalness: 0.78,
    roughness: 0.42,
  });

  const woodOak = new THREE.MeshStandardMaterial({
    color: 0xd69656,
    map: tex.woodMap,
    roughness: 0.72,
    metalness: 0.04,
  });

  const woodWalnut = new THREE.MeshStandardMaterial({
    color: 0x7d4c2a,
    map: tex.woodMap,
    roughness: 0.68,
    metalness: 0.06,
  });

  const masterGold = new THREE.MeshPhysicalMaterial({
    color: 0xffcf48,
    emissive: 0x452800,
    emissiveIntensity: 0.35,
    metalness: 0.92,
    roughness: 0.18,
    clearcoat: 0.6,
  });

  const rust = new THREE.MeshStandardMaterial({
    color: 0x8f3e1e,
    roughness: 0.95,
    metalness: 0.12,
  });

  const ember = new THREE.MeshStandardMaterial({
    color: 0xff5a1f,
    emissive: 0xff4500,
    emissiveIntensity: 1.4,
    roughness: 0.35,
    metalness: 0.1,
  });

  const turf = new THREE.MeshStandardMaterial({
    color: 0x3f5d45,
    roughness: 0.92,
    metalness: 0.02,
  });

  const cobble = new THREE.MeshStandardMaterial({
    map: tex.cobbleMap,
    bumpMap: tex.stoneBump,
    bumpScale: 0.02,
    roughness: 0.86,
    metalness: 0.05,
  });

  const portalGlow = new THREE.MeshStandardMaterial({
    color: 0xa855f7,
    emissive: 0x7e22ce,
    emissiveIntensity: 1.5,
    roughness: 0.2,
    metalness: 0.1,
    transparent: true,
    opacity: 0.86,
  });

  const contactShadow = new THREE.MeshBasicMaterial({
    map: tex.contactShadowMap,
    transparent: true,
    depthWrite: false,
    opacity: 0.55,
  });

  return {
    stone,
    stoneDark,
    brass,
    iron,
    woodOak,
    woodWalnut,
    masterGold,
    rust,
    ember,
    turf,
    cobble,
    portalGlow,
    contactShadow,
    dispose: () => {
      stone.dispose();
      stoneDark.dispose();
      brass.dispose();
      iron.dispose();
      woodOak.dispose();
      woodWalnut.dispose();
      masterGold.dispose();
      rust.dispose();
      ember.dispose();
      turf.dispose();
      cobble.dispose();
      portalGlow.dispose();
      contactShadow.dispose();
    },
  };
}

/**
 * Creates an extruded spur gear geometry with beveled teeth and central axle hole.
 */
export function createGearGeometry(radius: number, teeth = 12, thickness = 0.11): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const innerR = radius * 0.78;
  const outerR = radius;
  const step = (Math.PI * 2) / teeth;

  for (let i = 0; i < teeth; i++) {
    const a0 = i * step;
    const a1 = a0 + step * 0.2;
    const a2 = a0 + step * 0.32;
    const a3 = a0 + step * 0.62;
    const a4 = a0 + step * 0.74;

    const p0x = Math.cos(a0) * innerR;
    const p0y = Math.sin(a0) * innerR;
    if (i === 0) shape.moveTo(p0x, p0y);
    else shape.lineTo(p0x, p0y);

    shape.lineTo(Math.cos(a1) * innerR, Math.sin(a1) * innerR);
    shape.lineTo(Math.cos(a2) * outerR, Math.sin(a2) * outerR);
    shape.lineTo(Math.cos(a3) * outerR, Math.sin(a3) * outerR);
    shape.lineTo(Math.cos(a4) * innerR, Math.sin(a4) * innerR);
  }
  shape.closePath();

  const hole = new THREE.Path();
  hole.absarc(0, 0, radius * 0.24, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.015,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.center();
  return geo;
}

export function orientToFace(obj: THREE.Object3D, face: BastionFace) {
  switch (face) {
    case 'front':
      obj.rotation.set(0, 0, 0);
      break;
    case 'right':
      obj.rotation.set(0, Math.PI / 2, 0);
      break;
    case 'back':
      obj.rotation.set(0, Math.PI, 0);
      break;
    case 'left':
      obj.rotation.set(0, -Math.PI / 2, 0);
      break;
  }
}

/**
 * Composite 4-part Pin model: bracket base (stays on wall or pin shaft),
 * oak/walnut/master shaft, brass collar, flared octagonal grip knob, and arrow tip.
 */
export function buildPinMesh(def: PinDef, mats: MaterialLibrary): {
  group: THREE.Group;
  hitBox: THREE.Mesh;
  pinMaterial: THREE.MeshStandardMaterial;
} {
  const group = new THREE.Group();
  group.position.set(...def.position);

  const baseMat =
    def.woodTone === 'master'
      ? mats.masterGold
      : def.woodTone === 'walnut'
      ? mats.woodWalnut
      : mats.woodOak;
  // Clone material per pin so red blocked flash is isolated to this pin
  const pinMaterial = baseMat.clone() as THREE.MeshStandardMaterial;

  const len = def.length ?? 0.78;
  const dir = new THREE.Vector3(...def.slideDir).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);

  const shaftGroup = new THREE.Group();
  shaftGroup.quaternion.copy(quat);

  // 1. Main cylindrical shaft
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, len, 10), pinMaterial);
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  shaftGroup.add(shaft);

  // 2. Brass locking collar
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.09, 12), mats.brass);
  collar.position.y = -len * 0.22;
  collar.castShadow = true;
  shaftGroup.add(collar);

  // 3. Flared pull knob (in slide direction)
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.095, 0.13, 8), pinMaterial);
  knob.position.y = len * 0.48;
  knob.castShadow = true;
  shaftGroup.add(knob);

  // 4. Tactile brass cap / Master Lock emblem on tip
  const tipGeo = def.isMasterLock
    ? new THREE.OctahedronGeometry(0.11, 0)
    : new THREE.ConeGeometry(0.085, 0.12, 8);
  const tip = new THREE.Mesh(tipGeo, def.isMasterLock ? mats.ember : mats.brass);
  tip.position.y = len * 0.6;
  tip.castShadow = true;
  shaftGroup.add(tip);

  // 5. Tail stop ring
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 8), mats.iron);
  tail.position.y = -len * 0.48;
  shaftGroup.add(tail);

  group.add(shaftGroup);

  // Generous invisible raycast collider for effortless mobile tapping
  const hitBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, len + 0.34, 0.36),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitBox.quaternion.copy(quat);
  hitBox.layers.enable(1);
  group.add(hitBox);

  return { group, hitBox, pinMaterial };
}

/**
 * Composite 4-part Gear assembly with optional rust crust layers & loose socket ring.
 */
export function buildGearAssembly(
  radius: number,
  kind: 'rusty' | 'loose' | 'driven',
  face: BastionFace,
  mats: MaterialLibrary
): {
  gearGroup: THREE.Group;
  rustCrusts: THREE.Mesh[];
  hitBox: THREE.Mesh;
  gearMat: THREE.MeshPhysicalMaterial;
} {
  const gearGroup = new THREE.Group();
  orientToFace(gearGroup, face);

  const gearMat = mats.brass.clone();
  const gearGeo = createGearGeometry(radius, 12, 0.1);
  const gearMesh = new THREE.Mesh(gearGeo, gearMat);
  gearMesh.castShadow = true;
  gearMesh.receiveShadow = true;
  gearGroup.add(gearMesh);

  // Central hub cap
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.32, radius * 0.36, 0.16, 12), mats.iron);
  hub.rotation.x = Math.PI / 2;
  hub.castShadow = true;
  gearGroup.add(hub);

  // Inner brass bolt
  const bolt = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.14, radius * 0.14, 0.2, 6), gearMat);
  bolt.rotation.x = Math.PI / 2;
  gearGroup.add(bolt);

  // Decorative 4 spokes ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.52, 0.025, 8, 20), mats.iron);
  ring.position.z = 0.05;
  gearGroup.add(ring);

  const rustCrusts: THREE.Mesh[] = [];
  if (kind === 'rusty') {
    const rustMat = mats.rust.clone();
    for (let i = 0; i < 2; i++) {
      const crust = new THREE.Mesh(
        new THREE.DodecahedronGeometry(radius * 0.58, 0),
        rustMat
      );
      crust.scale.set(1.05, 0.85, 0.45);
      crust.position.set(i === 0 ? -radius * 0.2 : radius * 0.22, i === 0 ? 0.05 : -0.05, 0.07);
      crust.castShadow = true;
      gearGroup.add(crust);
      rustCrusts.push(crust);
    }
  }

  const hitBox = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.45, radius * 1.45, 0.45, 12),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitBox.rotation.x = Math.PI / 2;
  hitBox.layers.enable(1);
  gearGroup.add(hitBox);

  return { gearGroup, rustCrusts, hitBox, gearMat };
}

/**
 * Composite 7-part Crossbow Turret (sits on Left Front Tower).
 */
export function buildCrossbowTurret(mats: MaterialLibrary): {
  root: THREE.Group;
  swivelHead: THREE.Group;
  stringMesh: THREE.Mesh;
  statusLight: THREE.Mesh;
} {
  const root = new THREE.Group();

  // 1. Stone & iron pedestal base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.16, 8), mats.iron);
  base.position.y = 0.08;
  base.castShadow = true;
  root.add(base);

  // 2. Rotating brass ring
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.12, 12), mats.brass);
  ring.position.y = 0.2;
  ring.castShadow = true;
  root.add(ring);

  const swivelHead = new THREE.Group();
  swivelHead.position.y = 0.34;
  root.add(swivelHead);

  // 3. Oak stock rail
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.64), mats.woodOak);
  stock.position.z = 0.08;
  stock.castShadow = true;
  swivelHead.add(stock);

  // 4 & 5. Twin curved bow limbs
  const limbGeo = new THREE.BoxGeometry(0.42, 0.06, 0.07);
  const leftLimb = new THREE.Mesh(limbGeo, mats.brass);
  leftLimb.position.set(-0.24, 0.02, 0.28);
  leftLimb.rotation.y = -0.35;
  leftLimb.castShadow = true;
  swivelHead.add(leftLimb);

  const rightLimb = new THREE.Mesh(limbGeo, mats.brass);
  rightLimb.position.set(0.24, 0.02, 0.28);
  rightLimb.rotation.y = 0.35;
  rightLimb.castShadow = true;
  swivelHead.add(rightLimb);

  // 6. Bowstring
  const stringMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.78, 6),
    mats.iron
  );
  stringMesh.rotation.z = Math.PI / 2;
  stringMesh.position.set(0, 0.03, 0.18);
  swivelHead.add(stringMesh);

  // 7. Loaded bolt + power gem indicator
  const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 6), mats.brass);
  bolt.rotation.x = Math.PI / 2;
  bolt.position.set(0, 0.06, 0.18);
  swivelHead.add(bolt);

  const statusMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    emissive: 0x000000,
    roughness: 0.3,
  });
  const statusLight = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), statusMat);
  statusLight.position.set(0, 0.12, -0.18);
  swivelHead.add(statusLight);

  return { root, swivelHead, stringMesh, statusLight };
}

/**
 * Composite 7-part Heavy Mortar/Cannon Turret (sits on Right Front Tower).
 */
export function buildCannonTurret(mats: MaterialLibrary): {
  root: THREE.Group;
  swivelHead: THREE.Group;
  barrel: THREE.Mesh;
  statusLight: THREE.Mesh;
} {
  const root = new THREE.Group();

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.16, 8), mats.iron);
  base.position.y = 0.08;
  base.castShadow = true;
  root.add(base);

  const swivelHead = new THREE.Group();
  swivelHead.position.y = 0.24;
  root.add(swivelHead);

  // Carriage cheeks
  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.42), mats.woodWalnut);
    cheek.position.set(side * 0.18, 0.1, 0);
    cheek.castShadow = true;
    swivelHead.add(cheek);
  }

  // Barrel (pitched slightly upward like a siege mortar)
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.56, 12), mats.iron);
  barrel.rotation.x = Math.PI / 2 - 0.35;
  barrel.position.set(0, 0.2, 0.12);
  barrel.castShadow = true;
  swivelHead.add(barrel);

  // Brass muzzle ring
  const muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 8, 16), mats.brass);
  muzzle.position.set(0, 0.27, 0.01);
  barrel.add(muzzle);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, 0.27, 0);

  const statusMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    emissive: 0x000000,
    roughness: 0.3,
  });
  const statusLight = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), statusMat);
  statusLight.position.set(0, 0.22, -0.2);
  swivelHead.add(statusLight);

  return { root, swivelHead, barrel, statusLight };
}

/**
 * Composite Flame & Spike Floor Trap on the stone road.
 */
export function buildFlameTrap(mats: MaterialLibrary): {
  root: THREE.Group;
  spikesGroup: THREE.Group;
  emberCore: THREE.Mesh;
} {
  const root = new THREE.Group();

  // Iron frame grate
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 0.95), mats.iron);
  frame.position.y = 0.03;
  frame.receiveShadow = true;
  root.add(frame);

  // Glowing ember core beneath grate
  const emberMat = mats.ember.clone();
  emberMat.emissiveIntensity = 0.2;
  const emberCore = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.05, 0.76), emberMat);
  emberCore.position.y = 0.04;
  root.add(emberCore);

  // 9 iron spikes that pop up on trigger
  const spikesGroup = new THREE.Group();
  const spikeGeo = new THREE.ConeGeometry(0.055, 0.32, 6);
  for (let ix = -1; ix <= 1; ix++) {
    for (let iz = -1; iz <= 1; iz++) {
      const spike = new THREE.Mesh(spikeGeo, mats.brass);
      spike.position.set(ix * 0.24, 0.02, iz * 0.24);
      spike.castShadow = true;
      spikesGroup.add(spike);
    }
  }
  spikesGroup.position.y = -0.18;
  root.add(spikesGroup);

  return { root, spikesGroup, emberCore };
}

/**
 * Composite 5-9 part Enemy models grounded at y = 0.
 */
export function buildEnemyModel(type: EnemyType, mats: MaterialLibrary): {
  root: THREE.Group;
  bodyMesh: THREE.Mesh;
  hpBarBg: THREE.Mesh;
  hpBarFill: THREE.Mesh;
} {
  const root = new THREE.Group();

  const bodyColor =
    type === 'boss'
      ? 0x7f1d1d
      : type === 'heavy'
      ? 0x334155
      : type === 'shield'
      ? 0x475569
      : 0x991b1b;

  const armorMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.6,
    metalness: type === 'raider' ? 0.15 : 0.55,
  });

  if (type === 'boss') {
    // Giant Siege Ram Boss: wheeled armored ram chassis + iron ram head + banner
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.65, 1.35), mats.woodWalnut);
    chassis.position.y = 0.52;
    chassis.castShadow = true;
    root.add(chassis);

    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 1.4, 6, 1, false, 0, Math.PI), armorMat);
    roof.rotation.z = Math.PI / 2;
    roof.rotation.y = Math.PI / 2;
    roof.position.y = 0.82;
    roof.castShadow = true;
    root.add(roof);

    // Battering ram iron head
    const ramHead = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.62, 6), mats.brass);
    ramHead.rotation.x = Math.PI / 2;
    ramHead.position.set(0, 0.52, 0.85);
    ramHead.castShadow = true;
    root.add(ramHead);

    // 4 heavy wheels
    const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.12, 10);
    for (const sx of [-0.5, 0.5]) {
      for (const sz of [-0.42, 0.42]) {
        const w = new THREE.Mesh(wheelGeo, mats.iron);
        w.rotation.z = Math.PI / 2;
        w.position.set(sx, 0.24, sz);
        w.castShadow = true;
        root.add(w);
      }
    }

    // Glowing war core banner
    const banner = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.35), mats.ember);
    banner.position.set(0, 1.35, -0.35);
    root.add(banner);

    const hpBarBg = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide })
    );
    hpBarBg.position.set(0, 1.85, 0);
    root.add(hpBarBg);

    const hpBarFill = new THREE.Mesh(
      new THREE.PlaneGeometry(1.04, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide })
    );
    hpBarFill.position.set(0, 1.85, 0.01);
    root.add(hpBarFill);

    return { root, bodyMesh: chassis, hpBarBg, hpBarFill };
  }

  const scale = type === 'heavy' ? 1.28 : type === 'shield' ? 1.12 : 0.95;

  // 1. Torso
  const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.36 * scale, 0.42 * scale, 0.26 * scale), armorMat);
  bodyMesh.position.y = 0.36 * scale;
  bodyMesh.castShadow = true;
  root.add(bodyMesh);

  // 2. Head + Helmet
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.24 * scale, 0.24 * scale, 0.24 * scale), mats.stone);
  head.position.y = 0.68 * scale;
  head.castShadow = true;
  root.add(head);

  const helmet = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * scale, 0.17 * scale, 0.14 * scale, 6), mats.iron);
  helmet.position.y = 0.78 * scale;
  helmet.castShadow = true;
  root.add(helmet);

  // 3. Horns
  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.04 * scale, 0.14 * scale, 5), mats.brass);
    horn.position.set(side * 0.15 * scale, 0.82 * scale, 0);
    horn.rotation.z = -side * 0.6;
    root.add(horn);
  }

  // 4. Boots
  for (const side of [-1, 1]) {
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.11 * scale, 0.16 * scale, 0.14 * scale), mats.woodWalnut);
    boot.position.set(side * 0.1 * scale, 0.08 * scale, 0);
    boot.castShadow = true;
    root.add(boot);
  }

  // 5. Shield or Weapon
  if (type === 'shield') {
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.4 * scale, 0.48 * scale, 0.07 * scale), mats.iron);
    shield.position.set(0, 0.38 * scale, 0.2 * scale);
    shield.castShadow = true;
    root.add(shield);

    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.08 * scale, 8, 8), mats.brass);
    boss.position.set(0, 0.38 * scale, 0.24 * scale);
    root.add(boss);
  } else {
    const axe = new THREE.Mesh(new THREE.BoxGeometry(0.08 * scale, 0.38 * scale, 0.08 * scale), mats.woodOak);
    axe.position.set(0.25 * scale, 0.42 * scale, 0.12 * scale);
    axe.rotation.x = 0.5;
    root.add(axe);
  }

  // Ground contact shadow
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.65 * scale, 0.65 * scale), mats.contactShadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  root.add(shadow);

  // Floating HP bar
  const hpBarBg = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.07),
    new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide })
  );
  hpBarBg.position.set(0, 1.05 * scale, 0);
  root.add(hpBarBg);

  const hpBarFill = new THREE.Mesh(
    new THREE.PlaneGeometry(0.51, 0.045),
    new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide })
  );
  hpBarFill.position.set(0, 1.05 * scale, 0.008);
  root.add(hpBarFill);

  return { root, bodyMesh, hpBarBg, hpBarFill };
}
