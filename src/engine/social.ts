import { SocialReaction, Genre } from '../types';
import { generateEpisodeReactionBatch } from './episodereaction';

// ─────────────────────────────────────────────────────────────────────────────
// This file used to hold the original whole-sentence HIGH/MID/LOW template
// pools directly. Those are now fully replaced by the fragment-assembled
// generator in episodeReaction.ts (genre-flavor tokens, rating-driven
// intensity, no-duplicate-persona-per-batch). This file is kept as a thin
// compatibility wrapper — same exported name, same signature, same return
// shape — specifically so advancement.ts doesn't need to change at all.
//
// The `recentTemplateIds` param and `usedTemplateIds` return field are now
// vestigial: the old ID-based cooldown system doesn't apply to
// fragment-assembled output (there's no fixed set of "templates" to track
// IDs for — the combinatorial space does the repeat-avoidance on its own,
// same reasoning as industryChatter.ts and competitorReaction.ts). They're
// left in place, always empty/passthrough, purely so the existing call site
// in advancement.ts (which threads a cooldown array through) keeps compiling
// and running unchanged. Safe to clean up later by removing the cooldown
// plumbing from advancement.ts entirely, but not required.
// ─────────────────────────────────────────────────────────────────────────────

export const SOCIAL_TEMPLATE_COOLDOWN = 10; // vestigial — see note above

export interface GenerateSocialReactionsResult {
  reactions: SocialReaction[];
  usedTemplateIds: string[]; // always [] now — kept for call-site compatibility
}

export function generateSocialReactions(
  showTitle: string,
  episodeNumber: number,
  rating: number,
  genre: Genre,
  _recentTemplateIds: string[] = [], // unused — kept for call-site compatibility
  isFinale = false,
  prevRating?: number,
): GenerateSocialReactionsResult {
  const reactions = generateEpisodeReactionBatch(showTitle, episodeNumber, genre, rating, isFinale, prevRating);
  return { reactions, usedTemplateIds: [] };
}