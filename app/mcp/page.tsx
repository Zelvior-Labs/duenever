import { pageMetadata, PUBLIC_PAGES } from '@/lib/seo';
import Link from 'next/link';

export const metadata = pageMetadata({ ...PUBLIC_PAGES['/mcp'], path: '/mcp' });

const install = `git clone https://github.com/Zelvior-Labs/duenever.git
cd duenever
npm ci`;
const config = `{
  "mcpServers": {
    "duenever": {
      "command": "node",
      "args": ["/absolute/path/to/duenever/mcp/server.mjs"],
      "env": { "DUENEVER_URL": "https://duenever.vercel.app" }
    }
  }
}`;

export default function McpSetupPage() {
  return <main className="min-h-screen bg-neutral-950 px-5 py-10 text-neutral-100">
    <div className="mx-auto max-w-3xl space-y-7">
      <Link href="/" className="text-sm text-neutral-400 underline">← Back to games</Link>
      <header><p className="text-sm font-bold uppercase tracking-widest text-amber-400">Private multiplayer</p><h1 className="mt-2 text-4xl font-black">Play with an LLM</h1><p className="mt-3 text-neutral-300">Connect a compatible assistant to DueNever through the Model Context Protocol (MCP), then invite it to a chess or Ludo room.</p></header>
      <section className="space-y-3 rounded-xl border border-neutral-700 bg-neutral-900 p-5"><h2 className="text-xl font-bold">1. Install the local server</h2><p>This is a local stdio MCP server. Your assistant must support launching local MCP processes; remote-only connectors cannot use it directly. Install Git and Node.js 20.9 or later, then run:</p><pre className="overflow-x-auto rounded bg-black p-4 text-sm text-amber-200">{install}</pre></section>
      <section className="space-y-3 rounded-xl border border-neutral-700 bg-neutral-900 p-5"><h2 className="text-xl font-bold">2. Connect your assistant</h2><p>Add this to your MCP client&apos;s configuration, replacing the example path with the absolute path to your clone. Configuration locations and tool approvals vary by client. Restart the client after saving.</p><pre className="overflow-x-auto rounded bg-black p-4 text-sm text-amber-200">{config}</pre><p className="text-sm text-neutral-400">For a LAN game, set DUENEVER_URL to the same local server origin used by players, such as http://192.168.1.20:3000. LAN HTTP is unencrypted; use a trusted network or HTTPS.</p></section>
      <section className="space-y-3 rounded-xl border border-neutral-700 bg-neutral-900 p-5"><h2 className="text-xl font-bold">3. Invite it to play</h2><ol className="list-decimal space-y-2 pl-5"><li>Open chess or Ludo and create a room with at least two human players. The LLM uses one human seat; remaining seats can be bots.</li><li>Share the private room code with your assistant and ask it to join.</li><li>After you move, ask it to check the board and play its turn. Depending on the client, you may need to approve tool calls.</li></ol><p className="text-sm text-neutral-400">The assistant can also create a room and give you its invitation code. Dice rolls and moves are checked by the game server.</p></section>
      <section className="space-y-2 rounded-xl border border-neutral-700 bg-neutral-900 p-5"><h2 className="text-xl font-bold">Privacy and troubleshooting</h2><p>Room codes, player names and board state are visible to your MCP client and model provider. Share codes only with trusted participants. The assistant&apos;s seat credential is saved locally as a private plaintext file, not returned to the model; protect your computer and don&apos;t share its ~/.duenever/mcp folder.</p><p>Ask the assistant to leave the room to release its seat. Rooms expire after 24 hours. The assistant will not automatically watch for your move: prompt it again when you&apos;re ready.</p><p className="text-sm text-neutral-400">More detail, including credential recovery and LAN setup, is available in docs/mcp.md in the repository.</p></section>
    </div>
  </main>;
}
