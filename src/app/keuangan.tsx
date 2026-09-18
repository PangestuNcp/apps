import React, { useCallback, useState } from 'react';

import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';

import {
  useFocusEffect,
  useRouter,
} from 'expo-router';

import { Ionicons } from '@expo/vector-icons';

import db from '../database/database';
import AssetCompositionRing from '../components/AssetCompositionRing';

type Saldo = {
  cash: number;
  dompet_grab: number;
  ovo: number;
  seabank: number;
  kredit_grab: number;
};

type Ringkasan = {
  pendapatan: number;
  pengeluaran: number;
};

type Aktivitas = {
  id: number;
  tanggal: string;
  jenis: string;
  subjenis: string | null;
  keterangan: string | null;
  nominal: number;
};

/* =========================================================
   FORMAT RUPIAH
========================================================= */

function rupiah(nominal: number) {
  return `Rp${Math.abs(nominal).toLocaleString('id-ID')}`;
}

/* =========================================================
   FORMAT TANGGAL
========================================================= */

function formatTanggal(tanggal: string) {
  const date = new Date(tanggal);

  if (Number.isNaN(date.getTime())) {
    return tanggal;
  }

  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatJam(tanggal: string) {
  const date = new Date(tanggal);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* =========================================================
   NAMA AKTIVITAS
========================================================= */

function namaAktivitas(item: Aktivitas) {
  if (
    item.subjenis === 'orderan_tunai' ||
    item.subjenis === 'orderan_non_tunai'
  ) {
    return 'Pendapatan Grab';
  }

  if (
    item.subjenis === 'tips_tunai' ||
    item.subjenis === 'tips_non_tunai'
  ) {
    return 'Tips';
  }

  if (
    item.subjenis ===
    'kekurangan_tagihan_tunai_grab'
  ) {
    return 'Topup Kekurangan Kredit Grab';
  }

  if (item.subjenis === 'oli') {
    return 'Penggantian Oli';
  }

  if (item.subjenis === 'bensin') {
    return 'Pembelian Bensin';
  }

  if (item.jenis === 'transfer') {
    return 'Transfer';
  }

  if (item.jenis === 'pendapatan') {
    return 'Pendapatan';
  }

  if (item.jenis === 'pengeluaran') {
    return 'Pengeluaran';
  }

  return item.keterangan || 'Aktivitas';
}

/* =========================================================
   DETAIL AKTIVITAS
========================================================= */

function detailAktivitas(item: Aktivitas) {
  if (item.subjenis === 'orderan_tunai') {
    return 'Orderan Tunai';
  }

  if (item.subjenis === 'orderan_non_tunai') {
    return 'Orderan Non-Tunai';
  }

  if (item.subjenis === 'tips_tunai') {
    return 'Tunai';
  }

  if (item.subjenis === 'tips_non_tunai') {
    return 'Non-Tunai';
  }

  if (
    item.subjenis ===
    'kekurangan_tagihan_tunai_grab'
  ) {
    return 'Dompet Grab';
  }

  if (item.subjenis === 'oli') {
    return 'Motor';
  }

  if (item.subjenis === 'bensin') {
    return 'Motor';
  }

  if (item.jenis === 'transfer') {
    return 'Pindah Uang';
  }

  return item.keterangan || 'Transaksi';
}

/* =========================================================
   ICON AKTIVITAS
========================================================= */

function aktivitasStyle(item: Aktivitas) {
  if (item.jenis === 'pendapatan') {
    return {
      icon: 'arrow-down-outline' as const,
      color: '#18B47E',
      background: '#DDF7EE',
    };
  }

  if (item.jenis === 'transfer') {
    return {
      icon: 'swap-horizontal-outline' as const,
      color: '#6C4CE8',
      background: '#EEE8FF',
    };
  }

  return {
    icon: 'arrow-up-outline' as const,
    color: '#FF5964',
    background: '#FFE5E9',
  };
}

/* =========================================================
   AKSI TRANSFER
========================================================= */

function TransferMenu({
  onTransfer,
  onTopUp,
  onCashOut,
}: {
  onTransfer: () => void;
  onTopUp: () => void;
  onCashOut: () => void;
}) {
  return (
    <View style={styles.transferCard}>

      {/* TRANSFER */}

      <Pressable
        style={styles.transferItem}
        onPress={onTransfer}
      >
        <View
          style={[
            styles.transferIcon,
            styles.transferPurple,
          ]}
        >
          <Ionicons
            name="swap-horizontal"
            size={24}
            color="#6C4CE8"
          />
        </View>

        <Text style={styles.transferLabel}>
          Transfer
        </Text>
      </Pressable>

      <View style={styles.transferDivider} />

      {/* TOP-UP */}

      <Pressable
        style={styles.transferItem}
        onPress={onTopUp}
      >
        <View
          style={[
            styles.transferIcon,
            styles.transferBlue,
          ]}
        >
          <Ionicons
            name="card-outline"
            size={24}
            color="#1976D2"
          />
        </View>

        <Text style={styles.transferLabel}>
          Top-Up
        </Text>
      </Pressable>

      <View style={styles.transferDivider} />

      {/* CASH-OUT */}

      <Pressable
        style={styles.transferItem}
        onPress={onCashOut}
      >
        <View
          style={[
            styles.transferIcon,
            styles.transferOrange,
          ]}
        >
          <Ionicons
            name="cash-outline"
            size={24}
            color="#F59E0B"
          />
        </View>

        <Text style={styles.transferLabel}>
          Cash-out
        </Text>
      </Pressable>

    </View>
  );
}

/* =========================================================
   RINGKASAN KEUANGAN
========================================================= */

function RingkasanKeuangan({
  onAnalisis,
  onAuditAset,
  onAuditBulan,
  onRiwayat,
}: {
  onAnalisis: () => void;
  onAuditAset: () => void;
  onAuditBulan: () => void;
  onRiwayat: () => void;
}) {
  return (
    <View style={styles.sectionCard}>

      <View style={styles.sectionHeader}>

        <View>
          <Text style={styles.sectionTitle}>
            Ringkasan Keuangan
          </Text>

          <Text style={styles.sectionSubtitle}>
            Laporan dan pemeriksaan keuangan
          </Text>
        </View>

        <Ionicons
          name="ellipsis-horizontal"
          size={20}
          color="#A2B0B7"
        />

      </View>

      <View style={styles.summaryGrid}>

        {/* ANALISIS */}

        <Pressable
          style={[
            styles.summaryItem,
            styles.summaryPurple,
          ]}
          onPress={onAnalisis}
        >
          <View
            style={[
              styles.summaryIcon,
              styles.summaryIconPurple,
            ]}
          >
            <Ionicons
              name="analytics-outline"
              size={21}
              color="#6C4CE8"
            />
          </View>

          <Text style={styles.summaryTitle}>
            Analisis Keuangan
          </Text>

          <Ionicons
            name="chevron-forward"
            size={16}
            color="#6C4CE8"
            style={styles.summaryArrow}
          />
        </Pressable>

        {/* AUDIT ASET */}

        <Pressable
          style={[
            styles.summaryItem,
            styles.summaryGreen,
          ]}
          onPress={onAuditAset}
        >
          <View
            style={[
              styles.summaryIcon,
              styles.summaryIconGreen,
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={21}
              color="#18A874"
            />
          </View>

          <Text style={styles.summaryTitle}>
            Audit Aset
          </Text>

          <Ionicons
            name="chevron-forward"
            size={16}
            color="#18A874"
            style={styles.summaryArrow}
          />
        </Pressable>

        {/* AUDIT BULAN */}

        <Pressable
          style={[
            styles.summaryItem,
            styles.summaryBlue,
          ]}
          onPress={onAuditBulan}
        >
          <View
            style={[
              styles.summaryIcon,
              styles.summaryIconBlue,
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={21}
              color="#1976D2"
            />
          </View>

          <Text style={styles.summaryTitle}>
            Audit Bulan
          </Text>

          <Ionicons
            name="chevron-forward"
            size={16}
            color="#1976D2"
            style={styles.summaryArrow}
          />
        </Pressable>

        {/* RIWAYAT */}

        <Pressable
          style={[
            styles.summaryItem,
            styles.summaryOrange,
          ]}
          onPress={onRiwayat}
        >
          <View
            style={[
              styles.summaryIcon,
              styles.summaryIconOrange,
            ]}
          >
            <Ionicons
              name="time-outline"
              size={21}
              color="#F59E0B"
            />
          </View>

          <Text style={styles.summaryTitle}>
            Riwayat Keuangan
          </Text>

          <Ionicons
            name="chevron-forward"
            size={16}
            color="#F59E0B"
            style={styles.summaryArrow}
          />
        </Pressable>

      </View>

    </View>
  );
}

/* =========================================================
   AKTIVITAS KEUANGAN
========================================================= */

function AktivitasKeuangan({
  data,
  onLihatSemua,
}: {
  data: Aktivitas[];
  onLihatSemua: () => void;
}) {
  return (
    <View style={styles.activitySection}>

      <View style={styles.activityHeader}>

        <Text style={styles.sectionTitle}>
          Aktivitas Keuangan
        </Text>

        <Pressable
          onPress={onLihatSemua}
          style={styles.lihatSemua}
        >
          <Text style={styles.lihatSemuaText}>
            Lihat Semua
          </Text>

          <Ionicons
            name="chevron-forward"
            size={15}
            color="#6C4CE8"
          />
        </Pressable>

      </View>

      <View style={styles.activityCard}>

        {data.length === 0 ? (

          <View style={styles.emptyActivity}>

            <View style={styles.emptyIcon}>
              <Ionicons
                name="receipt-outline"
                size={25}
                color="#9EB1BA"
              />
            </View>

            <Text style={styles.emptyTitle}>
              Belum ada aktivitas
            </Text>

            <Text style={styles.emptyText}>
              Transaksi terbaru akan muncul di sini.
            </Text>

          </View>

        ) : (

          data.map((item, index) => {

            const icon =
              aktivitasStyle(item);

            const positif =
              item.jenis === 'pendapatan';

            return (
              <View
                key={item.id}
                style={[
                  styles.activityRow,
                  index < data.length - 1 &&
                    styles.activityRowBorder,
                ]}
              >

                <View
                  style={[
                    styles.activityIcon,
                    {
                      backgroundColor:
                        icon.background,
                    },
                  ]}
                >
                  <Ionicons
                    name={icon.icon}
                    size={18}
                    color={icon.color}
                  />
                </View>

                <View style={styles.activityInfo}>

                  <Text
                    style={styles.activityTitle}
                    numberOfLines={1}
                  >
                    {namaAktivitas(item)}
                  </Text>

                  <Text
                    style={styles.activityDetail}
                    numberOfLines={1}
                  >
                    {detailAktivitas(item)}
                  </Text>

                  <Text style={styles.activityDate}>
                    {formatTanggal(item.tanggal)}
                    {' • '}
                    {formatJam(item.tanggal)}
                  </Text>

                </View>

                <View style={styles.activityAmountWrap}>

                  <Text
                    style={[
                      styles.activityAmount,
                      {
                        color: positif
                          ? '#18A874'
                          : '#FF5964',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {positif ? '+' : '-'}
                    {rupiah(item.nominal)}
                  </Text>

                  <Ionicons
                    name="chevron-forward"
                    size={15}
                    color="#A5B3BA"
                  />

                </View>

              </View>
            );
          })

        )}

      </View>

    </View>
  );
}

/* =========================================================
   SCREEN
========================================================= */

export default function KeuanganScreen() {
  const router = useRouter();

  const [saldo, setSaldo] = useState<Saldo>({
    cash: 0,
    dompet_grab: 0,
    ovo: 0,
    seabank: 0,
    kredit_grab: 0,
  });

  const [ringkasan, setRingkasan] =
    useState<Ringkasan>({
      pendapatan: 0,
      pengeluaran: 0,
    });

  const [aktivitas, setAktivitas] =
    useState<Aktivitas[]>([]);

  const loadData = useCallback(() => {

    /* =========================
       SALDO
    ========================= */

    const saldoData =
      db.getFirstSync<Saldo>(`
        SELECT
          cash,
          dompet_grab,
          ovo,
          seabank,
          kredit_grab
        FROM saldo
        WHERE id = 1
      `);

    if (saldoData) {
      setSaldo(saldoData);
    }

    /* =========================
       BULAN SEKARANG
    ========================= */

    const sekarang = new Date();

    const tahun =
      sekarang.getFullYear();

    const bulan =
      String(
        sekarang.getMonth() + 1
      ).padStart(2, '0');

    const bulanSekarang =
      `${tahun}-${bulan}`;

    /* =========================
       RINGKASAN
    ========================= */

    const ringkasanData =
      db.getFirstSync<Ringkasan>(
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
          ) AS pengeluaran

        FROM transaksi

        WHERE tanggal LIKE ?
        `,
        [`${bulanSekarang}%`]
      );

    if (ringkasanData) {
      setRingkasan(ringkasanData);
    }

    /* =========================
       AKTIVITAS TERBARU
    ========================= */

    const aktivitasData =
      db.getAllSync<Aktivitas>(
        `
        SELECT
          id,
          tanggal,
          jenis,
          subjenis,
          keterangan,
          nominal
        FROM transaksi
        ORDER BY id DESC
        LIMIT 5
        `
      );

    setAktivitas(aktivitasData);

  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const totalAset =
    saldo.cash +
    saldo.dompet_grab +
    saldo.ovo +
    saldo.seabank;

  const saldoBersih =
    ringkasan.pendapatan -
    ringkasan.pengeluaran;

  return (
    <SafeAreaView style={styles.container}>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={false}
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <View style={styles.header}>

          <View style={styles.headerLeft}>

            <Pressable
              style={styles.headerBack}
              onPress={() => router.back()}
            >
              <Ionicons
                name="chevron-back"
                size={23}
                color="#104F5A"
              />
            </Pressable>

            <View>
              <Text style={styles.headerTitle}>
                Keuangan
              </Text>

              <Text style={styles.headerSubtitle}>
                Kelola aset dan keuanganmu
              </Text>
            </View>

          </View>

          <View style={styles.headerRight}>

            <Pressable
              style={styles.headerCircle}
            >
              <Ionicons
                name="notifications-outline"
                size={21}
                color="#104F5A"
              />

              <View
                style={styles.notificationDot}
              />
            </Pressable>

            <Pressable
              style={styles.headerCircle}
              onPress={() =>
                router.push('/lainnya')
              }
            >
              <Ionicons
                name="person-outline"
                size={20}
                color="#104F5A"
              />
            </Pressable>

          </View>

        </View>

        {/* =================================================
            ASSET RING
        ================================================= */}

        <View style={styles.assetSection}>

          <AssetCompositionRing
            assets={[
              {
                key: 'seabank',
                name: 'SeaBank',
                amount: saldo.seabank,
                color: '#7B61A8',
              },
              {
                key: 'ovo',
                name: 'OVO',
                amount: saldo.ovo,
                color: '#1976D2',
              },
              {
                key: 'cash',
                name: 'Cash',
                amount: saldo.cash,
                color: '#18B47E',
              },
              {
                key: 'dompet_grab',
                name: 'Dompet Grab',
                amount:
                  saldo.dompet_grab,
                color: '#F59E0B',
              },
            ]}
          />

        </View>

        {/* =================================================
            TRANSFER / TOP-UP / CASH-OUT
        ================================================= */}

        <TransferMenu
          onTransfer={() =>
            router.push('/transfer')
          }
          onTopUp={() =>
            router.push('/kredit-grab')
          }
          onCashOut={() =>
            router.push('/tarik-tunai')
          }
        />

        {/* =================================================
            RINGKASAN KEUANGAN
        ================================================= */}

        <View style={styles.sectionSpacing}>

          <RingkasanKeuangan
            onAnalisis={() =>
              router.push('/analisis-keuangan')
            }
            onAuditAset={() =>
              router.push('/audit-aset')
            }
            onAuditBulan={() =>
              router.push('/audit-bulan')
            }
            onRiwayat={() =>
              router.push('/riwayat')
            }
          />

        </View>

        {/* =================================================
            AKTIVITAS KEUANGAN
        ================================================= */}

        <AktivitasKeuangan
          data={aktivitas}
          onLihatSemua={() =>
            router.push('/riwayat')
          }
        />

        {/* =================================================
            BOTTOM NAVIGATION
        ================================================= */}

        <View style={styles.bottomNav}>

          {/* TRANSAKSI */}

          <Pressable
            style={styles.navItem}
            onPress={() =>
              router.replace('/')
            }
          >
            <Ionicons
              name="swap-horizontal-outline"
              size={22}
              color="#9AA8AE"
            />

            <Text style={styles.navLabel}>
              Transaksi
            </Text>
          </Pressable>

          {/* KEUANGAN */}

          <Pressable
            style={styles.navItem}
          >
            <Ionicons
              name="wallet"
              size={22}
              color="#18B47E"
            />

            <Text
              style={[
                styles.navLabel,
                styles.navActive,
              ]}
            >
              Keuangan
            </Text>
          </Pressable>

          {/* MOTOR */}

          <Pressable
            style={styles.navItem}
            onPress={() =>
              router.push('/motor')
            }
          >
            <Ionicons
              name="bicycle-outline"
              size={22}
              color="#9AA8AE"
            />

            <Text style={styles.navLabel}>
              Motor
            </Text>
          </Pressable>

          {/* LAINNYA */}

          <Pressable
            style={styles.navItem}
            onPress={() =>
              router.push('/lainnya')
            }
          >
            <Ionicons
              name="ellipsis-horizontal-circle-outline"
              size={22}
              color="#9AA8AE"
            />

            <Text style={styles.navLabel}>
              Lainnya
            </Text>
          </Pressable>

        </View>

      </ScrollView>

    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({

  /* =========================
     CONTAINER
  ========================= */

  container: {
    flex: 1,
    backgroundColor: '#F6FAF9',
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 25,
  },

  /* =========================
     HEADER
  ========================= */

  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  headerBack: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#104F5A',
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: '#66889A',
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  headerCircle: {
    width: 39,
    height: 39,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5EFED',
  },

  notificationDot: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FF5964',
    top: 8,
    right: 8,
  },

  /* =========================
     ASSET
  ========================= */

  assetSection: {
    alignItems: 'center',
    marginTop: -2,
    marginBottom: 5,
  },

  /* =========================
     TRANSFER
  ========================= */

  transferCard: {
    width: '100%',
    minHeight: 110,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#E6EFEE',
    paddingHorizontal: 7,
    paddingVertical: 10,

    shadowColor: '#B6C8C5',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 2,
  },

  transferItem: {
    flex: 1,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },

  transferIcon: {
    width: 47,
    height: 47,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  transferPurple: {
    backgroundColor: '#EEE8FF',
  },

  transferBlue: {
    backgroundColor: '#E4F0FF',
  },

  transferOrange: {
    backgroundColor: '#FFF0DD',
  },

  transferLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#104F5A',
  },

  transferDivider: {
    width: 1,
    height: 57,
    backgroundColor: '#E8F0EF',
  },

  /* =========================
     SECTION
  ========================= */

  sectionSpacing: {
    marginTop: 15,
  },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#E6EFEE',
    padding: 13,

    shadowColor: '#B6C8C5',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 2,
  },

  sectionHeader: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 9,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#104F5A',
  },

  sectionSubtitle: {
    marginTop: 2,
    fontSize: 9,
    color: '#8AA0AC',
  },

  /* =========================
     SUMMARY
  ========================= */

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  summaryItem: {
    width: '48%',
    minHeight: 105,
    borderRadius: 16,
    padding: 10,
    position: 'relative',
  },

  summaryPurple: {
    backgroundColor: '#F3F0FF',
  },

  summaryGreen: {
    backgroundColor: '#EEF9F5',
  },

  summaryBlue: {
    backgroundColor: '#EEF5FF',
  },

  summaryOrange: {
    backgroundColor: '#FFF6E9',
  },

  summaryIcon: {
    width: 37,
    height: 37,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  summaryIconPurple: {
    backgroundColor: '#E8E0FF',
  },

  summaryIconGreen: {
    backgroundColor: '#D8F4E9',
  },

  summaryIconBlue: {
    backgroundColor: '#DDEBFF',
  },

  summaryIconOrange: {
    backgroundColor: '#FFEBCB',
  },

  summaryTitle: {
    paddingRight: 16,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    color: '#104F5A',
  },

  summaryArrow: {
    position: 'absolute',
    right: 9,
    bottom: 10,
  },

  /* =========================
     ACTIVITY
  ========================= */

  activitySection: {
    marginTop: 16,
  },

  activityHeader: {
    minHeight: 35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 7,
  },

  lihatSemua: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  lihatSemuaText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6C4CE8',
  },

  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#E6EFEE',
    paddingHorizontal: 12,
    paddingVertical: 2,

    shadowColor: '#B6C8C5',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 2,
  },

  activityRow: {
    minHeight: 69,
    flexDirection: 'row',
    alignItems: 'center',
  },

  activityRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F1',
  },

  activityIcon: {
    width: 37,
    height: 37,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  activityInfo: {
    flex: 1,
    marginLeft: 9,
    marginRight: 5,
  },

  activityTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#104F5A',
  },

  activityDetail: {
    marginTop: 2,
    fontSize: 9,
    color: '#66889A',
  },

  activityDate: {
    marginTop: 2,
    fontSize: 8,
    color: '#9BAAB3',
  },

  activityAmountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  activityAmount: {
    maxWidth: 105,
    fontSize: 9,
    fontWeight: '700',
  },

  emptyActivity: {
    minHeight: 170,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyIcon: {
    width: 47,
    height: 47,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF3F4',
  },

  emptyTitle: {
    marginTop: 9,
    fontSize: 11,
    fontWeight: '700',
    color: '#66808D',
  },

  emptyText: {
    marginTop: 3,
    fontSize: 9,
    color: '#9BAAB3',
    textAlign: 'center',
  },

  /* =========================
     BOTTOM NAV
  ========================= */

  bottomNav: {
    minHeight: 72,
    marginTop: 18,
    marginHorizontal: -18,
    paddingHorizontal: 15,
    paddingTop: 9,
    paddingBottom: 7,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',

    backgroundColor: '#FFFFFF',

    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,

    borderTopWidth: 1,
    borderTopColor: '#E7EFEE',

    shadowColor: '#AFC1BE',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: -3,
    },

    elevation: 4,
  },

  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },

  navLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#9AA8AE',
  },

  navActive: {
    color: '#18B47E',
  },

});

