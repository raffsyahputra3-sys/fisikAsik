# PRD — Logicodix: Momentum Arena

**Versi:** 1.0 (vertical slice)  
**Tanggal:** 25 Oktober 2026  
**Status:** Implementasi MVP  
**Genre:** MOBA fisika real-time + quiz race  
**Platform MVP:** Native desktop (Electron) + browser, online lewat WebSocket  
**Durasi match:** 6 menit atau sampai Nexus hancur  
**Mode MVP:** 1v1 duel lane, online room / quick match / latihan vs AI

---

## 1. Ringkasan Produk

Logicodix: Momentum Arena adalah MOBA 2D top-down di mana pertempuran, gerak, dan
kerusakan mengikuti hukum fisika, sementara pengetahuan fisika menjadi mekanik
tempur. Setiap pemain mengendalikan satu hero, menghancurkan menara dan Nexus
lawan, serta memperebutkan **Physics Edge** melalui **Physics Clash**.

Berbeda dari kuis terpisah, soal muncul sebagai event pertempuran. Kedua pemain
menerima soal yang sama secara bersamaan dan berlomba menjawab benar. Pemenang
race mendapat buff nyata; jawaban salah menimbulkan penalti momentum. Semua soal
**wajib bertema fisika**, dan mekanik inti permainan juga **wajib memakai konsep
fisika** (momentum, impuls, tumbukan, proyektil, gaya, energi).

### Sasaran MVP

1. Membuktikan bahwa pertanyaan fisika dapat terasa sebagai bagian dari combat,
   bukan gate yang menghentikan permainan.
2. Menyediakan match online 1v1 yang dapat dimainkan melalui aplikasi native.
3. Menjaga permainan tetap berjalan ketika satu pemain disconnect melalui AI
   takeover dan reconnect.
4. Menyediakan fondasi server otoritatif yang dapat dikembangkan ke 3v3.

### Non-sasaran MVP

- 5v5, ranked season, skin, toko, clan, dan matchmaking MMR penuh.
- Full 3-lane map, fog of war, jungle monster kompleks, dan item shop lengkap.
- Mobile native (Android/iOS) dan cross-play mobile.
- Voice chat, anti-cheat kernel-level, dan monetisasi.
- Bank soal dalam jumlah besar; MVP memakai bank terkurasi yang cukup untuk
  beberapa sesi.

---

## 2. Keputusan Desain Final

Keputusan berikut menutup pertanyaan terbuka pada konsep awal dan mengikat
implementasi MVP.

| Pertanyaan | Keputusan | Alasan |
|---|---|---|
| Format soal | **Race, satu soal yang sama untuk kedua pemain** | Menciptakan momen bersama, dramatis, dan adil. Bukan dua kuis paralel. |
| Jenis soal | **100% fisika** | Identitas produk. Matematika/logika umum hanya boleh muncul sebagai bagian perhitungan fisika. |
| Disconnect | **AI takeover langsung + grace reconnect 60 detik** | Teman/lawan tetap dapat bermain. Slot tidak hilang. |
| Mode tanpa soal | **Tidak ada** | Semua match kompetitif memakai fisika dan soal. Latihan tetap memakai soal dengan penjelasan. |
| Gangguan flow | Soal hanya saat **Physics Clash**, bukan setiap beberapa detik; waktu gameplay melambat 80% selama Clash | Menjaga tempo tanpa membuat pemain kehilangan kendali. |
| Kesulitan | Dipilih dari **tingkat kesulitan pilihan pemain** (Pemula/Menengah/Mahir) untuk MVP; produksi memakai hidden MMR + mastery | Satu soal harus sama untuk kedua pemain, sehingga level disepakati dari rata-rata room. |
| Penalti | Jawaban salah: **Momentum Loss -10% speed selama 5 detik**, terkunci sampai Clash selesai | Ada risiko nyata, tetapi tidak langsung mematikan pemain. |
| Reward | Pemenang race: **Physics Edge 10 detik + 1 Insight**. Ultimate dengan Insight menjadi empowered | Menghubungkan pengetahuan, ekonomi, dan skill expression. |
| Pemain putus saat soal | Slot dikendalikan AI yang tetap menjawab dengan akurasi/waktu terbatas | Race tidak menggantung. Reconnect memulihkan kendali. |

