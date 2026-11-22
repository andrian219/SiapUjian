// ============================================================
// SiapUjian — BACKEND (Google Apps Script)
// Cara pasang ada di README.md, Bagian A. Ringkasnya:
// 1. Buat Spreadsheet baru, lalu buka Ekstensi > Apps Script.
// 2. Hapus isi editor, tempel seluruh file ini, simpan.
// 3. Atur kata sandi guru: Pengaturan proyek > Properti skrip >
//    tambah properti bernama GURU_PASSWORD.
// 4. Jalankan fungsi otorisasiDrive() satu kali (untuk gambar soal).
// 5. Deploy sebagai Aplikasi web (Jalankan sebagai: Saya;
//    Siapa yang memiliki akses: Siapa saja), lalu salin alamatnya
//    ke file index.html.
// Semua data (siswa, soal, nilai) tersimpan di Spreadsheet milikmu
// sendiri — sheet-nya dibuat otomatis oleh kode ini.
// ============================================================

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ok: true, service: "Ayo Ujian API"}))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    initSheets();
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    let res = {ok: true};

    if (action === "guruLogin") {
      res = guruLogin(body.password);
    } else if (action === "masuk") {
      res = masuk(body.kode);
    } else if (action === "simpan") {
      res = simpan(body.kode, body.jawaban);
    } else if (action === "pelanggaran") {
      res = pelanggaran(body.kode);
    } else if (action === "kumpul") {
      res = kumpul(body.kode, body.jawaban);
    } else if (action === "getNamaSekolah") {
      res = getNamaSekolah();
    } else {
      const auth = validateToken(body.token);
      if (!auth.ok) return jsonResponse(auth);

      switch (action) {
        case "guruGantiPassword": res = guruGantiPassword(body.lama, body.baru); break;
        case "getKelas": res = getKelas(); break;
        case "getSiswa": res = getSiswa(body.kelas); break;
        case "saveSiswa": res = saveSiswa(body.kelas, body.siswa); break;
        case "buatUjian": res = buatUjian(body.judul, body.mapel, body.kelas, body.durasiMenit); break;
        case "tambahSoal": res = tambahSoal(body.ujianId, body.soal); break;
        case "getSoal": res = getSoal(body.ujianId); break;
        case "updateSoal": res = updateSoal(body.ujianId, body.no, body.soal); break;
        case "hapusSoalSatu": res = hapusSoalSatu(body.ujianId, body.no); break;
        case "listUjian": res = listUjian(); break;
        case "tutupUjian": res = tutupUjian(body.ujianId); break;
        case "rekap": res = rekap(body.ujianId); break;
        case "ambilJawabanEsai": res = ambilJawabanEsai(body.ujianId, body.kode); break;
        case "nilaiEsai": res = nilaiEsai(body.ujianId, body.kode, body.nilai); break;
        case "resetPeserta": res = resetPeserta(body.ujianId, body.kode); break;
        case "hapusSoalUjian": res = hapusSoalUjian(body.ujianId); break;
        case "hapusUjian": res = hapusUjian(body.ujianId); break;
        case "hapusSiswa": res = hapusSiswa(body.nis); break;
        case "hapusSemuaSiswa": res = hapusSemuaSiswa(body.kelas); break;
        case "setNamaSekolah": res = setNamaSekolah(body.nama); break;
        case "uploadGambar": res = uploadGambar(body.nama, body.mime, body.data); break;
        default: throw new Error("AKSI_TIDAK_DIKENAL");
      }
    }
    return jsonResponse(res);
  } catch (err) {
    return jsonResponse({ok: false, error: err.message});
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = {
    "Siswa": ["NIS", "Nama", "Kelas"],
    "Ujian": ["ID", "Judul", "Mapel", "Kelas", "DurasiMenit", "Status", "Dibuat"],
    "Soal": ["UjianID", "No", "Tipe", "Teks", "OpsiJSON", "Kunci", "Pedoman", "Bobot", "Gambar"],
    "Peserta": ["UjianID", "Kode", "NIS", "Nama", "Status", "Mulai", "Kumpul", "Pelanggaran", "UrutanJSON", "JawabanJSON", "NilaiPG", "NilaiEsai", "NilaiAkhir"]
  };
  for (let name in sheets) {
    if (!ss.getSheetByName(name)) {
      ss.insertSheet(name).appendRow(sheets[name]);
    }
  }
  // Migrasi: sheet Soal dari versi lama belum punya kolom Bobot — tambahkan.
  const soalSheet = ss.getSheetByName("Soal");
  const lastCol = Math.max(soalSheet.getLastColumn(), 1);
  const headerRow = soalSheet.getRange(1, 1, 1, lastCol).getValues()[0];
  if (headerRow.indexOf("Bobot") === -1) soalSheet.getRange(1, lastCol + 1).setValue("Bobot");
  // Migrasi: kolom Gambar untuk soal bergambar (nilainya tautan gambar di Drive).
  const lastCol2 = Math.max(soalSheet.getLastColumn(), 1);
  const headerRow2 = soalSheet.getRange(1, 1, 1, lastCol2).getValues()[0];
  if (headerRow2.indexOf("Gambar") === -1) soalSheet.getRange(1, lastCol2 + 1).setValue("Gambar");
}

