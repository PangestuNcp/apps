import React, { useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import db from '../database/database';

const sumber = [
  { key: 'dompet_grab', label: 'Dompet Grab' },
  { key: 'ovo', label: 'OVO' },
  { key: 'seabank', label: 'SeaBank' },
] as const;

type SumberKey = (typeof sumber)[number]['key'];

type TujuanKey = 'ovo' | 'seabank';

function formatRupiah(nominal: number) {
  return `Rp${nominal.toLocaleString('id-ID')}`;
}

export default function TransferScreen() {
  const router = useRouter();

  const [dari, setDari] =
    useState<SumberKey>('dompet_grab');

  const [ke, setKe] =
    useState<TujuanKey>('ovo');

  const [nominal, setNominal] = useState('');

  const lebarOvo = useRef(
    new Animated.Value(0.8)
  ).current;

  const lebarSeaBank = useRef(
    new Animated.Value(0.2)
  ).current;

  const warnaOvo = useRef(
    new Animated.Value(1)
  ).current;

  const warnaSeaBank = useRef(
    new Animated.Value(0)
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(lebarOvo, {
        toValue: ke === 'ovo' ? 0.8 : 0.2,
        useNativeDriver: false,
        tension: 70,
        friction: 10,
      }),

      Animated.spring(lebarSeaBank, {
        toValue: ke === 'seabank' ? 0.8 : 0.2,
        useNativeDriver: false,
        tension: 70,
        friction: 10,
      }),

      Animated.timing(warnaOvo, {
        toValue: ke === 'ovo' ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }),

      Animated.timing(warnaSeaBank, {
        toValue: ke === 'seabank' ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }),
    ]).start();
  }, [
    ke,
    lebarOvo,
    lebarSeaBank,
    warnaOvo,
    warnaSeaBank,
  ]);

  function simpan() {
    const nilai = Number(
      nominal.replace(/\D/g, '')
    );

    if (!nilai || nilai <= 0) {
      Alert.alert(
        'Nominal salah',
        'Masukkan nominal transfer yang benar.'
      );
      return;
    }

    if (dari === ke) {
      Alert.alert(
        'Transfer tidak valid',
        'Sumber dan tujuan tidak boleh sama.'
      );
      return;
    }

    const biayaAdmin =
      dari === 'seabank' && ke === 'ovo'
        ? 1000
        : 0;

    const totalPotong = nilai + biayaAdmin;

    const data = db.getFirstSync<{
      cash: number;
      dompet_grab: number;
      ovo: number;
      seabank: number;
    }>(`
      SELECT
        cash,
        dompet_grab,
        ovo,
        seabank
      FROM saldo
      WHERE id = 1
    `);

    if (!data) {
      Alert.alert(
        'Data tidak ditemukan',
        'Data saldo belum tersedia.'
      );
      return;
    }

    const saldoSumber =
      dari === 'dompet_grab'
        ? data.dompet_grab
        : dari === 'ovo'
          ? data.ovo
          : data.seabank;

    const namaSumber =
      sumber.find(
        (item) => item.key === dari
      )?.label ?? dari;

    const namaTujuan =
      ke === 'ovo'
        ? 'OVO'
        : 'SeaBank';

    if (saldoSumber < totalPotong) {
      Alert.alert(
        'Saldo tidak cukup',
        `Saldo ${namaSumber} hanya ${formatRupiah(
          saldoSumber
        )}.\n\n` +
          `Yang dibutuhkan: ${formatRupiah(
            totalPotong
          )}`
      );
      return;
    }

    const tanggal = new Date()
      .toISOString()
      .slice(0, 10);

    db.withTransactionSync(() => {
      db.runSync(
        `
        UPDATE saldo
        SET ${dari} = ${dari} - ?
        WHERE id = 1
        `,
        [totalPotong]
      );

      db.runSync(
        `
        UPDATE saldo
        SET ${ke} = ${ke} + ?
        WHERE id = 1
        `,
        [nilai]
      );

      db.runSync(
        `
        INSERT INTO transaksi
        (tanggal, jenis, subjenis, keterangan, nominal)
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          tanggal,
          'transfer',
          `${namaSumber} -> ${namaTujuan}`,
          `Pemindahan saldo ${namaSumber} ke ${namaTujuan}`,
          nilai,
        ]
      );

      if (biayaAdmin > 0) {
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
            dari,
            'Admin transfer seabank',
            biayaAdmin,
            'Biaya admin transfer SeaBank → OVO',
          ]
        );
      }
    });

    setNominal('');

    let pesan =
      `${formatRupiah(nilai)} berhasil dipindahkan ` +
      `dari ${namaSumber} ke ${namaTujuan}.`;

    if (biayaAdmin > 0) {
      pesan +=
        `\n\nBiaya admin: ${formatRupiah(
          biayaAdmin
        )}\n` +
        `Total dipotong dari ${namaSumber}: ` +
        `${formatRupiah(totalPotong)}`;
    }

    Alert.alert(
      'Berhasil',
      pesan,
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
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
          >
            <Text style={styles.back}>‹</Text>
          </Pressable>

          <View>
            <Text style={styles.title}>
              Transfer
            </Text>

            <Text style={styles.subtitle}>
              Pindahkan saldo antar akun
            </Text>
          </View>
        </View>

        {/* SUMBER */}

        {dari === 'dompet_grab' ? (
          <Pressable
            style={[
              styles.accountButton,
              styles.accountSelected,
            ]}
            onPress={() => setDari('dompet_grab')}
          >
            <Text style={styles.accountTextSelected}>
              Dompet Grab
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.accountButton}
            onPress={() => setDari('dompet_grab')}
          >
            <Text style={styles.accountText}>
              Dompet Grab
            </Text>
          </Pressable>
        )}

        <View style={styles.accountRow}>
          <Pressable
            style={[
              styles.accountButtonHalf,
              dari === 'ovo' &&
                styles.accountSelected,
            ]}
            onPress={() => {
              setDari('ovo');
              setKe('seabank');
            }}
          >
            <Text
              style={[
                styles.accountText,
                dari === 'ovo' &&
                  styles.accountTextSelected,
              ]}
            >
              OVO
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.accountButtonHalf,
              dari === 'seabank' &&
                styles.accountSelected,
            ]}
            onPress={() => {
              setDari('seabank');
              setKe('ovo');
            }}
          >
            <Text
              style={[
                styles.accountText,
                dari === 'seabank' &&
                  styles.accountTextSelected,
              ]}
            >
              SeaBank
            </Text>
          </Pressable>
        </View>

        {/* ARAH TRANSFER OVO / SEABANK */}

        {dari !== 'dompet_grab' && (
          <View style={styles.transferDirection}>
            <Text style={styles.directionText}>
              {dari === 'ovo'
                ? 'OVO'
                : 'SeaBank'}
            </Text>

            <Ionicons
              name="arrow-forward"
              size={20}
              color="#5B7FA5"
            />

            <Text style={styles.directionText}>
              {ke === 'ovo'
                ? 'OVO'
                : 'SeaBank'}
            </Text>
          </View>
        )}

        {/* TUJUAN DOMPET GRAB */}
        {dari === 'dompet_grab' && (
          <View style={styles.destinationSection}>
            <View style={styles.destinationRow}>
              <Animated.View
                style={[
                  styles.destinationAnimated,
                  {
                    flex: lebarOvo,
                    backgroundColor: warnaOvo.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        '#F0F1F3',
                        '#E8F2FC',
                      ],
                    }),
                    borderColor: warnaOvo.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        '#E1E3E6',
                        '#BFD6EB',
                      ],
                    }),
                  },
                ]}
              >
                <Pressable
                  style={styles.destinationPressable}
                  onPress={() => setKe('ovo')}
                >
                  <Text
                    style={[
                      styles.destinationText,
                      ke === 'ovo' &&
                        styles.destinationTextSelected,
                    ]}
                  >
                    {ke === 'ovo'
                      ? 'Dompet Grab → OVO'
                      : 'OVO'}
                  </Text>
                </Pressable>
              </Animated.View>

              <Animated.View
                style={[
                  styles.destinationAnimated,
                  {
                    flex: lebarSeaBank,
                    backgroundColor:
                      warnaSeaBank.interpolate({
                        inputRange: [0, 1],
                        outputRange: [
                          '#F0F1F3',
                          '#E8F2FC',
                        ],
                      }),
                    borderColor:
                      warnaSeaBank.interpolate({
                        inputRange: [0, 1],
                        outputRange: [
                          '#E1E3E6',
                          '#BFD6EB',
                        ],
                      }),
                  },
                ]}
              >
                <Pressable
                  style={styles.destinationPressable}
                  onPress={() => setKe('seabank')}
                >
                  <Text
                    style={[
                      styles.destinationText,
                      ke === 'seabank' &&
                        styles.destinationTextSelected,
                    ]}
                  >
                    {ke === 'seabank'
                      ? 'Dompet Grab → SeaBank'
                      : 'SeaBank'}
                  </Text>
                </Pressable>
              </Animated.View>
            </View>
          </View>
        )}

        {/* ADMIN */}

        {dari === 'seabank' &&
          ke === 'ovo' && (
            <View style={styles.adminCard}>
              <Text style={styles.adminTitle}>
                Biaya Admin
              </Text>

              <Text style={styles.adminText}>
                Transfer SeaBank ke OVO dikenakan
                biaya admin Rp1.000.
              </Text>
            </View>
          )}

        {/* NOMINAL */}

        <View style={styles.nominalSection}>
          <Text style={styles.label}>
            Nominal
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Contoh: 50000"
            placeholderTextColor="#9AA1AB"
            keyboardType="numeric"
            value={nominal}
            onChangeText={setNominal}
          />
        </View>

        <Pressable
          style={styles.saveButton}
          onPress={simpan}
        >
          <Text style={styles.saveText}>
            Simpan Transfer
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
    color: '#252A31',
  },

  subtitle: {
    marginTop: 2,
    color: '#68707D',
    fontSize: 12,
  },

  label: {
    marginBottom: 7,
    fontSize: 13,
    fontWeight: '700',
    color: '#555D68',
  },

  accountButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E7EB',
    marginBottom: 9,
  },

  accountRow: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 10,
  },

  accountButtonHalf: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E7EB',
    alignItems: 'center',
  },

  destinationRow: {
    flexDirection: 'row',
    gap: 9,
    height: 52,
  },

  destinationAnimated: {
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },

  destinationPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },

  destinationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8A929D',
    textAlign: 'center',
  },

  destinationTextSelected: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F7298',
  },

  accountButtonWide: {
    flex: 1.7,
  },

  accountSelected: {
    backgroundColor: '#EEF4FA',
    borderColor: '#BFD2E5',
  },

  accountText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#252A31',
  },

  accountTextSelected: {
    color: '#4F7298',
    fontSize: 15,
    fontWeight: '700',
  },
  directionButtonText: {
    fontSize: 12.5,
    textAlign: 'center',
  },

  transferDirection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 4,
    marginBottom: 18,
    paddingVertical: 12,
  },

  directionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#252A31',
  },

  destinationSection: {
    marginTop: 30,
    marginBottom: 5,
  },

  adminCard: {
    backgroundColor: '#F0F6FB',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
    marginTop: 5,
    marginBottom: 14,
  },

  adminTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F7298',
    marginBottom: 4,
  },

  adminText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#68707D',
  },

  nominalSection: {
    marginTop: 4,
  },

  input: {
    backgroundColor: '#F1F3F5',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 16,
    color: '#252A31',
    marginBottom: 18,
  },

  saveButton: {
    backgroundColor: '#5B7FA5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },

  saveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});