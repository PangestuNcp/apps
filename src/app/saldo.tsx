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

function rupiah(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`;
}

export default function SaldoScreen() {
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
            <Text style={styles.title}>Saldo</Text>
            <Text style={styles.subtitle}>
              Posisi saldo saat ini
            </Text>
          </View>
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>TOTAL ASET</Text>
          <Text style={styles.totalValue}>
            {rupiah(totalAset)}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.accountName}>Cash</Text>
          <Text style={styles.accountValue}>
            {rupiah(saldo.cash)}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.accountName}>Dompet Grab</Text>
          <Text
            style={[
              styles.accountValue,
              saldo.dompet_grab < 0 && styles.accountValueNegative,
            ]}
          >
            {rupiah(saldo.dompet_grab)}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.accountName}>OVO</Text>
          <Text style={styles.accountValue}>
            {rupiah(saldo.ovo)}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.accountName}>SeaBank</Text>
          <Text style={styles.accountValue}>
            {rupiah(saldo.seabank)}
          </Text>
        </View>

        <View style={styles.creditCard}>
          <Text style={styles.accountName}>
            Kredit Grab
          </Text>

          <Text style={styles.accountValue}>
            {rupiah(saldo.kredit_grab)}
          </Text>

          <Text style={styles.creditInfo}>
            Saldo kredit / internal
          </Text>
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

  totalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    marginBottom: 18,
    elevation: 3,
  },

  totalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#777',
  },

  totalValue: {
    marginTop: 8,
    fontSize: 32,
    fontWeight: '800',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },

  creditCard: {
    backgroundColor: '#FFF7E6',
    borderRadius: 18,
    padding: 20,
    marginTop: 8,
  },

  accountName: {
    fontSize: 16,
    fontWeight: '700',
  },

  accountValue: {
    fontSize: 16,
    fontWeight: '800',
  },

  accountValueNegative: {
    color: '#C94C4C',
  },

  creditInfo: {
    marginTop: 6,
    fontSize: 12,
    color: '#777',
  },
});