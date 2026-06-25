import { SocialReaction } from '../types';
import { randomBetween } from '../utils/random';

type PostTemplate = (title: string, ep: number) => SocialReaction;

const HIGH: PostTemplate[] = [
  (t, ep) => ({ username: 'TV Obsessed', handle: '@tvobsessed', content: `${t} episode ${ep} is the best hour of television this year`, likes: randomBetween(800, 4200), reposts: randomBetween(200, 1100) }),
  (t, _) => ({ username: 'StreamNerve', handle: '@streamnerve', content: `i need everyone to be watching ${t} immediately`, likes: randomBetween(1200, 5000), reposts: randomBetween(400, 1800) }),
  (t, ep) => ({ username: 'Critics Desk', handle: '@criticsdesk', content: `The momentum on ${t} episode ${ep} is unreal. Television this good doesn't come around often.`, likes: randomBetween(500, 2000), reposts: randomBetween(150, 600) }),
  (t, _) => ({ username: 'PrimeTimeFeed', handle: '@primetimefeed', content: `${t} is doing something special. Don't sleep on this.`, likes: randomBetween(600, 2500), reposts: randomBetween(200, 800) }),
  (t, ep) => ({ username: 'TheCableDesk', handle: '@cabledesk', content: `ep ${ep} of ${t} just broke me. what a show.`, likes: randomBetween(400, 1800), reposts: randomBetween(120, 600) }),
];

const MID: PostTemplate[] = [
  (t, ep) => ({ username: 'TV Obsessed', handle: '@tvobsessed', content: `${t} ep ${ep} — solid, not their best but still worth it`, likes: randomBetween(100, 500), reposts: randomBetween(20, 120) }),
  (t, _) => ({ username: 'StreamNerve', handle: '@streamnerve', content: `${t} doing enough to keep me watching. for now.`, likes: randomBetween(80, 400), reposts: randomBetween(15, 100) }),
  (t, ep) => ({ username: 'Critics Desk', handle: '@criticsdesk', content: `A functional episode ${ep} for ${t}. Advances the story without excelling.`, likes: randomBetween(120, 600), reposts: randomBetween(30, 150) }),
  (t, _) => ({ username: 'PrimeTimeFeed', handle: '@primetimefeed', content: `Still watching ${t} but it's going to need to pick up the pace.`, likes: randomBetween(90, 350), reposts: randomBetween(20, 90) }),
];

const LOW: PostTemplate[] = [
  (t, _) => ({ username: 'TV Obsessed', handle: '@tvobsessed', content: `${t} really lost me this week`, likes: randomBetween(200, 800), reposts: randomBetween(60, 300) }),
  (t, _) => ({ username: 'StreamNerve', handle: '@streamnerve', content: `what happened to ${t}`, likes: randomBetween(300, 1200), reposts: randomBetween(100, 500) }),
  (t, ep) => ({ username: 'Critics Desk', handle: '@criticsdesk', content: `Concerning signs for ${t} episode ${ep}. Hope they course correct.`, likes: randomBetween(150, 700), reposts: randomBetween(50, 250) }),
  (t, _) => ({ username: 'PrimeTimeFeed', handle: '@primetimefeed', content: `${t} is in real trouble if it keeps this up.`, likes: randomBetween(180, 600), reposts: randomBetween(55, 220) }),
];

export function generateSocialReactions(
  showTitle: string,
  episodeNumber: number,
  rating: number,
): SocialReaction[] {
  const pool = rating >= 8.0 ? HIGH : rating >= 5.5 ? MID : LOW;
  const count = randomBetween(3, Math.min(5, pool.length));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(fn => fn(showTitle, episodeNumber));
}
