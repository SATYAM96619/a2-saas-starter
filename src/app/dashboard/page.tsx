import { redirect } from "next/navigation";
import { auth } from "@/server/auth/config";
import { getUserOrganizations } from "@/server/auth/organizations";
import CreateOrgForm from "./create-org-form";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const orgs = await getUserOrganizations(session.user.id);

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem", maxWidth: 500 }}>
      <h1>Dashboard</h1>
      <p>Signed in as {session.user.email}</p>

      <h2>Your organizations</h2>
      {orgs.length === 0 ? (
        <p>You don't belong to any organizations yet.</p>
      ) : (
        <ul>
          {orgs.map(({ organization, role }) => (
            <li key={organization.id}>{organization.name} — <strong>{role}</strong></li>
          ))}
        </ul>
      )}

      <h2>Create an organization</h2>
      <CreateOrgForm userId={session.user.id} />
    </main>
  );
}
