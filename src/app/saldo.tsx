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
            <Text style={styles.title}>Saldo</Text>
            <Text style={styles.subtitle}>
              Total aset saat ini
            </Text>
          </View>
        </View>

        {/* TOTAL ASET */}
        <View style={styles.totalSection}>
          <Text style={styles.totalValue}>
            {rupiah(totalAset)}
          </Text>
        </View>

        {/* SALDO UTAMA */}
        <View style={styles.accountList}>
          <View style={styles.accountRow}>
            <View style={styles.accountLeft}>
              <Ionicons
                name="cash-outline"
                size={20}
                color="#4E8A67"
              />

              <Text style={styles.accountName}>
                Cash
              </Text>
            </View>

            <Text style={styles.accountValue}>
              {rupiah(saldo.cash)}
            </Text>
          </View>

          <View style={styles.accountRow}>
            <View style={styles.accountLeft}>
              <Ionicons
                name="wallet-outline"
                size={20}
                color="#5B8A72"
              />

              <Text style={styles.accountName}>
                Dompet Grab
              </Text>
            </View>

            <Text
              style={[
                styles.accountValue,
                saldo.dompet_grab < 0 &&
                  styles.accountValueNegative,
              ]}
            >
              {rupiah(saldo.dompet_grab)}
            </Text>
          </View>

          <View style={styles.accountRow}>
            <View style={styles.accountLeft}>
              <Text style={styles.ovoLogo}>
                OVO
              </Text>

              <Text style={styles.accountName}>
                OVO
              </Text>
            </View>

            <Text style={styles.accountValue}>
              {rupiah(saldo.ovo)}
            </Text>
          </View>

          <View style={styles.accountRow}>
            <View style={styles.accountLeft}>
              <Ionicons
                name="business-outline"
                size={20}
                color="#5C7EA8"
              />

              <Text style={styles.accountName}>
                SeaBank
              </Text>
            </View>

            <Text style={styles.accountValue}>
              {rupiah(saldo.seabank)}
            </Text>
          </View>
        </View>

        {/* KREDIT GRAB */}
        <View style={styles.creditSection}>
          <Text style={styles.creditName}>
            Kredit Grab
          </Text>

          <Text style={styles.creditValue}>
            {rupiah(saldo.kredit_grab)}
          </Text>

          <Text style={styles.creditInfo}>
            Tidak termasuk dalam total aset
          </Text>
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },

  back: {
    fontSize: 42,
    lineHeight: 42,
    marginRight: 15,
    color: '#333',
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
  },

  subtitle: {
    marginTop: 2,
    color: '#68707D',
    fontSize: 12,
  },

  totalSection: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 20,
  },

  totalValue: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  accountList: {
    marginTop: 22,
  },

  accountRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  accountName: {
    marginLeft: 7,
    fontSize: 15,
    fontWeight: '600',
    color: '#252A31',
  },

  accountValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#252A31',
  },

  accountValueNegative: {
    color: '#C94C4C',
  },

  ovoLogo: {
    fontSize: 12,
    fontWeight: '800',
    color: '#735BA8',
  },

  creditSection: {
    marginTop: 32,
    marginHorizontal: -8,
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 14,
    backgroundColor: '#FCF5E9',
    borderRadius: 14,
  },

  creditName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#5D4B32',
  },

  creditValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '700',
    color: '#3D352B',
  },

  creditInfo: {
    marginTop: 3,
    fontSize: 11,
    color: '#8A7B67',
  },
});