---

## 3. Pilar Pengalaman

1. **Fisika terasa, bukan ditempel.** Serangan adalah proyektil bermassa,
   dash memberi impuls, dinding memantulkan, cover hancur oleh energi tumbukan,
   dan ledakan mendorong benda.
2. **Pengetahuan = kekuatan taktis.** Jawaban benar mengubah teamfight, bukan
   hanya menambah skor di akhir.
3. **Race yang adil.** Soal sama, waktu sama, informasi jawaban tidak bocor
   sebelum submisi. Server adalah otoritas jawaban dan efek.
4. **Entry-level, ceiling tinggi.** Soal Pemula dapat dijawab tanpa kalkulator;
   soal Mahir menuntut penalaran vektor dan momentum.
5. **Tidak pay-to-win.** Semua hero, soal, dan reward dapat diakses tanpa
   pembayaran.

---

## 4. Core Loop

1. Pemain membuka aplikasi native, terhubung ke server, memilih nama, hero, dan
   tingkat fisika.
2. Buat room / quick match / latihan. Room online menunggu dua pemain; latihan
   memakai AI.
3. Match dimulai setelah countdown. Minion berjalan, pemain farming dan
   menghancurkan menara.
4. Setiap 40 detik **Physics Clash** aktif di arena selama maksimal 8 detik.
   Kedua pemain mendapat soal identik dan harus menjawab lebih dulu.
5. Pemenang Clash mendapat **Physics Edge** dan **Insight**; jawaban salah
   mendapat **Momentum Loss**.
6. Pemain memakai Physics Edge untuk mendorong menara, menang teamfight, atau
   mengaktifkan ultimate empowered.
7. Hancurkan menara lalu Nexus lawan, atau menang lewat skor saat waktu habis.

### Alur match 6 menit

| Waktu | Event |
|---|---|
| 0:00 | Countdown selesai, hero spawn, minion wave pertama. |
| 0:10 | Menara aktif. Pemain dapat push lane. |
| 0:25 | Physics Clash #1 (soal sesuai tingkat room). |
| 0:35, 1:15, 1:55, ... | Clash berikutnya setiap 40 detik, maksimal 8 detik. |
| Sepanjang match | Menara, cover, minion, hero, proyektil, dan Nexus berinteraksi dengan fisika. |
| Menit 6 | Waktu habis. Skor tertinggi menang; jika seri, Nexus dengan HP lebih tinggi menang. |
| Kapan pun | Nexus hancur = kemenangan instan. |

Untuk MVP, Clash dijadwalkan global, bukan dipicu oleh kontes monster. PRD
produksi dapat memindahkannya ke objective netral (Turtle/Lord) tanpa mengubah
kontrak race.

---

## 5. Sistem Fisika

### 5.1 Model simulasi

Server menjalankan simulasi otoritatif pada 30 Hz. Arena adalah bidang 2D tanpa
gravitasi global (top-down). Entitas memakai lingkaran untuk tabrakan; cover
memakai persegi panjang.

Besaran yang disimulasikan:

- Posisi, kecepatan, massa, radius.
- Gaya dorong (`impulse`) dari dash, ledakan, dan tumbukan.
- Momentum proyektil: `p = m * v`; damage skala dengan momentum.
- Tumbukan elastis sebagian dengan restitusi dan kehilangan energi.
- Kerusakan cover berdasarkan energi tumbukan, bukan hit point abstrak saja.
- Cooldown, shield, burn, slow, dan buff sebagai modifier server-side.

### 5.2 Aturan yang dapat dirasakan pemain

