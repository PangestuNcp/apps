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

type Transaksi = {
  id: number;
  tanggal: string;
  jenis: string;
  subjenis: string | null;
  keterangan: string | null;
  nominal: number;
};

function rupiah(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`;
}

export default function RiwayatScreen() {
  const router = useRouter();

  const [data, setData] = useState<Transaksi[]>([]);

  const loadData = useCallback(() => {
    const hasil = db.getAllSync<Transaksi>(`
      SELECT
        id,
        tanggal,
        jenis,
        subjenis,
        keterangan,
        nominal
      FROM transaksi
      ORDER BY id DESC
    `);

    setData(hasil);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹</Text>
          </Pressable>

          <View>
            <Text style={styles.title}>
              Riwayat
            </Text>

            <Text style={styles.subtitle}>
              Semua transaksi
            </Text>
          </View>
        </View>

        {data.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              Belum ada transaksi
            </Text>

            <Text style={styles.emptyText}>
              Transaksi yang Anda simpan akan muncul di sini.
            </Text>
          </View>
        ) : (
          data.map((item) => {
            const pendapatan =
              item.jenis === 'pendapatan';

            const transfer =
              item.jenis === 'transfer';

            return (
              <View
                key={item.id}
                style={styles.transaction}
              >
                <View style={styles.transactionTop}>
                  <Text style={styles.transactionType}>
                    {pendapatan
                      ? 'Pendapatan'
                      : transfer
                        ? 'Transfer'
                        : 'Pengeluaran'}
                  </Text>

                  <Text style={styles.date}>
                    {item.tanggal}
                  </Text>
                </View>

                <View style={styles.transactionBottom}>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.description}>
                      {pendapatan
                        ? item.subjenis === 'tips_tunai'
                          ? 'Tips'
                          : item.subjenis === 'tips_non_tunai'
                            ? 'Tips'
                            : 'Pendapatan'
                        : item.keterangan || '-'}
                    </Text>

                    {pendapatan && (
                      <Text style={styles.subjenis}>
                        {item.subjenis === 'tips_tunai'
                          ? 'Tunai'
                          : item.subjenis === 'tips_non_tunai'
                            ? 'Non-Tunai'
                            : item.subjenis === 'orderan_tunai'
                              ? 'Orderan Tunai'
                              : item.subjenis === 'orderan_non_tunai'
                                ? 'Orderan Non-Tunai'
                                : '-'}
                      </Text>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.nominal,
                      pendapatan && styles.nominalIncome,
                      !pendapatan && !transfer && styles.nominalExpense,
                      transfer && styles.nominalTransfer,
                    ]}
                  >
                    {pendapatan
                      ? '+'
                      : transfer
                        ? ''
                        : '-'}
                    {rupiah(item.nominal)}
                  </Text>
                </View>
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

  empty: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },

  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#777',
  },

  transaction: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    elevation: 2,
  },

  transactionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  transactionType: {
    fontSize: 14,
    fontWeight: '800',
  },

  date: {
    fontSize: 12,
    color: '#888',
  },

  description: {
    fontSize: 15,
    fontWeight: '700',
  },

  subjenis: {
    marginTop: 4,
    fontSize: 12,
    color: '#777',
  },

  transactionBottom: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  transactionInfo: {
    flex: 1,
  },

  nominal: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: '800',
  },

  nominalIncome: {
    color: '#16803C',
  },

  nominalExpense: {
    color: '#C94C4C',
  },

  nominalTransfer: {
    color: '#444',
  },
});