# ShortWorks

**A freelance marketplace for short, fixed-price video work, with USDC escrow on Arc.**

Live: **https://shortworks.vercel.app** · Escrow contract on Arc mainnet: [`0xe69C9077b3F12939EFCd673171A4489f0f1370da`](https://explorer.arc.io/address/0xe69C9077b3F12939EFCd673171A4489f0f1370da)

---

## The problem we solve

Freelance marketplaces are built for long contracts. On short jobs, such as one 30-second video, their fees and rules take a large share of a small budget, and the platform sits between the two sides holding the money.

**What clients deal with today**

- They pay the platform up front, and the platform holds the money.
- If the job is cancelled, they wait days for a refund.
- Many platforms charge to post a job or to see more freelancers.
- On a small job, it is hard to see what each part of the price pays for.

**What freelancers deal with today**

- They pay to apply (paid bids or "connects") before they have earned anything.
- Platform fees of 10–20% are common, and the share is worse on small jobs.
- Earnings sit on the platform for days before they can be withdrawn.
- They lose more to the platform's currency conversion rates.
- Getting seen often means paying for ranking or promotion.

## What ShortWorks does

ShortWorks is a marketplace for short, fixed-price video work (TikTok, Reels, Shorts, Facebook). Each job has a price per video, a delivery date and a set number of revisions. Payment runs through an escrow smart contract on Arc, so neither the client nor the freelancer has to trust ShortWorks with the money.

## Benefits

**For clients (employers)**

- **The money is held, not taken.** USDC is locked in the escrow contract on Arc, or held as a PayPal authorization on the client's own account. ShortWorks never holds it.
- **Instant refund on cancel.** Cancel before delivery and the full amount goes straight back to the client's wallet.
- **No fee to post a project** or to invite freelancers.
- **Clear costs.** A price per video, a flat 5% fee, and the amounts shown before paying.
- **Pay only for approved work.** Money leaves escrow when the client approves, or when a dispute is decided.
- **A safety net.** If ShortWorks stopped running, the client could still take the money back from the contract after the deadline (`reclaim`), without us.

**For freelancers**

- **Free to apply.** No paid bids.
- **A flat 5% platform fee**, fixed when the job is funded. On a 100 USDC job, the freelancer receives 95 USDC.
- **Paid the moment the work is approved.** The contract sends the money straight to the freelancer's wallet, with nothing held back by the platform.
- **No waiting on a silent client.** 48 hours after delivery, the freelancer can claim the payment.
- **No currency markup.** USDC at market value, and Arc gas is paid in USDC, so there is only one token to hold.
- **No paid ranking.** Profiles and services are listed without paid placement.
- **Guaranteed payment.** The client's money is already in escrow before work starts, so the freelancer knows the job is funded.

## How payment works on Arc

ShortWorks deploys one contract, [`ShortWorksEscrow`](contracts/src/ShortWorksEscrow.sol). It holds USDC per job and works like PayPal's authorize / capture / void:

| Step | Contract call | Who sends it |
|---|---|---|
| Client hires the freelancer | `fundWithPermit` (or `approve` + `fund`): USDC moves from the client's wallet into escrow | Client |
| Client approves the delivery | `release`: `amount − fee` to the freelancer, `fee` to the treasury | Client, or the ShortWorks operator after 48 hours |
| Hire undone before delivery, or dispute decided for the client | `refund`: the full amount goes back to the client | Operator, or the freelancer (voluntary) |
| Dispute opened | `setFrozen`: pauses the safety deadline | Operator |
| ShortWorks disappears | `reclaim`: after `expiresAt`, the client takes the money back without us | Client |

**Safety properties:**