// Bobot nilai sebuah soal; kosong/tidak valid berarti bobot standar 1.
function bobotSoal(s) {
  const b = parseFloat(s.Bobot);
  return (!isNaN(b) && b > 0) ? b : 1;
}

// Nilai disimpan dengan 2 angka desimal (mis. 66.67) — aturan Riel:
// nilai koma harus terhitung, tidak dibulatkan ke bilangan bulat.
function bulat2(x) { return Math.round(x * 100) / 100; }

function guruLogin(password) {
  const props = PropertiesService.getScriptProperties();
  const stored = props.getProperty("GURU_PASSWORD");
  if (!stored) return {ok: false, error: "PASSWORD_BELUM_DIATUR"};
  if (password !== stored) return {ok: false, error: "PASSWORD_SALAH"};
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put("sess_" + token, "1", 21600);
  return {ok: true, token: token};
}

function validateToken(token) {
  if (!token || !CacheService.getScriptCache().get("sess_" + token)) {
    return {ok: false, error: "SESI_BERAKHIR"};
  }
  return {ok: true};
}

function guruGantiPassword(lama, baru) {
  const props = PropertiesService.getScriptProperties();
  if (lama !== props.getProperty("GURU_PASSWORD")) return {ok: false, error: "PASSWORD_LAMA_SALAH"};
  props.setProperty("GURU_PASSWORD", baru);
  return {ok: true};
}

function getKelas() {
  const data = getSheetData("Siswa");
  const kelas = [...new Set(data.map(r => r.Kelas))].sort();
  return {ok: true, kelas: kelas};
}

function getSiswa(kelas) {
  kelas = String(kelas);
  const data = getSheetData("Siswa").filter(r => r.Kelas === kelas);
  return {ok: true, siswa: data.map(r => ({nis: r.NIS, nama: r.Nama}))};
}

function saveSiswa(kelas, siswaList) {
  kelas = String(kelas);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error("LOCK_TIMEOUT");
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Siswa");
    const data = sheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][2] === kelas) sheet.deleteRow(i + 1);
    }
    siswaList.forEach(s => sheet.appendRow([s.nis, s.nama, kelas]));
    return {ok: true};
  } finally {
    lock.releaseLock();
  }
}

function buatUjian(judul, mapel, kelas, durasiMenit) {
  kelas = String(kelas);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error("LOCK_TIMEOUT");
  try {
    if (!durasiMenit || parseInt(durasiMenit) < 1) throw new Error("DURASI_TIDAK_VALID");
    if (getSheetData("Siswa").filter(r => r.Kelas === kelas).length === 0) throw new Error("KELAS_BELUM_ADA_SISWA");
    const ujianId = Utilities.getUuid();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.getSheetByName("Ujian").appendRow([ujianId, judul, mapel, kelas, durasiMenit, "aktif", new Date().toISOString()]);
    
    const siswa = getSheetData("Siswa").filter(r => r.Kelas === kelas);
    const pesertaSheet = ss.getSheetByName("Peserta");
    const existingKodes = new Set(getSheetData("Peserta").map(r => r.Kode));
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    const resultPeserta = [];

    siswa.forEach(s => {
      let kode;
      do {
        kode = "";
        for (let i = 0; i < 6; i++) kode += chars.charAt(Math.floor(Math.random() * chars.length));
      } while (existingKodes.has(kode));
      existingKodes.add(kode);
      pesertaSheet.appendRow([ujianId, kode, s.NIS, s.Nama, "belum", "", "", 0, "", "{}", "", "", ""]);
      resultPeserta.push({nis: s.NIS, nama: s.Nama, kode: kode});
    });
    return {ok: true, ujianId: ujianId, peserta: resultPeserta};
  } finally {
    lock.releaseLock();
  }
}

