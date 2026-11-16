// Browser-side scene for scripts/render-characters.mjs. Runs inside headless
// Chromium (served through Playwright request routing, no real server).
// Assets: Quaternius Universal Base Characters (heads, hair), Modular Character
// Outfits - Fantasy (male peasant shirt, flattened into a plain top) and
// Universal Animation Library 1 + 2 (all CC0). Poses are procedural (two-bone
// IK + finger curls) layered on the idle breathing clip.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const SRC = "/src/";
const PATHS = {
  head: {
    female: "ubc/Universal Base Characters[Standard]/Base Characters/Godot - UE/Superhero_Female_FullBody.gltf",
    male: "ubc/Universal Base Characters[Standard]/Base Characters/Godot - UE/Superhero_Male_FullBody.gltf",
  },
  outfit: {
    female: "outfits/Modular Character Outfits - Fantasy[Standard]/Exports/glTF (Godot-Unreal)/Outfits/Female_Peasant.gltf",
    male: "outfits/Modular Character Outfits - Fantasy[Standard]/Exports/glTF (Godot-Unreal)/Outfits/Male_Peasant.gltf",
  },
  hair: (n) => `ubc/Universal Base Characters[Standard]/Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)/${n}.gltf`,
  ual1: "ual/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb",
  ual2: "ual2/Universal Animation Library 2[Standard]/Unreal-Godot/UAL2_Standard.glb",
};

const manager = new THREE.LoadingManager();
// A few texture names in the packs do not match the files on disk.
manager.setURLModifier((url) => url.replace("T_Eye_Normal_png.png", "T_Eye_Normal.png").replace("T_Hair_1_Normal_png.png", "T_Hair_1_Normal.png"));
const loader = new GLTFLoader(manager);
const cache = new Map();
function load(rel) {
  if (!cache.has(rel)) cache.set(rel, loader.loadAsync(SRC + encodeURI(rel)));
  return cache.get(rel);
}

let renderer, scene, camera, mixer, rig, state;

const lin = (hex) => new THREE.Color(hex); // Color() stores linear when ColorManagement is on

// Gradient map recolour: keeps the texture's shading, swaps its hues for a
// dark->mid->light ramp. Used for outfit fabric and hair.
function gradientRecolor(material, ramp, amount = 1) {
  const [a, b, c] = ramp.map((h) => lin(h));
  material.onBeforeCompile = (shader) => {
    shader.uniforms.rampA = { value: a };
    shader.uniforms.rampB = { value: b };
    shader.uniforms.rampC = { value: c };
    shader.uniforms.rampAmt = { value: amount };
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 rampA; uniform vec3 rampB; uniform vec3 rampC; uniform float rampAmt;")
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        {
          float l = clamp(pow(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)), 0.4545), 0.0, 1.0);
          vec3 r = l < 0.5 ? mix(rampA, rampB, l * 2.0) : mix(rampB, rampC, (l - 0.5) * 2.0);
          diffuseColor.rgb = mix(diffuseColor.rgb, r, rampAmt);
        }`,
      );
  };
  material.customProgramCacheKey = () => "ramp" + ramp.join() + amount;
  material.needsUpdate = true;
}

const HAND_RE = /^(hand|thumb|index|middle|ring|pinky)_/;

// Per-vertex weight of hand/finger bones: bare hands painted into the outfit
// texture keep a skin tone instead of the fabric recolour.
function addSkinMask(mesh) {
  const g = mesh.geometry;
  if (g.attributes.skinMask) return;
  const si = g.attributes.skinIndex;
  const sw = g.attributes.skinWeight;
  const names = mesh.skeleton.bones.map((b) => b.name);
  const arr = new Float32Array(si.count);
  for (let v = 0; v < si.count; v++) {
    let w = 0;
    for (let k = 0; k < 4; k++) if (HAND_RE.test(names[si.getComponent(v, k)] || "")) w += sw.getComponent(v, k);
    arr[v] = Math.min(1, Math.max(0, (w - 0.35) / 0.4));
  }
  g.setAttribute("skinMask", new THREE.BufferAttribute(arr, 1));
}

// Mean luminance of the texture under the hand vertices.
function handLum(mesh, tex) {
  const g = mesh.geometry;
  const mask = g.attributes.skinMask;
  const uv = g.attributes.uv;
  if (!tex || !uv) return 0.4;
  const img = tex.image;
  const cv = document.createElement("canvas");
  cv.width = 256;
  cv.height = 256;
  const ctx = cv.getContext("2d");
  ctx.drawImage(img, 0, 0, 256, 256);
  const d = ctx.getImageData(0, 0, 256, 256).data;
  let s = 0;
  let n = 0;
  for (let v = 0; v < uv.count; v++) {
    if (mask.getX(v) < 0.9) continue;
    const x = Math.min(255, Math.max(0, Math.floor(uv.getX(v) * 256)));
    const y = Math.min(255, Math.max(0, Math.floor(uv.getY(v) * 256)));
    const i = (y * 256 + x) * 4;
    s += 0.2126 * Math.pow(d[i] / 255, 2.2) + 0.7152 * Math.pow(d[i + 1] / 255, 2.2) + 0.0722 * Math.pow(d[i + 2] / 255, 2.2);
    n++;
  }
  return n ? s / n : 0.4;
}

function outfitRecolor(material, ramp, skin, lumMean) {
  const [a, b, c] = ramp.map((h) => lin(h));
  const sk = lin(skin);
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, { rampA: { value: a }, rampB: { value: b }, rampC: { value: c }, skinT: { value: sk }, handLum: { value: lumMean } });
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float skinMask; varying float vSkin;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvSkin = skinMask;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 rampA; uniform vec3 rampB; uniform vec3 rampC; uniform vec3 skinT; uniform float handLum; varying float vSkin;")
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        {
          float lin = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          float l = clamp(pow(lin, 0.4545), 0.0, 1.0);
          // flatten printed seams, laces and trims into a plain knit
          l = mix(0.58, l, 0.32);
          vec3 r = l < 0.5 ? mix(rampA, rampB, l * 2.0) : mix(rampB, rampC, (l - 0.5) * 2.0);
          vec3 s = skinT * clamp(mix(1.0, lin / max(handLum, 1e-3), 0.5), 0.75, 1.2);
          diffuseColor.rgb = mix(mix(diffuseColor.rgb, r, 0.92), s, vSkin);
        }`,
      );
  };
  material.customProgramCacheKey = () => "outfit" + ramp.join() + skin + lumMean.toFixed(3);
  material.needsUpdate = true;
}

