import "server-only";
import { ARC, arcByChainId, isWalletAddress } from "@/data/arc";
import { ARC_RECLAIM_BUFFER_DAYS, AUTO_APPROVE_HOURS, platformFeeFor } from "@/data/projectOptions";
import {
  chainMessage,
  escrowAddress,
  escrowEvents,
  operatorAddress,
  readEscrowJob,
  readUsdc,
  sendAsOperator,
  signTerms,
  waitForReceipt,
} from "@/lib/arc";
import pool from "@/lib/db";
import { notifyPaymentExpiring, notifyProposalDecision } from "@/lib/notifications";
import { PaymentError, hireBlocker } from "@/lib/payments";
import { formatUnits, getAddress, isAddress, isAddressEqual, parseUnits } from "viem";

// Paying for a job in USDC on Arc (docs/arc-payments.md). Same shape as PayPal (lib/payments.js):
// hiring holds the money (fund: USDC goes into the escrow contract), approving pays it out
// (release: freelancer + platform fee), undoing or losing a dispute gives it back (refund).
// Amounts, wallets and expiry come from the database and are signed by the server; the
// browser only forwards them. Nothing is trusted until it is read back from the chain.

const SIGNATURE_MINUTES = 30;
const DAY = 86_400_000;
const USDC_DECIMALS = 6;
const LIVE = ["funded", "releasing", "refunding"];

const units = (amount) => parseUnits(Number(amount).toFixed(USDC_DECIMALS), USDC_DECIMALS);
const usdc = (value) => Number(formatUnits(value, USDC_DECIMALS));
const round2 = (n) => Math.round(n * 100) / 100;
const isTxHash = (s) => typeof s === "string" && /^0x[0-9a-fA-F]{64}$/.test(s);

const arcError = (err, what) =>
  err instanceof PaymentError ? err : new PaymentError(`Arc couldn't ${what}: ${chainMessage(err)}`, 502);

function requireEscrow() {
  const escrow = escrowAddress();
  if (!escrow) throw new PaymentError("Paying with USDC on Arc isn't available right now.", 503);
  return escrow;
}

// ---- The account's wallet ---------------------------------------------------------

// The wallet saved on the account (/pay-with-arc): connected with MetaMask or typed in.
// For a freelancer it's where Arc jobs pay out. (arc_wallet_verified_at = when it was saved.)
export async function getArcWallet(userId) {
  const { rows } = await pool.query("SELECT arc_wallet, arc_wallet_verified_at FROM users WHERE id = $1", [userId]);
  return rows[0]?.arc_wallet ? { address: rows[0].arc_wallet, savedAt: rows[0].arc_wallet_verified_at } : null;
}

// Saves a new wallet. A mixed-case address must have a valid checksum (EIP-55), which catches
// most typos in a typed address. Jobs already funded keep paying the old one.
export async function saveArcWallet(userId, address) {
  if (typeof address !== "string" || !isAddress(address.trim())) {
    throw new PaymentError("That isn't a valid wallet address. Check it for typos (0x followed by 40 characters).", 400);
  }
  await pool.query("UPDATE users SET arc_wallet = $2, arc_wallet_verified_at = NOW() WHERE id = $1", [userId, getAddress(address.trim())]);
  return getArcWallet(userId);
}

export async function unlinkArcWallet(userId) {
  await pool.query("UPDATE users SET arc_wallet = NULL, arc_wallet_verified_at = NULL WHERE id = $1", [userId]);
}

// ---- Hire & pay -------------------------------------------------------------------

async function getHireContext(proposalId) {
  if (!/^\d+$/.test(String(proposalId))) return null;
  const { rows } = await pool.query(
    `SELECT pr.id, pr.status, pr.price_per_video, to_char(pr.delivery_date, 'YYYY-MM-DD') AS delivery_date,
            p.client_id, p.video_count, u.arc_wallet, jp.status AS paypal_status_of_payment
     FROM proposals pr
     JOIN projects p ON p.id = pr.project_id
     JOIN users u ON u.id = pr.freelancer_id
     LEFT JOIN job_payments jp ON jp.proposal_id = pr.id
     WHERE pr.id = $1`,
    [proposalId],
  );
  return rows[0] ?? null;
}

const getRow = async (proposalId) =>
  (await pool.query("SELECT * FROM job_arc_payments WHERE proposal_id = $1", [proposalId])).rows[0] ?? null;

