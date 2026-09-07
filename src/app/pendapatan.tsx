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

type JenisPendapatan = 'orderan' | 'tips';
type JenisOrder = 'tunai' | 'non_tunai';
type JenisTips = 'tunai' | 'non_tunai';

function formatRupiah(nominal: number) {
  return `Rp${nominal.toLocaleString('id-ID')}`;
}

export default function PendapatanScreen() {
  const router = useRouter();

  const [jenisPendapatan, setJenisPendapatan] =
    useState<JenisPendapatan>('orderan');

  const [jenisOrder, setJenisOrder] =
    useState<JenisOrder>('tunai');

  const [jenisTips, setJenisTips] =
    useState<JenisTips>('tunai');

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

    /*
     * =========================
     * TIPS
     * =========================
     */

    if (jenisPendapatan === 'tips') {
      const tanggal = new Date()
        .toISOString()
        .slice(0, 10);

      db.withTransactionSync(() => {
        if (jenisTips === 'tunai') {
          // Tips tunai masuk ke Cash.
          db.runSync(
            `
            UPDATE saldo
            SET cash = cash + ?
            WHERE id = 1
            `,
            [nilaiPendapatan]
          );

          db.runSync(
            `
            INSERT INTO transaksi
            (tanggal, jenis, subjenis, keterangan, nominal)
            VALUES (?, ?, ?, ?, ?)
            `,
            [
              tanggal,
              'pendapatan',
              'tips_tunai',
              'Tips - Tunai',
              nilaiPendapatan,
            ]
          );
        } else {
          // Tips non-tunai masuk ke Dompet Grab.
          db.runSync(
            `
            UPDATE saldo
            SET dompet_grab = dompet_grab + ?
            WHERE id = 1
            `,
            [nilaiPendapatan]
          );

          db.runSync(
            `
            INSERT INTO transaksi
            (tanggal, jenis, subjenis, keterangan, nominal)
            VALUES (?, ?, ?, ?, ?)
            `,
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
          ? `Tips ${formatRupiah(
              nilaiPendapatan
            )} masuk ke Cash.`
          : `Tips ${formatRupiah(
              nilaiPendapatan
            )} masuk ke Dompet Grab.`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );

      return;
    }

    /*
     * =========================
     * ORDERAN
     * =========================
     */

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
      `
      SELECT
        kredit_grab,
        dompet_grab
      FROM saldo
      WHERE id = 1
      `
    );

    if (!data) {
      Alert.alert(
        'Data tidak ditemukan',
        'Data saldo belum tersedia.'
      );
      return;
    }

    const tanggal = new Date()
      .toISOString()
      .slice(0, 10);

    /*
     * =========================
     * ORDERAN NON-TUNAI
     * =========================
     *
     * Pendapatan/ongkir masuk
     * ke Dompet Grab.
     *
     * Tidak ada uang masuk Cash.
     */

    if (jenisOrder === 'non_tunai') {
      db.withTransactionSync(() => {
        db.runSync(
          `
          UPDATE saldo
          SET dompet_grab = dompet_grab + ?
          WHERE id = 1
          `,
          [nilaiPendapatan]
        );

        db.runSync(
          `
          INSERT INTO transaksi
          (tanggal, jenis, subjenis, keterangan, nominal)
          VALUES (?, ?, ?, ?, ?)
          `,
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
        `Pendapatan ${formatRupiah(
          nilaiPendapatan
        )} masuk ke Dompet Grab.`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );

      return;
    }

    /*
     * =========================
     * ORDERAN TUNAI
     * =========================
     *
     * 1. Pendapatan/ongkir masuk
     *    ke Dompet Grab.
     *
     * 2. Uang yang ditagih
     *    customer masuk Cash.
     *
     * 3. Kredit Grab digunakan
     *    terlebih dahulu.
     *
     * 4. Jika Kredit Grab kurang,
     *    kekurangan dipotong dari
     *    Dompet Grab.
     *
     * 5. Dompet Grab boleh minus.
     */

    const potongKredit = Math.min(
      data.kredit_grab,
      nilaiTagihan
    );

    const kekurangan =
      nilaiTagihan - potongKredit;

    db.withTransactionSync(() => {
      // Pendapatan/ongkir masuk ke Dompet Grab.
      db.runSync(
        `
        UPDATE saldo
        SET dompet_grab = dompet_grab + ?
        WHERE id = 1
        `,
        [nilaiPendapatan]
      );

      // Uang yang ditagih dari customer masuk ke Cash.
      db.runSync(
        `
        UPDATE saldo
        SET cash = cash + ?
        WHERE id = 1
        `,
        [nilaiTagihan]
      );

      // Kredit Grab digunakan terlebih dahulu.
      if (potongKredit > 0) {
        db.runSync(
          `
          UPDATE saldo
          SET kredit_grab = kredit_grab - ?
          WHERE id = 1
          `,
          [potongKredit]
        );
      }

      // Kekurangan ditanggung Dompet Grab.
      // Dompet Grab boleh menjadi minus.
      if (kekurangan > 0) {
        db.runSync(
          `
          UPDATE saldo
          SET dompet_grab = dompet_grab - ?
          WHERE id = 1
          `,
          [kekurangan]
        );
      }

      db.runSync(
        `
        INSERT INTO transaksi
        (tanggal, jenis, subjenis, keterangan, nominal)
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          new Date().toISOString(),
          'pengeluaran',
          'kekurangan_tagihan_tunai_grab',
          'Dompet Grab Topup Kekurangan Tagih Tunai Grab',
          kekurangan,
        ]
      );
    });

    setPendapatan('');
    setTagihan('');

    Alert.alert(
      'Berhasil',
      `Pendapatan: ${formatRupiah(
        nilaiPendapatan
      )}\n` +
        `Ditagih ke customer: ${formatRupiah(
          nilaiTagihan
        )}\n\n` +
        `Masuk ke Cash: ${formatRupiah(
          nilaiTagihan
        )}\n` +
        `Masuk ke Dompet Grab: ${formatRupiah(
          nilaiPendapatan
        )}\n` +
        `Kredit Grab dipotong: ${formatRupiah(
          potongKredit
        )}\n` +
        `Kekurangan dari Dompet Grab: ${formatRupiah(
          kekurangan
        )}`,
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
      <ScrollView
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
          >
            <Text style={styles.back}>‹</Text>
          </Pressable>

          <View>
            <Text style={styles.title}>
              Pendapatan
            </Text>

            <Text style={styles.subtitle}>
              Catat pendapatan Grab
            </Text>
          </View>
        </View>

        {/* JENIS PENDAPATAN */}

        <Text style={styles.label}>
          Jenis Pendapatan
        </Text>

        <View style={styles.orderTypeList}>
          <Pressable
            style={[
              styles.orderTypeButton,
              jenisPendapatan === 'orderan' &&
                styles.orderTypeSelected,
            ]}
            onPress={() =>
              setJenisPendapatan('orderan')
            }
          >
            <Text
              style={[
                styles.orderTypeText,
                jenisPendapatan === 'orderan' &&
                  styles.orderTypeTextSelected,
              ]}
            >
              Orderan
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.orderTypeButton,
              jenisPendapatan === 'tips' &&
                styles.orderTypeSelected,
            ]}
            onPress={() =>
              setJenisPendapatan('tips')
            }
          >
            <Text
              style={[
                styles.orderTypeText,
                jenisPendapatan === 'tips' &&
                  styles.orderTypeTextSelected,
              ]}
            >
              Tips
            </Text>
          </Pressable>
        </View>

        {/* ========================= */}
        {/* TIPS */}
        {/* ========================= */}

        {jenisPendapatan === 'tips' ? (
          <>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>
                Pendapatan Tips
              </Text>

              <Text style={styles.infoText}>
                Tips tunai masuk ke Cash.
              </Text>

              <Text style={styles.infoText}>
                Tips non-tunai masuk ke Dompet Grab.
              </Text>
            </View>

            <Text style={styles.label}>
              Jenis Tips
            </Text>

            <View style={styles.orderTypeList}>
              <Pressable
                style={[
                  styles.orderTypeButton,
                  jenisTips === 'tunai' &&
                    styles.orderTypeSelected,
                ]}
                onPress={() =>
                  setJenisTips('tunai')
                }
              >
                <Text
                  style={[
                    styles.orderTypeText,
                    jenisTips === 'tunai' &&
                      styles.orderTypeTextSelected,
                  ]}
                >
                  Tips Tunai
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.orderTypeButton,
                  jenisTips === 'non_tunai' &&
                    styles.orderTypeSelected,
                ]}
                onPress={() =>
                  setJenisTips('non_tunai')
                }
              >
                <Text
                  style={[
                    styles.orderTypeText,
                    jenisTips === 'non_tunai' &&
                      styles.orderTypeTextSelected,
                  ]}
                >
                  Tips Non-Tunai
                </Text>
              </Pressable>
            </View>

            <Text style={styles.label}>
              Nominal Tips
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Contoh: 5000"
              keyboardType="numeric"
              value={pendapatan}
              onChangeText={setPendapatan}
            />

            <Pressable
              style={styles.saveButton}
              onPress={simpan}
            >
              <Text style={styles.saveText}>
                Simpan Tips
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            {/* ========================= */}
            {/* ORDERAN */}
            {/* ========================= */}

            <Text style={styles.label}>
              Jenis Orderan
            </Text>

            <View style={styles.orderTypeList}>
              <Pressable
                style={[
                  styles.orderTypeButton,
                  jenisOrder === 'tunai' &&
                    styles.orderTypeSelected,
                ]}
                onPress={() =>
                  setJenisOrder('tunai')
                }
              >
                <Text
                  style={[
                    styles.orderTypeText,
                    jenisOrder === 'tunai' &&
                      styles.orderTypeTextSelected,
                  ]}
                >
                  Orderan Tunai
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.orderTypeButton,
                  jenisOrder === 'non_tunai' &&
                    styles.orderTypeSelected,
                ]}
                onPress={() =>
                  setJenisOrder('non_tunai')
                }
              >
                <Text
                  style={[
                    styles.orderTypeText,
                    jenisOrder === 'non_tunai' &&
                      styles.orderTypeTextSelected,
                  ]}
                >
                  Orderan Non-Tunai
                </Text>
              </Pressable>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>
                Pendapatan Grab
              </Text>

              <Text style={styles.infoText}>
                Semua pendapatan/ongkir masuk ke
                Dompet Grab.
              </Text>

              {jenisOrder === 'tunai' ? (
                <Text style={styles.infoText}>
                  Untuk orderan tunai, uang yang
                  ditagih ke customer masuk ke Cash.
                </Text>
              ) : (
                <Text style={styles.infoText}>
                  Untuk orderan non-tunai, tidak ada
                  uang yang masuk ke Cash.
                </Text>
              )}
            </View>

            <Text style={styles.label}>
              Total Pendapatan (Ongkir)
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Contoh: 3000"
              keyboardType="numeric"
              value={pendapatan}
              onChangeText={setPendapatan}
            />

            {jenisOrder === 'tunai' && (
              <>
                <Text style={styles.label}>
                  Jumlah Uang yang Harus Ditagih
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Contoh: 10000"
                  keyboardType="numeric"
                  value={tagihan}
                  onChangeText={setTagihan}
                />
              </>
            )}

            <Pressable
              style={styles.saveButton}
              onPress={simpan}
            >
              <Text style={styles.saveText}>
                Simpan Pendapatan
              </Text>
            </Pressable>
          </>
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
    marginBottom: 30,
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

  label: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '700',
  },

  orderTypeList: {
    gap: 10,
    marginBottom: 20,
  },

  orderTypeButton: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E1E4E8',
  },

  orderTypeSelected: {
    backgroundColor: '#222',
    borderColor: '#222',
  },

  orderTypeText: {
    fontSize: 15,
    fontWeight: '700',
  },

  orderTypeTextSelected: {
    color: '#FFFFFF',
  },

  infoCard: {
    backgroundColor: '#EAF2FF',
    borderRadius: 15,
    padding: 16,
    marginBottom: 20,
  },

  infoTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },

  infoText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#444',
    marginBottom: 4,
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 20,
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