# SiapUjian — Ujian Sekolah Daring (Gratis)

SiapUjian adalah aplikasi ujian daring untuk sekolah. Guru dapat membuat ujian, siswa mengerjakan ujian melalui telepon genggam atau laptop dengan menggunakan kode personal, nilai pilihan ganda dihitung secara otomatis, dan rekap nilai dapat diunduh dalam format Excel. Seluruhnya berjalan secara gratis dengan menggunakan akun Google milik Anda sendiri, tanpa server berbayar.

**Fitur utama**

- Soal pilihan ganda, esai, atau campuran; jumlah soal, mata pelajaran, dan durasi diatur oleh guru
- Esai berpedoman dinilai secara otomatis; tersedia bobot per soal dan peringkat kelas
- Siswa masuk dengan kode personal acak yang dibuat baru pada setiap ujian dan hanya dapat digunakan satu kali
- Anti-kecurangan: keluar dari halaman satu kali akan memicu peringatan; dua kali akan menyebabkan ujian terkunci dan terkumpul secara otomatis
- Impor data siswa dari Excel/CSV; soal dapat diketik, diimpor dari Excel, atau diunggah sebagai berkas Word
- Soal bergambar didukung; soal campuran Arab–Latin ditampilkan dengan benar
- Rekap nilai lengkap dengan unduhan Excel

**Yang Anda butuhkan**

1. Akun Google (untuk Apps Script dan Spreadsheet)
2. Tempat untuk menampilkan satu berkas HTML (panduan ini menggunakan GitHub Pages, gratis)

Isi paket ini: `index.html` (situs), `Code.gs` (bagian belakang atau *backend*), `Daftar_Siswa_Contoh.csv` dan `Soal_Matematika_Contoh.xlsx` (contoh format impor).

---

## Bagian A — Memasang Bagian Belakang (Google Apps Script)

Perkiraan waktu: 10 menit. Dilakukan satu kali saja.