| Mekanik | Konsep fisika | Efek gameplay |
|---|---|---|
| Basic attack | Proyektil, momentum | Proyektil bermassa; damage dan knockback naik seiring momentum. |
| Dash | Impuls, inersia | Menambah kecepatan sesaat; menabrak musuh/cover saat dash memberi impact damage. |
| Bertabrakan dengan cover | Tumbukan, restitusi | Hero memantul; cover kehilangan HP sesuai energi. |
| Shockwave | Gelombang, impuls radial | Mendorong hero/cover menjauh; makin dekat makin kuat. |
| Bastion shield | Refleksi | Proyektil yang mengenai shield aktif dipantulkan. |
| Physics Edge | Momentum & energi | +15% damage, +35% knockback, dan ultimate empowered. |
| Momentum Loss | Gesekan/rugi energi | Kecepatan turun 10% selama 5 detik. |
| Minion/tower projectile | Gerak proyektil | Proyektil bisa memantul dari cover dan mengenai target lain. |

### 5.3 Batasan teknis

- Posisi akhir di-clamp ke arena.
- Kecepatan maksimum dan impuls maksimum dibatasi untuk mencegah tunneling.
- Tabrakan diselesaikan per langkah; proyektil memakai substep jika perlu.
- Semua nilai gameplay dipisahkan di `shared/constants.js` dan `shared/heroes.js`.

---

## 6. Physics Clash (Sistem Inti)

### 6.1 Pemicu dan timing

- Clash pertama pada detik 25, lalu setiap 40 detik.
- Durasi maksimum 8 detik.
- Saat aktif, seluruh simulasi melambat menjadi 18% kecepatan normal. Timer
  Clash tetap memakai waktu nyata.
- Clash berakhir lebih awal ketika ada jawaban benar pertama (race winner).
- Clash tidak muncul saat countdown, saat match selesai, atau jika sebelumnya
  belum ada pemain aktif.

### 6.2 Alur

1. Server memilih satu soal fisika berdasarkan tingkat kesulitan room dan
   mengirim payload yang **tidak memuat kunci jawaban** ke kedua pemain.
2. Client menampilkan overlay berisi soal, empat opsi, timer 8 detik, dan status
   lawan (belum menjawab / terkunci).
3. Pemain menjawab lewat tombol 1–4 atau klik. Server memvalidasi:
   - Satu jawaban per pemain per Clash.
   - Jawaban setelah timer habis ditolak.
   - Jawaban benar pertama langsung menjadi pemenang race.
4. Efek langsung diumumkan ke kedua pemain:
   - **Winner:** Physics Edge 10 detik + 1 Insight + skor Clash.
   - **Jawaban salah:** Momentum Loss 5 detik dan lockout untuk Clash tersebut.
   - **Keduanya salah:** tidak ada Edge; keduanya terkena Momentum Loss.
   - **Tidak menjawab:** tidak mendapat penalti tambahan pada MVP (dianggap
     kalah race), tetapi tidak mendapat reward.
5. Penjelasan singkat ditampilkan setelah jawaban benar atau setelah waktu habis.

### 6.3 Physics Edge

Efek default selama 10 detik:

- Damage +15%.
- Knockback +35%.
- Ultimate berikutnya otomatis empowered jika pemain memiliki Insight.
- Aura visual pada hero dan HUD.

Insight tidak hangus saat match selesai; pada MVP Insight hanya berlaku dalam
match dan ditampilkan sebagai statistik. Progression lintas match masuk roadmap.

### 6.4 Anti-abuse

- Kunci jawaban hanya ada di server.
- Bank soal dipilih acak tanpa pengulangan sampai bank habis dalam satu match.
- Timer divalidasi berdasarkan waktu server, bukan client.
- Rate limit pesan WebSocket; payload maksimum dibatasi.
- Clash berikutnya tidak dapat dipicu oleh client.
- Client yang mengirim jawaban untuk Clash lama/ID tidak valid ditolak.

---

## 7. Bank Soal dan Kurikulum

### 7.1 Prinsip

- Hanya fisika. Kategori: kinematika, dinamika, momentum/impuls, energi, fluida,
  dan getaran/gelombang.
- Setiap soal memiliki: tingkat, kategori, empat opsi, indeks jawaban benar,
  penjelasan singkat, dan estimasi waktu baca.
- Tingkat kesulitan:
  - **Pemula:** konsep dasar dan hitungan satu langkah.
  - **Menengah:** dua langkah, satuan, arah gaya.
  - **Mahir:** vektor, momentum, energi, atau penalaran konseptual.
