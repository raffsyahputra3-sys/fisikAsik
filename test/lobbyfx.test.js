import test from "node:test";
import assert from "node:assert/strict";
import { HEROES } from "../shared/heroes.js";
import { FX_LEVELS, FX_TIERS } from "../shared/fx.js";
import { SHOWCASE_MS, drawLobbyFx, showcasePose, showcaseProgress } from "../client/lobbyfx.js";

/** Konteks kanvas tiruan: mencatat jumlah panggilan gambar tanpa DOM. */
function fakeContext() {
  const calls = { count: 0 };
  const gradient = { addColorStop() {} };
  const target = {
    createRadialGradient: () => gradient,
    createLinearGradient: () => gradient,
  };
  return {
    calls,
    ctx: new Proxy(target, {
      get(object, key) {
        if (key in object) return object[key];
        if (key === "calls") return calls;
        return () => {
          calls.count += 1;
        };
      },
      set() {
        return true;
      },
    }),
  };
}

test("showcaseProgress: 0..1 selama 3,6 detik, null di luar atau tanpa waktu mulai", () => {
  assert.equal(showcaseProgress(1000, null), null);
  assert.equal(showcaseProgress(999, 1000), null);
  assert.equal(showcaseProgress(1000, 1000), 0);
  assert.ok(Math.abs(showcaseProgress(1000 + SHOWCASE_MS / 2, 1000) - 0.5) < 1e-9);
  assert.equal(showcaseProgress(1000 + SHOWCASE_MS, 1000), null);
});

test("showcasePose: wajah garang dan serangan berdenyut di tengah, null di luar", () => {
  assert.equal(showcasePose(0, null), null);
  const early = showcasePose(100, 0);
  assert.equal(early.expression, "idle");
  assert.equal(early.attack, 0);
  const mid = showcasePose(700, 0);
  assert.equal(mid.expression, "angry");
  assert.ok(mid.attack > 0 && mid.attack <= 1);
  assert.equal(showcasePose(SHOWCASE_MS + 1, 0), null);
});

test("drawLobbyFx menggambar efek untuk semua hero, level, dan tier tanpa error", () => {
  for (const heroId of Object.keys(HEROES)) {
    for (const level of FX_LEVELS) {
      for (const tier of FX_TIERS) {
        for (const showcaseAt of [null, 0]) {
          const { ctx, calls } = fakeContext();
          drawLobbyFx(ctx, 480, 540, heroId, 1200, { level, tier, showcaseAt });
          assert.ok(calls.count > 0, `${heroId}/${level}/${tier} menggambar sesuatu`);
        }
      }
    }
  }
});

test("level Ganas lebih ramai dari Kalem, dan showcase menambah gambar", () => {
  const draw = (fx) => {
    const { ctx, calls } = fakeContext();
    drawLobbyFx(ctx, 480, 540, "shade", 1200, fx);
    return calls.count;
  };
  assert.ok(draw({ level: "ganas", tier: "full" }) > draw({ level: "kalem", tier: "full" }));
  assert.ok(draw({ level: "ganas", tier: "full" }) > draw({ level: "ganas", tier: "lite" }));
  assert.ok(draw({ level: "normal", tier: "full", showcaseAt: 0 }) > draw({ level: "normal", tier: "full" }));
  assert.ok(draw({ level: "normal", tier: "full", showcaseAt: 0, compact: true }) <
    draw({ level: "normal", tier: "full", showcaseAt: 0 }), "kartu kecil tanpa cincin/judul");
});

test("reduced motion: partikel jauh lebih sedikit dan tidak ada showcase", () => {
  const draw = (fx) => {
    const { ctx, calls } = fakeContext();
    drawLobbyFx(ctx, 480, 540, "ember", 1200, { level: "ganas", tier: "full", ...fx });
    return calls.count;
  };
  assert.ok(draw({ reducedMotion: true, showcaseAt: 0 }) < draw({ showcaseAt: null }));
});
