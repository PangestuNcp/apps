import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import db from '../database/database';

type Periode = 'hari' | '7hari' | 'bulan';

type RincianPengeluaran = {
  id: number;
  tanggal: string;
  keterangan: string;
  nominal: number;
  akun: string;
};

type AnalisisData = {
  pendapatan: number;
  tips: number;
  totalPendapatan: number;
  pengeluaran: number;
  bersih: number;
  rincian: RincianPengeluaran[];
};

function formatRupiah(nominal: number) {
  const tanda = nominal < 0 ? '-' : '';
  const nilai = Math.abs(nominal);

  return `${tanda}Rp${nilai.toLocaleString('id-ID')}`;
}

function awalHari(date: Date) {
  const hasil = new Date(date);
  hasil.setHours(0, 0, 0, 0);
  return hasil;
}

function akhirHariBerikutnya(date: Date) {
  const hasil = awalHari(date);
  hasil.setDate(hasil.getDate() + 1);
  return hasil;
}

function getRentang(periode: Periode, sekarang: Date) {
  const hariIni = awalHari(sekarang);

  if (periode === 'hari') {
    const mulai = hariIni;
    const selesai = akhirHariBerikutnya(hariIni);

    const mulaiSebelumnya = new Date(hariIni);
    mulaiSebelumnya.setDate(
      mulaiSebelumnya.getDate() - 1
    );

    return {
      mulai,
      selesai,
      mulaiSebelumnya,
      selesaiSebelumnya: mulai,
    };
  }

  if (periode === '7hari') {
    const mulai = new Date(hariIni);
    mulai.setDate(mulai.getDate() - 6);

    const selesai = akhirHariBerikutnya(hariIni);

    const selesaiSebelumnya = mulai;

    const mulaiSebelumnya = new Date(mulai);
    mulaiSebelumnya.setDate(
      mulaiSebelumnya.getDate() - 7
    );

    return {
      mulai,
      selesai,
      mulaiSebelumnya,
      selesaiSebelumnya,
    };
  }

  const mulai = new Date(
    hariIni.getFullYear(),
    hariIni.getMonth(),
    1
  );

  const selesai = new Date(
    hariIni.getFullYear(),
    hariIni.getMonth() + 1,
    1
  );

  const mulaiSebelumnya = new Date(
    hariIni.getFullYear(),
    hariIni.getMonth() - 1,
    1
  );

  const selesaiSebelumnya = mulai;

  return {
    mulai,
    selesai,
    mulaiSebelumnya,
    selesaiSebelumnya,
  };
}

function formatTanggal(dateString: string) {
  const bagian = dateString.slice(0, 10).split('-');

  if (bagian.length !== 3) {
    return dateString;
  }

  const [tahun, bulan, hari] = bagian;

  return `${hari}-${bulan}-${tahun.slice(2)}`;
}