- **The server signs the terms (EIP-712), not the browser.** The amount, fee, freelancer wallet and deadline are signed by ShortWorks. Change any of them in the browser and `fund` reverts. A signature is valid for 30 minutes and only for the client wallet named in it.
- **Funds can only go to the three addresses fixed at funding:** the client, the freelancer and the treasury (fee only). A leaked operator key can release or refund early, but cannot move money anywhere else.
- **The fee is capped on-chain** (`MAX_FEE_BPS`), so a bad signature cannot take an oversized fee.
- **Pausing stops new funding only.** `release`, `refund` and `reclaim` keep working, so held funds never get stuck.
- **Roles are split.** The admin (pause, roles, treasury) is a separate wallet from the operator (sends release / refund) and the signer (only signs terms).
- **The server reads the chain itself.** A proposal becomes a job only after the server sees a `Funded` event that matches the signed terms in the transaction receipt. It never trusts the browser saying "paid".

Built with OpenZeppelin (`SafeERC20`, `AccessControl`, `Pausable`, `ReentrancyGuard`, `EIP712`, `ECDSA`) and tested with Foundry (30 tests).

> ⚠️ **The contract has not been audited.** It has been smoke-tested on Arc mainnet with small amounts (fund by permit, freeze, refund).

| | Arc Testnet | Arc Mainnet |
|---|---|---|
| Chain ID | 5042002 | 5042 |
| Escrow | `0xDCbD230Ee76458993cf2624c94530681e79BbC63` | `0xe69C9077b3F12939EFCd673171A4489f0f1370da` |
| USDC (ERC-20, 6 decimals) | `0x3600000000000000000000000000000000000000` | `0x3600000000000000000000000000000000000000` |
| Explorer | https://testnet.arcscan.app | https://explorer.arc.io |

## Features

