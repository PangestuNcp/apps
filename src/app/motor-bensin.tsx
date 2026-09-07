import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import db from '../database/database';

type Motor = {
  km_sekarang: number;
};

type Pengisian = {
  id: number;
  tanggal: string;
  km: number;
  liter: number;
  nominal: number;
};

function rupiah(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`;
}

function angka(n: number, digit = 2) {
  return n.toLocaleString('id-ID', {
    maximumFractionDigits: digit,
  });
}

function formatKM(km: number) {
  return km.toLocaleString('id-ID', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export default function MotorBensinScreen() {
  const router = useRouter();

  const [kmSekarang, setKmSekarang] = useState(0);
  const [riwayat, setRiwayat] = useState<Pengisian[]>([]);

  const [kmPengisian, setKmPengisian] = useState('');
  const [liter, setLiter] = useState('');
  const [nominal, setNominal] = useState('');

  const [akunBayar, setAkunBayar] = useState<
    'cash' | 'ovo' | 'seabank'
  >('cash');

  const loadData = useCallback(() => {
    const motor = db.getFirstSync<Motor>(`
      SELECT km_sekarang
      FROM motor
      WHERE id = 1
    `);

    if (motor) {
      setKmSekarang(motor.km_sekarang);
    }

    const data = db.getAllSync<Pengisian>(`
      SELECT
        id,
        tanggal,
        km,
        liter,
        nominal
      FROM bensin
      ORDER BY id DESC
    `);

    setRiwayat(data);

  }, []);
  

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  /*
   * Konsumsi dihitung berdasarkan dua pengisian terakhir.
   *
   * Contoh:
   * Pengisian pertama  : KM 10.000
   * Pengisian kedua    : KM 10.080
   * Liter pengisian kedua = 2
   *
   * Jarak = 80 KM
   * Konsumsi = 80 / 2 = 40 KM/liter
   */

  let konsumsiTerakhir: number | null = null;

  if (riwayat.length >= 2) {
    const terbaru = riwayat[0];
    const sebelumnya = riwayat[1];

    const jarak =
      terbaru.km - sebelumnya.km;

    if (
      jarak > 0 &&
      terbaru.liter > 0
    ) {
      konsumsiTerakhir =
        jarak / terbaru.liter;
    }
  }

  /*
   * Rata-rata konsumsi seluruh pengisian
   *
   * Kita tidak menghitung pengisian pertama karena
   * belum mempunyai jarak dari pengisian sebelumnya.
   */

  const konsumsiValid: number[] = [];

for (let i = 0; i < riwayat.length - 1; i++) {
  const sekarang = riwayat[i];
  const sebelumnya = riwayat[i + 1];

  const jarak = sekarang.km - sebelumnya.km;

  if (
    jarak > 0 &&
    sekarang.liter > 0
  ) {
    const konsumsi = jarak / sekarang.liter;

    if (
      Number.isFinite(konsumsi) &&
      konsumsi > 0
    ) {
      konsumsiValid.push(konsumsi);
    }
  }
}

const rataRata =
  konsumsiValid.length > 0
    ? konsumsiValid.reduce(
        (total, nilai) => total + nilai,
        0
      ) / konsumsiValid.length
    : null;

  function simpanBensin() {
    const kmBaru = Number(
      kmPengisian.replace(',', '.')
    );

    const jumlahLiter = Number(
      liter.replace(',', '.')
    );

    const harga = Number(
      nominal.replace(/\D/g, '')
    );

    if (!kmPengisian || !Number.isFinite(kmBaru) || kmBaru <= 0) {
      Alert.alert(
        'KM tidak valid',
        'Masukkan KM motor saat pengisian.'
      );
      return;
    }

    if (kmBaru < kmSekarang) {
      Alert.alert(
        'KM tidak valid',
        `KM pengisian tidak boleh lebih kecil dari KM motor saat ini (${formatKM(kmSekarang)} KM).`
      );
      return;
    }

    if (!jumlahLiter || jumlahLiter <= 0) {
      Alert.alert(
        'Jumlah liter salah',
        'Masukkan jumlah liter bensin.'
      );
      return;
    }

    if (!harga || harga <= 0) {
      Alert.alert(
        'Nominal salah',
        'Masukkan nominal pembelian bensin.'
      );
      return;
    }

    if (
      riwayat.length > 0 &&
      kmBaru < riwayat[0].km
    ) {
      Alert.alert(
        'KM tidak valid',
        'KM pengisian tidak boleh lebih kecil dari KM pengisian sebelumnya.'
      );
      return;
    }

    const saldo = db.getFirstSync<{
      cash: number;
      ovo: number;
      seabank: number;
    }>(`
      SELECT cash, ovo, seabank
      FROM saldo
      WHERE id = 1
    `);

    if (!saldo) {
      Alert.alert(
        'Saldo tidak ditemukan',
        'Data saldo belum tersedia.'
      );
      return;
    }

    const saldoAkun = saldo[akunBayar];

    if (saldoAkun < harga) {
      Alert.alert(
        'Saldo tidak cukup',
        `Saldo ${
          akunBayar === 'cash'
            ? 'Cash'
            : akunBayar === 'ovo'
              ? 'OVO'
              : 'SeaBank'
        } tidak cukup untuk membayar bensin.`
      );
      return;
    }

    const namaAkun =
      akunBayar === 'cash'
        ? 'Cash'
        : akunBayar === 'ovo'
          ? 'OVO'
          : 'SeaBank';

    const tanggal = new Date()
      .toISOString()
      .slice(0, 10);

    db.withTransactionSync(() => {
      // Kurangi saldo akun pembayaran
      db.runSync(
        `
        UPDATE saldo
        SET ${akunBayar} = ${akunBayar} - ?
        WHERE id = 1
        `,
        [harga]
      );

      // Update KM motor
      db.runSync(
        `
        UPDATE motor
        SET
          km_sekarang = ?,
          km_terakhir_update = ?,
          tanggal_update_terakhir = ?
        WHERE id = 1
        `,
        [kmBaru, kmBaru, tanggal]
      );

      // Simpan riwayat KM
      db.runSync(
        `
        INSERT INTO riwayat_km
        (
          tanggal,
          km
        )
        VALUES (?, ?)
        `,
        [tanggal, kmBaru]
      );

      // Simpan pengisian bensin
      db.runSync(
        `
        INSERT INTO bensin
        (
          tanggal,
          km,
          liter,
          nominal
        )
        VALUES (?, ?, ?, ?)
        `,
        [
          tanggal,
          kmBaru,
          jumlahLiter,
          harga,
        ]
      );

      // Simpan transaksi pengeluaran
      db.runSync(
        `
        INSERT INTO transaksi
        (
          tanggal,
          jenis,
          subjenis,
          keterangan,
          nominal
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          tanggal,
          'pengeluaran',
          'bensin',
          `Pembelian bensin - ${namaAkun}`,
          harga,
        ]
      );
    });

    setKmPengisian('');
    setLiter('');
    setNominal('');

    Alert.alert(
      'Berhasil',
      `Pengisian bensin dicatat pada KM ${formatKM(kmBaru)}.`
    );

    loadData();
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* HEADER */}

        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
          >
            <Text style={styles.back}>
              ‹
            </Text>
          </Pressable>

          <View>
            <Text style={styles.title}>
              Bensin
            </Text>

            <Text style={styles.subtitle}>
              Catat penggunaan dan konsumsi bensin
            </Text>
          </View>
        </View>

        {/* KM SAAT INI */}

        <View style={styles.kmCard}>
          <Text style={styles.label}>
            KM MOTOR SAAT INI
          </Text>

          <Text style={styles.kmValue}>
            {formatKM(kmSekarang)} KM
          </Text>

          <Text style={styles.info}>
            KM otomatis mengikuti data motor.
          </Text>
        </View>

        {/* KONSUMSI */}

        <View style={styles.statsCard}>

          <Text style={styles.statsTitle}>
            Konsumsi Bensin
          </Text>

          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>
                Terakhir
              </Text>

              <Text style={styles.statValue}>
                {konsumsiTerakhir !== null
                  ? `${angka(konsumsiTerakhir)} KM/L`
                  : '-'}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>
                Rata-rata
              </Text>

              <Text style={styles.statValue}>
                {rataRata !== null
                  ? `${angka(rataRata)} KM/L`
                  : '-'}
              </Text>
            </View>
          </View>

          {riwayat.length < 2 && (
            <Text style={styles.statsInfo}>
              Konsumsi akan dihitung setelah ada
              minimal dua kali pengisian.
            </Text>
          )}

        </View>

        {/* FORM */}

        <View style={styles.formCard}>

          <Text style={styles.formTitle}>
            Catat Pengisian
          </Text>

          <Text style={styles.formInfo}>
            Masukkan KM motor saat pengisian bensin.
            KM akan menjadi KM motor terbaru.
          </Text>

          <Text style={styles.inputLabel}>
            KM saat pengisian
          </Text>

          <TextInput
            style={styles.input}
            placeholder={`Contoh: ${formatKM(kmSekarang)}`}
            keyboardType="decimal-pad"
            value={kmPengisian}
            onChangeText={setKmPengisian}
          />

          <Text style={styles.inputLabel}>
            Jumlah liter
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Contoh: 2.5"
            keyboardType="decimal-pad"
            value={liter}
            onChangeText={setLiter}
          />

          <Text style={styles.inputLabel}>
            Nominal pembelian
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Contoh: 25000"
            keyboardType="numeric"
            value={nominal}
            onChangeText={setNominal}
          />

          <Text style={styles.inputLabel}>
            Bayar dari
          </Text>

          <View style={styles.accountRow}>
            {[
              { key: 'cash', label: 'Cash' },
              { key: 'ovo', label: 'OVO' },
              { key: 'seabank', label: 'SeaBank' },
            ].map((akun) => (
              <Pressable
                key={akun.key}
                style={[
                  styles.accountButton,
                  akunBayar === akun.key &&
                    styles.accountButtonActive,
                ]}
                onPress={() =>
                  setAkunBayar(
                    akun.key as 'cash' | 'ovo' | 'seabank'
                  )
                }
              >
                <Text
                  style={[
                    styles.accountButtonText,
                    akunBayar === akun.key &&
                      styles.accountButtonTextActive,
                  ]}
                >
                  {akun.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={styles.button}
            onPress={simpanBensin}
          >
            <Text style={styles.buttonText}>
              Simpan Pengisian
            </Text>
          </Pressable>

        </View>

        {/* RIWAYAT */}

        <Text style={styles.sectionTitle}>
          Riwayat Pengisian
        </Text>

        {riwayat.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              Belum ada pengisian
            </Text>

            <Text style={styles.emptyText}>
              Riwayat pengisian bensin akan muncul
              di sini.
            </Text>
          </View>
        ) : (
          riwayat.map((item, index) => {

            let konsumsi: number | null = null;

            if (index < riwayat.length - 1) {
              const sebelumnya =
                riwayat[index + 1];

              const jarak =
                item.km - sebelumnya.km;

              if (
                jarak > 0 &&
                item.liter > 0
              ) {
                konsumsi =
                  jarak / item.liter;
              }
            }

            return (
              <View
                key={item.id}
                style={styles.historyCard}
              >

                <View style={styles.historyHeader}>
                  <Text style={styles.historyDate}>
                    {item.tanggal}
                  </Text>

                  <Text style={styles.historyKm}>
                    KM {formatKM(item.km)}
                  </Text>
                </View>

                <View style={styles.historyRow}>
                  <Text style={styles.historyLabel}>
                    Bensin
                  </Text>

                  <Text style={styles.historyValue}>
                    {angka(item.liter, 2)} Liter
                  </Text>
                </View>

                <View style={styles.historyRow}>
                  <Text style={styles.historyLabel}>
                    Harga
                  </Text>

                  <Text style={styles.historyValue}>
                    {rupiah(item.nominal)}
                  </Text>
                </View>

                {konsumsi !== null && (
                  <View style={styles.consumptionBox}>
                    <Text style={styles.consumptionLabel}>
                      Konsumsi
                    </Text>

                    <Text style={styles.consumptionValue}>
                      {angka(konsumsi)} KM/L
                    </Text>
                  </View>
                )}

              </View>
            );
          })
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },

  back: {
    fontSize: 42,
    lineHeight: 42,
    marginRight: 15,
    color: '#333',
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
  },

  subtitle: {
    marginTop: 4,
    color: '#68707D',
    fontSize: 14,
  },

  kmCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    marginBottom: 15,
    elevation: 3,
  },

  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#777',
  },

  kmValue: {
    marginTop: 8,
    fontSize: 34,
    fontWeight: '800',
  },

  info: {
    marginTop: 6,
    fontSize: 12,
    color: '#888',
  },

  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
  },

  statsTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 18,
  },

  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  statItem: {
    flex: 1,
  },

  divider: {
    width: 1,
    height: 45,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 15,
  },

  statLabel: {
    fontSize: 12,
    color: '#777',
  },

  statValue: {
    marginTop: 5,
    fontSize: 18,
    fontWeight: '800',
  },

  statsInfo: {
    marginTop: 15,
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
  },

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
    elevation: 2,
  },

  formTitle: {
    fontSize: 18,
    fontWeight: '800',
  },

  formInfo: {
    marginTop: 6,
    marginBottom: 18,
    color: '#777',
    fontSize: 12,
    lineHeight: 18,
  },

  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#777',
    marginBottom: 7,
  },

  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 18,
  },

  button: {
    backgroundColor: '#222',
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },

  emptyText: {
    marginTop: 5,
    fontSize: 13,
    color: '#888',
  },

  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    elevation: 1,
  },

  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  historyDate: {
    fontSize: 13,
    color: '#777',
  },

  historyKm: {
    fontSize: 13,
    fontWeight: '800',
  },

  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },

  historyLabel: {
    fontSize: 13,
    color: '#777',
  },

  historyValue: {
    fontSize: 13,
    fontWeight: '700',
  },

  consumptionBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  consumptionLabel: {
    fontSize: 12,
    color: '#777',
  },

  consumptionValue: {
    fontSize: 14,
    fontWeight: '800',
  },

  accountRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },

  accountButton: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  accountButtonActive: {
    backgroundColor: '#222',
    borderColor: '#222',
  },

  accountButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555',
  },

  accountButtonTextActive: {
    color: '#FFFFFF',
  },
});