function ambilAnalisis(
mulai: Date,
selesai: Date
): AnalisisData {
const transaksi = db.getAllSync<{
id: number;
jenis: string;
subjenis: string | null;
keterangan: string | null;
nominal: number;
tanggal: string;
}>(
`     SELECT
      id,
      jenis,
      subjenis,
      keterangan,
      nominal,
      tanggal
    FROM transaksi
    ORDER BY id DESC
    `
);

function tanggalLokal(date: Date) {
const tahun = date.getFullYear();
const bulan = String(
date.getMonth() + 1
).padStart(2, '0');
const hari = String(
date.getDate()
).padStart(2, '0');


return `${tahun}-${bulan}-${hari}`;


}

const tanggalMulai = tanggalLokal(mulai);
const tanggalSelesai = tanggalLokal(selesai);

const transaksiDalamPeriode =
transaksi.filter((item) => {
const tanggalTransaksi =
item.tanggal.slice(0, 10);


  return (
    tanggalTransaksi >= tanggalMulai &&
    tanggalTransaksi < tanggalSelesai
  );
});


let pendapatan = 0;
let tips = 0;
let pengeluaran = 0;

const rincian: RincianPengeluaran[] = [];

for (const item of transaksiDalamPeriode) {
if (item.jenis === 'pendapatan') {
if (
item.subjenis === 'tips_tunai' ||
item.subjenis === 'tips_non_tunai'
) {
tips += item.nominal;
} else {
pendapatan += item.nominal;
}
}


if (item.jenis === 'pengeluaran') {
  pengeluaran += item.nominal;

  let akun = '';

  if (item.subjenis === 'cash') {
    akun = 'Cash';
  }

  if (item.subjenis === 'ovo') {
    akun = 'OVO';
  }

  if (item.subjenis === 'seabank') {
    akun = 'SeaBank';
  }

  if (
    item.subjenis ===
    'kekurangan_tagihan_tunai_grab'
  ) {
    akun = 'Dompet Grab';
  }

  if (
    item.subjenis === 'bensin' ||
    item.subjenis === 'oli'
  ) {
    const teks = item.keterangan || '';
    const bagian = teks.split(' - ');

    if (bagian.length > 1) {
      const metode =
        bagian[bagian.length - 1]
          .trim()
          .toLowerCase();

      if (metode === 'cash') {
        akun = 'Cash';
      }

      if (metode === 'ovo') {
        akun = 'OVO';
      }

      if (metode === 'seabank') {
        akun = 'SeaBank';
      }
    }
  }

  rincian.push({
    id: item.id,
    tanggal: item.tanggal,
    keterangan:
      item.keterangan?.trim() ||
      'Tanpa keterangan',
    nominal: item.nominal,
    akun,
  });
}


}

const totalPendapatan =
pendapatan + tips;

return {
pendapatan,
tips,
totalPendapatan,
pengeluaran,
bersih:
totalPendapatan - pengeluaran,
rincian,
};
}


function formatTanggalPendek(date: Date) {
  return date.toLocaleDateString(
    'id-ID',
    {
      day: 'numeric',
      month: 'short',
    }
  );
}

