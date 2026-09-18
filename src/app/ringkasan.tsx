import React, { useCallback, useState } from 'react';
import {
SafeAreaView,
View,
Text,
StyleSheet,
Pressable,
ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import db from '../database/database';

type Ringkasan = {
pendapatan: number;
pengeluaran: number;
jumlah_pendapatan: number;
jumlah_pengeluaran: number;
jumlah_transfer: number;
};

function rupiah(n: number) {
return `Rp${n.toLocaleString('id-ID')}`;
}

export default function RingkasanScreen() {
const router = useRouter();

const [data, setData] = useState<Ringkasan>({
pendapatan: 0,
pengeluaran: 0,
jumlah_pendapatan: 0,
jumlah_pengeluaran: 0,
jumlah_transfer: 0,
});

const [bulan, setBulan] = useState('');

const loadData = useCallback(() => {
const sekarang = new Date();


const tahun = sekarang.getFullYear();

const nomorBulan = String(
  sekarang.getMonth() + 1
).padStart(2, '0');

const bulanSekarang = `${tahun}-${nomorBulan}`;

const hasil = db.getFirstSync<{
  pendapatan: number | null;
  pengeluaran: number | null;
  jumlah_pendapatan: number;
  jumlah_pengeluaran: number;
  jumlah_transfer: number;
}>(
  `
  SELECT
    COALESCE(
      SUM(
        CASE
          WHEN jenis = 'pendapatan'
          THEN nominal
          ELSE 0
        END
      ),
      0
    ) AS pendapatan,

    COALESCE(
      SUM(
        CASE
          WHEN jenis = 'pengeluaran'
          THEN nominal
          ELSE 0
        END
      ),
      0
    ) AS pengeluaran,

    COUNT(
      CASE
        WHEN jenis = 'pendapatan'
        THEN 1
      END
    ) AS jumlah_pendapatan,

    COUNT(
      CASE
        WHEN jenis = 'pengeluaran'
        THEN 1
      END
    ) AS jumlah_pengeluaran,

    COUNT(
      CASE
        WHEN jenis = 'transfer'
        THEN 1
      END
    ) AS jumlah_transfer

  FROM transaksi

  WHERE tanggal LIKE ?
  `,
  [`${bulanSekarang}%`]
);

setData({
  pendapatan: hasil?.pendapatan ?? 0,
  pengeluaran: hasil?.pengeluaran ?? 0,
  jumlah_pendapatan: hasil?.jumlah_pendapatan ?? 0,
  jumlah_pengeluaran: hasil?.jumlah_pengeluaran ?? 0,
  jumlah_transfer: hasil?.jumlah_transfer ?? 0,
});

const namaBulan = sekarang.toLocaleDateString(
  'id-ID',
  {
    month: 'long',
    year: 'numeric',
  }
);

setBulan(namaBulan);


}, []);

useFocusEffect(
useCallback(() => {
loadData();
}, [loadData])
);

// Pendapatan bersih
const selisih =
data.pendapatan - data.pengeluaran;

// Warna pendapatan bersih
const warnaBersih =
selisih > 0
? '#4E8A67'
: selisih < 0
? '#B85C5C'
: '#343A42';

return (
  <SafeAreaView style={styles.container}>
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      >
        {/* HEADER */} 
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} 
        style={styles.backButton}
        >
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <View>
          <Text style={styles.title}>
            Ringkasan
          </Text>

          <Text style={styles.subtitle}>
            Ringkasan keuangan bulan {bulan}
          </Text>
        </View>
      </View>

      {/* PENDAPATAN BERSIH */}
      <View style={styles.netSection}>
        <Text style={styles.netLabel}>
          Pendapatan bersih
        </Text>

        <Text
          style={[
            styles.netValue,
            {
              color: warnaBersih,
            },
          ]}
        >
          {selisih > 0 ? '+' : ''}
          {rupiah(selisih)}
        </Text>
      </View>

      {/* RINGKASAN PENDAPATAN */}
      <View style={styles.summarySection}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryLeft}>
            <Ionicons
              name="arrow-down-circle-outline"
              size={21}
              color="#4E8A67"
            />

            <View>
              <Text style={styles.summaryTitle}>
                Pendapatan
              </Text>

              <Text style={styles.summaryCount}>
                {data.jumlah_pendapatan} transaksi
              </Text>
            </View>
          </View>

          <Text style={styles.income}>
            +{rupiah(data.pendapatan)}
          </Text>
        </View>

        {/* RINGKASAN PENGELUARAN */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryLeft}>
            <Ionicons
              name="arrow-up-circle-outline"
              size={21}
              color="#B85C5C"
            />

            <View>
              <Text style={styles.summaryTitle}>
                Pengeluaran
              </Text>

              <Text style={styles.summaryCount}>
                {data.jumlah_pengeluaran} transaksi
              </Text>
            </View>
          </View>

          <Text style={styles.expense}>
            -{rupiah(data.pengeluaran)}
          </Text>
        </View>

        {/* RINGKASAN TRANSFER */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryLeft}>
            <Ionicons
              name="swap-horizontal-outline"
              size={21}
              color="#5B7FA5"
            />

            <View>
              <Text style={styles.summaryTitle}>
                Transfer
              </Text>

              <Text style={styles.summaryCount}>
                Perpindahan antar akun
              </Text>
            </View>
          </View>

          <Text style={styles.transfer}>
            {data.jumlah_transfer} transaksi
          </Text>
        </View>
      </View>

      {/* CATATAN */}
      <View style={styles.noteSection}>
        <Text style={styles.noteTitle}>
          Catatan
        </Text>

        <Text style={styles.noteText}>
          Transfer tidak dihitung sebagai pendapatan
          atau pengeluaran karena hanya memindahkan
          saldo antar akun.
        </Text>
      </View>
    </ScrollView>
  </SafeAreaView>
);

}