- Soal tidak boleh bergantung pada gambar eksternal pada MVP.

### 7.2 Contoh

| Level | Soal | Jawaban | Penjelasan |
|---|---|---|---|
| Pemula | Bola dilempar vertikal ke atas. Di titik tertinggi, besar kecepatannya? | 0 | Kecepatan sesaat nol sebelum berbalik arah; percepatan tetap ada. |
| Menengah | Gaya 10 N bekerja pada massa 2 kg. Percepatan? | 5 m/s² | Hukum II Newton: a = F/m. |
| Mahir | Dua gaya berlawanan 15 N dan 5 N pada benda 2 kg. Arah gerak? | Searah gaya 15 N | Resultan 10 N, arah mengikuti gaya yang lebih besar. |

### 7.3 Kesulitan adaptif MVP

Pemain memilih tingkat fisika di lobby. Server memakai rata-rata tingkat kedua
pemain (dibulatkan ke level yang lebih rendah untuk inklusivitas). Untuk latihan,
tingkat pemain dipakai langsung. Produksi akan menggabungkan pilihan ini dengan
riwayat jawaban dan hidden MMR.

---

## 8. Hero dan Combat

Setiap hero memiliki HP, massa, kecepatan, basic attack, dash, Shockwave, dan
ultimate. Ultimate dapat menjadi empowered bila pemain memiliki **1 Insight**;
Insight dikonsumsi saat cast.

| Hero | Role | Ultimate dasar | Efek empowered |
|---|---|---|---|
| Bastion | Tank | Aegis Field: shield + reflect | Shield/reflect lebih besar dan lebih lama. |
| Vanguard | Fighter | Seismic Charge: dash + knockback | Dash/knockback dan damage lebih besar. |
| Shade | Assassin | Blink burst | Jarak blink dan burst meningkat; dash reset. |
| Ember | Mage | Nova api proyektil | Proyektil lebih besar dan damage area lebih tinggi. |
| Quill | Marksman | Barrage lima proyektil | Tambahan proyektil dan attack speed. |
| Lumen | Support | Heal + shield | Heal/shield dua kali lipat. |

MVP mengimplementasikan keenam hero. Karena mode MVP 1v1, identitas support
disesuaikan menjadi duelist mandiri; di 3v3 Lumen kembali menjadi healer tim.

### Progresi dalam match

- Minion grant XP; hero dan tower memberi XP lebih besar.
- Level menambah HP maksimum, damage, dan sedikit kecepatan.
- Farming tetap relevan karena level dan push wave memengaruhi tempo.
- Insight adalah resource terpisah dari XP dan tidak menghapus fungsi gold/XP.

---

## 9. Peta dan Objective

- Arena tunggal 1800 × 1000 dengan satu lane utama.
- **Nexus** di kedua ujung. Nexus kebal sampai menara penjaga di lane hancur.
- **Menara** memiliki jangkauan, memprioritaskan minion, lalu hero.
- **Minion wave** tiap 14 detik, tiga unit per sisi.
- **Cover fisika** dapat digunakan sebagai perlindungan dan memantulkan proyektil;
  cover hancur setelah menerima energi tumbukan cukup.
- Arena memiliki empat cover simetris dan area tengah sebagai titik Clash.
- Nexus hancur = kemenangan. Waktu habis = skor lebih tinggi menang.

Full product akan menambah 3 lane, jungle, Turtle/Lord sebagai objective Clash,
item shop, dan fog of war. Map MVP sengaja satu lane agar race, combat, dan
networking dapat divalidasi lebih dulu.

---

## 10. Disconnect, AI Takeover, dan Reconnect

### 10.1 Saat koneksi hilang

1. Server mendeteksi WebSocket tertutup dan menandai pemain `disconnected`.
2. Match **tidak berhenti**. Slot langsung dikendalikan AI takeover.
3. Lawan mendapat notifikasi "Lawan terputus — AI takeover aktif".
4. AI takeover bergerak, menyerang, dan menjawab Clash dengan akurasi serta
   delay yang dibatasi (tidak instan).
5. Server menyimpan session token dan room code.

