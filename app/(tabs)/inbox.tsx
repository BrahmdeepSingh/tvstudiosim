import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Image,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../../src/store/gameStore';
import { InboxItem } from '../../src/types';
import { EMMY_CATEGORY_LABELS } from '../../src/constants/game';

const C = {
  pageBg: '#0f1220', cardBg: '#191c2a', cardBg2: '#1d2035',
  border: '#252840', borderGold: '#e6b25430',
  text: '#f0ede8', muted: '#9a958e', mutedMid: '#6b6880',
  gold: '#e6b254', goldDim: '#e6b25420',
  green: '#4ec46e', amber: '#d4753a', red: '#c43820', blue: '#5b8dee', teal: '#3db8a8',
};

function FilmRibbonAmbient() {
  return (
    <Image
      source={require('../../assets/tvbg.png')}
      style={[StyleSheet.absoluteFill, { tintColor: C.gold, opacity: 0.06 }]}
      resizeMode="repeat"
      pointerEvents="none"
    />
  );
}

function fmt(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs}`;
}

const TYPE_META: Record<string, { label: string; color: string }> = {
  'pitch':               { label: 'PITCH',    color: C.gold },
  'streaming-offer':     { label: 'STREAMING', color: C.teal },
  'emmy-nominations':    { label: 'EMMYS',    color: C.amber },
  'emmy-ceremony':       { label: 'EMMYS',    color: C.amber },
  'revenue-share-payout':{ label: 'PAYOUT',   color: C.green },
  'news':                { label: 'NEWS',      color: C.blue },
};

// ─── Detail views ─────────────────────────────────────────────────────────────

function PitchDetail({ item, onDone }: { item: InboxItem; onDone: () => void }) {
  const router = useRouter();
  const { pitches, talent, greenlightPitch, passPitch, markInboxRead } = useGameStore();
  const pitch = pitches.find(p => p.id === item.refID);
  const showrunner = pitch ? talent.find(t => t.id === pitch.showrunnerID) : null;

  if (!pitch) {
    return (
      <View style={d.emptyNote}>
        <Text style={d.emptyNoteText}>This pitch has expired or been acted on.</Text>
      </View>
    );
  }

  const expired = pitch.passed || pitch.greenlitByPlayer;

  function handleGreenlight() {
    const ok = greenlightPitch(pitch!.id);
    if (ok) {
      markInboxRead(item.id);
      onDone();
    }
  }

  function handlePass() {
    passPitch(pitch!.id);
    markInboxRead(item.id);
    onDone();
  }

  return (
    <View>
      <View style={d.pitchGenreRow}>
        <View style={d.tag}><Text style={d.tagText}>{pitch.genre.toUpperCase()}</Text></View>
        <View style={d.tag}><Text style={d.tagText}>{pitch.theme.toUpperCase()}</Text></View>
        <View style={d.tag}><Text style={d.tagText}>{pitch.proposedEpisodeCount} EPS</Text></View>
      </View>

      <Text style={d.logline}>"{pitch.logline}"</Text>

      <View style={d.infoBlock}>
        <Row label="Showrunner"  value={showrunner?.name ?? '—'} />
        <Row label="Asking fee"  value={fmt(pitch.askingFlatFee)} />
        <Row label="Rev share"   value={pitch.askingRevenueSharePercent > 0 ? `${pitch.askingRevenueSharePercent}%` : 'None'} />
        <Row label="Expires"     value={`Week ${pitch.expiresWeek}, Year ${pitch.expiresYear}`} />
      </View>

      <View style={d.noteCard}>
        <Text style={d.noteText}>
          Greenlighting covers the showrunner's fee. You'll hire a director and cast once filming begins.
          The showrunner's skill determines a hidden quality floor for this series.
        </Text>
      </View>

      {!expired && (
        <View style={d.actionRow}>
          <TouchableOpacity style={d.passBtn} onPress={handlePass}>
            <Text style={d.passBtnText}>Pass</Text>
          </TouchableOpacity>
          <TouchableOpacity style={d.primaryBtn} onPress={handleGreenlight}>
            <LinearGradient
              colors={['#c49440', '#e6b254']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={d.primaryBtnGrad}
            >
              <Text style={d.primaryBtnText}>Greenlight →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
      {expired && (
        <View style={d.expiredNote}>
          <Text style={d.expiredText}>
            {pitch.greenlitByPlayer ? '✓ Greenlighted' : '✗ Passed on this pitch'}
          </Text>
        </View>
      )}
    </View>
  );
}

function StreamingOfferDetail({ item, onDone }: { item: InboxItem; onDone: () => void }) {
  const { shows, acceptStreamingOffer, declineStreamingOffer, markInboxRead } = useGameStore();
  const show = shows.find(s => s.id === item.refID);
  const offer = show?.pendingStreamingOffer;

  if (!show || !offer) {
    return (
      <View style={d.emptyNote}>
        <Text style={d.emptyNoteText}>This offer is no longer available.</Text>
      </View>
    );
  }

  const seasonsLabel =
    offer.seasonsToInclude.length === 1
      ? `Season ${offer.seasonsToInclude[0]}`
      : `Seasons ${offer.seasonsToInclude.join(', ')}`;

  function handleAccept(dealType: 'exclusive' | 'non-exclusive') {
    acceptStreamingOffer(show!.id, dealType);
    markInboxRead(item.id);
    onDone();
  }

  function handleDecline() {
    declineStreamingOffer(show!.id);
    markInboxRead(item.id);
    onDone();
  }

  return (
    <View>
      <Text style={d.streamingFrom}>{offer.platformName} wants streaming rights to</Text>
      <Text style={d.streamingShow}>"{show.title}"</Text>

      <View style={d.infoBlock}>
        <Row label="Seasons"       value={seasonsLabel} />
        <Row label="Platform"      value={offer.platformName} />
        <Row label="Deal length"   value={`${offer.durationYears} year${offer.durationYears > 1 ? 's' : ''}`} />
        <Row label="Non-exclusive" value={fmt(offer.nonExclusiveAmount)} />
        <Row label="Exclusive"     value={`${fmt(offer.exclusiveAmount)} (+40%)`} />
        <Row label="Expires"       value={`Week ${offer.expiresWeek}, Year ${offer.expiresYear}`} />
      </View>

      <View style={d.noteCard}>
        <Text style={d.noteText}>
          Non-exclusive lets other platforms bid too. Exclusive pays 40% more but blocks rivals for the deal's duration.
        </Text>
      </View>

      <View style={d.actionRow}>
        <TouchableOpacity style={d.passBtn} onPress={handleDecline}>
          <Text style={d.passBtnText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity style={d.primaryBtn} onPress={() => handleAccept('non-exclusive')}>
          <LinearGradient
            colors={['#c49440', '#e6b254']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={d.primaryBtnGrad}
          >
            <Text style={d.primaryBtnText}>Non-Excl</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={d.primaryBtn} onPress={() => handleAccept('exclusive')}>
          <LinearGradient
            colors={['#2a9e78', '#3db8a8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={d.primaryBtnGrad}
          >
            <Text style={d.primaryBtnText}>Exclusive</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EmmyDetail({ item, isWins }: { item: InboxItem; isWins: boolean }) {
  const { awards, shows, talent } = useGameStore();
  const year = parseInt(item.refID, 10);
  const yearAwards = awards.filter(a => a.year === year && a.isPlayerAward);

  const nominations = yearAwards;
  const wins = yearAwards.filter(a => a.won);

  if (nominations.length === 0) {
    return (
      <View style={d.emptyNote}>
        <Text style={d.emptyNoteText}>No nominations on record for Year {year}.</Text>
      </View>
    );
  }

  return (
    <View>
      {isWins && wins.length > 0 && (
        <View style={d.emmyWinBanner}>
          <Text style={d.emmyWinText}>
            {wins.length} Emmy win{wins.length > 1 ? 's' : ''} this year
          </Text>
        </View>
      )}

      {nominations.map(award => {
        const show = shows.find(s => s.id === award.showID);
        const person = award.talentID ? talent.find(t => t.id === award.talentID) : null;
        return (
          <View key={award.id} style={[d.emmyRow, award.won && d.emmyRowWon]}>
            <View style={{ flex: 1 }}>
              <Text style={[d.emmyCategory, award.won && { color: C.amber }]}>
                {EMMY_CATEGORY_LABELS[award.category] ?? award.category}
              </Text>
              <Text style={d.emmyShow}>
                {show?.title ?? '—'}{person ? ` · ${person.name}` : ''}
              </Text>
            </View>
            {award.won && <Text style={d.emmyWonBadge}>★ WON</Text>}
            {!award.won && isWins && <Text style={d.emmyNomBadge}>Nom</Text>}
          </View>
        );
      })}
    </View>
  );
}

function NewsDetail({ item }: { item: InboxItem }) {
  const { newsItems } = useGameStore();
  const related = newsItems.filter(
    n => n.week === item.week && n.year === item.year
  ).slice(0, 3);

  return (
    <View>
      <Text style={d.newsBody}>{item.preview}</Text>
      {related.map(n => (
        <View key={n.id} style={d.newsCard}>
          <Text style={d.newsCardHeadline}>{n.headline}</Text>
          <Text style={d.newsCardBody}>{n.body}</Text>
        </View>
      ))}
    </View>
  );
}

function PayoutDetail({ item }: { item: InboxItem }) {
  return (
    <View>
      <Text style={[d.streamingAmount, { color: C.green }]}>
        {item.title.match(/\$[\d.]+[MK]?/)?.[0] ?? ''}
      </Text>
      <Text style={d.newsBody}>{item.preview}</Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={d.row}>
      <Text style={d.rowLabel}>{label}</Text>
      <Text style={d.rowValue}>{value}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function InboxScreen() {
  const { inboxItems, markInboxRead } = useGameStore();
  const [selected, setSelected] = useState<InboxItem | null>(null);
  const { itemID } = useLocalSearchParams<{ itemID?: string }>();
  const autoOpenedRef = useRef(false);

  const sorted = [...inboxItems].sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    if (b.year !== a.year) return b.year - a.year;
    return b.week - a.week;
  });

  const unreadCount = inboxItems.filter(i => !i.read).length;

  useEffect(() => {
    if (!itemID || autoOpenedRef.current) return;
    const item = inboxItems.find(i => i.id === itemID);
    if (item) {
      autoOpenedRef.current = true;
      setSelected(item);
      if (!item.read) markInboxRead(item.id);
    }
  }, [itemID, inboxItems]);

  function openItem(item: InboxItem) {
    setSelected(item);
    if (!item.read) markInboxRead(item.id);
  }

  function closeDetail() {
    setSelected(null);
  }

  // ── Detail view ──────────────────────────────────────────────────────────────
  if (selected) {
    const meta = TYPE_META[selected.type] ?? { label: 'MESSAGE', color: C.muted };
    return (
      <SafeAreaView style={s.container}>
        <LinearGradient colors={['#131829', '#0f1220', '#0a0d18']} style={StyleSheet.absoluteFill} />
        <FilmRibbonAmbient />
        <View style={s.header}>
          <TouchableOpacity onPress={closeDetail} style={s.backBtn}>
            <Text style={s.backText}>← Inbox</Text>
          </TouchableOpacity>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={s.detailMeta}>
            <View style={[s.typeBadge, { backgroundColor: meta.color + '22', borderColor: meta.color }]}>
              <Text style={[s.typeBadgeText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            <Text style={s.detailWeek}>Week {selected.week} · Year {selected.year}</Text>
          </View>

          <Text style={s.detailTitle}>{selected.title}</Text>

          <View style={s.detailBody}>
            {selected.type === 'pitch' && (
              <PitchDetail item={selected} onDone={closeDetail} />
            )}
            {selected.type === 'streaming-offer' && (
              <StreamingOfferDetail item={selected} onDone={closeDetail} />
            )}
            {selected.type === 'emmy-nominations' && (
              <EmmyDetail item={selected} isWins={false} />
            )}
            {selected.type === 'emmy-ceremony' && (
              <EmmyDetail item={selected} isWins={true} />
            )}
            {selected.type === 'news' && (
              <NewsDetail item={selected} />
            )}
            {selected.type === 'revenue-share-payout' && (
              <PayoutDetail item={selected} />
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.container}>
      <LinearGradient colors={['#131829', '#0f1220', '#0a0d18']} style={StyleSheet.absoluteFill} />
      <FilmRibbonAmbient />
      <View style={s.header}>
        <Text style={s.headerTitle}>Inbox</Text>
        {unreadCount > 0 && (
          <View style={s.unreadBadge}>
            <Text style={s.unreadBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {sorted.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>No messages yet.</Text>
          <Text style={s.emptyHint}>Pitches, streaming offers, and Emmy news will appear here.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12, gap: 8 }} showsVerticalScrollIndicator={false}>
          {sorted.map(item => {
            const meta = TYPE_META[item.type] ?? { label: 'MSG', color: C.muted };
            return (
              <TouchableOpacity
                key={item.id}
                style={[s.itemCard, item.read && s.itemCardRead]}
                onPress={() => openItem(item)}
                activeOpacity={0.8}
              >
                <View style={s.itemLeft}>
                  {!item.read && <View style={s.unreadDot} />}
                  {item.read && <View style={s.readDot} />}
                  <View style={{ flex: 1 }}>
                    <View style={s.itemTopRow}>
                      <View style={[s.typeBadgeSmall, { backgroundColor: meta.color + '22', borderColor: meta.color }]}>
                        <Text style={[s.typeBadgeSmallText, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                      <Text style={s.itemWeek}>Wk {item.week} · Yr {item.year}</Text>
                    </View>
                    <Text style={[s.itemTitle, item.read && s.itemTitleRead]}>
                      {item.title}
                    </Text>
                    <Text style={s.itemPreview} numberOfLines={1}>{item.preview}</Text>
                  </View>
                </View>
                <Text style={s.itemChevron}>›</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Detail styles ─────────────────────────────────────────────────────────────

const d = StyleSheet.create({
  emptyNote:        { backgroundColor: C.cardBg, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16, alignItems: 'center' },
  emptyNoteText:    { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 14, textAlign: 'center' },

  pitchGenreRow:    { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  tag:              { backgroundColor: C.cardBg, borderRadius: 8, borderWidth: 1, borderColor: C.border, paddingHorizontal: 10, paddingVertical: 4 },
  tagText:          { color: C.muted, fontFamily: 'Manrope_700Bold', fontSize: 11, letterSpacing: 0.5 },

  logline:          { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 22, fontStyle: 'italic', marginBottom: 18 },

  infoBlock:        { backgroundColor: C.cardBg, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 14, overflow: 'hidden' },
  row:              { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  rowLabel:         { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 14 },
  rowValue:         { color: C.text, fontFamily: 'Manrope_600SemiBold', fontSize: 14 },

  noteCard:         { backgroundColor: C.cardBg2, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 20 },
  noteText:         { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19 },

  actionRow:        { flexDirection: 'row', gap: 10 },
  passBtn:          { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 15, alignItems: 'center', justifyContent: 'center' },
  passBtnText:      { color: C.muted, fontFamily: 'Manrope_600SemiBold', fontSize: 15 },
  primaryBtn:       { flex: 2, borderRadius: 12, overflow: 'hidden' },
  primaryBtnGrad:   { padding: 15, alignItems: 'center' },
  primaryBtnText:   { color: '#161008', fontFamily: 'Manrope_800ExtraBold', fontSize: 15 },

  expiredNote:      { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, alignItems: 'center' },
  expiredText:      { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 14 },

  streamingAmount:  { fontFamily: 'BebasNeue_400Regular', fontSize: 44, textAlign: 'center', marginBottom: 4, letterSpacing: 1 },
  streamingFrom:    { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 14, textAlign: 'center' },
  streamingShow:    { color: C.gold, fontFamily: 'Manrope_700Bold', fontSize: 16, textAlign: 'center', marginBottom: 18 },

  emmyWinBanner:    { backgroundColor: C.amber + '22', borderWidth: 1, borderColor: C.amber + '66', borderRadius: 12, padding: 14, marginBottom: 14, alignItems: 'center' },
  emmyWinText:      { color: C.amber, fontFamily: 'Manrope_800ExtraBold', fontSize: 16 },
  emmyRow:          { backgroundColor: C.cardBg, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  emmyRowWon:       { borderColor: C.amber + '66', backgroundColor: '#1e1808' },
  emmyCategory:     { color: C.text, fontFamily: 'Manrope_600SemiBold', fontSize: 14, marginBottom: 2 },
  emmyShow:         { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 12 },
  emmyWonBadge:     { color: C.amber, fontFamily: 'Manrope_800ExtraBold', fontSize: 12 },
  emmyNomBadge:     { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 12 },

  newsBody:         { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 22, marginBottom: 16 },
  newsCard:         { backgroundColor: C.cardBg, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 8 },
  newsCardHeadline: { color: C.text, fontFamily: 'Manrope_700Bold', fontSize: 14, marginBottom: 6 },
  newsCardBody:     { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19 },

});

// ─── List styles ──────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: C.pageBg },
  header:           { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 },
  backBtn:          { marginRight: 'auto' as any },
  backText:         { color: C.gold, fontFamily: 'Manrope_600SemiBold', fontSize: 15 },
  headerTitle:      { color: C.gold, fontFamily: 'BebasNeue_400Regular', fontSize: 28, letterSpacing: 1 },
  unreadBadge:      { backgroundColor: C.gold, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  unreadBadgeText:  { color: '#161008', fontFamily: 'Manrope_800ExtraBold', fontSize: 12 },

  scroll:           { flex: 1 },
  scrollContent:    { padding: 16 },

  empty:            { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText:        { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 16, marginBottom: 8 },
  emptyHint:        { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 13, textAlign: 'center', lineHeight: 19 },

  itemCard:         { backgroundColor: C.cardBg, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, flexDirection: 'row', alignItems: 'center' },
  itemCardRead:     { opacity: 0.65 },
  itemLeft:         { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  unreadDot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: C.gold, marginTop: 5 },
  readDot:          { width: 8, height: 8, borderRadius: 4, backgroundColor: 'transparent', marginTop: 5 },
  itemTopRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  typeBadgeSmall:   { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  typeBadgeSmallText: { fontFamily: 'Manrope_800ExtraBold', fontSize: 9, letterSpacing: 0.5 },
  itemWeek:         { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 11 },
  itemTitle:        { color: C.text, fontFamily: 'Manrope_700Bold', fontSize: 14, marginBottom: 2 },
  itemTitleRead:    { color: C.muted, fontFamily: 'Manrope_400Regular' },
  itemPreview:      { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 12 },
  itemChevron:      { color: C.muted, fontSize: 22, marginLeft: 8 },

  detailMeta:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  typeBadge:        { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeText:    { fontFamily: 'Manrope_800ExtraBold', fontSize: 11, letterSpacing: 0.5 },
  detailWeek:       { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 13 },
  detailTitle:      { color: C.text, fontFamily: 'BebasNeue_400Regular', fontSize: 30, marginBottom: 20, letterSpacing: 0.5, lineHeight: 34 },
  detailBody:       {},
});