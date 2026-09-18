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

import { useFocusEffect, useRouter } from 'expo-router';

import db from '../database/database';

type AuditBulan = {
  id: number;
  bulan: string;
  tanggal_selesai: string;

  opening_cash: number;
  opening_dompet_grab: number;
  opening_ovo: number;
  opening_seabank: number;
  opening_kredit_grab: number;

  pendapatan: number;
  tips: number;
  pengeluaran: number;
  pendapatan_bersih: number;

  closing_cash: number;
  closing_dompet_grab: number;
  closing_ovo: number;
  closing_seabank: number;
  closing_kredit_grab: number;

  total_aset: number;
};

function formatRupiah(nominal: number) {
  const tanda = nominal < 0 ? '-' : '';

  return `${tanda}Rp${Math.abs(nominal).toLocaleString('id-ID')}`;
}

function namaBulan(kode: string) {
  const [tahun, bulan] = kode.split('-').map(Number);

  const daftar = [
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

  return `${daftar[bulan - 1]} ${tahun}`;
}

export default function RiwayatAuditBulanScreen() {
  const router = useRouter();

  const [data, setData] = useState<AuditBulan[]>([]);
  const [terpilih, setTerpilih] = useState<AuditBulan | null>(null);

  const loadData = useCallback(() => {
    const hasil = db.getAllSync<AuditBulan>(
      `
      SELECT
        id,
        bulan,
        tanggal_selesai,

        opening_cash,
        opening_dompet_grab,
        opening_ovo,
        opening_seabank,
        opening_kredit_grab,

        pendapatan,
        tips,
        pengeluaran,
        pendapatan_bersih,

        closing_cash,
        closing_dompet_grab,
        closing_ovo,
        closing_seabank,
        closing_kredit_grab,

        total_aset
      FROM audit_bulan
      ORDER BY bulan DESC, id DESC
      `
    );

    setData(hasil);
    setTerpilih(null);
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
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
          >
            <Text style={styles.back}>‹</Text>
          </Pressable>

          <View>
            <Text style={styles.title}>
              Riwayat Audit
            </Text>

            <Text style={styles.subtitle}>
              Settlement Bulanan
            </Text>
          </View>
        </View>

        {/* LIST */}
        {data.length === 0 ? (
          <View style={styles.emptyArea}>
            <Text style={styles.emptyTitle}>
              Belum Ada Riwayat
            </Text>

            <Text style={styles.emptyText}>
              Riwayat akan muncul setelah kamu melakukan
              settlement bulan.
            </Text>
          </View>
        ) : (
          data.map((item) => (
            <Pressable
              key={item.id}
              style={styles.monthButton}
              onPress={() => setTerpilih(item)}
            >
              <View>
                <Text style={styles.periodLabel}>
                  PERIODE
                </Text>

                <Text style={styles.monthValue}>
                  {namaBulan(item.bulan)}
                </Text>
              </View>

              <View style={styles.monthRight}>
                <Text style={styles.status}>
                  ✓ Selesai
                </Text>

                <Text style={styles.arrow}>
                  ›
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* POPUP DETAIL */}
      <Modal
        visible={terpilih !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTerpilih(null)}
      >
        <View style={styles.modalOverlay}>
          {/* AREA LUAR UNTUK MENUTUP POPUP */}
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setTerpilih(null)}
          />

          {/* POPUP */}
          <View style={styles.modalCard}>
            {terpilih && (
              <>
                {/* MODAL HEADER */}
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalCaption}>
                      PERIODE
                    </Text>

                    <Text style={styles.modalTitle}>
                      {namaBulan(terpilih.bulan)}
                    </Text>
                  </View>

                  <Pressable
                    style={styles.closeButton}
                    onPress={() => setTerpilih(null)}
                    hitSlop={8}
                  >
                    <Text style={styles.closeText}>
                      ×
                    </Text>
                  </Pressable>
                </View>

                {/* ISI POPUP YANG BISA DI-SCROLL */}
                <ScrollView
                  style={styles.modalScroll}
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                  bounces={true}
                >
                  {/* RINCIAN KEUANGAN */}
                  <Text style={styles.sectionTitle}>
                    Rincian Keuangan
                  </Text>

                  <View style={styles.row}>
                    <Text style={styles.label}>
                      Pendapatan
                    </Text>

                    <Text style={styles.incomeValue}>
                      {formatRupiah(terpilih.pendapatan)}
                    </Text>
                  </View>

                  <View style={styles.subRow}>
                    <Text style={styles.subLabel}>
                      termasuk Tips
                    </Text>

                    <Text style={styles.subValue}>
                      {formatRupiah(terpilih.tips)}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>
                      Pengeluaran
                    </Text>

                    <Text style={styles.expenseValue}>
                      {formatRupiah(terpilih.pengeluaran)}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.labelStrong}>
                      Pendapatan Bersih
                    </Text>

                    <Text
                      style={[
                        styles.netValue,
                        terpilih.pendapatan_bersih < 0
                          ? styles.negative
                          : styles.positive,
                      ]}
                    >
                      {formatRupiah(
                        terpilih.pendapatan_bersih
                      )}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  {/* ASET AWAL */}
                  <Text style={styles.sectionTitle}>
                    Aset Awal
                  </Text>

                  <View style={styles.row}>
                    <Text style={styles.label}>
                      Cash
                    </Text>

                    <Text style={styles.value}>
                      {formatRupiah(
                        terpilih.opening_cash
                      )}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>
                      Dompet Grab
                    </Text>

                    <Text style={styles.value}>
                      {formatRupiah(
                        terpilih.opening_dompet_grab
                      )}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>
                      OVO
                    </Text>

                    <Text style={styles.value}>
                      {formatRupiah(
                        terpilih.opening_ovo
                      )}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>
                      SeaBank
                    </Text>

                    <Text style={styles.value}>
                      {formatRupiah(
                        terpilih.opening_seabank
                      )}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>
                      Kredit Grab
                    </Text>

                    <Text style={styles.value}>
                      {formatRupiah(
                        terpilih.opening_kredit_grab
                      )}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  {/* ASET AKHIR */}
                  <Text style={styles.sectionTitle}>
                    Aset Akhir
                  </Text>

                  <View style={styles.row}>
                    <Text style={styles.label}>
                      Cash
                    </Text>

                    <Text style={styles.value}>
                      {formatRupiah(
                        terpilih.closing_cash
                      )}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>
                      Dompet Grab
                    </Text>

                    <Text
                      style={[
                        styles.value,
                        terpilih.closing_dompet_grab < 0 &&
                          styles.negative,
                      ]}
                    >
                      {formatRupiah(
                        terpilih.closing_dompet_grab
                      )}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>
                      OVO
                    </Text>

                    <Text style={styles.value}>
                      {formatRupiah(
                        terpilih.closing_ovo
                      )}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>
                      SeaBank
                    </Text>

                    <Text style={styles.value}>
                      {formatRupiah(
                        terpilih.closing_seabank
                      )}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>
                      Kredit Grab
                    </Text>

                    <Text style={styles.value}>
                      {formatRupiah(
                        terpilih.closing_kredit_grab
                      )}
                    </Text>
                  </View>

                  {/* TOTAL ASET */}
                  <View style={styles.totalArea}>
                    <Text style={styles.totalCaption}>
                      TOTAL ASET
                    </Text>

                    <Text style={styles.totalValue}>
                      {formatRupiah(
                        terpilih.total_aset
                      )}
                    </Text>

                    <Text style={styles.totalNote}>
                      Kredit Grab tidak termasuk dalam
                      Total Aset.
                    </Text>
                  </View>

                  <Text style={styles.dateText}>
                    Ditutup: {terpilih.tanggal_selesai}
                  </Text>
                </ScrollView>
              </>
            )}
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
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },

  back: {
    fontSize: 42,
    lineHeight: 42,
    marginRight: 14,
    color: '#333',
    fontWeight: '300',
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#20242A',
  },

  subtitle: {
    marginTop: 2,
    color: '#68707D',
    fontSize: 12,
  },

  emptyArea: {
    paddingTop: 25,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#20242A',
  },

  emptyText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: '#7B838E',
  },

  monthButton: {
    minHeight: 68,
    paddingVertical: 9,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E6E8EC',
  },

  periodLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8A919C',
    letterSpacing: 0.5,
  },

  monthValue: {
    marginTop: 4,
    fontSize: 19,
    fontWeight: '700',
    color: '#20242A',
  },

  monthRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  status: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4E8A67',
  },

  arrow: {
    marginLeft: 12,
    fontSize: 28,
    lineHeight: 28,
    color: '#8A919C',
    fontWeight: '300',
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  modalCard: {
    width: '90%',
    height: '82%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
  },

  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 19,
    paddingBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ECEEF1',
  },

  modalCaption: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8A919C',
    letterSpacing: 0.5,
  },

  modalTitle: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
    color: '#20242A',
  },

  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F3F5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeText: {
    fontSize: 25,
    lineHeight: 27,
    fontWeight: '300',
    color: '#68707D',
  },

  modalScroll: {
    flex: 1,
  },

  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#20242A',
    marginBottom: 7,
  },

  row: {
    minHeight: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  subRow: {
    minHeight: 27,
    paddingLeft: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  label: {
    fontSize: 13,
    color: '#59616C',
  },

  labelStrong: {
    fontSize: 13,
    fontWeight: '700',
    color: '#20242A',
  },

  value: {
    fontSize: 13,
    fontWeight: '600',
    color: '#20242A',
  },

  subLabel: {
    fontSize: 11,
    color: '#8A919C',
  },

  subValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7B838E',
  },

  incomeValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4E8A67',
  },

  expenseValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B85C5C',
  },

  netValue: {
    fontSize: 15,
    fontWeight: '700',
  },

  positive: {
    color: '#4E8A67',
  },

  negative: {
    color: '#B85C5C',
  },

  divider: {
    height: 1,
    backgroundColor: '#E6E8EC',
    marginVertical: 16,
  },

  totalArea: {
    marginTop: 18,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E6E8EC',
  },

  totalCaption: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8A919C',
    letterSpacing: 0.5,
  },

  totalValue: {
    marginTop: 4,
    fontSize: 21,
    fontWeight: '700',
    color: '#20242A',
  },

  totalNote: {
    marginTop: 4,
    fontSize: 10,
    color: '#8A919C',
  },

  dateText: {
    marginTop: 12,
    fontSize: 10,
    color: '#9A9FA8',
  },
});
