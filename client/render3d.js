import * as THREE from "../assets/vendor/three.module.js";
import { ARENA, LANES, LANE_IDS, NEXUS, TEAM } from "../shared/constants.js";
import { getHero } from "../shared/heroes.js";
import { clamp } from "../shared/physics.js";
import { ArenaRenderer, TEAM_COLORS, drawHeroPortrait } from "./render.js";

const TEAM_HEX = [0x45c3ff, 0xff5d7d];
const TEAM_DARK_HEX = [0x1274d4, 0xc92e56];
const OUTLINE_COLOR = 0x041018;
const HERO_VISUAL_SCALE = 1.7; // model lebih besar dari hitbox agar terbaca
const MINION_VISUAL_SCALE = 1.6;
const TOWER_VISUAL_SCALE = 1.3;
const GROUND_SCALE = 1; // piksel tekstur per satuan dunia
const VIEW_WIDTH = 1500; // lebar dunia yang terlihat di layar (kamera mengikuti hero)
const VIEW_DEPTH = 900;

// ---------------------------------------------------------------- builders

const outlineMaterial = new THREE.MeshBasicMaterial({ color: OUTLINE_COLOR, side: THREE.BackSide });
const materialCache = new Map();
const textureCache = new Map();

// ---- tekstur prosedural (digambar di canvas, tanpa file gambar) ----------

function seeded(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const cssColor = (value) => (typeof value === "number" ? `#${value.toString(16).padStart(6, "0")}` : value);

const TEXTURE_PAINTERS = {
  // kawung: empat elips bersilang, motif batik klasik
  batik(g, s, base, ink) {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    g.strokeStyle = ink;
    g.lineWidth = s / 40;
    const cell = s / 2;
    for (let cy = 0; cy < 2; cy += 1) {
      for (let cx = 0; cx < 2; cx += 1) {
        const x = cx * cell + cell / 2;
        const y = cy * cell + cell / 2;
        for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
          g.beginPath();
          g.ellipse(x + dx * cell * 0.17, y + dy * cell * 0.17, cell * 0.14, cell * 0.2, dx ? Math.PI / 2 : 0, 0, Math.PI * 2);
          g.stroke();
        }
        g.fillStyle = ink;
        g.beginPath();
        g.arc(x, y, s / 60, 0, Math.PI * 2);
        g.fill();
      }
    }
  },
  // anyaman janur / rotan
  weave(g, s, base, ink) {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    const step = s / 8;
    g.fillStyle = ink;
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        if ((row + col) % 2 === 0) g.fillRect(col * step + 1, row * step + 1, step - 2, step - 2);
      }
    }
    g.strokeStyle = "rgba(0,0,0,0.25)";
    g.lineWidth = 1;
    for (let i = 0; i <= 8; i += 1) {
      g.beginPath();
      g.moveTo(i * step, 0);
      g.lineTo(i * step, s);
      g.moveTo(0, i * step);
      g.lineTo(s, i * step);
      g.stroke();
    }
  },
  wood(g, s, base, ink) {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    const rand = seeded(11);
    g.strokeStyle = ink;
    for (let i = 0; i < 26; i += 1) {
      g.globalAlpha = 0.15 + rand() * 0.3;
      g.lineWidth = 1 + rand() * 2;
      const x = rand() * s;
      g.beginPath();
      g.moveTo(x, 0);
      g.bezierCurveTo(x + rand() * 8 - 4, s * 0.33, x + rand() * 8 - 4, s * 0.66, x + rand() * 6 - 3, s);
      g.stroke();
    }
    g.globalAlpha = 0.5;
    g.fillStyle = ink;
    g.beginPath();
    g.ellipse(s * 0.65, s * 0.4, 5, 8, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  },
  brick(g, s, base, ink) {
    g.fillStyle = ink;
    g.fillRect(0, 0, s, s);
    const rand = seeded(5);
    const rows = 8;
    const h = s / rows;
    for (let row = 0; row < rows; row += 1) {
      const offset = row % 2 ? s / 8 : 0;
      for (let col = -1; col < 4; col += 1) {
        const shade = Math.floor(rand() * 26) - 13;
        g.fillStyle = base;
        g.fillRect(col * (s / 4) + offset + 2, row * h + 2, s / 4 - 4, h - 4);
        g.fillStyle = shade > 0 ? `rgba(255,220,180,${shade / 90})` : `rgba(30,0,0,${-shade / 90})`;
        g.fillRect(col * (s / 4) + offset + 2, row * h + 2, s / 4 - 4, h - 4);
      }
    }
  },
  stone(g, s, base, ink) {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    const rand = seeded(23);
    for (let i = 0; i < 70; i += 1) {
      g.fillStyle = rand() > 0.5 ? "rgba(255,255,255,0.08)" : cssColor(ink);
      g.globalAlpha = rand() > 0.5 ? 1 : 0.12;
      g.beginPath();
      g.arc(rand() * s, rand() * s, 2 + rand() * 9, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 0.5;
    g.strokeStyle = ink;
    g.lineWidth = 1.5;
    for (let i = 0; i < 4; i += 1) {
      g.beginPath();
      let x = rand() * s;
      let y = rand() * s;
      g.moveTo(x, y);
      for (let k = 0; k < 4; k += 1) {
        x += rand() * 22 - 11;
        y += rand() * 22 - 4;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    g.globalAlpha = 1;
  },
  // genteng: sisik setengah lingkaran berlapis
  roof(g, s, base, ink) {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    const rows = 6;
    const h = s / rows;
    g.strokeStyle = ink;
    g.lineWidth = 2;
    for (let row = 0; row < rows; row += 1) {
      for (let col = -1; col < 5; col += 1) {
        const x = col * (s / 4) + (row % 2 ? s / 8 : 0);
        g.beginPath();
        g.arc(x + s / 8, row * h, s / 8, 0, Math.PI);
        g.stroke();
      }
    }
  },
  tiger(g, s, base, ink) {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    const rand = seeded(7);
    g.fillStyle = ink;
    for (let i = 0; i < 9; i += 1) {
      const y = (i / 9) * s + rand() * 4;
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= s; x += s / 6) g.lineTo(x, y + (x / (s / 6)) % 2 * 6 - 3 + rand() * 3);
      for (let x = s; x >= 0; x -= s / 6) g.lineTo(x, y + 7 + (x / (s / 6)) % 2 * 4);
      g.closePath();
      g.fill();
    }
  },
  cloth(g, s, base, ink) {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    g.strokeStyle = ink;
    g.globalAlpha = 0.25;
    g.lineWidth = 1;
    for (let i = -s; i < s * 2; i += 5) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i + s, s);
      g.stroke();
    }
    g.globalAlpha = 1;
  },
  // tali usus: untaian tali hitam berpilin
  rope(g, s, base, ink) {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    g.strokeStyle = ink;
    g.lineWidth = s / 14;
    for (let i = -s; i < s * 2; i += s / 6) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i + s * 0.5, s);
      g.stroke();
    }
  },
  metal(g, s, base, ink) {
    const grad = g.createLinearGradient(0, 0, s, s);
    grad.addColorStop(0, "#fff3c4");
    grad.addColorStop(0.35, base);
    grad.addColorStop(1, ink);
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    g.strokeStyle = "rgba(255,255,255,0.25)";
    for (let y = 0; y < s; y += 6) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(s, y + 3);
      g.stroke();
    }
    g.fillStyle = "rgba(0,0,0,0.18)";
    for (let i = 0; i < 12; i += 1) g.fillRect((i * 37) % s, (i * 53) % s, 3, 3);
  },
  // rajah / rune bercahaya untuk jubah Leak
  rune(g, s, base, ink) {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    g.strokeStyle = ink;
    g.lineWidth = 2.5;
    g.lineCap = "round";
    const rand = seeded(31);
    for (let i = 0; i < 8; i += 1) {
      const x = rand() * (s - 24) + 12;
      const y = rand() * (s - 24) + 12;
      g.beginPath();
      g.moveTo(x, y - 8);
      g.lineTo(x + 6, y);
      g.lineTo(x - 6, y + 4);
      g.lineTo(x, y + 10);
      g.stroke();
    }
  },
  lace(g, s, base, ink) {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    g.strokeStyle = ink;
    g.lineWidth = 2;
    for (let y = s / 8; y < s; y += s / 4) {
      for (let x = s / 8; x < s; x += s / 4) {
        g.beginPath();
        g.arc(x, y, s / 14, 0, Math.PI * 2);
        g.stroke();
        for (let k = 0; k < 6; k += 1) {
          const a = (k / 6) * Math.PI * 2;
          g.beginPath();
          g.moveTo(x + Math.cos(a) * s / 14, y + Math.sin(a) * s / 14);
          g.lineTo(x + Math.cos(a) * s / 8, y + Math.sin(a) * s / 8);
          g.stroke();
        }
      }
    }
  },
};

function makeTexture(config) {
  const key = JSON.stringify(config);
  let texture = textureCache.get(key);
  if (texture) return texture;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d");
  (TEXTURE_PAINTERS[config.kind] ?? TEXTURE_PAINTERS.cloth)(g, size, cssColor(config.base), cssColor(config.ink ?? 0x000000));
  texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...(config.repeat ?? [1, 1]));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  textureCache.set(key, texture);
  return texture;
}

/** Konfigurasi tekstur ringkas: tex("batik", base, ink, [ulangX, ulangY]). */
function tex(kind, base, ink, repeat = [1, 1]) {
  return { kind, base, ink, repeat };
}

function material(color, options = {}) {
  const key = `${color}|${options.emissive ?? ""}|${options.opacity ?? 1}|${options.map ? JSON.stringify(options.map) : ""}`;
  let cached = materialCache.get(key);
  if (!cached) {
    cached = new THREE.MeshStandardMaterial({
      color: options.map ? 0xffffff : color,
      map: options.map ? makeTexture(options.map) : null,
      roughness: options.roughness ?? 0.72,
      metalness: options.metalness ?? 0.04,
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissive ? 0.8 : 0,
      transparent: (options.opacity ?? 1) < 1,
      opacity: options.opacity ?? 1,
    });
    materialCache.set(key, cached);
  }
  return cached;
}

/** Mesh kartun dengan garis tepi (inverted hull) ala Brawl Stars. */
function toon(geometry, color, options = {}) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(geometry, material(color, options));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  if (options.outline !== false) {
    const hull = new THREE.Mesh(geometry, outlineMaterial);
    hull.scale.setScalar(options.outlineScale ?? 1.07);
    group.add(hull);
  }
  return group;
}

function put(parent, object, x = 0, y = 0, z = 0) {
  object.position.set(x, y, z);
  parent.add(object);
  return object;
}

const sphereGeo = new THREE.SphereGeometry(1, 20, 14);
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 18);
const coneGeo = new THREE.ConeGeometry(1, 1, 18);
const pyramidGeo = new THREE.ConeGeometry(1, 1, 4, 1);
pyramidGeo.rotateY(Math.PI / 4);
const smileGeo = new THREE.TorusGeometry(1, 0.2, 6, 14, Math.PI);

