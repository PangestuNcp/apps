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
import { Ionicons } from '@expo/vector-icons';
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
const motor = db.getFirstSync<Motor>(`       SELECT km_sekarang
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
  bensin.length > 0 ? bensin[0] : null
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

return ( <SafeAreaView style={styles.container}> <ScrollView
     contentContainerStyle={styles.content}
     showsVerticalScrollIndicator={false}
   >
{/* HEADER */}
<View style={styles.header}>
<Pressable
onPress={() => router.back()}
hitSlop={10}
> <Text style={styles.back}>‹</Text> </Pressable>

```
      <View>
        <Text style={styles.title}>
          Motor
        </Text>

        <Text style={styles.subtitle}>
          Informasi dan pencatatan motor
        </Text>
      </View>
    </View>

    {/* HEADER */}
    <View style={styles.kmSection}>
      <Text style={styles.kmLabel}>
        Kilometer motor saat ini
      </Text>

      <Text style={styles.kmValue}>
        {formatKM(kmSekarang)} KM
      </Text>
    </View>

    {/* STATUS OLI */}
    <View style={styles.infoRow}>
      {/* OLI */}
      <View style={styles.infoColumn}>
        <View style={styles.infoHeader}>
          <Ionicons
            name="water-outline"
            size={18}
            color="#68707D"
          />

          <Text style={styles.infoTitle}>
            Oli
          </Text>
        </View>

        <Text style={styles.infoLabel}>
          Sisa KM
        </Text>

        <Text
          style={[
            styles.infoValue,
            oliSudahWaktunya && styles.warningText,
            oliMendekati && styles.nearText,
          ]}
        >
          {sisaOli !== null
            ? sisaOli <= 0
              ? 'Sudah waktunya'
              : `${formatKM(sisaOli)} KM`
            : '-'}
        </Text>

        <Text style={styles.infoLabel}>
          Penggantian berikutnya
        </Text>

        <Text style={styles.infoValue}>
          {oli
            ? `KM ${formatKM(oli.km_berikutnya)}`
            : '-'}
        </Text>
      </View>

      {/* BENSIN */}
      <View style={styles.infoColumn}>
        <View style={styles.infoHeader}>
          <Ionicons
            name="speedometer-outline"
            size={18}
            color="#68707D"
          />

          <Text style={styles.infoTitle}>
            Bensin
          </Text>
        </View>

        <Text style={styles.infoLabel}>
          Pengisian terakhir
        </Text>

        <Text style={styles.infoValue}>
          {bensinTerakhir
            ? `${bensinTerakhir.liter.toLocaleString(
                'id-ID'
              )} Liter`
            : '-'}
        </Text>

        <Text style={styles.infoLabel}>
          Konsumsi terakhir
        </Text>

        <Text style={styles.infoValue}>
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
    </View>

    {/* CATATAN */}
    <Text style={styles.menuSectionTitle}>
      Menu Motor
    </Text>

    <View style={styles.menuGrid}>
      {/* UPDATE KM */}
      <Pressable
        style={[
          styles.menuCard,
          styles.menuCardGreen,
        ]}
        onPress={bukaKM}
      >
        <Ionicons
          name="location-outline"
          size={28}
          color="#4E8A67"
          style={styles.menuIcon}
        />

        <Text style={styles.menuTitle}>
          Update KM
        </Text>
      </Pressable>

      {/* OLI */}
      <Pressable
        style={[
          styles.menuCard,
          styles.menuCardBlue,
        ]}
        onPress={bukaOli}
      >
        <Ionicons
          name="water-outline"
          size={28}
          color="#4F7298"
          style={styles.menuIcon}
        />

        <Text style={styles.menuTitle}>
          Oli Mesin +
        </Text>

        <Text style={styles.menuTitle}>
          Gardan
        </Text>
      </Pressable>

      {/* BENSIN */}
      <Pressable
        style={[
          styles.menuCard,
          styles.menuCardOrange,
        ]}
        onPress={bukaBensin}
      >
        <Ionicons
          name="speedometer-outline"
          size={28}
          color="#B47732"
          style={styles.menuIcon}
        />

        <Text style={styles.menuTitle}>
          Bensin
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
backgroundColor: '#F8F9FB',
},

content: {
padding: 20,
paddingBottom: 40,
},

// =========================
// HEADER
// =========================
header: {
flexDirection: 'row',
alignItems: 'center',
marginBottom: 22,
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

// =========================
// KM
// =========================
kmSection: {
alignItems: 'center',
marginTop: 4,
marginBottom: 28,
},

kmLabel: {
fontSize: 13,
fontWeight: '600',
color: '#737A85',
},

kmValue: {
fontSize: 30,
fontWeight: '800',
color: '#222',
marginTop: 6,
},

// =========================
// INFO OLI & BENSIN
// =========================
infoRow: {
  flexDirection: 'row',
  gap: 24,
  marginBottom: 30,
},

infoColumn: {
  flex: 1,
  alignItems: 'center',
},

infoHeader: {
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 8,
},

infoTitle: {
  fontSize: 15,
  fontWeight: '800',
  color: '#222',
  marginTop: 3,
},

infoLabel: {
  fontSize: 11,
  color: '#737A85',
  marginTop: 4,
  textAlign: 'center',
},

infoValue: {
  fontSize: 13,
  fontWeight: '700',
  color: '#30343A',
  marginTop: 2,
  marginBottom: 7,
  textAlign: 'center',
},

warningText: {
color: '#B42318',
},

nearText: {
color: '#8A5A00',
},

// =========================
// MENU
// =========================
menuSectionTitle: {
fontSize: 16,
fontWeight: '800',
color: '#222',
marginBottom: 12,
},

menuGrid: {
flexDirection: 'row',
gap: 10,
},

menuCard: {
flex: 1,
height: 125,
borderRadius: 18,
alignItems: 'center',
justifyContent: 'center',
paddingHorizontal: 8,
},

menuCardGreen: {
backgroundColor: '#F0F9F5',
},

menuCardBlue: {
backgroundColor: '#F2F6FC',
},

menuCardOrange: {
backgroundColor: '#FCF4E8',
},

menuIcon: {
  marginBottom: 10,
},

menuTitle: {
fontSize: 13,
fontWeight: '800',
color: '#30343A',
textAlign: 'center',
lineHeight: 17,
},
});