const styles = StyleSheet.create({
/* CONTAINER */

container: {
flex: 1,
backgroundColor: '#F8F9FB',
},

content: {
padding: 20,
paddingBottom: 40,
},

/* HEADER */

header: {
flexDirection: 'row',
alignItems: 'center',
marginBottom: 30,
},

backButton: {
marginRight: 12,
paddingRight: 2,
},

back: {
fontSize: 38,
lineHeight: 38,
color: '#333B45',
},

title: {
fontSize: 22,
fontWeight: '700',
color: '#20252B',
},

subtitle: {
marginTop: 3,
fontSize: 12,
color: '#7B838E',
},

/* PENDAPATAN BERSIH */

netSection: {
alignItems: 'center',
marginBottom: 34,
},

netLabel: {
fontSize: 13,
fontWeight: '600',
color: '#7B838E',
},

netValue: {
marginTop: 7,
fontSize: 30,
fontWeight: '700',
},

/* RINGKASAN */

summarySection: {
marginBottom: 28,
},

summaryRow: {
minHeight: 62,
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'space-between',
},

summaryLeft: {
flexDirection: 'row',
alignItems: 'center',
gap: 9,
flex: 1,
},

summaryTitle: {
fontSize: 14,
fontWeight: '600',
color: '#343A42',
},

summaryCount: {
marginTop: 3,
fontSize: 11,
color: '#969DA6',
},

/* WARNA PENDAPATAN */

income: {
fontSize: 14,
fontWeight: '700',
color: '#4E8A67',
},

/* WARNA PENGELUARAN */

expense: {
fontSize: 14,
fontWeight: '700',
color: '#B85C5C',
},

/* WARNA TRANSFER */

transfer: {
fontSize: 12,
fontWeight: '600',
color: '#5B7FA5',
},

/* CATATAN */

noteSection: {
paddingTop: 4,
},

noteTitle: {
fontSize: 13,
fontWeight: '700',
color: '#343A42',
},

noteText: {
marginTop: 7,
fontSize: 12,
lineHeight: 18,
color: '#8A919A',
},
});