function ball(color, rx, ry = rx, rz = rx, options) {
  const part = toon(sphereGeo, color, options);
  part.scale.set(rx, ry, rz);
  return part;
}

function block(color, w, h, d, options) {
  const part = toon(boxGeo, color, options);
  part.scale.set(w, h, d);
  return part;
}

function cylinder(color, rx, h, rz = rx, options) {
  const part = toon(cylGeo, color, options);
  part.scale.set(rx, h, rz);
  return part;
}

function cone(color, r, h, options) {
  const part = toon(coneGeo, color, options);
  part.scale.set(r, h, r);
  return part;
}

function pyramid(color, r, h, options) {
  const part = toon(pyramidGeo, color, options);
  part.scale.set(r, h, r);
  return part;
}

// ---------------------------------------------------------------- ekspresi

/**
 * Wajah beranimasi: mata (kedip), alis (marah/sedih), mulut (datar/senyum/
 * terbuka/kecil) dan keringat. Mengembalikan rig untuk setExpression().
 */
function addFace(head, radius, options = {}) {
  const rig = { eyes: [], brows: [], mouths: {}, sweat: null, idleMouth: options.idleMouth ?? "smile" };
  const eyeColor = options.eye ?? 0x1b1210;
  const browColor = options.browColor ?? 0x24150f;
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    put(head, eye, side * radius * 0.36, radius * 0.1, radius * 0.9);
    put(eye, ball(eyeColor, radius * 0.13, radius * 0.19, radius * 0.08, { outline: false }), 0, 0, 0);
    put(eye, ball(0xffffff, radius * 0.045, radius * 0.06, radius * 0.03, { outline: false }), radius * 0.04, radius * 0.08, radius * 0.07);
    rig.eyes.push(eye);

    const brow = new THREE.Group();
    put(head, brow, side * radius * 0.36, radius * 0.44, radius * 0.93);
    put(brow, block(browColor, radius * (options.browWidth ?? 0.3), radius * (options.browThick ?? 0.07), radius * 0.06, { outline: false }), 0, 0, 0);
    brow.userData.side = side;
    rig.brows.push(brow);
  }
  const mouthY = -radius * 0.38 + (options.mouthY ?? 0);
  const mouthZ = radius * 0.92 + (options.mouthZ ?? 0);
  const dark = 0x4a1c14;
  const flat = block(dark, radius * 0.3, radius * 0.07, radius * 0.05, { outline: false });
  const smile = new THREE.Mesh(smileGeo, material(dark));
  smile.scale.setScalar(radius * 0.26);
  smile.rotation.z = Math.PI;
  const smileHolder = new THREE.Group();
  smileHolder.add(smile);
  const open = new THREE.Group();
  put(open, ball(0x2a0a08, radius * 0.2, radius * 0.22, radius * 0.07, { outline: false }), 0, 0, 0);
  put(open, ball(0xe11d48, radius * 0.12, radius * 0.08, radius * 0.05, { outline: false }), 0, -radius * 0.1, radius * 0.03);
  const small = ball(0x2a0a08, radius * 0.1, radius * 0.13, radius * 0.06, { outline: false });
  for (const [name, mouth] of Object.entries({ flat, smile: smileHolder, open, small })) {
    put(head, mouth, 0, mouthY + (name === "smile" ? radius * 0.12 : 0), mouthZ);
    mouth.visible = false;
    rig.mouths[name] = mouth;
  }
  const sweat = ball(0x7dd3fc, radius * 0.07, radius * 0.1, radius * 0.05, { outline: false, opacity: 0.9 });
  put(head, sweat, radius * 0.72, radius * 0.5, radius * 0.6);
  sweat.visible = false;
  rig.sweat = sweat;
  return rig;
}

const EXPRESSIONS = {
  idle: { eye: 1, brow: 0, lift: 0, mouth: null },
  happy: { eye: 0.4, brow: 0, lift: 0.05, mouth: "smile" },
  angry: { eye: 0.85, brow: 0.55, lift: -0.02, mouth: "open" },
  hurt: { eye: 0.18, brow: -0.5, lift: 0.04, mouth: "small" },
  worried: { eye: 1.2, brow: -0.4, lift: 0.04, mouth: "flat", sweat: true },
};

function setExpression(rig, name, seconds) {
  if (!rig) return;
  const exp = EXPRESSIONS[name] ?? EXPRESSIONS.idle;
  // kedip tiap ~3.4 detik selama 0,12 detik
  const blink = name === "idle" || name === "worried" ? ((seconds + (rig.blinkPhase ?? 0)) % 3.4 < 0.12 ? 0.08 : 1) : 1;
  for (const eye of rig.eyes) eye.scale.y = exp.eye * blink;
  for (const brow of rig.brows) {
    brow.rotation.z = brow.userData.side * exp.brow;
    brow.position.y = brow.userData.baseY ??= brow.position.y;
    brow.position.y = brow.userData.baseY + exp.lift * 15;
  }
  const mouth = exp.mouth ?? rig.idleMouth;
  for (const [key, node] of Object.entries(rig.mouths)) node.visible = key === mouth;
  if (rig.sweat) rig.sweat.visible = Boolean(exp.sweat);
  if (rig.custom) rig.custom(name, exp);
}

// ---------------------------------------------------------------- tangan

/**
 * Lengan berpivot di bahu: lengan baju + telapak (mitten kartun) + jempol.
 * `grip` adalah titik genggam untuk menempelkan senjata/benda.
 */
function addArms(root, options) {
  const { skin, sleeve, x, y, length = 14, sleeveRadius = 4.6, handRadius = 5.6, sleeveMap = null, claws = false } = options;
  const arms = { left: null, right: null, gripL: null, gripR: null, baseZ: 0.45 };
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    put(root, pivot, side * x, y, 0);
    pivot.add(ball(sleeve, sleeveRadius * 1.15, sleeveRadius * 1.15, sleeveRadius * 1.15, { map: sleeveMap }));
    put(pivot, cylinder(sleeve, sleeveRadius, length, sleeveRadius, { map: sleeveMap }), 0, -length / 2, 0);
    const grip = new THREE.Group();
    put(pivot, grip, 0, -length - 2, 0);
    grip.add(ball(skin, handRadius, handRadius * 0.95, handRadius));
    put(grip, ball(skin, handRadius * 0.4, handRadius * 0.5, handRadius * 0.4), side * -handRadius * 0.55, handRadius * 0.15, handRadius * 0.75);
    if (claws) {
      for (let finger = -1; finger <= 1; finger += 1) {
        const claw = put(grip, cone(0xf1f5f9, 1.5, 9, { outline: false }), finger * 2.6, -handRadius - 2, 1.5);
        claw.rotation.x = Math.PI;
      }
    }
    pivot.rotation.z = side * arms.baseZ;
    if (side < 0) {
      arms.left = pivot;
      arms.gripL = grip;
    } else {
      arms.right = pivot;
      arms.gripR = grip;
    }
  }
  arms.rest = { left: { x: 0, z: -arms.baseZ }, right: { x: 0, z: arms.baseZ } };
  return arms;
}

// ---------------------------------------------------------------- heroes
// Satuan model: tinggi tubuh ~56, jari-jari ~24 (sama dengan sprite 2D).

function chibiBase(skin, bodyColor, bodyH = 22, bodyRx = 20, faceOptions = {}, bodyMap = null) {
  const root = new THREE.Group();
  const body = put(root, ball(bodyColor, bodyRx, bodyH, bodyRx * 0.85, { map: bodyMap }), 0, bodyH + 2, 0);
  const head = new THREE.Group();
  put(root, head, 0, bodyH * 2 + 18, 0);
  head.scale.setScalar(1.25);
  put(head, ball(skin, 16, 15, 15), 0, 0, 0);
  const face = addFace(head, 15, faceOptions);
  return { root, body, head, face };
}

function finishHero(root, state, parts) {
  Object.assign(state, parts);
  return root;
}

function buildWarok(hero, state) {
  const { root, head, face } = chibiBase(0xcf9460, 0xd9a066, 16, 24, {
    idleMouth: "flat",
    browColor: 0x0a0a0c,
    browWidth: 0.42,
    browThick: 0.12,
    mouthY: -2.2,
    mouthZ: 1.2,
  });
  // celana pangsi hitam (anyaman kain) & sabuk tali usus
  put(root, cylinder(0x18181b, 21, 12, 18, { map: tex("weave", 0x1f1f25, 0x32323a, [3, 1]) }), 0, 8, 0);
  put(root, cylinder(0x0a0a0c, 24, 5, 21, { map: tex("rope", 0x0d0d10, 0x7e7e8a, [6, 1]) }), 0, 22, 0);
  // bahu macan loreng
  for (const side of [-1, 1]) {
    put(root, ball(0xea7a12, 11, 9, 11, { map: tex("tiger", 0xea7a12, 0x18181b, [2, 2]) }), side * 25, 40, 0);
  }
  // kumis, goatee, udeng
  for (const side of [-1, 1]) {
    const mustache = put(head, ball(0x0a0a0c, 7, 2.6, 3.4, { outline: false }), side * 5.5, -4.2, 13.6);
    mustache.rotation.z = side * 0.35;
  }
  put(head, ball(0x0a0a0c, 3.6, 4.6, 2.6, { outline: false }), 0, -10.5, 12.6);
  const udeng = put(head, cylinder(0x0a0a0c, 16.5, 5, 16.5, { map: tex("cloth", 0x0e0e12, 0x3a3a46, [3, 1]) }), 0, 10, 0);
  udeng.rotation.z = 0.08;
  // dhadhak merak: kipas bulu di punggung
  const fan = new THREE.Group();
  put(root, fan, 0, 40, -10);
  for (let index = 0; index < 9; index += 1) {
    const feather = new THREE.Group();
    const leaf = put(feather, ball(index % 2 ? 0x0f766e : 0x14b8a6, 5, 22, 2.5), 0, 24, 0);
    put(leaf, ball(0xfbbf24, 0.55, 0.22, 1.4, { outline: false }), 0, 0.7, 1);
    feather.rotation.z = (index / 8 - 0.5) * 2.5;
    put(fan, feather, 0, 0, 0);
  }
  state.fan = fan;
  const arms = addArms(root, { skin: 0xcf9460, sleeve: 0xcf9460, x: 25, y: 38, length: 13, sleeveRadius: 5.6, handRadius: 7.4 });
  return finishHero(root, state, { face, arms });
}

