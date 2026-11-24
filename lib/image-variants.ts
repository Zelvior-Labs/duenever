// Pre-optimized variants of the bundled artwork; custom image URLs remain unchanged.
const games = ['rocket-rampage', 'rune-bastion', 'treasure-drift', 'skyline-sprint', 'circuit-merge', 'ludo', 'chess'];
export function cardImage(src: string): string {
  return games.reduce((url, game) => url === `/games/${game}/banner.jpg` ? `/games/${game}/card.webp` : url, src);
}
export function heroImage(src: string): string {
  return src === '/games/rocket-rampage/banner.jpg' ? '/games/rocket-rampage/hero.webp' : src;
}
