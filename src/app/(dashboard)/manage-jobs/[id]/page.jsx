import { permanentRedirect } from "next/navigation";

// The job page moved to /job-single/{id}, shared by the freelancer and the client.
export default async function page({ params }) {
  const { id } = await params;
  permanentRedirect(`/job-single/${encodeURIComponent(id)}`);
}
