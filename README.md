# Logicodix: Momentum Arena

MOBA fisika **3v3** real-time yang bisa dimainkan **online lewat internet**: cari
lawan lewat matchmaking atau buat room privat dan bagikan kodenya ke teman. Slot
yang belum terisi otomatis diisi bot, jadi pertandingan tetap jalan meski kamu
bermain sendiri. Dilengkapi **Physics Clash**, server otoritatif, AI takeover saat
disconnect, dan client desktop Electron. Semua soal wajib bertema fisika dan
mekanik tempur memakai momentum, impuls, tumbukan, serta proyektil.

Dokumen produk lengkap ada di [PRD.md](./PRD.md).

## Menjalankan

Prasyarat: Node.js 20 atau lebih baru.

```bash
npm install
npm test
npm run check
npm start
```

- `npm start` menjalankan server lokal lalu membuka aplikasi Electron.
- `npm run server` hanya menjalankan server di `http://127.0.0.1:8787`.
- `npm run desktop` membuka Electron yang terhubung ke server yang sudah berjalan.
- `npm run check` memeriksa sintaks, kelengkapan file, bank soal, dan manifest.
- Port dapat diubah dengan `PORT=9000 npm start`.

Tanpa Electron, client juga dapat dibuka di browser melalui
`http://127.0.0.1:8787`. Health check tersedia di `/healthz`.

## Main online tanpa satu Wi-Fi (satu perintah)

Tidak perlu HP dan komputer berada di Wi-Fi yang sama. Jalankan:

```bash
npm run online
```

Perintah ini menyalakan server game lalu membuat **link publik HTTPS** (mis.
`https://namacakal.trycloudflare.com`) yang bisa dibuka dari HP/laptop mana pun
dan di jaringan mana pun, tanpa pengaturan tambahan. Bagikan link itu ke teman,
lalu pilih **CARI LAWAN** atau **BUAT ROOM**.

- `cloudflared` diunduh otomatis sekali saat pertama dijalankan, lalu tersimpan
  di `tools/` (tidak ikut git).
- Biarkan terminal tetap terbuka selama bermain; menutupnya mematikan server.
- Link berubah setiap kali dijalankan ulang, jadi bagikan link yang baru.
- Butuh versi online 24 jam tanpa komputer menyala? Pasang server di VPS/host
  publik seperti dijelaskan di *Menghubungkan server internet*.

## Mode bermain (tim 3v3, online)

Dua tim berisi maksimal 3 pemain: **Samudra** dan **Merapi**. Ada dua cara masuk
pertandingan:

| Mode | Cara | Keterangan |
|---|---|---|
| Matchmaking | **CARI LAWAN** di lobi | Server mempertemukan pemain online. Slot kosong diisi bot. |
| Room privat | **BUAT ROOM** lalu bagikan kode | Teman memilih **GABUNG** dan memasukkan kode room. |

Semua pemain terhubung ke server yang sama lewat WebSocket, jadi pertandingan
berjalan real-time antar perangkat. Agar bisa dimainkan lintas internet, jalankan
server di VPS/host publik dengan `wss://` (lihat bagian berikut), lalu semua
pemain mengarahkan client ke alamat server tersebut. Sinyal tim (ketuk minimap)
dan lineup kedua tim tersedia sepanjang pertandingan.

## Menghubungkan server internet

Server produksi harus berada di belakang TLS (`wss://`). Set alamat server pada
kolom **Pengaturan > Alamat server WebSocket** di aplikasi, atau melalui query
`?server=wss://domain.example`. Variabel lingkungan yang dipakai:

| Variabel | Fungsi |
|---|---|
| `PORT` | Port HTTP/WebSocket server lokal. |
| `LOGICODIX_SERVER_URL` | URL WebSocket yang diberikan ke client Electron. |
| `LOGICODIX_CLIENT_URL` | URL HTTP tempat Electron memuat aset client. |

Contoh menjalankan client desktop terhadap server internet:

```bash
LOGICODIX_SERVER_URL=wss://arena.example npm start
```

Server menyajikan aset statis dan WebSocket pada proses yang sama. Untuk produksi,
gunakan reverse proxy (Caddy/Nginx), health check `/healthz`, dan proses manager
seperti systemd atau container orchestrator.

## Lihat tampilan HP di laptop

`npm run phone` membuka jendela berukuran ponsel (915x412, landscape) lengkap dengan HUD dan kontrol sentuh; **mouse bertindak sebagai jari** (seret joystick, seret tombol serang atau Dash untuk membidik, ketuk minimap untuk sinyal). Pintasan: **F2** putar potret/landscape, **F3** ganti ukuran ponsel, **F12** DevTools.

## Instalasi di HP (Android / iPhone)

