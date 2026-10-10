# Verifikasi audit 001

Lingkup terbatas pada kontrol yang diubah; bukan sertifikasi seluruh aplikasi.

1. PASS — Jadwal publik menampilkan enam nama dan waktu tanpa inisial; status dan tindakan pencatatan tetap tersedia.
2. PASS — Sembilan bacaan terlihat sebagai tombol. Memilih Subhanallahi wa bihamdihi, menghitung sekali, lalu menyimpan dan mulai bacaan lain menghasilkan sesi baru dengan hitungan nol. Membuka kembali sesi lama tetap menampilkan hitungan satu.
3. PASS — Astaghfirullaha wa atubu ilaih dan Penuh harap dapat dipilih; accessibility state menunjukkan pilihan aktif. Dua belas pilihan perasaan tersedia.
4. PASS — Subjudul tasbih, kontrol syukur/langkah berikutnya, dan status draf bagian bawah tidak ada. Umpan balik simpan di header tetap ada.
5. PASS — Pada viewport 472×853, lebar halaman dan scrollWidth sama-sama 472; tidak ada overflow horizontal. Navigasi Tab memberi fokus pada tombol Kembali. Pengujian visual menggunakan tema terang yang aktif.
6. PASS — Chat publik dengan sesi pribadi membalas pesan sintetis uji koneksi dengan “Terhubung.” Bukti: /private/tmp/istiqamah-chat-mobile.png. Ini bukan pengujian jaringan handphone fisik.
7. PASS — Build, lint, 53 pemeriksaan engine, dan tes VPS termasuk browser tanpa AbortSignal.timeout lulus. Form akses perangkat baru ditampilkan berdasarkan sesi perangkat; kredensial tidak dibuka ke publik.

Bacaan tambahan diverifikasi dari https://sunnah.com/bukhari:6405, https://sunnah.com/bukhari:6384, dan https://sunnah.com/riyadussalihin:1877.

Belum diperiksa: handphone fisik pengguna, seluruh browser mobile, pengukuran kontras lengkap, serta tema gelap pada versi ini. Akses setiap perangkat tetap membutuhkan kode pribadi. Pengujian meninggalkan satu sesi tasbih sintetis berhitungan satu dan satu draf pilihan bacaan/perasaan; catatan shalat pengguna tidak diubah.
