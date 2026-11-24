import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { GAMES } from '@/lib/games';
import { applyGameOverrides, getSiteConfig } from '@/lib/site-config';
import { gamePageInfo, PUBLIC_PAGES, type PageInfo } from '@/lib/seo';

export const runtime = 'nodejs';
export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get('path') || '/';
  const cfg = await getSiteConfig();
  const game = applyGameOverrides(GAMES, cfg).find(g => `/games/${g.slug}` === path);
  const info: PageInfo | undefined = path === '/' ? { title: cfg.site.title, description: cfg.site.description, path } : game ? gamePageInfo(game) : Object.hasOwn(PUBLIC_PAGES, path) ? { ...PUBLIC_PAGES[path as keyof typeof PUBLIC_PAGES], path } : undefined;
  if (!info) return new Response('Not found', { status: 404 });
  // Only read bundled, known artwork; never fetch arbitrary URLs supplied by a request.
  const original = GAMES.find(g => g.id === game?.id);
  const image = original?.art?.bannerImage || '/games/rocket-rampage/banner.jpg';
  const art = await readFile(join(process.cwd(), 'public', image));
  const data = `data:image/jpeg;base64,${art.toString('base64')}`;
  const imageResponse = new ImageResponse(<div style={{ width:'100%', height:'100%', display:'flex', position:'relative', backgroundColor:'#101413', color:'white' }}>
    <img src={data} width={1200} height={630} style={{ position:'absolute', left:0, top:0, width:1200, height:630, objectFit:'cover' }} />
    <div style={{ display:'flex', position:'absolute', left:0, top:0, width:1200, height:630, background:'linear-gradient(90deg, rgba(4,9,10,0.97) 0%, rgba(4,9,10,0.86) 48%, rgba(4,9,10,0.16) 100%)' }} />
    <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', padding:'70px', width:'850px', position:'relative' }}>
      <div style={{ color:'#ccff00', fontSize:27, fontWeight:700, marginBottom:24 }}>DUENEVER / BROWSER GAMES</div>
      <div style={{ fontSize:62, fontWeight:800, lineHeight:1.1 }}>{info.title.slice(0, 80)}</div>
      <div style={{ fontSize:27, lineHeight:1.35, marginTop:24, color:'#e5e7eb' }}>{info.description.slice(0, 155)}</div>
    </div>
  </div>, { width:1200, height:630 });
  const jpeg = await sharp(Buffer.from(await imageResponse.arrayBuffer())).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpeg), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60', 'X-Content-Type-Options': 'nosniff' } });
}
