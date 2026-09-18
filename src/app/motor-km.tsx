import React, { useCallback, useState } from 'react';

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

import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import db from '../database/database';

type Motor = {
  km_sekarang: number;
  km_terakhir_update: number;
  tanggal_update_terakhir: string | null;
};

type RiwayatKM = {
  id: number;
  tanggal: string;
  km: number;
};

function parseKM(input: string): number {
  const value = input.trim().replace(',', '.');

  if (!value) {
    return 0;
  }

  // Format langsung dengan titik:
  // 33312.1 -> 33312.1
  if (value.includes('.')) {
    const km = Number(value);
    return Number.isFinite(km) ? km : 0;
  }

  // Format cepat:
  // 333121 -> 33312.1
  // 333129 -> 33312.9
  // 333130 -> 33313.0
  const digits = value.replace(/\D/g, '');

  if (!digits) {
    return 0;
  }

  // Angka sampai 5 digit dianggap KM biasa:
  // 33312 -> 33312.0
  if (digits.length >= 6) {
    const angkaUtama = digits.slice(0, -1);
    const desimal = digits.slice(-1);

    return Number(`${angkaUtama}.${desimal}`);
  }

  return Number(digits);
}

function formatKM(km: number): string {
  return km.toLocaleString('id-ID', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export default function MotorKmScreen() {
  const router = useRouter();

  const [motor, setMotor] = useState<Motor>({
    km_sekarang: 0,
    km_terakhir_update: 0,
    tanggal_update_terakhir: null,
  });

  const [riwayat, setRiwayat] = useState<RiwayatKM[]>([]);
  const [kmInput, setKmInput] = useState('');

  const loadData = useCallback(() => {
    const data = db.getFirstSync<Motor>(`
      SELECT
        km_sekarang,
        km_terakhir_update
      FROM motor
      WHERE id = 1
    `);

    if (data) {
      setMotor(data);
    }

    const history = db.getAllSync<RiwayatKM>(`
      SELECT
        id,
        tanggal,
        km
      FROM riwayat_km
      ORDER BY id DESC
      LIMIT 20
    `);

    setRiwayat(history);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  function simpanKM() {
    const km = parseKM(kmInput);

    if (!km || km <= 0) {
      Alert.alert(
        'KM tidak valid',
        'Masukkan angka KM yang benar.'
      );
      return;
    }

    if (km < motor.km_sekarang) {
      Alert.alert(
        'KM tidak valid',
        `KM baru tidak boleh lebih kecil dari KM sebelumnya (${formatKM(
          motor.km_sekarang
        )} KM).`
      );
      return;
    }

    const tanggal = new Date()
      .toISOString()
      .slice(0, 10);

    db.withTransactionSync(() => {
      db.runSync(
        `
        UPDATE motor
        SET
          km_sekarang = ?,
          km_terakhir_update = ?,
          tanggal_update_terakhir = ?
        WHERE id = 1
        `,
        [km, km, tanggal]
      );

      db.runSync(
        `
        INSERT INTO riwayat_km
        (tanggal, km)
        VALUES (?, ?)
        `,
        [tanggal, km]
      );
    });

    setKmInput('');

    Alert.alert(
      'Berhasil',
      `KM ${formatKM(km)} berhasil disimpan.`
    );

    loadData();
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
            hitSlop={10}
          >
            <Text style={styles.back}>‹</Text>
          </Pressable>

          <View>
            <Text style={styles.title}>
              Update KM
            </Text>

            <Text style={styles.subtitle}>
              Catat posisi KM motor
            </Text>
          </View>
        </View>

        {/* KM SAAT INI */}
        <View style={styles.currentSection}>
          <Text style={styles.currentLabel}>
            Kilometer motor saat ini
          </Text>

          <Text style={styles.currentKm}>
            {formatKM(motor.km_sekarang)} KM
          </Text>

          {motor.tanggal_update_terakhir && (
            <Text style={styles.date}>
              Update terakhir: {motor.tanggal_update_terakhir}
            </Text>
          )}
        </View>

        {/* FORM UPDATE */}
        <View style={styles.formSection}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="location-outline"
              size={19}
              color="#4E8A67"
            />

            <Text style={styles.sectionTitle}>
              Update Kilometer
            </Text>
          </View>

          <Text style={styles.inputLabel}>
            Masukkan KM terbaru
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Contoh: 333121"
            placeholderTextColor="#9AA0A8"
            keyboardType="numeric"
            value={kmInput}
            onChangeText={setKmInput}
          />

          <Text style={styles.inputInfo}>
            Bisa masukkan 333121 atau 33312.1
          </Text>

          <Pressable
            style={styles.button}
            onPress={simpanKM}
          >
            <Text style={styles.buttonText}>
              Simpan KM
            </Text>
          </Pressable>
        </View>

        {/* RIWAYAT */}
        <View style={styles.historyHeader}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="time-outline"
              size={19}
              color="#68707D"
            />

            <Text style={styles.historyTitle}>
              Riwayat KM
            </Text>
          </View>
        </View>

        {riwayat.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Belum ada riwayat KM.
            </Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {riwayat.map((item) => (
              <View
                key={item.id}
                style={styles.historyItem}
              >
                <View style={styles.historyLeft}>
                  <Text style={styles.historyKm}>
                    {formatKM(item.km)} KM
                  </Text>

                  <Text style={styles.historyDate}>
                    {item.tanggal}
                  </Text>
                </View>

                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#4E8A67"
                />
              </View>
            ))}
          </View>
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
    fontSize: 38,
    lineHeight: 38,
    marginRight: 12,
    color: '#333',
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
  },

  subtitle: {
    marginTop: 1,
    color: '#68707D',
    fontSize: 12,
  },

  currentSection: {
    alignItems: 'center',
    marginBottom: 30,
  },

  currentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#737A85',
  },

  currentKm: {
    fontSize: 30,
    fontWeight: '800',
    color: '#222',
    marginTop: 6,
  },

  date: {
    marginTop: 6,
    color: '#8A929D',
    fontSize: 11,
  },

  formSection: {
    marginBottom: 30,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#222',
    marginLeft: 7,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#30343A',
    marginBottom: 8,
  },

  input: {
    backgroundColor: '#F1F3F5',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 16,
    color: '#222',
  },

  inputInfo: {
    fontSize: 11,
    color: '#8A929D',
    marginTop: 7,
    marginBottom: 13,
  },

  button: {
    backgroundColor: '#4F7298',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  historyHeader: {
    marginBottom: 4,
  },

  historyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#222',
    marginLeft: 7,
  },

  historyList: {
    marginTop: 2,
  },

  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#ECEEF1',
  },

  historyLeft: {
    flex: 1,
  },

  historyKm: {
    fontSize: 14,
    fontWeight: '800',
    color: '#30343A',
  },

  historyDate: {
    fontSize: 11,
    color: '#8A929D',
    marginTop: 3,
  },

  empty: {
    alignItems: 'center',
    paddingVertical: 20,
  },

  emptyText: {
    color: '#8A929D',
    fontSize: 12,
  },
});