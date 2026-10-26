import test from "node:test";
import assert from "node:assert/strict";
import {
  circleCircle,
  circleRect,
  clamp,
  distanceSq,
  impulseToVelocity,
  kineticEnergy,
  limitSpeed,
  momentum,
  normalize,
  reflectVelocity,
  resolveCircleCircle,
  resolveCircleRect,
} from "../shared/physics.js";

test("clamp membatasi nilai pada rentang", () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-3, 0, 10), 0);
  assert.equal(clamp(42, 0, 10), 10);
});

test("normalize menghasilkan vektor satuan", () => {
  const vector = normalize(3, 4);
  assert.equal(vector.length, 5);
  assert.equal(vector.x, 0.6);
  assert.equal(vector.y, 0.8);
  const zero = normalize(0, 0);
  assert.deepEqual(zero, { x: 0, y: 0, length: 0 });
});

test("momentum dan energi kinetik mengikuti rumus fisika", () => {
  assert.equal(momentum(2, 3), 6);
  assert.equal(kineticEnergy(2, 3), 9);
  assert.equal(impulseToVelocity(10, 2), 5);
  assert.equal(impulseToVelocity(10, 0), 0);
});

test("circleRect mendeteksi sisi dan jarak penetrasi", () => {
  const rect = { x: 0, y: 0, w: 100, h: 100 };
  assert.equal(circleRect(140, 50, 20, rect), null);
  const collision = circleRect(110, 50, 20, rect);
  assert.equal(collision.nx, 1);
  assert.equal(collision.ny, 0);
  assert.equal(collision.penetration, 10);
});

test("resolveCircleRect memantulkan dan memisahkan body", () => {
  const body = { x: 110, y: 50, radius: 20, vx: -5, vy: 0 };
  const result = resolveCircleRect(body, { x: 0, y: 0, w: 100, h: 100 }, 0.4);
  assert.ok(result);
  assert.equal(result.impactSpeed, 5);
  assert.equal(body.x, 120);
  assert.ok(body.vx > 0);
});

test("resolveCircleCircle menjaga momentum total", () => {
  const first = { x: 0, y: 0, radius: 10, mass: 1, vx: 10, vy: 0 };
  const second = { x: 15, y: 0, radius: 10, mass: 1, vx: 0, vy: 0 };
  const collision = circleCircle(first, second);
  assert.equal(collision.penetration, 5);
  const result = resolveCircleCircle(first, second, 0.35);
  assert.ok(result.impactSpeed > 0);
  assert.ok(Math.abs(first.vx + second.vx - 10) < 1e-9);
  assert.ok(Math.abs(first.x - second.x) >= 20 - 1e-9);
});

test("reflectVelocity dan limitSpeed membatasi gerak", () => {
  const reflected = reflectVelocity(5, 0, -1, 0, 1);
  assert.equal(reflected.vx, -5);
  assert.equal(reflected.vy, 0);

  const body = { vx: 30, vy: 40 };
  const speed = limitSpeed(body, 25);
  assert.equal(speed, 25);
  assert.ok(Math.abs(Math.hypot(body.vx, body.vy) - 25) < 1e-9);
});

test("distanceSq menghitung kuadrat jarak", () => {
  assert.equal(distanceSq(0, 0, 3, 4), 25);
  assert.equal(distanceSq(1, 1, 1, 1), 0);
});