### 10.2 Reconnect

- Client mencoba reconnect otomatis dengan exponential backoff.
- Client mengirim `resume` berisi room code + session token.
- Grace period 60 detik sejak disconnect terakhir.
- Bila berhasil: AI berhenti, kendali kembali, statistik/HP/posisi tetap.
- Bila gagal sampai match selesai: AI menyelesaikan match atas nama slot.

### 10.3 Keputusan produk

Tidak ada pause. Ini menjaga race tetap adil dan mencegah eksploitasi disconnect.
AI takeover adalah pengganti sementara, bukan pengganti permanen. Pada 3v3,
reconnect token harus terikat akun; pada MVP token sesi acak 256-bit disimpan
di memori server dan localStorage client.

---

## 11. Native App dan Koneksi Internet

### 11.1 Arsitektur

```
Electron shell (native window)
  └─ memuat client lokal (HTML/CSS/JS canvas)
       └─ WebSocket (ws/wss) ──> Node.js authoritative game server
                                    ├─ matchmaking / room
                                    ├─ simulasi 30 Hz
                                    ├─ validasi jawaban
                                    └─ AI takeover
```

Browser juga dapat membuka client yang sama dari server (fallback/debug), tetapi
aplikasi native adalah target distribusi.

### 11.2 Konfigurasi

- Server default lokal: `ws://127.0.0.1:8787`.
- Server internet: `wss://domain.example` melalui environment
  `LOGICODIX_SERVER_URL` atau kolom server di layar awal.
- `npm start` menjalankan server lokal lalu membuka aplikasi native.
- `npm run server` hanya menjalankan server.
- `npm run desktop` membuka native app yang terhubung ke server yang sudah ada.
- Port server dapat diatur dengan `PORT`; health check di `/healthz`.

### 11.3 Keamanan dan reliability

- Server otoritatif; client tidak mengirim posisi final atau damage.
- Semua pesan divalidasi ukuran, tipe, rentang, dan rate limit.
- Tidak ada `nodeIntegration` di renderer; context isolation aktif.
- Load remote URL tidak diizinkan secara default; renderer memuat aset lokal.
- Reconnect otomatis, heartbeat ping/pong, penanganan room penuh/kode invalid.
- Token sesi tidak ditampilkan di UI dan tidak ditulis ke log.

---

## 12. UX dan Layar MVP

1. **Boot / Server connect:** status server, input URL server.
2. **Home/Lobby:** nama, hero, tingkat fisika, tombol Latihan vs AI, Buat Room,
   Gabung Room, Quick Match.
3. **Room:** kode room, daftar pemain, hero, level, tombol siap, countdown.
4. **Match:** canvas arena, HUD HP/level, skor, menara/Nexus, timer, Clash overlay,
   skill bar, feed event.
5. **Clash:** satu soal, empat opsi, timer 8 detik, indikator status lawan,
   feedback benar/salah dan penjelasan singkat.
6. **Result:** menang/kalah, statistik kill/death/insight, tombol rematch/keluar.
7. **Disconnect:** banner dan status AI takeover, indikator reconnect.

Aksesibilitas minimum: kontrol keyboard, ukuran teks soal besar, kontras tinggi,
opsi suara on/off, dan tidak bergantung pada warna saja (ikon/teks status).

---

## 13. Networking dan Server

### 13.1 Protokol

WebSocket JSON, pesan client:

- `hello`, `quickMatch`, `createRoom`, `joinRoom`, `practice`, `resume`
- `input` (bitmask arah/aksi, aim)
- `quizAnswer` (clashId, option)
- `ping`

Pesan server:

- `welcome`, `lobby`, `room`, `state`, `clash`, `clashResult`, `event`, `error`,
  `pong`, `matchEnd`.

### 13.2 Otoritas dan tick

- Server tick 30 Hz, broadcast snapshot 15 Hz.
- Client interpolasi posisi; input dikirim 20–30 Hz.
- Server menghitung damage, cooldown, jawaban, dan hasil.
- Snapshot memuat hanya data yang dibutuhkan renderer pada MVP (2 pemain).
- Match berjalan di event loop dengan delta time yang di-clamp.