// The database is shared by servers on different networks (e.g. local on testnet, Vercel on
// mainnet). A server only touches payments made on its own network: its RPC and keys can't
// read or move the others.
const onThisNetwork = (row) => Number(row?.chain_id) === ARC.chainId;
function requireThisNetwork(row) {
  if (row && !onThisNetwork(row)) {
    throw new PaymentError(`This job was paid on ${arcByChainId(row.chain_id).name}. Manage it on the ShortWorks site that runs on that network.`, 409);
  }
}

// The terms as the contract sees them (bigints).
const termsOf = (row) => ({
  jobId: BigInt(row.escrow_job_id),
  client: row.client_wallet,
  freelancer: row.freelancer_wallet,
  amount: units(row.amount),
  fee: units(row.fee),
  expiresAt: BigInt(Math.floor(new Date(row.expires_at).getTime() / 1000)),
  signatureDeadline: BigInt(Math.floor(new Date(row.signature_deadline).getTime() / 1000)),
});

// What the browser needs to send fundWithPermit (bigints as strings for JSON).
async function checkoutPayload(row) {
  const escrow = requireEscrow();
  const terms = termsOf(row);
  const [signature, token] = await Promise.all([signTerms(escrow, terms), readUsdc(row.client_wallet)]);
  return {
    escrow,
    chainId: ARC.chainId,
    terms: Object.fromEntries(Object.entries(terms).map(([k, v]) => [k, String(v)])),
    signature,
    usdc: { address: ARC.usdc, name: token.name, version: token.version, nonce: String(token.nonce) },
  };
}

// Step 1: the client picked a wallet. Checks the hire, then returns terms signed by ShortWorks.
export async function startArcCheckout(proposalId, viewer, wallet) {
  const escrow = requireEscrow();
  const h = await getHireContext(proposalId);
  if (!h) throw new PaymentError("Proposal not found.", 404);
  if (h.client_id !== viewer.id) throw new PaymentError("Only the project owner can hire.", 403);
  if (!isWalletAddress(wallet ?? "")) throw new PaymentError("Connect the wallet you want to pay from.", 400);
  const client = getAddress(wallet);

  let row = await getRow(h.id);
  // A tab may have paid an earlier attempt and closed before telling us.
  if (row?.status === "signed" && (await syncSignedPayment(h.id).catch(() => false))) row = await getRow(h.id);
  if (row && row.status !== "signed" && row.status !== "refunded") throw new PaymentError("This freelancer is already paid for.");
  if (["authorized", "capturing", "captured", "voiding"].includes(h.paypal_status_of_payment)) {
    throw new PaymentError("This freelancer is already paid for with PayPal.");
  }
  const blocker = hireBlocker({ status: h.status, deliveryDate: h.delivery_date, arcWallet: h.arc_wallet, method: "arc" });
  if (blocker) throw new PaymentError(blocker);
  const freelancer = getAddress(h.arc_wallet);
  if (isAddressEqual(client, freelancer)) throw new PaymentError("Pay from a different wallet than the freelancer's.", 400);

  const amount = round2(Number(h.price_per_video) * h.video_count);
  const fee = platformFeeFor(amount);
  try {
    const { balance } = await readUsdc(client);
    if (balance < units(amount)) {
      throw new PaymentError(
        `This wallet has ${usdc(balance)} USDC on ${ARC.name}. You need ${amount} USDC, plus a little more for the network fee.`,
      );
    }
  } catch (err) {
    throw arcError(err, "read your balance");
  }

  // Same terms again for a double click or a second tab, so only one of them can be funded.
  const same =
    row?.status === "signed" &&
    isAddressEqual(row.client_wallet, client) &&
    isAddressEqual(row.freelancer_wallet, freelancer) &&
    Number(row.amount) === amount &&
    isAddressEqual(row.escrow_address, escrow) &&
    new Date(row.signature_deadline).getTime() > Date.now() + 5 * 60_000;
  if (same) return checkoutPayload(row);

  // A fresh id the contract hasn't seen (another database may share this escrow, e.g. dev and prod on testnet).
  let escrowJobId;
  for (let i = 0; i < 5 && !escrowJobId; i++) {
    const { rows } = await pool.query("SELECT nextval('job_arc_escrow_job_id_seq') AS id");
    const onChain = await readEscrowJob(escrow, rows[0].id).catch((err) => {
      throw arcError(err, "prepare the payment");
    });
    if (onChain.status === "none") escrowJobId = rows[0].id;
  }
  if (!escrowJobId) throw new PaymentError("Couldn't prepare the payment. Please try again.", 503);

  const expiresAt = new Date(
    Date.parse(`${h.delivery_date}T23:59:59Z`) + AUTO_APPROVE_HOURS * 3_600_000 + ARC_RECLAIM_BUFFER_DAYS * DAY,
  );
  const signatureDeadline = new Date(Date.now() + SIGNATURE_MINUTES * 60_000);
  const { rows } = await pool.query(
    `INSERT INTO job_arc_payments (proposal_id, chain_id, escrow_address, escrow_job_id, client_wallet, freelancer_wallet,
                                   amount, fee, expires_at, signature_deadline, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'signed')
     ON CONFLICT (proposal_id) DO UPDATE SET
       chain_id = EXCLUDED.chain_id, escrow_address = EXCLUDED.escrow_address, escrow_job_id = EXCLUDED.escrow_job_id,
       client_wallet = EXCLUDED.client_wallet, freelancer_wallet = EXCLUDED.freelancer_wallet, amount = EXCLUDED.amount,
       fee = EXCLUDED.fee, expires_at = EXCLUDED.expires_at, signature_deadline = EXCLUDED.signature_deadline,
       status = 'signed', fund_tx = NULL, settle_tx = NULL, settled_by = NULL, last_error = NULL, updated_at = NOW()
     WHERE job_arc_payments.status IN ('signed', 'refunded')
     RETURNING *`,
    [h.id, ARC.chainId, escrow, escrowJobId, client, freelancer, amount, fee, expiresAt, signatureDeadline],
  );
  if (!rows[0]) throw new PaymentError("This freelancer is already paid for.");
  return checkoutPayload(rows[0]);
}