- **Accounts:** sign up as a client or a freelancer, with sessions in an httpOnly JWT cookie and bcrypt-hashed passwords.
- **Profiles and talent directory:** public freelancer and employer profiles with sample videos. Test accounts and incomplete profiles are hidden.
- **Projects and proposals:** clients post a project (one video per project). Freelancers send proposals, and clients can invite freelancers to bid.
- **Services:** freelancers publish ready-made packages (price per video, delivery days, revisions). Ordering one creates a job directly.
- **Jobs:** In progress → Submitted → Completed, with Request changes, a 48-hour review with a Claim payment button, and disputes handled on an admin page.
- **Two ways to pay:** USDC on Arc (MetaMask) or PayPal (Multiparty: authorize at hire, capture on approval, void on cancel). PayPal currently runs on Sandbox.
- **Arc wallet page** (`/pay-with-arc`): connect MetaMask or paste an address (EIP-55 checked), see your USDC balance, and switch between testnet and mainnet.
- **Notifications** for every job step, and a **daily cron** that auto-approves overdue reviews and reconciles on-chain events (including a client's own `reclaim`) with the database.

## Tech stack

| Layer | Tools |
|---|---|
| App | Next.js 16 (App Router, Route Handlers), React 19, Bootstrap 5, Zustand |
| Database | PostgreSQL (hosted on Render), `pg`, plain SQL migrations in [`db/`](db) |
| Chain | Arc, USDC, [viem](https://viem.sh) on the server, MetaMask in the browser |
| Contract | Solidity, OpenZeppelin 5, Foundry |
| Other payments | PayPal Multiparty (REST API + webhooks) |
| Hosting | Vercel, with a Vercel cron at 01:00 UTC |

## Project structure

```
contracts/          ShortWorksEscrow (Foundry): src/, test/, script/Deploy.s.sol
db/                 SQL migrations, run in name order (001_users.sql … 013_hidden_accounts.sql)
docs/               Design notes per feature (written in Vietnamese)
scripts/migrate.mjs Runs every db/*.sql file against DATABASE_URL
src/app/            Pages and API routes (src/app/api/**/route.js)
src/components/     UI components
src/data/           Constants: Arc networks (arc.js), escrow ABI, fees and limits (projectOptions.js)
src/lib/            Server logic
  arc.js            Sign terms, read receipts, send release / refund / setFrozen
  arcPayments.js    Arc payment flow tied to jobs
  metamask.js       Browser wallet helpers
  paypal.js         PayPal API client
  payments.js       PayPal payment flow
  jobs.js           Job workflow, auto-approve, disputes
```


## Run it locally

Requirements: Node.js 20+ and a PostgreSQL database. Foundry is only needed for the contract.

```bash
npm install
# create .env.local (see below)
npm run db:migrate    # safe to run again
npm run dev           # http://localhost:3000
```

### Environment variables (`.env.local`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Signs the session JWT |
| `APP_BASE_URL` | Public URL of the app (PayPal redirects) |
| `ADMIN_EMAILS` | Comma-separated emails allowed on `/admin/disputes` |
| `CRON_SECRET` | Protects `/api/cron/daily` |
| `NEXT_PUBLIC_ARC_NETWORK` | `testnet` or `mainnet`. Every money action uses this network |
| `ARC_ESCROW_ADDRESS` | Escrow contract on that network |
| `ARC_SIGNER_PRIVATE_KEY` | Signs job terms only (never sends transactions) |
| `ARC_OPERATOR_PRIVATE_KEY` | Sends release / refund / setFrozen. Needs a little USDC for gas |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | PayPal app credentials |
| `PAYPAL_API_BASE` | `https://api-m.sandbox.paypal.com` or live |
| `PAYPAL_PARTNER_MERCHANT_ID`, `PAYPAL_BN_CODE`, `PAYPAL_WEBHOOK_ID` | PayPal Multiparty settings |

If `ARC_ESCROW_ADDRESS` or either Arc key is missing, the app hides every Arc button and PayPal keeps working. `NEXT_PUBLIC_*` values are baked in at build time, so restart `npm run dev` or redeploy after changing them.

### Contract

```bash
cd contracts
npm install                      # OpenZeppelin, forge-std
forge test                       # 30 tests
# contracts/.env: DEPLOYER_PRIVATE_KEY, ARC_ADMIN, ARC_OPERATOR, ARC_SIGNER, ARC_TREASURY
source .env && forge script script/Deploy.s.sol --rpc-url arc_testnet --broadcast --private-key $DEPLOYER_PRIVATE_KEY
npm run export-abi               # after a contract change: updates src/data/arcEscrowAbi.json
```

Testnet USDC for gas and payments: https://faucet.circle.com (choose Arc Testnet).

## Roadmap: AI agents

Next, we want people to be able to use ShortWorks through their own AI agents, not only through the website. **None of this is built yet.**

**A ShortWorks MCP server.** We will expose the marketplace as an [MCP](https://modelcontextprotocol.io) server, so any MCP-capable assistant (Claude, ChatGPT, Cursor and others) can act on a user's behalf, with that user's permissions.

**For clients**

- Connect an AI assistant to ShortWorks over MCP.
- Describe the video in plain language. The agent turns it into a complete project (scope, video length, platforms, budget, deadline) and posts it.
- The agent shortlists freelancers and services that fit, and summarises and compares the proposals.

**For freelancers**

- An agent publishes and updates services from a short description and sample links.
- It watches for new projects that match the freelancer's skills, rates and schedule.
- It drafts and sends proposals, with the freelancer approving before anything is sent.

**Faster, simpler disputes**

- Today a ShortWorks admin reads each dispute and decides by hand.
- An AI agent will gather the evidence (the brief, delivered links, revision requests, messages and deadlines), compare the delivery with what was agreed, and propose a decision with its reasons.
- Both sides see the proposed decision and can accept it or appeal to a human admin. The escrow contract stays the same: only `release` or `refund`, and only to the addresses fixed at funding.

**Guardrails.** Moving money stays behind explicit human approval. Signing a payment from a wallet, approving work and accepting a dispute decision remain actions the user confirms. An agent can prepare them, but not complete them on its own.

## Status

- ✅ Escrow contract deployed on Arc Testnet and Arc Mainnet, and wired into hiring, approval, undo, auto-approve, disputes and the daily cron.
- ✅ PayPal Multiparty flow on Sandbox.
- ⬜ Full end-to-end runs through the UI with two accounts on testnet.
- ⬜ External contract audit before handling meaningful amounts on mainnet.
- ⬜ ShortWorks MCP server and AI agents for clients, freelancers and disputes (see [Roadmap](#roadmap-ai-agents)).

Detailed design notes for each feature are in [`docs/`](docs). Start with [`docs/arc-payments.md`](docs/arc-payments.md).
