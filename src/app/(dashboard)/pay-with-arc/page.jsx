import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardNavigation from "@/components/dashboard/header/DashboardNavigation";
import ArcWallet from "@/components/dashboard/profile/ArcWallet";
import MobileNavigation2 from "@/components/header/MobileNavigation2";
import { ARC } from "@/data/arc";
import { getArcWallet } from "@/lib/arcPayments";
import { getViewer } from "@/lib/viewer";

const formatDay = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const metadata = {
  title: "ShortWorks - Pay With Arc",
};

// Connect a wallet (MetaMask or typed in) and see its USDC balance on Arc. The wallet is saved on
// the account and shown again next time; for freelancers it's where Arc jobs pay out
// (docs/arc-payments.md §4). proxy.js sends guests to /login.
export default async function page() {
  const viewer = await getViewer();
  const isFreelancer = viewer?.accountType === "freelancer";
  const saved = viewer ? await getArcWallet(viewer.id) : null;
  return (
    <>
      <MobileNavigation2 />
      <DashboardLayout>
        <div className="dashboard__content hover-bgc-color">
          <div className="row pb40">
            <div className="col-lg-12">
              <DashboardNavigation />
            </div>
            <div className="col-lg-9">
              <div className="dashboard_title_area">
                <h2>Pay With Arc</h2>
                <p className="text">
                  {isFreelancer
                    ? "Add your wallet to get paid in USDC on Arc, and see its balance."
                    : "Connect your wallet to see your USDC balance on the Arc network."}
                </p>
                {/* Freelancers only: their payout wallet (refreshed after each save / remove in ArcWallet). */}
                {isFreelancer && saved && (
                  <div
                    className="d-flex align-items-center gap-3 bdrs12 p20 mt20"
                    style={{ background: "#ecfdf3", border: "1px solid #86d6a6", borderLeft: "6px solid #16a34a" }}
                  >
                    <span
                      className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0 fz20"
                      style={{ width: 48, height: 48, background: "#16a34a", color: "#fff" }}
                      aria-hidden
                    >
                      ✓
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <p className="fz15 fw600 mb5" style={{ color: "#15803d" }}>
                        Your payout wallet is set: clients' USDC on Arc goes here
                      </p>
                      <a
                        href={`${ARC.explorerUrl}/address/${saved.address}`}
                        target="_blank"
                        rel="noreferrer"
                        className="fz18 fw600 dark-color d-inline-block"
                        style={{ fontFamily: "monospace", wordBreak: "break-all" }}
                        title={`Open on ${ARC.name} explorer`}
                      >
                        {saved.address} ↗
                      </a>
                      {saved.savedAt && (
                        <p className="fz13 text mb-0 mt5">
                          Saved {formatDay(saved.savedAt)} · {ARC.name}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {isFreelancer && !saved && (
                  <div
                    className="d-flex align-items-center gap-3 bdrs12 p20 mt20"
                    style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderLeft: "6px solid #f59e0b" }}
                  >
                    <span
                      className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0 fz20 fw700"
                      style={{ width: 48, height: 48, background: "#f59e0b", color: "#fff" }}
                      aria-hidden
                    >
                      !
                    </span>
                    <div>
                      <p className="fz16 fw600 mb5" style={{ color: "#b45309" }}>
                        No wallet saved yet
                      </p>
                      <p className="fz14 dark-color mb-0">
                        Clients can&apos;t pay you in USDC until you add one. Connect MetaMask or enter your address below.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="ps-widget bgc-white bdrs4 p30 mb30">
            <ArcWallet
              isFreelancer={isFreelancer}
              saved={saved && { address: saved.address, savedAt: saved.savedAt?.toISOString() ?? null }}
            />
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