function buildGajah(hero, state) {
  const { root, head, face } = chibiBase(0xc98f5c, 0xd4903a, 16, 23, {
    idleMouth: "flat",
    browColor: 0x1a1008,
    browWidth: 0.36,
    browThick: 0.1,
  });
  const bronze = tex("metal", 0xd4903a, 0x6b3f0f, [1, 1]);
  put(root, ball(0xe0a64a, 18, 13, 12, { map: bronze }), 0, 32, 6);
  const sun = put(root, cylinder(0xfef3c7, 6, 1.5, 6, { outline: false }), 0, 33, 14);
  sun.rotation.x = Math.PI / 2;
  for (const side of [-1, 1]) put(root, ball(0xe0a64a, 10, 8, 10, { map: bronze }), side * 24, 40, 0);
  // sarung batik terlilit
  put(root, cylinder(0x7c2d12, 23, 14, 20, { map: tex("batik", 0x7c2d12, 0xfcd34d, [3, 1]) }), 0, 8, 0);
  put(root, block(0xfcd34d, 40, 1.8, 2, { outline: false }), 0, 11, 17);
  // mahkota perunggu
  put(head, cone(0xe0a64a, 13, 24, { map: bronze }), 0, 20, 0);
  put(head, ball(0xdc2626, 2.8), 0, 9, 13);
  const arms = addArms(root, { skin: 0xc98f5c, sleeve: 0xe0a64a, sleeveMap: bronze, x: 24, y: 37, length: 13 });
  // keris luk di tangan kanan
  const kris = new THREE.Group();
  put(arms.gripR, kris, 0, -2, 2);
  kris.rotation.x = Math.PI;
  put(kris, cylinder(0x6b3f1d, 3, 10, 3, { map: tex("wood", 0x6b3f1d, 0x2a1608, [1, 1]) }), 0, 4, 0);
  put(kris, block(0xfcd34d, 9, 2, 3.5, { outline: false }), 0, 9, 0);
  [0, 8, 16, 24].forEach((offset, index) => {
    const seg = put(kris, block(0xcbd5e1, 4.4 - index * 0.7, 9, 1.8, { metalness: 0.5 }), index % 2 ? 1.6 : -1.6, 15 + offset, 0);
    seg.rotation.z = index % 2 ? -0.22 : 0.22;
  });
  arms.right.rotation.x = -0.35;
  arms.rest.right.x = -0.35;
  return finishHero(root, state, { face, arms });
}

function buildLeak(hero, state) {
  const root = new THREE.Group();
  const robeTexture = tex("rune", 0x3b1673, 0xc084fc, [2, 2]);
  put(root, cone(0x4c1d95, 26, 50, { map: robeTexture }), 0, 25, 0);
  put(root, ball(0x2e1065, 20, 16, 15, { map: tex("cloth", 0x2e1065, 0x6d28d9, [2, 1]) }), 0, 40, 0);
  const head = new THREE.Group();
  put(root, head, 0, 62, 0);
  put(head, ball(0xe8e0cc, 17, 17, 14), 0, 0, 0);
  const rig = { eyes: [], brows: [], mouths: {}, sweat: null, idleMouth: "flat", custom: null };
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    put(head, eye, side * 6.5, 3, 12);
    put(eye, ball(0xfef08a, 4.6, 4.6, 2.6), 0, 0, 0);
    put(eye, ball(0xb91c1c, 1.9, 1.9, 1.2, { outline: false }), 0, 0, 2.4);
    rig.eyes.push(eye);
    const brow = new THREE.Group();
    put(head, brow, side * 7, 9, 13);
    put(brow, block(0x7f1d1d, 9, 2.2, 2.6, { outline: false }), 0, 0, 0);
    brow.userData.side = side;
    brow.rotation.z = side * 0.4;
    rig.brows.push(brow);
  }
  const mouth = put(head, block(0x1c0b0b, 15, 7, 3, { outline: false }), 0, -7, 13.6);
  rig.mouths.flat = mouth;
  for (const x of [-5.5, 5.5]) {
    const fang = put(head, cone(0xffffff, 1.9, 7, { outline: false }), x, -9, 14.8);
    fang.rotation.x = Math.PI;
  }
  const tongue = new THREE.Group();
  put(head, tongue, 0, -11, 14);
  put(tongue, block(0xe11d48, 4.5, 24, 2.4), 0, -12, 0);
  state.tongue = tongue;
  // ekspresi Leak: alis lebih garang & mulut/lidah melebar saat menyerang
  rig.custom = (name, exp) => {
    mouth.scale.y = name === "angry" ? 7 * 2.1 : name === "hurt" ? 7 * 1.5 : 7;
    mouth.visible = true;
    tongue.scale.y = name === "angry" ? 1.35 : name === "hurt" ? 0.7 : 1;
    for (const brow of rig.brows) brow.rotation.z = brow.userData.side * (0.4 + exp.brow * 0.5);
  };
  state.flames = [];
  for (let index = 0; index < 8; index += 1) {
    const flame = new THREE.Group();
    put(flame, cone(index % 2 ? 0xf97316 : 0xdc2626, 5, 24, {}), 0, 14, 0);
    flame.rotation.z = (index / 7 - 0.5) * 3.0;
    put(head, flame, 0, 10, -2);
    state.flames.push(flame);
  }
  const arms = addArms(root, {
    skin: 0xd9d2e6,
    sleeve: 0x4c1d95,
    sleeveMap: robeTexture,
    x: 22,
    y: 44,
    length: 14,
    claws: true,
  });
  return finishHero(root, state, { face: rig, arms });
}

function buildNyiRoro(hero, state) {
  const { root, head, face } = chibiBase(0xe7efe9, 0x10b981, 18, 19, { idleMouth: "smile", browColor: 0x0b1f1b }, tex("lace", 0x10b981, 0xa7f3d0, [2, 2]));
  put(root, ball(0x0b1f1b, 21, 28, 8), 0, 34, -10);
  put(head, ball(0x0b1f1b, 16.5, 11, 15.5), 0, 6, -2);
  put(head, cone(0xfacc15, 11, 15, { emissive: 0xb45309 }), 0, 18, 0);
  for (const a of [-1, 0, 1]) put(head, cone(0xfacc15, 2.6, 9, { emissive: 0xb45309, outline: false }), a * 8, 14, 0);
  put(head, ball(0x34d399, 2.6, 3.2, 2, { emissive: 0x059669, outline: false }), 0, 12, 12);
  put(root, block(0xfde68a, 4, 26, 2, { map: tex("batik", 0xfde68a, 0xb45309, [1, 3]) }), 0, 22, 18);
  put(root, cylinder(0x67e8f9, 30, 2.2, 30, { opacity: 0.75, outline: false }), 0, 1, 0);
  put(root, cylinder(0x22d3ee, 24, 3, 24, { opacity: 0.8, outline: false }), 0, 2, 0);
  state.orbs = [];
  for (let index = 0; index < 3; index += 1) {
    const orb = ball(0x7dd3fc, 6.5, 6.5, 6.5, { opacity: 0.85, emissive: 0x0e7490, outline: false });
    root.add(orb);
    state.orbs.push(orb);
  }
  const arms = addArms(root, {
    skin: 0xe7efe9,
    sleeve: 0x10b981,
    sleeveMap: tex("lace", 0x10b981, 0xa7f3d0, [1, 2]),
    x: 19,
    y: 36,
    length: 12,
    sleeveRadius: 3.8,
    handRadius: 4.6,
  });
  arms.baseZ = 0.95;
  arms.left.rotation.z = -0.95;
  arms.right.rotation.z = 0.95;
  arms.rest = { left: { x: 0, z: -0.95 }, right: { x: 0, z: 0.95 } };
  return finishHero(root, state, { face, arms });
}

function buildDayak(hero, state) {
  const { root, head, face } = chibiBase(0xd49a68, 0xd49a68, 15, 20, { idleMouth: "smile", browColor: 0x1a0f08 });
  put(root, cylinder(0x7c2d12, 21, 12, 18, { map: tex("weave", 0x8a3b16, 0xd6a24a, [3, 1]) }), 0, 7, 0);
  for (let index = 0; index < 4; index += 1) {
    put(root, block(0xf8f4e6, 30 - Math.abs(index - 1.5) * 4, 3.6, 4), 0, 20 + index * 5.5, 14 - Math.abs(index - 1.5) * 1.4);
  }
  for (const side of [-1, 1]) put(head, block(0xb91c1c, 7, 1.8, 2, { outline: false }), side * 11, -2, 12);
  put(head, block(0xb91c1c, 2, 7, 2, { outline: false }), 0, 11, 13);
  put(head, cylinder(0xb45309, 16.5, 5, 16.5, { map: tex("batik", 0xb45309, 0xfde68a, [4, 1]) }), 0, 10, 0);
  const colors = [0x111827, 0xf8fafc, 0xdc2626, 0x111827, 0xf8fafc, 0xdc2626, 0x111827];
  colors.forEach((color, index) => {
    const feather = new THREE.Group();
    put(feather, ball(color, 4.4, 17, 1.8), 0, 18, 0);
    feather.rotation.z = (index - 3) * 0.3;
    put(head, feather, 0, 12, -2);
  });
  const arms = addArms(root, { skin: 0xd49a68, sleeve: 0xd49a68, x: 20, y: 33, length: 12 });
  // sumpit dipegang tangan kanan, diangkat ke depan
  const pipe = new THREE.Group();
  put(arms.gripR, pipe, 0, 0, 2);
  pipe.rotation.x = Math.PI / 2;
  put(pipe, cylinder(0xa16207, 2.2, 62, 2.2, { map: tex("wood", 0xa16207, 0x4a2c04, [1, 3]) }), 0, 18, 0);
  put(pipe, cylinder(0x1a0f08, 1, 2, 1, { outline: false }), 0, 49.5, 0);
  arms.right.rotation.x = -1.0;
  arms.rest.right.x = -1.0;
  arms.rest.left.x = -0.5;
  arms.left.rotation.x = -0.5;
  return finishHero(root, state, { face, arms });
}

function buildPawang(hero, state) {
  const { root, head, face } = chibiBase(0xc99468, 0xf1f5f9, 18, 21, { idleMouth: "smile", browColor: 0xd1d5db, browWidth: 0.34 }, tex("cloth", 0xf1f5f9, 0xcbd5e1, [3, 2]));
  put(root, block(0x65a30d, 8, 40, 3, { map: tex("weave", 0x65a30d, 0x3f6212, [1, 4]) }), 0, 30, 14).rotation.z = -0.7;
  put(head, ball(0xe5e7eb, 8, 10, 5), 0, -9, 11);
  put(head, cylinder(0xf8fafc, 16.5, 5, 16.5, { map: tex("cloth", 0xf8fafc, 0xcbd5e1, [3, 1]) }), 0, 10, 0);
  const arms = addArms(root, { skin: 0xc99468, sleeve: 0xf1f5f9, sleeveMap: tex("cloth", 0xf1f5f9, 0xcbd5e1, [1, 2]), x: 21, y: 33, length: 12 });
  // sapu rotan di tangan kiri
  const broom = new THREE.Group();
  put(arms.gripL, broom, 0, 0, 0);
  put(broom, cylinder(0xa16207, 1.8, 62, 1.8, { map: tex("wood", 0xa16207, 0x4a2c04, [1, 3]) }), 0, 14, 0);
  put(broom, cone(0xca8a04, 8, 16, { map: tex("weave", 0xca8a04, 0x854d0e, [2, 1]) }), 0, 46, 0).rotation.x = Math.PI;
  // mangkuk bernyanyi di tangan kanan, diangkat
  const bowl = put(arms.gripR, ball(0xfbbf24, 8, 5, 8, { emissive: 0x92400e, metalness: 0.5 }), 0, -1, 4);
  bowl.scale.y = 0.7;
  arms.right.rotation.x = -0.7;
  arms.rest.right.x = -0.7;
  state.smoke = [];
  for (let index = 0; index < 3; index += 1) {
    const puff = ball(0xe2e8f0, 3, 3, 3, { opacity: 0.6, outline: false });
    root.add(puff);
    state.smoke.push(puff);
  }
  return finishHero(root, state, { face, arms });
}

