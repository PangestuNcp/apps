
import React, { useCallback, useState } from 'react';

import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import db from '../database/database';

type Transaksi = {
  id: number;
  tanggal: string;
  jenis: string;
  subjenis: string | null;
  keterangan: string | null;
  nominal: number;
  deskripsi: string | null;
};

function rupiah(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`;
}

function namaAkun(subjenis: string | null) {
  if (subjenis === 'cash') return 'Cash';
  if (subjenis === 'ovo') return 'OVO';
  if (subjenis === 'seabank') return 'SeaBank';

  return null;
}

function namaMetodePendapatan(subjenis: string | null) {
  if (subjenis === 'tips_tunai') return 'Tunai';
  if (subjenis === 'tips_non_tunai') return 'Non-Tunai';
  if (subjenis === 'orderan_tunai') return 'Tunai';
  if (subjenis === 'orderan_non_tunai') return 'Non-Tunai';

  return null;
}

function namaPendapatan(subjenis: string | null) {
  if (
    subjenis === 'tips_tunai' ||
    subjenis === 'tips_non_tunai'
  ) {
    return 'Tips';
  }

  if (
    subjenis === 'orderan_tunai' ||
    subjenis === 'orderan_non_tunai'
  ) {
    return 'Orderan';
  }

  return 'Pendapatan';
}

function namaPengeluaran(
subjenis: string | null,
keterangan: string | null
) {
if (subjenis === 'bensin') {
return 'Bensin';
}

if (subjenis === 'oli') {
return 'Oli';
}

if (subjenis === 'kekurangan_tagihan_tunai_grab') {
return 'Topup Kekurangan Kredit Grab';
}

return keterangan || 'Pengeluaran';
}

function metodePengeluaran(
subjenis: string | null,
keterangan: string | null
) {
if (subjenis === 'kekurangan_tagihan_tunai_grab') {
return 'Dompet Grab';
}

const akun = namaAkun(subjenis);

if (akun) {
return akun;
}

if (
subjenis === 'bensin' ||
subjenis === 'oli'
) {
const teks = keterangan || '';
const bagian = teks.split(' - ');


if (bagian.length > 1) {
  const metode = bagian[bagian.length - 1]
    .trim()
    .toLowerCase();

  if (metode === 'cash') {
    return 'Cash';
  }

  if (metode === 'ovo') {
    return 'OVO';
  }

  if (metode === 'seabank') {
    return 'SeaBank';
  }
}


}

return null;
}


function formatTanggal(tanggal: string) {
  const [tahun, bulan, hari] = tanggal.split('-');

  if (!tahun || !bulan || !hari) {
    return tanggal;
  }

  const namaBulan = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];

  const indexBulan = Number(bulan) - 1;

  if (!namaBulan[indexBulan]) {
    return tanggal;
  }

  return `${Number(hari)} ${namaBulan[indexBulan]}`;
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
        nominal,
        deskripsi
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
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
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
          <View style={styles.historyList}>
            {data.map((item) => {
              const pendapatan =
                item.jenis === 'pendapatan';

              const transfer =
                item.jenis === 'transfer';

              const pengeluaran =
                item.jenis === 'pengeluaran';

              const metodePendapatan =
                namaMetodePendapatan(item.subjenis);

              const namaPengeluaranItem =
                namaPengeluaran(
                  item.subjenis,
                  item.keterangan
                );

              const metodePengeluaranItem =
                metodePengeluaran(
                  item.subjenis,
                  item.keterangan
                );

              return (
                <View
                  key={item.id}
                  style={[
                    styles.transaction,
                    pendapatan &&
                      styles.transactionIncome,
                    pengeluaran &&
                      styles.transactionExpense,
                    transfer &&
                      styles.transactionTransfer,
                  ]}
                >
                  {/* BARIS ATAS */}
                  <View style={styles.transactionTop}>
                    <View style={styles.typeRow}>
                      <Ionicons
                        name={
                          pendapatan
                            ? 'arrow-down-circle-outline'
                            : pengeluaran
                              ? 'arrow-up-circle-outline'
                              : 'swap-horizontal-outline'
                        }
                        size={17}
                        color={
                          pendapatan
                            ? '#4E8A67'
                            : pengeluaran
                              ? '#B85C5C'
                              : '#5B7FA5'
                        }
                      />

                      <Text
                        style={[
                          styles.transactionType,
                          pendapatan &&
                            styles.transactionTypeIncome,
                          pengeluaran &&
                            styles.transactionTypeExpense,
                          transfer &&
                            styles.transactionTypeTransfer,
                        ]}
                      >
                        {pendapatan
                          ? 'Pendapatan'
                          : pengeluaran
                            ? 'Pengeluaran'
                            : 'Transfer'}
                      </Text>
                    </View>

                    <Text style={styles.date}>
                      {formatTanggal(item.tanggal)}
                    </Text>
                  </View>

                  {/* BARIS TRANSAKSI */}
                  <View style={styles.transactionBottom}>
                    <View style={styles.transactionInfo}>

                      {/* PENDAPATAN */}
                      {pendapatan ? (
                        <View style={styles.mainTextRow}>
                          <Text style={styles.description}>
                            {namaPendapatan(
                              item.subjenis
                            )}
                          </Text>

                          {metodePendapatan && (
                            <Text style={styles.method}>
                              {metodePendapatan}
                            </Text>
                          )}
                        </View>

                      ) : pengeluaran ? (

                        /* PENGELUARAN */
                        <View>
                          <View style={styles.mainTextRow}>
                            <Text style={styles.description}>
                              {namaPengeluaranItem}
                            </Text>

                            {metodePengeluaranItem && (
                              <Text style={styles.method}>
                                {metodePengeluaranItem}
                              </Text>
                            )}
                          </View>

                          {/* DESKRIPSI OPTIONAL */}
                          {item.deskripsi ? (
                            <Text style={styles.expenseNote}>
                              {item.deskripsi}
                            </Text>
                          ) : null}
                        </View>

                      ) : (

                        /* TRANSFER */
                        <Text style={styles.description}>
                          {(item.subjenis ||
                            item.keterangan ||
                            '-').replace(/->/g, '→')}
                        </Text>
                      )}
                    </View>

                    {/* NOMINAL */}
                    <Text
                      style={[
                        styles.nominal,
                        pendapatan &&
                          styles.nominalIncome,
                        pengeluaran &&
                          styles.nominalExpense,
                        transfer &&
                          styles.nominalTransfer,
                      ]}
                    >
                      {pendapatan
                        ? '+'
                        : pengeluaran
                          ? '-'
                          : ''}

                      {rupiah(item.nominal)}
                    </Text>
                  </View>
                </View>
              );
            })}
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

  /* LIST */
  historyList: {
    marginTop: 0,
  },

  transaction: {
    paddingVertical: 15,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderRadius: 10,
  },

  transactionIncome: {
    backgroundColor: '#F3F9F5',
  },

  transactionExpense: {
    backgroundColor: '#FCF3F3',
  },

  transactionTransfer: {
    backgroundColor: '#F3F6FA',
  },

  transactionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  transactionType: {
    fontSize: 13,
    fontWeight: '700',
  },

  transactionTypeIncome: {
    color: '#4E8A67',
  },

  transactionTypeExpense: {
    color: '#B85C5C',
  },

  transactionTypeTransfer: {
    color: '#5B7FA5',
  },

  date: {
    fontSize: 11,
    color: '#939AA3',
  },

  /* TRANSAKSI */
  transactionBottom: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  transactionInfo: {
    flex: 1,
    paddingRight: 12,
  },

  mainTextRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },

  description: {
    fontSize: 14,
    fontWeight: '600',
    color: '#343A42',
  },

  method: {
    marginLeft: 8,
    fontSize: 11,
    fontWeight: '400',
    color: '#6F7782',
  },

  expenseNote: {
    marginTop: 5,
    fontSize: 12,
    color: '#8A8F98',
    lineHeight: 17,
  },

  /* NOMINAL */
  nominal: {
    marginTop: 0,
    fontSize: 13,
    fontWeight: '700',
  },

  nominalIncome: {
    color: '#4E8A67',
  },

  nominalExpense: {
    color: '#B85C5C',
  },

  nominalTransfer: {
    color: '#5B7FA5',
  },

  /* EMPTY */
  empty: {
    paddingVertical: 30,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#343A42',
  },

  emptyText: {
    marginTop: 7,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    color: '#8A919A',
  },
});
