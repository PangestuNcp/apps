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

const sumber = [
  { key: 'dompet_grab', label: 'Dompet Grab' },
  { key: 'ovo', label: 'OVO' },
] as const;

type SumberKey = (typeof sumber)[number]['key'];

type Saldo = {
  dompet_grab: number;
  ovo: number;
  kredit_grab: number;
};

type RiwayatTopUp = {
  id: number;
  tanggal: string;
  sumber: string;
  nominal: number;
  biaya_admin: number;
};

function formatRupiah(nominal: number) {
  return `Rp${nominal.toLocaleString('id-ID')}`;
}

export default function KreditGrabScreen() {
  const router = useRouter();

  const [saldo, setSaldo] = useState<Saldo>({
    dompet_grab: 0,
    ovo: 0,
    kredit_grab: 0,
  });

  const [sumberDipilih, setSumberDipilih] =
    useState<SumberKey>('dompet_grab');

  const [nominal, setNominal] = useState('');
  const [riwayat, setRiwayat] = useState<RiwayatTopUp[]>([]);

  const loadData = useCallback(() => {
    const data = db.getFirstSync<Saldo>(`
      SELECT
        dompet_grab,
        ovo,
        kredit_grab
      FROM saldo
      WHERE id = 1
    `);

    if (data) {
      setSaldo(data);
    }

    const history = db.getAllSync<RiwayatTopUp>(`
      SELECT
        id,
        tanggal,
        sumber,
        nominal,
        biaya_admin
      FROM riwayat_kredit_grab
      ORDER BY id DESC
      LIMIT 20
    `);

    setRiwayat(history);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  function simpanTopUp() {
    const nilai = Number(nominal.replace(/\D/g, ''));

    if (!nilai || nilai <= 0) {
      Alert.alert(
        'Nominal salah',
        'Masukkan nominal top up yang benar.'
      );
      return;
    }

    const biayaAdmin =
      sumberDipilih === 'ovo' ? 1000 : 0;

    const totalPotong = nilai + biayaAdmin;

    const saldoSumber =
      sumberDipilih === 'ovo'
        ? saldo.ovo
        : saldo.dompet_grab;

    if (saldoSumber < totalPotong) {
      const namaSumber =
        sumberDipilih === 'ovo'
          ? 'OVO'
          : 'Dompet Grab';

      Alert.alert(
        'Saldo tidak cukup',
        `Saldo ${namaSumber} tidak mencukupi.\n\n` +
          `Dibutuhkan ${formatRupiah(totalPotong)}, ` +
          `saldo tersedia ${formatRupiah(saldoSumber)}.`
      );
      return;
    }

    const tanggal = new Date()
      .toISOString()
      .slice(0, 10);

    const namaSumber =
      sumberDipilih === 'ovo'
        ? 'OVO'
        : 'Dompet Grab';

    db.withTransactionSync(() => {
      if (sumberDipilih === 'dompet_grab') {
        db.runSync(
          `
          UPDATE saldo
          SET dompet_grab = dompet_grab - ?
          WHERE id = 1
          `,
          [nilai]
        );
      } else {
        db.runSync(
          `
          UPDATE saldo
          SET ovo = ovo - ?
          WHERE id = 1
          `,
          [totalPotong]
        );
      }

      db.runSync(
        `
        UPDATE saldo
        SET kredit_grab = kredit_grab + ?
        WHERE id = 1
        `,
        [nilai]
      );

      db.runSync(
        `
        INSERT INTO riwayat_kredit_grab
        (tanggal, sumber, nominal, biaya_admin)
        VALUES (?, ?, ?, ?)
        `,
        [
          tanggal,
          namaSumber,
          nilai,
          biayaAdmin,
        ]
      );

      db.runSync(
        `
        INSERT INTO transaksi
        (tanggal, jenis, subjenis, keterangan, nominal)
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          tanggal,
          'transfer',
          `${namaSumber} -> Kredit Grab`,
          biayaAdmin > 0
            ? `Top up Kredit Grab + admin ${formatRupiah(
                biayaAdmin
              )}`
            : 'Top up Kredit Grab',
          nilai,
        ]
      );

      if (biayaAdmin > 0) {
        db.runSync(
          `
          INSERT INTO transaksi
          (tanggal, jenis, subjenis, keterangan, nominal)
          VALUES (?, ?, ?, ?, ?)
          `,
          [
            tanggal,
            'pengeluaran',
            'biaya_admin',
            'Biaya admin top up Kredit Grab dari OVO',
            biayaAdmin,
          ]
        );
      }
    });

    setNominal('');

    Alert.alert(
      'Top Up Berhasil',
      `${formatRupiah(nilai)} berhasil ditambahkan ke Kredit Grab.` +
        (biayaAdmin > 0
          ? `\n\nBiaya admin: ${formatRupiah(
              biayaAdmin
            )}`
          : ''),
      [
        {
          text: 'OK',
          onPress: () => {
            loadData();
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >

        {/* HEADER */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.back}>‹</Text>
          </Pressable>

          <View>
            <Text style={styles.title}>
              Kredit Grab
            </Text>

            <Text style={styles.subtitle}>
              Kelola saldo Kredit Grab
            </Text>
          </View>
        </View>

        {/* SALDO KREDIT */}
        <View style={styles.balanceSection}>
          <Text style={styles.balanceValue}>
            {formatRupiah(saldo.kredit_grab)}
          </Text>

          <Text style={styles.balanceLabel}>
            Saldo Kredit Grab
          </Text>

          <Text style={styles.balanceInfo}>
            Tidak termasuk dalam total aset
          </Text>
        </View>

        {/* INFO */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>
            Top up Kredit Grab
          </Text>

          <Text style={styles.infoText}>
            Dompet Grab → Kredit Grab
          </Text>

          <Text style={styles.infoText}>
            OVO → Kredit Grab dikenakan admin Rp1.000
          </Text>
        </View>

        {/* SUMBER DANA */}
        <Text style={styles.sectionTitle}>
          Sumber Dana
        </Text>

        <View style={styles.accountList}>
          {sumber.map((item) => {
            const dipilih =
              sumberDipilih === item.key;

            const saldoSumber =
              item.key === 'ovo'
                ? saldo.ovo
                : saldo.dompet_grab;

            return (
              <Pressable
                key={item.key}
                style={[
                  styles.accountButton,
                  dipilih &&
                    styles.accountButtonSelected,
                ]}
                onPress={() =>
                  setSumberDipilih(item.key)
                }
              >
                <Text
                  style={[
                    styles.accountText,
                    dipilih &&
                      styles.accountTextSelected,
                  ]}
                >
                  {item.label}
                </Text>

                <Text
                  style={[
                    styles.accountBalance,
                    dipilih &&
                      styles.accountBalanceSelected,
                  ]}
                >
                  {formatRupiah(saldoSumber)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* NOMINAL */}
        <Text style={styles.sectionTitle}>
          Nominal Top Up
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Contoh: 50000"
          placeholderTextColor="#9AA1AA"
          keyboardType="numeric"
          value={nominal}
          onChangeText={setNominal}
        />

        {/* ADMIN */}
        {sumberDipilih === 'ovo' && (
          <View style={styles.adminBox}>
            <View style={styles.adminRow}>
              <Text style={styles.adminLabel}>
                Biaya admin
              </Text>

              <Text style={styles.adminValue}>
                Rp1.000
              </Text>
            </View>

            <Text style={styles.adminDescription}>
              Saldo OVO dipotong sebesar nominal
              top up + Rp1.000.
            </Text>
          </View>
        )}

        {/* SIMPAN */}
        <Pressable
          style={styles.saveButton}
          onPress={simpanTopUp}
        >
          <Text style={styles.saveText}>
            Top Up Kredit Grab
          </Text>
        </Pressable>

        {/* RIWAYAT */}
        <Text style={styles.sectionTitle}>
          Riwayat Top Up
        </Text>

        {riwayat.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Belum ada riwayat top up.
            </Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {riwayat.map((item) => (
              <View
                key={item.id}
                style={styles.historyItem}
              >
                <View style={styles.historyLeft}>
                  <Text style={styles.historyTitle}>
                    {item.sumber} → Kredit Grab
                  </Text>

                  <Text style={styles.historyDate}>
                    {item.tanggal}
                  </Text>
                </View>

                <View style={styles.historyRight}>
                  <Text style={styles.historyValue}>
                    +{formatRupiah(item.nominal)}
                  </Text>

                  {item.biaya_admin > 0 && (
                    <Text style={styles.historyAdmin}>
                      Admin {formatRupiah(
                        item.biaya_admin
                      )}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  /* HEADER */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },

  backButton: {
    marginRight: 12,
    paddingRight: 2,
  },

  back: {
    fontSize: 38,
    lineHeight: 38,
    color: '#333B45',
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#20252B',
  },

  subtitle: {
    marginTop: 3,
    fontSize: 12,
    color: '#7B838E',
  },

  /* SALDO */

  balanceSection: {
    alignItems: 'center',
    marginBottom: 22,
  },

  balanceValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#20252B',
  },

  balanceLabel: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: '600',
    color: '#606874',
  },

  balanceInfo: {
    marginTop: 4,
    fontSize: 11,
    color: '#969DA6',
  },

  /* INFO */

  infoBox: {
    backgroundColor: '#FCF4E8',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
    marginBottom: 24,
  },

  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8A6A3D',
    marginBottom: 5,
  },

  infoText: {
    fontSize: 12,
    lineHeight: 20,
    color: '#796B58',
  },

  /* SECTION */

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#30363D',
    marginBottom: 10,
  },

  /* SUMBER DANA */

  accountList: {
    gap: 9,
    marginBottom: 20,
  },

  accountButton: {
    minHeight: 52,
    paddingHorizontal: 15,
    borderRadius: 12,
    backgroundColor: '#F0F1F3',
    borderWidth: 1,
    borderColor: '#E1E3E6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  accountButtonSelected: {
    backgroundColor: '#E8F2FC',
    borderColor: '#BFD6EB',
  },

  accountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#707782',
  },

  accountTextSelected: {
    color: '#4F7298',
  },

  accountBalance: {
    fontSize: 13,
    fontWeight: '600',
    color: '#858C96',
  },

  accountBalanceSelected: {
    color: '#4F7298',
  },

  /* INPUT */

  input: {
    backgroundColor: '#F1F3F5',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 15,
    color: '#20252B',
    marginBottom: 12,
  },

  /* ADMIN */

  adminBox: {
    backgroundColor: '#F0F4F8',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
    marginBottom: 15,
  },

  adminRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  adminLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#657080',
  },

  adminValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F7298',
  },

  adminDescription: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 17,
    color: '#7C8793',
  },

  /* BUTTON */

  saveButton: {
    backgroundColor: '#5B7FA5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 3,
    marginBottom: 70,
  },

  saveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  /* EMPTY */

  empty: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  emptyText: {
    color: '#8A919A',
    fontSize: 12,
  },

  /* HISTORY */

  historyList: {
    marginTop: 0,
  },

  historyItem: {
    minHeight: 48,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#eceef1b9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  historyLeft: {
    flex: 1,
    paddingRight: 10,
  },

  historyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#343A42',
  },

  historyDate: {
    marginTop: 2,
    fontSize: 11,
    color: '#939AA3',
  },

  historyRight: {
    alignItems: 'flex-end',
  },

  historyValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4E8A67',
  },

  historyAdmin: {
    marginTop: 3,
    fontSize: 10,
    color: '#9299A2',
  },
});