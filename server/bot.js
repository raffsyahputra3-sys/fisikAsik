import { ARENA, INPUT, LANES, LANE_IDS, SURFACE } from "../shared/constants.js";
import { getHero } from "../shared/heroes.js";
import { normalize } from "../shared/physics.js";

const ACCURACY = { 1: 0.5, 2: 0.66, 3: 0.8 };
const DELAY_MIN = 1300;
const DELAY_MAX = 4200;

export function planBotQuiz({ level, correctIndex, now, random = Math.random }) {
  const accuracy = ACCURACY[level] ?? 0.55;
  const correct = random() < accuracy;
  let option = correctIndex;
  if (!correct) {
    const choices = [0, 1, 2, 3].filter((index) => index !== correctIndex);
    option = choices[Math.floor(random() * choices.length)];
  }
  return {
    at: now + DELAY_MIN + random() * (DELAY_MAX - DELAY_MIN),
    option,
    answered: false,
  };
}

/** Lane tugas bot mengikuti seat: atas, tengah, bawah. */
export function laneForPlayer(player) {
  return LANE_IDS[player.seat % LANE_IDS.length];
}

/** Titik di jalur lane `ahead` satuan di depan posisi terdekat bot. */
export function pointAlongPath(path, x, y, ahead) {
  let best = { distance: Infinity, segment: 0, t: 0 };
  for (let index = 0; index < path.length - 1; index += 1) {
    const a = path[index];
    const b = path[index + 1];
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const lengthSq = abx * abx + aby * aby || 1;
    const t = Math.max(0, Math.min(1, ((x - a.x) * abx + (y - a.y) * aby) / lengthSq));
    const distance = Math.hypot(a.x + abx * t - x, a.y + aby * t - y);
    if (distance < best.distance) best = { distance, segment: index, t };
  }
  let segment = best.segment;
  const a = path[segment];
  const b = path[segment + 1];
  let remaining = ahead + 0;
  let px = a.x + (b.x - a.x) * best.t;
  let py = a.y + (b.y - a.y) * best.t;
  while (segment < path.length - 1) {
    const end = path[segment + 1];
    const length = Math.hypot(end.x - px, end.y - py);
    if (remaining <= length) {
      const f = length > 0 ? remaining / length : 0;
      return { x: px + (end.x - px) * f, y: py + (end.y - py) * f, atEnd: false };
    }
    remaining -= length;
    px = end.x;
    py = end.y;
    segment += 1;
  }
  return { x: px, y: py, atEnd: true };
}

function nearest(list, player, maxDistance = Infinity) {
  let best = null;
  let bestDistance = maxDistance;
  for (const item of list) {
    const distance = Math.hypot(item.x - player.x, item.y - player.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = item;
    }
  }
  return best ? { entity: best, distance: bestDistance } : null;
}