// Step 2: the client's fund transaction was sent. Reads it from the chain, then hires.
export async function completeArcCheckout(proposalId, txHash, viewer) {
  const h = await getHireContext(proposalId);
  if (!h) throw new PaymentError("Proposal not found.", 404);
  if (h.client_id !== viewer.id) throw new PaymentError("Only the project owner can hire.", 403);
  if (!isTxHash(txHash)) throw new PaymentError("That isn't a transaction hash.", 400);
  const row = await getRow(h.id);
  requireThisNetwork(row);
  if (row?.status === "funded" && h.status === "accepted") return true; // already done (retry)
  if (row?.status !== "signed") throw new PaymentError("This payment is no longer valid. Please start again.");

  let receipt;
  try {
    receipt = await waitForReceipt(txHash);
  } catch (err) {
    throw new PaymentError(`Couldn't find the transaction on ${ARC.name} yet (${chainMessage(err)}). Refresh in a minute; if the payment went through, the hire completes on its own.`, 502);
  }
  if (receipt.status !== "success") throw new PaymentError("The transaction failed on Arc, so no USDC was taken. Please try again.");
  const funded = escrowEvents(receipt, row.escrow_address, "Funded").some((e) => e.args.jobId === BigInt(row.escrow_job_id));
  if (!funded) throw new PaymentError("This transaction didn't pay for this job.", 400);
  return confirmFunding(row, txHash);
}