function tambahSoal(ujianId, soalList) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error("LOCK_TIMEOUT");
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Soal");
    const current = getSheetData("Soal").filter(r => r.UjianID === ujianId);
    let nextNo = current.length + 1;
    soalList.forEach(s => {
      const b = parseFloat(s.bobot);
      sheet.appendRow([ujianId, nextNo++, String(s.tipe || "").toLowerCase(), s.teks, JSON.stringify(s.opsi || []), s.kunci || "", s.pedoman || "", (!isNaN(b) && b > 0) ? b : "", s.gambar || ""]);
    });
    return {ok: true, jumlah: nextNo - 1};
  } finally {
    lock.releaseLock();
  }
}

// Daftar soal tersimpan milik satu ujian (untuk guru, lengkap dengan kunci).
function getSoal(ujianId) {
  const soal = getSheetData("Soal").filter(s => s.UjianID === ujianId)
    .sort((a, b) => a.No - b.No)
    .map(s => ({
      no: s.No, tipe: String(s.Tipe).toLowerCase(), teks: s.Teks,
      opsi: JSON.parse(s.OpsiJSON || "[]"), kunci: s.Kunci || "", pedoman: s.Pedoman || "",
      bobot: bobotSoal(s), gambar: s.Gambar || ""
    }));
  return {ok: true, soal};
}

// Ubah satu soal yang sudah tersimpan (teks, opsi, kunci, pedoman, bobot).
function updateSoal(ujianId, no, s) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Soal");
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const iU = headers.indexOf("UjianID"), iN = headers.indexOf("No");
  for (let i = 1; i < values.length; i++) {
    if (values[i][iU] === ujianId && values[i][iN] == no) {
      const set = (col, val) => { const c = headers.indexOf(col); if (c >= 0) sheet.getRange(i + 1, c + 1).setValue(val); };
      const b = parseFloat(s.bobot);
      set("Tipe", String(s.tipe || "").toLowerCase());
      set("Teks", s.teks || "");
      set("OpsiJSON", JSON.stringify(s.opsi || []));
      set("Kunci", s.kunci || "");
      set("Pedoman", s.pedoman || "");
      set("Bobot", (!isNaN(b) && b > 0) ? b : "");
      set("Gambar", s.gambar || "");
      return {ok: true};
    }
  }
  return {ok: false, error: "SOAL_TIDAK_DITEMUKAN"};
}

// Hapus satu soal tersimpan lalu rapikan nomor urutnya. Hanya boleh sebelum
// ada peserta yang mulai mengerjakan, supaya jawaban peserta tidak bergeser.
function hapusSoalSatu(ujianId, no) {
  const peserta = getSheetData("Peserta").filter(p => p.UjianID === ujianId);
  if (peserta.some(p => p.Status !== "belum")) return {ok: false, error: "SUDAH_ADA_YANG_MENGERJAKAN"};
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Soal");
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const iU = headers.indexOf("UjianID"), iN = headers.indexOf("No");
  for (let i = values.length - 1; i >= 1; i--) {
    if (values[i][iU] === ujianId && values[i][iN] == no) sheet.deleteRow(i + 1);
  }
  const sisa = getSheetData("Soal").filter(r => r.UjianID === ujianId).sort((a, b) => a.No - b.No);
  const snap = sheet.getDataRange().getValues();
  sisa.forEach((r, idx) => {
    for (let i = 1; i < snap.length; i++) {
      if (snap[i][iU] === ujianId && snap[i][iN] == r.No) sheet.getRange(i + 1, iN + 1).setValue(idx + 1);
    }
  });
  return {ok: true};
}

