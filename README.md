# Logicodix: Momentum Arena

MOBA fisika **3v3** real-time yang bisa dimainkan **online lewat internet**: cari
lawan lewat matchmaking atau buat room privat dan bagikan kodenya ke teman. Slot
yang belum terisi otomatis diisi bot, jadi pertandingan tetap jalan meski kamu
bermain sendiri. Dilengkapi **Physics Clash**, server otoritatif, AI takeover saat
disconnect, dan client desktop Electron. Semua soal wajib bertema fisika dan
mekanik tempur memakai momentum, impuls, tumbukan, serta proyektil.

<p align="center">
  <a href="https://github.com/raffsyahputra3-sys/fisikAsik/releases/latest/download/fisikAsik.apk">
    <img alt="Download APK Android" src="https://img.shields.io/badge/Download-APK%20Android-3DDC84?style=for-the-badge&logo=android&logoColor=white">
  </a>
  <a href="https://render.com/deploy?repo=https://github.com/raffsyahputra3-sys/fisikAsik">
    <img alt="Deploy server online" src="https://img.shields.io/badge/Deploy-Server%20Online-46E3B7?style=for-the-badge&logo=render&logoColor=white">
  </a>
</p>

**Native Android + online.** Tekan **Download APK Android**, pasang di HP, lalu
isi alamat server online (lihat [Server online](#server-online)). APK di-build
otomatis oleh GitHub Actions setiap push ke `main` dan diunggah ke halaman
[Releases](https://github.com/raffsyahputra3-sys/fisikAsik/releases).

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

## Server online

APK dan pemain butuh satu server game yang bisa dijangkau dari internet. Pilih
salah satu:

### A. Permanen di Render (gratis, tombol Deploy)

1. Tekan tombol **Deploy Server Online** di atas, lalu login Render.
2. Render membaca `render.yaml` di repo ini dan menjalankan `npm run server`.
3. Setelah selesai, salin URL `https://nama-layanan.onrender.com`.
4. Tempel URL itu di aplikasi (ikon gerigi > **Alamat server**), atau set
   **repository variable** `LOGICODIX_DEFAULT_SERVER` di GitHub (Settings >
   Secrets and variables > Actions > Variables), lalu jalankan ulang workflow
   **Android APK** agar APK berikutnya otomatis terhubung.

> Free tier Render tidur setelah tidak dipakai; kunjungan pertama bisa lambat
> beberapa detik. WebSocket tetap didukung.

### B. Link publik sementara (tanpa daftar)

Jalankan di komputer:

```bash
npm run online
```

Perintah ini menyalakan server game lalu membuat **link publik HTTPS** (mis.
`https://namacakal.trycloudflare.com`) yang bisa dibuka dari HP/laptop mana pun
dan di jaringan mana pun. Bagikan link itu ke teman, lalu pilih **CARI LAWAN**
atau **BUAT ROOM**.

- `cloudflared` diunduh otomatis sekali, lalu tersimpan di `tools/` (tidak ikut git).
- Biarkan terminal tetap terbuka selama bermain; menutupnya mematikan server.
- Link berubah setiap kali dijalankan ulang, jadi bagikan link yang baru.
- APK juga bisa memakai link ini: tempel di **Alamat server** (boleh `https://`).

## Mode bermain (tim 3v3, online)

Dua tim berisi maksimal 3 pemain: **Samudra** dan **Merapi**. Ada dua cara masuk
pertandingan:

| Mode | Cara | Keterangan |
|---|---|---|
| Matchmaking | **CARI LAWAN** di lobi | Server mempertemukan pemain online. Slot kosong diisi bot. |
| Room privat | **BUAT ROOM** lalu bagikan kode | Teman memilih **GABUNG** dan memasukkan kode room. |

Semua pemain terhubung ke server yang sama lewat WebSocket, jadi pertandingan
berjalan real-time antar perangkat. Agar bisa dimainkan lintas internet, pakai
server publik dari bagian [Server online](#server-online) (tombol Render atau
`npm run online`), lalu semua pemain mengarahkan client ke alamat server
tersebut. Sinyal tim (ketuk minimap) dan lineup kedua tim tersedia sepanjang
pertandingan.

## Menghubungkan server internet

Cara paling mudah adalah menekan tombol **Deploy Server Online** di atas; Render
membaca `render.yaml` dan menjalankan server dengan TLS otomatis. Bagian ini
untuk hosting manual/VPS.

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

### Android — APK native (tombol download)

1. Tekan tombol **Download APK Android** di bagian atas README (atau buka halaman
   [Releases](https://github.com/raffsyahputra3-sys/fisikAsik/releases)).
2. Buka file `fisikAsik.apk` di HP. Bila muncul peringatan, aktifkan **Izinkan
   dari sumber ini** / **Instal aplikasi tidak dikenal**.
3. Buka aplikasi **Logicodix**. Saat diminta **alamat server**, tempel alamat
   server online dari bagian [Server online](#server-online) (boleh diawali
   `https://` atau `wss://`).
4. Masuk lewat **CARI LAWAN** (matchmaking) atau **BUAT ROOM** lalu bagikan kode
   ke teman. Alamat server tersimpan dan bisa diubah lewat ikon **gerigi**.

APK di-build otomatis oleh GitHub Actions (debug-signed, cukup untuk dipasang
manual di HP). iPhone tidak bisa memasang APK; gunakan PWA di bawah.

### Android / iPhone — PWA tanpa APK

1. Buka link publik game (dari server Render atau `npm run online`) di browser HP.
2. Pasang ke layar utama:
   - **Android Chrome:** menu **⋮ > Tambahkan ke layar utama** (atau **Instal
     aplikasi** bila muncul).
   - **iPhone Safari:** tombol **Bagikan > Tambahkan ke Layar Utama**.
3. Buka game dari ikon di layar utama. Game berjalan layar penuh dan terkunci
   **landscape**; putar HP mendatar.
4. Masuk lewat **CARI LAWAN** (online) atau **BUAT ROOM** lalu bagikan kode ke
   teman.

> Mode terpasang penuh (tanpa bilah alamat) hanya aktif bila alamat memakai
> **HTTPS**. Server Render dan link `npm run online` sudah HTTPS, jadi langsung
> bisa dipasang penuh. Lewat `http://` biasa game tetap bisa dimainkan penuh di tab.

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

APK siap pasang tersedia di
[Releases](https://github.com/raffsyahputra3-sys/fisikAsik/releases). Build
otomatis lewat GitHub Actions (`.github/workflows/android.yml`) setiap push ke
`main`; hasilnya juga diunggah sebagai artifact **fisikAsik-apk**.

Proyek Android lengkap ada di `android/` (paket `com.logicodix.momentumarena`).
Aplikasi membungkus client web di WebView native: layar penuh immersive, terkunci
landscape, layar tidak padam saat bermain, tombol Kembali Android diarahkan ke menu
game, ikon dan splash sendiri. Game server tetap berjalan di komputer/VPS.

Kalau ingin APK otomatis terhubung ke server tertentu, set repository variable
`LOGICODIX_DEFAULT_SERVER` (mis. `https://fisikasik.onrender.com`) di GitHub
sebelum build. Aplikasi juga tetap bisa mengganti alamat lewat ikon gerigi.

Yang dibutuhkan untuk build lokal (tidak ikut di repo): **Android Studio**
(membawa JDK 21 dan Android SDK). Capacitor 8 memakai compileSdk 36.

```
npm run android:sync     # salin client ke www/ lalu sinkronkan ke proyek Android
npm run android:open     # buka di Android Studio, lalu Build > Build APK(s)
```

Atau lewat terminal (setelah `JAVA_HOME` dan `ANDROID_HOME` diatur):

```
npm run android:apk      # hasil: android/app/build/outputs/apk/debug/app-debug.apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Pertama kali dibuka, aplikasi meminta **alamat server**: isi URL server online
(`https://...` atau `wss://...`) dari bagian [Server online](#server-online).
Untuk jaringan lokal bisa juga `ws://IP-KOMPUTER:8787` (emulator Android memakai
`ws://10.0.2.2:8787`). Alamat tersimpan; ubah lewat ikon gerigi. Cleartext
`ws://` diizinkan di manifest agar jaringan lokal berfungsi. Untuk rilis Play
Store gunakan `wss://` dan tanda tangani build release.

Setiap kali client web berubah, jalankan `npm run android:sync` lagi sebelum build.

## Notifikasi pertempuran dan health bar

- **Health bar hero** di arena: hijau untuk kamu dan rekan, merah untuk lawan, bingkai
  emas untuk dirimu, garis skala tiap 50 HP, kilatan putih saat terkena, dan bingkai
  berdenyut saat HP kritis. Angka damage melayang muncul untuk serangan yang melibatkanmu.
- **Panel HP** (kamu dan lawan terdekat) menampilkan angka HP, warna yang berubah
  (hijau, kuning, merah), dan jejak putih-kuning yang memperlihatkan HP yang baru hilang.
- **Notifikasi** di atas panel HP-mu: `DISERANG <nama/menara/minion> -N` (merah) dan
  `MENGENAI <nama> -N` (kuning). Serangan beruntun dijumlahkan (`x3`). Saat diserang
  hero lawan muncul panah arah penyerang dan kilatan merah di tepi layar; saat HP
  turun ke 30% muncul peringatan HP kritis.

## Minion

Minion mengikuti tema faksi: **Samudra** = prajurit pesisir biru-teal (ikat kepala biru, kain
pendek, tombak/trisula atau busur, tameng kerang) dan **Merapi** = prajurit gunung merah-emas
(ikat kepala merah, rompi dan sabuk, pedang pendek atau busur api, tameng kayu). Perbedaan
tim terbaca lewat bentuk, bukan hanya warna. Tiap lane berisi dua petarung dan satu pemanah
(varian visual; statistik sama). Minion berjalan dengan goyangan, mengayun senjata saat
menyerang, dan menyusut saat mati. Tier efek **Ringan** memakai model minion sederhana.
Config tampilan ada di `shared/minions.js`; aset visual seluruhnya prosedural (lihat `CREDITS.md`).

## Efek kartu karakter di lobi

Potret hero di lobi punya efek khas sesuai legenda: bara emas dan bulu merak (Warok
Suro), riak peta dan ombak emas (Patih Gajah), api dan kabut ungu (Leak Bali),
gelembung dan mutiara (Nyi Roro), daun dan kunang-kunang hutan (Sipet Dayak), serta
hujan dan asap dupa (Pawang Hujan). Kartu hero yang terpilih di sisi kanan ikut
beranimasi. Tombol **SHOWCASE** memutar sorotan 3,6 detik: pose menyerang, ledakan
partikel, cincin energi, nama ultimate, dan (sesuai pengaturan Efek layar) kilatan,
getar, serta jumpscare. Showcase otomatis saat ganti hero hanya memakai partikel.
Kepadatan partikel mengikuti level (Kalem/Normal/Ganas) dan tier kualitas.

## Efek layar (ultimate)

Saat memakai ultimate, layar mendapat grading warna, kilatan singkat, jumpscare
kecil, dan getar sesuai hero, lengkap dengan stinger audio. Atur di ikon gerigi >
**Efek layar**: intensitas **Kalem / Normal / Ganas** (bawaan Normal; jumpscare hanya di Ganas), kualitas
**Auto / Penuh / Sedang / Ringan**, toggle kilatan, jumpscare, getar layar beserta
kekuatannya, dan tombol **COBA** untuk melihat efek hero terpilih. Mode Auto
menurunkan kualitas bila FPS di bawah 25 selama 3 detik, dan pengaturan
`prefers-reduced-motion` mematikan kilatan, getar, dan jumpscare. Efek murni visual:
tidak mengubah gameplay. Config per hero ada di `shared/fx.js`.

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

**Duel jawab.** Saat kamu menyerang hero lawan yang ada dalam jarak serang dan arah
bidikmu, tembakan ditahan dan kalian berdua mendapat soal singkat yang sama
(3 detik). Penyerang yang menjawab benar lebih dulu melepas tembakannya dan
mendapat Edge kecil. Kalau korban lebih cepat, serangan gagal dan penyerang kena
Momentum Loss kecil. Kalau keduanya salah atau waktu habis, serangan gagal dan
korban kena Momentum Loss sedang. Setelah duel, korban kebal duel 2 detik dan
pasangan yang sama baru bisa berduel lagi setelah 3 detik. Tembakan jarak jauh,
serangan ke minion, menara, atau Nexus, dan bot lawan bot tidak memicu duel.
Semua angka ada di `DUEL` pada `shared/constants.js`; `DUEL.enabled = false`
mematikan mekanik ini.

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