Ada dua cara memasang game di HP. Cara paling cepat adalah **PWA lewat browser**
(tanpa build, tanpa APK). Cara kedua adalah **APK Android native** bila ingin
aplikasi terpisah.

### Cara 1 — PWA lewat browser (paling mudah)

Berlaku untuk **Android (Chrome)** dan **iPhone (Safari)**.

1. Di komputer, jalankan `npm run online`. Tidak perlu satu Wi-Fi: perintah ini
   mencetak **link publik HTTPS**, mis. `https://namacakal.trycloudflare.com`.
   (Alternatif lokal satu Wi-Fi: `npm run server`, lalu pakai
   `http://IP-KOMPUTER:8787`.)
2. Buka alamat tersebut di browser HP.
3. Pasang ke layar utama:
   - **Android Chrome:** menu **⋮ > Tambahkan ke layar utama** (atau **Instal
     aplikasi** bila muncul).
   - **iPhone Safari:** tombol **Bagikan > Tambahkan ke Layar Utama**.
4. Buka game dari ikon di layar utama. Game berjalan layar penuh dan terkunci
   **landscape**; putar HP mendatar.
5. Saat pertama bermain, izinkan akses jaringan/baca penyimpanan bila diminta.
   Masuk lewat **CARI LAWAN** (online) atau **BUAT ROOM** lalu bagikan kode ke
   teman.

> Mode terpasang penuh (tanpa bilah alamat) hanya aktif bila alamat memakai
> **HTTPS**. Link dari `npm run online` sudah HTTPS, jadi langsung bisa dipasang
> penuh. Lewat `http://` biasa game tetap bisa dimainkan penuh di tab.

### Cara 2 — APK Android native

1. Build APK dari komputer (lihat bagian *APK Android native* di bawah) atau
   unduh dari halaman **Releases** repo ini bila tersedia.
2. Pindahkan file `app-debug.apk` ke HP (kabel USB, Google Drive, atau kirim ke
   diri sendiri).
3. Buka file APK di HP. Bila muncul peringatan, aktifkan **Izinkan dari sumber
   ini** / **Instal aplikasi tidak dikenal** untuk aplikasi pengirim.
4. Setelah terpasang, buka **Logicodix**. Saat diminta **alamat server**, tempel
   **link dari `npm run online`** (mis. `https://namacakal.trycloudflare.com`),
   atau `wss://domain-kamu` bila server publik permanen. Bisa juga
   `ws://IP-KOMPUTER:8787` untuk satu Wi-Fi.
5. Alamat tersimpan; ubah kapan saja lewat ikon **gerigi** di pojok.

> iPhone tidak mendukung pemasangan file APK. Gunakan **Cara 1** (Safari > Tambah
> ke Layar Utama).

## Main di Android

Game berjalan di Chrome Android sebagai web app (PWA); tidak perlu build APK.
Cara termudah adalah `npm run online` (link publik, tanpa satu Wi-Fi). Langkah di
bawah ini adalah alternatif lokal satu Wi-Fi.

1. Di komputer: `npm run server`. Server mencetak alamat seperti
   `Android/HP di jaringan yang sama: buka http://192.168.1.20:8787`.
2. HP dan komputer harus satu Wi-Fi. Izinkan Node.js di Windows Firewall
   (jaringan privat) bila halaman tidak terbuka.
3. Buka alamat itu di Chrome HP. Tekan tombol layar penuh (ikon kotak di kanan
   atas) atau cukup tekan **MAIN**; game masuk layar penuh dan mengunci landscape.
4. Menu Chrome, lalu **Tambahkan ke layar utama** untuk ikon sendiri.
   Mode terpasang penuh (WebAPK, tanpa bilah alamat) hanya ditawarkan Chrome pada
   HTTPS. Untuk itu pasang server di belakang TLS (Caddy/Nginx) atau pakai
   terowongan HTTPS (mis. `cloudflared tunnel --url http://localhost:8787`).
   Lewat HTTP biasa game tetap berjalan penuh di tab.

Kontrol sentuh: joystick kiri-bawah untuk bergerak; tombol serang besar di
kanan-bawah: **tap** menembak ke musuh terdekat (bidik otomatis), **seret**
tombolnya untuk membidik manual. Tiga tombol bulat di sekitarnya: Dash, Pulse,
Super. **Dash dan Super bisa diseret** untuk membidik: geser jari ke arah yang diinginkan lalu lepas (garis kuning menunjukkan arah); geser terlalu jauh dari tombol lalu lepas untuk membatalkan. Tap biasa memakai skill ke arah bidik otomatis. Bidik otomatis dapat dimatikan di Pengaturan.