// Skin: shift the painted skin towards a target tone while keeping lips,
// blush and eye detail (ratio to the texture's mean colour).
function skinTone(material, tone, mean) {
  const t = lin(tone);
  const m = new THREE.Color(mean[0], mean[1], mean[2]);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.skinT = { value: t };
    shader.uniforms.skinM = { value: m };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float mouthMask; varying float vMouth;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvMouth = mouthMask;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 skinT; uniform vec3 skinM; varying float vMouth;")
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        {
          vec3 ratio = diffuseColor.rgb / max(skinM, vec3(1e-3));
          // soften the painted detail so skin reads smooth and toy-like
          ratio = mix(vec3(dot(ratio, vec3(0.3333))), ratio, 0.75);
          ratio = mix(vec3(1.0), ratio, 0.7);
          diffuseColor.rgb = skinT * ratio;
          // inside of the mouth (deep verts between the lips)
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.045, 0.006, 0.012), vMouth);
        }`,
      );
  };
  material.customProgramCacheKey = () => "skin" + tone;
  material.needsUpdate = true;
}

// Typical skin colour of a body texture: median-luminance band of the
// skin-coloured pixels (skips underwear, eyes and brows).
function meanColor(texture) {
  const img = texture.image;
  const cv = document.createElement("canvas");
  cv.width = 128;
  cv.height = 128;
  const ctx = cv.getContext("2d");
  ctx.drawImage(img, 0, 0, 128, 128);
  const d = ctx.getImageData(0, 0, 128, 128).data;
  const px = [];
  for (let i = 0; i < d.length; i += 4) {
    const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
    if (r > 90 && r > b + 25) px.push([r, g, b, 0.3 * r + 0.59 * g + 0.11 * b]);
  }
  px.sort((a, b) => a[3] - b[3]);
  const band = px.slice(Math.floor(px.length * 0.4), Math.floor(px.length * 0.6));
  const acc = [0, 0, 0];
  for (const q of band) for (let k = 0; k < 3; k++) acc[k] += Math.pow(q[k] / 255, 2.2);
  return acc.map((v) => v / band.length);
}

// Rebind a skinned mesh from its own skeleton to the outfit rig by bone name.
function rebind(mesh, bonesByName) {
  const src = mesh.skeleton;
  const bones = src.bones.map((b) => bonesByName.get(b.name) || b);
  const sk = new THREE.Skeleton(bones, src.boneInverses.map((m) => m.clone()));
  mesh.bind(sk, mesh.bindMatrix.clone());
}

// Keep only triangles skinned (mostly) to the head and neck.
function keepHead(mesh, keepNames) {
  const g = mesh.geometry;
  const si = g.attributes.skinIndex;
  const sw = g.attributes.skinWeight;
  const names = mesh.skeleton.bones.map((b) => b.name);
  const vertOk = new Uint8Array(si.count);
  for (let v = 0; v < si.count; v++) {
    let w = 0;
    for (let k = 0; k < 4; k++) if (keepNames.includes(names[si.getComponent(v, k)])) w += sw.getComponent(v, k);
    vertOk[v] = w > 0.5 ? 1 : 0;
  }
  const idx = g.index.array;
  const out = [];
  for (let i = 0; i < idx.length; i += 3) if (vertOk[idx[i]] && vertOk[idx[i + 1]] && vertOk[idx[i + 2]]) out.push(idx[i], idx[i + 1], idx[i + 2]);
  g.setIndex(out);
}

function makeHeart(color) {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(-0.15, -0.35, -0.6, -0.1, -0.6, 0.2);
  s.bezierCurveTo(-0.6, 0.48, -0.32, 0.62, -0.15, 0.55);
  s.bezierCurveTo(-0.06, 0.52, 0, 0.44, 0, 0.36);
  s.bezierCurveTo(0, 0.44, 0.06, 0.52, 0.15, 0.55);
  s.bezierCurveTo(0.32, 0.62, 0.6, 0.48, 0.6, 0.2);
  s.bezierCurveTo(0.6, -0.1, 0.15, -0.35, 0, -0.5);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.12, bevelSegments: 8, curveSegments: 32 });
  geo.center();
  const mat = new THREE.MeshPhysicalMaterial({ color: lin(color), roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15, sheen: 0.4, transparent: true });
  return new THREE.Mesh(geo, mat);
}

export async function setup(cfg) {
  state = { cfg };
  const W = cfg.width;
  const H = cfg.height;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  document.body.appendChild(canvas);
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, premultipliedAlpha: false });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  // Soft three-point studio light plus a rose rim that matches the plum UI.
  const key = new THREE.DirectionalLight(lin("#fff1e4"), 2.1);
  key.position.set(1.6, 2.6, 2.4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 6;
  key.shadow.blurSamples = 16;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -0.8, right: 0.8, top: 2.2, bottom: -0.2, near: 0.5, far: 8 });
  const fill = new THREE.DirectionalLight(lin("#e6e0ff"), 0.9);
  fill.position.set(-2.4, 1.2, 1.6);
  const rim = new THREE.DirectionalLight(lin("#ff9fb8"), 3.2);
  rim.position.set(-1.2, 2.2, -2.6);
  const rim2 = new THREE.DirectionalLight(lin("#ffd6a0"), 1.6);
  rim2.position.set(1.8, 1.6, -2.2);
  const bounce = new THREE.HemisphereLight(lin("#fff4ee"), lin("#3a2230"), 0.5);
  scene.add(key, key.target, fill, rim, rim2, bounce);

  camera = new THREE.PerspectiveCamera(cfg.fov ?? 20, W / H, 0.1, 50);

  const c = cfg.character;
  const gender = c.gender;
  const [outfitG, headG, ual1, ual2] = await Promise.all([load(PATHS.outfit[c.outfit ?? "male"]), load(PATHS.head[gender]), load(PATHS.ual1), load(PATHS.ual2)]);
  const hairGs = await Promise.all(c.hair.map((h) => load(PATHS.hair(h))));

  const root = outfitG.scene.clone(true);
  // SkinnedMesh clone keeps skeleton refs to originals; rebuild them by name.
  const bonesByName = new Map();
  root.traverse((o) => {
    if (o.isBone) bonesByName.set(o.name, o);
  });
  root.traverse((o) => {
    if (o.isSkinnedMesh) rebind(o, bonesByName);
  });

  const meshes = [];
  root.traverse((o) => {
    if (o.isMesh) meshes.push(o);
  });
  for (const m of meshes) {
    if (/Feet/.test(m.name)) m.visible = false;
  }

  // Head (face, eyes, brows) from the base character, rebound to the outfit rig.
  const headScene = headG.scene.clone(true);
  const headParts = [];
  headScene.traverse((o) => {
    if (o.isSkinnedMesh) headParts.push(o);
  });
  for (const part of headParts) {
    part.material = part.material.clone();
    if (/Superhero/i.test(part.material.name)) keepHead(part, ["Head", "neck_01"]);
    state.headParts ??= [];
    state.headParts.push(part);
    rebind(part, bonesByName);
    part.removeFromParent();
    root.add(part);
  }
  for (const hg of hairGs) {
    const hs = hg.scene.clone(true);
    const parts = [];
    hs.traverse((o) => {
      if (o.isSkinnedMesh) parts.push(o);
    });
    for (const p of parts) {
      p.material = p.material.clone();
      p.userData.isHair = true;
      rebind(p, bonesByName);
      p.removeFromParent();
      root.add(p);
    }
  }

  // Materials
  const skinMats = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    o.frustumCulled = false;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const out = mats.map((m0) => {
      const m = m0.clone();
      const n = m.name || "";
      if (/Superhero|Regular/.test(n)) {
        if (!skinMats.has(n)) {
          const mean = meanColor(m.map);
          skinTone(m, c.skin, mean);
          m.roughness = 1;
          m.roughnessMap = null;
          m.metalnessMap = null;
          m.metalness = 0;
          m.roughness = 0.62;
          if (m.normalScale) m.normalScale.set(0.35, 0.35);
          m.sheen = 0;
          skinMats.set(n, m);
        }
        return skinMats.get(n);
      }
      if (/Hair/.test(n)) {
        gradientRecolor(m, c.hairRamp, 1);
        m.roughness = 0.55;
        if (m.normalScale) m.normalScale.set(0.6, 0.6);
        return m;
      }
      if (/Peasant|Ranger/.test(n)) {
        addSkinMask(o);
        outfitRecolor(m, c.outfitRamp, c.skin, handLum(o, m.map));
        m.roughness = 0.9;
        if (m.normalScale) m.normalScale.set(0.12, 0.12);
        return m;
      }
      if (/Eye/.test(n)) {
        m.roughness = 0.12;
        return m;
      }
      return m;
    });
    o.material = Array.isArray(o.material) ? out : out[0];
  });

  scene.add(root);
  rig = { root, bones: bonesByName };
  buildFace(c, bonesByName);

  // Animations: quaternion tracks only (position tracks belong to the
  // mannequin's proportions), plus pelvis height for bounces.
  const clips = new Map();
  for (const a of [...ual1.animations, ...ual2.animations]) {
    const tracks = a.tracks.filter((t) => t.name.endsWith(".quaternion"));
    clips.set(a.name, new THREE.AnimationClip(a.name, a.duration, tracks));
  }
  mixer = new THREE.AnimationMixer(root);
  state.clips = clips;
  state.heart = makeHeart("#ff4f7b");
  state.heart.visible = false;
  scene.add(state.heart);

  // rest pose (open hands) for finger overrides
  state.rest = new Map();
  for (const [n, b] of bonesByName) state.rest.set(n, b.quaternion.clone());
  // fist pose (idle clip hands) for per-finger curls
  const fistAction = mixer.clipAction(clips.get("Idle_Loop"));
  fistAction.play();
  mixer.setTime(0);
  state.fist = new Map();
  for (const [n, b] of bonesByName) if (FINGER_RE.test(n)) state.fist.set(n, b.quaternion.clone());
  root.updateMatrixWorld(true);
  // camera aims at the head as it sits in the idle pose, so motion reads
  state.headRest = bonesByName.get("Head").getWorldPosition(new THREE.Vector3());
  mixer.stopAllAction();
  for (const [n, b] of bonesByName) b.quaternion.copy(state.rest.get(n));
  root.updateMatrixWorld(true);
  return { poses: Object.keys(POSES) };
}

// ---- pose helpers -------------------------------------------------------
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _q3 = new THREE.Quaternion();

// Rotate `bone` (in world space) so the direction bone->child points at
// `dir` (world space), blended by weight. Optional twist around that axis.
function aim(boneName, childName, dir, weight = 1, twist = 0) {
  const bone = rig.bones.get(boneName);
  const child = rig.bones.get(childName);
  bone.updateMatrixWorld(true);
  bone.getWorldPosition(_v1);
  child.getWorldPosition(_v2);
  const cur = _v2.sub(_v1).normalize();
  const tgt = dir.clone().normalize();
  _q1.setFromUnitVectors(cur, tgt);
  if (twist) _q1.premultiply(_q3.setFromAxisAngle(tgt, twist));
  bone.getWorldQuaternion(_q2);
  const worldTarget = _q1.multiply(_q2); // q1 * q2
  const parentQ = new THREE.Quaternion();
  bone.parent.getWorldQuaternion(parentQ);
  const local = parentQ.invert().multiply(worldTarget);
  bone.quaternion.slerp(local, weight);
  bone.updateMatrixWorld(true);
}

// Blend the fingers of one hand back to the open rest pose (spread a touch).
function openHand(side, amount = 1) {
  for (const f of ["thumb", "index", "middle", "ring", "pinky"])
    for (const k of ["01", "02", "03"]) {
      const n = `${f}_${k}_${side}`;
      const b = rig.bones.get(n);
      if (b) b.quaternion.slerp(state.rest.get(n), amount);
    }
  rig.bones.get(`hand_${side}`).updateMatrixWorld(true);
}

// World frame of a hand: palm centre, finger axis and palm normal.
function handFrame(side) {
  const p = (n) => rig.bones.get(`${n}_${side}`).getWorldPosition(new THREE.Vector3());
  const h = p("hand");
  const m = p("middle_01");
  const axis = m.clone().sub(h).normalize();
  const across = p("index_01").sub(p("pinky_01")).normalize();
  const normal = new THREE.Vector3().crossVectors(axis, across).multiplyScalar((side === "r" ? -1 : 1) * (state.cfg.palmSign ?? 1)).normalize();
  return { pos: h.add(m).multiplyScalar(0.5), axis, normal, across };
}

// Twist the hand around its own axis so the palm faces `dir` (world).
function palm(side, dir, weight = 1) {
  const hand = rig.bones.get(`hand_${side}`);
  const p = (n) => rig.bones.get(`${n}_${side}`).getWorldPosition(new THREE.Vector3());
  const h = p("hand");
  const axis = p("middle_01").sub(h).normalize();
  const across = p("index_01").sub(p("pinky_01")).normalize();
  const n = new THREE.Vector3().crossVectors(axis, across).multiplyScalar((side === "r" ? -1 : 1) * (state.cfg.palmSign ?? 1)).normalize();
  const t = dir.clone().normalize();
  t.sub(axis.clone().multiplyScalar(t.dot(axis))).normalize();
  n.sub(axis.clone().multiplyScalar(n.dot(axis))).normalize();
  let ang = Math.acos(Math.min(1, Math.max(-1, n.dot(t))));
  if (new THREE.Vector3().crossVectors(n, t).dot(axis) < 0) ang = -ang;
  const q = new THREE.Quaternion().setFromAxisAngle(axis, ang * weight);
  const wq = hand.getWorldQuaternion(new THREE.Quaternion()).premultiply(q);
  const pq = hand.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
  hand.quaternion.copy(pq.multiply(wq));
  hand.updateMatrixWorld(true);
}

// Local-axis rotation offset applied on top of the current pose.
function nudge(boneName, x = 0, y = 0, z = 0) {
  const b = rig.bones.get(boneName);
  b.quaternion.multiply(_q1.setFromEuler(new THREE.Euler(x, y, z)));
  b.updateMatrixWorld(true);
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(x));
// 0 -> 1 -> 0 over [a, b] with eased ramps of length r
const pulse = (p, a, b, r = 0.12) => ease((p - a) / r) * (1 - ease((p - (b - r)) / r));

const FINGER_RE = /^(thumb|index|middle|ring|pinky)_0[123]_[lr]$/;

// Curl fingers between the open rest pose (0) and the idle clip's fist (1).
function fingers(side, curl) {
  for (const f of ["thumb", "index", "middle", "ring", "pinky"]) {
    const c = typeof curl === "number" ? curl : (curl[f] ?? 0);
    for (const k of ["01", "02", "03"]) {
      const n = `${f}_${k}_${side}`;
      const b = rig.bones.get(n);
      if (!b) continue;
      b.quaternion.copy(state.rest.get(n)).slerp(state.fist.get(n), c);
    }
  }
  rig.bones.get(`hand_${side}`).updateMatrixWorld(true);
}

const HS = () => state.cfg.headScale ?? 1.3;

// Face centre in world space (between the eyes, at the nose bridge) and a
// helper for points around the face, in head-scaled units. Character faces +Z;
// its right side is -X.
function faceCentre() {
  const h = rig.bones.get("Head").getWorldPosition(new THREE.Vector3());
  const o = state.cfg.faceOffset ?? [0, 0.085, 0.12];
  return h.add(V(o[0], o[1], o[2]).multiplyScalar(HS()));
}
function F(x, y, z) {
  return faceCentre().add(V(x, y, z).multiplyScalar(HS()));
}

// Two-bone IK: put the wrist of `side` at `target`, elbow bent towards `pole`.
function reach(side, target, pole, weight = 1) {
  const up = rig.bones.get(`upperarm_${side}`);
  const lo = rig.bones.get(`lowerarm_${side}`);
  const ha = rig.bones.get(`hand_${side}`);
  const S = up.getWorldPosition(new THREE.Vector3());
  const E = lo.getWorldPosition(new THREE.Vector3());
  const W = ha.getWorldPosition(new THREE.Vector3());
  const a = S.distanceTo(E);
  const b = E.distanceTo(W);
  const T = S.clone().lerp(target, weight);
  if (weight < 1) T.copy(W.clone().lerp(target, weight));
  const toT = T.clone().sub(S);
  const d = Math.min(a + b - 1e-4, Math.max(Math.abs(a - b) + 1e-4, toT.length()));
  const dir = toT.normalize();
  const cosA = (a * a + d * d - b * b) / (2 * a * d);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const pl = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  const elbow = S.clone().addScaledVector(dir, a * cosA).addScaledVector(pl, a * sinA);
  const wrist = S.clone().addScaledVector(dir, d);
  aim(`upperarm_${side}`, `lowerarm_${side}`, elbow.clone().sub(S));
  aim(`lowerarm_${side}`, `hand_${side}`, wrist.clone().sub(elbow));
}

const elbowPole = (side) => V(side === "r" ? -1 : 1, -1.2, -0.2);
const sx = (side) => (side === "r" ? -1 : 1); // character right is -X

function handAt(side, target, dir, palmDir, curl, pole) {
  reach(side, target, pole ?? elbowPole(side));
  if (dir) aim(`hand_${side}`, `middle_01_${side}`, dir);
  if (palmDir) palm(side, palmDir);
  if (curl !== undefined) fingers(side, curl);
}

function headTurn(pitch = 0, yaw = 0, roll = 0) {
  // pitch > 0 nods down, yaw > 0 turns to character's left, roll > 0 tilts to its left.
  // Base offset keeps the eyes on the camera.
  pitch += state.cfg.lookPitch ?? -0.14;
  yaw += state.cfg.lookYaw ?? 0.12;
  nudge("neck_01", pitch * 0.4, yaw * 0.4, roll * 0.4);
  nudge("Head", pitch * 0.6, yaw * 0.6, roll * 0.6);
}

const POSES = {
  idle: {
    // gentle head bob and sway on the breathing idle
    face: (p) => ({ smileL: 0.45, smileR: 0.45, blinkL: blinkAt(p, [0.3, 0.78]), blinkR: blinkAt(p, [0.3, 0.78]) }),
    apply(p) {
      headTurn(0.05 * Math.sin(p * TAU * 2), 0.06 * Math.sin(p * TAU), 0.05 * Math.sin(p * TAU + 0.6));
    },
  },
  wave: {
    // waving hi next to the face
    face: (p) => ({ smileL: 1, smileR: 1, jawOpen: 0.35, squintL: 0.35, squintR: 0.35, browUpL: 0.25, browUpR: 0.25, blinkL: blinkAt(p, [0.55]), blinkR: blinkAt(p, [0.55]) }),
    apply(p) {
      const s = Math.sin(p * TAU * 3);
      headTurn(0.02, -0.08, -0.1 + 0.03 * s);
      handAt("r", F(-0.1, -0.13, 0.02), V(-0.15 + 0.45 * s, 1, 0.05), V(0.05, 0, 1), 0.05);
    },
  },
  kiss: {
    // fingertips to the lips, then open the hand and send a heart
    face: (p) => {
      const lips = pulse(p, 0.0, 0.5, 0.2);
      const out = pulse(p, 0.42, 1.0, 0.18);
      return { pucker: lips, blinkL: 0.95 * lips, blinkR: 0.95 * lips, smileL: 0.6 * out, smileR: 0.6 * out, browUpL: 0.3 * out, browUpR: 0.3 * out, browInnerUpL: 0.3 * lips, browInnerUpR: 0.3 * lips };
    },
    apply(p) {
      const lips = pulse(p, 0.0, 0.5, 0.2);
      const out = pulse(p, 0.42, 1.0, 0.18);
      headTurn(-0.04 * out + 0.06 * lips, -0.1, 0.08 * lips);
      if (lips >= out) {
        handAt("r", F(-0.02, -0.2, 0.16).lerp(F(-0.24, -0.5, 0.12), 1 - lips), V(0.25, 1, -0.1), V(0, 0, -1), { thumb: 0.5, index: 0.15, middle: 0.15, ring: 0.3, pinky: 0.4 });
      } else {
        handAt("r", F(-0.03, -0.16, 0.3).lerp(F(-0.24, -0.5, 0.12), 1 - out), V(-0.2, 0.7, 0.6), V(0, 0.8, 0.4), 0);
      }
      state.heartAt = out > 0.25 ? { from: "r", t: (p - 0.52) / 0.48 } : null;
    },
  },
  heart: {
    // hands cupped into a heart under the chin, a small heart floats up
    face: (p) => ({ smileL: 0.85, smileR: 0.85, squintL: 0.6, squintR: 0.6, browInnerUpL: 0.45, browInnerUpR: 0.45, blinkL: blinkAt(p, [0.62]), blinkR: blinkAt(p, [0.62]) }),
    apply(p) {
      const s = Math.sin(p * TAU);
      headTurn(0.04, 0.05 * s, 0.14 * s);
      for (const side of ["r", "l"]) {
        handAt(side, F(sx(side) * 0.045, -0.22, 0.1), V(sx(side) * 0.25, 1, 0.1), V(-sx(side), 0.1, 0.1), { thumb: 0.2, index: 0.2, middle: 0.25, ring: 0.3, pinky: 0.35 });
      }
      state.heartAt = { from: "chin", t: p };
    },
  },
  think: {
    // finger on the chin, eyes up, slow head tilt
    face: (p) => {
      const s = 0.5 + 0.5 * Math.sin(p * TAU);
      return { mouthSide: 0.8 + 0.2 * s, pucker: 0.3, browUpL: 0.85, browDownR: 0.55, lookUp: 0.75, lookRight: 0.45 + 0.15 * s, blinkL: blinkAt(p, [0.86]), blinkR: blinkAt(p, [0.86]) };
    },
    apply(p) {
      const s = Math.sin(p * TAU);
      headTurn(-0.12 + 0.03 * s, 0.12, 0.1 + 0.03 * s);
      handAt("r", F(-0.03, -0.19, 0.15), V(0.25, 1, 0.25), V(0.6, 0, 0.6), { thumb: 0.6, index: 0.1, middle: 0.9, ring: 1, pinky: 1 });
      handAt("l", F(0.05, -0.62, 0.2), V(-1, 0.1, 0.2), V(0, 1, 0), 0.4);
    },
  },
  laugh: {
    // head thrown back with a bouncy giggle, hand on chest
    face: (p) => {
      const g = 0.5 + 0.5 * Math.sin(p * TAU * 4);
      return { jawOpen: 1.05 + 0.25 * g, smileL: 1, smileR: 1, happy: 1, nose: 0.7, browUpL: 0.35, browUpR: 0.35 };
    },
    apply(p) {
      const g = Math.sin(p * TAU * 4);
      const back = 0.5 + 0.5 * Math.sin(p * TAU);
      headTurn(-0.36 * back - 0.08 * g, 0.08, 0.2 * back);
      nudge("spine_03", -0.1 * back - 0.02 * g, 0, 0.04 * back);
      handAt("l", F(0.03, -0.4, 0.16 + 0.01 * g), V(-1, 0.3, 0.1), V(0, 0, -1), 0.2);
      handAt("r", F(-0.02, -0.21, 0.16), V(0.3, 1, -0.1), V(0, 0, -1), 0.35);
      state.bounce = 0.006 * Math.abs(g);
    },
  },
  peace: {
    // peace sign beside the face, head tilted towards it
    face: () => ({ smileL: 1, smileR: 0.85, jawOpen: 0.45, blinkL: 1, browUpR: 0.35 }),
    apply(p) {
      const s = Math.sin(p * TAU * 2);
      headTurn(0.02, -0.06, -0.14 - 0.03 * s);
      handAt("r", F(-0.1, -0.12 + 0.01 * s, 0.04), V(-0.1, 1, 0.1), V(0.1, 0, 1), { thumb: 0.9, index: 0, middle: 0, ring: 1, pinky: 1 });
    },
  },
  shocked: {
    // hands on cheeks, small recoil
    face: (p) => {
      const r = 0.5 + 0.5 * Math.sin(p * TAU * 2);
      return { jawOpen: 1.25 + 0.15 * r, mouthO: 1, wide: 1, browUpL: 1, browUpR: 1 };
    },
    apply(p) {
      const r = Math.sin(p * TAU * 2);
      headTurn(-0.06 + 0.03 * r, 0, 0.02 * Math.sin(p * TAU));
      nudge("spine_03", -0.04, 0, 0);
      for (const side of ["r", "l"]) handAt(side, F(sx(side) * 0.085, -0.15, -0.01), V(-sx(side) * 0.1, 1, 0.15), V(-sx(side), 0, -0.3), 0.05);
    },
  },
  thumbs: {
    // thumbs up in front of the chest with a little nod
    face: () => ({ smileL: 0.7, smileR: 1, blinkR: 1, browUpL: 0.45 }),
    apply(p) {
      const n = Math.sin(p * TAU * 2);
      headTurn(0.05 * n, -0.05, -0.08);
      handAt("r", F(-0.06, -0.17 + 0.01 * n, 0.2), V(0.9, 0.05, 0.4), V(0.9, 0, -0.4), { thumb: 0, index: 1, middle: 1, ring: 1, pinky: 1 });
      aim("thumb_01_r", "thumb_02_r", V(0, 1, 0), 0.9);
      aim("thumb_02_r", "thumb_03_r", V(0, 1, 0), 0.9);
    },
  },
  sleepy: {
    // yawn behind a hand, then a drowsy droop
    face: (p) => {
      const yawn = pulse(p, 0.0, 0.55, 0.18);
      const droop = pulse(p, 0.45, 1.0, 0.2);
      return { jawOpen: 1.3 * yawn, mouthO: 0.6 * yawn, blinkL: 0.55 + 0.4 * Math.max(yawn, droop), blinkR: 0.55 + 0.4 * Math.max(yawn, droop), browInnerUpL: 0.5, browInnerUpR: 0.5, browUpL: 0.3 * yawn, browUpR: 0.3 * yawn };
    },
    apply(p) {
      const yawn = pulse(p, 0.0, 0.55, 0.18);
      const droop = pulse(p, 0.45, 1.0, 0.2);
      headTurn(-0.2 * yawn + 0.18 * droop, 0.04, -0.06 * yawn + 0.16 * droop * (1 + 0.1 * Math.sin(p * TAU * 2)));
      nudge("spine_03", -0.05 * yawn, 0, 0);
      if (yawn > 0.01) handAt("r", F(-0.02, -0.21, 0.16).lerp(F(-0.24, -0.5, 0.12), 1 - yawn), V(0.6, 0.8, 0.1), V(0, 0, -1), 0.15);
    },
  },
};

POSES.wink = {
  // playful wink with a head tilt and a little nod
  face: (p) => {
    const w = pulse(p, 0.15, 0.75, 0.12);
    return { blinkL: w, smileL: 0.6 + 0.4 * w, smileR: 0.6, browUpR: 0.3 * w, browDownL: 0.2 * w };
  },
  apply(p) {
    const w = pulse(p, 0.15, 0.75, 0.12);
    headTurn(0.04 * w, -0.08, 0.16 * w + 0.03 * Math.sin(p * TAU));
  },
};

const BASE_CLIP = "Idle_Loop";

export function frame(pose, p) {
  const def = POSES[pose];
  if (!state.action) {
    state.action = mixer.clipAction(state.clips.get(BASE_CLIP));
    state.action.play();
  }
  const dur = state.clips.get(BASE_CLIP).duration;
  state.bounce = 0;
  state.heartAt = null;
  mixer.setTime(p * dur);
  // Memoji proportions: bigger head on the same shoulders.
  rig.bones.get("Head").scale.setScalar(HS());
  rig.root.position.y = 0;
  rig.root.updateMatrixWorld(true);
  def.apply(p);
  applyExpression(state.cfg.expr ?? (def.face ? def.face(p) : {}));
  rig.root.position.y = state.bounce;
  rig.root.updateMatrixWorld(true);

  // markers for calibration
  if (state.cfg.markers) {
    state.markers ??= state.cfg.markers.map(() => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.012), new THREE.MeshBasicMaterial({ color: 0x00ff88 }));
      scene.add(m);
      return m;
    });
    state.cfg.markers.forEach((o, i) => state.markers[i].position.copy(F(o[0], o[1], o[2])));
  }

  state.heart.visible = false;
  const h = state.heartAt;
  if (h) {
    const t = ((h.t % 1) + 1) % 1;
    let start;
    if (h.from === "chin") start = F(0.15, -0.02, 0.12);
    else start = rig.bones.get("hand_r").getWorldPosition(new THREE.Vector3()).add(V(0, 0.04, 0.05));
    const rise = h.from === "chin" ? V(0.03 + 0.03 * Math.sin(t * TAU), 0.1, 0.04) : V(0.14, 0.1, 0.25);
    state.heart.visible = t > 0 && t < 1;
    state.heart.position.copy(start).addScaledVector(rise.multiplyScalar(HS()), ease(t) * 0.8 + t * 0.2);
    const pop = ease(t * 4) * (1 - ease((t - 0.75) * 4));
    state.heart.scale.setScalar((h.from === "chin" ? 0.075 : 0.09) * HS() * (0.15 + 0.85 * pop) * (1 + 0.06 * Math.sin(t * TAU * 3)));
    state.heart.rotation.set(0, 0.35 * Math.sin(t * TAU), 0.12 * Math.sin(t * TAU * 0.5));
    state.heart.material.opacity = 1;
  }

  // Camera: eye level, ~70mm-equivalent (20 degree vertical FOV), bust crop
  // with the head filling a little over half of the frame.
  const cfg = state.cfg;
  const fc = state.headRest;
  const target = V(0, fc.y + (cfg.lookOffset ?? 0.02) * HS(), 0.04);
  const dist = cfg.dist ?? 1.72;
  const yaw = cfg.yaw ?? 0.16;
  camera.position.set(Math.sin(yaw) * dist, target.y + (cfg.camRise ?? 0.03), Math.cos(yaw) * dist + target.z);
  camera.lookAt(target);
  renderer.render(scene, camera);
  return renderer.domElement.toDataURL("image/png");
}

export function bones() {
  return [...rig.bones.keys()];
}


// ---- face helpers ---------------------------------------------------------
// Matrix taking a head part's mesh-space positions into the Head bone's local
// space at bind time.
function headLocalMatrix(part) {
  const i = part.skeleton.bones.findIndex((b) => b.name === "Head");
  return part.skeleton.boneInverses[i].clone().multiply(part.bindMatrix);
}

// ---- procedural face rig -------------------------------------------------
// The Quaternius heads have no blend shapes. We build them here: morph
// targets on the face, brows, lashes and eyes (deltas computed in Head-bone
// space with smooth radial falloff), plus skin-coloured eyelid shells for
// blinks/squints and a teeth strip for open mouths.
const smooth = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const fall = (d, r) => (d >= r ? 0 : 0.5 + 0.5 * Math.cos((Math.PI * d) / r)); // 1 at centre -> 0 at r

function components(geo, used) {
  const idx = geo.index.array;
  const parent = new Map();
  const find = (a) => {
    while (parent.get(a) !== a) {
      parent.set(a, parent.get(parent.get(a)));
      a = parent.get(a);
    }
    return a;
  };
  for (const i of used) parent.set(i, i);
  // weld by position so UV seams do not split islands
  const pos = geo.attributes.position;
  const key = (i) => `${pos.getX(i).toFixed(5)},${pos.getY(i).toFixed(5)},${pos.getZ(i).toFixed(5)}`;
  const byKey = new Map();
  for (const i of used) {
    const k = key(i);
    if (byKey.has(k)) parent.set(find(i), find(byKey.get(k)));
    else byKey.set(k, i);
  }
  for (let t = 0; t < idx.length; t += 3) {
    const [a, b, c] = [find(idx[t]), find(idx[t + 1]), find(idx[t + 2])];
    parent.set(b, a);
    parent.set(find(c), find(a));
  }
  const groups = new Map();
  for (const i of used) {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(i);
  }
  return [...groups.values()];
}

// Add morph targets to a head part. `fns` maps name -> (p: local Vector3, i) => delta Vector3 | null.
function addMorphs(part, fns) {
  const geo = part.geometry;
  const M = headLocalMatrix(part);
  const Minv = M.clone().invert();
  const pos = geo.attributes.position;
  const p = new THREE.Vector3();
  const used = geo.index ? new Set(geo.index.array) : null;
  const local = [];
  for (let i = 0; i < pos.count; i++) local.push(p.fromBufferAttribute(pos, i).applyMatrix4(M).clone());
  geo.morphAttributes.position = geo.morphAttributes.position || [];
  const names = [];
  for (const [name, fn] of Object.entries(fns)) {
    const arr = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      if (used && !used.has(i)) continue;
      const d = fn(local[i], i);
      if (!d) continue;
      // local delta -> mesh space (linear part only)
      const a = local[i].clone().add(d).applyMatrix4(Minv);
      arr[i * 3] = a.x - pos.getX(i);
      arr[i * 3 + 1] = a.y - pos.getY(i);
      arr[i * 3 + 2] = a.z - pos.getZ(i);
    }
    geo.morphAttributes.position.push(new THREE.Float32BufferAttribute(arr, 3));
    names.push(name);
  }
  geo.morphTargetsRelative = true;
  part.updateMorphTargets();
  part.morphTargetDictionary = Object.fromEntries(names.map((n, k) => [n, k]));
  part.morphTargetInfluences = names.map(() => 0);
  return local;
}

const rotX = (p, c, a) => {
  // rotate p around an X axis through c by angle a (positive tips +Y towards +Z)
  const y = p.y - c.y;
  const z = p.z - c.z;
  return new THREE.Vector3(p.x, c.y + y * Math.cos(a) - z * Math.sin(a), c.z + y * Math.sin(a) + z * Math.cos(a));
};
const rotY = (p, c, a) => {
  const x = p.x - c.x;
  const z = p.z - c.z;
  return new THREE.Vector3(c.x + x * Math.cos(a) + z * Math.sin(a), p.y, c.z - x * Math.sin(a) + z * Math.cos(a));
};

function lidMaterial(skin, lash) {
  return new THREE.MeshPhysicalMaterial({ color: lin(skin).multiplyScalar(0.8), roughness: 0.62, vertexColors: lash });
}

// Spherical cap around +Y (thetaLength from the pole), to be rotated about X.
function lidGeometry(r, theta, lashLine) {
  const g = new THREE.SphereGeometry(r, 40, 20, 0, Math.PI * 2, 0, theta);
  const col = new Float32Array(g.attributes.position.count * 3);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const ang = Math.acos(Math.min(1, pos.getY(i) / r));
    // darken towards the rim: a soft lash line
    const k = lashLine ? 1 - 0.82 * smooth(theta - 0.28, theta - 0.02, ang) : 1;
    col.set([k, k, k], i * 3);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  return g;
}

const BROW_LIFT = 0.0055;

function buildFace(c, bonesByName) {
  const parts = state.headParts;
  const face = parts.find((p) => /Superhero/i.test(p.material.name));
  const eyes = parts.find((p) => /Eye/.test(p.material.name) && !/brow/i.test(p.name));
  const brows = parts.find((p) => /Eyebrow/i.test(p.name));
  const F = {};

  // eyes: per-eye centre and radius (head space)
  const eM = headLocalMatrix(eyes);
  const ePos = eyes.geometry.attributes.position;
  const eUsed = eyes.geometry.index ? [...new Set(eyes.geometry.index.array)] : [...Array(ePos.count).keys()];
  const eye = {};
  for (const side of ["L", "R"]) {
    const sgn = side === "L" ? 1 : -1;
    const pts = eUsed.map((i) => new THREE.Vector3().fromBufferAttribute(ePos, i).applyMatrix4(eM)).filter((v) => v.x * sgn > 0);
    const cen = pts.reduce((a, v) => a.add(v), new THREE.Vector3()).divideScalar(pts.length);
    const r = (Math.max(...pts.map((v) => v.y)) - Math.min(...pts.map((v) => v.y))) / 2;
    const zFront = Math.max(...pts.map((v) => v.z));
    const zBack = Math.min(...pts.map((v) => v.z));
    eye[side] = { x: cen.x, y: cen.y, zFront, r, c: new THREE.Vector3(cen.x, cen.y, (zFront + zBack) / 2) };
  }
  F.eye = eye;

  // face: find the lip crease (deep verts between the lips)
  const fM = headLocalMatrix(face);
  const fPos = face.geometry.attributes.position;
  const fUsed = [...new Set(face.geometry.index.array)];
  const fl = new Map(fUsed.map((i) => [i, new THREE.Vector3().fromBufferAttribute(fPos, i).applyMatrix4(fM)]));
  // centre column between nose and chin: the deepest vertex is the lip crease
  const column = [...fl.values()].filter((v) => Math.abs(v.x) < 0.004 && v.y > eye.L.y - 0.095 && v.y < eye.L.y - 0.05 && v.z > 0.05);
  const crease = column.reduce((a, v) => (v.z < a.z ? v : a));
  const frontZ = Math.max(...column.filter((v) => Math.abs(v.y - crease.y) < 0.008).map((v) => v.z));
  const lipY = crease.y;
  // the lips meet on a flat inner plane at the crease depth; its extent gives the corners
  const deep = [...fl.values()].filter((v) => Math.abs(v.y - lipY) < 0.006 && Math.abs(v.z - crease.z) < 0.003);
  const cornerX = Math.max(0.018, ...deep.map((v) => Math.abs(v.x)));
  const lipZ = frontZ;
  F.lipY = lipY;
  F.cornerX = cornerX;
  F.creaseZ = crease.z;
  const corner = (s) => new THREE.Vector3(s * cornerX, lipY, lipZ - 0.012);
  const jawPivot = new THREE.Vector3(0, lipY + 0.035, lipZ - 0.11);
  const mouthC = new THREE.Vector3(0, lipY, lipZ);
  // inside-lip mask: deep verts around the lip line (darkened as mouth interior)
  const mask = new Float32Array(fPos.count);
  for (const [i, v] of fl) {
    if (Math.abs(v.y - lipY) > 0.006 || Math.abs(v.x) > cornerX || v.z < crease.z - 0.006) continue;
    mask[i] = (1 - smooth(crease.z + 0.003, crease.z + 0.009, v.z)) * (1 - smooth(cornerX - 0.012, cornerX - 0.004, Math.abs(v.x)));
  }
  face.geometry.setAttribute("mouthMask", new THREE.BufferAttribute(mask, 1));

  const smileSide = (s) => (p) => {
    const d = new THREE.Vector3();
    const w = fall(p.distanceTo(corner(s)), 0.026);
    if (w) d.add(new THREE.Vector3(s * 0.0035, 0.0075, -0.002).multiplyScalar(w));
    // lower lip stretches a little wider and up at the sides
    const cheek = fall(p.distanceTo(new THREE.Vector3(s * (cornerX + 0.018), lipY + 0.026, lipZ - 0.01)), 0.03);
    if (cheek) d.add(new THREE.Vector3(s * 0.0015, 0.004, 0.0025).multiplyScalar(cheek));
    return d.lengthSq() ? d : null;
  };
  const isLower = (p) => p.y < lipY + 0.0005;
  addMorphs(face, {
    smileL: smileSide(1),
    smileR: smileSide(-1),
    jawOpen: (p, i) => {
      // lower lip, chin and jaw swing down around a pivot near the ears;
      // fades out under the chin so the neck does not tear
      if (p.z < lipZ - 0.09) return null;
      const below = smooth(lipY + 0.002, lipY - 0.003, p.y);
      const neck = 1 - smooth(lipY - 0.07, lipY - 0.11, p.y);
      const side = 1 - smooth(0.05, 0.085, Math.abs(p.x));
      let w = below * Math.max(neck, 0) * side;
      const d = new THREE.Vector3();
      if (w) d.add(rotX(p, jawPivot, 0.12).sub(p).add(new THREE.Vector3(0, -0.006, -0.004)).multiplyScalar(w));
      // upper lip lifts slightly
      const up = (1 - below) * fall(Math.hypot(p.x / 1.4, p.y - lipY - 0.004), 0.016) * smooth(lipZ - 0.03, lipZ - 0.01, p.z);
      if (up) d.y += 0.004 * up;
      // deepen the crease into a cavity
      if (mask[i]) d.z -= 0.008 * mask[i];
      return d.lengthSq() ? d : null;
    },
    pucker: (p) => {
      const w = fall(Math.hypot(p.x / 1.5, (p.y - lipY) * 1.1), 0.03) * smooth(lipZ - 0.03, lipZ - 0.012, p.z);
      if (!w) return null;
      return new THREE.Vector3(-p.x * 0.42, (lipY - p.y) * 0.2, 0.011).multiplyScalar(w);
    },
    mouthO: (p) => {
      // narrows the corners for a round O when combined with jawOpen
      const w = fall(Math.hypot(p.x / 1.6, p.y - lipY), 0.032) * smooth(lipZ - 0.035, lipZ - 0.012, p.z);
      if (!w) return null;
      return new THREE.Vector3(-p.x * 0.3, 0, 0.004).multiplyScalar(w);
    },
    mouthSide: (p) => {
      const w = fall(Math.hypot(p.x / 1.5, p.y - lipY), 0.032) * smooth(lipZ - 0.035, lipZ - 0.012, p.z);
      if (!w) return null;
      return new THREE.Vector3(0.007, 0.0015 * Math.sign(p.x), 0.002).multiplyScalar(w);
    },
    frown: (p) => {
      let d = null;
      for (const s of [-1, 1]) {
        const w = fall(p.distanceTo(corner(s)), 0.02);
        if (w) d = (d || new THREE.Vector3()).add(new THREE.Vector3(0, -0.004, 0).multiplyScalar(w));
      }
      return d;
    },
    nose: (p) => {
      const w = fall(p.distanceTo(new THREE.Vector3(0, lipY + 0.032, lipZ + 0.01)), 0.022);
      return w ? new THREE.Vector3(0, 0.0025, -0.001).multiplyScalar(w) : null;
    },
    browSkinUpL: (p) => {
      // move the painted brow with the brow mesh so it never doubles up
      const e = eye.L;
      const w = smooth(e.y + e.r * 0.75, e.y + e.r * 1.25, p.y) * (1 - smooth(e.y + e.r * 3, e.y + e.r * 4.5, p.y)) * (1 - smooth(e.r * 2, e.r * 2.9, Math.abs(p.x - e.x))) * smooth(0.02, 0.05, p.z);
      return w ? new THREE.Vector3(0, BROW_LIFT, 0).multiplyScalar(w) : null;
    },
    browSkinUpR: (p) => {
      // move the painted brow with the brow mesh so it never doubles up
      const e = eye.R;
      const w = smooth(e.y + e.r * 0.75, e.y + e.r * 1.25, p.y) * (1 - smooth(e.y + e.r * 3, e.y + e.r * 4.5, p.y)) * (1 - smooth(e.r * 2, e.r * 2.9, Math.abs(p.x - e.x))) * smooth(0.02, 0.05, p.z);
      return w ? new THREE.Vector3(0, BROW_LIFT, 0).multiplyScalar(w) : null;
    },
  });
  // keep jawOpen's lower lip from sinking into the teeth: jaw pivot for teeth
  F.jawPivot = jawPivot;

  // brows and lashes (connected islands of the eyebrow mesh)
  const bPos = brows.geometry.attributes.position;
  const bM = headLocalMatrix(brows);
  const bUsed = [...new Set(brows.geometry.index.array)];
  const islands = components(brows.geometry, bUsed);
  const role = new Map(); // vertex -> 'browL' | 'browR' | 'lashL' | 'lashR'
  for (const isl of islands) {
    const cen = isl.reduce((a, i) => a.add(new THREE.Vector3().fromBufferAttribute(bPos, i).applyMatrix4(bM)), new THREE.Vector3()).divideScalar(isl.length);
    const side = cen.x > 0 ? "L" : "R";
    const kind = cen.y > eye[side].y + eye[side].r * 0.6 ? "brow" : "lash";
    for (const i of isl) role.set(i, kind + side);
  }
  const browFn = (side, fn) => (p, i) => (role.get(i) === "brow" + side ? fn(p, eye[side]) : null);
  // closing: upper lashes fold flat onto the closed-lid line (the lid's dark
  // rim then reads as the lash line)
  const lashFn = (side) => (p, i) => {
    const e = eye[side];
    if (role.get(i) !== "lash" + side || p.y < e.y - e.r * 0.3) return null;
    const u = (p.x - e.x) / (e.r * 1.4);
    const target = new THREE.Vector3(p.x, e.y - e.r * 0.42 + e.r * 0.12 * u * u, e.c.z + e.r * 1.12);
    return target.sub(p);
  };
  addMorphs(brows, {
    browUpL: browFn("L", () => new THREE.Vector3(0, BROW_LIFT, 0.0005)),
    browUpR: browFn("R", () => new THREE.Vector3(0, BROW_LIFT, 0.0005)),
    // inner ends down and in: a furrow
    browDownL: browFn("L", (p, e) => new THREE.Vector3(-0.0015, -0.0045 * (1 - smooth(e.x - 0.01, e.x + 0.025, p.x) * 0.6), 0.001)),
    browDownR: browFn("R", (p, e) => new THREE.Vector3(0.0015, -0.0045 * (1 - smooth(-e.x - 0.01, -e.x + 0.025, -p.x) * 0.6), 0.001)),
    // relaxed / sad-ish: inner ends up
    browInnerUpL: browFn("L", (p, e) => new THREE.Vector3(0, 0.005 * (1 - smooth(e.x - 0.015, e.x + 0.02, p.x)), 0)),
    browInnerUpR: browFn("R", (p, e) => new THREE.Vector3(0, 0.005 * (1 - smooth(-e.x - 0.015, -e.x + 0.02, -p.x)), 0)),
    blinkL: lashFn("L"),
    blinkR: lashFn("R"),
  });

  // eyes: look directions (each eyeball rotates about its own centre)
  const look = (fn) => (p) => {
    const side = p.x > 0 ? "L" : "R";
    return fn(p, eye[side].c).sub(p);
  };
  addMorphs(eyes, {
    lookUp: look((p, c) => rotX(p, c, -0.32)),
    lookDown: look((p, c) => rotX(p, c, 0.3)),
    lookLeft: look((p, c) => rotY(p, c, 0.35)), // towards the character's left (+X)
    lookRight: look((p, c) => rotY(p, c, -0.35)),
  });

  // eyelid shells (children of the Head bone, in head space)
  const head = bonesByName.get("Head");
  F.lids = {};
  for (const side of ["L", "R"]) {
    const e = eye[side];
    const R = e.r * 1.18;
    const upper = new THREE.Mesh(lidGeometry(R, Math.PI / 2 + 0.05, true), lidMaterial(c.skin, true));
    const lower = new THREE.Mesh(lidGeometry(R * 0.995, Math.PI / 2 + 0.05, true), lidMaterial(c.skin, true));
    lower.geometry.rotateZ(Math.PI); // cap around -Y
    for (const m of [upper, lower]) {
      m.position.copy(e.c);
      m.castShadow = false;
      m.receiveShadow = true;
      head.add(m);
    }
    F.lids[side] = { upper, lower };
  }

  // open mouth: a curved card drawn with a dark mouth, upper teeth and a
  // tongue, sitting between the parted lips (in front of the stretched
  // inner-lip faces, behind the lip fronts)
  const mc = document.createElement("canvas");
  mc.width = 256;
  mc.height = 160;
  const g = mc.getContext("2d");
  const shape = () => {
    g.beginPath();
    g.moveTo(14, 30);
    g.bezierCurveTo(70, 10, 186, 10, 242, 30);
    g.bezierCurveTo(236, 120, 180, 152, 128, 152);
    g.bezierCurveTo(76, 152, 20, 120, 14, 30);
    g.closePath();
  };
  shape();
  const grd = g.createRadialGradient(128, 80, 10, 128, 80, 130);
  grd.addColorStop(0, "#2a0710");
  grd.addColorStop(1, "#4a1420");
  g.fillStyle = grd;
  g.fill();
  g.save();
  shape();
  g.clip();
  g.fillStyle = "#c2475f"; // tongue
  g.beginPath();
  g.ellipse(128, 160, 80, 50, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#f6efe9"; // upper teeth
  g.beginPath();
  g.moveTo(30, 0);
  g.lineTo(226, 0);
  g.bezierCurveTo(222, 40, 190, 50, 128, 50);
  g.bezierCurveTo(66, 50, 34, 40, 30, 0);
  g.fill();
  g.restore();
  const mtex = new THREE.CanvasTexture(mc);
  mtex.colorSpace = THREE.SRGBColorSpace;
  const mw = cornerX * 1.75;
  const mouthGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 24, 1, true, -mw / 0.05 / 2, mw / 0.05);
  // UVs: cylinder u runs around, v along height; fine for a card
  const mouth = new THREE.Mesh(mouthGeo, new THREE.MeshStandardMaterial({ map: mtex, transparent: true, alphaTest: 0.5, roughness: 0.5, side: THREE.DoubleSide }));
  mouth.renderOrder = 1;
  mouth.position.set(0, lipY, frontZ - 0.05 - 0.007);
  mouth.visible = false;
  head.add(mouth);
  F.mouth = mouth;
  F.mouthW = mw;

  F.face = face;
  F.brows = brows;
  F.eyes = eyes;
  state.face = F;
}

// Upper lid rim elevation (radians above the eye's equator, at the front):
// open ~ +0.85, closed ~ -0.15. Lower lid rim: open ~ -0.85, squint ~ -0.2.
function setLid(m, rimElev) {
  // Both caps have their rim on the equator; rotating about X by a moves the
  // front of the rim to elevation -a.
  m.rotation.x = -rimElev;
}

const EXPR_DEFAULT = { happy: 0, smileL: 0, smileR: 0, jawOpen: 0, pucker: 0, mouthO: 0, mouthSide: 0, frown: 0, nose: 0, browUpL: 0, browUpR: 0, browDownL: 0, browDownR: 0, browInnerUpL: 0, browInnerUpR: 0, blinkL: 0, blinkR: 0, squintL: 0, squintR: 0, lookUp: 0, lookDown: 0, lookLeft: 0, lookRight: 0, wide: 0 };

function applyExpression(ex) {
  const F = state.face;
  if (!F) return;
  const e = { ...EXPR_DEFAULT, ...ex };
  const set = (mesh, name, v) => {
    const k = mesh.morphTargetDictionary?.[name];
    if (k !== undefined) mesh.morphTargetInfluences[k] = v;
  };
  for (const n of ["smileL", "smileR", "jawOpen", "pucker", "mouthO", "mouthSide", "frown", "nose"]) set(F.face, n, e[n]);
  set(F.face, "browSkinUpL", e.browUpL);
  set(F.face, "browSkinUpR", e.browUpR);
  for (const n of ["browUpL", "browUpR", "browDownL", "browDownR", "browInnerUpL", "browInnerUpR"]) set(F.brows, n, e[n]);
  for (const n of ["lookUp", "lookDown", "lookLeft", "lookRight"]) set(F.eyes, n, e[n]);
  const open = state.cfg.lidOpen ?? 0.9;
  const closed = state.cfg.lidClosed ?? -0.3;
  for (const s of ["L", "R"]) {
    const blink = e["blink" + s];
    const squint = e["squint" + s];
    const up = open + 0.25 * e.wide + (closed - open) * blink - 0.25 * squint * (1 - blink);
    // happy: upper lid shut and the lower lid rises past it, so the visible
    // line is the lower rim, an upward crescent
    const happy = e["happy" + s] ?? e.happy ?? 0;
    const upH = up + (closed - 0.05 - up) * happy;
    setLid(F.lids[s].upper, upH);
    const low = -0.95 + 0.55 * squint - 0.1 * e.wide;
    setLid(F.lids[s].lower, happy > 0 ? low + (0.22 - low) * happy : Math.min(low, up - 0.05));
    set(F.brows, "blink" + s, Math.min(1, Math.max(0, (open - upH) / (open - closed))));
  }
  // mouth card: height follows the jaw, narrower for an O
  const jaw = e.jawOpen;
  F.mouth.visible = jaw > 0.04;
  const h = 0.0135 * jaw;
  F.mouth.scale.set(1 - 0.38 * e.mouthO - 0.3 * e.pucker + 0.12 * (e.smileL + e.smileR) * 0.5, h, 1);
  F.mouth.position.y = F.lipY + 0.0012 - h / 2;
}

// A quick blink (0 -> 1 -> 0) starting at each loop phase in `times`.
function blinkAt(p, times, len = 0.09) {
  let b = 0;
  for (const t of times) {
    const u = (((p - t) % 1) + 1) % 1;
    if (u < len) b = Math.max(b, Math.sin((Math.PI * u) / len));
  }
  return b;
}
