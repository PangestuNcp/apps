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

type Pengisian = {
id: number;
tanggal: string;
km: number;
liter: number;
nominal: number;
};

function rupiah(n: number) {
return `Rp${n.toLocaleString('id-ID')}`;
}

function angka(n: number, digit = 2) {
return n.toLocaleString('id-ID', {
maximumFractionDigits: digit,
});
}

function formatKM(km: number) {
  return km.toLocaleString('id-ID', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function formatKMDeskripsi(km: number) {
  return km.toLocaleString('id-ID', {
    maximumFractionDigits: 1,
  });
}

export default function MotorBensinScreen() {
const router = useRouter();

const [kmSekarang, setKmSekarang] = useState(0);
const [riwayat, setRiwayat] = useState<Pengisian[]>([]);

const [kmPengisian, setKmPengisian] = useState('');
const [liter, setLiter] = useState('');
const [nominal, setNominal] = useState('');

const [akunBayar, setAkunBayar] = useState<
'cash' | 'ovo' | 'seabank'

> ('cash');

const loadData = useCallback(() => {
const motor = db.getFirstSync<Motor>(`       SELECT km_sekarang
      FROM motor
      WHERE id = 1
    `);


if (motor) {
  setKmSekarang(motor.km_sekarang);
}

const data = db.getAllSync<Pengisian>(`
  SELECT
    id,
    tanggal,
    km,
    liter,
    nominal
  FROM bensin
  ORDER BY id DESC
`);

setRiwayat(data);


}, []);

useFocusEffect(
useCallback(() => {
loadData();
}, [loadData])
);

/*

* Konsumsi dihitung berdasarkan dua pengisian terakhir.
*
* Contoh:
* Pengisian pertama : KM 10.000
* Pengisian kedua   : KM 10.080
* Liter pengisian kedua = 2
*
* Jarak = 80 KM
* Konsumsi = 80 / 2 = 40 KM/liter
  */
  let konsumsiTerakhir: number | null = null;

if (riwayat.length >= 2) {
const terbaru = riwayat[0];
const sebelumnya = riwayat[1];


const jarak =
  terbaru.km - sebelumnya.km;

if (
  jarak > 0 &&
  terbaru.liter > 0
) {
  konsumsiTerakhir =
    jarak / terbaru.liter;
}


}

/*

* Rata-rata konsumsi seluruh pengisian.
*
* Pengisian pertama tidak dihitung karena
* belum mempunyai jarak dari pengisian sebelumnya.
  */
  const konsumsiValid: number[] = [];

for (
let i = 0;
i < riwayat.length - 1;
i++
) {
const sekarang = riwayat[i];
const sebelumnya = riwayat[i + 1];


const jarak =
  sekarang.km - sebelumnya.km;

if (
  jarak > 0 &&
  sekarang.liter > 0
) {
  const konsumsi =
    jarak / sekarang.liter;

  if (
    Number.isFinite(konsumsi) &&
    konsumsi > 0
  ) {
    konsumsiValid.push(konsumsi);
  }
}


}

const rataRata =
konsumsiValid.length > 0
? konsumsiValid.reduce(
(total, nilai) => total + nilai,
0
) / konsumsiValid.length
: null;

function simpanBensin() {
const kmBaru = Number(
kmPengisian.replace(',', '.')
);


const jumlahLiter = Number(
  liter.replace(',', '.')
);

const harga = Number(
  nominal.replace(/\D/g, '')
);

if (
  !kmPengisian ||
  !Number.isFinite(kmBaru) ||
  kmBaru <= 0
) {
  Alert.alert(
    'KM tidak valid',
    'Masukkan KM motor saat pengisian.'
  );
  return;
}

if (kmBaru < kmSekarang) {
  Alert.alert(
    'KM tidak valid',
    `KM pengisian tidak boleh lebih kecil dari KM motor saat ini (${formatKM(
      kmSekarang
    )} KM).`
  );
  return;
}

if (
  !jumlahLiter ||
  jumlahLiter <= 0
) {
  Alert.alert(
    'Jumlah liter salah',
    'Masukkan jumlah liter bensin.'
  );
  return;
}

if (!harga || harga <= 0) {
  Alert.alert(
    'Nominal salah',
    'Masukkan nominal pembelian bensin.'
  );
  return;
}

if (
  riwayat.length > 0 &&
  kmBaru < riwayat[0].km
) {
  Alert.alert(
    'KM tidak valid',
    'KM pengisian tidak boleh lebih kecil dari KM pengisian sebelumnya.'
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

const saldoAkun =
  saldo[akunBayar];

if (saldoAkun < harga) {
  Alert.alert(
    'Saldo tidak cukup',
    `Saldo ${
      akunBayar === 'cash'
        ? 'Cash'
        : akunBayar === 'ovo'
          ? 'OVO'
          : 'SeaBank'
    } tidak cukup untuk membayar bensin.`
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

  // Simpan pengisian bensin
  db.runSync(
    `
    INSERT INTO bensin
    (
      tanggal,
      km,
      liter,
      nominal
    )
    VALUES (?, ?, ?, ?)
    `,
    [
      tanggal,
      kmBaru,
      jumlahLiter,
      harga,
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
      'bensin',
      `Pembelian bensin - ${namaAkun}`,
      harga,
      `Pembelian bensin ${angka(jumlahLiter)} liter di KM ${formatKMDeskripsi(kmBaru)}`,
    ]
  );
});

setKmPengisian('');
setLiter('');
setNominal('');

Alert.alert(
  'Berhasil',
  `Pengisian bensin dicatat pada KM ${formatKM(
    kmBaru
  )}.`
);

loadData();


}

return ( <SafeAreaView style={styles.container}> <ScrollView
     contentContainerStyle={styles.content}
     showsVerticalScrollIndicator={false}
   >
{/* HEADER */} <View style={styles.header}>
<Pressable
onPress={() => router.back()}
hitSlop={10}
> <Text style={styles.back}>
‹ </Text> </Pressable>


      <View>
        <Text style={styles.title}>
          Bensin
        </Text>

        <Text style={styles.subtitle}>
          Catat penggunaan dan konsumsi bensin
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

    {/* KONSUMSI */}
    <View style={styles.consumptionSection}>
      <View style={styles.sectionHeader}>
        <Ionicons
          name="speedometer-outline"
          size={19}
          color="#B47732"
        />

        <Text style={styles.sectionTitle}>
          Konsumsi Bensin
        </Text>
      </View>

      <View style={styles.statRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>
            Terakhir
          </Text>

          <Text style={styles.statValue}>
            {konsumsiTerakhir !== null
              ? `${angka(
                  konsumsiTerakhir
                )} KM/L`
              : '-'}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>
            Rata-rata
          </Text>

          <Text style={styles.statValue}>
            {rataRata !== null
              ? `${angka(
                  rataRata
                )} KM/L`
              : '-'}
          </Text>
        </View>
      </View>

      {riwayat.length < 2 && (
        <Text style={styles.statsInfo}>
          Konsumsi akan dihitung setelah ada
          minimal dua kali pengisian.
        </Text>
      )}
    </View>

    {/* FORM */}
    <View style={styles.formSection}>
      <View style={styles.sectionHeader}>
        <Ionicons
          name="create-outline"
          size={19}
          color="#B47732"
        />

        <Text style={styles.sectionTitle}>
          Catat Pengisian
        </Text>
      </View>

      <Text style={styles.formInfo}>
        Masukkan KM motor saat pengisian bensin.
        {'\n'}
        KM akan menjadi KM motor terbaru.
      </Text>

      <Text style={styles.inputLabel}>
        KM saat pengisian
      </Text>

      <TextInput
        style={styles.input}
        placeholder={`Contoh: ${formatKM(
          kmSekarang
        )}`}
        placeholderTextColor="#9AA0A8"
        keyboardType="decimal-pad"
        value={kmPengisian}
        onChangeText={setKmPengisian}
      />

      <Text style={styles.inputLabel}>
        Jumlah liter
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Contoh: 2.5"
        placeholderTextColor="#9AA0A8"
        keyboardType="decimal-pad"
        value={liter}
        onChangeText={setLiter}
      />

      <Text style={styles.inputLabel}>
        Nominal pembelian
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Contoh: 25000"
        placeholderTextColor="#9AA0A8"
        keyboardType="numeric"
        value={nominal}
        onChangeText={setNominal}
      />

      <Text style={styles.inputLabel}>
        Bayar dari
      </Text>

      <View style={styles.accountRow}>
        {[
          {
            key: 'cash',
            label: 'Cash',
          },
          {
            key: 'ovo',
            label: 'OVO',
          },
          {
            key: 'seabank',
            label: 'SeaBank',
          },
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
        onPress={simpanBensin}
      >
        <Text style={styles.buttonText}>
          Simpan Pengisian
        </Text>
      </Pressable>
    </View>

    {/* RIWAYAT */}
    <View style={styles.historyHeader}>
      <View style={styles.sectionHeader}>
        <Ionicons
          name="time-outline"
          size={19}
          color="#B47732"
        />

        <Text style={styles.sectionTitle}>
          Riwayat Pengisian
        </Text>
      </View>
    </View>

    {riwayat.length === 0 ? (
      <View style={styles.emptyHistory}>
        <Text style={styles.emptyTitle}>
          Belum ada pengisian
        </Text>

        <Text style={styles.emptyText}>
          Riwayat pengisian bensin akan muncul
          di sini.
        </Text>
      </View>
    ) : (
      <View style={styles.historyList}>
        {riwayat.map((item, index) => {
          let konsumsi: number | null =
            null;

          if (
            index <
            riwayat.length - 1
          ) {
            const sebelumnya =
              riwayat[index + 1];

            const jarak =
              item.km -
              sebelumnya.km;

            if (
              jarak > 0 &&
              item.liter > 0
            ) {
              konsumsi =
                jarak / item.liter;
            }
          }

          return (
            <View
              key={item.id}
              style={styles.historyItem}
            >
              <View
                style={styles.historyTop}
              >
                <View>
                  <Text
                    style={
                      styles.historyTitle
                    }
                  >
                    Pengisian Bensin
                  </Text>

                  <Text
                    style={
                      styles.historyDate
                    }
                  >
                    {item.tanggal}
                  </Text>
                </View>

                <Text
                  style={
                    styles.historyKm
                  }
                >
                  KM {formatKM(item.km)}
                </Text>
              </View>

              <View
                style={styles.historyRow}
              >
                <Text
                  style={
                    styles.historyLabel
                  }
                >
                  Jumlah
                </Text>

                <Text
                  style={
                    styles.historyValue
                  }
                >
                  {angka(
                    item.liter,
                    2
                  )}{' '}
                  Liter
                </Text>
              </View>

              <View
                style={styles.historyRow}
              >
                <Text
                  style={
                    styles.historyLabel
                  }
                >
                  Harga
                </Text>

                <Text
                  style={
                    styles.historyPrice
                  }
                >
                  {rupiah(item.nominal)}
                </Text>
              </View>

              {konsumsi !== null && (
                <View
                  style={
                    styles.consumptionBox
                  }
                >
                  <Text
                    style={
                      styles.consumptionLabel
                    }
                  >
                    Konsumsi
                  </Text>

                  <Text
                    style={
                      styles.consumptionValue
                    }
                  >
                    {angka(
                      konsumsi
                    )}{' '}
                    KM/L
                  </Text>
                </View>
              )}
            </View>
          );
        })}
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

consumptionSection: {
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

statRow: {
flexDirection: 'row',
gap: 20,
},

statItem: {
flex: 1,
alignItems: 'center',
},

statLabel: {
fontSize: 11,
color: '#737A85',
textAlign: 'center',
},

statValue: {
fontSize: 16,
fontWeight: '800',
color: '#B47732',
marginTop: 4,
textAlign: 'center',
},

statsInfo: {
textAlign: 'center',
fontSize: 11,
color: '#8A929D',
lineHeight: 17,
marginTop: 14,
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
backgroundColor: '#FCF4E8',
borderColor: '#E8C99F',
},

accountButtonText: {
fontSize: 13,
fontWeight: '700',
color: '#68707D',
},

accountButtonTextActive: {
color: '#B47732',
},

button: {
backgroundColor: '#B47732',
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
paddingVertical: 15,
borderBottomWidth: 1,
borderBottomColor: '#ECEEF1',
},

historyTop: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'space-between',
marginBottom: 9,
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
fontSize: 12,
fontWeight: '800',
color: '#B47732',
},

historyRow: {
flexDirection: 'row',
justifyContent: 'space-between',
paddingVertical: 4,
},

historyLabel: {
fontSize: 11,
color: '#737A85',
},

historyValue: {
fontSize: 12,
fontWeight: '700',
color: '#30343A',
},

historyPrice: {
fontSize: 12,
fontWeight: '800',
color: '#30343A',
},

consumptionBox: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'space-between',
backgroundColor: '#FCF4E8',
borderRadius: 10,
paddingHorizontal: 11,
paddingVertical: 9,
marginTop: 8,
},

consumptionLabel: {
fontSize: 11,
color: '#8A6A45',
},

consumptionValue: {
fontSize: 12,
fontWeight: '800',
color: '#B47732',
},

emptyHistory: {
alignItems: 'center',
paddingVertical: 20,
},

emptyTitle: {
fontSize: 13,
fontWeight: '800',
color: '#30343A',
},

emptyText: {
fontSize: 11,
color: '#8A929D',
marginTop: 4,
textAlign: 'center',
},
});
