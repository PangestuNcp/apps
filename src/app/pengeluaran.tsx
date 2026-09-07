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
  const [akunDipilih, setAkunDipilih] =
    useState<AkunKey>('cash');

  function simpan() {
    const nilai = Number(nominal.replace(/\D/g, ''));

    if (!keterangan.trim()) {
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
        akun.find((item) => item.key === akunDipilih)?.label ??
        'akun';

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
       (tanggal, jenis, subjenis, keterangan, nominal)
       VALUES (?, ?, ?, ?, ?)`,
      [
        tanggal,
        'pengeluaran',
        akunDipilih,
        keterangan.trim(),
        nilai,
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
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
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

        <Text style={styles.label}>
          Keterangan
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Contoh: Makan siang"
          value={keterangan}
          onChangeText={setKeterangan}
        />

        <Text style={styles.label}>
          Nominal
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Contoh: 25000"
          keyboardType="numeric"
          value={nominal}
          onChangeText={setNominal}
        />

        <Text style={styles.label}>
          Bayar dari
        </Text>

        <View style={styles.accountList}>
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

        <Pressable
          style={styles.saveButton}
          onPress={simpan}
        >
          <Text style={styles.saveText}>
            Simpan Pengeluaran
          </Text>
        </Pressable>

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

  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 20,
  },

  accountList: {
    gap: 10,
    marginBottom: 25,
  },

  accountButton: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E1E4E8',
  },

  accountSelected: {
    backgroundColor: '#222',
    borderColor: '#222',
  },

  accountText: {
    fontSize: 15,
    fontWeight: '700',
  },

  accountTextSelected: {
    color: '#FFFFFF',
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