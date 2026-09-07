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

type Saldo = {
  cash: number;
  dompet_grab: number;
  ovo: number;
  seabank: number;
  kredit_grab: number;
};

function formatRupiah(nominal: number) {
  return `Rp${nominal.toLocaleString('id-ID')}`;
}

export default function KeuanganScreen() {
  const router = useRouter();

  const [saldo, setSaldo] = useState<Saldo>({
    cash: 0,
    dompet_grab: 0,
    ovo: 0,
    seabank: 0,
    kredit_grab: 0,
  });

  const loadSaldo = useCallback(() => {
    const data = db.getFirstSync<Saldo>(`
      SELECT
        cash,
        dompet_grab,
        ovo,
        seabank,
        kredit_grab
      FROM saldo
      WHERE id = 1
    `);

    if (data) {
      setSaldo(data);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSaldo();
    }, [loadSaldo])
  );

  const totalAset =
    saldo.cash +
    saldo.dompet_grab +
    saldo.ovo +
    saldo.seabank;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹</Text>
          </Pressable>

          <View>
            <Text style={styles.title}>Keuangan</Text>
            <Text style={styles.subtitle}>
              Kelola seluruh keuangan Anda
            </Text>
          </View>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>TOTAL ASET</Text>

          <Text style={styles.balance}>
            {formatRupiah(totalAset)}
          </Text>

          <Text style={styles.balanceInfo}>
            Cash + Dompet Grab + OVO + SeaBank
          </Text>
        </View>

        <View style={styles.grid}>

          <Pressable
            style={styles.menu}
            onPress={() => router.push('/saldo')}
          >
            <Text style={styles.menuIcon}>SAL</Text>
            <Text style={styles.menuTitle}>Saldo</Text>
            <Text style={styles.menuDescription}>
              Lihat seluruh saldo
            </Text>
          </Pressable>

          <Pressable
            style={styles.menu}
            onPress={() => router.push('/pendapatan')}
          >
            <Text style={styles.menuIcon}>+</Text>
            <Text style={styles.menuTitle}>Pendapatan</Text>
            <Text style={styles.menuDescription}>
              Catat pendapatan
            </Text>
          </Pressable>

          <Pressable
            style={styles.menu}
            onPress={() => router.push('/pengeluaran')}
          >
            <Text style={styles.menuIcon}>-</Text>
            <Text style={styles.menuTitle}>Pengeluaran</Text>
            <Text style={styles.menuDescription}>
              Catat pengeluaran
            </Text>
          </Pressable>

          <Pressable
            style={styles.menu}
            onPress={() => router.push('/transfer')}
          >
            <Text style={styles.menuIcon}>TRF</Text>
            <Text style={styles.menuTitle}>Transfer</Text>
            <Text style={styles.menuDescription}>
              Transfer antar akun
            </Text>
          </Pressable>

          <Pressable
            style={styles.menu}
            onPress={() => router.push('/kredit-grab')}
          >
            <Text style={styles.menuIcon}>KRG</Text>

            <Text style={styles.menuTitle}>
              Kredit Grab
            </Text>

            <Text style={styles.menuDescription}>
              Kelola saldo Kredit Grab
            </Text>
          </Pressable>

          <Pressable
            style={styles.menu}
            onPress={() => router.push('/riwayat')}
          >
            <Text style={styles.menuIcon}>HIS</Text>
            <Text style={styles.menuTitle}>Riwayat</Text>
            <Text style={styles.menuDescription}>
              Lihat transaksi
            </Text>
          </Pressable>

          <Pressable
            style={styles.menu}
            onPress={() => router.push('/ringkasan')}
          >
            <Text style={styles.menuIcon}>RNG</Text>
            <Text style={styles.menuTitle}>Ringkasan</Text>
            <Text style={styles.menuDescription}>
              Ringkasan bulanan
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

  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    marginBottom: 20,
    elevation: 3,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },

  balanceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#777',
  },

  balance: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: 8,
  },

  balanceInfo: {
    marginTop: 6,
    color: '#8A919C',
    fontSize: 13,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },

  menu: {
    width: '47%',
    minHeight: 145,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    elevation: 2,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },

  menuIcon: {
    fontSize: 20,
    fontWeight: '800',
  },

  menuTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '800',
  },

  menuDescription: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 17,
    color: '#737A85',
  },
});