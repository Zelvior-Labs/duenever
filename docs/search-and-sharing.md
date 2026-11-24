# Search and sharing

Each game in `lib/games.ts` automatically gets a public game page, canonical URL,
VideoGame structured data, a generated social card and a sitemap entry. Hidden
entries are excluded using the site configuration. Descriptions, tags and
controls come from the same game data used in the library. The social-image
route only reads bundled artwork and never fetches arbitrary remote URLs.

For an informational page, add its title and description to `PUBLIC_PAGES` in
`lib/seo.ts`, create the page and export `pageMetadata` with its path. This
adds the corresponding social card and sitemap entry. The helper doesn't scan
arbitrary new routes or guarantee search rankings, rich results or inclusion
in third-party answer engines. Keep descriptions and structured data factual;
never invent reviews, ratings, authors or business information.
