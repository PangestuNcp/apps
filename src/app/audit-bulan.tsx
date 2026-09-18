import React, { useCallback, useState } from 'react';

import {
  Alert,
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';

import db from '../database/database';

type Saldo = {
  cash: number;
  dompet_grab: number;
  ovo: number;
  seabank: number;
  kredit_grab: number;
};

type Transaksi = {
  tanggal: string;
  jenis: string;
  subjenis: string | null;
  nominal: number;
};

type Tahap = 'awal' | 'settlement';

function formatRupiah(nominal: number) {
  const tanda = nominal < 0 ? '-' : '';

  return `${tanda}Rp${Math.abs(nominal).toLocaleString('id-ID')}`;
}

function getTanggalLokal() {
  const sekarang = new Date();

  const tahun = sekarang.getFullYear();

  const bulan = String(
    sekarang.getMonth() + 1
  ).padStart(2, '0');

  const tanggal = String(
    sekarang.getDate()
  ).padStart(2, '0');

  return `${tahun}-${bulan}-${tanggal}`;
}

function namaBulan(bulan: number) {
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

  return daftar[bulan];
}

function getBulanBerikutnya(
  tahun: number,
  bulan: number
) {
  if (bulan === 11) {
    return {
      tahun: tahun + 1,
      bulan: 0,
    };
  }

  return {
    tahun,
    bulan: bulan + 1,
  };
}

function kodeBulan(
  tahun: number,
  bulan: number
) {
  return `${tahun}-${String(
    bulan + 1
  ).padStart(2, '0')}`;
}

export default function AuditBulanScreen() {
  const router = useRouter();

  const [saldo, setSaldo] = useState<Saldo>({
    cash: 0,
    dompet_grab: 0,
    ovo: 0,
    seabank: 0,
    kredit_grab: 0,
  });

  const [pendapatan, setPendapatan] = useState(0);
  const [tips, setTips] = useState(0);
  const [pengeluaran, setPengeluaran] = useState(0);

  const [tahap, setTahap] =
    useState<Tahap>('settlement');

  const hariIni = new Date();

  const tahun = hariIni.getFullYear();
  const bulan = hariIni.getMonth();

  const bulanLabel =
    `${namaBulan(bulan)} ${tahun}`;

  const kodeBulanSekarang =
    kodeBulan(tahun, bulan);

  const bulanBerikutnya =
    getBulanBerikutnya(tahun, bulan);

  const bulanBerikutnyaLabel =
    `${namaBulan(bulanBerikutnya.bulan)} ` +
    `${bulanBerikutnya.tahun}`;

  const kodeBulanBerikutnya =
    kodeBulan(
      bulanBerikutnya.tahun,
      bulanBerikutnya.bulan
    );

  const [sudahAdaPeriode, setSudahAdaPeriode] =
    useState(false);

  const loadData = useCallback(() => {
    const saldoData =
      db.getFirstSync<Saldo>(
        `
        SELECT
          cash,
          dompet_grab,
          ovo,
          seabank,
          kredit_grab
        FROM saldo
        WHERE id = 1
        `
      );

    if (saldoData) {
      setSaldo(saldoData);
    }

    /*
     * Cek apakah periode pertama sudah pernah
     * dimulai melalui saldo_awal_bulan.
     */
    const periodeAwal =
      db.getFirstSync<{ id: number }>(
        `
        SELECT id
        FROM saldo_awal_bulan
        LIMIT 1
        `
      );

    setSudahAdaPeriode(
      Boolean(periodeAwal)
    );

    /*
     * Jika belum pernah ada periode,
     * tampilkan Set Data Awal.
     */
    if (!periodeAwal) {
      setTahap('awal');
    } else {
      setTahap('settlement');
    }

    /*
     * Ambil transaksi bulan berjalan.
     */
    const transaksi =
      db.getAllSync<Transaksi>(
        `
        SELECT
          tanggal,
          jenis,
          subjenis,
          nominal
        FROM transaksi
        ORDER BY id ASC
        `
      );

    let totalPendapatan = 0;
    let totalTips = 0;
    let totalPengeluaran = 0;

    transaksi.forEach((item) => {
      const tanggal =
        item.tanggal.slice(0, 10);

      if (
        !tanggal.startsWith(
          kodeBulanSekarang
        )
      ) {
        return;
      }

      if (
        item.jenis === 'pendapatan'
      ) {
        totalPendapatan += item.nominal;

        if (
          item.subjenis ===
            'tips_tunai' ||
          item.subjenis ===
            'tips_non_tunai'
        ) {
          totalTips += item.nominal;
        }
      }

      if (
        item.jenis === 'pengeluaran'
      ) {
        totalPengeluaran += item.nominal;
      }
    });

    setPendapatan(totalPendapatan);
    setTips(totalTips);
    setPengeluaran(totalPengeluaran);
  }, [kodeBulanSekarang]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const pendapatanBersih =
    pendapatan - pengeluaran;

  const totalAset =
    saldo.cash +
    saldo.dompet_grab +
    saldo.ovo +
    saldo.seabank;

  /*
   * SET DATA AWAL
   *
   * Tidak meminta user memilih akun.
   * Tidak meminta input nominal ulang.
   *
   * Data awal diambil langsung dari
   * saldo akun yang sudah ada di TERTATA.
   */
  const setDataAwal = () => {
    Alert.alert(
      'Set Data Awal',
      `TERTATA akan menggunakan saldo akun saat ini sebagai Aset Awal ${bulanLabel}.\n\n` +
        `Cash: ${formatRupiah(saldo.cash)}\n` +
        `Dompet Grab: ${formatRupiah(
          saldo.dompet_grab
        )}\n` +
        `OVO: ${formatRupiah(saldo.ovo)}\n` +
        `SeaBank: ${formatRupiah(
          saldo.seabank
        )}\n\n` +
        `Total Aset: ${formatRupiah(
          totalAset
        )}\n\n` +
        `Kredit Grab tidak termasuk Total Aset.\n\n` +
        `Data ini hanya menjadi titik awal periode pertama dan tidak mengubah saldo akun.`,
      [
        {
          text: 'Batal',
          style: 'cancel',
        },
        {
          text: 'Mulai Periode',
          onPress: () => {
            try {
              const existing =
                db.getFirstSync<{
                  id: number;
                }>(
                  `
                  SELECT id
                  FROM saldo_awal_bulan
                  WHERE bulan = ?
                  LIMIT 1
                  `,
                  [kodeBulanSekarang]
                );

              if (existing) {
                db.runSync(
                  `
                  UPDATE saldo_awal_bulan
                  SET
                    cash = ?,
                    dompet_grab = ?,
                    ovo = ?,
                    seabank = ?,
                    kredit_grab = ?,
                    total_aset = ?
                  WHERE id = ?
                  `,
                  [
                    saldo.cash,
                    saldo.dompet_grab,
                    saldo.ovo,
                    saldo.seabank,
                    saldo.kredit_grab,
                    totalAset,
                    existing.id,
                  ]
                );
              } else {
                db.runSync(
                  `
                  INSERT INTO saldo_awal_bulan (
                    bulan,
                    cash,
                    dompet_grab,
                    ovo,
                    seabank,
                    kredit_grab,
                    total_aset
                  )
                  VALUES (?, ?, ?, ?, ?, ?, ?)
                  `,
                  [
                    kodeBulanSekarang,
                    saldo.cash,
                    saldo.dompet_grab,
                    saldo.ovo,
                    saldo.seabank,
                    saldo.kredit_grab,
                    totalAset,
                  ]
                );
              }

              setSudahAdaPeriode(true);
              setTahap('settlement');

              Alert.alert(
                'Periode Dimulai',
                `Aset Awal ${bulanLabel} sudah tercatat.\n\n` +
                  `Saldo akun tetap menggunakan nominal yang sama.`
              );
            } catch (error) {
              console.error(
                'Gagal menyimpan data awal:',
                error
              );

              Alert.alert(
                'Gagal',
                'Data awal belum berhasil disimpan.'
              );
            }
          },
        },
      ]
    );
  };

  /*
   * SETTLEMENT BULAN BERJALAN
   *
   * Settlement menyimpan:
   * - periode
   * - aset awal
   * - pendapatan
   * - tips
   * - pengeluaran
   * - pendapatan bersih
   * - aset akhir
   *
   * Setelah settlement:
   * closing asset otomatis menjadi
   * opening asset bulan berikutnya.
   */
  const lakukanSettlement = () => {
    Alert.alert(
      'Settlement Bulan Ini',
      `Periode ${bulanLabel} akan diselesaikan.\n\n` +
        `Pendapatan: ${formatRupiah(
          pendapatan
        )}\n` +
        `Pengeluaran: ${formatRupiah(
          pengeluaran
        )}\n` +
        `Pendapatan Bersih: ${formatRupiah(
          pendapatanBersih
        )}\n\n` +
        `Aset saat ini akan menjadi Aset Awal ${bulanBerikutnyaLabel}.\n\n` +
        `Transaksi tidak akan dihapus.`,
      [
        {
          text: 'Batal',
          style: 'cancel',
        },
        {
          text: 'Settlement',
          onPress: () => {
            try {
              const tanggalHariIni =
                getTanggalLokal();

              /*
               * Ambil Aset Awal periode berjalan.
               */
              const opening =
                db.getFirstSync<{
                  cash: number;
                  dompet_grab: number;
                  ovo: number;
                  seabank: number;
                  kredit_grab: number;
                }>(
                  `
                  SELECT
                    cash,
                    dompet_grab,
                    ovo,
                    seabank,
                    kredit_grab
                  FROM saldo_awal_bulan
                  WHERE bulan = ?
                  ORDER BY id DESC
                  LIMIT 1
                  `,
                  [kodeBulanSekarang]
                );

              /*
               * Jika belum ada data awal,
               * gunakan saldo saat ini sebagai opening.
               */
              const dataOpening =
                opening ?? {
                  cash: saldo.cash,
                  dompet_grab:
                    saldo.dompet_grab,
                  ovo: saldo.ovo,
                  seabank: saldo.seabank,
                  kredit_grab:
                    saldo.kredit_grab,
                };

              const auditSudahAda =
                db.getFirstSync<{
                  id: number;
                }>(
                  `
                  SELECT id
                  FROM audit_bulan
                  WHERE bulan = ?
                  LIMIT 1
                  `,
                  [kodeBulanSekarang]
                );

              const dataAudit = {
                tanggalMulai:
                  `${kodeBulanSekarang}-01`,

                tanggalSelesai:
                  tanggalHariIni,

                openingCash:
                  dataOpening.cash,

                openingDompetGrab:
                  dataOpening.dompet_grab,

                openingOvo:
                  dataOpening.ovo,

                openingSeabank:
                  dataOpening.seabank,

                openingKreditGrab:
                  dataOpening.kredit_grab,

                pendapatan,

                tips,

                pengeluaran,

                pendapatanBersih,

                closingCash:
                  saldo.cash,

                closingDompetGrab:
                  saldo.dompet_grab,

                closingOvo:
                  saldo.ovo,

                closingSeabank:
                  saldo.seabank,

                closingKreditGrab:
                  saldo.kredit_grab,

                totalAset,
              };

              if (auditSudahAda) {
                db.runSync(
                  `
                  UPDATE audit_bulan
                  SET
                    tanggal_mulai = ?,
                    tanggal_selesai = ?,
                    opening_cash = ?,
                    opening_dompet_grab = ?,
                    opening_ovo = ?,
                    opening_seabank = ?,
                    opening_kredit_grab = ?,
                    pendapatan = ?,
                    tips = ?,
                    pengeluaran = ?,
                    pendapatan_bersih = ?,
                    closing_cash = ?,
                    closing_dompet_grab = ?,
                    closing_ovo = ?,
                    closing_seabank = ?,
                    closing_kredit_grab = ?,
                    total_aset = ?
                  WHERE id = ?
                  `,
                  [
                    dataAudit.tanggalMulai,
                    dataAudit.tanggalSelesai,
                    dataAudit.openingCash,
                    dataAudit.openingDompetGrab,
                    dataAudit.openingOvo,
                    dataAudit.openingSeabank,
                    dataAudit.openingKreditGrab,
                    dataAudit.pendapatan,
                    dataAudit.tips,
                    dataAudit.pengeluaran,
                    dataAudit.pendapatanBersih,
                    dataAudit.closingCash,
                    dataAudit.closingDompetGrab,
                    dataAudit.closingOvo,
                    dataAudit.closingSeabank,
                    dataAudit.closingKreditGrab,
                    dataAudit.totalAset,
                    auditSudahAda.id,
                  ]
                );
              } else {
                db.runSync(
                  `
                  INSERT INTO audit_bulan (
                    bulan,
                    tanggal_mulai,
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
                  )
                  VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?, ?
                  )
                  `,
                  [
                    kodeBulanSekarang,
                    dataAudit.tanggalMulai,
                    dataAudit.tanggalSelesai,
                    dataAudit.openingCash,
                    dataAudit.openingDompetGrab,
                    dataAudit.openingOvo,
                    dataAudit.openingSeabank,
                    dataAudit.openingKreditGrab,
                    dataAudit.pendapatan,
                    dataAudit.tips,
                    dataAudit.pengeluaran,
                    dataAudit.pendapatanBersih,
                    dataAudit.closingCash,
                    dataAudit.closingDompetGrab,
                    dataAudit.closingOvo,
                    dataAudit.closingSeabank,
                    dataAudit.closingKreditGrab,
                    dataAudit.totalAset,
                  ]
                );
              }

              /*
               * Closing bulan ini otomatis menjadi
               * opening bulan berikutnya.
               */
              const existingNext =
                db.getFirstSync<{
                  id: number;
                }>(
                  `
                  SELECT id
                  FROM saldo_awal_bulan
                  WHERE bulan = ?
                  LIMIT 1
                  `,
                  [kodeBulanBerikutnya]
                );

              if (existingNext) {
                db.runSync(
                  `
                  UPDATE saldo_awal_bulan
                  SET
                    cash = ?,
                    dompet_grab = ?,
                    ovo = ?,
                    seabank = ?,
                    kredit_grab = ?,
                    total_aset = ?
                  WHERE id = ?
                  `,
                  [
                    saldo.cash,
                    saldo.dompet_grab,
                    saldo.ovo,
                    saldo.seabank,
                    saldo.kredit_grab,
                    totalAset,
                    existingNext.id,
                  ]
                );
              } else {
                db.runSync(
                  `
                  INSERT INTO saldo_awal_bulan (
                    bulan,
                    cash,
                    dompet_grab,
                    ovo,
                    seabank,
                    kredit_grab,
                    total_aset
                  )
                  VALUES (?, ?, ?, ?, ?, ?, ?)
                  `,
                  [
                    kodeBulanBerikutnya,
                    saldo.cash,
                    saldo.dompet_grab,
                    saldo.ovo,
                    saldo.seabank,
                    saldo.kredit_grab,
                    totalAset,
                  ]
                );
              }

              Alert.alert(
                'Settlement Berhasil',
                `Periode ${bulanLabel} sudah diselesaikan.\n\n` +
                  `Aset akhir: ${formatRupiah(
                    totalAset
                  )}\n\n` +
                  `Nominal tersebut otomatis menjadi Aset Awal ${bulanBerikutnyaLabel}.`,
                [
                  {
                    text: 'OK',
                    onPress: () =>
                      router.back(),
                  },
                ]
              );
            } catch (error) {
              console.error(
                'Gagal menyimpan settlement:',
                error
              );

              Alert.alert(
                'Gagal',
                'Settlement bulan belum berhasil disimpan.'
              );
            }
          },
        },
      ]
    );
  };

  /*
   * FIRST USE
   */
  if (
    tahap === 'awal' &&
    !sudahAdaPeriode
  ) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={
            styles.content
          }
        >
          <View style={styles.header}>
            <Pressable
              onPress={() =>
                router.back()
              }
              hitSlop={10}
            >
              <Text style={styles.back}>
                ‹
              </Text>
            </Pressable>

            <View>
              <Text style={styles.title}>
                Settlement
              </Text>

              <Text
                style={styles.subtitle}
              >
                Mulai periode keuangan
              </Text>
            </View>
          </View>

          <View
            style={styles.introArea}
          >
            <Text
              style={styles.introTitle}
            >
              Set Data Awal
            </Text>

            <Text
              style={styles.introText}
            >
              Ini adalah pertama kalinya
              TERTATA memulai periode
              keuangan.
            </Text>

            <Text
              style={styles.introText}
            >
              TERTATA akan menggunakan
              saldo akun yang sudah tercatat
              sebagai Aset Awal.
            </Text>

            <Text
              style={styles.introText}
            >
              Tidak perlu memilih akun atau
              memasukkan saldo ulang.
              Kelola Akun tetap menjadi
              sumber data akun dan saldo.
            </Text>
          </View>

          <Text
            style={styles.sectionTitle}
          >
            Aset Saat Ini
          </Text>

          <View
            style={styles.assetArea}
          >
            <View
              style={styles.assetRow}
            >
              <Text
                style={styles.assetName}
              >
                Cash
              </Text>

              <Text
                style={styles.assetValue}
              >
                {formatRupiah(
                  saldo.cash
                )}
              </Text>
            </View>

            <View
              style={styles.assetRow}
            >
              <Text
                style={styles.assetName}
              >
                Dompet Grab
              </Text>

              <Text
                style={[
                  styles.assetValue,
                  saldo.dompet_grab < 0 &&
                    styles.negativeAsset,
                ]}
              >
                {formatRupiah(
                  saldo.dompet_grab
                )}
              </Text>
            </View>

            <View
              style={styles.assetRow}
            >
              <Text
                style={styles.assetName}
              >
                OVO
              </Text>

              <Text
                style={styles.assetValue}
              >
                {formatRupiah(
                  saldo.ovo
                )}
              </Text>
            </View>

            <View
              style={styles.assetRow}
            >
              <Text
                style={styles.assetName}
              >
                SeaBank
              </Text>

              <Text
                style={styles.assetValue}
              >
                {formatRupiah(
                  saldo.seabank
                )}
              </Text>
            </View>

            <View
              style={styles.kreditArea}
            >
              <View>
                <Text
                  style={styles.kreditName}
                >
                  Kredit Grab
                </Text>

                <Text
                  style={styles.kreditNote}
                >
                  Tidak termasuk Total Aset
                </Text>
              </View>

              <Text
                style={styles.kreditValue}
              >
                {formatRupiah(
                  saldo.kredit_grab
                )}
              </Text>
            </View>

            <View
              style={styles.totalAssetRow}
            >
              <Text
                style={styles.totalAssetLabel}
              >
                Total Aset
              </Text>

              <Text
                style={styles.totalAssetValue}
              >
                {formatRupiah(
                  totalAset
                )}
              </Text>
            </View>
          </View>

          <View
            style={styles.noteArea}
          >
            <Text
              style={styles.noteTitle}
            >
              Yang perlu diketahui
            </Text>

            <Text
              style={styles.noteText}
            >
              Set Data Awal hanya mencatat
              titik awal periode. Saldo akun
              tidak diubah dan transaksi tidak
              dibuat.
            </Text>
          </View>

          <Pressable
            style={styles.primaryButton}
            onPress={setDataAwal}
          >
            <Text
              style={styles.primaryButtonText}
            >
              Set Data Awal
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /*
   * SETTLEMENT NORMAL
   */
  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={
          styles.content
        }
      >
        <View style={styles.header}>
          <Pressable
            onPress={() =>
              router.back()
            }
            hitSlop={10}
          >
            <Text style={styles.back}>
              ‹
            </Text>
          </Pressable>

          <View>
            <Text style={styles.title}>
              Settlement
            </Text>

            <Text
              style={styles.subtitle}
            >
              Penyelesaian periode keuangan
            </Text>
          </View>
        </View>

        <View
          style={styles.periodArea}
        >
          <Text
            style={styles.periodCaption}
          >
            PERIODE BERJALAN
          </Text>

          <Text
            style={styles.periodValue}
          >
            {bulanLabel}
          </Text>

          <Text
            style={styles.periodDescription}
          >
            Periksa kondisi keuangan
            sebelum menyelesaikan periode.
          </Text>
        </View>

        <Text
          style={styles.sectionTitle}
        >
          Ringkasan Periode
        </Text>

        <View
          style={styles.summaryArea}
        >
          <View
            style={styles.summaryRow}
          >
            <Text
              style={styles.summaryLabel}
            >
              Pendapatan
            </Text>

            <Text
              style={styles.incomeValue}
            >
              {formatRupiah(
                pendapatan
              )}
            </Text>
          </View>

          <View
            style={styles.subRow}
          >
            <Text
              style={styles.subLabel}
            >
              termasuk Tips
            </Text>

            <Text
              style={styles.subValue}
            >
              {formatRupiah(tips)}
            </Text>
          </View>

          <View
            style={styles.summaryRow}
          >
            <Text
              style={styles.summaryLabel}
            >
              Pengeluaran
            </Text>

            <Text
              style={styles.expenseValue}
            >
              {formatRupiah(
                pengeluaran
              )}
            </Text>
          </View>

          <View
            style={styles.summaryRow}
          >
            <Text
              style={styles.summaryStrong}
            >
              Pendapatan Bersih
            </Text>

            <Text
              style={[
                styles.netValue,
                pendapatanBersih < 0
                  ? styles.netNegative
                  : styles.netPositive,
              ]}
            >
              {formatRupiah(
                pendapatanBersih
              )}
            </Text>
          </View>
        </View>

        <Text
          style={styles.sectionTitle}
        >
          Aset Saat Ini
        </Text>

        <View
          style={styles.assetArea}
        >
          <View
            style={styles.assetRow}
          >
            <Text
              style={styles.assetName}
            >
              Cash
            </Text>

            <Text
              style={styles.assetValue}
            >
              {formatRupiah(
                saldo.cash
              )}
            </Text>
          </View>

          <View
            style={styles.assetRow}
          >
            <Text
              style={styles.assetName}
            >
              Dompet Grab
            </Text>

            <Text
              style={[
                styles.assetValue,
                saldo.dompet_grab < 0 &&
                  styles.negativeAsset,
              ]}
            >
              {formatRupiah(
                saldo.dompet_grab
              )}
            </Text>
          </View>

          <View
            style={styles.assetRow}
          >
            <Text
              style={styles.assetName}
            >
              OVO
            </Text>

            <Text
              style={styles.assetValue}
            >
              {formatRupiah(
                saldo.ovo
              )}
            </Text>
          </View>

          <View
            style={styles.assetRow}
          >
            <Text
              style={styles.assetName}
            >
              SeaBank
            </Text>

            <Text
              style={styles.assetValue}
            >
              {formatRupiah(
                saldo.seabank
              )}
            </Text>
          </View>

          <View
            style={styles.kreditArea}
          >
            <View>
              <Text
                style={styles.kreditName}
              >
                Kredit Grab
              </Text>

              <Text
                style={styles.kreditNote}
              >
                Tidak termasuk Total Aset
              </Text>
            </View>

            <Text
              style={styles.kreditValue}
            >
              {formatRupiah(
                saldo.kredit_grab
              )}
            </Text>
          </View>

          <View
            style={styles.totalAssetRow}
          >
            <Text
              style={styles.totalAssetLabel}
            >
              Total Aset
            </Text>

            <Text
              style={styles.totalAssetValue}
            >
              {formatRupiah(
                totalAset
              )}
            </Text>
          </View>
        </View>

        <View
          style={styles.noteArea}
        >
          <Text
            style={styles.noteTitle}
          >
            Sebelum Settlement
          </Text>

          <Text
            style={styles.noteText}
          >
            Pastikan seluruh pendapatan,
            pengeluaran, transfer, dan saldo
            akun sudah tercatat dengan benar.
            Settlement menyimpan kondisi
            periode ini dan meneruskannya
            sebagai Aset Awal periode berikutnya.
          </Text>
        </View>

        <Pressable
          style={styles.primaryButton}
          onPress={lakukanSettlement}
        >
          <Text
            style={styles.primaryButtonText}
          >
            Settlement Bulan Ini
          </Text>
        </Pressable>
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
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

  introArea: {
    marginBottom: 26,
  },

  introTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#20242A',
    marginBottom: 9,
  },

  introText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#68707D',
    marginBottom: 7,
  },

  periodArea: {
    marginBottom: 24,
  },

  periodCaption: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A919C',
    letterSpacing: 0.5,
  },

  periodValue: {
    marginTop: 5,
    fontSize: 25,
    fontWeight: '700',
    color: '#20242A',
  },

  periodDescription: {
    marginTop: 5,
    fontSize: 12,
    color: '#7B838E',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#20242A',
    marginBottom: 10,
  },

  summaryArea: {
    marginBottom: 24,
  },

  summaryRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  summaryLabel: {
    fontSize: 14,
    color: '#4F5661',
  },

  summaryStrong: {
    fontSize: 14,
    fontWeight: '700',
    color: '#20242A',
  },

  incomeValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4E8A67',
  },

  expenseValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B85C5C',
  },

  netValue: {
    fontSize: 17,
    fontWeight: '700',
  },

  netPositive: {
    color: '#4E8A67',
  },

  netNegative: {
    color: '#B85C5C',
  },

  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 12,
    marginTop: -2,
    marginBottom: 4,
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

  assetArea: {
    marginBottom: 18,
  },

  assetRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  assetName: {
    fontSize: 14,
    color: '#4F5661',
  },

  assetValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#20242A',
  },

  negativeAsset: {
    color: '#B85C5C',
  },

  kreditArea: {
    marginTop: 10,
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 15,
    backgroundColor: '#FCF4E8',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  kreditName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6D5832',
  },

  kreditNote: {
    marginTop: 3,
    fontSize: 10,
    color: '#927B50',
  },

  kreditValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6D5832',
  },

  totalAssetRow: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E6E8EC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  totalAssetLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#20242A',
  },

  totalAssetValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#20242A',
  },

  noteArea: {
    backgroundColor: '#F0F8F3',
    borderRadius: 14,
    padding: 15,
    marginBottom: 18,
  },

  noteTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#416F55',
  },

  noteText: {
    marginTop: 5,
    fontSize: 11.5,
    lineHeight: 17,
    color: '#587263',
  },

  primaryButton: {
    backgroundColor: '#4E8A67',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

