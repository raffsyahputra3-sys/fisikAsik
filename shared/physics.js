export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function length(x, y) {
  return Math.hypot(x, y);
}

export function normalize(x, y) {
  const len = Math.hypot(x, y);
  if (len < 1e-8) return { x: 0, y: 0, length: 0 };
  return { x: x / len, y: y / len, length: len };
}

export function vectorLength(x, y) {
  return Math.hypot(x, y);
}

export function momentum(mass, speed) {
  return mass * speed;
}

export function kineticEnergy(mass, speed) {
  return 0.5 * mass * speed * speed;
}

export function impulseToVelocity(impulse, mass) {
  return mass <= 0 ? 0 : impulse / mass;
}

export function circleRect(cx, cy, radius, rect) {
  const closestX = clamp(cx, rect.x, rect.x + rect.w);
  const closestY = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - closestX;
  const dy = cy - closestY;
  const distanceSq = dx * dx + dy * dy;

  if (distanceSq > radius * radius) {
    return null;
  }

  if (distanceSq > 1e-8) {
    const distance = Math.sqrt(distanceSq);
    return {
      nx: dx / distance,
      ny: dy / distance,
      penetration: radius - distance,
    };
  }

  const left = cx - rect.x;
  const right = rect.x + rect.w - cx;
  const top = cy - rect.y;
  const bottom = rect.y + rect.h - cy;
  const nearest = Math.min(left, right, top, bottom);

  if (nearest === left) return { nx: -1, ny: 0, penetration: radius + left };
  if (nearest === right) return { nx: 1, ny: 0, penetration: radius + right };
  if (nearest === top) return { nx: 0, ny: -1, penetration: radius + top };
  return { nx: 0, ny: 1, penetration: radius + bottom };
}

export function resolveCircleRect(body, rect, restitution = 0.45) {
  const collision = circleRect(body.x, body.y, body.radius, rect);
  if (!collision) return null;

  body.x += collision.nx * collision.penetration;
  body.y += collision.ny * collision.penetration;

  const normalVelocity = body.vx * collision.nx + body.vy * collision.ny;
  const impactSpeed = Math.max(0, -normalVelocity);

  if (normalVelocity < 0) {
    body.vx -= (1 + restitution) * normalVelocity * collision.nx;
    body.vy -= (1 + restitution) * normalVelocity * collision.ny;
  }

  return { ...collision, impactSpeed };
}

export function circleCircle(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const minDistance = a.radius + b.radius;
  const distanceSq = dx * dx + dy * dy;
  if (distanceSq >= minDistance * minDistance) return null;

  const distance = Math.sqrt(distanceSq);
  const nx = distance > 1e-8 ? dx / distance : 1;
  const ny = distance > 1e-8 ? dy / distance : 0;
  return { nx, ny, penetration: minDistance - distance, distance };
}

export function resolveCircleCircle(a, b, restitution = 0.35) {
  const collision = circleCircle(a, b);
  if (!collision) return null;

  const totalMass = a.mass + b.mass;
  if (totalMass <= 0) return collision;

  const aShare = b.mass / totalMass;
  const bShare = a.mass / totalMass;
  a.x -= collision.nx * collision.penetration * aShare;
  a.y -= collision.ny * collision.penetration * aShare;
  b.x += collision.nx * collision.penetration * bShare;
  b.y += collision.ny * collision.penetration * bShare;

  const relativeX = b.vx - a.vx;
  const relativeY = b.vy - a.vy;
  const normalVelocity = relativeX * collision.nx + relativeY * collision.ny;
  if (normalVelocity >= 0) return { ...collision, impactSpeed: 0 };

  const impulse = (-(1 + restitution) * normalVelocity) / (1 / a.mass + 1 / b.mass);
  a.vx -= (impulse * collision.nx) / a.mass;
  a.vy -= (impulse * collision.ny) / a.mass;
  b.vx += (impulse * collision.nx) / b.mass;
  b.vy += (impulse * collision.ny) / b.mass;

  return { ...collision, impactSpeed: Math.abs(normalVelocity) };
}

export function reflectVelocity(vx, vy, nx, ny, restitution = 1) {
  const normalVelocity = vx * nx + vy * ny;
  return {
    vx: (vx - (1 + restitution) * normalVelocity * nx) * restitution,
    vy: (vy - (1 + restitution) * normalVelocity * ny) * restitution,
  };
}

export function limitSpeed(body, maxSpeed) {
  const speed = Math.hypot(body.vx, body.vy);
  if (speed <= maxSpeed || speed <= 1e-8) return speed;
  const scale = maxSpeed / speed;
  body.vx *= scale;
  body.vy *= scale;
  return maxSpeed;
}

export function approach(current, target, delta) {
  if (current < target) return Math.min(current + delta, target);
  return Math.max(current - delta, target);
}

export function distanceSq(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}