function listUjian() {
  const ujian = getSheetData("Ujian");
  const soal = getSheetData("Soal");
  const peserta = getSheetData("Peserta");
  const list = ujian.map(u => ({
    id: u.ID, judul: u.Judul, mapel: u.Mapel, kelas: u.Kelas, durasiMenit: u.DurasiMenit, status: u.Status,
    jumlahSoal: soal.filter(s => s.UjianID === u.ID).length,
    jumlahPeserta: peserta.filter(p => p.UjianID === u.ID).length
  }));
  return {ok: true, ujian: list};
}

function tutupUjian(ujianId) {
  updateRow("Ujian", "ID", ujianId, {Status: "tutup"});
  return {ok: true};
}

function masuk(kode) {
  const p = findRow("Peserta", "Kode", kode);
  if (!p) return {ok: false, error: "KODE_TIDAK_DITEMUKAN"};
  const u = findRow("Ujian", "ID", p.row.UjianID);
  if (u.row.Status !== "aktif") return {ok: false, error: "UJIAN_DITUTUP"};
  if (p.row.Status === "selesai") return {ok: false, error: "SUDAH_SELESAI"};
  if (p.row.Status === "terkunci") return {ok: false, error: "TERKUNCI"};
  // Kode peserta hanya berlaku SATU KALI masuk (aturan Riel, anti-curang):
  // sesi yang sudah dimulai tidak bisa dimasuki lagi dengan kode yang sama.
  // Satu-satunya jalan masuk kembali adalah Reset oleh guru di Rekap.
  if (p.row.Status === "mengerjakan") return {ok: false, error: "KODE_SUDAH_DIPAKAI"};
  // Ujian yang belum punya soal tidak boleh dimasuki — kalau dibiarkan, siswa
  // bisa mengumpulkan ujian kosong dan halaman hasilnya tidak ada nilainya.
  const jumlahSoal = getSheetData("Soal").filter(s => s.UjianID === u.row.ID).length;
  if (jumlahSoal === 0) return {ok: false, error: "SOAL_BELUM_ADA"};

  let urutan = p.row.UrutanJSON ? JSON.parse(p.row.UrutanJSON) : null;
  const now = new Date();

  if (p.row.Status === "belum") {
    const soalList = getSheetData("Soal").filter(s => s.UjianID === u.row.ID);
    shuffleArray(soalList);
    urutan = soalList.map(s => {
      const item = {no: s.No, tipe: s.Tipe};
      if (String(s.Tipe).toLowerCase() === "pg") {
        const opsi = JSON.parse(s.OpsiJSON);
        const indexed = opsi.map((t, i) => ({t, original: String.fromCharCode(65 + i)}));
        shuffleArray(indexed);
        item.opsi = indexed.map(x => x.t);
        item.map = indexed.map(x => x.original);
      }
      return item;
    });
    updateRow("Peserta", "Kode", kode, {Status: "mengerjakan", Mulai: now.toISOString(), UrutanJSON: JSON.stringify(urutan)});
    p.row.Mulai = now.toISOString();
  }

  const start = Date.parse(p.row.Mulai);
  const limit = start + (u.row.DurasiMenit * 60000);
  const sisaDetik = Math.max(0, Math.floor((limit - now.getTime()) / 1000));

  const semuaSoal = getSheetData("Soal");
  const soalTampil = urutan.map(item => {
    const s = semuaSoal.find(x => x.UjianID === u.row.ID && x.No == item.no);
    return {id: s.No, tipe: String(s.Tipe).toLowerCase(), teks: s.Teks, opsi: item.opsi || [], gambar: s.Gambar || ""};
  });

  return {ok: true, nama: p.row.Nama, nis: p.row.NIS, judul: u.row.Judul, mapel: u.row.Mapel, kelas: u.row.Kelas, durasiMenit: u.row.DurasiMenit, sisaDetik, soal: soalTampil, jawaban: JSON.parse(p.row.JawabanJSON || "{}")};
}

function simpan(kode, jawabanBaru) {
  const p = findRow("Peserta", "Kode", kode);
  if (!p || p.row.Status !== "mengerjakan") return {ok: false, error: "AKSES_DITOLAK"};
  const u = findRow("Ujian", "ID", p.row.UjianID);
  const limit = Date.parse(p.row.Mulai) + (u.row.DurasiMenit * 60000);
  const currentJawaban = JSON.parse(p.row.JawabanJSON || "{}");
  Object.assign(currentJawaban, jawabanBaru);
  
  if (new Date().getTime() > limit) {
    const hasil = kumpul(kode, currentJawaban);
    hasil.habis = true;
    return hasil;
  }
  updateRow("Peserta", "Kode", kode, {JawabanJSON: JSON.stringify(currentJawaban)});
  return {ok: true};
}

