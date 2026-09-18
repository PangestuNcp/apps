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
};

type OliTerakhir = {
tanggal: string;
km_penggantian: number;
nominal: number;
interval_km: number;
km_berikutnya: number;
};

type RiwayatOli = {
id: number;
tanggal: string;
km_penggantian: number;
nominal: number;
interval_km: number;
km_berikutnya: number;
};

const INTERVAL_DEFAULT = 2000;

function rupiah(n: number) {
return `Rp${n.toLocaleString('id-ID')}`;
}

function formatKM(km: number) {
return km.toLocaleString('id-ID', {
minimumFractionDigits: 1,
maximumFractionDigits: 1,
});
}

export default function MotorOliScreen() {
const router = useRouter();

const [kmSekarang, setKmSekarang] = useState(0);
const [oliTerakhir, setOliTerakhir] =
useState<OliTerakhir | null>(null);
const [riwayat, setRiwayat] =
useState<RiwayatOli[]>([]);

const [nominal, setNominal] = useState('');
const [kmPenggantian, setKmPenggantian] = useState('');

const [akunBayar, setAkunBayar] =
useState<'cash' | 'ovo' | 'seabank'>('cash');

const [interval, setInterval] = useState(
String(INTERVAL_DEFAULT)
);

const loadData = useCallback(() => {
const motor = db.getFirstSync<Motor>(`       SELECT km_sekarang
      FROM motor
      WHERE id = 1
    `);


if (motor) {
  setKmSekarang(motor.km_sekarang);
}

const terakhir =
  db.getFirstSync<OliTerakhir>(`
    SELECT
      tanggal,
      km_penggantian,
      nominal,
      interval_km,
      km_berikutnya
    FROM oli
    ORDER BY id DESC
    LIMIT 1
  `);

setOliTerakhir(terakhir ?? null);

const history =
  db.getAllSync<RiwayatOli>(`
    SELECT
      id,
      tanggal,
      km_penggantian,
      nominal,
      interval_km,
      km_berikutnya
    FROM oli
    ORDER BY id DESC
  `);

setRiwayat(history);


}, []);

useFocusEffect(
useCallback(() => {
loadData();
}, [loadData])
);

function simpanOli() {
const kmBaru = Number(
kmPenggantian.replace(',', '.')
);


const harga = Number(
  nominal.replace(/\D/g, '')
);

const intervalKm = Number(
  interval.replace(/\D/g, '')
);

if (
  !kmPenggantian ||
  !Number.isFinite(kmBaru) ||
  kmBaru <= 0
) {
  Alert.alert(
    'KM tidak valid',
    'Masukkan KM motor saat penggantian oli.'
  );
  return;
}

if (kmBaru < kmSekarang) {
  Alert.alert(
    'KM tidak valid',
    `KM penggantian tidak boleh lebih kecil dari KM motor saat ini (${formatKM(
      kmSekarang
    )} KM).`
  );
  return;
}

if (!harga || harga <= 0) {
  Alert.alert(
    'Nominal salah',
    'Masukkan harga pembelian oli.'
  );
  return;
}

if (!intervalKm || intervalKm <= 0) {
  Alert.alert(
    'Interval salah',
    'Masukkan interval penggantian oli dalam KM.'
  );
  return;
}

const saldo = db.getFirstSync<{
  cash: number;
  ovo: number;
  seabank: number;
}>(`
  SELECT cash, ovo, seabank
  FROM saldo
  WHERE id = 1
`);

if (!saldo) {
  Alert.alert(
    'Saldo tidak ditemukan',
    'Data saldo belum tersedia.'
  );
  return;
}

const saldoAkun = saldo[akunBayar];

if (saldoAkun < harga) {
  Alert.alert(
    'Saldo tidak cukup',
    `Saldo ${
      akunBayar === 'cash'
        ? 'Cash'
        : akunBayar === 'ovo'
          ? 'OVO'
          : 'SeaBank'
    } tidak cukup untuk membayar oli.`
  );
  return;
}

const namaAkun =
  akunBayar === 'cash'
    ? 'Cash'
    : akunBayar === 'ovo'
      ? 'OVO'
      : 'SeaBank';

const tanggal = new Date()
  .toISOString()
  .slice(0, 10);

const kmBerikutnya =
  kmBaru + intervalKm;

db.withTransactionSync(() => {
  // Kurangi saldo akun pembayaran
  db.runSync(
    `
    UPDATE saldo
    SET ${akunBayar} = ${akunBayar} - ?
    WHERE id = 1
    `,
    [harga]
  );

  // Update KM motor
  db.runSync(
    `
    UPDATE motor
    SET
      km_sekarang = ?,
      km_terakhir_update = ?,
      tanggal_update_terakhir = ?
    WHERE id = 1
    `,
    [kmBaru, kmBaru, tanggal]
  );

  // Simpan riwayat KM
  db.runSync(
    `
    INSERT INTO riwayat_km
    (
      tanggal,
      km
    )
    VALUES (?, ?)
    `,
    [tanggal, kmBaru]
  );

  // Simpan penggantian oli
  db.runSync(
    `
    INSERT INTO oli
    (
      tanggal,
      km_penggantian,
      nominal,
      interval_km,
      km_berikutnya
    )
    VALUES (?, ?, ?, ?, ?)
    `,
    [
      tanggal,
      kmBaru,
      harga,
      intervalKm,
      kmBerikutnya,
    ]
  );

  // Simpan transaksi pengeluaran
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
      'oli',
      `Pembelian oli - ${namaAkun}`,
      harga,
      `Penggantian oli mesin + gardan di KM ${formatKM(kmBaru)}`,
    ]
  );
});

