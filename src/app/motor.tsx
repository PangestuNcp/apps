import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import db from '../database/database';

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

function formatKM(km: number) {
  return km.toLocaleString('id-ID', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export default function MotorScreen() {
  const router = useRouter();

  const [kmSekarang, setKmSekarang] = useState(0);
  const [oli, setOli] = useState<Oli | null>(null);

  const [bensinTerakhir, setBensinTerakhir] =
    useState<Bensin | null>(null);

  const [konsumsiTerakhir, setKonsumsiTerakhir] =
    useState<number | null>(null);

  const [rataRataBensin, setRataRataBensin] =
    useState<number | null>(null);

  const loadData = useCallback(() => {
    // =========================
    // DATA MOTOR
    // =========================

    const motor = db.getFirstSync<Motor>(`
      SELECT km_sekarang
      FROM motor
      WHERE id = 1
    `);

    if (motor) {
      setKmSekarang(motor.km_sekarang);
    }

    // =========================
    // DATA OLI
    // =========================

    const oliTerakhir = db.getFirstSync<Oli>(`
      SELECT
        km_penggantian,
        km_berikutnya
      FROM oli
      ORDER BY id DESC
      LIMIT 1
    `);

    setOli(oliTerakhir ?? null);

    // =========================
    // DATA BENSIN
    // =========================

    const bensin = db.getAllSync<Bensin>(`
      SELECT
        tanggal,
        km,
        liter,
        nominal
      FROM bensin
      ORDER BY id DESC
    `);

    setBensinTerakhir(
      bensin.length > 0
        ? bensin[0]
        : null
    );

    // =========================
    // HITUNG KONSUMSI
    // =========================

    let totalJarak = 0;
    let totalLiter = 0;

    let konsumsiTerakhirValue: number | null = null;

    for (let i = 0; i < bensin.length - 1; i++) {
      const terbaru = bensin[i];
      const sebelumnya = bensin[i + 1];

      const jarak =
        terbaru.km - sebelumnya.km;

      if (
        jarak > 0 &&
        terbaru.liter > 0
      ) {
        const konsumsi =
          jarak / terbaru.liter;

        // Pengisian paling baru
        if (i === 0) {
          konsumsiTerakhirValue = konsumsi;
        }

        totalJarak += jarak;
        totalLiter += terbaru.liter;
      }
    }

    setKonsumsiTerakhir(
      konsumsiTerakhirValue
    );

    setRataRataBensin(
      totalLiter > 0
        ? totalJarak / totalLiter
        : null
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // =========================
  // STATUS OLI
  // =========================

  const sisaOli = oli
    ? oli.km_berikutnya - kmSekarang
    : null;

  const oliSudahWaktunya =
    sisaOli !== null &&
    sisaOli <= 0;

  const oliMendekati =
    sisaOli !== null &&
    sisaOli > 0 &&
    sisaOli <= 300;

  // =========================
  // NAVIGASI
  // =========================

  function bukaKM() {
    router.push('/motor-km');
  }

  function bukaOli() {
    router.push('/motor-oli');
  }

  function bukaBensin() {
    router.push('/motor-bensin');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* =========================
            HEADER
        ========================= */}

        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
          >
            <Text style={styles.back}>
              ‹
            </Text>
          </Pressable>

          <View>
            <Text style={styles.title}>
              Motor
            </Text>

            <Text style={styles.subtitle}>
              Informasi dan pencatatan motor
            </Text>
          </View>
        </View>

        {/* =========================
            KM MOTOR
        ========================= */}

        <View style={styles.kmCard}>
          <Text style={styles.kmLabel}>
            KM MOTOR SEKARANG
          </Text>

          <Text style={styles.kmValue}>
            {formatKM(kmSekarang)} KM
          </Text>

          <Pressable
            style={styles.updateButton}
            onPress={bukaKM}
          >
            <Text style={styles.updateButtonText}>
              Update KM
            </Text>
          </Pressable>
        </View>

        {/* =========================
            OLI
        ========================= */}

        <Text style={styles.sectionTitle}>
          🛢️ Oli
        </Text>

        <View style={styles.card}>

          <View style={styles.row}>
            <Text style={styles.label}>
              Penggantian terakhir
            </Text>

            <Text style={styles.value}>
              {oli
                ? `KM ${formatKM(oli.km_penggantian)}`
                : 'Belum ada'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>
              Penggantian berikutnya
            </Text>

            <Text style={styles.value}>
              {oli
                ? `KM ${formatKM(oli.km_berikutnya)}`
                : 'Belum ada'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>
              Sisa KM
            </Text>

            <Text
              style={[
                styles.value,
                oliSudahWaktunya &&
                  styles.warningText,
                oliMendekati &&
                  styles.nearText,
              ]}
            >
              {sisaOli !== null
                ? sisaOli <= 0
                  ? 'Sudah waktunya'
                  : `${formatKM(sisaOli)} KM`
                : '-'}
            </Text>
          </View>

          <View
            style={[
              styles.status,
              oliSudahWaktunya &&
                styles.statusWarning,
              oliMendekati &&
                styles.statusNear,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                oliSudahWaktunya &&
                  styles.warningText,
                oliMendekati &&
                  styles.nearText,
              ]}
            >
              {oliSudahWaktunya
                ? '⚠️ Saatnya mengganti oli'
                : oliMendekati
                ? '⚠️ Oli sudah mendekati jadwal'
                : oli
                ? '✓ Kondisi oli masih aman'
                : 'Belum ada data oli'}
            </Text>
          </View>

        </View>

        {/* =========================
            BENSIN
        ========================= */}

        <Text style={styles.sectionTitle}>
          ⛽ Bensin
        </Text>

        <View style={styles.card}>

          <View style={styles.row}>
            <Text style={styles.label}>
              Konsumsi terakhir
            </Text>

            <Text style={styles.value}>
              {konsumsiTerakhir !== null
                ? `${konsumsiTerakhir.toLocaleString(
                    'id-ID',
                    {
                      maximumFractionDigits: 2,
                    }
                  )} KM/L`
                : '-'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>
              Rata-rata konsumsi
            </Text>

            <Text style={styles.value}>
              {rataRataBensin !== null
                ? `${rataRataBensin.toLocaleString(
                    'id-ID',
                    {
                      maximumFractionDigits: 2,
                    }
                  )} KM/L`
                : '-'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>
              Pengisian terakhir
            </Text>

            <Text style={styles.value}>
              {bensinTerakhir
                ? `${bensinTerakhir.liter.toLocaleString(
                    'id-ID'
                  )} Liter`
                : 'Belum ada'}
            </Text>
          </View>

          {bensinTerakhir && (
            <View style={styles.row}>
              <Text style={styles.label}>
                Nominal terakhir
              </Text>

              <Text style={styles.value}>
                Rp
                {bensinTerakhir.nominal.toLocaleString(
                  'id-ID'
                )}
              </Text>
            </View>
          )}

        </View>

        {/* =========================
            MENU MOTOR
        ========================= */}

        <Text style={styles.sectionTitle}>
          Menu Motor
        </Text>

        <View style={styles.menuList}>

          {/* UPDATE KM */}

          <Pressable
            style={styles.menuButton}
            onPress={bukaKM}
          >
            <Text style={styles.menuIcon}>
              📍
            </Text>

            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>
                Update KM
              </Text>

              <Text style={styles.menuDescription}>
                Catat kilometer motor saat ini
              </Text>
            </View>

            <Text style={styles.arrow}>
              ›
            </Text>
          </Pressable>

          {/* OLI */}

          <Pressable
            style={styles.menuButton}
            onPress={bukaOli}
          >
            <Text style={styles.menuIcon}>
              🛢️
            </Text>

            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>
                Oli Mesin + Gardan
              </Text>

              <Text style={styles.menuDescription}>
                Catat penggantian dan jadwal berikutnya
              </Text>
            </View>

            <Text style={styles.arrow}>
              ›
            </Text>
          </Pressable>

          {/* BENSIN */}

          <Pressable
            style={styles.menuButton}
            onPress={bukaBensin}
          >
            <Text style={styles.menuIcon}>
              ⛽
            </Text>

            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>
                Bensin
              </Text>

              <Text style={styles.menuDescription}>
                Catat pengisian dan hitung KM per liter
              </Text>
            </View>

            <Text style={styles.arrow}>
              ›
            </Text>
          </Pressable>

        </View>

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

  kmCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    marginBottom: 25,
    elevation: 3,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },

  kmLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#777',
  },

  kmValue: {
    fontSize: 36,
    fontWeight: '800',
    marginTop: 8,
  },

  updateButton: {
    marginTop: 18,
    backgroundColor: '#222',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },

  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 10,
    marginTop: 5,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
  },

  label: {
    fontSize: 13,
    color: '#737A85',
    flex: 1,
  },

  value: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },

  status: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },

  statusWarning: {
    backgroundColor: '#FFE9E6',
  },

  statusNear: {
    backgroundColor: '#FFF4D6',
  },

  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },

  warningText: {
    color: '#B42318',
  },

  nearText: {
    color: '#8A5A00',
  },

  menuList: {
    gap: 12,
  },

  menuButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },

  menuIcon: {
    fontSize: 27,
    width: 42,
  },

  menuText: {
    flex: 1,
  },

  menuTitle: {
    fontSize: 15,
    fontWeight: '800',
  },

  menuDescription: {
    marginTop: 4,
    fontSize: 12,
    color: '#737A85',
  },

  arrow: {
    fontSize: 28,
    color: '#8A919C',
  },
});