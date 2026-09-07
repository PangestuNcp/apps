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

  // Jika menggunakan titik/koma:
  // 33312.1 -> 33312.1
  if (value.includes('.')) {
    const km = Number(value);

    return Number.isFinite(km) ? km : 0;
  }

  // Format cepat:
  // 333121 -> 33312.1
  // 333129 -> 33312.9
  // 333130 -> 33313.0
  //
  // Angka sampai 5 digit tetap dianggap KM biasa:
  // 33312 -> 33312.0
  const digits = value.replace(/\D/g, '');

  if (!digits) {
    return 0;
  }

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
        km_terakhir_update,
        tanggal_update_terakhir
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
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹</Text>
          </Pressable>

          <View>
            <Text style={styles.title}>
              Kilometer
            </Text>

            <Text style={styles.subtitle}>
              Catat posisi KM motor
            </Text>
          </View>
        </View>

        <View style={styles.currentCard}>
          <Text style={styles.label}>
            KM SAAT INI
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

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            Update KM
          </Text>

          <Text style={styles.inputInfo}>
            Bisa masukkan 333121 atau 33312.1
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Contoh: 333121"
            keyboardType="numeric"
            value={kmInput}
            onChangeText={setKmInput}
          />

          <Pressable
            style={styles.button}
            onPress={simpanKM}
          >
            <Text style={styles.buttonText}>
              Simpan KM
            </Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>
          Riwayat KM
        </Text>

        {riwayat.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Belum ada riwayat KM.
            </Text>
          </View>
        ) : (
          riwayat.map((item) => (
            <View
              key={item.id}
              style={styles.historyCard}
            >
              <View>
                <Text style={styles.historyKm}>
                  {formatKM(item.km)} KM
                </Text>

                <Text style={styles.historyDate}>
                  {item.tanggal}
                </Text>
              </View>
            </View>
          ))
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
    marginBottom: 25,
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

  currentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    marginBottom: 18,
    elevation: 3,
  },

  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#777',
  },

  currentKm: {
    marginTop: 8,
    fontSize: 34,
    fontWeight: '800',
  },

  date: {
    marginTop: 8,
    color: '#888',
    fontSize: 12,
  },

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
  },

  formTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 5,
  },

  inputInfo: {
    color: '#888',
    fontSize: 12,
    marginBottom: 12,
  },

  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
  },

  button: {
    backgroundColor: '#222',
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },

  empty: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 25,
    alignItems: 'center',
  },

  emptyText: {
    color: '#888',
  },

  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 17,
    marginBottom: 10,
    elevation: 1,
  },

  historyKm: {
    fontSize: 16,
    fontWeight: '800',
  },

  historyDate: {
    marginTop: 5,
    fontSize: 12,
    color: '#888',
  },
});