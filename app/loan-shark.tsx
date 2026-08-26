import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useGameStore } from '../src/store/gameStore';
import { ActiveLoan } from '../src/types';

const C = {
  pageBg: '#0f1220', cardBg: '#191c2a',
  border: '#252840',
  text: '#f0ede8', muted: '#9a958e',
  gold: '#e6b254',
  amber: '#d4753a',
  red: '#c43820',
  redBg: '#2a130f', redBorder: '#c4382044',
  greenBg: '#0d2016', greenBorder: '#4ec46e44',
  green: '#4ec46e',
};

const LOAN_OPTIONS: { size: 'small' | 'medium' | 'large'; label: string; principal: number }[] = [
  { size: 'small',  label: '$2M',  principal: 2_000_000 },
  { size: 'medium', label: '$5M',  principal: 5_000_000 },
  { size: 'large',  label: '$10M', principal: 10_000_000 },
];

function fmt(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs}`;
}

function loanInterestRate(loansTaken: number): number {
  return 0.67 + Math.min(2, loansTaken) * 0.10;
}

function loanOwed(principal: number, rate: number): number {
  return Math.round(principal * (1 + rate));
}

function fmtDue(loan: ActiveLoan): string {
  return `Week ${loan.dueWeek}, Year ${loan.dueYear}`;
}

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.statRow}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

export default function LoanSharkScreen() {
  const router = useRouter();
  const { network, activeLoan, loansTaken, takeLoan, repayLoan } = useGameStore();
  const cashOnHand = network.cashOnHand;
  const rate = loanInterestRate(loansTaken);
  const rateLabel = `${Math.round(rate * 100)}%`;

  // inline confirmation state — null = none pending, else the selected option
  const [pending, setPending] = useState<'small' | 'medium' | 'large' | null>(null);
  const [confirmRepay, setConfirmRepay] = useState(false);

  function handleSelectLoan(size: 'small' | 'medium' | 'large') {
    setPending(size);
    setConfirmRepay(false);
  }

  function handleConfirmLoan() {
    if (!pending) return;
    takeLoan(pending);
    setPending(null);
  }

  function handleRepayPress() {
    if (!activeLoan) return;
    if (cashOnHand < activeLoan.amountOwed) {
      // not enough cash — just show the UI state, no action
      return;
    }
    setConfirmRepay(true);
  }

  function handleConfirmRepay() {
    repayLoan();
    setConfirmRepay(false);
  }

  const overdue = !!activeLoan && activeLoan.weeksOverdue > 0;
  const canPay = !!activeLoan && cashOnHand >= activeLoan.amountOwed;

  return (
    <SafeAreaView edges={['top']} style={s.container}>
      <LinearGradient colors={['#131829', '#0f1220', '#0a0d18']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>LOAN SHARK</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Flavour header */}
        <View style={s.flavourCard}>
          <Text style={s.flavourTitle}>🦈  No questions asked.</Text>
          <Text style={s.flavourSub}>
            Private financing for studios that need a lifeline. Borrow now, pay back in a year — or face the consequences.
          </Text>
        </View>

        {activeLoan ? (
          /* ── Active loan card ── */
          <>
            <Text style={s.sectionLabel}>ACTIVE LOAN</Text>
            <View style={[s.card, overdue && s.cardOverdue]}>
              {overdue && (
                <View style={s.overdueBanner}>
                  <Text style={s.overdueBannerText}>⚠  OVERDUE  ×{activeLoan.weeksOverdue} week{activeLoan.weeksOverdue !== 1 ? 's' : ''}</Text>
                  <Text style={s.overdueSubText}>Balance growing 20% per week until paid.</Text>
                </View>
              )}
              <StatRow label="Borrowed"       value={fmt(activeLoan.principal)} />
              <View style={s.divider} />
              <StatRow label="Amount Owed"    value={fmt(activeLoan.amountOwed)} color={overdue ? C.red : C.amber} />
              <View style={s.divider} />
              <StatRow label="Due Date"       value={fmtDue(activeLoan)} color={overdue ? C.red : C.muted} />
              <View style={s.divider} />
              <StatRow label="Cash on Hand"   value={fmt(cashOnHand)} color={canPay ? C.green : C.red} />
              <View style={{ height: 16 }} />
              {confirmRepay ? (
                <View style={s.confirmRow}>
                  <Text style={s.confirmText}>Pay {fmt(activeLoan.amountOwed)} and clear the debt?</Text>
                  <View style={s.confirmBtns}>
                    <TouchableOpacity style={s.confirmCancel} onPress={() => setConfirmRepay(false)} activeOpacity={0.8}>
                      <Text style={s.confirmCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.confirmGo} onPress={handleConfirmRepay} activeOpacity={0.8}>
                      <Text style={s.confirmGoText}>Pay Off</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[s.repayBtn, !canPay && s.repayBtnDisabled]}
                  onPress={handleRepayPress}
                  activeOpacity={canPay ? 0.8 : 1}
                >
                  <Text style={[s.repayBtnText, !canPay && { color: C.muted }]}>
                    {canPay ? `PAY OFF — ${fmt(activeLoan.amountOwed)}` : `NEED ${fmt(activeLoan.amountOwed - cashOnHand)} MORE`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : (
          /* ── No active loan — offer options ── */
          <>
            <Text style={s.sectionLabel}>BORROW</Text>
            <View style={s.card}>
              <Text style={s.termsHeading}>Terms</Text>
              <Text style={s.termsBody}>
                {loansTaken === 0
                  ? `${rateLabel} flat interest. One year repayment window. Miss it and the balance compounds 20% weekly.`
                  : `Loan #${loansTaken + 1} — rate bumped to ${rateLabel}. Same one-year window. 20% weekly compounding if late.`}
              </Text>
              <View style={{ height: 16 }} />
              <View style={s.optionsRow}>
                {LOAN_OPTIONS.map(opt => {
                  const selected = pending === opt.size;
                  return (
                    <TouchableOpacity
                      key={opt.size}
                      style={[s.optionBtn, selected && s.optionBtnSelected]}
                      onPress={() => handleSelectLoan(opt.size)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.optionAmount, selected && { color: C.text }]}>{opt.label}</Text>
                      <Text style={s.optionOwedLabel}>you owe</Text>
                      <Text style={[s.optionOwed, selected && { color: C.amber }]}>{fmt(loanOwed(opt.principal, rate))}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Inline confirm panel */}
              {pending && (() => {
                const opt = LOAN_OPTIONS.find(o => o.size === pending)!;
                const owed = loanOwed(opt.principal, rate);
                return (
                  <View style={s.confirmRow}>
                    <Text style={s.confirmText}>
                      Borrow {fmt(opt.principal)}, pay back {fmt(owed)} within one year.{'\n'}Miss the deadline and the balance grows 20% per week.
                    </Text>
                    <View style={s.confirmBtns}>
                      <TouchableOpacity style={s.confirmCancel} onPress={() => setPending(null)} activeOpacity={0.8}>
                        <Text style={s.confirmCancelText}>Walk Away</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.confirmGo} onPress={handleConfirmLoan} activeOpacity={0.8}>
                        <Text style={s.confirmGoText}>Take {fmt(opt.principal)}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })()}
            </View>

            <Text style={s.sectionLabel}>CONSEQUENCES</Text>
            <View style={s.card}>
              <Text style={s.consequenceLine}>• Miss the deadline → balance grows 20% every week</Text>
              <Text style={s.consequenceLine}>• First week overdue → −5 prestige, news story breaks</Text>
              <Text style={s.consequenceLine}>• 6 weeks overdue → funds seized, −10 prestige</Text>
              <Text style={s.consequenceLine}>• Each new loan carries a higher interest rate</Text>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: C.pageBg },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:          { width: 70 },
  backText:         { color: C.gold, fontFamily: 'Manrope_600SemiBold', fontSize: 14 },
  headerTitle:      { color: C.gold, fontFamily: 'BebasNeue_400Regular', fontSize: 28, letterSpacing: 1 },
  scroll:           { flex: 1 },
  scrollContent:    { padding: 16 },

  sectionLabel:     { color: C.muted, fontFamily: 'Manrope_700Bold', fontSize: 11, letterSpacing: 1.5, marginBottom: 10, marginTop: 20 },

  flavourCard:      { backgroundColor: C.cardBg, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16 },
  flavourTitle:     { color: C.text, fontFamily: 'Manrope_700Bold', fontSize: 16, marginBottom: 6 },
  flavourSub:       { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 20 },

  card:             { backgroundColor: C.cardBg, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16 },
  cardOverdue:      { borderColor: C.red, borderWidth: 1.5 },

  overdueBanner:    { backgroundColor: C.redBg, borderRadius: 8, borderWidth: 1, borderColor: C.redBorder, padding: 12, marginBottom: 14 },
  overdueBannerText:{ color: C.red, fontFamily: 'Manrope_700Bold', fontSize: 13, marginBottom: 4 },
  overdueSubText:   { color: '#c4382099', fontFamily: 'Manrope_400Regular', fontSize: 12 },

  statRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11 },
  statLabel:        { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 14 },
  statValue:        { color: C.text, fontFamily: 'Manrope_600SemiBold', fontSize: 14 },
  divider:          { height: 1, backgroundColor: C.border },

  repayBtn:         { backgroundColor: '#1a2a1a', borderRadius: 10, borderWidth: 1, borderColor: C.green, paddingVertical: 14, alignItems: 'center' },
  repayBtnDisabled: { backgroundColor: C.cardBg, borderColor: C.border },
  repayBtnText:     { color: C.green, fontFamily: 'Manrope_700Bold', fontSize: 13, letterSpacing: 0.5 },

  termsHeading:     { color: C.text, fontFamily: 'Manrope_700Bold', fontSize: 14, marginBottom: 6 },
  termsBody:        { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 20 },

  optionsRow:       { flexDirection: 'row', gap: 10 },
  optionBtn:        { flex: 1, backgroundColor: '#1a1d2e', borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingVertical: 14, alignItems: 'center' },
  optionBtnSelected:{ borderColor: C.gold, backgroundColor: '#22200e' },
  optionAmount:     { color: C.gold, fontFamily: 'BebasNeue_400Regular', fontSize: 26, letterSpacing: 1 },
  optionOwedLabel:  { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 10, marginTop: 4, letterSpacing: 0.5 },
  optionOwed:       { color: C.amber, fontFamily: 'Manrope_600SemiBold', fontSize: 12, marginTop: 2 },

  confirmRow:       { marginTop: 14, backgroundColor: '#111420', borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 14 },
  confirmText:      { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 20, marginBottom: 12 },
  confirmBtns:      { flexDirection: 'row', gap: 10 },
  confirmCancel:    { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: C.border, paddingVertical: 10, alignItems: 'center' },
  confirmCancelText:{ color: C.muted, fontFamily: 'Manrope_600SemiBold', fontSize: 13 },
  confirmGo:        { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: C.amber, backgroundColor: '#2a1e0a', paddingVertical: 10, alignItems: 'center' },
  confirmGoText:    { color: C.amber, fontFamily: 'Manrope_700Bold', fontSize: 13 },

  consequenceLine:  { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 22 },
});