setKmPenggantian('');
setNominal('');

Alert.alert(
  'Berhasil',
  `Penggantian oli mesin + gardan dicatat pada KM ${formatKM(
    kmBaru
  )}.\n\nPenggantian berikutnya: KM ${formatKM(
    kmBerikutnya
  )}.`
);

loadData();


}

const sisaKm = oliTerakhir
? oliTerakhir.km_berikutnya - kmSekarang
: null;

const sudahWaktunya =
sisaKm !== null &&
sisaKm <= 0;

const mendekati =
sisaKm !== null &&
sisaKm > 0 &&
sisaKm <= 300;

return ( <SafeAreaView style={styles.container}> <ScrollView
     contentContainerStyle={styles.content}
     showsVerticalScrollIndicator={false}
   >
{/* HEADER */} <View style={styles.header}>
<Pressable
onPress={() => router.back()}
hitSlop={10}
> <Text style={styles.back}>‹</Text> </Pressable>


      <View>
        <Text style={styles.title}>
          Oli Mesin + Gardan
        </Text>

        <Text style={styles.subtitle}>
          Catat penggantian dan jadwal oli
        </Text>
      </View>
    </View>

    {/* KM MOTOR */}
    <View style={styles.currentSection}>
      <Text style={styles.currentLabel}>
        Kilometer motor saat ini
      </Text>

      <Text style={styles.currentKm}>
        {formatKM(kmSekarang)} KM
      </Text>
    </View>

    {/* STATUS OLI */}
    <View style={styles.statusSection}>
      <View style={styles.sectionHeader}>
        <Ionicons
          name="water-outline"
          size={19}
          color="#4F7298"
        />

        <Text style={styles.sectionTitle}>
          Status Oli
        </Text>
      </View>

      {oliTerakhir ? (
        <View style={styles.statusInfo}>
          <View style={styles.statusColumn}>
            <Text style={styles.infoLabel}>
              Penggantian terakhir
            </Text>

            <Text style={styles.infoValue}>
              KM {formatKM(
                oliTerakhir.km_penggantian
              )}
            </Text>
          </View>

          <View style={styles.statusColumn}>
            <Text style={styles.infoLabel}>
              Penggantian berikutnya
            </Text>

            <Text style={styles.infoValue}>
              KM {formatKM(
                oliTerakhir.km_berikutnya
              )}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.emptyInfo}>
          Belum ada data penggantian oli.
        </Text>
      )}

      {sudahWaktunya && (
        <View style={styles.warningBox}>
          <Ionicons
            name="warning-outline"
            size={18}
            color="#B42318"
          />

          <View style={styles.messageContent}>
            <Text style={styles.warningTitle}>
              Perlu ganti oli
            </Text>

            <Text style={styles.warningText}>
              Jadwal penggantian oli sudah tercapai.
            </Text>
          </View>
        </View>
      )}

      {mendekati && (
        <View style={styles.nearBox}>
          <Ionicons
            name="alert-circle-outline"
            size={18}
            color="#8A5A00"
          />

          <View style={styles.messageContent}>
            <Text style={styles.nearTitle}>
              Segera ganti oli
            </Text>

            <Text style={styles.nearText}>
              Sisa sekitar {formatKM(sisaKm!)} KM.
            </Text>
          </View>
        </View>
      )}

      {!sudahWaktunya &&
        !mendekati &&
        sisaKm !== null && (
          <View style={styles.normalBox}>
            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color="#4F7298"
            />

            <Text style={styles.normalText}>
              Sisa {formatKM(sisaKm)} KM
            </Text>
          </View>
        )}
    </View>

    {/* FORM */}
    <View style={styles.formSection}>
      <View style={styles.sectionHeader}>
        <Ionicons
          name="create-outline"
          size={19}
          color="#4F7298"
        />

        <Text style={styles.sectionTitle}>
          Catat Penggantian Oli
        </Text>
      </View>

      <Text style={styles.formInfo}>
        Masukkan KM motor saat penggantian oli.
        {'\n'}
        KM tersebut akan menjadi KM motor terbaru.
      </Text>

      <Text style={styles.inputLabel}>
        KM saat penggantian
      </Text>

      <TextInput
        style={styles.input}
        placeholder={`Contoh: ${formatKM(kmSekarang)}`}
        placeholderTextColor="#9AA0A8"
        keyboardType="decimal-pad"
        value={kmPenggantian}
        onChangeText={setKmPenggantian}
      />

      <Text style={styles.inputLabel}>
        Harga oli
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Contoh: 75000"
        placeholderTextColor="#9AA0A8"
        keyboardType="numeric"
        value={nominal}
        onChangeText={setNominal}
      />

      <Text style={styles.inputLabel}>
        Interval penggantian (KM)
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Contoh: 2000"
        placeholderTextColor="#9AA0A8"
        keyboardType="numeric"
        value={interval}
        onChangeText={setInterval}
      />

      <Text style={styles.inputLabel}>
        Bayar dari
      </Text>

      <View style={styles.accountRow}>
        {[
          { key: 'cash', label: 'Cash' },
          { key: 'ovo', label: 'OVO' },
          { key: 'seabank', label: 'SeaBank' },
        ].map((akun) => {
          const aktif =
            akunBayar === akun.key;

          return (
            <Pressable
              key={akun.key}
              style={[
                styles.accountButton,
                aktif &&
                  styles.accountButtonActive,
              ]}
              onPress={() =>
                setAkunBayar(
                  akun.key as
                    | 'cash'
                    | 'ovo'
                    | 'seabank'
                )
              }
            >
              <Text
                style={[
                  styles.accountButtonText,
                  aktif &&
                    styles.accountButtonTextActive,
                ]}
              >
                {akun.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={styles.button}
        onPress={simpanOli}
      >
        <Text style={styles.buttonText}>
          Simpan Penggantian Oli
        </Text>
      </Pressable>
    </View>

    {/* RIWAYAT */}
    <View style={styles.historyHeader}>
      <View style={styles.sectionHeader}>
        <Ionicons
          name="time-outline"
          size={19}
          color="#4F7298"
        />

        <Text style={styles.sectionTitle}>
          Riwayat Oli
        </Text>
      </View>
    </View>

    {riwayat.length === 0 ? (
      <View style={styles.emptyHistory}>
        <Text style={styles.emptyText}>
          Belum ada riwayat penggantian oli.
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
              <Text style={styles.historyTitle}>
                Oli mesin + gardan
              </Text>

              <Text style={styles.historyDate}>
                {item.tanggal}
              </Text>

              <Text style={styles.historyKm}>
                Diganti pada KM{' '}
                {formatKM(item.km_penggantian)}
              </Text>
            </View>

            <View style={styles.historyRight}>
              <Text style={styles.historyPrice}>
                {rupiah(item.nominal)}
              </Text>

              <Text style={styles.historyNext}>
                Berikutnya KM{' '}
                {formatKM(item.km_berikutnya)}
              </Text>
            </View>
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

statusSection: {
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

statusInfo: {
flexDirection: 'row',
gap: 20,
},

statusColumn: {
flex: 1,
alignItems: 'center',
},

infoLabel: {
fontSize: 11,
color: '#737A85',
textAlign: 'center',
},

infoValue: {
fontSize: 14,
fontWeight: '800',
color: '#4F7298',
marginTop: 4,
textAlign: 'center',
},

emptyInfo: {
textAlign: 'center',
fontSize: 12,
color: '#8A929D',
},

warningBox: {
flexDirection: 'row',
alignItems: 'center',
backgroundColor: '#FCF0F0',
borderRadius: 12,
padding: 12,
marginTop: 14,
},

warningTitle: {
fontSize: 13,
fontWeight: '800',
color: '#B42318',
},

warningText: {
fontSize: 11,
color: '#8B2C25',
marginTop: 2,
},

nearBox: {
flexDirection: 'row',
alignItems: 'center',
backgroundColor: '#FCF7E8',
borderRadius: 12,
padding: 12,
marginTop: 14,
},

nearTitle: {
fontSize: 13,
fontWeight: '800',
color: '#8A5A00',
},

nearText: {
fontSize: 11,
color: '#795200',
marginTop: 2,
},

normalBox: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'center',
backgroundColor: '#F2F6FC',
borderRadius: 12,
padding: 11,
marginTop: 14,
},

normalText: {
fontSize: 12,
fontWeight: '700',
color: '#4F7298',
marginLeft: 6,
},

messageContent: {
marginLeft: 9,
flex: 1,
},

formSection: {
marginBottom: 30,
},

formInfo: {
textAlign: 'center',
fontSize: 11,
color: '#8A929D',
lineHeight: 17,
marginBottom: 18,
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
marginBottom: 15,
},

accountRow: {
flexDirection: 'row',
gap: 9,
marginBottom: 18,
},

accountButton: {
flex: 1,
backgroundColor: '#F1F3F5',
borderRadius: 12,
paddingVertical: 13,
alignItems: 'center',
borderWidth: 1,
borderColor: '#E1E3E6',
},

accountButtonActive: {
backgroundColor: '#E3EDF7',
borderColor: '#9FBEDB',
},

accountButtonText: {
fontSize: 13,
fontWeight: '700',
color: '#68707D',
},

accountButtonTextActive: {
color: '#4F7298',
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

historyList: {
marginTop: 2,
},

historyItem: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'space-between',
paddingVertical: 14,
borderBottomWidth: 1,
borderBottomColor: '#ECEEF1',
},

historyLeft: {
flex: 1,
paddingRight: 10,
},

historyRight: {
alignItems: 'flex-end',
maxWidth: 130,
},

historyTitle: {
fontSize: 13,
fontWeight: '800',
color: '#30343A',
},

historyDate: {
fontSize: 10,
color: '#8A929D',
marginTop: 3,
},

historyKm: {
fontSize: 11,
color: '#68707D',
marginTop: 5,
},

historyPrice: {
fontSize: 13,
fontWeight: '800',
color: '#4F7298',
},

historyNext: {
fontSize: 10,
color: '#8A929D',
marginTop: 3,
textAlign: 'right',
},

emptyHistory: {
alignItems: 'center',
paddingVertical: 20,
},

emptyText: {
color: '#8A929D',
fontSize: 12,
},
});