function pelanggaran(kode) {
  const p = findRow("Peserta", "Kode", kode);
  if (!p || p.row.Status !== "mengerjakan") return {ok: false, error: "AKSES_DITOLAK"};
  const count = parseInt(p.row.Pelanggaran) + 1;
  if (count >= 2) {
    const hasil = kumpul(kode, {});
    updateRow("Peserta", "Kode", kode, {Status: "terkunci", Pelanggaran: count});
    return {ok: true, pelanggaran: count, terkunci: true, nilaiPG: hasil.nilaiPG, nilaiAkhir: hasil.nilaiAkhir, benar: hasil.benar, jumlahPG: hasil.jumlahPG, adaEsai: hasil.adaEsai, peringkat: hasil.peringkat, jumlahSelesai: hasil.jumlahSelesai, jumlahPeserta: hasil.jumlahPeserta};
  }
  updateRow("Peserta", "Kode", kode, {Pelanggaran: count});
  return {ok: true, pelanggaran: count, terkunci: false};
}

// Cocokkan jawaban esai siswa dengan pedoman/kunci jawaban guru.
// Kalau keduanya mengandung angka, yang dibandingkan adalah angka TERAKHIR
// masing-masing pihak — pedoman sering berbentuk kalimat hitungan seperti
// "46 + 38 = 84." yang hasil akhirnya (84) ada di ujung, bukan angka pertama
// (46, yang cuma operan). Jadi jawaban "84" cocok dengan pedoman itu, dan
// "47" cocok dengan pedoman "47 stiker". Kalau tidak ada angka, teksnya
// disamakan setelah dibersihkan (huruf kecil, tanpa tanda baca, spasi rapi),
// atau salah satu mengandung yang lain.
function esaiCocok(jawabanSiswa, pedoman) {
  // Pembersihan teks yang aman untuk huruf Arab: huruf Arab dipertahankan,
  // angka Arab (٠١٢٣ dan ۰۱۲۳) diubah ke angka Latin supaya tetap terbaca.
  const norm = s => String(s || "").toLowerCase()
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[^a-z0-9\u0600-\u06FF ]/g, " ").replace(/\s+/g, " ").trim();
  const a = norm(jawabanSiswa), b = norm(pedoman);
  if (!a || !b) return false;
  const numsA = a.match(/\d+(?:[.,]\d+)?/g);
  const numsB = b.match(/\d+(?:[.,]\d+)?/g);
  if (numsA && numsB) {
    const jawab = parseFloat(numsA[numsA.length - 1].replace(",", "."));
    const kunci = parseFloat(numsB[numsB.length - 1].replace(",", "."));
    return jawab === kunci;
  }
  return a === b || a.includes(b) || b.includes(a);
}

