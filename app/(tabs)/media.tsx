import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Image,
} from 'react-native';
import { useState, useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useGameStore } from '../../src/store/gameStore';
import { WEEKS_PER_YEAR } from '../../src/constants/game';
import { NewsItem } from '../../src/types';

const C = {
  pageBg: '#0f1220', cardBg: '#191c2a', cardBg2: '#1d2035',
  border: '#252840', borderGold: '#e6b25430',
  text: '#f0ede8', muted: '#9a958e', mutedMid: '#6b6880',
  gold: '#e6b254', goldDim: '#e6b25420', goldMid: '#c49440', goldBtnText: '#161008',
  green: '#4ec46e', amber: '#d4753a', amberBg: '#2a1f12',
  red: '#c43820',
  blue: '#cccee0', blueBg: '#141e33',
  teal: '#3db8a8', tealBg: '#0f2525',
};

const NEWS_TYPE_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  player:     { label: 'YOUR NETWORK', color: C.gold,  bg: C.goldDim,  border: C.gold  + '55' },
  emmy:       { label: 'EMMYS',        color: C.teal,  bg: C.tealBg,   border: C.teal  + '55' },
  competitor: { label: 'COMPETITOR',   color: C.amber, bg: C.amberBg,  border: C.amber + '55' },
  industry:   { label: 'INDUSTRY',     color: C.blue,  bg: C.blueBg,   border: C.blue  + '55' },
};

const TYPE_PRIORITY: Record<string, number> = { player: 0, emmy: 1, competitor: 2, industry: 3 };

type NewsFilter = 'all' | 'player' | 'emmy' | 'competitor' | 'industry';

const NEWS_FILTERS: { label: string; value: NewsFilter }[] = [
  { label: 'All',          value: 'all' },
  { label: 'Your Network', value: 'player' },
  { label: 'Emmys',        value: 'emmy' },
  { label: 'Competitors',  value: 'competitor' },
  { label: 'Industry',     value: 'industry' },
];

const AVATAR_COLORS = [C.teal, C.gold, '#5b8dee', C.green, C.amber, '#b06ad4'];

