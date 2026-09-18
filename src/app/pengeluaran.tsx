import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { useRouter } from 'expo-router';

import db from '../database/database';

const akun = [
  { key: 'cash', label: 'Cash' },
  { key: 'ovo', label: 'OVO' },
  { key: 'seabank', label: 'SeaBank' },
] as const;

type AkunKey = (typeof akun)[number]['key'];

export default function PengeluaranScreen() {
  const router = useRouter();

  const [keterangan, setKeterangan] = useState('');
  const [nominal, setNominal] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [saranKeterangan, setSaranKeterangan] = useState<string[]>([]);
  const [akunDipilih, setAkunDipilih] =
    useState<AkunKey>('cash');

  function cariSaranKeterangan(teks: string) {
    const nilai = teks.trim();

    if (!nilai) {
      setSaranKeterangan([]);
      return;
    }

    const hasil = db.getAllSync<{ keterangan: string }>(
      `
      SELECT DISTINCT keterangan
      FROM transaksi
      WHERE jenis = 'pengeluaran'
        AND keterangan IS NOT NULL
        AND TRIM(keterangan) != ''
        AND LOWER(keterangan) LIKE LOWER(?)
      ORDER BY keterangan COLLATE NOCASE ASC
      LIMIT 5
      `,
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

    const keteranganLama =
      db.getFirstSync<{ keterangan: string }>(
        `
        SELECT keterangan
        FROM transaksi
        WHERE jenis = 'pengeluaran'
          AND keterangan IS NOT NULL
          AND TRIM(keterangan) != ''
          AND LOWER(TRIM(keterangan)) =
              LOWER(TRIM(?))
        ORDER BY id ASC
        LIMIT 1
        `,
        [keteranganInput]
      );

    const keteranganFinal =
      keteranganLama?.keterangan ??
      keteranganInput;

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

    const saldoSekarang = db.getFirstSync<{
      saldo: number;
    }>(
      `SELECT ${akunDipilih} AS saldo
       FROM saldo
       WHERE id = 1`
    );

    if (!saldoSekarang || saldoSekarang.saldo < nilai) {
      const namaAkun =
        akun.find(
          (item) => item.key === akunDipilih
        )?.label ?? 'akun';

      Alert.alert(
        'Saldo tidak cukup',
        `Saldo ${namaAkun} tidak mencukupi.`
      );
      return;
    }

    const tanggal = new Date()
      .toISOString()
      .slice(0, 10);

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
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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
                Pengeluaran
              </Text>

              <Text style={styles.subtitle}>
                Catat pengeluaran Anda
              </Text>
            </View>
          </View>

          {/* KETERANGAN */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons
                name="receipt-outline"
                size={18}
                color="#B85C5C"
              />

              <Text style={styles.sectionTitle}>
                Keterangan
              </Text>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Contoh: Makan"
              placeholderTextColor="#9AA1AC"
              value={keterangan}
              onChangeText={(teks) => {
                setKeterangan(teks);
                cariSaranKeterangan(teks);
              }}
            />

            {saranKeterangan.length > 0 && (
              <View style={styles.suggestionBox}>
                {saranKeterangan.map((saran) => (
                  <Pressable
                    key={saran}
                    style={styles.suggestionItem}
                    onPress={() => {
                      setKeterangan(saran);
                      setSaranKeterangan([]);
                    }}
                  >
                    <Text style={styles.suggestionText}>
                      {saran}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* NOMINAL */}
          <View style={styles.section}>
            <Text style={styles.inputLabel}>
              Nominal
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Rp5000"
              placeholderTextColor="#9AA1AC"
              keyboardType="numeric"
              value={nominal}
              onChangeText={setNominal}
            />
          </View>

          {/* DESKRIPSI */}
          <View style={styles.section}>
            <Text style={styles.inputLabel}>
              Deskripsi (opsional)
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Contoh: Beli makan siang"
              placeholderTextColor="#9AA1AC"
              value={deskripsi}
              onChangeText={setDeskripsi}
            />
          </View>

          {/* BAYAR DARI */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons
                name="wallet-outline"
                size={18}
                color="#B85C5C"
              />

              <Text style={styles.sectionTitle}>
                Bayar dari
              </Text>
            </View>

            <View style={styles.accountRow}>
              {akun.map((item) => (
                <Pressable
                  key={item.key}
                  style={[
                    styles.accountButton,
                    akunDipilih === item.key &&
                      styles.accountSelected,
                  ]}
                  onPress={() =>
                    setAkunDipilih(item.key)
                  }
                >
                  <Text
                    style={[
                      styles.accountText,
                      akunDipilih === item.key &&
                        styles.accountTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* SIMPAN */}
          <Pressable
            style={styles.saveButton}
            onPress={simpan}
          >
            <Text style={styles.saveText}>
              Simpan Pengeluaran
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },

  keyboardContainer: {
    flex: 1,
  },

  content: {
    padding: 20,
    paddingBottom: 100,
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

  accountRow: {
    flexDirection: 'row',
    gap: 10,
  },

  accountButton: {
    flex: 1,
    minHeight: 46,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E1E4E8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  accountSelected: {
    backgroundColor: '#F9EAEA',
    borderColor: '#E5BDBD',
  },

  accountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555D68',
  },

  accountTextSelected: {
    color: '#B85C5C',
    fontWeight: '700',
  },

  saveButton: {
    minHeight: 50,
    backgroundColor: '#B85C5C',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },

  saveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  suggestionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E1E4E8',
    overflow: 'hidden',
  },

  suggestionItem: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },

  suggestionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555D68',
  },
});