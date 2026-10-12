import { getArc, isWalletAddress } from "@/data/arc";

async function rpc(ARC, method, params) {
  const res = await fetch(ARC.rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

// "1234567" with 6 decimals -> "1.234567", trailing zeros dropped (keeps at least 2 places).
function formatUnits(value, decimals) {
  const s = value.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, -decimals);
  const frac = s.slice(-decimals).replace(/0+$/, "").padEnd(2, "0");
  return `${BigInt(whole).toLocaleString("en-US")}.${frac}`;
}

// The USDC balance of a wallet on Arc: GET /api/arc/balance?address=0x…&network=testnet|mainnet
// (no network = the default from NEXT_PUBLIC_ARC_NETWORK).
export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const address = params.get("address") ?? "";
  const ARC = getArc(params.get("network"));
  if (!isWalletAddress(address)) {
    return Response.json({ error: "That isn't a valid wallet address (0x followed by 40 characters)." }, { status: 400 });
  }
  try {
    // balanceOf(address)
    const data = "0x70a08231" + address.slice(2).toLowerCase().padStart(64, "0");
    const [raw, chainId, block] = await Promise.all([
      rpc(ARC, "eth_call", [{ to: ARC.usdc, data }, "latest"]),
      rpc(ARC, "eth_chainId", []),
      rpc(ARC, "eth_blockNumber", []),
    ]);
    if (Number(chainId) !== ARC.chainId) throw new Error(`Unexpected chain ID ${Number(chainId)}.`);
    const balance = BigInt(raw === "0x" ? 0 : raw);
    return Response.json({
      address,
      balance: formatUnits(balance, ARC.usdcDecimals),
      currency: ARC.currency,
      network: ARC.key,
      chainId: ARC.chainId,
      blockNumber: Number(block),
    });
  } catch (err) {
    return Response.json({ error: `Couldn't reach ${ARC.name}: ${err.message}` }, { status: 502 });
  }
}
