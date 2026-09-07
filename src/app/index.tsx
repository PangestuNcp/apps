import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.title}>SALDOKU</Text>
        <Text style={styles.subtitle}>
          Keuangan & informasi motor
        </Text>
      </View>

      <View style={styles.menuContainer}>

        <Pressable
          style={({ pressed }) => [
            styles.menuCard,
            styles.keuanganCard,
            pressed && styles.pressed,
          ]}
          onPress={() => router.push('/keuangan')}
        >
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>💰</Text>
          </View>

          <View style={styles.menuText}>
            <Text style={styles.menuTitle}>KEUANGAN</Text>
            <Text style={styles.menuDescription}>
              Pendapatan, pengeluaran, saldo,
              transfer dan ringkasan
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.menuCard,
            styles.motorCard,
            pressed && styles.pressed,
          ]}
          onPress={() => router.push('/motor')}
        >
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>🏍️</Text>
          </View>

          <View style={styles.menuText}>
            <Text style={styles.menuTitle}>MOTOR</Text>
            <Text style={styles.menuDescription}>
              KM motor, oli, bensin dan
              informasi kendaraan
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </Pressable>

      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Saldoku
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  header: {
    paddingHorizontal: 24,
    paddingTop: 35,
    paddingBottom: 25,
  },

  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 1,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: '#68707D',
  },

  menuContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },

  menuCard: {
    minHeight: 150,
    borderRadius: 24,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },

  keuanganCard: {
    backgroundColor: '#FFFFFF',
  },

  motorCard: {
    backgroundColor: '#FFFFFF',
  },

  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },

  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
  },

  icon: {
    fontSize: 32,
  },

  menuText: {
    flex: 1,
    marginLeft: 18,
  },

  menuTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  menuDescription: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19,
    color: '#68707D',
    maxWidth: 220,
  },

  arrow: {
    fontSize: 32,
    color: '#8A919C',
    marginLeft: 8,
  },

  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },

  footerText: {
    fontSize: 12,
    color: '#9AA1AA',
  },
});