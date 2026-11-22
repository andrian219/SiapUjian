# SiapUjian — Ujian Sekolah Online (Gratis)

Aplikasi ujian online untuk sekolah: guru membuat ujian, siswa mengerjakan dari HP/laptop dengan kode personal, nilai pilihan ganda keluar otomatis, dan rekap nilai bisa diunduh sebagai Excel. Semua berjalan **gratis** memakai akun Google milikmu sendiri — tidak ada server berbayar.

**Fitur utama**

- Soal pilihan ganda, esai, atau campuran — jumlah, mata pelajaran, dan durasi diatur guru
- Esai berpedoman ikut dinilai otomatis; ada bobot per soal dan peringkat kelas
- Siswa masuk dengan kode personal acak (dibuat baru setiap ujian, hanya bisa dipakai masuk satu kali)
- Anti-curang: keluar halaman sekali = peringatan, dua kali = ujian terkunci dan terkumpul otomatis
- Impor siswa dari Excel/CSV; soal bisa diketik, diimpor dari Excel, atau diunggah sebagai file Word
- Soal bergambar didukung; soal campuran Arab–Latin tampil benar
- Rekap nilai lengkap dengan unduhan Excel

**Yang kamu butuhkan**

1. Akun Google (untuk Apps Script + Spreadsheet)
2. Tempat menampilkan satu file HTML (panduan ini memakai GitHub Pages, gratis)

Isi paket ini: `index.html` (situsnya), `Code.gs` (dapur/backend-nya), `Daftar_Siswa_Contoh.csv` dan `Soal_Matematika_Contoh.xlsx` (contoh format impor).

---

## Bagian A — Pasang dapurnya (Google Apps Script)

Perkiraan waktu: 10 menit. Dilakukan sekali saja.

1. Buka [drive.google.com](https://drive.google.com), buat **Spreadsheet baru** (tombol Baru > Google Spreadsheet). Beri nama, misalnya `Database SiapUjian`. Spreadsheet inilah yang akan menyimpan semua datamu.
2. Di Spreadsheet itu, klik menu **Ekstensi > Apps Script**. Tab editor akan terbuka. (Kalau muncul error, pastikan browser hanya masuk ke satu akun Google.)
3. Di editor, klik file `Code.gs` di panel kiri. Klik area kode, tekan **Ctrl+A** lalu **Delete** untuk mengosongkan isinya.
4. Buka file `Code.gs` dari paket ini (dengan Notepad), tekan **Ctrl+A** lalu **Ctrl+C**, kembali ke editor, tekan **Ctrl+V**, lalu **Ctrl+S** untuk menyimpan.
5. **Atur kata sandi guru:** di panel kiri editor, klik ikon gerigi **Pengaturan proyek** > gulir ke bagian **Properti skrip** > klik **Tambahkan properti skrip**. Isi kolom Properti dengan `GURU_PASSWORD` dan kolom Nilai dengan kata sandi pilihanmu. Klik **Simpan properti skrip**.
6. **Izin akses Drive** (supaya soal bergambar bisa diunggah): kembali ke editor kode, pada daftar fungsi di bagian atas pilih **`otorisasiDrive`**, klik **Jalankan**, lalu izinkan akses yang diminta.
7. **Terbitkan:** klik tombol **Deploy** di kanan atas > **Deployment baru** > klik ikon gerigi di samping "Pilih jenis" > pilih **Aplikasi web**. Isi:
   - Deskripsi: `SiapUjian`
   - Jalankan sebagai: **Saya**
   - Siapa yang memiliki akses: **Siapa saja**
   
   Klik **Deploy**. Saat Google meminta izin: pilih akunmu > kalau muncul peringatan "Google belum memverifikasi aplikasi ini", klik **Lanjutan** > **Buka SiapUjian (tidak aman)** — aman, ini aplikasi buatanmu sendiri > klik **Izinkan**.
8. Setelah berhasil, muncul **URL aplikasi web** (alamat panjang diawali `https://script.google.com/macros/s/...`). **Salin dan simpan alamat ini** — dipakai di Bagian B.

## Bagian B — Pasang situsnya

1. Buka file `index.html` dari paket ini dengan editor teks (Notepad / TextEdit / VS Code).
2. Tekan **Ctrl+F**, cari tulisan `TEMPEL_ALAMAT_WEB_APP_KAMU_DI_SINI`, lalu ganti tulisan itu dengan URL aplikasi web dari Bagian A langkah 8. Simpan file-nya. (Kalau langkah ini dilewati, situs akan menampilkan peringatan bahwa ia belum disambungkan.)
3. Tampilkan situsnya lewat GitHub Pages (gratis):
   - Buat akun di [github.com](https://github.com) bila belum punya.
   - Buat **repository baru**: beri nama misalnya `siapujian`, pilih **Public**, klik Create repository.
   - Di halaman repo, klik **uploading an existing file**, pilih file `index.html` tadi, lalu klik **Commit changes**.
   - Buka **Settings > Pages**. Pada bagian Source pilih **Deploy from a branch**, Branch: **main**, folder **/ (root)**, lalu **Save**.
   - Tunggu sekitar 1 menit. Alamat situsmu muncul di halaman itu, bentuknya: `https://namapengguna.github.io/siapujian/`

   *Catatan: repository-nya memang publik, dan itu aman — di dalam `index.html` tidak ada kata sandi dan tidak ada data siswa. Kata sandi guru tersimpan di Apps Script milikmu, dan semua data tersimpan di Spreadsheet milikmu sendiri.*

   Alternatif selain GitHub: file yang sama bisa diseret-lepas ke Cloudflare Pages atau Netlify Drop.

## Bagian C — Pemakaian pertama

1. Buka alamat situsmu.
2. Klik **Masuk sebagai Guru**, isi kata sandi dari Bagian A langkah 5.
3. Di menu **Pengaturan**, isi nama sekolahmu. Kamu juga bisa mengganti kata sandi guru di sana.
4. Tambahkan data siswa (ketik langsung atau impor Excel/CSV — formatnya: NIS, Nama, Kelas; lihat contoh di `Daftar_Siswa_Contoh.csv`).
5. Buat ujian, tambahkan soal (ketik langsung, impor Excel, atau unggah Word — contoh format ada di `Soal_Matematika_Contoh.xlsx`), lalu bagikan kode peserta kepada siswa. Selesai — ujian siap dipakai.

## Catatan penting

- **Satu salinan = satu sekolah.** Setiap guru memasang salinannya sendiri seperti panduan ini, supaya data tiap sekolah tersimpan di akun Googlenya masing-masing dan tidak tercampur.
- Semua data tersimpan di Spreadsheet yang kamu buat di Bagian A — sheet Siswa, Ujian, Soal, dan Peserta dibuat otomatis. Gambar soal tersimpan di folder Drive bernama **SiapUjian Gambar Soal**.
- Kode peserta hanya bisa dipakai masuk **satu kali**. Siswa yang keluar/terkunci hanya bisa masuk lagi setelah di-**Reset** oleh guru dari halaman Rekap.
- Kalau nanti ada pembaruan file `Code.gs`, tempel ulang kodenya lalu terbitkan ulang dengan cara: **Deploy > Kelola deployment > ikon pensil > Versi: Versi baru > Deploy**. Alamat aplikasi web tidak berubah, jadi `index.html` tidak perlu diubah.

---

*SiapUjian dibagikan gratis untuk guru-guru Indonesia. Silakan dipakai dan dibagikan lagi.*
