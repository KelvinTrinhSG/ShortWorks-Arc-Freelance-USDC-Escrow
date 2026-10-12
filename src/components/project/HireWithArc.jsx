"use client";
import { ARC } from "@/data/arc";
import ESCROW_ABI from "@/data/arcEscrowAbi.json";
import { platformFeeFor } from "@/data/projectOptions";
import { connectWallet, getEthereum, sendTransaction, switchToArc, waitForTransaction, walletErrorMessage } from "@/lib/metamask";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { encodeFunctionData, erc20Abi, parseSignature } from "viem";

const PERMIT_TYPES = {
  EIP712Domain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
  ],
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

async function post(proposalId, body) {
  const res = await fetch(`/api/proposals/${proposalId}/arc-checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Nothing was charged.");
  return data;
}

// The USDC permit (EIP-2612) lets the escrow take exactly this amount in the same transaction
// as the funding. Returns the fundWithPermit call, or null if the wallet can't sign permits.
async function permitCall(eth, from, prep, terms) {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const typed = {
    domain: { name: prep.usdc.name, version: prep.usdc.version, chainId: prep.chainId, verifyingContract: prep.usdc.address },
    types: PERMIT_TYPES,
    primaryType: "Permit",
    message: { owner: from, spender: prep.escrow, value: prep.terms.amount, nonce: prep.usdc.nonce, deadline: String(deadline) },
  };
  let sig;
  try {
    sig = await eth.request({ method: "eth_signTypedData_v4", params: [from, JSON.stringify(typed)] });
  } catch (err) {
    if (err.code === 4001) throw err;
    return null;
  }
  const { r, s, v, yParity } = parseSignature(sig);
  return encodeFunctionData({
    abi: ESCROW_ABI,
    functionName: "fundWithPermit",
    args: [terms, prep.signature, { deadline, v: Number(v ?? 27n + BigInt(yParity)), r, s }],
  });
}

// Hire & pay with USDC on Arc (docs/arc-payments.md §3): the client's USDC goes into the
// ShortWorksEscrow contract, the job starts, and it's paid out when the client approves.
// `proposal`: { id, hire: { amount, arc: { blocker } }, freelancer: { displayName } }.
export default function HireWithArc({ proposal, label }) {
  const router = useRouter();
  const { hire, freelancer } = proposal;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(""); // what's happening now; "" = idle
  const [error, setError] = useState("");
  const fee = platformFeeFor(hire.amount);
  const text = label ?? `Hire & pay ${hire.amount} USDC`;

  if (hire.arc.blocker) {
    return (
      <div>
        <button type="button" className="btn btn-sm btn-outline-dark" disabled>
          {text}
        </button>
        <p className="fz13 text mt5 mb-0">{hire.arc.blocker}</p>
      </div>
    );
  }

  const pay = async () => {
    setError("");
    let sent = false;
    try {
      const eth = getEthereum();
      setStep("Connect your wallet in MetaMask…");
      const from = await connectWallet(eth);
      await switchToArc(eth, ARC);

      setStep("Preparing the payment…");
      const prep = await post(proposal.id, { wallet: from });
      const terms = {
        jobId: BigInt(prep.terms.jobId),
        client: prep.terms.client,
        freelancer: prep.terms.freelancer,
        amount: BigInt(prep.terms.amount),
        fee: BigInt(prep.terms.fee),
        expiresAt: BigInt(prep.terms.expiresAt),
        signatureDeadline: BigInt(prep.terms.signatureDeadline),
      };

      setStep(`Sign the USDC permit in MetaMask (allows exactly ${hire.amount} USDC)…`);
      let data = await permitCall(eth, from, prep, terms);
      if (!data) {
        // This wallet can't sign permits: approve the amount first (an extra transaction).
        setStep(`Approve ${hire.amount} USDC in MetaMask (1 of 2)…`);
        const approveHash = await sendTransaction(eth, {
          from,
          to: prep.usdc.address,
          data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [prep.escrow, terms.amount] }),
        });
        await waitForTransaction(eth, approveHash);
        data = encodeFunctionData({ abi: ESCROW_ABI, functionName: "fund", args: [terms, prep.signature] });
      }

      setStep("Confirm the payment in MetaMask…");
      const hash = await sendTransaction(eth, { from, to: prep.escrow, data });
      sent = true;
      setStep("Holding the payment and starting the job…");
      await waitForTransaction(eth, hash);
      await post(proposal.id, { txHash: hash });
      router.push(`/jobs/${proposal.id}`);
    } catch (err) {
      setStep("");
      setError(
        sent
          ? `${walletErrorMessage(err)} If the payment went through, the hire completes on its own; refresh the page in a minute.`
          : `${walletErrorMessage(err)} Nothing was charged.`,
      );
    }
  };

  const busy = Boolean(step);
  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-dark"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        {text}
      </button>
      {open && (
        <div
          className="confirm-dialog-backdrop d-flex align-items-center justify-content-center p-3"
          onMouseDown={(e) => e.target === e.currentTarget && !busy && setOpen(false)}
        >
          <div className="confirm-dialog bgc-white bdrs12 p30" role="dialog" aria-modal="true" aria-labelledby="arc-hire-title">
            <h4 id="arc-hire-title" className="mb10">
              Hire {freelancer.displayName} for {hire.amount} USDC
            </h4>
            {ARC.isTestnet && (
              <span className="badge rounded-pill mb10" style={{ color: "#b45309", background: "#fef3c7" }}>
                {ARC.name} · test USDC, no real value
              </span>
            )}
            <p className="text fz14 mb10">
              Your {hire.amount} USDC is <strong>held in the ShortWorks escrow contract</strong> on {ARC.name}, not by
              ShortWorks. When you approve the delivered videos, {freelancer.displayName} receives{" "}
              {Math.round((hire.amount - fee) * 100) / 100} USDC and {fee} USDC is the platform fee. Undo the hire before
              any work is delivered and it all comes back to your wallet.
            </p>
            <p className="text fz13 mb20">
              You need {hire.amount} USDC on {ARC.name} plus a little more for the network fee (paid in USDC).{" "}
              <Link href="/terms#arc" className="text-thm" target="_blank">
                How it works
              </Link>
            </p>
            {busy ? (
              <p className="dark-color fw500 mb-0">{step}</p>
            ) : (
              <button type="button" className="ud-btn btn-thm w-100" onClick={pay}>
                <img src="/images/icon/metamask-logo.svg" alt="" width={20} height={20} className="me-2" />
                Pay {hire.amount} USDC with MetaMask
              </button>
            )}
            {error && <p className="text-danger fz14 mt10 mb-0">{error}</p>}
            {!busy && (
              <div className="text-end mt15">
                <button type="button" className="ud-btn btn-white bdr1" onClick={() => setOpen(false)}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