const HERO_BUILDERS = {
  bastion: buildWarok,
  vanguard: buildGajah,
  shade: buildLeak,
  ember: buildNyiRoro,
  quill: buildDayak,
  lumen: buildPawang,
};

function buildHero(heroId) {
  const hero = getHero(heroId);
  const state = { tongue: null, flames: [], orbs: [], smoke: [], face: null, arms: null, fan: null };
  const model = (HERO_BUILDERS[hero.id] ?? buildWarok)(hero, state);
  const holder = new THREE.Group();
  holder.add(model);
  state.face && (state.face.blinkPhase = Math.random() * 3);
  return { holder, model, state };
}

/**
 * Animasi per frame. `pose` = { speed: 0..1, attack: 0..1, expression }.
 * Lengan berayun saat berjalan, terangkat saat menyerang.
 */
function animateHero(state, time, pose = {}) {
  const speed = pose.speed ?? 0;
  const attack = pose.attack ?? 0;
  if (state.tongue) state.tongue.rotation.z = Math.sin(time * (attack ? 14 : 6)) * 0.25;
  state.flames.forEach((flame, index) => {
    flame.scale.y = 1 + Math.sin(time * 9 + index) * 0.18 + attack * 0.3;
  });
  state.orbs.forEach((orb, index) => {
    const angle = time * (2.2 + attack * 3) + (index / 3) * Math.PI * 2;
    orb.position.set(Math.cos(angle) * 36, 34 + Math.sin(time * 3 + index) * 4, Math.sin(angle) * 36);
  });
  state.smoke.forEach((puff, index) => {
    const phase = (time * 0.6 + index / 3) % 1;
    puff.position.set(26 + Math.sin(phase * 6 + index) * 3, 34 + phase * 26, 10);
    puff.scale.setScalar(0.6 + phase);
  });
  if (state.fan) state.fan.rotation.z = Math.sin(time * 2) * 0.03 + attack * 0.08;

  const arms = state.arms;
  if (arms) {
    const swing = Math.sin(time * 11) * 0.85 * speed;
    const idle = Math.sin(time * 2.4) * 0.07;
    arms.left.rotation.x = arms.rest.left.x + swing + idle;
    arms.right.rotation.x = arms.rest.right.x - swing - idle - attack * 1.5;
    arms.right.rotation.z = arms.rest.right.z - attack * 0.35;
    arms.left.rotation.z = arms.rest.left.z + attack * 0.12;
  }
  setExpression(state.face, pose.expression ?? "idle", time);
}

// ---------------------------------------------------------------- props

function buildPalm() {
  const group = new THREE.Group();
  const trunk = new THREE.Group();
  group.add(trunk);
  for (let index = 0; index < 6; index += 1) {
    const seg = put(trunk, cylinder(0x8a5e38, 5.4 - index * 0.3, 18, 5.4 - index * 0.3, { map: tex("rope", 0x8a5e38, 0x4a2e14, [4, 1]) }), index * 2.2, 9 + index * 17, 0);
    seg.rotation.z = -0.08;
  }
  const crown = put(group, new THREE.Group(), 14, 106, 0);
  for (let index = 0; index < 7; index += 1) {
    const frond = new THREE.Group();
    const leaf = put(frond, block(0x2e7d32, 44, 2, 9), 22, 0, 0);
    leaf.rotation.z = -0.35;
    frond.rotation.y = (index / 7) * Math.PI * 2;
    crown.add(frond);
  }
  put(crown, ball(0x6d4c2a, 5), 0, -5, 3);
  put(crown, ball(0x6d4c2a, 5), 6, -5, -3);
  return group;
}

function buildBamboo(width) {
  const group = new THREE.Group();
  const stalks = Math.max(5, Math.round(width / 11));
  for (let index = 0; index < stalks; index += 1) {
    const h = 60 + (index % 4) * 18;
    const stalk = new THREE.Group();
    const x = (index / (stalks - 1)) * width;
    put(stalk, cylinder(index % 2 ? 0x8bc34a : 0x6aa83a, 3.2, h, 3.2, { map: tex("wood", index % 2 ? 0x8bc34a : 0x6aa83a, 0x3d6b22, [1, 2]) }), 0, h / 2, 0);
    for (let node = 1; node < 4; node += 1) {
      put(stalk, cylinder(0x3d6b22, 3.7, 1.6, 3.7, { outline: false }), 0, (h * node) / 4, 0);
    }
    put(stalk, ball(0x7cb342, 9, 2.2, 3.5, { outline: false }), 6, h, 0);
    stalk.rotation.z = ((index % 3) - 1) * 0.06;
    put(group, stalk, x, 0, (index % 2) * 8);
  }
  return group;
}

function buildWarung() {
  const group = new THREE.Group();
  put(group, block(0x8d5b30, 76, 30, 34, { map: tex("wood", 0x8d5b30, 0x3a2410, [2, 1]) }), 0, 15, 0);
  put(group, block(0xf5deb3, 62, 12, 3, { outline: false }), 0, 22, 18);
  const roof = put(group, new THREE.Group(), 0, 38, 0);
  put(roof, pyramid(0xdc2626, 58, 26, { map: tex("roof", 0xdc2626, 0x7f1d1d, [3, 2]) }), 0, 0, 0).scale.set(58, 26, 36);
  put(group, block(0xf8fafc, 10, 3, 12, { outline: false }), 0, 36, 22);
  return group;
}

function buildCandi() {
  const group = new THREE.Group();
  [[34, 14], [26, 14], [18, 14]].forEach(([r, h], index) => {
    put(group, block(0x8f95a3, r * 2, h, r * 1.7, { map: tex("stone", 0x8f95a3, 0x4b5060, [2, 1]) }), 0, 7 + index * 14, 0);
  });
  put(group, pyramid(0xa7adbb, 14, 28, { map: tex("stone", 0xa7adbb, 0x5b6170, [1, 1]) }), 0, 56, 0);
  return group;
}

function buildTower(team) {
  const group = new THREE.Group();
  const color = TEAM_HEX[team];
  const dark = TEAM_DARK_HEX[team];
  for (const x of [-26, 26]) {
    for (const z of [-18, 18]) {
      put(group, cylinder(0x6e4a26, 4.5, 56, 4.5, { map: tex("wood", 0x6e4a26, 0x2a1608, [1, 2]) }), x, 28, z);
    }
  }
  put(group, block(0xb98b55, 74, 6, 52), 0, 56, 0);
  put(group, block(0xe7d29a, 54, 28, 38, { map: tex("wood", 0xe7d29a, 0x8a7440, [2, 1]) }), 0, 73, 0);
  put(group, block(0x4a3414, 20, 22, 2, { outline: false }), 0, 70, 19.5);
  put(group, pyramid(color, 56, 34, { map: tex("roof", "#" + color.toString(16).padStart(6, "0"), "#" + dark.toString(16).padStart(6, "0"), [3, 2]) }), 0, 106, 0).scale.set(56, 34, 44);
  put(group, ball(dark, 4), 0, 126, 0);
  const lamp = put(group, ball(0xfff1b8, 4, 4, 4, { emissive: 0xffc247, outline: false }), 0, 60, 30);
  group.userData.lamp = lamp;
  return group;
}

function buildNexus(team) {
  const group = new THREE.Group();
  const color = TEAM_HEX[team];
  const dark = TEAM_DARK_HEX[team];
  if (team === TEAM.BLUE) {
    // Muaro Jambi: candi bata merah bertingkat + stupa
    [[66, 18], [52, 18], [38, 18], [24, 16]].forEach(([r, h], index) => {
      const y = [9, 27, 45, 62][index];
      put(group, block(index % 2 ? 0xd9714a : 0xc2603f, r * 2, h, r * 1.75, { map: tex("brick", index % 2 ? 0xd9714a : 0xc2603f, 0x5a2414, [3, 1]) }), 0, y, 0);
      put(group, block(0x7a3a22, r * 2 + 1, 1.8, r * 1.75 + 1, { outline: false }), 0, y + h / 2, 0);
    });
    put(group, block(0x1e0a04, 16, 20, 3, { outline: false }), 0, 14, 59);
    put(group, ball(color, 15, 20, 15, { emissive: dark }), 0, 92, 0);
    put(group, cone(0xf4d35e, 3, 18), 0, 118, 0);
  } else {
    // Kotagede: Joglo di atas platform batu vulkanik
    put(group, block(0x3b3f4a, 140, 12, 120, { map: tex("stone", 0x3b3f4a, 0x1b1d24, [3, 2]) }), 0, 6, 0);
    put(group, block(0x4b5060, 116, 12, 100, { map: tex("stone", 0x4b5060, 0x252835, [3, 2]) }), 0, 18, 0);
    put(group, block(0xf1dfae, 80, 28, 64, { map: tex("wood", 0xf1dfae, 0x8a7440, [3, 1]) }), 0, 38, 0);
    for (const x of [-34, -12, 12, 34]) put(group, cylinder(0x6e4a26, 3.4, 30), x, 38, 33);
    put(group, pyramid(color, 76, 22, { map: tex("roof", "#" + color.toString(16).padStart(6, "0"), "#" + dark.toString(16).padStart(6, "0"), [4, 2]) }), 0, 63, 0).scale.set(76, 22, 62);
    put(group, pyramid(dark, 46, 28), 0, 87, 0).scale.set(46, 28, 38);
    put(group, cone(0xf4d35e, 3, 16), 0, 108, 0);
    // bendera merah-putih
    put(group, cylinder(0x6e4a26, 1, 30), 0, 128, 0);
    put(group, block(0xdc2626, 24, 7, 1.5), 12, 138, 0);
    put(group, block(0xf8fafc, 24, 7, 1.5), 12, 131, 0);
  }
  return group;
}

