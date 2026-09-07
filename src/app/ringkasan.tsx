import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import db from '../database/database';

type Ringkasan = {
  pendapatan: number;
  pengeluaran: number;
  jumlah_pendapatan: number;
  jumlah_pengeluaran: number;
  jumlah_transfer: number;
};

function rupiah(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`;
}

export default function RingkasanScreen() {
  const router = useRouter();

  const [data, setData] = useState<Ringkasan>({
    pendapatan: 0,
    pengeluaran: 0,
    jumlah_pendapatan: 0,
    jumlah_pengeluaran: 0,
    jumlah_transfer: 0,
  });

  const [bulan, setBulan] = useState('');

  const loadData = useCallback(() => {
    const sekarang = new Date();

    const tahun = sekarang.getFullYear();
    const nomorBulan = String(
      sekarang.getMonth() + 1
    ).padStart(2, '0');

    const bulanSekarang = `${tahun}-${nomorBulan}`;

    const hasil = db.getFirstSync<{
      pendapatan: number | null;
      pengeluaran: number | null;
      jumlah_pendapatan: number;
      jumlah_pengeluaran: number;
      jumlah_transfer: number;
    }>(
      `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN jenis = 'pendapatan'
              THEN nominal
              ELSE 0
            END
          ),
          0
        ) AS pendapatan,

        COALESCE(
          SUM(
            CASE
              WHEN jenis = 'pengeluaran'
              THEN nominal
              ELSE 0
            END
          ),
          0
        ) AS pengeluaran,

        COUNT(
          CASE
            WHEN jenis = 'pendapatan'
            THEN 1
          END
        ) AS jumlah_pendapatan,

        COUNT(
          CASE
            WHEN jenis = 'pengeluaran'
            THEN 1
          END
        ) AS jumlah_pengeluaran,

        COUNT(
          CASE
            WHEN jenis = 'transfer'
            THEN 1
          END
        ) AS jumlah_transfer

      FROM transaksi

      WHERE tanggal LIKE ?
      `,
      [`${bulanSekarang}%`]
    );

    setData({
      pendapatan: hasil?.pendapatan ?? 0,
      pengeluaran: hasil?.pengeluaran ?? 0,
      jumlah_pendapatan: hasil?.jumlah_pendapatan ?? 0,
      jumlah_pengeluaran: hasil?.jumlah_pengeluaran ?? 0,
      jumlah_transfer: hasil?.jumlah_transfer ?? 0,
    });

    const namaBulan = sekarang.toLocaleDateString(
      'id-ID',
      {
        month: 'long',
        year: 'numeric',
      }
    );

    setBulan(namaBulan);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const selisih =
    data.pendapatan - data.pengeluaran;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹</Text>
          </Pressable>

          <View>
            <Text style={styles.title}>
              Ringkasan
            </Text>

            <Text style={styles.subtitle}>
              Ringkasan keuangan bulan {bulan}
            </Text>
          </View>
        </View>

        <View style={styles.mainCard}>
          <Text style={styles.mainLabel}>
            HASIL BULAN INI
          </Text>

          <Text
            style={[
              styles.mainValue,
              selisih < 0 && styles.negative,
            ]}
          >
            {selisih >= 0 ? '+' : ''}
            {rupiah(selisih)}
          </Text>

          <Text style={styles.mainInfo}>
            Pendapatan dikurangi pengeluaran
          </Text>
        </View>

        <View style={styles.card}>
          <View>
            <Text style={styles.cardTitle}>
              Total Pendapatan
            </Text>

            <Text style={styles.cardCount}>
              {data.jumlah_pendapatan} transaksi
            </Text>
          </View>

          <Text style={styles.income}>
            +{rupiah(data.pendapatan)}
          </Text>
        </View>

        <View style={styles.card}>
          <View>
            <Text style={styles.cardTitle}>
              Total Pengeluaran
            </Text>

            <Text style={styles.cardCount}>
              {data.jumlah_pengeluaran} transaksi
            </Text>
          </View>

          <Text style={styles.expense}>
            -{rupiah(data.pengeluaran)}
          </Text>
        </View>

        <View style={styles.card}>
          <View>
            <Text style={styles.cardTitle}>
              Transfer
            </Text>

            <Text style={styles.cardCount}>
              Perpindahan antar akun
            </Text>
          </View>

          <Text style={styles.transfer}>
            {data.jumlah_transfer} transaksi
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            Catatan
          </Text>

          <Text style={styles.infoText}>
            Transfer tidak dihitung sebagai pendapatan
            atau pengeluaran karena hanya memindahkan
            saldo antar akun.
          </Text>
        </View>

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

  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    marginBottom: 18,
    elevation: 3,
  },

  mainLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#777',
  },

  mainValue: {
    marginTop: 8,
    fontSize: 32,
    fontWeight: '800',
  },

  negative: {
    color: '#B42318',
  },

  mainInfo: {
    marginTop: 6,
    fontSize: 13,
    color: '#888',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },

  cardCount: {
    marginTop: 5,
    fontSize: 12,
    color: '#888',
  },

  income: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16803C',
  },

  expense: {
    fontSize: 16,
    fontWeight: '800',
    color: '#B42318',
  },

  transfer: {
    fontSize: 14,
    fontWeight: '800',
  },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginTop: 8,
  },

  infoTitle: {
    fontSize: 15,
    fontWeight: '800',
  },

  infoText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: '#737A85',
  },
});