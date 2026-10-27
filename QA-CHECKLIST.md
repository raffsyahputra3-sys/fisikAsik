# Checklist QA (uji manual sebelum rilis)

Logika (posisi, damage, event, duel, efek) sudah dites otomatis lewat `npm test`.
Hal di bawah butuh perangkat/layar nyata karena arena 3D tidak bisa dirender di CI headless.

## Perangkat
- [ ] HP Android nyata, landscape: satu low-end dan satu mid-range
- [ ] Layar kecil 640x360 dan 568x320: notifikasi dan kartu duel tidak menutupi panel HP,
      tombol skill, joystick, panel lawan, atau timer (sudah diukur lewat DOM; cek ulang di HP)
- [ ] Electron desktop dan browser/PWA

## Pertandingan sungguhan
- [ ] Ultimate sungguhan di pertandingan penuh (bukan tombol COBA)
- [ ] Notifikasi + ultimate + kilatan + getar bersamaan: layar tetap terbaca
- [ ] Panah arah penyerang menunjuk benar dari beberapa posisi (dekat tepi peta, di belakang menara);
      target galat <= 15 derajat
- [ ] Panel HP saat HP kritis (<30%): denyut merah tidak mengganggu
- [ ] Duel jawab melawan bot dan melawan manusia; hasil sama di kedua sisi
- [ ] Reconnect saat efek layar atau duel aktif: tidak ada efek/kartu yang menyangkut
- [ ] Saat duel terbuka, skor/objektif di tengah atas tersembunyi lalu kembali normal

## Minion
- [ ] Minion muncul di arena 3D saat pertandingan sungguhan (bug lama: posisi NaN, sudah diperbaiki
      dan dites logikanya; konfirmasi visual di arena nyata)
- [ ] Gelombang pertama muncul sekitar detik ke-2, lalu tiap 14 detik, di tiga lane untuk kedua tim
- [ ] Minion Samudra (biru-teal, tombak, tameng kerang) dan Merapi (merah-emas, pedang, tameng kayu)
      mudah dibedakan di layar kecil dan dengan simulasi buta warna
- [ ] Minion berjalan, mengayun senjata saat menyerang, dan menyusut saat mati
- [ ] Tier Ringan memakai model sederhana; FPS tetap >= 30 saat 30+ minion di layar

## Performa
- [ ] FPS >= 30 di HP low-end saat ultimate + notifikasi ramai (tier Auto turun sendiri bila <25 FPS)
- [ ] Tidak ada kebocoran memori setelah 10 pertandingan

## Aksesibilitas
- [ ] Toggle kilatan, jumpscare, getar layar, dan slider kekuatan berfungsi
- [ ] `prefers-reduced-motion` mematikan kilatan, getar, dan jumpscare