function avatarColor(username: string): string {
  let h = 0;
  for (const ch of username) h = (h * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(username: string): string {
  const words = username.trim().split(/\s+/);
  return words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : username.slice(0, 2).toUpperCase();
}

function fmtLikes(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function relativeTime(itemWeek: number, itemYear: number, curWeek: number, curYear: number): string {
  const diff = (curYear - itemYear) * WEEKS_PER_YEAR + (curWeek - itemWeek);
  if (diff <= 0) return 'This week';
  if (diff === 1) return '1 wk ago';
  if (diff < WEEKS_PER_YEAR) return `${diff} wks ago`;
  const yrs = Math.floor(diff / WEEKS_PER_YEAR);
  return `${yrs} yr${yrs > 1 ? 's' : ''} ago`;
}

type EnrichedReaction = {
  username: string; handle: string; content: string;
  likes: number; reposts: number;
  showID: string; showTitle: string;
  episodeNumber: number; seasonNumber: number;
};

// ── Sub-components ─────────────────────────────────────────────────────────────

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

function DotRow() {
  return (
    <View style={s.dotRow}>
      {Array.from({ length: 48 }).map((_, i) => <View key={i} style={s.dot} />)}
    </View>
  );
}

function NewsCard({ item, isTop, curWeek, curYear }: {
  item: NewsItem; isTop: boolean; curWeek: number; curYear: number;
}) {
  const meta = NEWS_TYPE_META[item.type] ?? NEWS_TYPE_META.industry;
  return (
    <View style={[s.newsCard, isTop && s.newsCardTop]}>
      <View style={s.newsCardMeta}>
        <View style={[s.newsTagPill, { backgroundColor: meta.bg, borderColor: meta.border }]}>
          <Text style={[s.newsTagText, { color: meta.color }]}>
            {isTop ? `TOP STORY · ${meta.label}` : meta.label}
          </Text>
        </View>
        <Text style={s.newsTime}>{relativeTime(item.week, item.year, curWeek, curYear)}</Text>
      </View>
      <Text style={s.newsHeadline}>{item.headline}</Text>
      <Text style={s.newsBody}>{item.body}</Text>
      <Text style={s.newsByline}>By Trade Wire Staff</Text>
    </View>
  );
}

function ReactionCard({ r }: { r: EnrichedReaction }) {
  const color = avatarColor(r.username);
  return (
    <View style={s.reactionCard}>
      <View style={s.reactionHeader}>
        <View style={[s.avatar, { backgroundColor: color + '28', borderColor: color + '80' }]}>
          <Text style={[s.avatarText, { color }]}>{initials(r.username)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.reactionNameRow}>
            <Text style={s.reactionUsername}>{r.username}</Text>
            <View style={s.showTagPill}>
              <Text style={s.showTagText} numberOfLines={1}>{r.showTitle}</Text>
            </View>
          </View>
          <Text style={s.reactionHandle}>{r.handle} · Ep {r.episodeNumber}</Text>
        </View>
      </View>
      <Text style={s.reactionContent}>{r.content}</Text>
      <View style={s.reactionFooter}>
        <Text style={s.reactionStat}>♥ {fmtLikes(r.likes)}</Text>
        <Text style={s.reactionStat}>↺ {fmtLikes(r.reposts)}</Text>
      </View>
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function MediaScreen() {
  const { newsItems, shows, network, inboxItems } = useGameStore();
  const router = useRouter();
  const [tab, setTab]               = useState<'news' | 'social'>('news');
  const [newsFilter, setNewsFilter]   = useState<NewsFilter>('all');
  const [socialFilter, setSocialFilter] = useState<string>('all');

  const unreadCount = inboxItems.filter(i => !i.read).length;

  // Collect every social reaction across all aired episodes
  const allReactions = useMemo<EnrichedReaction[]>(() => {
    const result: EnrichedReaction[] = [];
    for (const show of shows) {
      for (const season of show.seasons) {
        for (const ep of season.episodes) {
          for (const r of ep.socialReactions) {
            result.push({
              ...r,
              showID: show.id,
              showTitle: show.title,
              episodeNumber: ep.episodeNumber,
              seasonNumber: season.seasonNumber,
            });
          }
        }
      }
    }
    return result;
  }, [shows]);

  // Trending: only surfaces when a reaction clears 2 000 likes
  const trendingReaction = useMemo(() => {
    if (allReactions.length === 0) return null;
    const top = [...allReactions].sort((a, b) => b.likes - a.likes)[0];
    return top.likes >= 2000 ? top : null;
  }, [allReactions]);

  const showsWithReactions = useMemo(() =>
    shows.filter(sh =>
      sh.seasons.some(season => season.episodes.some(ep => ep.socialReactions.length > 0))
    ),
  [shows]);

  // News sorted most-recent first; within same week, player > emmy > competitor > industry
  const filteredNews = useMemo(() => {
    const sorted = [...newsItems].sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      if (b.week !== a.week) return b.week - a.week;
      return (TYPE_PRIORITY[a.type] ?? 4) - (TYPE_PRIORITY[b.type] ?? 4);
    });
    return newsFilter === 'all' ? sorted : sorted.filter(n => n.type === newsFilter);
  }, [newsItems, newsFilter]);

  const filteredReactions = useMemo(() => {
    const src = socialFilter === 'all'
      ? allReactions
      : allReactions.filter(r => r.showID === socialFilter);
    return [...src].sort((a, b) => b.likes - a.likes);
  }, [allReactions, socialFilter]);

  return (
    <SafeAreaView style={s.container}>
      <LinearGradient colors={['#131829', '#0f1220', '#0a0d18']} style={StyleSheet.absoluteFill} />
      <FilmRibbonAmbient />

      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.brandTitle}>THE WIRE</Text>
          <Text style={s.brandSub}>Trade news & social buzz across the industry</Text>
        </View>
        <View style={s.headerRight}>
          <Text style={s.weekLabel}>WEEK {network.currentWeek} · YEAR {network.currentYear}</Text>
          {unreadCount > 0 && (
            <TouchableOpacity style={s.inboxBtn} onPress={() => router.push('/(tabs)/inbox')} activeOpacity={0.8}>
              <Text style={s.inboxBtnText}>INBOX</Text>
              <View style={s.inboxBadge}>
                <Text style={s.inboxBadgeText}>{unreadCount}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <DotRow />

      {/* Main tab switcher */}
      <View style={s.tabRow}>
        <TouchableOpacity style={s.tabBtn} onPress={() => setTab('news')} activeOpacity={0.9}>
          {tab === 'news' ? (
            <LinearGradient colors={[C.goldMid, C.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.tabInner}>
              <Text style={[s.tabText, s.tabTextActive]}>NEWS</Text>
            </LinearGradient>
          ) : (
            <View style={s.tabInner}>
              <Text style={s.tabText}>NEWS</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={s.tabBtn} onPress={() => setTab('social')} activeOpacity={0.9}>
          {tab === 'social' ? (
            <LinearGradient colors={[C.goldMid, C.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.tabInner}>
              <Text style={[s.tabText, s.tabTextActive]}>SOCIAL BUZZ</Text>
            </LinearGradient>
          ) : (
            <View style={s.tabInner}>
              <Text style={s.tabText}>SOCIAL BUZZ</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {tab === 'news' ? (
        <>
          {/* News filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={s.filterRow}
          >
            {NEWS_FILTERS.map(f => (
              <TouchableOpacity
                key={f.value}
                style={[s.chip, newsFilter === f.value && s.chipActive]}
                onPress={() => setNewsFilter(f.value)}
                activeOpacity={0.8}
              >
                <Text style={[s.chipText, newsFilter === f.value && s.chipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
            {filteredNews.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={s.emptyText}>No stories yet. Advance the week to generate news.</Text>
              </View>
            ) : (
              filteredNews.map((item, idx) => (
                <NewsCard
                  key={item.id}
                  item={item}
                  isTop={idx === 0 && newsFilter === 'all'}
                  curWeek={network.currentWeek}
                  curYear={network.currentYear}
                />
              ))
            )}
          </ScrollView>
        </>
      ) : (
        <>
          {/* Trending banner — conditional on viral content */}
          {trendingReaction && (
            <View style={s.trendingBanner}>
              <Text style={s.trendingArrow}>↑</Text>
              <Text style={s.trendingText} numberOfLines={1}>
                Trending: "{trendingReaction.showTitle}" — {fmtLikes(trendingReaction.likes)} engagements this week
              </Text>
            </View>
          )}

          {/* Show filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={s.filterRow}
          >
            <TouchableOpacity
              style={[s.chip, socialFilter === 'all' && s.chipActive]}
              onPress={() => setSocialFilter('all')}
              activeOpacity={0.8}
            >
              <Text style={[s.chipText, socialFilter === 'all' && s.chipTextActive]}>All shows</Text>
            </TouchableOpacity>
            {showsWithReactions.map(show => (
              <TouchableOpacity
                key={show.id}
                style={[s.chip, socialFilter === show.id && s.chipActive]}
                onPress={() => setSocialFilter(show.id)}
                activeOpacity={0.8}
              >
                <Text style={[s.chipText, socialFilter === show.id && s.chipTextActive]}>
                  {show.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
            {filteredReactions.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={s.emptyText}>
                  No social buzz yet. Air some episodes to see what people are saying.
                </Text>
              </View>
            ) : (
              filteredReactions.map((r, idx) => (
                <ReactionCard key={`${r.showID}-${r.episodeNumber}-${idx}`} r={r} />
              ))
            )}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.pageBg },

  // Header
  header:      { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  brandTitle:  { color: C.gold, fontFamily: 'BebasNeue_400Regular', fontSize: 34, letterSpacing: 1.5, lineHeight: 36 },
  brandSub:    { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 12, marginTop: 4 },
  headerRight: { alignItems: 'flex-end', gap: 6, paddingTop: 2 },
  weekLabel:   { color: C.gold, fontFamily: 'Manrope_700Bold', fontSize: 11, letterSpacing: 1 },

  inboxBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.goldDim, borderWidth: 1, borderColor: C.gold + '44', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  inboxBtnText:   { color: C.gold, fontFamily: 'Manrope_700Bold', fontSize: 11, letterSpacing: 0.5 },
  inboxBadge:     { backgroundColor: C.gold, borderRadius: 999, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  inboxBadgeText: { color: C.goldBtnText, fontFamily: 'Manrope_800ExtraBold', fontSize: 10 },

  // Dot row
  dotRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 5, marginBottom: 14, flexWrap: 'nowrap', overflow: 'hidden' },
  dot:    { width: 5, height: 5, borderRadius: 999, backgroundColor: C.gold, opacity: 0.3 },

  // Tab switcher
  tabRow:       { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: '#0a0c18', borderRadius: 12, borderWidth: 1, borderColor: C.gold + '33', padding: 4 },
  tabBtn:       { flex: 1 },
  tabInner:     { paddingVertical: 11, alignItems: 'center', borderRadius: 9 },
  tabText:      { fontFamily: 'BebasNeue_400Regular', fontSize: 17, letterSpacing: 1.5, color: C.muted },
  tabTextActive:{ color: C.goldBtnText },

  // Filter chips
  filterRow: { paddingHorizontal: 14, paddingBottom: 12, gap: 8, flexDirection: 'row' },
  chip:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: C.cardBg, flexShrink: 0 },
  chipActive:   { borderColor: C.gold, backgroundColor: C.goldDim },
  chipText:     { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: C.muted },
  chipTextActive:{ color: C.gold },

  listContent: { paddingHorizontal: 14, paddingBottom: 32, gap: 12 },

  // News cards
  newsCard:     { backgroundColor: C.cardBg, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16 },
  newsCardTop:  { borderColor: C.gold + '55', backgroundColor: '#181508' },
  newsCardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  newsTagPill:  { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  newsTagText:  { fontFamily: 'Manrope_800ExtraBold', fontSize: 9, letterSpacing: 1.5 },
  newsTime:     { fontFamily: 'Manrope_400Regular', color: C.muted, fontSize: 12 },
  newsHeadline: { fontFamily: 'BebasNeue_400Regular', color: C.text, fontSize: 22, letterSpacing: 0.5, lineHeight: 26, marginBottom: 8 },
  newsBody:     { fontFamily: 'Manrope_400Regular', color: C.muted, fontSize: 13, lineHeight: 20, marginBottom: 10 },
  newsByline:   { fontFamily: 'Manrope_400Regular', color: C.mutedMid, fontSize: 11 },

  // Trending banner
  trendingBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 14, marginBottom: 10, backgroundColor: '#1e1508', borderWidth: 1, borderColor: C.amber + '55', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  trendingArrow:  { color: C.amber, fontFamily: 'Manrope_800ExtraBold', fontSize: 14 },
  trendingText:   { flex: 1, color: C.amber, fontFamily: 'Manrope_600SemiBold', fontSize: 13 },

  // Reaction cards
  reactionCard:    { backgroundColor: C.cardBg, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16 },
  reactionHeader:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  avatar:          { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:      { fontFamily: 'Manrope_800ExtraBold', fontSize: 14 },
  reactionNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' },
  reactionUsername:{ fontFamily: 'Manrope_700Bold', color: C.text, fontSize: 14 },
  showTagPill:     { backgroundColor: C.goldDim, borderWidth: 1, borderColor: C.gold + '44', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  showTagText:     { fontFamily: 'Manrope_700Bold', color: C.gold, fontSize: 10 },
  reactionHandle:  { fontFamily: 'Manrope_400Regular', color: C.muted, fontSize: 12 },
  reactionContent: { fontFamily: 'Manrope_400Regular', color: C.text, fontSize: 14, lineHeight: 21, marginBottom: 12 },
  reactionFooter:  { flexDirection: 'row', gap: 16 },
  reactionStat:    { fontFamily: 'Manrope_600SemiBold', color: C.muted, fontSize: 13 },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24 },
  emptyText:  { fontFamily: 'Manrope_400Regular', color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