### 13.3 Deployment

- Satu proses Node.js dapat melayani HTTP statis + WebSocket.
- Produksi wajib TLS (`wss://`) di belakang reverse proxy (Caddy/Nginx).
- Health check `/healthz`; graceful shutdown; maksimum room per proses untuk MVP.
- Skala berikutnya: Redis room registry, sticky sessions, worker per match.

---

## 14. Metrik Keberhasilan

- **Match completion rate** ≥ 85% (tidak macet saat disconnect).
- **Clash engagement** ≥ 90% pemain menjawab minimal satu Clash per match.
- **Time-to-first-fun** ≤ 60 detik dari membuka app sampai action pertama.
- **Rata-rata jawaban benar** 50–70% (terlalu tinggi = terlalu mudah, terlalu
  rendah = frustrasi).
- **Disconnect recovery rate** ≥ 60% untuk reconnect dalam 60 detik.
- **Tidak ada mismatch** antara hasil Clash di dua client.
- **P95 input-to-render feedback** ≤ 150 ms pada server lokal; target produksi
  regional ≤ 120 ms.

Instrumentasi produksi: match ID anonim, tingkat, hasil Clash, waktu jawab,
disconnect, durasi match. Tidak menyimpan data pribadi yang tidak diperlukan.

---

## 15. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Soal mengganggu flow combat | Tinggi | Hanya event Clash, slow-motion, overlay ringkas, timer 8 detik. |
| Pemain non-fisika frustrasi | Sedang | Tiga tingkat, penjelasan setelah jawaban, latihan tanpa tekanan. |
| Race terasa tidak adil karena latensi | Sedang | Server timestamp, delay AI, slow-motion, region server produksi. |
| Menyontek | Rendah–sedang | Bank acak, timer ketat, kunci di server, variasi soal produksi. |
| Disconnect merusak match | Tinggi | AI takeover, reconnect 60 detik, pemrosesan hasil tetap. |
| Gameplay fisika terlalu rumit | Sedang | Representasi visual impuls, tooltip, onboarding pendek. |
| Elektron membengkak | Rendah | Native shell minimal, aset vektor, build per platform. |
| Scope creep (5v5, item shop) | Tinggi | MVP 1v1 satu lane; fitur lain di roadmap. |

---

## 16. Acceptance Criteria MVP

1. Dua instance client dapat membuat/bergabung room lewat kode dan memulai match.
2. Server menolak jawaban yang tidak valid, duplikat, atau terlambat.
3. Kedua client melihat soal dan timer yang sama; pemenang race konsisten.
4. Physics Edge dan Momentum Loss benar-benar mengubah damage/kecepatan.
5. Enam hero dapat dipilih dan ultimate empowered memakai Insight.
6. Proyektil memantul dari cover dan memberi knockback; cover dapat hancur.
7. Menara dan Nexus dapat dihancurkan; kondisi menang/kalah konsisten.
8. Jika satu client ditutup, match berlanjut dengan AI takeover.
9. Client dapat resume dengan token dalam grace period.
10. Aplikasi native Electron terbuka, terhubung ke server, dan dapat memulai
    latihan/multiplayer.
11. `npm test` lulus untuk fisika, quiz, dan disconnect/reconnect logic.
12. README menjelaskan cara menjalankan lokal dan menghubungkan server internet.

---

## 17. Roadmap Setelah MVP

**Fase 1 — Validasi (MVP):** 1v1, satu lane, 6 hero, Clash race, AI takeover,
Electron.

**Fase 2 — Kedalaman:** 3v3, tiga lane, jungle monster + soal, shop + item quiz,
objective Turtle/Lord, reconnect dengan akun, tutorial fisika interaktif.

**Fase 3 — Kompetitif:** hidden MMR, ranked, mastery per topik, replay, spectator,
server region, anti-cheat, bank soal besar dengan rotasi.

**Fase 4 — Platform:** build Windows/macOS/Linux, PWA, mobile native, cross-play,
monetisasi kosmetik non-pay-to-win.

---

## 18. Definisi Istilah