export function computeBotIntent(room, player, now) {
  const hero = getHero(player.heroId);
  const lane = laneForPlayer(player);
  const path = LANES[lane][player.slot];
  const ownNexus = room.nexuses.find((nexus) => nexus.team === player.slot);
  const enemyNexus = room.nexuses.find((nexus) => nexus.team !== player.slot);

  const enemies = [...room.players.values()].filter((other) => other.slot !== player.slot && other.alive);
  const enemyHit = nearest(enemies, player, 760);
  const enemy = enemyHit?.entity ?? null;
  const enemyDistance = enemyHit?.distance ?? Infinity;

  const enemyMinions = room.minions.filter((minion) => minion.alive && minion.team !== player.slot);
  const minionHit = nearest(enemyMinions, player, 640);
  const enemyTowers = room.towers.filter((tower) => tower.alive && tower.team !== player.slot);
  const towerHit = nearest(enemyTowers, player, 900);
  const allyMinionsNear = (x, y, radius) =>
    room.minions.filter(
      (minion) => minion.alive && minion.team === player.slot && Math.hypot(minion.x - x, minion.y - y) < radius,
    ).length;
  const allyHeroesNear = [...room.players.values()].filter(
    (other) => other.slot === player.slot && other.id !== player.id && other.alive && Math.hypot(other.x - player.x, other.y - player.y) < 520,
  ).length;

  const lowHealth = player.hp / player.maxHp < 0.32;
  let ahead = null;
  if (player.pingUntil > now && !lowHealth) {
    // rekan manusia memanggil lewat minimap: menuju titik itu
    if (Math.hypot(player.pingX - player.x, player.pingY - player.y) < 160) player.pingUntil = 0;
    else ahead = { x: player.pingX, y: player.pingY, atEnd: false };
  }
  ahead = ahead ?? pointAlongPath(path, player.x, player.y, 300);

  let target = null;
  let aimX = ahead.x;
  let aimY = ahead.y;
  let moveX = ahead.x - player.x;
  let moveY = ahead.y - player.y;
  let wantsAttack = false;

  if (ahead.atEnd && enemyNexus && !enemyNexus.protected) {
    // jalur habis dan nexus terbuka: serang langsung
    moveX = enemyNexus.x - player.x;
    moveY = enemyNexus.y - player.y;
  }

  if (lowHealth) {
    moveX = ownNexus.x - player.x;
    moveY = ownNexus.y - player.y;
    aimX = enemy ? enemy.x : ownNexus.x;
    aimY = enemy ? enemy.y : ownNexus.y;
    wantsAttack = Boolean(enemy) && enemyDistance < 600;
  } else if (enemy && (allyHeroesNear > 0 || allyMinionsNear(player.x, player.y, 320) > 0 || enemyDistance < 460)) {
    // team fight / duel
    target = enemy;
    const lead = Math.min(0.24, enemyDistance / 2600);
    aimX = enemy.x + enemy.vx * lead;
    aimY = enemy.y + enemy.vy * lead;
    const desired = hero.id === "quill" ? 420 : hero.id === "shade" ? 230 : 330;
    if (enemyDistance < 170) {
      moveX = player.x - enemy.x;
      moveY = player.y - enemy.y;
    } else if (enemyDistance > desired + 70) {
      moveX = enemy.x - player.x;
      moveY = enemy.y - player.y;
    } else if (enemyDistance < desired - 80) {
      moveX = player.x - enemy.x;
      moveY = player.y - enemy.y;
    } else {
      const strafe = (Math.sin(now / 520 + player.x * 0.01) > 0 ? 1 : -1) * 80;
      moveX = -(enemy.y - player.y) + strafe;
      moveY = enemy.x - player.x;
    }
    wantsAttack = enemyDistance < 680;
  } else if (minionHit) {
    // farm minion lawan sambil bertahan di jarak tembak
    const minion = minionHit.entity;
    aimX = minion.x;
    aimY = minion.y;
    wantsAttack = true;
    if (minionHit.distance > 360) {
      moveX = minion.x - player.x;
      moveY = minion.y - player.y;
    } else if (minionHit.distance < 220) {
      moveX = player.x - minion.x;
      moveY = player.y - minion.y;
    } else {
      moveX = 0;
      moveY = 0;
    }
  } else if (towerHit) {
    const tower = towerHit.entity;
    const supported = allyMinionsNear(tower.x, tower.y, 340) >= 2;
    aimX = tower.x;
    aimY = tower.y;
    const standoff = supported ? 330 : tower.range + 70;
    if (towerHit.distance > standoff + 40) {
      moveX = tower.x - player.x;
      moveY = tower.y - player.y;
    } else if (towerHit.distance < standoff - 40) {
      moveX = player.x - tower.x;
      moveY = player.y - tower.y;
    } else {
      moveX = 0;
      moveY = 0;
    }
    wantsAttack = towerHit.distance < 760 && (supported || towerHit.distance > tower.range + 20);
  }

  // hindari cover
  for (const cover of room.covers) {
    if (!cover.alive) continue;
    const centerX = cover.x + cover.w / 2;
    const centerY = cover.y + cover.h / 2;
    const dist = Math.hypot(centerX - player.x, centerY - player.y);
    if (dist < 150 && dist > 0.01) {
      const away = normalize(player.x - centerX, player.y - centerY);
      moveX += away.x * (150 - dist) * 1.8;
      moveY += away.y * (150 - dist) * 1.8;
    }
  }

  // jangan masuk jangkauan menara lawan tanpa dukungan minion
  for (const tower of enemyTowers) {
    const distance = Math.hypot(tower.x - player.x, tower.y - player.y);
    if (distance < tower.range + 20 && allyMinionsNear(tower.x, tower.y, 340) < 2 && !lowHealth) {
      const away = normalize(player.x - tower.x, player.y - tower.y);
      moveX += away.x * 160;
      moveY += away.y * 160;
    }
  }

  const clippedX = Math.max(ARENA.inset, Math.min(ARENA.width - ARENA.inset, player.x + moveX));
  const clippedY = Math.max(ARENA.inset, Math.min(ARENA.height - ARENA.inset, player.y + moveY));
  moveX = clippedX - player.x;
  moveY = clippedY - player.y;

  const move = normalize(moveX, moveY);
  let mask = 0;
  if (move.x > 0.28) mask |= INPUT.RIGHT;
  if (move.x < -0.28) mask |= INPUT.LEFT;
  if (move.y > 0.28) mask |= INPUT.DOWN;
  if (move.y < -0.28) mask |= INPUT.UP;

  if (wantsAttack) mask |= INPUT.ATTACK;

  if (enemy && enemyDistance < 165 && player.shockCd <= 0) {
    mask |= INPUT.SHOCK;
  }

  if (
    enemy &&
    player.super >= 100 &&
    (enemyDistance < 460 || (player.heroId === "lumen" && player.hp < player.maxHp * 0.55))
  ) {
    mask |= INPUT.ULTIMATE;
  }

  if (player.dashCd <= 0) {
    if (lowHealth && enemyDistance < 500 && Math.random() < 0.03) {
      mask |= INPUT.DASH;
    } else if (enemyDistance > 350 && enemyDistance < 760 && Math.random() < 0.012) {
      mask |= INPUT.DASH;
    }
  }

  return { mask, aimX, aimY };
}

export function spawnPointFor(slot) {
  return {
    x: slot === 0 ? 360 : ARENA.width - 360,
    y: ARENA.height / 2,
    radius: SURFACE.minionRadius,
  };
}