function kumpul(kode, jawabanAkhir) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error("LOCK_TIMEOUT");
  try {
    const p = findRow("Peserta", "Kode", kode);
    if (!p || (p.row.Status !== "mengerjakan" && p.row.Status !== "belum")) return {ok: false, error: "SUDAH_KUMPUL"};
    
    const u = findRow("Ujian", "ID", p.row.UjianID);
    const soal = getSheetData("Soal").filter(s => s.UjianID === u.row.ID);
    const urutan = p.row.UrutanJSON ? JSON.parse(p.row.UrutanJSON) : null;
    if (!urutan) return {ok: false, error: "SESI_TIDAK_VALID"};
    const jawaban = JSON.parse(p.row.JawabanJSON || "{}");
    Object.assign(jawaban, jawabanAkhir);

    let benar = 0, jumlahPG = 0, jumlahEsai = 0, benarEsai = 0, esaiTanpaPedoman = 0;
    let bobotPG = 0, bobotBenarPG = 0, bobotEsai = 0, bobotBenarEsai = 0;
    soal.forEach(s => {
      const b = bobotSoal(s);
      if (String(s.Tipe).toLowerCase() === "pg") {
        jumlahPG++; bobotPG += b;
        const item = urutan.find(x => x.no == s.No);
        const studentChoiceLetter = jawaban[s.No]; // A-E
        if (studentChoiceLetter) {
          const idx = studentChoiceLetter.charCodeAt(0) - 65;
          const originalLetter = item.map[idx];
          if (originalLetter === s.Kunci) { benar++; bobotBenarPG += b; }
        }
      } else {
        jumlahEsai++; bobotEsai += b;
        const pedoman = String(s.Pedoman || "").trim();
        if (!pedoman) esaiTanpaPedoman++;
        else if (esaiCocok(jawaban[s.No], pedoman)) { benarEsai++; bobotBenarEsai += b; }
      }
    });

    const nPG = bobotPG > 0 ? bulat2((bobotBenarPG / bobotPG) * 100) : null;
    // Esai yang punya pedoman dinilai otomatis dengan bobotnya masing-masing:
    // satu nilai akhir = total bobot jawaban benar dibagi total bobot semua soal, kali 100.
    const esaiOtomatis = jumlahEsai > 0 && esaiTanpaPedoman === 0;
    let nEsai = "";
    let nAkhir = "";
    if (jumlahEsai === 0) nAkhir = nPG;
    else if (esaiOtomatis) {
      nEsai = bulat2((bobotBenarEsai / bobotEsai) * 100);
      nAkhir = bulat2(((bobotBenarPG + bobotBenarEsai) / (bobotPG + bobotEsai)) * 100);
    }

    updateRow("Peserta", "Kode", kode, {
      Status: "selesai", Kumpul: new Date().toISOString(), JawabanJSON: JSON.stringify(jawaban),
      NilaiPG: nPG, NilaiEsai: nEsai, NilaiAkhir: nAkhir
    });

    // Peringkat: 1 + jumlah nilai akhir peserta lain (ujian yang sama) yang
    // lebih tinggi dari nilai saya. Dihitung dari data terbaru di sheet.
    let peringkat = null, jumlahSelesai = 0, jumlahPeserta = 0;
    if (nAkhir !== "" && nAkhir !== null) {
      const semua = getSheetData("Peserta").filter(x => x.UjianID === u.row.ID);
      jumlahPeserta = semua.length;
      const nilais = semua.map(x => parseFloat(x.NilaiAkhir)).filter(v => !isNaN(v));
      jumlahSelesai = nilais.length;
      peringkat = 1 + nilais.filter(v => v > nAkhir).length;
    }
    return {ok: true, nilaiPG: nPG, benar, jumlahPG, adaEsai: jumlahEsai > 0,
      nilaiEsai: nEsai === "" ? null : nEsai, nilaiAkhir: nAkhir === "" ? null : nAkhir,
      benarEsai, jumlahEsai, esaiManual: jumlahEsai > 0 && !esaiOtomatis,
      peringkat, jumlahSelesai, jumlahPeserta};
  } finally {
    lock.releaseLock();
  }
}