- **Physics Clash:** event race soal fisika di tengah match.
- **Physics Edge:** buff 10 detik untuk pemenang Clash.
- **Momentum Loss:** penalti kecepatan setelah jawaban salah.
- **Insight:** resource dari jawaban benar; dipakai untuk ultimate empowered.
- **AI takeover:** pengambilalihan sementara slot oleh bot saat disconnect.
- **Momentum:** besaran fisika `p = m × v` yang juga menjadi tema desain.
- **Nexus:** bangunan inti yang harus dihancurkan untuk menang.

---

## 19. Pembaruan: MOBA 3v3 Tiga Lane

Mode MVP 1v1 satu lane diganti menjadi **3 lawan 3 dengan tiga lane**, agar terasa
MOBA sungguhan, bukan duel dua menara.

| Aspek | Keputusan |
|---|---|
| Tim | 3 pemain per tim. Seat kosong diisi bot saat countdown; latihan = 1 manusia + 2 sekutu bot vs 3 bot. |
| Peta | 2600 x 1500. Lane atas (Selat Malaka), tengah (Jalan Raya Pos), bawah (Jalur Sutra Maritim), jungle di antaranya, sungai Trowulan di tengah dengan jembatan di tiap lane. |
| Menara | 2 per lane per tim (luar + dalam) = 6 per tim. Menara dalam kebal sebelum menara luar jatuh. |
| Nexus | Terlindungi sampai **kedua menara salah satu lane** hancur. Hancurnya Nexus = menang. |
| Minion | Gelombang per 14 detik, 3 minion per lane per tim, mengikuti waypoint lane. |
| Durasi | 8 menit; saat waktu habis, skor tim (kill, Clash, menara) menentukan. |
| Clash | Soal sama untuk 6 pemain; jawaban benar pertama (dari tim mana pun) mendapat Physics Edge. |
| Kamera | Mengikuti hero sendiri; minimap menampilkan seluruh peta. |
| Bot | Tiap bot memegang satu lane (seat 0/1/2), bertarung dengan rekan, hanya menyerang menara bila ada dukungan minion, mundur saat HP rendah. |

Belum ada: jungle monster, Turtle/Lord, item shop, fog of war. Renderer 2D lama
hanya cadangan dan belum disesuaikan dengan peta baru.

---

## 20. Pembaruan: Android dan UI/UX v2

- **Android:** PWA (manifest + service worker + ikon PNG), landscape, layar penuh,
  wake lock saat bermain, kontrol sentuh (joystick, tombol serang dengan bidik
  otomatis atau seret, tiga skill melingkar). Renderer 3D di perangkat pointer
  kasar memakai tanpa MSAA, bayangan 1024, dan pixel ratio maksimum 1.5.
- **Alur:** Lobi pusat komando (mode di bawah, CTA besar kanan-bawah), Matchmaking,
  **Champion Select** 25 detik (pre-pick, lock-in, filter peran, hero lawan buta,
  timer yang berdenyut di 5 detik terakhir, auto-lock saat habis), Loading
  (lineup, tips, progres nyata dari hitung mundur server), HUD, Hasil (MVP,
  papan skor 3v3, Main Lagi di zona jempol kanan).
- **HUD:** minimap kiri-atas dengan panel rekan tim di bawahnya; timer, skor KO,
  objektif dan Clash di tengah; lawan terdekat dan sisa menara di kanan-atas;
  joystick kiri-bawah; panel diri di tengah-bawah; serang besar kanan-bawah.
- **Server:** status baru `select`, pesan `pickHero` dan `lockHero`, daftar
  pemain di `lobby` menyembunyikan hero lawan selama pilih hero.

### 20.1 Aplikasi Android native

Capacitor 8 membungkus client web (`scripts/build-www.mjs` menyalin ke `www/`).
`MainActivity` memberi mode immersive, keep-screen-on, dan area poni. Manifest
mengunci `sensorLandscape`. Plugin `@capacitor/app` dipakai untuk tombol Kembali.
Build APK memerlukan Android Studio dan belum diverifikasi di lingkungan pengembangan
ini (tanpa Java/Android SDK); bundel `www` sudah diuji dari origin `http://localhost`.