export default function AnalisisKeuanganScreen() {
  const router = useRouter();

  const [periode, setPeriode] =
    useState<Periode>('hari');

  const [sekarang, setSekarang] =
    useState(new Date());

  const [data, setData] =
    useState<AnalisisData>({
      pendapatan: 0,
      tips: 0,
      totalPendapatan: 0,
      pengeluaran: 0,
      bersih: 0,
      rincian: [],
    });

  const [dataSebelumnya, setDataSebelumnya] =
    useState<AnalisisData>({
      pendapatan: 0,
      tips: 0,
      totalPendapatan: 0,
      pengeluaran: 0,
      bersih: 0,
      rincian: [],
    });

  const [modalRincian, setModalRincian] =
    useState(false);

  const loadData = useCallback(() => {
    const waktuSekarang = new Date();

    setSekarang(waktuSekarang);

    const rentang = getRentang(
      periode,
      waktuSekarang
    );

    setData(
      ambilAnalisis(
        rentang.mulai,
        rentang.selesai
      )
    );

    setDataSebelumnya(
      ambilAnalisis(
        rentang.mulaiSebelumnya,
        rentang.selesaiSebelumnya
      )
    );
  }, [periode]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const rentang = getRentang(
    periode,
    sekarang
  );

  const selisih =
    data.bersih -
    dataSebelumnya.bersih;

  const warnaBersih =
    data.bersih > 0
      ? '#4E8A67'
      : data.bersih < 0
        ? '#B85C5C'
        : '#343A42';

  function labelPeriode() {
    if (periode === 'hari') {
      return sekarang.toLocaleDateString(
        'id-ID',
        {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        }
      );
    }

    if (periode === '7hari') {
      return `${formatTanggalPendek(
        rentang.mulai
      )} – ${formatTanggalPendek(
        new Date(
          rentang.selesai.getTime() -
            24 * 60 * 60 * 1000
        )
      )}`;
    }

    return sekarang.toLocaleDateString(
      'id-ID',
      {
        month: 'long',
        year: 'numeric',
      }
    );
  }

  function labelPerbandingan() {
    if (periode === 'hari') {
      return 'Perbandingan dengan Kemarin';
    }

    if (periode === '7hari') {
      return 'Perbandingan dengan 7 Hari Sebelumnya';
    }

    return 'Perbandingan dengan Bulan Sebelumnya';
  }

  function labelSebelumnya() {
    if (periode === 'hari') {
      return 'Kemarin';
    }

    if (periode === '7hari') {
      return '7 Hari Sebelumnya';
    }

    return sekarang
      .toLocaleDateString(
        'id-ID',
        { month: 'long' }
      );
  }

  function labelSekarang() {
    if (periode === 'hari') {
      return 'Hari ini';
    }

    if (periode === '7hari') {
      return '7 Hari Terakhir';
    }

    return sekarang.toLocaleDateString(
      'id-ID',
      { month: 'long' }
    );
  }

  function renderPerbandingan() {
    if (
      data.bersih ===
      dataSebelumnya.bersih
    ) {
      return (
        <Text style={styles.comparisonNote}>
          Pendapatan periode ini sama
          dengan periode sebelumnya.
        </Text>
      );
    }

    if (selisih > 0) {
      return (
        <Text style={styles.comparisonNote}>
          Pendapatan periode ini lebih besar{' '}
          <Text style={styles.comparisonBold}>
            {formatRupiah(selisih)}
          </Text>{' '}
          dari periode sebelumnya.
        </Text>
      );
    }

    return (
      <Text style={styles.comparisonNote}>
        Pendapatan periode ini lebih kecil{' '}
        <Text style={styles.comparisonNegative}>
          {formatRupiah(Math.abs(selisih))}
        </Text>{' '}
        dari periode sebelumnya.
      </Text>
    );
  }

  function renderRincian() {
    if (data.rincian.length === 0) {
      return (
        <Text style={styles.emptyText}>
          Belum ada pengeluaran.
        </Text>
      );
    }

    let tanggalTerakhir = '';

    return data.rincian.map((item) => {
      const tanggal =
        item.tanggal.slice(0, 10);

      const tampilkanTanggal =
        tanggal !== tanggalTerakhir;

      tanggalTerakhir = tanggal;

      return (
        <View key={item.id}>
          {tampilkanTanggal && (
            <Text style={styles.detailDate}>
              {formatTanggal(item.tanggal)}
            </Text>
          )}

          <View style={styles.detailItem}>
            <View style={styles.detailInfo}>
              <Text style={styles.detailName}>
                {item.keterangan}
              </Text>

              {item.akun ? (
                <Text style={styles.detailAccount}>
                  {item.akun}
                </Text>
              ) : null}
            </View>

            <Text style={styles.detailAmount}>
              {formatRupiah(item.nominal)}
            </Text>
          </View>
        </View>
      );
    });
  }

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
            <Text style={styles.back}>
              ‹
            </Text>
          </Pressable>

          <View>
            <Text style={styles.title}>
              Analisis Keuangan
            </Text>

            <Text style={styles.subtitle}>
              Lihat perkembangan keuangan
            </Text>
          </View>
        </View>

        {/* TAB PERIODE */}

        <View style={styles.tabs}>
          <Pressable
            style={[
              styles.tab,
              periode === 'hari' &&
                styles.tabSelected,
            ]}
            onPress={() =>
              setPeriode('hari')
            }
          >
            <Text
              style={[
                styles.tabText,
                periode === 'hari' &&
                  styles.tabTextSelected,
              ]}
            >
              Hari Ini
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.tab,
              periode === '7hari' &&
                styles.tabSelected,
            ]}
            onPress={() =>
              setPeriode('7hari')
            }
          >
            <Text
              style={[
                styles.tabText,
                periode === '7hari' &&
                  styles.tabTextSelected,
              ]}
            >
              7 Hari
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.tab,
              periode === 'bulan' &&
                styles.tabSelected,
            ]}
            onPress={() =>
              setPeriode('bulan')
            }
          >
            <Text
              style={[
                styles.tabText,
                periode === 'bulan' &&
                  styles.tabTextSelected,
              ]}
            >
              Bulan
            </Text>
          </Pressable>
        </View>

        {/* PERIODE */}

        <Text style={styles.period}>
          {labelPeriode()}
        </Text>

        {/* PENDAPATAN BERSIH */}

        <View style={styles.netSection}>
          <Text style={styles.netLabel}>
            Pendapatan Bersih
          </Text>

          <Text
            style={[
              styles.netAmount,
              {
                color: warnaBersih,
              },
            ]}
          >
            {data.bersih > 0 ? '+' : ''}
            {formatRupiah(data.bersih)}
          </Text>
        </View>

        {/* PENDAPATAN */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Pendapatan
          </Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryLeft}>
              <Ionicons
                name="arrow-down-circle-outline"
                size={21}
                color="#4E8A67"
              />

              <View>
                <Text style={styles.rowLabel}>
                  Pendapatan
                </Text>

                <Text style={styles.rowCount}>
                  Pendapatan Grab
                </Text>
              </View>
            </View>

            <Text style={styles.incomeValue}>
              +{formatRupiah(data.pendapatan)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryLeft}>
              <Ionicons
                name="gift-outline"
                size={21}
                color="#4E8A67"
              />

              <View>
                <Text style={styles.rowLabel}>
                  Tips
                </Text>

                <Text style={styles.rowCount}>
                  Tips Tunai & Non-Tunai
                </Text>
              </View>
            </View>

            <Text style={styles.incomeValue}>
              +{formatRupiah(data.tips)}
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Total Pendapatan
            </Text>

            <Text style={styles.totalValue}>
              +{formatRupiah(
                data.totalPendapatan
              )}
            </Text>
          </View>
        </View>

        {/* PENGELUARAN */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Pengeluaran
          </Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryLeft}>
              <Ionicons
                name="arrow-up-circle-outline"
                size={21}
                color="#B85C5C"
              />

              <View>
                <Text style={styles.rowLabel}>
                  Total Pengeluaran
                </Text>

                <Text style={styles.rowCount}>
                  Semua pengeluaran
                </Text>
              </View>
            </View>

            <Text style={styles.expenseValue}>
              -{formatRupiah(
                data.pengeluaran
              )}
            </Text>
          </View>
        </View>

        {/* RINCIAN PENGELUARAN */}

        <Pressable
          style={styles.detailButton}
          onPress={() =>
            setModalRincian(true)
          }
        >
          <View style={styles.detailButtonLeft}>
            <Ionicons
              name="receipt-outline"
              size={21}
              color="#5B7FA5"
            />

            <View>
              <Text style={styles.detailButtonTitle}>
                Rincian Pengeluaran
              </Text>

              <Text style={styles.detailButtonSubtitle}>
                Lihat daftar pengeluaran
              </Text>
            </View>
          </View>

          <Ionicons
            name="chevron-forward-outline"
            size={20}
            color="#8A919A"
          />
        </Pressable>

        {/* PERBANDINGAN */}

        <View style={styles.comparison}>
          <View style={styles.comparisonLine} />

          <Text style={styles.comparisonTitle}>
            {labelPerbandingan()}
          </Text>

          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>
              {labelSebelumnya()}
            </Text>

            <Text
              style={[
                styles.comparisonValue,
                {
                  color:
                    dataSebelumnya.bersih < 0
                      ? '#B85C5C'
                      : '#343A42',
                },
              ]}
            >
              {formatRupiah(
                dataSebelumnya.bersih
              )}
            </Text>
          </View>

          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>
              {labelSekarang()}
            </Text>

            <Text
              style={[
                styles.comparisonValue,
                {
                  color:
                    data.bersih < 0
                      ? '#B85C5C'
                      : '#343A42',
                },
              ]}
            >
              {formatRupiah(data.bersih)}
            </Text>
          </View>

          {renderPerbandingan()}
        </View>
      </ScrollView>

      {/* POPUP RINCIAN */}

      <Modal
        visible={modalRincian}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setModalRincian(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  Rincian Pengeluaran
                </Text>

                <Text style={styles.modalSubtitle}>
                  {labelPeriode()}
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setModalRincian(false)
                }
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={23}
                  color="#555E68"
                />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={
                styles.modalContent
              }
              showsVerticalScrollIndicator={true}
            >
              {renderRincian()}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 45,
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

  /* TAB */

  tabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F3F5',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },

  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },

  tabSelected: {
    backgroundColor: '#E8F2FC',
  },

  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#858C95',
  },

  tabTextSelected: {
    color: '#4F7298',
    fontWeight: '700',
  },

  /* PERIODE */

  period: {
    textAlign: 'center',
    fontSize: 12,
    color: '#8A919A',
    marginBottom: 28,
  },

  /* PENDAPATAN BERSIH */

  netSection: {
    alignItems: 'center',
    marginBottom: 32,
  },

  netLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7B838E',
  },

  netAmount: {
    marginTop: 7,
    fontSize: 31,
    fontWeight: '700',
  },

  /* SECTION */

  section: {
    marginBottom: 27,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#343A42',
    marginBottom: 10,
  },

  summaryRow: {
    minHeight: 59,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  summaryLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#343A42',
  },

  rowCount: {
    marginTop: 3,
    fontSize: 11,
    color: '#969DA6',
  },

  incomeValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4E8A67',
  },

  expenseValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B85C5C',
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 7,
    paddingTop: 8,
  },

  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#343A42',
  },

  totalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4E8A67',
  },

  /* TOMBOL RINCIAN */

  detailButton: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },

  detailButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  detailButtonTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#343A42',
  },

  detailButtonSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: '#969DA6',
  },

  /* PERBANDINGAN */

  comparison: {
    marginTop: 2,
    alignItems: 'center',
  },

  comparisonLine: {
    width: '100%',
    height: 1,
    backgroundColor: '#E3E6EA',
    marginBottom: 16,
  },

  comparisonTitle: {
    fontSize: 11,
    color: '#8A919A',
    marginBottom: 12,
  },

  comparisonRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },

  comparisonLabel: {
    width: 125,
    textAlign: 'right',
    marginRight: 15,
    fontSize: 12,
    color: '#7B838E',
  },

  comparisonValue: {
    width: 110,
    fontSize: 13,
    fontWeight: '700',
  },

  comparisonNote: {
    marginTop: 11,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 17,
    color: '#7B838E',
  },

  comparisonBold: {
    fontWeight: '800',
    color: '#4E8A67',
  },

  comparisonNegative: {
    fontWeight: '800',
    color: '#B85C5C',
  },

  /* MODAL */

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 35, 40, 0.35)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  modalContainer: {
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
  },

  modalHeader: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F2',
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#20252B',
  },

  modalSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: '#8A919A',
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F3F5',
  },

  modalScroll: {
    maxHeight: 520,
  },

  modalContent: {
    paddingHorizontal: 18,
    paddingTop: 15,
    paddingBottom: 22,
  },

  detailDate: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#7B838E',
  },

  detailItem: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },

  detailInfo: {
    flex: 1,
    paddingRight: 12,
  },

  detailName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#343A42',
  },

  detailAccount: {
    marginTop: 3,
    fontSize: 11,
    color: '#969DA6',
  },

  detailAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B85C5C',
  },

  emptyText: {
    paddingVertical: 25,
    textAlign: 'center',
    fontSize: 12,
    color: '#8A919A',
  },
});