import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import db, { initDatabase } from '../database/database';

type Saldo = {
  cash: number;
  dompet_grab: number;
  ovo: number;
  seabank: number;
  kredit_grab: number;
};

type NamaAkun =
  | 'cash'
  | 'dompet_grab'
  | 'ovo'
  | 'seabank'
  | 'kredit_grab';

type DataAkun = {
  key: NamaAkun;
  nama: string;
};

const daftarAkun: DataAkun[] = [
  { key: 'cash', nama: 'Cash' },
  { key: 'dompet_grab', nama: 'Dompet Grab' },
  { key: 'ovo', nama: 'OVO' },
  { key: 'seabank', nama: 'SeaBank' },
  { key: 'kredit_grab', nama: 'Kredit Grab' },
];

function formatRupiah(nominal: number) {
  const angka = Math.abs(nominal);

  return `Rp${angka.toLocaleString('id-ID')}`;
}

export default function AuditAset() {
  const [saldo, setSaldo] = useState<Saldo>({
    cash: 0,
    dompet_grab: 0,
    ovo: 0,
    seabank: 0,
    kredit_grab: 0,
  });

  const [aktual, setAktual] = useState<Record<NamaAkun, string>>({
    cash: '',
    dompet_grab: '',
    ovo: '',
    seabank: '',
    kredit_grab: '',
  });

  const [sudahAudit, setSudahAudit] = useState(false);

  useEffect(() => {
    initDatabase();
    loadSaldo();
  }, []);

  function loadSaldo() {
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
  }

  function ubahAktual(akun: NamaAkun, value: string) {
    const angka = value.replace(/\D/g, '');

    setAktual((prev) => ({
      ...prev,
      [akun]: angka,
    }));

    setSudahAudit(false);
  }

  function nilaiAktual(akun: NamaAkun) {
    return Number(aktual[akun] || 0);
  }

  function hitungSelisih(akun: NamaAkun) {
    return nilaiAktual(akun) - saldo[akun];
  }

  function jalankanAudit() {
    setSudahAudit(true);
  }

  const totalAset =
    saldo.cash +
    saldo.dompet_grab +
    saldo.ovo +
    saldo.seabank;

  const totalAktual =
    nilaiAktual('cash') +
    nilaiAktual('dompet_grab') +
    nilaiAktual('ovo') +
    nilaiAktual('seabank');

  const totalSelisih = totalAktual - totalAset;

  function renderStatus(akun: NamaAkun) {
    const selisih = hitungSelisih(akun);

    if (!sudahAudit) {
      return null;
    }

    if (selisih === 0) {
      return (
        <View style={styles.statusRow}>
          <Ionicons
            name="checkmark-circle-outline"
            size={18}
            color="#4E8A67"
          />
          <Text style={styles.statusSama}>Sesuai</Text>
        </View>
      );
    }

    if (selisih > 0) {
      return (
        <View style={styles.statusRow}>
          <Ionicons
            name="arrow-up-circle-outline"
            size={18}
            color="#4E8A67"
          />
          <Text style={styles.statusLebih}>
            Lebih {formatRupiah(selisih)}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.statusRow}>
        <Ionicons
          name="warning-outline"
          size={18}
          color="#B85C5C"
        />
        <Text style={styles.statusKurang}>
          Kurang {formatRupiah(selisih)}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Audit Aset</Text>
        <Text style={styles.subtitle}>
          Cocokkan saldo Saldoku dengan saldo sebenarnya
        </Text>
      </View>

      {/* INFO */}
      <View style={styles.infoRow}>
        <Ionicons
          name="information-circle-outline"
          size={19}
          color="#7B838E"
        />

        <Text style={styles.infoText}>
          Masukkan jumlah uang yang benar-benar tersedia di
          setiap akun. Audit ini tidak mengubah saldo Saldoku.
        </Text>
      </View>

      {/* DAFTAR AKUN */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Saldo sebenarnya</Text>

        {daftarAkun.map((akun) => {
          const selisih = hitungSelisih(akun.key);

          return (
            <View key={akun.key} style={styles.accountRow}>
              <View style={styles.accountLeft}>
                <Text style={styles.accountName}>
                  {akun.nama}
                </Text>

                <Text style={styles.saldokuText}>
                  Saldoku {formatRupiah(saldo[akun.key])}
                </Text>

                {sudahAudit && (
                  <View style={styles.statusContainer}>
                    {renderStatus(akun.key)}
                  </View>
                )}
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={
                    aktual[akun.key]
                      ? Number(aktual[akun.key]).toLocaleString('id-ID')
                      : ''
                  }
                  onChangeText={(value) =>
                    ubahAktual(akun.key, value)
                  }
                  keyboardType="numeric"
                  placeholder="Rp0"
                  placeholderTextColor="#A3A9B2"
                />

                {sudahAudit && selisih !== 0 && (
                  <Text
                    style={[
                      styles.selisihText,
                      selisih > 0
                        ? styles.selisihPlus
                        : styles.selisihMinus,
                    ]}
                  >
                    {selisih > 0 ? '+' : '-'}
                    {formatRupiah(selisih)}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* TOTAL */}
      <View style={styles.totalSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Aset</Text>

          <Text style={styles.totalValue}>
            {formatRupiah(totalAset)}
          </Text>
        </View>

        <Text style={styles.totalNote}>
          Tidak termasuk Kredit Grab
        </Text>

        {sudahAudit && (
          <View style={styles.auditTotal}>
            <View style={styles.totalComparison}>
              <Text style={styles.comparisonLabel}>
                Saldo sebenarnya
              </Text>

              <Text style={styles.comparisonValue}>
                {formatRupiah(totalAktual)}
              </Text>
            </View>

            <View style={styles.totalComparison}>
              <Text style={styles.comparisonLabel}>
                Selisih
              </Text>

              <Text
                style={[
                  styles.comparisonValue,
                  totalSelisih > 0
                    ? styles.selisihPlus
                    : totalSelisih < 0
                    ? styles.selisihMinus
                    : styles.selisihSama,
                ]}
              >
                {totalSelisih > 0 ? '+' : totalSelisih < 0 ? '-' : ''}
                {formatRupiah(totalSelisih)}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* BUTTON */}
      <TouchableOpacity
        style={styles.auditButton}
        onPress={jalankanAudit}
        activeOpacity={0.8}
      >
        <Text style={styles.auditButtonText}>
          {sudahAudit ? 'Perbarui Audit' : 'Jalankan Audit'}
        </Text>
      </TouchableOpacity>

      {/* CATATAN */}
      <Text style={styles.footerNote}>
        Audit hanya untuk pengecekan. Saldo Saldoku tidak akan
        berubah.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },

  header: {
    marginBottom: 22,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#20252B',
  },

  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#7B838E',
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginBottom: 26,
  },

  infoText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 19,
    color: '#727A85',
  },

  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#3D444D',
  },

  accountRow: {
    minHeight: 82,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#ECEEF1',
  },

  accountLeft: {
    flex: 1,
    paddingRight: 12,
  },

  accountName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#30363D',
  },

  saldokuText: {
    marginTop: 3,
    fontSize: 11.5,
    color: '#8A929D',
  },

  statusContainer: {
    marginTop: 5,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  statusSama: {
    fontSize: 11.5,
    color: '#4E8A67',
    fontWeight: '600',
  },

  statusLebih: {
    fontSize: 11.5,
    color: '#4E8A67',
    fontWeight: '600',
  },

  statusKurang: {
    fontSize: 11.5,
    color: '#B85C5C',
    fontWeight: '600',
  },

  inputContainer: {
    width: 125,
    alignItems: 'flex-end',
  },

  input: {
    width: 125,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 11,
    backgroundColor: '#F1F3F5',
    fontSize: 13,
    color: '#30363D',
    textAlign: 'right',
  },

  selisihText: {
    marginTop: 4,
    fontSize: 10.5,
    fontWeight: '600',
  },

  selisihPlus: {
    color: '#4E8A67',
  },

  selisihMinus: {
    color: '#B85C5C',
  },

  selisihSama: {
    color: '#7B838E',
  },

  totalSection: {
    marginTop: 2,
    marginBottom: 25,
  },

  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#30363D',
  },

  totalValue: {
    fontSize: 19,
    fontWeight: '700',
    color: '#20252B',
  },

  totalNote: {
    marginTop: 3,
    fontSize: 11,
    color: '#8A929D',
  },

  auditTotal: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#ECEEF1',
    gap: 10,
  },

  totalComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  comparisonLabel: {
    fontSize: 12,
    color: '#7B838E',
  },

  comparisonValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#30363D',
  },

  auditButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#D6A83F',
    alignItems: 'center',
    justifyContent: 'center',
  },

  auditButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  footerNote: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 17,
    color: '#9AA1AA',
  },
});