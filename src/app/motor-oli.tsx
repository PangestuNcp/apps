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

type OliTerakhir = {
  tanggal: string;
  km_penggantian: number;
  nominal: number;
  interval_km: number;
  km_berikutnya: number;
};

type RiwayatOli = {
  id: number;
  tanggal: string;
  km_penggantian: number;
  nominal: number;
  interval_km: number;
  km_berikutnya: number;
};

const INTERVAL_DEFAULT = 2000;

function rupiah(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`;
}

function formatKM(km: number) {
  return km.toLocaleString('id-ID', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export default function MotorOliScreen() {
  const router = useRouter();

  const [kmSekarang, setKmSekarang] = useState(0);

  const [oliTerakhir, setOliTerakhir] =
    useState<OliTerakhir | null>(null);

  const [riwayat, setRiwayat] =
    useState<RiwayatOli[]>([]);

  const [nominal, setNominal] = useState('');

  const [kmPenggantian, setKmPenggantian] = useState('');

  const [akunBayar, setAkunBayar] = useState<
    'cash' | 'ovo' | 'seabank'
  >('cash');

  const [interval, setInterval] = useState(
    String(INTERVAL_DEFAULT)
  );

  const loadData = useCallback(() => {
    const motor = db.getFirstSync<Motor>(`
      SELECT km_sekarang
      FROM motor
      WHERE id = 1
    `);

    if (motor) {
      setKmSekarang(motor.km_sekarang);
    }

    const terakhir =
      db.getFirstSync<OliTerakhir>(`
        SELECT
          tanggal,
          km_penggantian,
          nominal,
          interval_km,
          km_berikutnya
        FROM oli
        ORDER BY id DESC
        LIMIT 1
      `);

    setOliTerakhir(terakhir ?? null);

    const history =
      db.getAllSync<RiwayatOli>(`
        SELECT
          id,
          tanggal,
          km_penggantian,
          nominal,
          interval_km,
          km_berikutnya
        FROM oli
        ORDER BY id DESC
      `);

    setRiwayat(history);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  function simpanOli() {
    const kmBaru = Number(
      kmPenggantian.replace(',', '.')
    );

    const harga = Number(
      nominal.replace(/\D/g, '')
    );

    const intervalKm = Number(
      interval.replace(/\D/g, '')
    );

    if (
      !kmPenggantian ||
      !Number.isFinite(kmBaru) ||
      kmBaru <= 0
    ) {
      Alert.alert(
        'KM tidak valid',
        'Masukkan KM motor saat penggantian oli.'
      );
      return;
    }

    if (kmBaru < kmSekarang) {
      Alert.alert(
        'KM tidak valid',
        `KM penggantian tidak boleh lebih kecil dari KM motor saat ini (${formatKM(kmSekarang)} KM).`
      );
      return;
    }

    if (!harga || harga <= 0) {
      Alert.alert(
        'Nominal salah',
        'Masukkan harga pembelian oli.'
      );
      return;
    }

    if (!intervalKm || intervalKm <= 0) {
      Alert.alert(
        'Interval salah',
        'Masukkan interval penggantian oli dalam KM.'
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
        } tidak cukup untuk membayar oli.`
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

    const kmBerikutnya =
      kmBaru + intervalKm;

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

      // Simpan penggantian oli
      db.runSync(
        `
        INSERT INTO oli
        (
          tanggal,
          km_penggantian,
          nominal,
          interval_km,
          km_berikutnya
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          tanggal,
          kmBaru,
          harga,
          intervalKm,
          kmBerikutnya,
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
          'oli',
          `Penggantian oli mesin + gardan - ${namaAkun}`,
          harga,
        ]
      );
    });

    setKmPenggantian('');
    setNominal('');

    Alert.alert(
      'Berhasil',
      `Penggantian oli mesin + gardan dicatat pada KM ${formatKM(
        kmBaru
      )}.\n\nPenggantian berikutnya: KM ${formatKM(
        kmBerikutnya
      )}.`
    );

    loadData();
  }

  const sisaKm = oliTerakhir
    ? oliTerakhir.km_berikutnya - kmSekarang
    : null;

  const sudahWaktunya =
    sisaKm !== null && sisaKm <= 0;

  const mendekati =
    sisaKm !== null &&
    sisaKm > 0 &&
    sisaKm <= 300;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹</Text>
          </Pressable>

          <View>
            <Text style={styles.title}>
              Oli Motor
            </Text>

            <Text style={styles.subtitle}>
              Oli mesin + oli gardan
            </Text>
          </View>
        </View>

        <View style={styles.currentCard}>
          <Text style={styles.label}>
            KM MOTOR SAAT INI
          </Text>

          <Text style={styles.currentKm}>
            {formatKM(kmSekarang)} KM
          </Text>

          <Text style={styles.info}>
            KM diambil dari data motor.
          </Text>
        </View>

        {oliTerakhir ? (
          <View style={styles.statusCard}>

            <Text style={styles.statusTitle}>
              Status Oli
            </Text>

            <Text style={styles.statusText}>
              Penggantian terakhir
            </Text>

            <Text style={styles.statusKm}>
              KM {formatKM(
                oliTerakhir.km_penggantian
              )}
            </Text>

            <Text style={styles.nextText}>
              Target berikutnya
            </Text>

            <Text style={styles.nextKm}>
              KM {formatKM(
                oliTerakhir.km_berikutnya
              )}
            </Text>

            {sudahWaktunya && (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>
                  PERLU GANTI OLI
                </Text>

                <Text style={styles.warningText}>
                  Jadwal penggantian oli sudah tercapai.
                </Text>
              </View>
            )}

            {mendekati && (
              <View style={styles.nearBox}>
                <Text style={styles.nearTitle}>
                  SEGERA GANTI OLI
                </Text>

                <Text style={styles.nearText}>
                  Sisa sekitar {formatKM(sisaKm!)} KM.
                </Text>
              </View>
            )}

            {!sudahWaktunya &&
              !mendekati &&
              sisaKm !== null && (
                <View style={styles.normalBox}>
                  <Text style={styles.normalText}>
                    Sisa {formatKM(sisaKm)} KM
                  </Text>
                </View>
              )}

          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              Belum ada data oli
            </Text>

            <Text style={styles.emptyText}>
              Catat penggantian oli pertama Anda di bawah.
            </Text>
          </View>
        )}

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            Catat Penggantian Oli
          </Text>

          <Text style={styles.formInfo}>
            Masukkan KM motor saat penggantian oli.
            KM akan menjadi KM motor terbaru.
          </Text>

          <Text style={styles.label}>
            KM saat penggantian
          </Text>

          <TextInput
            style={styles.input}
            placeholder={`Contoh: ${formatKM(kmSekarang)}`}
            keyboardType="decimal-pad"
            value={kmPenggantian}
            onChangeText={setKmPenggantian}
          />

          <Text style={styles.label}>
            Harga oli
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Contoh: 75000"
            keyboardType="numeric"
            value={nominal}
            onChangeText={setNominal}
          />

          <Text style={styles.label}>
            Interval penggantian (KM)
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Contoh: 2000"
            keyboardType="numeric"
            value={interval}
            onChangeText={setInterval}
          />
          <Text style={styles.label}>
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
            onPress={simpanOli}
          >
            <Text style={styles.buttonText}>
              Simpan Penggantian Oli
            </Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>
          Riwayat Oli
        </Text>

        {riwayat.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Belum ada riwayat penggantian oli.
            </Text>
          </View>
        ) : (
          riwayat.map((item) => (
            <View
              key={item.id}
              style={styles.historyCard}
            >
              <View style={styles.historyTop}>
                <Text style={styles.historyTitle}>
                  Oli mesin + gardan
                </Text>

                <Text style={styles.historyDate}>
                  {item.tanggal}
                </Text>
              </View>

              <Text style={styles.historyKm}>
                Diganti pada KM {formatKM(
                  item.km_penggantian
                )}
              </Text>

              <Text style={styles.historyPrice}>
                {rupiah(item.nominal)}
              </Text>

              <Text style={styles.historyNext}>
                Berikutnya KM {formatKM(
                  item.km_berikutnya
                )}
              </Text>
            </View>
          ))
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

  currentCard: {
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
    marginBottom: 8,
  },

  currentKm: {
    fontSize: 32,
    fontWeight: '800',
  },

  info: {
    marginTop: 6,
    fontSize: 12,
    color: '#888',
  },

  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    marginBottom: 15,
    elevation: 2,
  },

  statusTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 15,
  },

  statusText: {
    fontSize: 13,
    color: '#777',
  },

  statusKm: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '800',
  },

  nextText: {
    marginTop: 15,
    fontSize: 13,
    color: '#777',
  },

  nextKm: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: '800',
  },

  warningBox: {
    marginTop: 18,
    padding: 15,
    borderRadius: 14,
    backgroundColor: '#FFE9E6',
  },

  warningTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#B42318',
  },

  warningText: {
    marginTop: 5,
    color: '#8B2C25',
    fontSize: 13,
  },

  nearBox: {
    marginTop: 18,
    padding: 15,
    borderRadius: 14,
    backgroundColor: '#FFF4D6',
  },

  nearTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#8A5A00',
  },

  nearText: {
    marginTop: 5,
    color: '#795200',
    fontSize: 13,
  },

  normalBox: {
    marginTop: 18,
    padding: 15,
    borderRadius: 14,
    backgroundColor: '#F0F2F5',
  },

  normalText: {
    fontSize: 14,
    fontWeight: '700',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    marginBottom: 15,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
  },

  emptyText: {
    color: '#888',
    fontSize: 13,
    lineHeight: 19,
  },

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
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

  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 18,
    marginBottom: 10,
    elevation: 1,
  },

  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  historyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },

  historyDate: {
    fontSize: 12,
    color: '#888',
  },

  historyKm: {
    marginTop: 10,
    fontSize: 13,
    color: '#555',
  },

  historyPrice: {
    marginTop: 5,
    fontSize: 16,
    fontWeight: '800',
  },

  historyNext: {
    marginTop: 5,
    fontSize: 12,
    color: '#777',
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