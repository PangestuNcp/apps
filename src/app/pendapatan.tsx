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

import { Ionicons } from '@expo/vector-icons';
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

    if (jenisPendapatan === 'tips') {
      const tanggal = new Date()
        .toISOString()
        .slice(0, 10);

      db.withTransactionSync(() => {
        if (jenisTips === 'tunai') {
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

    const potongKredit = Math.min(
      data.kredit_grab,
      nilaiTagihan
    );

    const kekurangan =
      nilaiTagihan - potongKredit;

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
        UPDATE saldo
        SET cash = cash + ?
        WHERE id = 1
        `,
        [nilaiTagihan]
      );

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
          tanggal,
          'pendapatan',
          'orderan_tunai',
          'Pendapatan Grab - Orderan Tunai',
          nilaiPendapatan,
        ]
      );

      if (kekurangan > 0) {
        db.runSync(
          `
          INSERT INTO transaksi
          (
            tanggal,
            jenis,
            subjenis,
            keterangan,
            nominal,
            deskripsi
          )
          VALUES (?, ?, ?, ?, ?, ?)
          `,
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
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
              Pendapatan
            </Text>

            <Text style={styles.subtitle}>
              Catat pendapatan Grab
            </Text>
          </View>
        </View>

        {/* JENIS PENDAPATAN */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons
              name="trending-up-outline"
              size={18}
              color="#4E8A67"
            />

            <Text style={styles.sectionTitle}>
              Jenis Pendapatan
            </Text>
          </View>

          <View style={styles.choiceRow}>
            <Pressable
              style={[
                styles.choiceButton,
                jenisPendapatan === 'orderan' &&
                  styles.choiceButtonSelected,
              ]}
              onPress={() =>
                setJenisPendapatan('orderan')
              }
            >
              <Text
                style={[
                  styles.choiceText,
                  jenisPendapatan === 'orderan' &&
                    styles.choiceTextSelected,
                ]}
              >
                Orderan
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.choiceButton,
                jenisPendapatan === 'tips' &&
                  styles.choiceButtonSelected,
              ]}
              onPress={() =>
                setJenisPendapatan('tips')
              }
            >
              <Text
                style={[
                  styles.choiceText,
                  jenisPendapatan === 'tips' &&
                    styles.choiceTextSelected,
                ]}
              >
                Tips
              </Text>
            </Pressable>
          </View>
        </View>

        {/* TIPS */}
        {jenisPendapatan === 'tips' ? (
          <>
            <View style={styles.infoBox}>
              <View style={styles.infoHeader}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color="#4E8A67"
                />

                <Text style={styles.infoTitle}>
                  Pendapatan Tips
                </Text>
              </View>

              <Text style={styles.infoText}>
                Tips tunai masuk ke Cash.
              </Text>

              <Text style={styles.infoText}>
                Tips non-tunai masuk ke Dompet Grab.
              </Text>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons
                  name="wallet-outline"
                  size={18}
                  color="#4E8A67"
                />

                <Text style={styles.sectionTitle}>
                  Jenis Tips
                </Text>
              </View>

              <View style={styles.choiceRow}>
                <Pressable
                  style={[
                    styles.choiceButton,
                    jenisTips === 'tunai' &&
                      styles.choiceButtonSelected,
                  ]}
                  onPress={() =>
                    setJenisTips('tunai')
                  }
                >
                  <Text
                    style={[
                      styles.choiceText,
                      jenisTips === 'tunai' &&
                        styles.choiceTextSelected,
                    ]}
                  >
                    Tips Tunai
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.choiceButton,
                    jenisTips === 'non_tunai' &&
                      styles.choiceButtonSelected,
                  ]}
                  onPress={() =>
                    setJenisTips('non_tunai')
                  }
                >
                  <Text
                    style={[
                      styles.choiceText,
                      jenisTips === 'non_tunai' &&
                        styles.choiceTextSelected,
                    ]}
                  >
                    Tips Non-Tunai
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.inputLabel}>
                Nominal Tips
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Rp5000"
                placeholderTextColor="#9AA1AC"
                keyboardType="numeric"
                value={pendapatan}
                onChangeText={setPendapatan}
              />
            </View>

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
            {/* ORDERAN */}
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons
                  name="bicycle-outline"
                  size={18}
                  color="#4E8A67"
                />

                <Text style={styles.sectionTitle}>
                  Jenis Orderan
                </Text>
              </View>

              <View style={styles.choiceRow}>
                <Pressable
                  style={[
                    styles.choiceButton,
                    jenisOrder === 'tunai' &&
                      styles.choiceButtonSelected,
                  ]}
                  onPress={() =>
                    setJenisOrder('tunai')
                  }
                >
                  <Text
                    style={[
                      styles.choiceText,
                      jenisOrder === 'tunai' &&
                        styles.choiceTextSelected,
                    ]}
                  >
                    Orderan Tunai
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.choiceButton,
                    jenisOrder === 'non_tunai' &&
                      styles.choiceButtonSelected,
                  ]}
                  onPress={() =>
                    setJenisOrder('non_tunai')
                  }
                >
                  <Text
                    style={[
                      styles.choiceText,
                      jenisOrder === 'non_tunai' &&
                        styles.choiceTextSelected,
                    ]}
                  >
                    Orderan Non-Tunai
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.infoBox}>
              <View style={styles.infoHeader}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color="#4E8A67"
                />

                <Text style={styles.infoTitle}>
                  Pendapatan Grab
                </Text>
              </View>

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

            <View style={styles.section}>
              <Text style={styles.inputLabel}>
                Total Pendapatan (Ongkir)
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Rp3000"
                placeholderTextColor="#9AA1AC"
                keyboardType="numeric"
                value={pendapatan}
                onChangeText={setPendapatan}
              />
            </View>

            {jenisOrder === 'tunai' && (
              <View style={styles.section}>
                <Text style={styles.inputLabel}>
                  Jumlah Uang yang Harus Ditagih
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Rp10000"
                  placeholderTextColor="#9AA1AC"
                  keyboardType="numeric"
                  value={tagihan}
                  onChangeText={setTagihan}
                />
              </View>
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
    marginRight: 15,
    color: '#333',
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
  },

  subtitle: {
    marginTop: 2,
    color: '#68707D',
    fontSize: 12,
  },

  section: {
    marginBottom: 18,
  },

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },

  sectionTitle: {
    marginLeft: 7,
    fontSize: 14,
    fontWeight: '700',
    color: '#252A31',
  },

  choiceRow: {
    flexDirection: 'row',
    gap: 10,
  },

  choiceButton: {
    flex: 1,
    minHeight: 46,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E1E4E8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },

  choiceButtonSelected: {
    backgroundColor: '#EAF5EE',
    borderColor: '#BBDCC8',
  },

  choiceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555D68',
    textAlign: 'center',
  },

  choiceTextSelected: {
    color: '#4E8A67',
    fontWeight: '700',
  },

  infoBox: {
    backgroundColor: '#F0F8F3',
    borderRadius: 15,
    padding: 15,
    marginBottom: 18,
  },

  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },

  infoTitle: {
    marginLeft: 7,
    fontSize: 14,
    fontWeight: '700',
    color: '#416D53',
  },

  infoText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#66706A',
    marginBottom: 3,
  },

  inputLabel: {
    marginBottom: 7,
    fontSize: 13,
    fontWeight: '700',
    color: '#555D68',
  },

  input: {
    backgroundColor: '#F1F3F5',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 16,
    color: '#252A31',
  },

  saveButton: {
    minHeight: 50,
    backgroundColor: '#4E8A67',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    marginTop: 2,
  },

  saveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});