function rekap(ujianId) {
  const u = findRow("Ujian", "ID", ujianId).row;
  const soal = getSheetData("Soal").filter(s => s.UjianID === ujianId);
  const peserta = getSheetData("Peserta").filter(p => p.UjianID === ujianId).map(p => {
    // Siswa yang masih mengerjakan: hitung nilai sementara (PG, esai, dan
    // totalnya) dari jawaban yang sudah tersimpan otomatis — jumlah benar
    // dikali bobot tiap soal — supaya guru bisa memantau langsung.
    let sementara = null, sementaraEsai = null, sementaraAkhir = null;
    if (p.Status === "mengerjakan" && p.UrutanJSON) {
      try {
        const urutan = JSON.parse(p.UrutanJSON);
        const jawaban = JSON.parse(p.JawabanJSON || "{}");
        let bobotBenarPG = 0, bobotPG = 0, bobotBenarEsai = 0, bobotEsai = 0, jumlahEsai = 0, esaiTanpaPedoman = 0;
        soal.forEach(s => {
          const b = bobotSoal(s);
          if (String(s.Tipe).toLowerCase() === "pg") {
            bobotPG += b;
            const item = urutan.find(x => x.no == s.No);
            const huruf = jawaban[s.No];
            if (item && huruf) {
              const idx = huruf.charCodeAt(0) - 65;
              if (item.map[idx] === s.Kunci) bobotBenarPG += b;
            }
          } else {
            jumlahEsai++; bobotEsai += b;
            const pedoman = String(s.Pedoman || "").trim();
            if (!pedoman) esaiTanpaPedoman++;
            else if (esaiCocok(jawaban[s.No], pedoman)) bobotBenarEsai += b;
          }
        });
        if (bobotPG > 0) sementara = bulat2((bobotBenarPG / bobotPG) * 100);
        if (jumlahEsai > 0 && esaiTanpaPedoman === 0) {
          sementaraEsai = bulat2((bobotBenarEsai / bobotEsai) * 100);
          sementaraAkhir = bulat2(((bobotBenarPG + bobotBenarEsai) / (bobotPG + bobotEsai)) * 100);
        } else if (jumlahEsai === 0) {
          sementaraAkhir = sementara;
        }
      } catch (e) { sementara = null; sementaraEsai = null; sementaraAkhir = null; }
    }
    return {
      kode: p.Kode, nis: p.NIS, nama: p.Nama, status: p.Status, pelanggaran: p.Pelanggaran,
      nilaiPG: p.NilaiPG === "" ? null : p.NilaiPG,
      nilaiEsai: p.NilaiEsai === "" ? null : p.NilaiEsai,
      nilaiAkhir: p.NilaiAkhir === "" ? null : p.NilaiAkhir,
      nilaiPGSementara: sementara,
      nilaiEsaiSementara: sementaraEsai,
      nilaiAkhirSementara: sementaraAkhir
    };
  });
  const nilais = peserta.map(x => parseFloat(x.nilaiAkhir)).filter(v => !isNaN(v));
  peserta.forEach(x => {
    const v = parseFloat(x.nilaiAkhir);
    x.peringkat = isNaN(v) ? null : 1 + nilais.filter(n => n > v).length;
  });
  return {ok: true, ujian: u, peserta: peserta};
}

function ambilJawabanEsai(ujianId, kode) {
  const p = findRow("Peserta", "Kode", kode).row;
  const soal = getSheetData("Soal").filter(s => s.UjianID === ujianId && s.Tipe === "esai");
  const jawaban = JSON.parse(p.JawabanJSON || "{}");
  const list = soal.map(s => ({
    no: s.No, teks: s.Teks, jawaban: jawaban[s.No] || "", pedoman: s.Pedoman
  }));
  return {ok: true, jawabanEsai: list};
}

function nilaiEsai(ujianId, kode, nilai) {
  const p = findRow("Peserta", "Kode", kode).row;
  const soal = getSheetData("Soal").filter(s => s.UjianID === ujianId);
  const nPG = p.NilaiPG !== "" ? parseFloat(p.NilaiPG) : null;
  const nEsai = Math.max(0, Math.min(100, parseFloat(nilai) || 0));
  const bPG = soal.filter(s => String(s.Tipe).toLowerCase() === "pg").reduce((a, s) => a + bobotSoal(s), 0);
  const bEsai = soal.filter(s => String(s.Tipe).toLowerCase() === "esai").reduce((a, s) => a + bobotSoal(s), 0);

  let nAkhir;
  if (bPG > 0 && bEsai > 0) nAkhir = bulat2(((nPG || 0) * bPG + nEsai * bEsai) / (bPG + bEsai));
  else if (bEsai > 0) nAkhir = nEsai;
  else nAkhir = nPG;

  updateRow("Peserta", "Kode", kode, {NilaiEsai: nEsai, NilaiAkhir: nAkhir});
  return {ok: true};
}

function deleteRowsWhere(sheetName, colName, value) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const idx = data[0].indexOf(colName);
  let n = 0;
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][idx] == value) { sheet.deleteRow(i + 1); n++; }
  }
  return n;
}

function resetPeserta(ujianId, kode) {
  const p = findRow("Peserta", "Kode", kode);
  if (!p || p.row.UjianID !== ujianId) return {ok: false, error: "PESERTA_TIDAK_DITEMUKAN"};
  updateRow("Peserta", "Kode", kode, {
    Status: "belum", Mulai: "", Kumpul: "", Pelanggaran: 0,
    UrutanJSON: "", JawabanJSON: "{}", NilaiPG: "", NilaiEsai: "", NilaiAkhir: ""
  });
  return {ok: true};
}

function hapusSoalUjian(ujianId) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error("LOCK_TIMEOUT");
  try {
    return {ok: true, terhapus: deleteRowsWhere("Soal", "UjianID", ujianId)};
  } finally {
    lock.releaseLock();
  }
}

