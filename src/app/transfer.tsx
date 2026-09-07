import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import db from '../database/database';

const tujuan = [
  { key: 'ovo', label: 'OVO' },
  { key: 'seabank', label: 'SeaBank' },
] as const;

type TujuanKey = (typeof tujuan)[number]['key'];

function formatRupiah(nominal: number) {
  return `Rp${nominal.toLocaleString('id-ID')}`;
}

export default function TransferScreen() {
  const router = useRouter();

  const [ke, setKe] = useState<TujuanKey>('ovo');
  const [nominal, setNominal] = useState('');

  function simpan() {
    const nilai = Number(nominal.replace(/\D/g, ''));

    if (!nilai || nilai <= 0) {
      Alert.alert(
        'Nominal salah',
        'Masukkan nominal transfer yang benar.'
      );
      return;
    }

    const saldoGrab = db.getFirstSync<{
      saldo: number;
    }>(`
      SELECT dompet_grab AS saldo
      FROM saldo
      WHERE id = 1
    `);

    if (!saldoGrab) {
      Alert.alert(
        'Data tidak ditemukan',
        'Data saldo belum tersedia.'
      );
      return;
    }

    if (saldoGrab.saldo < nilai) {
      Alert.alert(
        'Saldo tidak cukup',
        `Saldo Dompet Grab hanya ${formatRupiah(
          saldoGrab.saldo
        )}.`
      );
      return;
    }

    const tanggal = new Date()
      .toISOString()
      .slice(0, 10);

    const namaTujuan =
      tujuan.find((item) => item.key === ke)?.label ?? ke;

    db.withTransactionSync(() => {
      // Dompet Grab berkurang
      db.runSync(
        `
        UPDATE saldo
        SET dompet_grab = dompet_grab - ?
        WHERE id = 1
        `,
        [nilai]
      );

      // OVO / SeaBank bertambah
      db.runSync(
        `
        UPDATE saldo
        SET ${ke} = ${ke} + ?
        WHERE id = 1
        `,
        [nilai]
      );

      // Catat transaksi
      db.runSync(
        `
        INSERT INTO transaksi
        (tanggal, jenis, subjenis, keterangan, nominal)
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          tanggal,
          'transfer',
          `Dompet Grab -> ${namaTujuan}`,
          'Pemindahan saldo Dompet Grab',
          nilai,
        ]
      );
    });

    setNominal('');

    Alert.alert(
      'Berhasil',
      `${formatRupiah(nilai)} berhasil dipindahkan dari Dompet Grab ke ${namaTujuan}.`,
      [
        {
          text: 'OK',
          onPress: () => router.back(),
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
              Transfer
            </Text>

            <Text style={styles.subtitle}>
              Pindahkan saldo Dompet Grab
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>
            SUMBER
          </Text>

          <Text style={styles.infoTitle}>
            Dompet Grab
          </Text>

          <Text style={styles.infoDescription}>
            Saldo Dompet Grab harus dipindahkan
            terlebih dahulu sebelum dapat digunakan
            untuk pengeluaran.
          </Text>
        </View>

        <Text style={styles.label}>
          Pindahkan ke
        </Text>

        <View style={styles.accountList}>
          {tujuan.map((item) => (
            <Pressable
              key={item.key}
              style={[
                styles.accountButton,
                ke === item.key &&
                  styles.accountSelected,
              ]}
              onPress={() => setKe(item.key)}
            >
              <Text
                style={[
                  styles.accountText,
                  ke === item.key &&
                    styles.accountTextSelected,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>
          Nominal
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Contoh: 50000"
          keyboardType="numeric"
          value={nominal}
          onChangeText={setNominal}
        />

        <Pressable
          style={styles.saveButton}
          onPress={simpan}
        >
          <Text style={styles.saveText}>
            Simpan Transfer
          </Text>
        </Pressable>

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

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
    elevation: 2,
  },

  infoLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#777',
  },

  infoTitle: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '800',
  },

  infoDescription: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19,
    color: '#737A85',
  },

  label: {
    marginTop: 8,
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '700',
  },

  accountList: {
    gap: 10,
    marginBottom: 15,
  },

  accountButton: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E1E4E8',
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

  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 25,
  },

  saveButton: {
    backgroundColor: '#222',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },

  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});