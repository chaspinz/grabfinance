// ================================================================
// GOOGLE APPS SCRIPT — GrabFinance Backend API
// ================================================================
// CARA SETUP:
// 1. Buka https://script.google.com
// 2. Klik "+ Proyek baru"
// 3. Hapus semua kode default
// 4. Tempel SELURUH kode ini
// 5. Ganti SPREADSHEET_ID di bawah dengan ID spreadsheet Anda
// 6. Klik Deploy > Deployment baru > Aplikasi web
//    - Jalankan sebagai: Saya
//    - Siapa yg punya akses: Semua orang
// 7. Copy URL yang muncul → tempel ke src/App.jsx (APPS_SCRIPT_URL)
// ================================================================

const SPREADSHEET_ID = '15ifwPIvDVEhCOfRhvIkLIB0zSxyR1GxeJ3tKvXYmUc0';

// ─── Sheet helpers ───────────────────────────────────────────────
function getOrCreate(name, headers) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    // Style header
    const hRange = sheet.getRange(1, 1, 1, headers.length);
    hRange.setBackground('#1a1a2e');
    hRange.setFontColor('#38bdf8');
    hRange.setFontWeight('bold');
  }
  return sheet;
}

function getData(sheetName, headers) {
  const sheet = getOrCreate(sheetName, headers);
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const hdrs = rows[0];
  return rows.slice(1)
    .filter(row => row[0] !== '') // skip empty rows
    .map(row => {
      const obj = {};
      hdrs.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
}

function generateId() {
  return new Date().getTime().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ─── CORS Headers ────────────────────────────────────────────────
function corsResponse(data) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ─── GET Handler ─────────────────────────────────────────────────
function doGet(e) {
  const action = e.parameter.action;
  let result;

  try {
    if (action === 'getAll') {
      result = {
        pemasukan: getData('Pemasukan', ['ID','Tanggal','Uraian','Jumlah','Timestamp']),
        pengeluaran: getData('Pengeluaran', ['ID','Tanggal','Kategori','Uraian','Jumlah','Timestamp'])
      };
    } else if (action === 'getPemasukan') {
      result = getData('Pemasukan', ['ID','Tanggal','Uraian','Jumlah','Timestamp']);
    } else if (action === 'getPengeluaran') {
      result = getData('Pengeluaran', ['ID','Tanggal','Kategori','Uraian','Jumlah','Timestamp']);
    } else if (action === 'ping') {
      result = { status: 'ok', time: new Date().toISOString() };
    } else {
      result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.toString() };
  }

  return corsResponse(result);
}

// ─── POST Handler ─────────────────────────────────────────────────
function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch {
    return corsResponse({ error: 'Invalid JSON' });
  }

  const action = data.action;
  let result;

  try {
    if (action === 'addPemasukan') {
      result = addPemasukan(data.payload);
    } else if (action === 'addPengeluaran') {
      result = addPengeluaran(data.payload);
    } else if (action === 'deletePemasukan') {
      result = deleteRow('Pemasukan', data.id);
    } else if (action === 'deletePengeluaran') {
      result = deleteRow('Pengeluaran', data.id);
    } else if (action === 'updatePemasukan') {
      result = updatePemasukan(data.id, data.payload);
    } else if (action === 'updatePengeluaran') {
      result = updatePengeluaran(data.id, data.payload);
    } else {
      result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.toString() };
  }

  return corsResponse(result);
}

// ─── CRUD Operations ──────────────────────────────────────────────
function addPemasukan(p) {
  const sheet = getOrCreate('Pemasukan', ['ID','Tanggal','Uraian','Jumlah','Timestamp']);
  const id = generateId();
  sheet.appendRow([id, p.tanggal, p.uraian, parseFloat(p.jumlah), new Date().toISOString()]);
  return { success: true, id };
}

function addPengeluaran(p) {
  const sheet = getOrCreate('Pengeluaran', ['ID','Tanggal','Kategori','Uraian','Jumlah','Timestamp']);
  const id = generateId();
  sheet.appendRow([id, p.tanggal, p.kategori, p.uraian, parseFloat(p.jumlah), new Date().toISOString()]);
  return { success: true, id };
}

function deleteRow(sheetName, id) {
  const sheet = getOrCreate(sheetName, []);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { error: 'Row not found: ' + id };
}

function updatePemasukan(id, p) {
  const sheet = getOrCreate('Pemasukan', ['ID','Tanggal','Uraian','Jumlah','Timestamp']);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      if (p.tanggal) sheet.getRange(i+1, 2).setValue(p.tanggal);
      if (p.uraian)  sheet.getRange(i+1, 3).setValue(p.uraian);
      if (p.jumlah)  sheet.getRange(i+1, 4).setValue(parseFloat(p.jumlah));
      return { success: true };
    }
  }
  return { error: 'Not found' };
}

function updatePengeluaran(id, p) {
  const sheet = getOrCreate('Pengeluaran', ['ID','Tanggal','Kategori','Uraian','Jumlah','Timestamp']);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      if (p.tanggal)  sheet.getRange(i+1, 2).setValue(p.tanggal);
      if (p.kategori) sheet.getRange(i+1, 3).setValue(p.kategori);
      if (p.uraian)   sheet.getRange(i+1, 4).setValue(p.uraian);
      if (p.jumlah)   sheet.getRange(i+1, 5).setValue(parseFloat(p.jumlah));
      return { success: true };
    }
  }
  return { error: 'Not found' };
}