function buildCover(cover) {
  const group = new THREE.Group();
  const horizontal = cover.w > cover.h;
  const length = horizontal ? cover.w : cover.h;
  const count = Math.floor(length / 18);
  const thickness = horizontal ? cover.h : cover.w;
  const height = 48;
  for (let index = 0; index < count; index += 1) {
    const offset = (index + 0.5) * (length / count) - length / 2;
    const stalk = cylinder(index % 2 ? 0xd8c46a : 0xc9b458, (length / count) * 0.46, height + (index % 3) * 4, (length / count) * 0.46, { map: tex("wood", index % 2 ? 0xd8c46a : 0xc9b458, 0x6e5f22, [1, 2]) });
    stalk.position.set(horizontal ? offset : 0, (height + (index % 3) * 4) / 2, horizontal ? 0 : offset);
    group.add(stalk);
  }
  const band = block(0xc0392b, horizontal ? length : thickness + 1, 8, horizontal ? thickness + 1 : length, { outline: false });
  put(group, band, 0, height * 0.55, 0);
  const white = block(0xf8fafc, horizontal ? length * 0.22 : thickness + 2, 8.4, horizontal ? thickness + 2 : length * 0.22, { outline: false });
  put(group, white, horizontal ? -length * 0.25 : 0, height * 0.55, horizontal ? 0 : -length * 0.25);
  put(group, white.clone(), horizontal ? length * 0.25 : 0, height * 0.55, horizontal ? 0 : length * 0.25);
  return group;
}

function buildMinion(team) {
  const group = new THREE.Group();
  put(group, ball(TEAM_HEX[team], 13, 13, 13), 0, 15, 0);
  put(group, cone(TEAM_DARK_HEX[team], 4, 8, { outline: false }), 0, 32, 0);
  for (const side of [-1, 1]) {
    put(group, ball(0x071a23, 2.4, 3.2, 1.6, { outline: false }), side * 4.4, 17, 11.5);
  }
  return group;
}

// ---------------------------------------------------------------- ground

