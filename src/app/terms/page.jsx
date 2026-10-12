import Footer from "@/components/footer/Footer";
import Header20 from "@/components/header/Header20";
import {
  ARC_RECLAIM_BUFFER_DAYS,
  AUTO_APPROVE_HOURS,
  DISPUTE_DECISION_HOURS,
  MAX_DELIVERY_DAYS,
  PLATFORM_FEE_PERCENT,
  estimateEarnings,
} from "@/data/projectOptions";

export const metadata = {
  title: "ShortWorks - Terms & Conditions",
};

// Terms for hiring and getting paid (docs/payments.md §12). Draft wording: have it
// reviewed before going live. Numbers come from data/projectOptions.js.
const example = estimateEarnings(100);

const SECTIONS = [
  {
    id: "fees",
    title: "Fees",
    body: [
      "The client pays exactly the price agreed in the freelancer's proposal (price per video × number of videos).",
      `ShortWorks charges a platform fee of ${PLATFORM_FEE_PERCENT}%, taken from the freelancer's side. PayPal's processing fee is also taken from the freelancer's side.`,
      `Example: on a $100 job, the freelancer receives about $${example.net.toFixed(2)} ($${example.platformFee.toFixed(2)} platform fee, about $${example.paypalFee.toFixed(2)} PayPal fee). The exact PayPal fee is shown on the job once the payment is taken.`,
    ],
  },
  {
    id: "payments",
    title: "How payment works",
    body: [
      "Freelancers connect their own PayPal account. Clients can only hire freelancers whose PayPal account is connected and able to receive payments.",
      "When a client hires, PayPal holds (authorizes) the full amount on the client's PayPal account. Nothing is charged yet.",
      "The money is taken only when the work is approved. It goes directly from the client to the freelancer's PayPal account; ShortWorks only receives the platform fee. ShortWorks never holds users' money.",
      "If the client undoes the hire before any work is delivered, the hold is released and the client is not charged.",
    ],
  },
  {
    id: "arc",
    title: "Paying with USDC on Arc",
    body: [
      "Clients can also pay in USDC on the Arc network, from a wallet such as MetaMask, if the freelancer has added an Arc wallet on the Pay With Arc page (by connecting MetaMask or entering the address). Freelancers are responsible for the address being correct: USDC sent to a wrong address can't be recovered.",
      "When a client hires, the full amount goes from the client's wallet into the ShortWorks escrow smart contract. The contract, not ShortWorks, holds the USDC, and it can only send it to the freelancer's wallet, back to the client's wallet, or the platform fee to ShortWorks.",
      `When the work is approved, the contract pays the freelancer and the ${PLATFORM_FEE_PERCENT}% platform fee in one transaction. There is no payment processor fee: on a 100 USDC job the freelancer receives ${100 - PLATFORM_FEE_PERCENT} USDC.`,
      "Network fees on Arc are paid in USDC by whoever sends the transaction: the client when hiring and approving, ShortWorks for automatic approvals, undoing a hire and dispute decisions. They are very small but the client needs a little more USDC than the job price.",
      "If the client undoes the hire before any work is delivered, or a dispute is decided for the client, all the USDC goes back to the client's wallet.",
      `As a safety net, if a job is still not settled ${Math.ceil(AUTO_APPROVE_HOURS / 24) + ARC_RECLAIM_BUFFER_DAYS} days after the delivery date, the client can take the USDC back directly from the contract, without ShortWorks. This is paused while a dispute is open.`,
      "Transactions on a blockchain can't be reversed. Check you're on the right network and wallet before confirming in your wallet. On the Arc testnet, USDC has no real value.",
    ],
  },
  {
    id: "timing",
    title: "Delivery and review times",
    body: [
      `The delivery date can be at most ${MAX_DELIVERY_DAYS} days after hiring, because PayPal holds a payment for a limited time.`,
      `After each delivery, the client has ${AUTO_APPROVE_HOURS} hours to approve or request changes. Without an answer, the work is approved automatically and the freelancer is paid: the freelancer can claim the payment from the job page right away, otherwise ShortWorks pays it within a day.`,
    ],
  },
  {
    id: "revisions",
    title: "Change requests",
    body: [
      "When requesting changes, the client says clearly what to change.",
      "Change requests must stay within the original brief. New work outside the brief is a new project.",
    ],
  },
  {
    id: "disputes",
    title: "Disputes",
    body: [
      "Either side can open a dispute while the job is in progress or waiting for review, by choosing a reason and describing the problem.",
      "Evidence is what is on the job page: the brief, the reference videos, every delivery, change requests and notes. Keep the conversation about the job there.",
      `During a dispute the payment stays on hold and the job is not approved automatically. The ShortWorks team decides within ${DISPUTE_DECISION_HOURS} hours of the dispute being opened, every day of the week including holidays, and sooner if the PayPal hold is about to expire. For USDC on Arc, the escrow is frozen during the dispute so neither side can move the money.`,
      "The decision is all or nothing: either the freelancer is paid in full, or the payment is released to the client and the job is cancelled. Payments are not split.",
      "The side that opened a dispute can withdraw it at any time before the decision; the job then continues where it was.",
    ],
  },
  {
    id: "limits",
    title: "ShortWorks' role",
    body: [
      "ShortWorks connects clients and freelancers and runs the hiring and review process. Payments are processed by PayPal, or held by the escrow contract on Arc.",
      "Payment disputes raised directly with PayPal (outside ShortWorks) follow PayPal's own policies.",
    ],
  },
];

export default function page() {
  return (
    <>
      <Header20 />
      <section className="our-terms pt50 pb90">
        <div className="container">
          <div className="main-title">
            <h2>Terms and Conditions</h2>
            <p className="text">How hiring, payment and disputes work on ShortWorks.</p>
          </div>
          <div className="row">
            <div className="col-md-3 mb30">
              <nav className="position-sticky" style={{ top: 100 }}>
                <ul className="list-unstyled mb-0">
                  {SECTIONS.map((s) => (
                    <li key={s.id} className="mb10">
                      <a href={`#${s.id}`} className="dark-color">
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
            <div className="col-md-9">
              {SECTIONS.map((s, i) => (
                <div key={s.id} id={s.id} className="mb40" style={{ scrollMarginTop: 100 }}>
                  <h4 className="mb15">
                    {i + 1}. {s.title}
                  </h4>
                  <ul className="ps-3 mb-0">
                    {s.body.map((line) => (
                      <li key={line} className="text mb10">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
