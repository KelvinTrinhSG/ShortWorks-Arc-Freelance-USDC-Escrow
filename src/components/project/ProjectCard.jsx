import { VIDEO_LENGTHS, WORK_TYPES } from "@/data/projectOptions";
import { PLATFORMS, labelOf } from "@/data/talentOptions";

const formatDeadline = (date) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

// How a project reads to a freelancer: scope, cost, time and quality at a glance.
// Missing fields are skipped, so it also works as a live preview of a draft.
export default function ProjectCard({ project }) {
  const count = Number(project.videoCount) || 0;
  const perVideo = Number(project.budgetPerVideo) || 0;

  const scope = [
    project.workType && labelOf(WORK_TYPES, project.workType),
    project.platforms.length > 0 &&
      project.platforms.map((p) => labelOf(PLATFORMS, p)).join(", "),
    count > 0 &&
      `${count} × ${project.videoLength ? labelOf(VIDEO_LENGTHS, project.videoLength) : "?"}`,
  ].filter(Boolean);

  const terms = [
    perVideo > 0 &&
      `💰 $${perVideo}/video${count > 1 ? ` (total $${Math.round(perVideo * count * 100) / 100})` : ""}`,
    project.deadline && `⏰ Due ${formatDeadline(project.deadline)}`,
    project.references.length > 0 &&
      `▶ ${project.references.length} reference ${project.references.length === 1 ? "video" : "videos"}`,
  ].filter(Boolean);

  return (
    <div className="bdr1 bdrs8 p20 bgc-white">
      <h5 className="mb10">{project.title || "Untitled project"}</h5>
      {scope.length > 0 && <p className="text-thm fz14 mb5">{scope.join(" · ")}</p>}
      {terms.length > 0 && <p className="fz14 dark-color mb0">{terms.join(" · ")}</p>}
    </div>
  );
}
