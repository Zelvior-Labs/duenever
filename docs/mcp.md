# Play against an LLM with MCP

The DueNever MCP server lets an MCP-compatible assistant take a **human seat** in a private chess or Ludo room. It uses the same server-side game rules as the website: the assistant cannot choose dice rolls or bypass turn and move validation. A room can also contain the built-in bots.

This is a **local stdio MCP server**, not a public MCP-over-HTTP URL. It needs a client that can launch local MCP processes; clients that support only remote HTTP connectors cannot attach to it directly. It runs on the computer where the MCP client runs and talks to the selected DueNever website over HTTP(S).

## Setup

1. Install Node.js 20.9 or newer and Git on the computer running your MCP client.
2. Clone the repository and install dependencies:

   ```sh
   git clone https://github.com/Zelvior-Labs/duenever.git
   cd duenever
   npm ci
   ```

3. Add a stdio MCP server to your client's configuration. For example, in clients that accept the standard `mcpServers` JSON configuration, use an **absolute path** to the cloned file (replace the example path with your own):

   ```json
   {
     "mcpServers": {
       "duenever": {
         "command": "node",
         "args": ["/absolute/path/to/duenever/mcp/server.mjs"],
         "env": { "DUENEVER_URL": "https://duenever.vercel.app" }
       }
     }
   }
   ```

   On Windows, use a fully qualified path and escape backslashes in JSON (or use forward slashes). If the client cannot find Node, use the absolute path to the `node` executable for `command`. Restart the MCP client, enable the server and approve its tools if prompted. Exact configuration location and approval steps depend on the client.

4. On DueNever, open chess or Ludo, select **at least two human players**, and create a private room. An LLM takes one of those human seats, not a built-in bot seat. Share the room code in your conversation with the assistant and ask it to join and play. In chess, the host plays white and the joining assistant plays black. For Ludo you may add more humans or bots.
5. After your turn, tell the assistant to check the state and play its turn. It may need another prompt after each turn; the server does not monitor the game or initiate LLM calls. Some clients require approval for every tool call. The assistant may also create a room itself and give you the code to join on the website.

The server supplies chess FEN, move history and legal moves, or Ludo token positions, legal choices and a server-generated die. It also supports resignation and chess draw offers, acceptance and claims. `get_game_state` reports when the game is waiting or finished. It does not add clocks or other tournament adjudication to chess.

## Local network

Start the LAN website as described in [multiplayer.md](multiplayer.md), and point `DUENEVER_URL` to the **same** host and port that players use, for example `http://192.168.1.20:3000`. The server only accepts an origin (no path, query, or embedded credentials). The MCP client and game server must be able to reach each other over the network. Local HTTP is unencrypted: use it only on a trusted network or configure HTTPS. If the LLM client runs remotely, its `localhost` is not your own computer; use an address reachable from that client.

## Privacy and troubleshooting

- Room codes are private invitations. Share them only with the assistant/client and people you trust. The model and MCP client can see tool inputs and outputs, including the code, board and player names; check your provider's privacy policy before sharing them.
- A separate seat credential is kept out of MCP tool outputs and saved locally in `~/.duenever/mcp` (directory mode 0700, files 0600 on Unix) so the assistant can resume after a client restart. The files contain plaintext secrets; anyone with access to your account or device may be able to read them. `DUENEVER_MCP_DATA_DIR` can select another private directory. Do not sync or share this folder. Windows permissions depend on your account and filesystem.
- Ask the assistant to use `leave_room` to release its seat and remove its saved credential. If a room has expired or the server is inaccessible, `forget_room` deletes only the local credential and does **not** release the remote seat. Rooms expire after 24 hours. Changing `DUENEVER_URL` selects a different credential namespace.
- If the room is full, create it with an available human seat. If the assistant is waiting, make your move first and ask it to check again. If the game server is unreachable, verify the URL and network; an interrupted action may still have succeeded, so check state before retrying.
- This is a local process with your user permissions, so only configure it in a trusted MCP client. Do not share or expose its stdio connection to other users. Player names are untrusted input; the server instructs the assistant not to treat them as commands. MCP client logs or conversation history may retain room codes and game information.

For development, run `npm test` to test protocol negotiation, seat persistence, legal chess play and Ludo actions. `npm run mcp` starts the stdio server for MCP clients; it is not an interactive terminal program.