**Sinyal tim:** ketuk minimap (kiri-atas) untuk memanggil rekan "Ayo ke sini", tekan lama untuk "Bahaya". Rekan manusia melihat penanda di peta dan arena; bot rekan ikut bergerak ke titik panggilan. Jeda 1,5 detik per pemain.

Alur layar: Lobi, Matchmaking atau Room, **Pilih Hero** (25 detik, pre-pick,
kunci pilihan, hero lawan tersembunyi), Loading (lineup kedua tim), Pertandingan,
Hasil (MVP dan papan skor, tombol **Main Lagi** di kanan-bawah).

## APK Android native (Capacitor)

Proyek Android lengkap ada di `android/` (paket `com.logicodix.momentumarena`).
Aplikasi membungkus client web di WebView native: layar penuh immersive, terkunci
landscape, layar tidak padam saat bermain, tombol Kembali Android diarahkan ke menu
game, ikon dan splash sendiri. Game server tetap berjalan di komputer/VPS.

Yang dibutuhkan (tidak ikut di repo): **Android Studio** (membawa JDK 21 dan Android
SDK). Capacitor 8 memakai compileSdk 36.

```
npm run android:sync     # salin client ke www/ lalu sinkronkan ke proyek Android
npm run android:open     # buka di Android Studio, lalu Build > Build APK(s)
```

Atau lewat terminal (setelah `JAVA_HOME` dan `ANDROID_HOME` diatur):

```
npm run android:apk      # hasil: android/app/build/outputs/apk/debug/app-debug.apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Pertama kali dibuka, aplikasi meminta **alamat server**: isi
`ws://IP-KOMPUTER:8787` (IP dicetak saat `npm run server`; emulator Android memakai
`ws://10.0.2.2:8787`) atau `wss://domain-kamu` bila server ada di internet.
Alamat tersimpan; ubah lewat ikon gerigi. Cleartext `ws://` diizinkan di manifest
agar jaringan lokal berfungsi. Untuk rilis Play Store gunakan `wss://` dan
tanda tangani build release.

Setiap kali client web berubah, jalankan `npm run android:sync` lagi sebelum build.

## Kontrol

| Aksi | Keyboard / Mouse |
|---|---|
| Gerak | `WASD` / panah / joystick di layar |
| Serang | Klik kiri / `J` / tombol serang |
| Dash | `Space` |
| Shockwave | `R` |
| Super | `E` |
| Jawab Clash | `1`–`4` atau klik opsi |
| Pengaturan | Ikon gerigi / status server |

Soal muncul setiap Physics Clash. Jawaban benar pertama memberi **Physics Edge**
dan **Insight**; jawaban salah memberi **Momentum Loss**. Server menyimpan kunci
jawaban dan memvalidasi waktu serta ID Clash.

## Arsitektur

```
Electron shell
  └─ client (HTML/CSS/JS canvas)
       └─ WebSocket ──> Node.js authoritative server
                          ├─ room / matchmaking
                          ├─ simulasi fisika 30 Hz
                          ├─ validasi Physics Clash
                          └─ AI takeover + reconnect 60 detik
```

- `client/main.js` — UI, lobby, HUD, Clash overlay, hasil match, reconnect.
- `client/render.js` — renderer arena dan portrait hero.
- `client/net.js` — WebSocket, heartbeat, exponential backoff, resume sesi.
- `client/input.js` — keyboard, mouse, joystick, latch ability.
- `server/index.js` — HTTP statis, health check, rate limit, routing pesan.
- `server/room.js` — state room, fisika, combat, Clash, disconnect/reconnect.
- `server/bot.js` — AI takeover dan jawaban bot dengan akurasi terbatas.
- `shared/` — konstanta, hero, fisika, bank soal yang dipakai kedua sisi.

## Pengujian

```bash
npm test
npm run check
```

- `test/physics.test.js` — rumus momentum, energi, tabrakan, pantulan, limit.
- `test/questions.test.js` — validasi bank soal dan tingkat kesulitan.
- `test/room.test.js` — jawaban valid/duplikat/terlambat, pemenang Clash,
  Momentum Loss, AI takeover, dan reconnect.

## Keamanan dan batasan MVP

- Server otoritatif: client hanya mengirim bitmask input dan arah aim.
- Kunci jawaban tidak pernah dikirim selama Clash aktif.
- Payload WebSocket dibatasi 16 KB dan rate limit 700 pesan/10 detik.
- Electron memakai context isolation, sandbox, tanpa `nodeIntegration`, dan
  navigasi keluar dibatasi.
- Sesi reconnect memakai token acak dan grace period 60 detik.
- Format pertandingan 3v3 tiga lane, 6 hero, 8 menit per match; slot kosong diisi
  bot. Item shop, rank, dan fog of war ada di roadmap PRD.