function hapusUjian(ujianId) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error("LOCK_TIMEOUT");
  try {
    deleteRowsWhere("Soal", "UjianID", ujianId);
    deleteRowsWhere("Peserta", "UjianID", ujianId);
    deleteRowsWhere("Ujian", "ID", ujianId);
    return {ok: true};
  } finally {
    lock.releaseLock();
  }
}

function hapusSiswa(nis) {
  return {ok: true, terhapus: deleteRowsWhere("Siswa", "NIS", nis)};
}

function hapusSemuaSiswa(kelas) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error("LOCK_TIMEOUT");
  try {
    return {ok: true, terhapus: deleteRowsWhere("Siswa", "Kelas", kelas)};
  } finally {
    lock.releaseLock();
  }
}

function getNamaSekolah() {
  const nama = PropertiesService.getScriptProperties().getProperty("NAMA_SEKOLAH");
  return {ok: true, namaSekolah: nama || "Sekolahku"};
}

function setNamaSekolah(nama) {
  const bersih = String(nama || "").trim();
  if (!bersih) return {ok: false, error: "NAMA_KOSONG"};
  PropertiesService.getScriptProperties().setProperty("NAMA_SEKOLAH", bersih);
  return {ok: true, namaSekolah: bersih};
}

function getSheetData(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    // Kelas bisa tersimpan di Sheet sebagai angka (mis. 2) padahal web mengirim
    // teks ("2"); samakan selalu jadi teks supaya perbandingan persis cocok.
    if ((name === "Siswa" || name === "Ujian") && obj.Kelas !== undefined && obj.Kelas !== "") obj.Kelas = String(obj.Kelas);
    return obj;
  });
}

function findRow(sheetName, colName, value) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const colIdx = headers.indexOf(colName);
  for (let i = 1; i < values.length; i++) {
    if (values[i][colIdx] == value) {
      const obj = {};
      headers.forEach((h, j) => obj[h] = values[i][j]);
      return {row: obj, index: i + 1};
    }
  }
  return null;
}

function updateRow(sheetName, keyCol, keyValue, updates) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const keyIdx = headers.indexOf(keyCol);
  for (let i = 1; i < data.length; i++) {
    if (data[i][keyIdx] == keyValue) {
      for (let k in updates) {
        const colIdx = headers.indexOf(k);
        if (colIdx > -1) sheet.getRange(i + 1, colIdx + 1).setValue(updates[k]);
      }
      return true;
    }
  }
  return false;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
// ============================================================
// GAMBAR SOAL (Google Drive)
// Gambar yang diunggah guru disimpan ke folder "SiapUjian Gambar Soal"
// di Drive pemilik skrip, dibagikan sebagai "siapa pun yang memiliki
// tautan dapat melihat", dan yang disimpan di sheet Soal hanyalah
// tautannya. PENTING: pertama kali fungsi ini berjalan, Google meminta
// izin akses Drive — jalankan fungsi otorisasiDrive() sekali dari
// editor Apps Script dan setujui izinnya.
// ============================================================
function uploadGambar(nama, mime, dataBase64) {
  if (!dataBase64) return {ok: false, error: "DATA_KOSONG"};
  const folderNama = "SiapUjian Gambar Soal";
  const it = DriveApp.getFoldersByName(folderNama);
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder(folderNama);
  const blob = Utilities.newBlob(Utilities.base64Decode(dataBase64), mime || "image/jpeg", nama || "gambar-soal.jpg");
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const id = file.getId();
  return {ok: true, id: id, url: "https://drive.google.com/thumbnail?id=" + id + "&sz=w1200"};
}

// Jalankan fungsi ini SEKALI dari editor Apps Script (pilih nama fungsi
// "otorisasiDrive" lalu klik Run) supaya Google menampilkan permintaan
// izin akses Google Drive. Setelah disetujui, unggah gambar dari web
// akan berjalan tanpa hambatan.
function otorisasiDrive() {
  const it = DriveApp.getFoldersByName("SiapUjian Gambar Soal");
  if (!it.hasNext()) DriveApp.createFolder("SiapUjian Gambar Soal");
  Logger.log("Izin Drive OK. Folder gambar soal siap.");
}
