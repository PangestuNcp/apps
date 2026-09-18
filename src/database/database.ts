import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('saldoku.db');

export function initDatabase() {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS saldo (
      id INTEGER PRIMARY KEY NOT NULL,
      cash INTEGER NOT NULL DEFAULT 0,
      dompet_grab INTEGER NOT NULL DEFAULT 0,
      ovo INTEGER NOT NULL DEFAULT 0,
      seabank INTEGER NOT NULL DEFAULT 0,
      kredit_grab INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transaksi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanggal TEXT NOT NULL,
      jenis TEXT NOT NULL,
      subjenis TEXT,
      keterangan TEXT,
      nominal INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS saldo_awal_bulan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bulan TEXT NOT NULL,
      cash INTEGER NOT NULL DEFAULT 0,
      dompet_grab INTEGER NOT NULL DEFAULT 0,
      ovo INTEGER NOT NULL DEFAULT 0,
      seabank INTEGER NOT NULL DEFAULT 0,
      kredit_grab INTEGER NOT NULL DEFAULT 0,
      total_aset INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS motor (
      id INTEGER PRIMARY KEY NOT NULL,
      km_sekarang INTEGER NOT NULL DEFAULT 0,
      km_terakhir_update INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS riwayat_km (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanggal TEXT NOT NULL,
      km INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS oli (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanggal TEXT NOT NULL,
      km_penggantian INTEGER NOT NULL,
      nominal INTEGER NOT NULL,
      interval_km INTEGER NOT NULL,
      km_berikutnya INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bensin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanggal TEXT NOT NULL,
      km INTEGER NOT NULL,
      liter REAL NOT NULL,
      nominal INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS riwayat_kredit_grab (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanggal TEXT NOT NULL,
      sumber TEXT NOT NULL,
      nominal INTEGER NOT NULL,
      biaya_admin INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS audit_bulan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bulan TEXT NOT NULL,
      tanggal_mulai TEXT NOT NULL,
      tanggal_selesai TEXT NOT NULL,
      opening_cash INTEGER NOT NULL DEFAULT 0,
      opening_dompet_grab INTEGER NOT NULL DEFAULT 0,
      opening_ovo INTEGER NOT NULL DEFAULT 0,
      opening_seabank INTEGER NOT NULL DEFAULT 0,
      opening_kredit_grab INTEGER NOT NULL DEFAULT 0,
      pendapatan INTEGER NOT NULL DEFAULT 0,
      tips INTEGER NOT NULL DEFAULT 0,
      pengeluaran INTEGER NOT NULL DEFAULT 0,
      pendapatan_bersih INTEGER NOT NULL DEFAULT 0,
      closing_cash INTEGER NOT NULL DEFAULT 0,
      closing_dompet_grab INTEGER NOT NULL DEFAULT 0,
      closing_ovo INTEGER NOT NULL DEFAULT 0,
      closing_seabank INTEGER NOT NULL DEFAULT 0,
      closing_kredit_grab INTEGER NOT NULL DEFAULT 0,
      total_aset INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Migrasi aman untuk database lama:
  // menambahkan deskripsi tanpa menghapus transaksi yang sudah ada.
    // Migrasi aman untuk database lama:
  // menambahkan kolom deskripsi tanpa menghapus transaksi yang sudah ada.
  const kolomTransaksi = db.getAllSync<{ name: string }>(
    'PRAGMA table_info(transaksi)'
  );

  const punyaDeskripsi = kolomTransaksi.some(
    (kolom) => kolom.name === 'deskripsi'
  );

  if (!punyaDeskripsi) {
    db.execSync(`
      ALTER TABLE transaksi
      ADD COLUMN deskripsi TEXT;
    `);
  }

  const saldoAda = db.getFirstSync<{ id: number }>(
    'SELECT id FROM saldo WHERE id = 1'
  );

  if (!saldoAda) {
    db.runSync(`
      INSERT INTO saldo (
        id, cash, dompet_grab, ovo, seabank, kredit_grab
      ) VALUES (1, 0, 0, 0, 0, 0)
    `);
  }

  const motorAda = db.getFirstSync<{ id: number }>(
    'SELECT id FROM motor WHERE id = 1'
  );

  if (!motorAda) {
    db.runSync(`
      INSERT INTO motor (
        id, km_sekarang, km_terakhir_update
      ) VALUES (1, 0, 0)
    `);
  }
}

export default db;