1. Buka [drive.google.com](https://drive.google.com), kemudian buat **Spreadsheet baru** (tombol Baru > Google Spreadsheet). Beri nama, misalnya `Database SiapUjian`. Spreadsheet inilah yang akan menyimpan seluruh data Anda.
2. Pada Spreadsheet tersebut, klik menu **Ekstensi > Apps Script**. Tab editor akan terbuka. (Apabila muncul pesan kesalahan, pastikan peramban hanya masuk ke satu akun Google.)
3. Pada editor, klik berkas `Code.gs` di panel kiri. Klik area kode, tekan **Ctrl+A**, kemudian **Delete** untuk mengosongkan isinya.
4. Buka berkas `Code.gs` dari paket ini (dengan Notepad), tekan **Ctrl+A**, kemudian **Ctrl+C**. Kembali ke editor, tekan **Ctrl+V**, kemudian **Ctrl+S** untuk menyimpan.
5. **Atur kata sandi guru:** di panel kiri editor, klik ikon gerigi **Pengaturan proyek**, gulir ke bagian **Properti skrip**, kemudian klik **Tambahkan properti skrip**. Isi kolom Properti dengan `GURU_PASSWORD` dan kolom Nilai dengan kata sandi pilihan Anda. Klik **Simpan properti skrip**.
6. **Izin akses Drive** (agar soal bergambar dapat diunggah): kembali ke editor kode, pada daftar fungsi di bagian atas pilih **`otorisasiDrive`**, klik **Jalankan**, kemudian izinkan akses yang diminta.
7. **Terbitkan:** klik tombol **Deploy** di kanan atas > **Deployment baru** > klik ikon gerigi di samping "Pilih jenis" > pilih **Aplikasi web**. Isi:
   - Deskripsi: `SiapUjian`
   - Jalankan sebagai: **Saya**
   - Siapa yang memiliki akses: **Siapa saja**

   Klik **Deploy**. Saat Google meminta izin: pilih akun Anda; apabila muncul peringatan "Google belum memverifikasi aplikasi ini", klik **Lanjutan** > **Buka SiapUjian (tidak aman)** — aman, karena ini adalah aplikasi buatan Anda sendiri — kemudian klik **Izinkan**.
8. Setelah berhasil, akan muncul **URL aplikasi web** (alamat panjang yang diawali `https://script.google.com/macros/s/...`). **Salin dan simpan alamat ini** untuk digunakan pada Bagian B.

## Bagian B — Memasang Situs

1. Buka berkas `index.html` dari paket ini dengan editor teks (Notepad / TextEdit / VS Code).
2. Tekan **Ctrl+F**, cari tulisan `TEMPEL_ALAMAT_WEB_APP_KAMU_DI_SINI`, kemudian ganti tulisan tersebut dengan URL aplikasi web dari Bagian A langkah 8. Simpan berkasnya. (Apabila langkah ini dilewati, situs akan menampilkan peringatan bahwa situs belum disambungkan.)
3. Tampilkan situs melalui GitHub Pages (gratis):
   - Buat akun di [github.com](https://github.com) apabila belum memilikinya.
   - Buat **repository baru**: beri nama, misalnya `siapujian`, pilih **Public**, kemudian klik Create repository.
   - Pada halaman repo, klik **uploading an existing file**, pilih berkas `index.html` tersebut, kemudian klik **Commit changes**.
   - Buka **Settings > Pages**. Pada bagian Source, pilih **Deploy from a branch**, Branch: **main**, folder **/ (root)**, kemudian **Save**.
   - Tunggu sekitar 1 menit. Alamat situs Anda akan muncul di halaman tersebut, dalam bentuk: `https://namapengguna.github.io/siapujian/`

   *Catatan: repository memang bersifat publik, dan hal itu aman — di dalam `index.html` tidak terdapat kata sandi dan tidak terdapat data siswa. Kata sandi guru tersimpan di Apps Script milik Anda, dan seluruh data tersimpan di Spreadsheet milik Anda sendiri.*

   Alternatif selain GitHub: berkas yang sama dapat diseret dan dilepas ke Cloudflare Pages atau Netlify Drop.

## Bagian C — Penggunaan Pertama

1. Buka alamat situs Anda.
2. Klik **Masuk sebagai Guru**, kemudian isi kata sandi dari Bagian A langkah 5.
3. Pada menu **Pengaturan**, isi nama sekolah Anda. Anda juga dapat mengganti kata sandi guru di sana.
4. Tambahkan data siswa (diketik langsung atau diimpor dari Excel/CSV — formatnya: NIS, Nama, Kelas; lihat contoh pada `Daftar_Siswa_Contoh.csv`).
5. Buat ujian, tambahkan soal (diketik langsung, diimpor dari Excel, atau diunggah sebagai berkas Word — contoh format tersedia pada `Soal_Matematika_Contoh.xlsx`), kemudian bagikan kode peserta kepada siswa. Selesai — ujian siap digunakan.

## Catatan penting

- **Satu salinan untuk satu sekolah.** Setiap guru memasang salinannya sendiri sesuai panduan ini, agar data setiap sekolah tersimpan di akun Google masing-masing dan tidak tercampur.
- Seluruh data tersimpan di Spreadsheet yang Anda buat pada Bagian A — sheet Siswa, Ujian, Soal, dan Peserta dibuat secara otomatis. Gambar soal tersimpan di folder Drive bernama **SiapUjian Gambar Soal**.
- Kode peserta hanya dapat digunakan untuk masuk **satu kali**. Siswa yang keluar atau terkunci hanya dapat masuk kembali setelah di-**Reset** oleh guru dari halaman Rekap.
- Apabila di kemudian hari terdapat pembaruan berkas `Code.gs`, tempel ulang kodenya, kemudian terbitkan ulang dengan cara: **Deploy > Kelola deployment > ikon pensil > Versi: Versi baru > Deploy**. Alamat aplikasi web tidak berubah, sehingga `index.html` tidak perlu diubah.
