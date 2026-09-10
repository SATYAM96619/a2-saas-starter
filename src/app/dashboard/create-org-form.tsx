"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOrganization } from "@/server/auth/organizations";

export default function CreateOrgForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await createOrganization({ userId, name });
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem" }}>
      <input type="text" placeholder="Organization name" value={name} onChange={(e) => setName(e.target.value)} required />
      <button type="submit" disabled={loading}>{loading ? "Creating..." : "Create"}</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  );
}
