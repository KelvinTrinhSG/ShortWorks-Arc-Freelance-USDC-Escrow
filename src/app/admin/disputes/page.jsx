import Footer from "@/components/footer/Footer";
import Header20 from "@/components/header/Header20";
import DisputeDecision from "@/components/project/DisputeDecision";
import { DISPUTE_REASONS } from "@/data/projectOptions";
import { labelOf } from "@/data/talentOptions";
import { isAdmin } from "@/lib/admin";
import { getOpenDisputes } from "@/lib/jobs";
import { getViewer } from "@/lib/viewer";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata = { title: "ShortWorks - Disputes" };

const formatDateTime = (d) =>
  new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

// ShortWorks staff (ADMIN_EMAILS): open disputes, the most urgent decision first.
export default async function page() {
  if (!(await isAdmin(await getViewer()))) notFound();
  const disputes = await getOpenDisputes();
  const now = Date.now();

  return (
    <>
      <Header20 />
      <section className="pt30 pb90">
        <div className="container">
          <h2 className="mb5">Disputes</h2>
          <p className="text mb30">
            Decide within 48 hours of opening (sooner if the PayPal hold expires first). Pay the
            freelancer in full, or release the payment to the client.
          </p>

          {disputes.length === 0 && <p className="text">No open disputes. 🎉</p>}

          {disputes.map((d) => {
            const late = new Date(d.decideBy).getTime() < now;
            return (
              <div key={d.id} className="bgc-white bdrs12 p30 mb30 default-box-shadow1" style={late ? { borderLeft: "4px solid #b91c1c" } : undefined}>
                <div className="d-flex flex-wrap justify-content-between gap-2 mb10">
                  <h5 className="mb-0">
                    <Link href={`/jobs/${d.id}`} className="dark-color">
                      {d.title}
                    </Link>
                  </h5>
                  <span className={`fw500 ${late ? "text-danger" : "dark-color"}`}>
                    Decide by {formatDateTime(d.decideBy)}
                    {late && " · overdue"}
                  </span>
                </div>
                <p className="fz14 text mb10">
                  Client {d.clientName} · Freelancer {d.freelancerName} ·{" "}
                  {d.currency === "USDC" ? `${d.amount.toFixed(2)} USDC` : `$${d.amount.toFixed(2)}`} ·{" "}
                  {d.paymentStatus === "authorized"
                    ? `held by PayPal${d.expiresAt ? ` until ${formatDateTime(d.expiresAt)}` : ""}`
                    : d.paymentStatus === "funded"
                      ? "held in the Arc escrow (frozen during the dispute)"
                      : `payment ${d.paymentStatus ?? "missing"}`}
                </p>
                <p className="fz14 dark-color mb5">
                  <strong>{d.openedBy}</strong> opened it {formatDateTime(d.openedAt)} ·{" "}
                  {labelOf(DISPUTE_REASONS, d.reason)}
                </p>
                <p className="fz14 text mb-0" style={{ whiteSpace: "pre-line" }}>
                  “{d.note}”
                </p>
                <Link href={`/jobs/${d.id}`} className="fz14 text-thm d-inline-block mt10">
                  See the brief, deliveries and activity ↗
                </Link>
                <DisputeDecision
                  jobId={d.id}
                  amount={d.currency === "USDC" ? `${d.amount.toFixed(2)} USDC` : `$${d.amount.toFixed(2)}`}
                  isArc={d.currency === "USDC"}
                  freelancerName={d.freelancerName}
                  clientName={d.clientName}
                />
              </div>
            );
          })}
        </div>
      </section>
      <Footer />
    </>
  );
}
