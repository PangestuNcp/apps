
import React, { useCallback, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, Dimensions, StyleSheet, Pressable, ScrollView, TextInput, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import db from '../database/database';

type Periode = 'hari' | 'minggu' | 'bulan';

type Transaksi = {
  id: number;
  tanggal: string;
  jenis: string;
  subjenis: string | null;
  keterangan: string | null;
  nominal: number;
  deskripsi: string | null;
};

type Motor = {
  km_sekarang: number;
};

type Oli = {
  km_penggantian: number;
  km_berikutnya: number;
};

type Bensin = {
  tanggal: string;
  km: number;
  liter: number;
  nominal: number;
};

type HariGrafik = {
  label: string;
  pendapatan: number;
  pengeluaran: number;
};

const GREEN = '#16B67A';
const GREEN_DARK = '#07515A';
const GREEN_SOFT = '#EAF9F3';

const RED = '#FF5364';

const BLUE = '#2D83E8';
const BLUE_SOFT = '#F1F8FF';

const ORANGE = '#F39A21';

const TEXT = '#0A4E59';
const TEXT_SECONDARY = '#587F91';
const TEXT_LIGHT = '#7895A2';

const BACKGROUND = '#F6FAF9';
const WHITE = '#FFFFFF';
const BORDER = '#DCECF0';
const SCREEN_WIDTH = Dimensions.get('window').width;

function rupiah(n: number) {
  return `Rp ${Math.abs(Math.round(n)).toLocaleString('id-ID')}`;
}

function formatKM(n: number) {
  return n.toLocaleString('id-ID', {
    minimumFractionDigits: n % 1 !== 0 ? 1 : 0,
    maximumFractionDigits: 1,
  });
}

function formatLiter(n: number) {
  return n.toLocaleString('id-ID', {
    minimumFractionDigits: n % 1 !== 0 ? 1 : 0,
    maximumFractionDigits: 1,
  });
}

function getTanggalLokal(date = new Date()) {
  const tahun = date.getFullYear();
  const bulan = String(date.getMonth() + 1).padStart(2, '0');
  const hari = String(date.getDate()).padStart(2, '0');

  return `${tahun}-${bulan}-${hari}`;
}

function getBulanLokal(date = new Date()) {
  const tahun = date.getFullYear();
  const bulan = String(date.getMonth() + 1).padStart(2, '0');

  return `${tahun}-${bulan}`;
}

function namaHari(date: Date) {
  return date.toLocaleDateString('id-ID', {
    weekday: 'short',
  });
}

function formatTanggalHeader(date: Date) {
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function awalMinggu(date: Date) {
  const hasil = new Date(date);
  const hari = hasil.getDay();

  const selisih = hari === 0 ? 6 : hari - 1;

  hasil.setDate(hasil.getDate() - selisih);
  hasil.setHours(0, 0, 0, 0);

  return hasil;
}

function tambahHari(date: Date, jumlah: number) {
  const hasil = new Date(date);
  hasil.setDate(hasil.getDate() + jumlah);
  return hasil;
}

function awalBulan(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function tambahBulan(date: Date, jumlah: number) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + jumlah,
    1
  );
}

function tanggalDariString(value: string) {
  const bagian = value.split('-').map(Number);

  if (bagian.length < 3) {
    return new Date();
  }

  return new Date(
    bagian[0],
    bagian[1] - 1,
    bagian[2]
  );
}

function namaTransaksi(item: Transaksi) {
  if (
    item.subjenis === 'tips_tunai' ||
    item.subjenis === 'tips_non_tunai'
  ) {
    return 'Tips';
  }

  if (item.subjenis === 'orderan_tunai') {
    return 'Orderan Tunai';
  }

  if (item.subjenis === 'orderan_non_tunai') {
    return 'Orderan Non-Tunai';
  }

  if (item.subjenis === 'bensin') {
    return 'Bensin';
  }

  if (item.subjenis === 'oli') {
    return 'Oli';
  }

  if (
    item.subjenis ===
    'kekurangan_tagihan_tunai_grab'
  ) {
    return 'Topup Kekurangan Kredit Grab';
  }

  if (item.keterangan) {
    return item.keterangan
      .replace(
        'Penggantian oli mesin + gardan - cash',
        'Oli'
      )
      .replace(
        'Penggantian oli mesin + gardan - ovo',
        'Oli'
      )
      .replace(
        'Penggantian oli mesin + gardan - seabank',
        'Oli'
      );
  }

  return item.jenis === 'pendapatan'
    ? 'Pendapatan'
    : 'Pengeluaran';
}

function detailTransaksi(item: Transaksi) {
  if (
    item.subjenis === 'orderan_tunai' ||
    item.subjenis === 'orderan_non_tunai' ||
    item.subjenis === 'tips_tunai' ||
    item.subjenis === 'tips_non_tunai'
  ) {
    return 'Pendapatan';
  }

  return 'Pengeluaran';
}

function formatJam(tanggal: string) {
  if (!tanggal) return '--:--';

  const bagian = tanggal.split(' ');

  if (bagian.length > 1) {
    return bagian[1].slice(0, 5);
  }

  if (tanggal.includes('T')) {
    return (
      tanggal.split('T')[1]?.slice(0, 5) ??
      '--:--'
    );
  }

  return '--:--';
}

function buatDataGrafik(
  transaksi: Transaksi[],
  periode: Periode
): HariGrafik[] {
  const sekarang = new Date();

  if (periode === 'hari') {
    const mingguIni = awalMinggu(sekarang);
    const hasil: HariGrafik[] = [];

    for (let i = 0; i < 7; i++) {
      const tanggal = tambahHari(mingguIni, i);
      const key = getTanggalLokal(tanggal);

      const hariTransaksi = transaksi.filter(
        (item) => item.tanggal.startsWith(key)
      );

      hasil.push({
        label: namaHari(tanggal),
        pendapatan: hariTransaksi
          .filter((item) => item.jenis === 'pendapatan')
          .reduce((total, item) => total + item.nominal, 0),
        pengeluaran: hariTransaksi
          .filter((item) => item.jenis === 'pengeluaran')
          .reduce((total, item) => total + item.nominal, 0),
      });
    }

    return hasil;
  }

  if (periode === 'minggu') {
    const mingguIni = awalMinggu(sekarang);
    const hasil: HariGrafik[] = [];

    for (let i = 3; i >= 0; i--) {
      const mulai = tambahHari(
        mingguIni,
        -i * 7
      );

      const selesai = tambahHari(
        mulai,
        7
      );

      const transaksiMinggu =
        transaksi.filter((item) => {
          const tanggal =
            tanggalDariString(
              item.tanggal.slice(0, 10)
            );

          return (
            tanggal >= mulai &&
            tanggal < selesai
          );
        });

      hasil.push({
        label: `M${4 - i}`,
        pendapatan:
          transaksiMinggu
            .filter(
              (item) =>
                item.jenis === 'pendapatan'
            )
            .reduce(
              (total, item) =>
                total + item.nominal,
              0
            ),
        pengeluaran:
          transaksiMinggu
            .filter(
              (item) =>
                item.jenis === 'pengeluaran'
            )
            .reduce(
              (total, item) =>
                total + item.nominal,
              0
            ),
      });
    }

    return hasil;
  }

  const bulanIni = awalBulan(sekarang);
  const hasil: HariGrafik[] = [];

  for (let i = 5; i >= 0; i--) {
    const bulan = tambahBulan(
      bulanIni,
      -i
    );

    const key = getBulanLokal(bulan);

    const transaksiBulan =
      transaksi.filter((item) =>
        item.tanggal.startsWith(key)
      );

    hasil.push({
      label: bulan.toLocaleDateString(
        'id-ID',
        {
          month: 'short',
        }
      ),
      pendapatan:
        transaksiBulan
          .filter(
            (item) =>
              item.jenis === 'pendapatan'
          )
          .reduce(
            (total, item) =>
              total + item.nominal,
            0
          ),
      pengeluaran:
        transaksiBulan
          .filter(
            (item) =>
              item.jenis === 'pengeluaran'
          )
          .reduce(
            (total, item) =>
              total + item.nominal,
            0
          ),
    });
  }

  return hasil;
}

function GrafikKeuangan({
  data,
}: {
  data: HariGrafik[];
}) {
  const maxNilai = Math.max(
    1,
    ...data.flatMap((item) => [
      item.pendapatan,
      item.pengeluaran,
    ])
  );

  const chartHeight = 112;

  return (
    <View style={styles.chartContainer}>

      {/* GRAFIK + LABEL HARI */}
      <View style={styles.chartArea}>

        {/* LABEL Y */}
        <View style={styles.yLabels}>
          <Text style={styles.yLabel}>
            1,5 jt
          </Text>

          <Text style={styles.yLabel}>
            1 jt
          </Text>

          <Text style={styles.yLabel}>
            500 rb
          </Text>

          <Text style={styles.yLabel}>
            0
          </Text>
        </View>

        {/* BAGIAN KANAN */}
        <View style={styles.chartRight}>

          {/* AREA GRAFIK */}
          <View
            style={[
              styles.chartPlot,
              {
                height: chartHeight,
              },
            ]}
          >
            <View
              style={styles.gridLineTop}
            />

            <View
              style={styles.gridLineMiddle1}
            />

            <View
              style={styles.gridLineMiddle2}
            />

            <View
              style={styles.gridLineBottom}
            />

            {/* BATANG */}
            <View style={styles.barsRow}>
              {data.map((item, index) => {
                const tinggiPendapatan =
                  Math.max(
                    3,
                    (item.pendapatan /
                      maxNilai) *
                      chartHeight
                  );

                const tinggiPengeluaran =
                  Math.max(
                    3,
                    (item.pengeluaran /
                      maxNilai) *
                      chartHeight
                  );

                return (
                  <View
                    key={`${item.label}-${index}`}
                    style={styles.barGroup}
                  >
                    <View
                      style={styles.barPair}
                    >
                      <View
                        style={[
                          styles.incomeBar,
                          {
                            height:
                              tinggiPendapatan,
                          },
                        ]}
                      />

                      <View
                        style={[
                          styles.expenseBar,
                          {
                            height:
                              tinggiPengeluaran,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* LABEL HARI — DI LUAR GRAFIK */}
          <View style={styles.dayLabelsRow}>
            {data.map((item, index) => (
              <View
                key={`label-${item.label}-${index}`}
                style={styles.dayLabelColumn}
              >
                <Text style={styles.xLabel}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>

        </View>
      </View>
    </View>
  );
}

type JenisPendapatanPopup = 'orderan' | 'tips';
type JenisOrderPopup = 'tunai' | 'non_tunai';
type JenisTipsPopup = 'tunai' | 'non_tunai';
type AkunPengeluaran = 'cash' | 'ovo' | 'seabank';


function PopupPendapatan({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [jenisPendapatan, setJenisPendapatan] =
    useState<JenisPendapatanPopup>('orderan');
  const [jenisOrder, setJenisOrder] =
    useState<JenisOrderPopup>('tunai');
  const [jenisTips, setJenisTips] =
    useState<JenisTipsPopup>('tunai');
  const [pendapatan, setPendapatan] = useState('');
  const [tagihan, setTagihan] = useState('');

  function simpan() {
    const nilaiPendapatan = Number(
      pendapatan.replace(/\D/g, '')
    );

    if (!nilaiPendapatan || nilaiPendapatan <= 0) {
      Alert.alert(
        'Nominal salah',
        jenisPendapatan === 'tips'
          ? 'Masukkan nominal tips yang benar.'
          : 'Masukkan total pendapatan/ongkir yang benar.'
      );
      return;
    }

    if (jenisPendapatan === 'tips') {
      const tanggal = new Date().toISOString().slice(0, 10);

      db.withTransactionSync(() => {
        if (jenisTips === 'tunai') {
          db.runSync(
            `UPDATE saldo SET cash = cash + ? WHERE id = 1`,
            [nilaiPendapatan]
          );
          db.runSync(
            `INSERT INTO transaksi
             (tanggal, jenis, subjenis, keterangan, nominal)
             VALUES (?, ?, ?, ?, ?)`,
            [
              tanggal,
              'pendapatan',
              'tips_tunai',
              'Tips - Tunai',
              nilaiPendapatan,
            ]
          );
        } else {
          db.runSync(
            `UPDATE saldo SET dompet_grab = dompet_grab + ? WHERE id = 1`,
            [nilaiPendapatan]
          );
          db.runSync(
            `INSERT INTO transaksi
             (tanggal, jenis, subjenis, keterangan, nominal)
             VALUES (?, ?, ?, ?, ?)`,
            [
              tanggal,
              'pendapatan',
              'tips_non_tunai',
              'Tips - Non-Tunai',
              nilaiPendapatan,
            ]
          );
        }
      });

      setPendapatan('');
      Alert.alert(
        'Berhasil',
        jenisTips === 'tunai'
          ? `Tips ${rupiah(nilaiPendapatan)} masuk ke Cash.`
          : `Tips ${rupiah(nilaiPendapatan)} masuk ke Dompet Grab.`,
        [{ text: 'OK', onPress: onClose }]
      );
      return;
    }

    const nilaiTagihan =
      jenisOrder === 'tunai'
        ? Number(tagihan.replace(/\D/g, ''))
        : 0;

    if (
      jenisOrder === 'tunai' &&
      (!nilaiTagihan || nilaiTagihan <= 0)
    ) {
      Alert.alert(
        'Nominal salah',
        'Masukkan jumlah uang yang harus ditagih ke customer.'
      );
      return;
    }

    const data = db.getFirstSync<{
      kredit_grab: number;
      dompet_grab: number;
    }>(
      `SELECT kredit_grab, dompet_grab FROM saldo WHERE id = 1`
    );

    if (!data) {
      Alert.alert(
        'Data tidak ditemukan',
        'Data saldo belum tersedia.'
      );
      return;
    }

    const tanggal = new Date().toISOString().slice(0, 10);

    if (jenisOrder === 'non_tunai') {
      db.withTransactionSync(() => {
        db.runSync(
          `UPDATE saldo SET dompet_grab = dompet_grab + ? WHERE id = 1`,
          [nilaiPendapatan]
        );
        db.runSync(
          `INSERT INTO transaksi
           (tanggal, jenis, subjenis, keterangan, nominal)
           VALUES (?, ?, ?, ?, ?)`,
          [
            tanggal,
            'pendapatan',
            'orderan_non_tunai',
            'Pendapatan Grab - Orderan Non-Tunai',
            nilaiPendapatan,
          ]
        );
      });

      setPendapatan('');
      Alert.alert(
        'Berhasil',
        `Pendapatan ${rupiah(nilaiPendapatan)} masuk ke Dompet Grab.`,
        [{ text: 'OK', onPress: onClose }]
      );
      return;
    }

    const potongKredit = Math.min(
      data.kredit_grab,
      nilaiTagihan
    );
    const kekurangan = nilaiTagihan - potongKredit;

    db.withTransactionSync(() => {
      db.runSync(
        `UPDATE saldo SET dompet_grab = dompet_grab + ? WHERE id = 1`,
        [nilaiPendapatan]
      );
      db.runSync(
        `UPDATE saldo SET cash = cash + ? WHERE id = 1`,
        [nilaiTagihan]
      );

      if (potongKredit > 0) {
        db.runSync(
          `UPDATE saldo SET kredit_grab = kredit_grab - ? WHERE id = 1`,
          [potongKredit]
        );
      }

      if (kekurangan > 0) {
        db.runSync(
          `UPDATE saldo SET dompet_grab = dompet_grab - ? WHERE id = 1`,
          [kekurangan]
        );
      }

      db.runSync(
        `INSERT INTO transaksi
         (tanggal, jenis, subjenis, keterangan, nominal)
         VALUES (?, ?, ?, ?, ?)`,
        [
          tanggal,
          'pendapatan',
          'orderan_tunai',
          'Pendapatan Grab - Orderan Tunai',
          nilaiPendapatan,
        ]
      );

      if (kekurangan > 0) {
        db.runSync(
          `INSERT INTO transaksi
           (tanggal, jenis, subjenis, keterangan, nominal, deskripsi)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            tanggal,
            'pengeluaran',
            'kekurangan_tagihan_tunai_grab',
            'Dompet Grab Topup Kekurangan Tagih Tunai Grab',
            kekurangan,
            'Topup kekurangan tagih tunai grab',
          ]
        );
      }
    });

    setPendapatan('');
    setTagihan('');

    Alert.alert(
      'Berhasil',
      `Pendapatan: ${rupiah(nilaiPendapatan)}\n` +
        `Ditagih ke customer: ${rupiah(nilaiTagihan)}\n\n` +
        `Masuk ke Cash: ${rupiah(nilaiTagihan)}\n` +
        `Masuk ke Dompet Grab: ${rupiah(nilaiPendapatan)}\n` +
        `Kredit Grab dipotong: ${rupiah(potongKredit)}\n` +
        `Kekurangan dari Dompet Grab: ${rupiah(kekurangan)}`,
      [{ text: 'OK', onPress: onClose }]
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <BlurView
          intensity={24}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.modalTintGreen} />

        <KeyboardAvoidingView
          style={styles.modalKeyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.incomeModal}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.incomeModalIcon}>
                  <Ionicons
                    name="trending-up-outline"
                    size={21}
                    color={GREEN}
                  />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Pendapatan</Text>
                  <Text style={styles.modalSubtitle}>
                    Catat pendapatan Grab
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={onClose}
                style={styles.modalCloseButton}
                hitSlop={10}
              >
                <Ionicons name="close" size={21} color={TEXT} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScrollContent}
            >
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>Jenis Pendapatan</Text>
                <View style={styles.modalChoiceRow}>
                  {[
                    ['orderan', 'Orderan'],
                    ['tips', 'Tips'],
                  ].map(([value, label]) => {
                    const active = jenisPendapatan === value;
                    return (
                      <Pressable
                        key={value}
                        onPress={() =>
                          setJenisPendapatan(
                            value as JenisPendapatanPopup
                          )
                        }
                        style={[
                          styles.incomeChoice,
                          active && styles.incomeChoiceActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.modalChoiceText,
                            active && styles.incomeChoiceTextActive,
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {jenisPendapatan === 'tips' ? (
                <>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>
                      Jenis Tips
                    </Text>

                    <View style={styles.modalChoiceRow}>
                      {[
                        ['tunai', 'Tips Tunai'],
                        ['non_tunai', 'Tips Non-Tunai'],
                      ].map(([value, label]) => {
                        const active = jenisTips === value;

                        return (
                          <Pressable
                            key={value}
                            onPress={() =>
                              setJenisTips(
                                value as JenisTipsPopup
                              )
                            }
                            style={[
                              styles.incomeChoice,
                              active &&
                                styles.incomeChoiceActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.modalChoiceText,
                                active &&
                                  styles.incomeChoiceTextActive,
                              ]}
                            >
                              {label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    </View>

                    <View style={styles.modalInfoGreen}>
                      <Ionicons
                        name="information-circle-outline"
                        size={18}
                        color={GREEN}
                      />

                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalInfoTitle}>
                          Pendapatan Tips
                        </Text>

                        <Text style={styles.modalInfoText}>
                          Tips tunai masuk ke Cash.
                        </Text>

                        <Text style={styles.modalInfoText}>
                          Tips non-tunai masuk ke Dompet Grab.
                        </Text>
                      </View>
                    </View>

                    <View style={styles.modalSection}>
                      <Text style={styles.modalInputLabel}>
                        Nominal Tips
                      </Text>

                      <TextInput
                        style={styles.modalInputGreen}
                        placeholder="Rp5000"
                        placeholderTextColor="#9AA1AC"
                        keyboardType="numeric"
                        value={pendapatan}
                        onChangeText={setPendapatan}
                      />
                    </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalInputLabel}>Nominal Tips</Text>
                    <TextInput
                      style={styles.modalInputGreen}
                      placeholder="Rp5000"
                      placeholderTextColor="#9AA1AC"
                      keyboardType="numeric"
                      value={pendapatan}
                      onChangeText={setPendapatan}
                    />
                  </View>

                  <Pressable
                    style={styles.modalSaveGreen}
                    onPress={simpan}
                  >
                    <Text style={styles.modalSaveText}>Simpan Tips</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>Jenis Orderan</Text>
                    <View style={styles.modalChoiceRow}>
                      {[
                        ['tunai', 'Orderan Tunai'],
                        ['non_tunai', 'Orderan Non-Tunai'],
                      ].map(([value, label]) => {
                        const active = jenisOrder === value;
                        return (
                          <Pressable
                            key={value}
                            onPress={() =>
                              setJenisOrder(
                                value as JenisOrderPopup
                              )
                            }
                            style={[
                              styles.incomeChoice,
                              active && styles.incomeChoiceActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.modalChoiceText,
                                active && styles.incomeChoiceTextActive,
                              ]}
                            >
                              {label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.modalInfoGreen}>
                    <Ionicons
                      name="information-circle-outline"
                      size={18}
                      color={GREEN}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalInfoTitle}>
                        Pendapatan Grab
                      </Text>
                      <Text style={styles.modalInfoText}>
                        Semua pendapatan/ongkir masuk ke Dompet Grab.
                      </Text>
                      <Text style={styles.modalInfoText}>
                        {jenisOrder === 'tunai'
                          ? 'Untuk orderan tunai, uang yang ditagih ke customer masuk ke Cash.'
                          : 'Untuk orderan non-tunai, tidak ada uang yang masuk ke Cash.'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalInputLabel}>
                      Total Pendapatan (Ongkir)
                    </Text>
                    <TextInput
                      style={styles.modalInputGreen}
                      placeholder="Rp3000"
                      placeholderTextColor="#9AA1AC"
                      keyboardType="numeric"
                      value={pendapatan}
                      onChangeText={setPendapatan}
                    />
                  </View>

                  {jenisOrder === 'tunai' && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalInputLabel}>
                        Jumlah Uang yang Harus Ditagih
                      </Text>
                      <TextInput
                        style={styles.modalInputGreen}
                        placeholder="Rp10000"
                        placeholderTextColor="#9AA1AC"
                        keyboardType="numeric"
                        value={tagihan}
                        onChangeText={setTagihan}
                      />
                    </View>
                  )}

                  <Pressable
                    style={styles.modalSaveGreen}
                    onPress={simpan}
                  >
                    <Text style={styles.modalSaveText}>
                      Simpan Pendapatan
                    </Text>
                  </Pressable>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function PopupPengeluaran({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [keterangan, setKeterangan] = useState('');
  const [nominal, setNominal] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [saranKeterangan, setSaranKeterangan] = useState<string[]>([]);
  const [akunDipilih, setAkunDipilih] =
    useState<AkunPengeluaran>('cash');

  const daftarAkun: {
    key: AkunPengeluaran;
    label: string;
  }[] = [
    { key: 'cash', label: 'Cash' },
    { key: 'ovo', label: 'OVO' },
    { key: 'seabank', label: 'SeaBank' },
  ];

  function cariSaranKeterangan(teks: string) {
    const nilai = teks.trim();
    if (!nilai) {
      setSaranKeterangan([]);
      return;
    }

    const hasil = db.getAllSync<{ keterangan: string }>(
      `SELECT DISTINCT keterangan
       FROM transaksi
       WHERE jenis = 'pengeluaran'
         AND keterangan IS NOT NULL
         AND TRIM(keterangan) != ''
         AND LOWER(keterangan) LIKE LOWER(?)
       ORDER BY keterangan COLLATE NOCASE ASC
       LIMIT 5`,
      [`%${nilai}%`]
    );

    setSaranKeterangan(
      hasil.map((item) => item.keterangan)
    );
  }

  function simpan() {
    const nilai = Number(nominal.replace(/\D/g, ''));
    const keteranganInput = keterangan.trim();
    const deskripsiInput = deskripsi.trim();

    if (!keteranganInput) {
      Alert.alert(
        'Data belum lengkap',
        'Masukkan keterangan pengeluaran.'
      );
      return;
    }

    if (!nilai || nilai <= 0) {
      Alert.alert(
        'Nominal salah',
        'Masukkan nominal yang benar.'
      );
      return;
    }

    const keteranganLama =
      db.getFirstSync<{ keterangan: string }>(
        `SELECT keterangan
         FROM transaksi
         WHERE jenis = 'pengeluaran'
           AND keterangan IS NOT NULL
           AND TRIM(keterangan) != ''
           AND LOWER(TRIM(keterangan)) =
               LOWER(TRIM(?))
         ORDER BY id ASC
         LIMIT 1`,
        [keteranganInput]
      );

    const keteranganFinal =
      keteranganLama?.keterangan ??
      keteranganInput;

    const saldoSekarang = db.getFirstSync<{ saldo: number }>(
      `SELECT ${akunDipilih} AS saldo
       FROM saldo
       WHERE id = 1`
    );

    if (!saldoSekarang || saldoSekarang.saldo < nilai) {
      const namaAkun =
        daftarAkun.find(
          (item) => item.key === akunDipilih
        )?.label ?? 'akun';

      Alert.alert(
        'Saldo tidak cukup',
        `Saldo ${namaAkun} tidak mencukupi.`
      );
      return;
    }

    const tanggal = new Date().toISOString().slice(0, 10);

    db.runSync(
      `UPDATE saldo
       SET ${akunDipilih} = ${akunDipilih} - ?
       WHERE id = 1`,
      [nilai]
    );

    db.runSync(
      `INSERT INTO transaksi
       (tanggal, jenis, subjenis, keterangan, nominal, deskripsi)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        tanggal,
        'pengeluaran',
        akunDipilih,
        keteranganFinal,
        nilai,
        deskripsiInput || null,
      ]
    );

    Alert.alert(
      'Berhasil',
      'Pengeluaran berhasil disimpan.',
      [{ text: 'OK', onPress: onClose }]
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <BlurView
          intensity={24}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.modalTintRed} />

        <KeyboardAvoidingView
          style={styles.modalKeyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.expenseModal}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.expenseModalIcon}>
                  <Ionicons
                    name="receipt-outline"
                    size={21}
                    color={RED}
                  />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Pengeluaran</Text>
                  <Text style={styles.modalSubtitle}>
                    Catat pengeluaran Anda
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={onClose}
                style={styles.modalCloseButton}
                hitSlop={10}
              >
                <Ionicons name="close" size={21} color={TEXT} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScrollContent}
            >
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>Keterangan</Text>
                <TextInput
                  style={styles.modalInputRed}
                  placeholder="Contoh: Makan"
                  placeholderTextColor="#9AA1AC"
                  value={keterangan}
                  onChangeText={(teks) => {
                    setKeterangan(teks);
                    cariSaranKeterangan(teks);
                  }}
                />

                {saranKeterangan.length > 0 && (
                  <View style={styles.modalSuggestionBox}>
                    {saranKeterangan.map((saran) => (
                      <Pressable
                        key={saran}
                        style={styles.modalSuggestionItem}
                        onPress={() => {
                          setKeterangan(saran);
                          setSaranKeterangan([]);
                        }}
                      >
                        <Text style={styles.modalSuggestionText}>
                          {saran}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalInputLabel}>Nominal</Text>
                <TextInput
                  style={styles.modalInputRed}
                  placeholder="Rp5000"
                  placeholderTextColor="#9AA1AC"
                  keyboardType="numeric"
                  value={nominal}
                  onChangeText={setNominal}
                />
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalInputLabel}>
                  Deskripsi (opsional)
                </Text>
                <TextInput
                  style={styles.modalInputRed}
                  placeholder="Contoh: Beli makan siang"
                  placeholderTextColor="#9AA1AC"
                  value={deskripsi}
                  onChangeText={setDeskripsi}
                />
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>Bayar dari</Text>
                <View style={styles.modalChoiceRow}>
                  {daftarAkun.map((item) => {
                    const active = akunDipilih === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        onPress={() =>
                          setAkunDipilih(item.key)
                        }
                        style={[
                          styles.expenseChoice,
                          active && styles.expenseChoiceActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.modalChoiceText,
                            active && styles.expenseChoiceTextActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Pressable
                style={styles.modalSaveRed}
                onPress={simpan}
              >
                <Text style={styles.modalSaveText}>
                  Simpan Pengeluaran
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function TransaksiScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [periode, setPeriode] =
    useState<Periode>('hari');
  
  const [periodeMenuOpen, setPeriodeMenuOpen] =
    useState(false);

  const [pendapatanPopup, setPendapatanPopup] =
    useState(false);

  const [pengeluaranPopup, setPengeluaranPopup] =
    useState(false);

  const [transaksi, setTransaksi] =
    useState<Transaksi[]>([]);

  const [motor, setMotor] =
    useState<Motor>({
      km_sekarang: 0,
    });

  const [oli, setOli] =
    useState<Oli | null>(null);

  const [bensin, setBensin] =
    useState<Bensin | null>(null);

  const loadData = useCallback(() => {
    const semuaTransaksi =
      db.getAllSync<Transaksi>(
        `
        SELECT
          id,
          tanggal,
          jenis,
          subjenis,
          keterangan,
          nominal,
          deskripsi
        FROM transaksi
        ORDER BY tanggal DESC, id DESC
        `
      );

    const dataMotor =
      db.getFirstSync<Motor>(
        `
        SELECT
          km_sekarang
        FROM motor
        WHERE id = 1
        `
      );

    const dataOli =
      db.getFirstSync<Oli>(
        `
        SELECT
          km_penggantian,
          km_berikutnya
        FROM oli
        ORDER BY id DESC
        LIMIT 1
        `
      );

    const dataBensin =
      db.getFirstSync<Bensin>(
        `
        SELECT
          tanggal,
          km,
          liter,
          nominal
        FROM bensin
        ORDER BY id DESC
        LIMIT 1
        `
      );

    setTransaksi(
      semuaTransaksi ?? []
    );

    setMotor({
      km_sekarang:
        dataMotor?.km_sekarang ?? 0,
    });

    setOli(dataOli ?? null);
    setBensin(dataBensin ?? null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const sekarang = new Date();

  const transaksiPeriode = useMemo(() => {
    if (periode === 'hari') {
      const key =
        getTanggalLokal(sekarang);

      return transaksi.filter((item) =>
        item.tanggal.startsWith(key)
      );
    }

    if (periode === 'minggu') {
      const mulai =
        awalMinggu(sekarang);

      const selesai =
        tambahHari(mulai, 7);

      return transaksi.filter((item) => {
        const tanggal =
          tanggalDariString(
            item.tanggal.slice(0, 10)
          );

        return (
          tanggal >= mulai &&
          tanggal < selesai
        );
      });
    }

    const key =
      getBulanLokal(sekarang);

    return transaksi.filter((item) =>
      item.tanggal.startsWith(key)
    );
  }, [periode, transaksi]);

  const totalPendapatan =
    transaksiPeriode
      .filter(
        (item) =>
          item.jenis === 'pendapatan'
      )
      .reduce(
        (total, item) =>
          total + item.nominal,
        0
      );

  const totalPengeluaran =
    transaksiPeriode
      .filter(
        (item) =>
          item.jenis === 'pengeluaran'
      )
      .reduce(
        (total, item) =>
          total + item.nominal,
        0
      );

  const pendapatanBersih =
    totalPendapatan -
    totalPengeluaran;

  const grafik = useMemo(
    () =>
      buatDataGrafik(
        transaksi,
        periode
      ),
    [transaksi, periode]
  );

  const transaksiHariIni =
    useMemo(() => {
      const key =
        getTanggalLokal(sekarang);

      return transaksi
        .filter((item) =>
          item.tanggal.startsWith(key)
        )
        .slice(0, 3);
    }, [transaksi]);

  const progressTarget = Math.min(
    100,
    Math.round(
      (totalPendapatan /
        5000000) *
        100
    )
  );

  const sisaOli =
    oli &&
    motor.km_sekarang > 0
      ? oli.km_berikutnya -
        motor.km_sekarang
      : null;

  const statusOli =
    sisaOli === null
      ? 'Belum ada data'
      : sisaOli <= 0
      ? 'Perlu ganti'
      : sisaOli <= 300
      ? 'Segera'
      : 'Baik';

  const warnaStatusOli =
    statusOli === 'Baik'
      ? GREEN
      : statusOli === 'Segera'
      ? ORANGE
      : RED;

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <View style={styles.screen}>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.scrollContent
          }
        >

          {/* HEADER */}

          <View style={styles.header}>

            <View
              style={styles.brandArea}
            >

              <View
                style={styles.logoMark}
              >
                <View
                  style={
                    styles.logoShapeOne
                  }
                />

                <View
                  style={
                    styles.logoShapeTwo
                  }
                />
              </View>

              <View>
                <Text
                  style={styles.brand}
                >
                  TERTATA
                </Text>

                <Text
                  style={
                    styles.brandSubtitle
                  }
                >
                  Keuangan & Motor
                </Text>

                <Text
                  style={styles.dateText}
                >
                  {formatTanggalHeader(
                    sekarang
                  )}
                </Text>
              </View>

            </View>

            <View style={styles.headerActions}>
              <View style={styles.periodWrap}>
                <Pressable
                  onPress={() =>
                    setPeriodeMenuOpen((nilai) => !nilai)
                  }
                  style={styles.periodButton}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={19}
                    color={TEXT}
                  />

                  <Text style={styles.periodButtonText}>
                    {periode === 'hari'
                      ? 'Hari'
                      : periode === 'minggu'
                      ? 'Minggu'
                      : 'Bulan'}
                  </Text>

                  <Ionicons
                    name="chevron-down"
                    size={17}
                    color={TEXT_SECONDARY}
                  />
                </Pressable>

                {periodeMenuOpen && (
                  <View style={styles.periodDropdown}>
                    {(
                      [
                        ['hari', 'Hari'],
                        ['minggu', 'Minggu'],
                        ['bulan', 'Bulan'],
                      ] as const
                    ).map(([value, label]) => (
                      <Pressable
                        key={value}
                        onPress={() => {
                          setPeriode(value);
                          setPeriodeMenuOpen(false);
                        }}
                        style={[
                          styles.periodDropdownItem,
                          periode === value &&
                            styles.periodDropdownItemActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.periodDropdownText,
                            periode === value &&
                              styles.periodDropdownTextActive,
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              <Pressable style={styles.notificationButton}>
                <Ionicons
                  name="notifications-outline"
                  size={21}
                  color={TEXT}
                />
                <View style={styles.notificationDot} />
              </Pressable>
            </View>

          </View>


          {/* CARD KEUANGAN */}

          <View
            style={
              styles.mainFinanceCard
            }
          >

            <View
              style={
                styles.financeSummaryTop
              }
            >

              <View
                style={
                  styles.financeMainLeft
                }
              >

                <View
                  style={
                    styles.walletCircle
                  }
                >
                  <Ionicons
                    name="wallet-outline"
                    size={22}
                    color={WHITE}
                  />
                </View>

                <View
                  style={
                    styles.netIncomeArea
                  }
                >

                  <Text
                    style={
                      styles.netIncomeLabel
                    }
                  >
                    Pendapatan Bersih
                  </Text>

                  <Text
                    style={
                      styles.netIncomeValue
                    }
                  >
                    {pendapatanBersih < 0
                      ? '-'
                      : '+'}
                    {rupiah(
                      pendapatanBersih
                    )}
                  </Text>

                </View>

              </View>

              <View
                style={
                  styles.summaryRight
                }
              >

                <View
                  style={
                    styles.summaryMetric
                  }
                >
                  <View
                    style={[
                      styles.metricDot,
                      {
                        backgroundColor:
                          '#70D6AF',
                      },
                    ]}
                  />

                  <View>
                    <Text
                      style={
                        styles.metricLabel
                      }
                    >
                      Pendapatan
                    </Text>

                    <Text
                      style={
                        styles.metricValue
                      }
                    >
                      {rupiah(
                        totalPendapatan
                      )}
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.summaryMetric
                  }
                >
                  <View
                    style={[
                      styles.metricDot,
                      {
                        backgroundColor:
                          RED,
                      },
                    ]}
                  />

                  <View>
                    <Text
                      style={
                        styles.metricLabel
                      }
                    >
                      Pengeluaran
                    </Text>

                    <Text
                      style={
                        styles.metricValue
                      }
                    >
                      {rupiah(
                        totalPengeluaran
                      )}
                    </Text>
                  </View>
                </View>

              </View>

            </View>

            {/* PERFORMA */}

            <View style={styles.performanceTitleRow}>
              <Text style={styles.performanceTitle}>
                Performa Keuangan
              </Text>
            </View>

            <GrafikKeuangan
              data={grafik}
            />

            {/* QUICK BUTTON */}

            <View
              style={styles.quickButtons}
            >

              <Pressable
                onPress={() => setPendapatanPopup(true)}
                style={[
                  styles.quickButton,
                  styles.incomeButton,
                ]}
              >
                <Ionicons
                  name="add"
                  size={20}
                  color={WHITE}
                />

                <Text
                  style={
                    styles.quickButtonText
                  }
                >
                  Pendapatan
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setPengeluaranPopup(true)}
                style={[
                  styles.quickButton,
                  styles.expenseButton,
                ]}
              >
                <Ionicons
                  name="remove"
                  size={20}
                  color={WHITE}
                />

                <Text
                  style={
                    styles.quickButtonText
                  }
                >
                  Pengeluaran
                </Text>
              </Pressable>

            </View>

          </View>

          {/* TARGET */}

          <Pressable
            style={styles.targetCard}
          >

            <View
              style={styles.targetIcon}
            >
              <Ionicons
                name="locate"
                size={22}
                color={BLUE}
              />
            </View>

            <View
              style={styles.targetContent}
            >

              <Text
                style={styles.targetTitle}
              >
                Target Pendapatan
              </Text>

              <Text
                style={
                  styles.targetSubtitle
                }
              >
                Bulan{' '}
                {sekarang.toLocaleDateString(
                  'id-ID',
                  {
                    month: 'long',
                  }
                )}
              </Text>

              <View
                style={
                  styles.targetAmountRow
                }
              >
                <Text
                  style={
                    styles.targetAmount
                  }
                >
                  {rupiah(
                    totalPendapatan
                  )}
                </Text>

                <Text
                  style={
                    styles.targetOf
                  }
                >
                  {' '}
                  / Rp 5 jt
                </Text>
              </View>

              <View
                style={
                  styles.progressRow
                }
              >
                <View
                  style={
                    styles.progressTrack
                  }
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${progressTarget}%`,
                      },
                    ]}
                  />
                </View>

                <Text
                  style={
                    styles.progressText
                  }
                >
                  {progressTarget}%
                </Text>
              </View>

            </View>

            <View
              style={styles.targetCircle}
            >
              <Text
                style={
                  styles.targetCircleText
                }
              >
                {progressTarget}%
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={TEXT_SECONDARY}
            />

          </Pressable>

          {/* MOTOR */}

          <Pressable
            onPress={() =>
              router.push('/motor')
            }
            style={styles.motorCard}
          >

            <View
              style={styles.motorContent}
            >

              <View
                style={
                  styles.motorHeader
                }
              >
                <View
                  style={
                    styles.motorIcon
                  }
                >
                  <Ionicons
                    name="speedometer-outline"
                    size={21}
                    color={BLUE}
                  />
                </View>

                <View>
                  <Text
                    style={
                      styles.motorTitle
                    }
                  >
                    Motor
                  </Text>

                  <Text
                    style={
                      styles.motorKM
                    }
                  >
                    {formatKM(
                      motor.km_sekarang
                    )}{' '}
                    KM
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.motorDetails
                }
              >

                <View
                  style={
                    styles.motorDetail
                  }
                >
                  <Ionicons
                    name="water-outline"
                    size={17}
                    color={BLUE}
                  />

                  <View>
                    <Text
                      style={
                        styles.motorDetailLabel
                      }
                    >
                      Bensin terakhir
                    </Text>

                    <Text
                      style={
                        styles.motorDetailValueBlue
                      }
                    >
                      {bensin
                        ? `${formatLiter(
                            bensin.liter
                          )} L`
                        : '--'}
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.motorDetail
                  }
                >
                  <Ionicons
                    name="flame-outline"
                    size={17}
                    color={ORANGE}
                  />

                  <View>
                    <Text
                      style={
                        styles.motorDetailLabel
                      }
                    >
                      Oli berikutnya
                    </Text>

                    <Text
                      style={
                        styles.motorDetailValueOrange
                      }
                    >
                      {oli
                        ? `${formatKM(
                            oli.km_berikutnya
                          )} KM`
                        : '--'}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor:
                        statusOli ===
                        'Baik'
                          ? '#E5F8F0'
                          : statusOli ===
                            'Segera'
                          ? '#FFF5E7'
                          : '#FFF0F2',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          warnaStatusOli,
                      },
                    ]}
                  />

                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          warnaStatusOli,
                      },
                    ]}
                  >
                    {statusOli}
                  </Text>
                </View>

              </View>

            </View>

            <View
              style={
                styles.motorIllustration
              }
            >
              <Ionicons
                name="bicycle-outline"
                size={45}
                color={BLUE}
              />
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={TEXT_SECONDARY}
              style={
                styles.motorChevron
              }
            />

          </Pressable>

          {/* RIWAYAT */}

          <View
            style={styles.historyCard}
          >

            <View
              style={
                styles.historyHeader
              }
            >

              <View
                style={
                  styles.historyTitleRow
                }
              >
                <Ionicons
                  name="time-outline"
                  size={19}
                  color={TEXT}
                />

                <Text
                  style={
                    styles.historyTitle
                  }
                >
                  Riwayat Hari Ini
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  router.push(
                    '/riwayat'
                  )
                }
                style={
                  styles.seeAllButton
                }
              >
                <Text
                  style={
                    styles.seeAllText
                  }
                >
                  Lihat Semua
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={15}
                  color={BLUE}
                />
              </Pressable>

            </View>

            {transaksiHariIni.length ===
            0 ? (
              <View
                style={
                  styles.emptyHistory
                }
              >
                <Ionicons
                  name="receipt-outline"
                  size={23}
                  color="#A5BBC4"
                />

                <Text
                  style={
                    styles.emptyHistoryText
                  }
                >
                  Belum ada transaksi hari ini
                </Text>
              </View>
            ) : (
              transaksiHariIni.map(
                (item, index) => {
                  const pendapatan =
                    item.jenis ===
                    'pendapatan';

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.historyItem,
                        index ===
                          transaksiHariIni.length -
                            1 &&
                          styles.historyItemLast,
                      ]}
                    >

                      <Text
                        style={
                          styles.historyTime
                        }
                      >
                        {formatJam(
                          item.tanggal
                        )}
                      </Text>

                      <View
                        style={
                          styles.historyDivider
                        }
                      />

                      <View
                        style={[
                          styles.historyTransactionIcon,
                          {
                            backgroundColor:
                              pendapatan
                                ? GREEN
                                : RED,
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            pendapatan
                              ? 'arrow-up'
                              : 'arrow-down'
                          }
                          size={15}
                          color={WHITE}
                        />
                      </View>

                      <View
                        style={
                          styles.historyDescription
                        }
                      >
                        <Text
                          numberOfLines={1}
                          style={
                            styles.historyName
                          }
                        >
                          {namaTransaksi(
                            item
                          )}
                        </Text>

                        <Text
                          style={
                            styles.historyType
                          }
                        >
                          {detailTransaksi(
                            item
                          )}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.historyAmount,
                          {
                            color:
                              pendapatan
                                ? GREEN
                                : RED,
                          },
                        ]}
                      >
                        {pendapatan
                          ? '+'
                          : '-'}
                        {rupiah(
                          item.nominal
                        )}
                      </Text>

                    </View>
                  );
                }
              )
            )}

          </View>

          <View
            style={styles.bottomSpacing}
          />

        </ScrollView>

        <PopupPendapatan
          visible={pendapatanPopup}
          onClose={() => {
            setPendapatanPopup(false);
            loadData();
          }}
        />

        <PopupPengeluaran
          visible={pengeluaranPopup}
          onClose={() => {
            setPengeluaranPopup(false);
            loadData();
          }}
        />

        {/* BOTTOM NAVIGATION */}

        <View
          style={[
            styles.bottomNavigation,
            {
              height: 76 + insets.bottom,
              paddingBottom: insets.bottom,
            },
          ]}
        >

          <Pressable
            style={
              styles.bottomNavItem
            }
          >
            <Ionicons
              name="home"
              size={19}
              color={GREEN}
            />

            <Text
              style={[
                styles.bottomNavText,
                styles.bottomNavTextActive,
              ]}
            >
              Transaksi
            </Text>

            <View
              style={
                styles.activeUnderline
              }
            />
          </Pressable>

          <Pressable
            onPress={() =>
              router.push(
                '/keuangan'
              )
            }
            style={
              styles.bottomNavItem
            }
          >
            <Ionicons
              name="bar-chart-outline"
              size={19}
              color="#7391A5"
            />

            <Text
              style={
                styles.bottomNavText
              }
            >
              Keuangan
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              router.push('/motor')
            }
            style={
              styles.bottomNavItem
            }
          >
            <Ionicons
              name="bicycle-outline"
              size={20}
              color="#7391A5"
            />

            <Text
              style={
                styles.bottomNavText
              }
            >
              Motor
            </Text>
          </Pressable>

          <Pressable
            style={
              styles.bottomNavItem
            }
          >
            <Ionicons
              name="grid-outline"
              size={19}
              color="#7391A5"
            />

            <Text
              style={
                styles.bottomNavText
              }
            >
              Lainnya
            </Text>
          </Pressable>

        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  scrollContent: {
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 120,
  },

  /* HEADER */

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
    zIndex: 30,
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  brandArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },

  logoMark: {
    width: 38,
    height: 38,
    marginRight: 8,
    position: 'relative',
  },

  logoShapeOne: {
    position: 'absolute',
    width: 22,
    height: 15,
    borderTopLeftRadius: 14,
    borderBottomRightRadius: 4,
    backgroundColor: GREEN_DARK,
    transform: [{ rotate: '-18deg' }],
    left: 1,
    top: 4,
  },

  logoShapeTwo: {
    position: 'absolute',
    width: 17,
    height: 25,
    borderTopRightRadius: 5,
    borderBottomLeftRadius: 15,
    backgroundColor: GREEN,
    right: 1,
    bottom: 0,
    transform: [{ rotate: '14deg' }],
  },

  brand: {
    fontSize: 20,
    lineHeight: 23,
    fontWeight: '800',
    color: GREEN_DARK,
    letterSpacing: 0.2,
  },

  brandSubtitle: {
    marginTop: 1,
    fontSize: 10.5,
    color: TEXT_SECONDARY,
  },

  dateText: {
    marginTop: 5,
    fontSize: 11,
    color: '#557F96',
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingTop: 1,
  },

  periodWrap: {
    position: 'relative',
    zIndex: 20,
  },

  periodButton: {
    height: 39,
    minWidth: 132,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: '#DDEBF0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#557984',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  periodButtonText: {
    marginHorizontal: 8,
    fontSize: 12,
    fontWeight: '700',
    color: TEXT,
  },

  periodDropdown: {
    position: 'absolute',
    top: 44,
    right: 0,
    width: 132,
    padding: 4,
    borderRadius: 14,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: '#DDEBF0',
    shadowColor: '#557984',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 50,
  },

  periodDropdownItem: {
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  periodDropdownItemActive: {
    backgroundColor: GREEN_SOFT,
  },

  periodDropdownText: {
    fontSize: 11.5,
    color: TEXT_SECONDARY,
    fontWeight: '600',
  },

  periodDropdownTextActive: {
    color: GREEN_DARK,
    fontWeight: '800',
  },

  notificationButton: {
    width: 39,
    height: 39,
    borderRadius: 20,
    marginLeft: 8,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationDot: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: RED,
    top: 6,
    right: 6,
  },

  /* MAIN FINANCE CARD */

  mainFinanceCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CBEBDD',
    paddingHorizontal: 16,
    paddingTop: 17,
    paddingBottom: 16,
    backgroundColor: '#F0FBF7',
    overflow: 'hidden',
    shadowColor: '#3F7C6B',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.05,
    shadowRadius: 9,
    elevation: 1,
  },

  financeSummaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  financeMainLeft: {
    flexDirection: 'row',
    flex: 1,
    minWidth: 0,
  },

  walletCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
    marginTop: 1,
  },

  netIncomeArea: {
    flex: 1,
  },

  netIncomeLabel: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '700',
    color: TEXT,
  },

  netIncomeValue: {
    marginTop: 1,
    fontSize: 25,
    lineHeight: 29,
    fontWeight: '800',
    color: GREEN_DARK,
    letterSpacing: -0.4,
  },

  summaryRight: {
    width: 112,
    marginLeft: 10,
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: '#D5EAE1',
  },

  summaryMetric: {
    flexDirection: 'row',
    marginBottom: 8,
  },

  metricDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 4,
    marginRight: 6,
  },

  metricLabel: {
    fontSize: 10.5,
    color: TEXT_SECONDARY,
  },

  metricValue: {
    marginTop: 2,
    fontSize: 11.5,
    fontWeight: '800',
    color: TEXT,
  },


  performanceTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT,
  },

  performanceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  /* CHART */

  chartContainer: {
    marginTop: 2,
  },

  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginBottom: 1,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },

  legendText: {
    fontSize: 9.5,
    color: TEXT_SECONDARY,
  },

  chartArea: {
    flexDirection: 'row',
    height: 135,
  },

  yLabels: {
    width: 33,
    height: 112,
    justifyContent: 'space-between',
  },

  yLabel: {
    fontSize: 8.5,
    color: '#72909D',
  },

  chartPlot: {
    flex: 1,
    position: 'relative',
    marginLeft: 3,
  },

  gridLineTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    borderTopWidth: 1,
    borderTopColor: '#DDEDE8',
  },

  gridLineMiddle1: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '33%',
    borderTopWidth: 1,
    borderTopColor: '#DDEDE8',
  },

  gridLineMiddle2: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '66%',
    borderTopWidth: 1,
    borderTopColor: '#DDEDE8',
  },

  gridLineBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: '#DDEDE8',
  },

  barsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 112,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },

  barGroup: {
    flex: 1,
    height: 112,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  chartRight: {
    flex: 1,
  },

  dayLabelsRow: {
    flexDirection: 'row',
    height: 24,
    marginTop: 7,
  },

  dayLabelColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

  barPair: {
    width: '55%',
    maxWidth: 32,
    height: 112,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
  },

  incomeBar: {
    width: 11,
    minHeight: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: '#67D0AA',
  },

  expenseBar: {
    width: 11,
    minHeight: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: '#FF6B78',
  },

  xLabel: {
    fontSize: 8.5,
    color: '#638391',
    textAlign: 'center',
  },

  /* QUICK BUTTON */

  quickButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },

  quickButton: {
    flex: 1,
    height: 45,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  incomeButton: {
    backgroundColor: GREEN,
  },

  expenseButton: {
    backgroundColor: RED,
  },

  quickButtonText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '700',
    color: WHITE,
  },

  /* TARGET */

  targetCard: {
    minHeight: 112,
    marginTop: 11,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#D5E8FA',
    backgroundColor: BLUE_SOFT,
    paddingHorizontal: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#5D87A0',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.035,
    shadowRadius: 7,
    elevation: 1,
  },

  targetIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E0F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  targetContent: {
    flex: 1,
  },

  targetTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: TEXT,
  },

  targetSubtitle: {
    marginTop: 1,
    fontSize: 10,
    color: TEXT_SECONDARY,
  },

  targetAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 5,
  },

  targetAmount: {
    fontSize: 14.5,
    fontWeight: '800',
    color: TEXT,
  },

  targetOf: {
    fontSize: 9.5,
    color: TEXT_SECONDARY,
  },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
  },

  progressTrack: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#D9E8F2',
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: GREEN,
  },

  progressText: {
    width: 30,
    marginLeft: 6,
    fontSize: 9.5,
    fontWeight: '800',
    color: TEXT,
  },

  targetCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    marginHorizontal: 6,
    borderWidth: 7,
    borderTopColor: GREEN,
    borderRightColor: GREEN,
    borderBottomColor: GREEN,
    borderLeftColor: '#D8E7EC',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-25deg' }],
  },

  targetCircleText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: TEXT,
    transform: [{ rotate: '25deg' }],
  },

  /* MOTOR */

  motorCard: {
    minHeight: 123,
    marginTop: 11,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#D5E8FA',
    backgroundColor: BLUE_SOFT,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#5D87A0',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.035,
    shadowRadius: 7,
    elevation: 1,
  },

  motorContent: {
    flex: 1,
    paddingRight: 3,
  },

  motorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  motorIcon: {
    width: 37,
    height: 37,
    borderRadius: 19,
    backgroundColor: '#E0F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  motorTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: TEXT,
  },

  motorKM: {
    marginTop: 1,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    color: TEXT,
  },

  motorDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 9,
  },

  motorDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  motorDetailLabel: {
    marginLeft: 4,
    fontSize: 8,
    color: TEXT_SECONDARY,
  },

  motorDetailValueBlue: {
    marginLeft: 4,
    marginTop: 1,
    fontSize: 10.5,
    fontWeight: '800',
    color: BLUE,
  },

  motorDetailValueOrange: {
    marginLeft: 4,
    marginTop: 1,
    fontSize: 10.5,
    fontWeight: '800',
    color: ORANGE,
  },

  statusPill: {
    marginLeft: 4,
    paddingHorizontal: 6,
    height: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 4,
  },

  statusText: {
    fontSize: 8.5,
    fontWeight: '800',
  },

  motorIllustration: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E4F5F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
    marginRight: 8,
  },

  motorChevron: {
    position: 'absolute',
    right: 7,
    top: 8,
  },

  /* HISTORY */

  historyCard: {
    marginTop: 11,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
    paddingHorizontal: 12,
    paddingTop: 13,
    paddingBottom: 4,
    shadowColor: '#567581',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.025,
    shadowRadius: 7,
    elevation: 1,
  },

  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  historyTitle: {
    marginLeft: 6,
    fontSize: 12.5,
    fontWeight: '800',
    color: TEXT,
  },

  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  seeAllText: {
    fontSize: 10,
    color: BLUE,
    fontWeight: '600',
  },

  historyItem: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F4',
  },

  historyItemLast: {
    borderBottomWidth: 0,
  },

  historyTime: {
    width: 36,
    fontSize: 9.5,
    color: '#66889A',
  },

  historyDivider: {
    width: 1,
    height: 27,
    backgroundColor: '#DCE8ED',
    marginRight: 8,
  },

  historyTransactionIcon: {
    width: 31,
    height: 31,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  historyDescription: {
    flex: 1,
    marginLeft: 8,
    minWidth: 0,
  },

  historyName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: TEXT,
  },

  historyType: {
    marginTop: 2,
    fontSize: 9,
    color: TEXT_SECONDARY,
  },

  historyAmount: {
    marginLeft: 6,
    fontSize: 10.5,
    fontWeight: '800',
  },

  emptyHistory: {
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyHistoryText: {
    marginTop: 5,
    fontSize: 10,
    color: '#8CA3AD',
  },

  bottomSpacing: {
    height: 8,
  },


  /* MODAL POPUPS */

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(246, 250, 249, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13,
    paddingVertical: 30,
  },

  modalTintGreen: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(246, 250, 249, 0.10)',
  },

  modalTintRed: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(246, 250, 249, 0.10)',
  },

  modalKeyboard: {
    width: '100%',
    maxHeight: '92%',
    alignItems: 'center',
  },

  incomeModal: {
    width: SCREEN_WIDTH - 26,
    maxWidth: 430,
    height: 620,
    borderRadius: 27,
    backgroundColor: 'rgba(246, 250, 249, 0.88)',
    borderWidth: 1,
    borderColor: '#C7EBDD',
    paddingHorizontal: 17,
    paddingTop: 16,
    paddingBottom: 12,
    shadowColor: '#0A4E59',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 12,
    overflow: 'hidden',
  },

  expenseModal: {
    width: SCREEN_WIDTH - 26,
    maxWidth: 430,
    height: 620,
    borderRadius: 27,
    backgroundColor: 'rgba(246, 250, 249, 0.88)',
    borderWidth: 1,
    borderColor: '#F0C9CE',
    paddingHorizontal: 17,
    paddingTop: 16,
    paddingBottom: 12,
    shadowColor: '#0A4E59',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 12,
    overflow: 'hidden',
  },

  modalHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  incomeModalIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E2F7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  expenseModalIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFE9EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT,
  },

  modalSubtitle: {
    marginTop: 1,
    fontSize: 10.5,
    color: TEXT_SECONDARY,
  },

  modalCloseButton: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },

  modalScrollContent: {
    paddingBottom: 3,
  },

  modalSection: {
    marginBottom: 15,
  },

  modalSectionLabel: {
    marginBottom: 8,
    fontSize: 12.5,
    fontWeight: '800',
    color: TEXT,
  },

  modalInputLabel: {
    marginBottom: 7,
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_SECONDARY,
  },

  modalChoiceRow: {
    flexDirection: 'row',
    gap: 9,
  },

  incomeChoice: {
    flex: 1,
    minHeight: 43,
    borderRadius: 13,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: '#D8E8E2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  incomeChoiceActive: {
    backgroundColor: '#E2F7ED',
    borderColor: '#9EDBBE',
  },

  expenseChoice: {
    flex: 1,
    minHeight: 43,
    borderRadius: 13,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: '#E8E0E2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  expenseChoiceActive: {
    backgroundColor: '#FFE9EC',
    borderColor: '#F1B7BE',
  },

  modalChoiceText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#596A73',
    textAlign: 'center',
  },

  incomeChoiceTextActive: {
    color: GREEN_DARK,
    fontWeight: '800',
  },

  expenseChoiceTextActive: {
    color: RED,
    fontWeight: '800',
  },

  modalInfoGreen: {
    flexDirection: 'row',
    gap: 9,
    backgroundColor: '#EAF9F3',
    borderRadius: 14,
    padding: 12,
    marginBottom: 15,
  },

  modalInfoTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: GREEN_DARK,
    marginBottom: 3,
  },

  modalInfoText: {
    fontSize: 10.5,
    lineHeight: 16,
    color: '#58756F',
  },

  modalInputGreen: {
    minHeight: 46,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#C9E9DB',
    paddingHorizontal: 13,
    fontSize: 15,
    color: TEXT,
  },

  modalInputRed: {
    minHeight: 46,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#F0CCD1',
    paddingHorizontal: 13,
    fontSize: 15,
    color: TEXT,
  },

  modalSaveGreen: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },

  modalSaveRed: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: RED,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },

  modalSaveText: {
    color: WHITE,
    fontSize: 13.5,
    fontWeight: '800',
  },

  modalSuggestionBox: {
    backgroundColor: WHITE,
    borderRadius: 12,
    marginTop: 7,
    borderWidth: 1,
    borderColor: '#E8DDE0',
    overflow: 'hidden',
  },

  modalSuggestionItem: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E9EB',
  },

  modalSuggestionText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#596A73',
  },

  /* BOTTOM NAVIGATION */

  bottomNavigation: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 76,
    backgroundColor: WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    shadowColor: '#446874',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },

  bottomNavItem: {
    width: '24%',
    height: 57,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  bottomNavText: {
    marginTop: 3,
    fontSize: 9.5,
    color: '#7391A5',
    fontWeight: '500',
  },

  bottomNavTextActive: {
    color: GREEN,
    fontWeight: '800',
  },

  activeUnderline: {
    position: 'absolute',
    bottom: 0,
    width: 34,
    height: 2,
    borderRadius: 2,
    backgroundColor: GREEN,
  },
});

