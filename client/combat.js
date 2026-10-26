// Logika murni notifikasi pertempuran ("diserang" / "menyerang"): tanpa DOM agar bisa dites.

export const ALERT_MERGE_MS = 1300;

/**
 * Bandingkan jejak serangan terakhir tiap pemain dengan yang sudah terlihat.
 * `seen` (Map id -> waktu hit) diperbarui; panggilan pertama hanya menyiapkan
 * `seen` sehingga serangan lama tidak diputar ulang saat bergabung/reconnect.
 * Mengembalikan hanya kejadian yang menyangkut pemain sendiri:
 *   dir "in"  = pemain sendiri diserang, "out" = pemain sendiri mengenai lawan.
 */
export function collectHitEvents(players, seen, selfId, { prime = false } = {}) {
  const events = [];
  for (const target of players ?? []) {
    const hit = target.lastHit;
    if (!hit) continue;
    if (seen.get(target.id) === hit.at) continue;
    seen.set(target.id, hit.at);
    if (prime) continue;
    if (target.id === selfId) {
      events.push({ dir: "in", hit, target, source: players.find((player) => player.id === hit.by) ?? null });
    } else if (hit.by === selfId) {
      events.push({ dir: "out", hit, target, source: players.find((player) => player.id === selfId) ?? null });
    }
  }
  return events;
}

const KIND_LABELS = {
  tower: "MENARA",
  minion: "MINION",
  other: "SERANGAN",
};

/** Teks pendek untuk strip notifikasi. */
export function alertLabel(event) {
  if (event.dir === "out") return `MENGENAI ${event.target.name}`;
  if (event.hit.kind === "hero" && event.source) return `DISERANG ${event.source.name}`;
  return `DISERANG ${KIND_LABELS[event.hit.kind] ?? KIND_LABELS.other}`;
}

/** Kunci penggabungan: serangan beruntun dari sumber yang sama dijumlahkan, bukan ditumpuk. */
export function alertKey(event) {
  return event.dir === "out" ? `out:${event.target.id}` : `in:${event.hit.by ?? event.hit.kind}`;
}

/**
 * Gabungkan kejadian baru ke notifikasi yang sedang tampil.
 * Mengembalikan notifikasi baru (objek baru) dengan total damage terakumulasi.
 */
export function mergeAlert(current, event, now) {
  const key = alertKey(event);
  const amount = event.hit.amount;
  if (current && current.key === key && now - current.updatedAt <= ALERT_MERGE_MS) {
    return { ...current, amount: current.amount + amount, hits: current.hits + 1, updatedAt: now };
  }
  return { key, dir: event.dir, label: alertLabel(event), amount, hits: 1, updatedAt: now };
}

/** Sudut (radian, searah jarum jam dari atas layar) dari `from` ke `to` di koordinat arena. */
export function angleToward(from, to) {
  return Math.atan2(to.x - from.x, -(to.y - from.y));
}

/**
 * Sudut (radian, searah jarum jam dari atas layar) antara dua titik LAYAR.
 * Dipakai bersama proyeksi kamera agar arah panah benar di sudut kamera mana pun.
 * Mengembalikan null bila kedua titik hampir berimpit.
 */
export function bearingBetween(a, b, minDistance = 1) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.hypot(dx, dy) < minDistance) return null;
  return Math.atan2(dx, -dy);
}

/** Kelas warna bar HP: sehat, waspada, kritis. */
export function hpTone(ratio) {
  if (ratio <= 0.25) return "critical";
  if (ratio <= 0.5) return "warn";
  return "ok";
}
