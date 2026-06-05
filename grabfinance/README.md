# 🚗 GrabFinance — Manajer Keuangan Grab

Aplikasi manajemen keuangan operasional Grab berbasis web (PWA),
sinkron real-time antar perangkat via Google Sheets.

---

## 📁 Struktur File

```
grabfinance/
├── index.html                  ← Entry point HTML
├── netlify.toml                ← Konfigurasi Netlify
├── package.json                ← Dependensi project
├── vite.config.js              ← Konfigurasi build + PWA
├── google-apps-script.js       ← Kode backend (upload ke Apps Script)
├── public/
│   └── icons/
│       ├── icon-192.png        ← Icon PWA (buat manual, lihat panduan)
│       └── icon-512.png        ← Icon PWA besar
└── src/
    ├── main.jsx                ← Entry point React
    └── App.jsx                 ← Aplikasi utama ← EDIT APPS_SCRIPT_URL DI SINI
```

---

## 🚀 Langkah Setup Lengkap

### TAHAP 1 — Google Sheets

1. Buka https://drive.google.com
2. Klik **+ Baru → Google Spreadsheet**
3. Beri nama: `KeuanganGrab`
4. Ambil ID dari URL:
   ```
   https://docs.google.com/spreadsheets/d/[INI_ID_NYA]/edit
   ```

---

### TAHAP 2 — Google Apps Script

1. Buka https://script.google.com
2. Klik **+ Proyek baru**
3. Hapus kode default, tempel isi `google-apps-script.js`
4. Ganti baris:
   ```js
   const SPREADSHEET_ID = 'GANTI_DENGAN_ID_SPREADSHEET_ANDA';
   ```
5. Simpan (Ctrl+S), beri nama proyek: `KeuanganGrab-API`
6. Klik **Deploy → Deployment baru**
   - Jenis: Aplikasi web
   - Jalankan sebagai: Saya
   - Akses: Semua orang
7. Klik Deploy → Izinkan akses → **Copy URL**

---

### TAHAP 3 — Edit App.jsx

Buka `src/App.jsx`, cari baris ini (paling atas):
```js
const APPS_SCRIPT_URL = "GANTI_DENGAN_URL_APPS_SCRIPT_ANDA";
```
Ganti dengan URL dari Tahap 2.

---

### TAHAP 4 — Buat Icon PWA

Buat 2 file gambar icon (logo mobil/Grab) dan simpan di `public/icons/`:
- `icon-192.png` ukuran 192×192 pixel
- `icon-512.png` ukuran 512×512 pixel

Bisa buat gratis di: https://realfavicongenerator.net

---

### TAHAP 5 — Upload ke GitHub

1. Daftar di https://github.com
2. Buat repository baru bernama `grabfinance` (Public)
3. Upload semua file ini (kecuali `google-apps-script.js`, itu hanya untuk Apps Script)
4. Commit changes

---

### TAHAP 6 — Deploy ke Netlify

1. Buka https://netlify.com → Sign up with GitHub
2. Klik **Add new site → Import an existing project**
3. Pilih repository `grabfinance`
4. Build settings sudah otomatis terbaca dari `netlify.toml`
5. Klik **Deploy site**
6. Tunggu 1-2 menit → dapat URL permanen

---

## ✅ Fitur Aplikasi

| Fitur | Keterangan |
|-------|-----------|
| 💰 Input Pemasukan | Tanggal, uraian, jumlah |
| 💸 Input Pengeluaran | Kategori: Operasional / Maintenance / Cicilan |
| 📋 Laporan | Filter per bulan / tahun / semua, otomatis real-time |
| 📊 Analitik & BI | Grafik tren, prediksi hari ramai, KPI |
| 📥 Export Excel | Download .xlsx langsung dari browser |
| 📲 PWA | Bisa diinstall di HP seperti aplikasi biasa |
| ☁️ Sinkron | Data sama di semua perangkat via Google Sheets |

---

## 📱 Cara Install PWA di HP

**Android (Chrome):**
1. Buka URL aplikasi di Chrome
2. Muncul notifikasi "Tambahkan ke layar utama" → Tap Install
3. Atau: Menu ⋮ → "Tambahkan ke layar utama"

**iPhone (Safari):**
1. Buka URL aplikasi di Safari
2. Tap ikon Share (kotak dengan panah ke atas)
3. Pilih "Tambahkan ke Layar Utama"
4. Tap "Tambah"

---

## 🔄 Update Aplikasi

Setiap kali edit kode dan push ke GitHub → Netlify otomatis rebuild dan deploy.
Tidak perlu langkah manual apapun.
