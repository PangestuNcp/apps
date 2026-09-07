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
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
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

        <View style={styles.creditCard}>
          <Text style={styles.creditLabel}>
            SALDO KREDIT GRAB
          </Text>

          <Text style={styles.creditValue}>
            {formatRupiah(saldo.kredit_grab)}
          </Text>

          <Text style={styles.creditInfo}>
            Tidak dihitung sebagai total aset.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            Cara Top Up
          </Text>

          <Text style={styles.infoText}>
            • Dompet Grab → Kredit Grab
          </Text>

          <Text style={styles.infoText}>
            • OVO → Kredit Grab + biaya admin Rp1.000
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          Sumber Dana
        </Text>

        <View style={styles.accountList}>
          {sumber.map((item) => (
            <Pressable
              key={item.key}
              style={[
                styles.accountButton,
                sumberDipilih === item.key &&
                  styles.accountSelected,
              ]}
              onPress={() =>
                setSumberDipilih(item.key)
              }
            >
              <Text
                style={[
                  styles.accountText,
                  sumberDipilih === item.key &&
                    styles.accountTextSelected,
                ]}
              >
                {item.label}
              </Text>

              <Text
                style={[
                  styles.accountBalance,
                  sumberDipilih === item.key &&
                    styles.accountBalanceSelected,
                ]}
              >
                {formatRupiah(
                  item.key === 'ovo'
                    ? saldo.ovo
                    : saldo.dompet_grab
                )}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>
          Nominal Top Up
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Contoh: 50000"
          keyboardType="numeric"
          value={nominal}
          onChangeText={setNominal}
        />

        {sumberDipilih === 'ovo' && (
          <View style={styles.adminCard}>
            <Text style={styles.adminText}>
              Biaya admin
            </Text>

            <Text style={styles.adminValue}>
              Rp1.000
            </Text>

            <Text style={styles.adminDescription}>
              OVO akan dipotong sebesar nominal
              top up + Rp1.000.
            </Text>
          </View>
        )}

        <Pressable
          style={styles.saveButton}
          onPress={simpanTopUp}
        >
          <Text style={styles.saveText}>
            Top Up Kredit Grab
          </Text>
        </Pressable>

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
          riwayat.map((item) => (
            <View
              key={item.id}
              style={styles.historyCard}
            >
              <View>
                <Text style={styles.historyTitle}>
                  {item.sumber} → Kredit Grab
                </Text>

                <Text style={styles.historyDate}>
                  {item.tanggal}
                </Text>
              </View>

              <View>
                <Text style={styles.historyValue}>
                  +{formatRupiah(item.nominal)}
                </Text>

                {item.biaya_admin > 0 && (
                  <Text style={styles.historyAdmin}>
                    Admin {formatRupiah(item.biaya_admin)}
                  </Text>
                )}
              </View>
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

  creditCard: {
    backgroundColor: '#FFF7E6',
    borderRadius: 22,
    padding: 24,
    marginBottom: 18,
    elevation: 3,
  },

  creditLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#777',
  },

  creditValue: {
    marginTop: 8,
    fontSize: 34,
    fontWeight: '800',
  },

  creditInfo: {
    marginTop: 8,
    color: '#777',
    fontSize: 12,
  },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 22,
  },

  infoTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },

  infoText: {
    color: '#666',
    fontSize: 13,
    lineHeight: 22,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 5,
    marginBottom: 12,
  },

  accountList: {
    gap: 10,
    marginBottom: 15,
  },

  accountButton: {
    backgroundColor: '#FFFFFF',
    padding: 17,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E1E4E8',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  accountSelected: {
    backgroundColor: '#222',
    borderColor: '#222',
  },

  accountText: {
    fontSize: 15,
    fontWeight: '700',
  },

  accountTextSelected: {
    color: '#FFFFFF',
  },

  accountBalance: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },

  accountBalanceSelected: {
    color: '#FFFFFF',
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 15,
  },

  adminCard: {
    backgroundColor: '#FFF7E6',
    borderRadius: 15,
    padding: 16,
    marginBottom: 18,
  },

  adminText: {
    fontSize: 13,
    color: '#777',
  },

  adminValue: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: '800',
  },

  adminDescription: {
    marginTop: 5,
    fontSize: 12,
    color: '#777',
  },

  saveButton: {
    backgroundColor: '#222',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 28,
  },

  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  empty: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 25,
    alignItems: 'center',
  },

  emptyText: {
    color: '#888',
  },

  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 17,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
  },

  historyTitle: {
    fontSize: 14,
    fontWeight: '800',
  },

  historyDate: {
    marginTop: 5,
    fontSize: 12,
    color: '#888',
  },

  historyValue: {
    fontSize: 14,
    fontWeight: '800',
  },

  historyAdmin: {
    marginTop: 4,
    fontSize: 11,
    color: '#888',
    textAlign: 'right',
  },
});