/** Lukis lantai peta 3 lane: sawah, hutan, sungai Trowulan, jalan lane dan pelataran markas. */
function paintMobaGround(g) {
  const W = ARENA.width;
  const H = ARENA.height;
  const rand = seeded(20261025);

  const grass = g.createLinearGradient(0, 0, W, H);
  grass.addColorStop(0, "#5a9e3a");
  grass.addColorStop(0.5, "#6cb043");
  grass.addColorStop(1, "#4f9238");
  g.fillStyle = grass;
  g.fillRect(0, 0, W, H);

  // petak hutan gelap di antara lane (area jungle)
  for (const [cx, cy, rx, ry] of [
    [W * 0.3, 505, 420, 120], [W * 0.7, 505, 420, 120],
    [W * 0.3, 995, 420, 120], [W * 0.7, 995, 420, 120],
    [W / 2, 505, 220, 90], [W / 2, 995, 220, 90],
  ]) {
    g.fillStyle = "rgba(24, 84, 40, 0.38)";
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
  }

  // sawah terasering di tepi atas & bawah
  for (const [top, bottom] of [[40, 170], [1330, 1460]]) {
    for (let y = top; y < bottom; y += 34) {
      g.fillStyle = ((y - top) / 34) % 2 === 0 ? "rgba(214, 238, 120, 0.24)" : "rgba(34, 94, 38, 0.22)";
      g.beginPath();
      g.roundRect(60, y, W - 120, 30, 12);
      g.fill();
      g.strokeStyle = "rgba(120, 82, 36, 0.35)";
      g.lineWidth = 3;
      g.stroke();
    }
  }

  // sungai Trowulan membelah dua kerajaan
  const river = g.createLinearGradient(W / 2 - 70, 0, W / 2 + 70, 0);
  river.addColorStop(0, "#2f86a8");
  river.addColorStop(0.5, "#5cc0dc");
  river.addColorStop(1, "#2f86a8");
  g.fillStyle = river;
  g.beginPath();
  g.moveTo(W / 2 - 60, 0);
  g.bezierCurveTo(W / 2 - 130, 380, W / 2 + 40, 560, W / 2 - 50, 750);
  g.bezierCurveTo(W / 2 - 130, 940, W / 2 + 40, 1120, W / 2 - 60, H);
  g.lineTo(W / 2 + 60, H);
  g.bezierCurveTo(W / 2 + 150, 1120, W / 2 - 20, 940, W / 2 + 70, 750);
  g.bezierCurveTo(W / 2 + 150, 560, W / 2 - 20, 380, W / 2 + 60, 0);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(255,255,255,0.28)";
  g.lineWidth = 3;
  g.setLineDash([16, 22]);
  g.stroke();
  g.setLineDash([]);

  // jalan lane (tanah), tiga jalur dari markas ke markas
  for (const lane of LANE_IDS) {
    const path = LANES[lane][0];
    g.lineCap = "round";
    g.lineJoin = "round";
    for (const [width, color] of [[200, "#8c6234"], [178, "#c9a066"], [120, "#d8b47c"]]) {
      g.strokeStyle = color;
      g.lineWidth = width;
      g.beginPath();
      path.forEach((point, index) => (index === 0 ? g.moveTo(point.x, point.y) : g.lineTo(point.x, point.y)));
      g.stroke();
    }
  }
  g.fillStyle = "rgba(92, 58, 24, 0.18)";
  for (let i = 0; i < 220; i += 1) {
    g.beginPath();
    g.ellipse(120 + rand() * (W - 240), 120 + rand() * (H - 240), 4 + rand() * 7, 3 + rand() * 4, 0, 0, Math.PI * 2);
    g.fill();
  }

  // pelataran markas: bata merah Muaro Jambi (kiri) dan batu vulkanik Kotagede (kanan)
  NEXUS.forEach((nexus, team) => {
    const plaza = g.createRadialGradient(nexus.x, nexus.y, 40, nexus.x, nexus.y, 300);
    plaza.addColorStop(0, team === 0 ? "#b96a48" : "#59606e");
    plaza.addColorStop(0.75, team === 0 ? "#8e4a30" : "#3c424e");
    plaza.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = plaza;
    g.beginPath();
    g.arc(nexus.x, nexus.y, 300, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = team === 0 ? "rgba(69,195,255,0.6)" : "rgba(255,93,125,0.6)";
    g.lineWidth = 5;
    g.setLineDash([16, 14]);
    g.beginPath();
    g.arc(nexus.x, nexus.y, 250, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
  });

  // jembatan kayu di tiap lane yang menyeberangi sungai
  for (const laneY of [260, 750, 1240]) {
    g.fillStyle = "#8d6a3f";
    g.strokeStyle = "#041018";
    g.lineWidth = 4;
    g.beginPath();
    g.roundRect(W / 2 - 100, laneY - 105, 200, 210, 10);
    g.fill();
    g.stroke();
    g.strokeStyle = "rgba(50, 28, 8, 0.55)";
    g.lineWidth = 2;
    for (let x = W / 2 - 84; x < W / 2 + 96; x += 18) {
      g.beginPath();
      g.moveTo(x, laneY - 100);
      g.lineTo(x, laneY + 100);
      g.stroke();
    }
  }

  // alun-alun fisika di tengah (zona Physics Clash)
  g.strokeStyle = "rgba(255,255,255,0.22)";
  g.lineWidth = 3;
  g.setLineDash([10, 14]);
  g.beginPath();
  g.arc(W / 2, H / 2, 205, 0, Math.PI * 2);
  g.stroke();
  g.setLineDash([]);

  // rumpun padi & bunga
  for (let i = 0; i < 140; i += 1) {
    const x = 80 + rand() * (W - 160);
    const y = 80 + rand() * (H - 160);
    g.strokeStyle = "rgba(230, 206, 80, 0.7)";
    g.lineWidth = 2;
    for (const lean of [-0.5, 0, 0.5]) {
      g.beginPath();
      g.moveTo(x, y + 6);
      g.quadraticCurveTo(x + lean * 6, y - 2, x + lean * 12, y - 10);
      g.stroke();
    }
  }
  for (let i = 0; i < 70; i += 1) {
    g.fillStyle = rand() > 0.5 ? "rgba(255, 227, 109, 0.5)" : "rgba(249, 168, 212, 0.5)";
    const x = 100 + rand() * (W - 200);
    const y = 100 + rand() * (H - 200);
    for (let petal = 0; petal < 4; petal += 1) {
      g.beginPath();
      g.arc(x + Math.cos((petal / 4) * Math.PI * 2) * 4, y + Math.sin((petal / 4) * Math.PI * 2) * 4, 3.4, 0, Math.PI * 2);
      g.fill();
    }
  }

  // nama lane & wilayah
  g.save();
  g.fillStyle = "rgba(255, 248, 220, 0.3)";
  g.font = '700 30px "Trebuchet MS", sans-serif';
  g.textAlign = "center";
  g.fillText("SELAT MALAKA", W * 0.3, 252);
  g.fillText("SELAT MALAKA", W * 0.7, 252);
  g.fillText("JALAN RAYA POS", W * 0.3, 742);
  g.fillText("JALAN RAYA POS", W * 0.7, 742);
  g.fillText("JALUR SUTRA MARITIM", W * 0.3, 1232);
  g.fillText("JALUR SUTRA MARITIM", W * 0.7, 1232);
  g.font = '700 22px "Trebuchet MS", sans-serif';
  g.fillText("PELABUHAN MUARO JAMBI", NEXUS[0].x + 60, NEXUS[0].y + 275);
  g.fillText("BENTENG KOTAGEDE", NEXUS[1].x - 60, NEXUS[1].y + 275);
  g.fillText("KAMPUNG PAGARUYUNG", W * 0.3, 540);
  g.fillText("LEMBAH DIENG", W * 0.7, 540);
  g.fillText("HUTAN WAY KAMBAS", W * 0.3, 1000);
  g.fillText("ALAS PURWO", W * 0.7, 1000);
  g.fillText("ALUN-ALUN FISIKA", W / 2, H / 2 + 6);
  g.restore();
}

// ---------------------------------------------------------------- renderer

export function isWebGLAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export class ArenaRenderer3D extends ArenaRenderer {
  constructor(canvas) {
    super(canvas);
    this.is3d = true;
    this.glCanvas = document.createElement("canvas");
    this.glCanvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
    canvas.parentElement.insertBefore(this.glCanvas, canvas);

    // HP/tablet (pointer kasar): tanpa MSAA, bayangan lebih kecil, resolusi dibatasi
    this.lowPower =
      Boolean(window.matchMedia?.("(pointer: coarse)").matches) || new URLSearchParams(location.search).has("phone");
    this.gl = new THREE.WebGLRenderer({
      canvas: this.glCanvas,
      antialias: !this.lowPower,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.gl.outputColorSpace = THREE.SRGBColorSpace;
    this.gl.setClearColor(0x061a24, 1);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 50, 6000);
    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.heroes = new Map();
    this.minions = new Map();
    this.covers = [];
    this.towers = new Map();
    this.nexuses = new Map();
    this.facing = new Map();
    this.cameraDistance = 2200;
    this.vec = new THREE.Vector3();

    this.buildWorld();
    this.resize();
  }

  buildWorld() {
    const scene = this.scene;
    scene.fog = new THREE.Fog(0x061a24, 2600, 5200);

    scene.add(new THREE.HemisphereLight(0xfff4dc, 0x3b6b3a, 1.15));
    const sun = new THREE.DirectionalLight(0xfff0cf, 2.0);
    sun.position.set(ARENA.width * 0.2, 1100, ARENA.height * 1.3);
    sun.target.position.set(ARENA.width / 2, 0, ARENA.height / 2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(this.lowPower ? 1024 : 2048, this.lowPower ? 1024 : 2048);
    this.sun = sun;
    const cam = sun.shadow.camera;
    cam.left = -1000;
    cam.right = 1000;
    cam.top = 750;
    cam.bottom = -750;
    cam.near = 200;
    cam.far = 3000;
    sun.shadow.bias = -0.0004;
    scene.add(sun, sun.target);

    // lantai: tekstur dari lukisan 2D (sawah, jalan, sungai, alun-alun)
    const groundCanvas = document.createElement("canvas");
    groundCanvas.width = ARENA.width * GROUND_SCALE;
    groundCanvas.height = ARENA.height * GROUND_SCALE;
    const gctx = groundCanvas.getContext("2d");
    gctx.scale(GROUND_SCALE, GROUND_SCALE);
    paintMobaGround(gctx);
    const texture = new THREE.CanvasTexture(groundCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(ARENA.width, ARENA.height),
      new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(ARENA.width / 2, 0, ARENA.height / 2);
    ground.receiveShadow = true;
    scene.add(ground);

    // tebing sekeliling arena
    const rim = new THREE.Mesh(
      new THREE.BoxGeometry(ARENA.width + 3200, 30, ARENA.height + 3200),
      new THREE.MeshStandardMaterial({ color: 0x2a5c32, roughness: 1 }),
    );
    rim.position.set(ARENA.width / 2, -16, ARENA.height / 2);
    scene.add(rim);

    // dekorasi tetap
    const W2 = ARENA.width;
    const prop = (object, x, y, rotation = 0, scale = 1) => {
      object.position.set(x, 0, y);
      object.rotation.y = rotation;
      object.scale.multiplyScalar(scale);
      scene.add(object);
      return object;
    };
    const palms = [
      [90, 90], [W2 - 90, 90], [90, ARENA.height - 90], [W2 - 90, ARENA.height - 90],
      [600, 150], [1000, 130], [1600, 130], [2000, 150], [600, 1350], [1000, 1370], [1600, 1370], [2000, 1350],
      [520, 540], [2080, 540], [520, 960], [2080, 960], [1180, 560], [1420, 940],
    ];
    palms.forEach(([x, y], index) => prop(buildPalm(), x, y, index % 2 ? Math.PI : 0));
    const bamboos = [
      [700, 560, 110], [1850, 560, 110], [700, 940, 110], [1850, 940, 110],
      [1050, 600, 80], [1470, 880, 80], [330, 420, 90], [2180, 1030, 90], [330, 1080, 90], [2180, 420, 90],
    ];
    for (const [x, y, w] of bamboos) prop(buildBamboo(w), x, y);
    for (const [x, y, rot] of [[470, 180, 0], [2130, 180, Math.PI], [470, 1320, 0], [2130, 1320, Math.PI]]) {
      prop(buildWarung(), x, y, rot);
    }
    for (const [x, y] of [[1300, 130], [1300, 1370], [880, 620], [1720, 880]]) prop(buildCandi(), x, y);
  }

  ensureCovers(state) {
    if (this.covers.length === (state.covers ?? []).length && this.covers.length) return;
    for (const entry of this.covers) this.scene.remove(entry.group);
    this.covers = (state.covers ?? []).map((cover) => {
      const group = buildCover(cover);
      group.position.set(cover.x + cover.w / 2, 0, cover.y + cover.h / 2);
      this.scene.add(group);
      return { group, alive: true };
    });
  }

  resize() {
    super.resize();
    if (!this.gl) return;
    const { width, height, dpr } = this.transform;
    this.gl.setPixelRatio(this.lowPower ? Math.min(dpr, 1.5) : dpr);
    this.gl.setSize(width, height, false);
    this.viewWidth = width < 1000 ? 1250 : VIEW_WIDTH;
    this.viewDepth = this.viewWidth * (VIEW_DEPTH / VIEW_WIDTH);
    this.camera.aspect = width / height;
    this.fitCamera();
  }

  /** Mundurkan kamera sampai seluruh arena terlihat di layar. */
  /** Hitung jarak kamera agar area pandang VIEW_WIDTH x VIEW_DEPTH muat di layar. */
  fitCamera() {
    const tilt = THREE.MathUtils.degToRad(52);
    const center = new THREE.Vector3(ARENA.width / 2, 0, ARENA.height / 2);
    const halfW = (this.viewWidth ?? VIEW_WIDTH) / 2;
    const halfD = (this.viewDepth ?? VIEW_DEPTH) / 2;
    const corners = [[-halfW, -halfD], [halfW, -halfD], [-halfW, halfD], [halfW, halfD]].map(
      ([x, z]) => new THREE.Vector3(center.x + x, 0, center.z + z),
    );
    let lo = 400;
    let hi = 6000;
    for (let step = 0; step < 18; step += 1) {
      const mid = (lo + hi) / 2;
      this.placeCamera(center, tilt, mid);
      const fits = corners.every((corner) => {
        const p = corner.clone().project(this.camera);
        return Math.abs(p.x) <= 0.97 && Math.abs(p.y) <= 0.95;
      });
      if (fits) hi = mid;
      else lo = mid;
    }
    this.cameraDistance = hi;
    this.cameraTilt = tilt;
    this.cameraCenter = this.cameraCenter ?? center.clone();
    this.placeCamera(this.cameraCenter, tilt, hi);
  }


  placeCamera(center, tilt, distance, jitter = 0) {
    this.camera.position.set(
      center.x + (Math.random() - 0.5) * jitter,
      Math.sin(tilt) * distance + (Math.random() - 0.5) * jitter,
      center.z + Math.cos(tilt) * distance,
    );
    this.camera.lookAt(center);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
  }

  // ------------------------------------------------------------ projection

  project(x, y, z = 0) {
    this.vec.set(x, z, y).project(this.camera);
    const { width, height } = this.transform;
    return { x: (this.vec.x * 0.5 + 0.5) * width, y: (-this.vec.y * 0.5 + 0.5) * height };
  }

  screenToWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -(((clientY - rect.top) / rect.height) * 2 - 1),
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, hit)) return { x: ARENA.width / 2, y: ARENA.height / 2 };
    return { x: clamp(hit.x, 0, ARENA.width), y: clamp(hit.z, 0, ARENA.height) };
  }

  /** Pasang ctx di titik dunia dengan jacobian bidang tanah (lingkaran jadi elips). */
  place(ctx, x, y, z = 0) {
    const origin = this.project(x, y, z);
    const ground = this.project(x, y, 0);
    const px = this.project(x + 1, y, 0);
    const py = this.project(x, y + 1, 0);
    ctx.transform(px.x - ground.x, px.y - ground.y, py.x - ground.x, py.y - ground.y, origin.x, origin.y);
  }

  /** Pasang ctx sebagai papan tegak (bar HP, nama) dengan skala perspektif. */
  billboard(ctx, x, y, z = 0) {
    const origin = this.project(x, y, z);
    const side = this.project(x + 1, y, z);
    const k = Math.max(0.2, Math.hypot(side.x - origin.x, side.y - origin.y));
    ctx.transform(k, 0, 0, k, origin.x, origin.y);
  }

  // ------------------------------------------------------------ sync scene

  syncScene(now) {
    const state = this.state;
    const time = now * 0.001;
    this.ensureCovers(state);

    (state.covers ?? []).forEach((cover, index) => {
      const entry = this.covers[index];
      if (!entry) return;
      entry.group.visible = cover.alive;
      const ratio = clamp(cover.hp / cover.maxHp, 0, 1);
      entry.group.scale.y = 0.55 + 0.45 * ratio;
    });

    for (const structure of [...(state.towers ?? [])]) {
      const key = structure.id;
      let entry = this.towers.get(key);
      if (!entry) {
        entry = buildTower(structure.team);
        entry.scale.setScalar(TOWER_VISUAL_SCALE);
        entry.position.set(structure.x, 0, structure.y);
        this.scene.add(entry);
        this.towers.set(key, entry);
      }
      entry.visible = structure.alive;
    }
    for (const nexus of state.nexuses ?? []) {
      const key = `${nexus.team}`;
      let entry = this.nexuses.get(key);
      if (!entry) {
        entry = buildNexus(nexus.team);
        entry.position.set(nexus.x, 0, nexus.y);
        entry.rotation.y = nexus.team === TEAM.BLUE ? Math.PI / 2 : -Math.PI / 2;
        this.scene.add(entry);
        this.nexuses.set(key, entry);
      }
      entry.visible = nexus.alive;
      entry.scale.setScalar(1 + Math.sin(time * 3 + nexus.team) * 0.012);
    }

    const seenMinions = new Set();
    for (const minion of state.minions ?? []) {
      seenMinions.add(minion.id);
      let entry = this.minions.get(minion.id);
      if (!entry) {
        entry = buildMinion(minion.team);
        entry.scale.setScalar(MINION_VISUAL_SCALE);
        this.scene.add(entry);
        this.minions.set(minion.id, entry);
      }
      const smooth = this.smooth.get(`m:${minion.id}`);
      entry.position.set(smooth?.x ?? minion.x, Math.abs(Math.sin(time * 6 + minion.id * 1.3)) * 3, smooth?.y ?? minion.y);
      entry.rotation.y = minion.team === TEAM.BLUE ? Math.PI / 2 : -Math.PI / 2;
    }
    for (const [id, entry] of this.minions) {
      if (!seenMinions.has(id)) {
        this.scene.remove(entry);
        this.minions.delete(id);
      }
    }

    const seenHeroes = new Set();
    for (const player of state.players ?? []) {
      seenHeroes.add(player.id);
      let entry = this.heroes.get(player.id);
      if (!entry || entry.heroId !== player.heroId) {
        if (entry) this.scene.remove(entry.holder);
        const built = buildHero(player.heroId);
        entry = { ...built, heroId: player.heroId };
        this.scene.add(entry.holder);
        this.heroes.set(player.id, entry);
      }
      const smooth = this.smooth.get(`p:${player.id}`);
      const x = smooth?.x ?? player.x;
      const y = smooth?.y ?? player.y;
      entry.holder.visible = player.alive;
      entry.holder.position.set(x, 0, y);

      // arah hadap: ke kursor untuk diri sendiri, ke arah gerak untuk lainnya
      let target = this.facing.get(player.id) ?? (player.slot === 0 ? Math.PI / 2 : -Math.PI / 2);
      if (player.id === this.selfId) {
        target = Math.atan2(this.pointer.x - x, this.pointer.y - y);
      } else if (Math.hypot(player.vx, player.vy) > 25) {
        target = Math.atan2(player.vx, player.vy);
      }
      // wajah sebagian menghadap kamera agar tetap terbaca dari sudut miring
      this.facing.set(player.id, target);
      target = Math.atan2(Math.sin(target) * 0.55, Math.cos(target) * 0.55 + 0.85);
      const current = entry.holder.rotation.y;
      let delta = target - current;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      entry.holder.rotation.y = current + delta * 0.25;

      const scale = (player.radius / 24) * HERO_VISUAL_SCALE;
      const bob = Math.sin(time * 4 + player.slot) * 1.2;
      entry.model.position.y = bob;
      entry.holder.scale.setScalar(scale);

      // ekspresi & gerak tangan mengikuti kejadian: terkena hit, menembak, ultimate
      const prev = entry.prev;
      if (prev) {
        if (player.hp < prev.hp - 0.5) entry.hurtUntil = now + 380;
        if (player.ammo < prev.ammo) entry.attackUntil = now + 320;
        if (player.super < prev.super - 40) entry.shoutUntil = now + 900;
      }
      entry.prev = { hp: player.hp, ammo: player.ammo, super: player.super };
      let expression = "idle";
      if (now < (entry.hurtUntil ?? 0)) expression = "hurt";
      else if (now < (entry.shoutUntil ?? 0) || now < (entry.attackUntil ?? 0)) expression = "angry";
      else if (player.hp < player.maxHp * 0.3) expression = "worried";
      else if (player.edge) expression = "happy";
      const attack = now < (entry.shoutUntil ?? 0) ? 1 : clamp(((entry.attackUntil ?? 0) - now) / 320, 0, 1);
      const speed = clamp(Math.hypot(player.vx, player.vy) / 260, 0, 1);
      animateHero(entry.state, time, { speed, attack, expression });
    }
    for (const [id, entry] of this.heroes) {
      if (!seenHeroes.has(id)) {
        this.scene.remove(entry.holder);
        this.heroes.delete(id);
      }
    }
  }

  // ------------------------------------------------------------ render

  render(now = performance.now()) {
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    const ctx = this.ctx;
    const { width, height, dpr } = this.transform;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (!this.state) {
      this.gl.setClearColor(0x061a24, 1);
      this.gl.clear();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = '700 13px "Trebuchet MS", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("Menyiapkan arena...", width / 2, height / 2);
      return;
    }

    for (const point of this.smooth.values()) {
      const factor = 1 - Math.exp(-dt * 18);
      point.x += (point.targetX - point.x) * factor;
      point.y += (point.targetY - point.y) * factor;
    }

    // kamera mengikuti hero sendiri, dijepit agar tepi peta tidak keluar layar
    const self = this.getSelf();
    const selfPoint = self ? this.smooth.get(`p:${self.id}`) : null;
    const halfW = (this.viewWidth ?? VIEW_WIDTH) / 2 + 30;
    const halfD = (this.viewDepth ?? VIEW_DEPTH) / 2 - 20;
    const targetX = clamp(selfPoint?.x ?? self?.x ?? ARENA.width / 2, halfW, ARENA.width - halfW);
    const targetZ = clamp((selfPoint?.y ?? self?.y ?? ARENA.height / 2) + 60, halfD, ARENA.height - halfD);
    if (!this.focusReady) {
      this.cameraCenter.set(targetX, 0, targetZ);
      this.focusReady = Boolean(self);
    } else {
      const follow = 1 - Math.exp(-dt * 7);
      this.cameraCenter.x += (targetX - this.cameraCenter.x) * follow;
      this.cameraCenter.z += (targetZ - this.cameraCenter.z) * follow;
    }
    this.sun.position.set(this.cameraCenter.x + 520, 1100, this.cameraCenter.z + 900);
    this.sun.target.position.set(this.cameraCenter.x, 0, this.cameraCenter.z);

    this.placeCamera(this.cameraCenter, this.cameraTilt, this.cameraDistance, this.getShake() * 0.8);
    this.syncScene(now);
    this.gl.render(this.scene, this.camera);

    // lapisan 2D di atas: zona Clash, proyektil, efek, bidik, bar HP, minimap
    this.drawClashZone(ctx, now);
    this.drawProjectiles(ctx, now);
    this.drawEffects(ctx, now);
    this.drawAim(ctx, now);
    this.drawPings(ctx, now);
    this.drawStructureBars(ctx);
    this.drawPlayers(ctx, now);
    this.drawMinimap(ctx);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setPings(list) {
    this.pings = list;
  }

  /** Titik dunia dari ketukan di minimap, atau null bila di luar peta. */
  minimapToWorld(clientX, clientY) {
    this.minimapSlot = this.minimapSlot ?? document.getElementById("minimapSlot");
    const slot = this.minimapSlot?.getBoundingClientRect();
    if (!slot) return null;
    const mapW = Math.max(100, slot.width - 10);
    const mapH = (mapW * ARENA.height) / ARENA.width;
    const x0 = slot.left + 5;
    const y0 = slot.top + 5;
    if (clientX < x0 || clientX > x0 + mapW || clientY < y0 || clientY > y0 + mapH) return null;
    return {
      x: ((clientX - x0) / mapW) * ARENA.width,
      y: ((clientY - y0) / mapH) * ARENA.height,
    };
  }

  drawPings(ctx, now) {
    const pings = (this.pings ?? []).filter((ping) => ping.expires > now);
    if (pings.length === 0) return;
    const dpr = this.transform.dpr;
    for (const ping of pings) {
      const color = ping.kind === "danger" ? "#ff5d7d" : "#4df0c2";
      const pulse = (now % 900) / 900;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.place(ctx, ping.x, ping.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.globalAlpha = 1 - pulse;
      ctx.beginPath();
      ctx.arc(0, 0, 50 + pulse * 90, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, 38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.billboard(ctx, ping.x, ping.y, 90);
      ctx.fillStyle = "rgba(4, 19, 29, 0.85)";
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-58, -16, 116, 30, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = '700 13px "Trebuchet MS", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(ping.kind === "danger" ? "BAHAYA!" : "AYO KE SINI", 0, 4);
      ctx.fillStyle = "#ffffff";
      ctx.font = '700 9px "Trebuchet MS", sans-serif';
      ctx.fillText(ping.name, 0, 24);
      ctx.restore();
    }
  }

  drawMinimap(ctx) {
    const state = this.state;
    const { width, height, dpr } = this.transform;
    this.minimapSlot = this.minimapSlot ?? document.getElementById("minimapSlot");
    const slot = this.minimapSlot?.getBoundingClientRect();
    const mapW = Math.max(100, (slot?.width ?? 180) - 10);
    const mapH = (mapW * ARENA.height) / ARENA.width;
    const x0 = (slot?.left ?? 14) + 5;
    const y0 = (slot?.top ?? 14) + 5;
    if (Math.abs(mapH + 18 - (this.lastMinimapHeight ?? 0)) > 1) {
      this.lastMinimapHeight = mapH + 18;
      document.documentElement.style.setProperty("--mm-bottom", `${Math.round(mapH + 18)}px`);
    }
    const sx = mapW / ARENA.width;
    const sy = mapH / ARENA.height;
    const px = (x) => x0 + x * sx;
    const py = (y) => y0 + y * sy;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "rgba(4, 22, 18, 0.78)";
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x0 - 5, y0 - 5, mapW + 10, mapH + 10, 8);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(x0, y0, mapW, mapH, 5);
    ctx.clip();
    ctx.fillStyle = "#3f7d34";
    ctx.fillRect(x0, y0, mapW, mapH);

    // sungai & lane
    ctx.strokeStyle = "#4aa8c8";
    ctx.lineWidth = Math.max(3, mapW * 0.03);
    ctx.beginPath();
    ctx.moveTo(px(ARENA.width / 2), y0);
    ctx.lineTo(px(ARENA.width / 2), y0 + mapH);
    ctx.stroke();
    ctx.strokeStyle = "#d0a468";
    ctx.lineWidth = Math.max(3, mapW * 0.025);
    ctx.lineJoin = "round";
    for (const lane of LANE_IDS) {
      ctx.beginPath();
      LANES[lane][0].forEach((point, index) => (index === 0 ? ctx.moveTo(px(point.x), py(point.y)) : ctx.lineTo(px(point.x), py(point.y))));
      ctx.stroke();
    }

    for (const tower of state.towers ?? []) {
      if (!tower.alive) continue;
      ctx.fillStyle = TEAM_COLORS[tower.team];
      ctx.fillRect(px(tower.x) - 2.5, py(tower.y) - 2.5, 5, 5);
    }
    for (const nexus of state.nexuses ?? []) {
      if (!nexus.alive) continue;
      ctx.fillStyle = TEAM_COLORS[nexus.team];
      ctx.beginPath();
      ctx.arc(px(nexus.x), py(nexus.y), 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#041018";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    for (const minion of state.minions ?? []) {
      ctx.fillStyle = TEAM_COLORS[minion.team];
      ctx.globalAlpha = 0.7;
      ctx.fillRect(px(minion.x) - 1, py(minion.y) - 1, 2, 2);
    }
    ctx.globalAlpha = 1;
    for (const player of state.players ?? []) {
      if (!player.alive) continue;
      const mine = player.id === this.selfId;
      ctx.fillStyle = TEAM_COLORS[player.slot];
      ctx.strokeStyle = mine ? "#ffe36d" : "#041018";
      ctx.lineWidth = mine ? 2 : 1.2;
      ctx.beginPath();
      ctx.arc(px(player.x), py(player.y), mine ? 4.6 : 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    for (const ping of (this.pings ?? []).filter((item) => item.expires > performance.now())) {
      const pulse = (performance.now() % 900) / 900;
      ctx.strokeStyle = ping.kind === "danger" ? "#ff5d7d" : "#4df0c2";
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 1 - pulse * 0.7;
      ctx.beginPath();
      ctx.arc(px(ping.x), py(ping.y), 4 + pulse * 10, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // bingkai area pandang kamera
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px(this.cameraCenter.x - (this.viewWidth ?? VIEW_WIDTH) / 2), py(this.cameraCenter.z - (this.viewDepth ?? VIEW_DEPTH) / 2), (this.viewWidth ?? VIEW_WIDTH) * sx, (this.viewDepth ?? VIEW_DEPTH) * sy);
    ctx.restore();
  }


  drawClashZone(ctx, now) {
    if (!this.state.clash) return;
    ctx.save();
    ctx.setTransform(this.transform.dpr, 0, 0, this.transform.dpr, 0, 0);
    this.place(ctx, ARENA.width / 2, ARENA.height / 2);
    ctx.strokeStyle = "rgba(255, 224, 96, 0.8)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, 205, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.16 + Math.sin(now * 0.006) * 0.06;
    ctx.fillStyle = "#ffe36d";
    ctx.fill();
    ctx.restore();
  }

  drawStructureBars(ctx) {
    const dpr = this.transform.dpr;
    const bar = (x, y, z, width, hp, maxHp, color) => {
      if (hp >= maxHp) return;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.billboard(ctx, x, y, z);
      this.drawHealthBar(ctx, 0, 0, width, hp, maxHp, 0, color);
      ctx.restore();
    };
    for (const tower of this.state.towers ?? []) {
      if (tower.alive) bar(tower.x, tower.y, 150 * TOWER_VISUAL_SCALE, 92, tower.hp, tower.maxHp, TEAM_COLORS[tower.team]);
    }
    for (const nexus of this.state.nexuses ?? []) {
      if (!nexus.alive) continue;
      bar(nexus.x, nexus.y, 185, 118, nexus.hp, nexus.maxHp, TEAM_COLORS[nexus.team]);
      if (nexus.protected) {
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.place(ctx, nexus.x, nexus.y);
        ctx.strokeStyle = "rgba(255, 224, 96, 0.72)";
        ctx.lineWidth = 3;
        ctx.setLineDash([9, 9]);
        ctx.beginPath();
        ctx.arc(0, 0, 104, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    for (const minion of this.state.minions ?? []) {
      if (minion.hp >= minion.maxHp) continue;
      const smooth = this.smooth.get(`m:${minion.id}`);
      bar(smooth?.x ?? minion.x, smooth?.y ?? minion.y, 44 * MINION_VISUAL_SCALE, 32, minion.hp, minion.maxHp, TEAM_COLORS[minion.team]);
    }
    for (const cover of this.state.covers ?? []) {
      if (!cover.alive || cover.hp >= cover.maxHp) continue;
      bar(cover.x + cover.w / 2, cover.y + cover.h / 2, 70, Math.min(cover.w, 80), cover.hp, cover.maxHp, "#d7f99a");
    }
  }

  drawPlayers(ctx, now) {
    const dpr = this.transform.dpr;
    for (const player of this.state.players ?? []) {
      const smooth = this.smooth.get(`p:${player.id}`);
      const x = smooth?.x ?? player.x;
      const y = smooth?.y ?? player.y;
      const hero = getHero(player.heroId);
      const teamColor = TEAM_COLORS[player.slot];

      // cincin di tanah
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.place(ctx, x, y);
      if (!player.alive) {
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = teamColor;
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 7]);
        ctx.beginPath();
        ctx.arc(0, 0, player.radius + 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.billboard(ctx, x, y, 20);
        ctx.fillStyle = teamColor;
        ctx.font = '700 16px "Trebuchet MS", sans-serif';
        ctx.textAlign = "center";
        ctx.fillText(`${Math.ceil(player.respawnIn / 1000)}`, 0, 0);
        ctx.restore();
        continue;
      }
      ctx.strokeStyle = teamColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, player.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = teamColor;
      ctx.fill();
      ctx.globalAlpha = 1;
      if (player.edge) {
        ctx.strokeStyle = "#ffe36d";
        ctx.lineWidth = 3;
        ctx.setLineDash([7, 7]);
        ctx.beginPath();
        ctx.arc(0, 0, player.radius + 17 + Math.sin(now * 0.006) * 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (player.slowed) {
        ctx.fillStyle = "rgba(69, 195, 255, 0.22)";
        ctx.beginPath();
        ctx.arc(0, 0, player.radius * 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (player.shielded || player.shield > 0) {
        ctx.strokeStyle = "rgba(166, 238, 255, 0.85)";
        ctx.fillStyle = "rgba(122, 220, 255, 0.16)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, player.radius + 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      if (player.reflect) {
        ctx.strokeStyle = "#d8f8ff";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 7]);
        ctx.beginPath();
        ctx.arc(0, 0, player.radius + 20, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // bar HP, level, nama di atas kepala
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const lift = 92 * (player.radius / 24) * HERO_VISUAL_SCALE;
      this.billboard(ctx, x, y, lift);
      const barWidth = 76;
      this.drawHealthBar(ctx, 0, -8, barWidth, player.hp, player.maxHp, player.shield, hero.color);
      ctx.fillStyle = "rgba(3, 16, 24, 0.72)";
      ctx.beginPath();
      ctx.roundRect(-barWidth / 2 - 12, -22, 24, 15, 5);
      ctx.fill();
      ctx.fillStyle = "#ffe36d";
      ctx.font = '700 8px "Trebuchet MS", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(`${player.level}`, -barWidth / 2, -11);
      ctx.fillStyle = player.id === this.selfId ? "#ffe36d" : "rgba(255,255,255,0.8)";
      ctx.font = '700 10px "Trebuchet MS", sans-serif';
      ctx.fillText(player.id === this.selfId ? `${player.name} / YOU` : player.name, 0, -28);
      if (player.id === this.selfId) {
        const bob = Math.sin(now * 0.006) * 3;
        ctx.fillStyle = "#ffe36d";
        ctx.beginPath();
        ctx.moveTo(0, -38 + bob);
        ctx.lineTo(-7, -49 + bob);
        ctx.lineTo(7, -49 + bob);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawAim(ctx) {
    const self = this.getSelf();
    if (!self || !self.alive || this.state.status !== "playing") return;
    const smooth = this.smooth.get(`p:${self.id}`);
    const x = smooth?.x ?? self.x;
    const y = smooth?.y ?? self.y;
    const dx = this.pointer.x - x;
    const dy = this.pointer.y - y;
    const distance = Math.hypot(dx, dy);
    if (distance < 4) return;
    const end = Math.min(distance, this.aimActive ? 520 : 430);
    const start = 26;
    const from = this.project(x + (dx / distance) * start, y + (dy / distance) * start, 1);
    const to = this.project(x + (dx / distance) * end, y + (dy / distance) * end, 1);

    ctx.save();
    ctx.setTransform(this.transform.dpr, 0, 0, this.transform.dpr, 0, 0);
    ctx.strokeStyle = this.aimActive ? "rgba(255, 226, 90, 0.95)" : "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = this.aimActive ? 6 : 2.5;
    ctx.setLineDash(this.aimActive ? [] : [8, 10]);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    ctx.save();
    ctx.setTransform(this.transform.dpr, 0, 0, this.transform.dpr, 0, 0);
    this.place(ctx, this.pointer.x, this.pointer.y);
    ctx.strokeStyle = "rgba(255, 246, 210, 0.9)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ffe36d";
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}


// ---------------------------------------------------------------- portraits (lobby)

let portrait = null;

function getPortrait() {
  if (portrait) return portrait;
  const canvas = document.createElement("canvas");
  const gl = new THREE.WebGLRenderer({ canvas, antialias: !window.matchMedia?.("(pointer: coarse)").matches, alpha: true });
  gl.setClearColor(0x000000, 0);
  gl.outputColorSpace = THREE.SRGBColorSpace;
  gl.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff4dc, 0x6b5a7a, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(120, 260, 220);
  key.castShadow = true;
  key.shadow.mapSize.set(512, 512);
  key.shadow.camera.left = -90;
  key.shadow.camera.right = 90;
  key.shadow.camera.top = 90;
  key.shadow.camera.bottom = -90;
  key.shadow.camera.near = 50;
  key.shadow.camera.far = 600;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9ad8ff, 0.9);
  rim.position.set(-200, 120, -160);
  scene.add(rim);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 40), new THREE.ShadowMaterial({ opacity: 0.35 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const camera = new THREE.PerspectiveCamera(26, 1, 20, 2000);
  portrait = { canvas, gl, scene, camera, heroes: new Map(), width: 0, height: 0 };
  return portrait;
}

/** Potret hero 3D untuk lobby/hasil; tanda tangan sama dengan drawHeroPortrait 2D. */
export function drawHeroPortrait3D(target, heroId, time, options = {}) {
  let studio;
  try {
    studio = getPortrait();
  } catch {
    drawHeroPortrait(target, heroId, time, options);
    return;
  }
  const ctx = target.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = target.getBoundingClientRect();
  const width = rect.width || target.width;
  const height = rect.height || target.height;
  const pixelW = Math.max(1, Math.round(width * dpr));
  const pixelH = Math.max(1, Math.round(height * dpr));
  if (target.width !== pixelW || target.height !== pixelH) {
    target.width = pixelW;
    target.height = pixelH;
  }
  if (studio.width !== pixelW || studio.height !== pixelH) {
    studio.gl.setPixelRatio(1);
    studio.gl.setSize(pixelW, pixelH, false);
    studio.camera.aspect = pixelW / pixelH;
    studio.camera.updateProjectionMatrix();
    studio.width = pixelW;
    studio.height = pixelH;
  }

  const hero = getHero(heroId);
  let entry = studio.heroes.get(hero.id);
  if (!entry) {
    entry = buildHero(hero.id);
    entry.holder.visible = false;
    studio.scene.add(entry.holder);
    studio.heroes.set(hero.id, entry);
  }
  for (const other of studio.heroes.values()) other.holder.visible = other === entry;

  const seconds = time * 0.001;
  const scale = options.scale ?? 1;
  entry.holder.scale.setScalar(scale);
  entry.holder.rotation.y = Math.sin(seconds * 0.9) * 0.55;
  entry.model.position.y = Math.sin(seconds * 3) * 1.4;
  // lobi: sesekali tersenyum, lalu berteriak sambil mengayunkan senjata
  const phase = seconds % 7;
  const expression = phase < 1.3 ? "happy" : phase > 3.6 && phase < 4.4 ? "angry" : "idle";
  const attack = phase > 3.6 && phase < 4.4 ? 1 - (phase - 3.6) / 0.8 : 0;
  animateHero(entry.state, seconds, { speed: 0, attack, expression });

  const aspect = studio.camera.aspect;
  const distance = aspect < 0.8 ? 330 : 255;
  studio.camera.position.set(0, 82, distance);
  studio.camera.lookAt(0, 40 * scale, 0);
  studio.gl.render(studio.scene, studio.camera);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const base = Math.min(width, height);
  const glow = ctx.createRadialGradient(width / 2, height * 0.55, 5, width / 2, height * 0.55, base * 0.5);
  glow.addColorStop(0, `${hero.color}66`);
  glow.addColorStop(0.55, `${hero.accent}1c`);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(studio.canvas, 0, 0, width, height);

  if (options.sparkles !== false) {
    for (let index = 0; index < 7; index += 1) {
      const angle = time * 0.00035 + index * 0.92;
      const radius = base * (0.3 + (index % 3) * 0.04);
      const x = width / 2 + Math.cos(angle) * radius;
      const y = height * 0.5 + Math.sin(angle) * radius * 0.72;
      ctx.fillStyle = `rgba(255, 236, 153, ${0.28 + Math.sin(time * 0.002 + index) * 0.18})`;
      ctx.beginPath();
      ctx.arc(x, y, 2 + (index % 2), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