// The money is in the escrow for `row`: check it against the signed terms and hire.
// If the hire can't happen any more, the money is sent back. Returns true when hired.
async function confirmFunding(row, txHash) {
  const job = await readEscrowJob(row.escrow_address, row.escrow_job_id).catch((err) => {
    throw arcError(err, "read the payment");
  });
  const t = termsOf(row);
  if (
    job.status !== "funded" ||
    !isAddressEqual(job.client, t.client) ||
    !isAddressEqual(job.freelancer, t.freelancer) ||
    job.amount !== t.amount ||
    job.fee !== t.fee
  ) {
    throw new PaymentError("The USDC held on Arc doesn't match this job. Contact support.", 409);
  }

  const h = await getHireContext(row.proposal_id);
  const client = await pool.connect();
  let hired = false;
  try {
    await client.query("BEGIN");
    const claimed = await client.query(
      "UPDATE job_arc_payments SET status = 'funded', fund_tx = COALESCE($2, fund_tx), updated_at = NOW() WHERE id = $1 AND status = 'signed'",
      [row.id, txHash],
    );
    if (!claimed.rowCount) {
      // Someone else (the other tab, the cron) confirmed it first; they did the hire.
      await client.query("ROLLBACK");
      return true;
    }
    // Only at the price that was signed, and only if nobody changed the proposal meanwhile.
    const priceNow = round2(Number(h.price_per_video) * h.video_count);
    if (priceNow === Number(row.amount)) {
      const res = await client.query(
        `UPDATE proposals SET status = 'accepted', accepted_at = NOW(), job_status = 'in_progress',
                status_before_dispute = NULL, completed_at = NULL
         WHERE id = $1 AND status = 'pending'`,
        [row.proposal_id],
      );
      hired = res.rowCount === 1;
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  if (!hired) {
    await arcRefund(row.proposal_id).catch(() => {});
    throw new PaymentError("The proposal changed while you were paying. Your USDC is being returned to your wallet.");
  }
  await notifyProposalDecision(row.proposal_id, "accepted");
  return true;
}

// A 'signed' payment that may have been funded without us hearing (tab closed): hires if so.
// Returns true when it was funded.
export async function syncSignedPayment(proposalId) {
  const row = await getRow(proposalId);
  if (row?.status !== "signed" || !onThisNetwork(row)) return false;
  const job = await readEscrowJob(row.escrow_address, row.escrow_job_id);
  if (job.status === "none") return false;
  if (job.status === "funded") await confirmFunding(row, null).catch(() => {});
  return true;
}

// ---- Paying out or giving back ----------------------------------------------------

export async function hasLiveArcPayment(proposalId) {
  const { rows } = await pool.query("SELECT 1 FROM job_arc_payments WHERE proposal_id = $1 AND status = ANY($2)", [proposalId, LIVE]);
  return rows.length > 0;
}

// Records a release or refund that happened on-chain.
async function markSettled(id, status, txHash, by) {
  await pool.query(
    `UPDATE job_arc_payments SET status = $2, settle_tx = COALESCE($3, settle_tx), settled_by = COALESCE($4, settled_by),
            last_error = NULL, updated_at = NOW()
     WHERE id = $1`,
    [id, status, txHash, by],
  );
}

// Sends release or refund from ShortWorks' operator wallet. Safe against double clicks: only
// the call that moves the row from 'funded' to 'releasing' / 'refunding' talks to the chain.
async function settleAsOperator(proposalId, kind) {
  const busy = kind === "release" ? "releasing" : "refunding";
  const done = kind === "release" ? "released" : "refunded";
  requireThisNetwork(await getRow(proposalId));
  const { rows } = await pool.query(
    `UPDATE job_arc_payments SET status = $2, updated_at = NOW()
     WHERE proposal_id = $1 AND status = 'funded' AND chain_id = $3 RETURNING *`,
    [proposalId, busy, ARC.chainId],
  );
  const p = rows[0];
  if (!p) return null;
  try {
    const hash = await sendAsOperator(p.escrow_address, kind, [BigInt(p.escrow_job_id)]);
    await markSettled(p.id, done, hash, operatorAddress());
    return done;
  } catch (err) {
    // It may already have happened on-chain (the client released, the freelancer refunded...).
    const job = await readEscrowJob(p.escrow_address, p.escrow_job_id).catch(() => null);
    if (job?.status === "released" || job?.status === "refunded") {
      await markSettled(p.id, job.status, null, null);
      if (job.status === done) return done;
      throw new PaymentError(job.status === "released" ? "The USDC was already paid to the freelancer." : "The USDC was already returned to the client.");
    }
    await pool.query("UPDATE job_arc_payments SET status = 'funded', last_error = $2, updated_at = NOW() WHERE id = $1", [p.id, chainMessage(err)]);
    throw arcError(err, kind === "release" ? "pay the freelancer" : "return the USDC");
  }
}

// Pays the freelancer (and the fee) from the escrow: auto-approve, dispute decided for the freelancer,
// or a client approving without their wallet.
export async function arcRelease(proposalId) {
  const result = await settleAsOperator(proposalId, "release");
  if (!result) throw new PaymentError("There's no held USDC to pay out for this job. Refresh and try again.");
}

// Gives the USDC back to the client: undo hire, dispute decided for the client. No-op when nothing is held.
export async function arcRefund(proposalId) {
  await settleAsOperator(proposalId, "refund");
}

// The client released from their own wallet: check the transaction, then record it.
export async function confirmClientRelease(proposalId, txHash) {
  if (!isTxHash(txHash)) throw new PaymentError("That isn't a transaction hash.", 400);
  const row = await getRow(proposalId);
  requireThisNetwork(row);
  if (!row || !["funded", "released"].includes(row.status)) throw new PaymentError("There's no held USDC for this job. Refresh and try again.");
  let receipt;
  try {
    receipt = await waitForReceipt(txHash);
  } catch (err) {
    throw new PaymentError(`Couldn't find the transaction on ${ARC.name} yet (${chainMessage(err)}). Try again in a minute.`, 502);
  }
  const released = receipt.status === "success" &&
    escrowEvents(receipt, row.escrow_address, "Released").some((e) => e.args.jobId === BigInt(row.escrow_job_id));
  if (!released) throw new PaymentError("This transaction didn't pay out this job.", 400);
  await markSettled(row.id, "released", txHash, receipt.from);
}

// Freezes the escrow while a dispute is open (the client can't reclaim), or unfreezes it.
// No-op for jobs not paid on Arc.
export async function arcSetFrozen(proposalId, frozen) {
  const row = await getRow(proposalId);
  if (row?.status !== "funded") return;
  requireThisNetwork(row);
  try {
    await sendAsOperator(row.escrow_address, "setFrozen", [BigInt(row.escrow_job_id), frozen]);
  } catch (err) {
    throw arcError(err, frozen ? "put the payment on hold" : "take the payment off hold");
  }
}

// ---- Reads ------------------------------------------------------------------------

export async function getArcPayment(proposalId) {
  const p = await getRow(proposalId);
  if (!p || p.status === "signed") return null;
  const net = arcByChainId(p.chain_id);
  return {
    method: "arc",
    status: p.status,
    amount: Number(p.amount),
    platformFee: Number(p.fee),
    netToFreelancer: round2(Number(p.amount) - Number(p.fee)),
    currency: "USDC",
    expiresAt: p.expires_at,
    network: net.name,
    explorerUrl: net.explorerUrl,
    escrow: p.escrow_address,
    escrowJobId: String(p.escrow_job_id),
    chainId: p.chain_id,
    clientWallet: p.client_wallet,
    freelancerWallet: p.freelancer_wallet,
    fundTx: p.fund_tx,
    settleTx: p.settle_tx,
    settledByClient: Boolean(p.settled_by && isAddressEqual(p.settled_by, p.client_wallet)),
    updatedAt: p.updated_at,
  };
}

// ---- Daily check (cron) -----------------------------------------------------------

// Lines the database up with the chain: hires paid in a tab that closed, releases and refunds
// made outside ShortWorks (client released, freelancer refunded, client reclaimed after expiry),
// operator calls that crashed half way. Warns about held payments close to expiry.
// Only payments on this server's network (see onThisNetwork).
// Returns { outcomes: [{ proposalId, outcome }], ... } for lib/jobs.js to move the jobs.
export async function reconcileArcPayments() {
  const { rows } = await pool.query(
    `SELECT * FROM job_arc_payments
     WHERE chain_id = $1
       AND (status IN ('funded', 'releasing', 'refunding')
            OR (status = 'signed' AND signature_deadline > NOW() - INTERVAL '2 days'))`,
    [ARC.chainId],
  );
  const outcomes = [];
  for (const row of rows) {
    try {
      if (row.status === "signed") {
        if (await syncSignedPayment(row.proposal_id)) outcomes.push({ proposalId: row.proposal_id, outcome: "funded" });
        continue;
      }
      const job = await readEscrowJob(row.escrow_address, row.escrow_job_id);
      if (job.status === "released" || job.status === "refunded") {
        await markSettled(row.id, job.status, null, null);
        outcomes.push({ proposalId: row.proposal_id, outcome: job.status });
      } else if (row.status !== "funded" && Date.now() - new Date(row.updated_at).getTime() > 10 * 60_000) {
        // An operator call that never finished: the money is still held.
        await pool.query("UPDATE job_arc_payments SET status = 'funded', updated_at = NOW() WHERE id = $1", [row.id]);
        outcomes.push({ proposalId: row.proposal_id, outcome: "unstuck" });
      } else if (row.status === "funded" && !job.frozen && job.expiresAt < new Date(Date.now() + 3 * DAY)) {
        await notifyPaymentExpiring(row.proposal_id);
        outcomes.push({ proposalId: row.proposal_id, outcome: "expiring" });
      }
    } catch (err) {
      outcomes.push({ proposalId: row.proposal_id, outcome: "error", error: chainMessage(err) });
    }
  }
  return outcomes;
}
