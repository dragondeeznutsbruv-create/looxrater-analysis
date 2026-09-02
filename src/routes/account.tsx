import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/useAuth";
import type { AnalysisResult } from "@/lib/face";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account & privacy — Looxrater" },
      {
        name: "description",
        content:
          "Manage your Looxrater reports, delete stored photos, disable sharing, and erase all of your data.",
      },
      { property: "og:title", content: "Account & privacy — Looxrater" },
      { property: "og:description", content: "Your reports, photos, sharing and deletion controls." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Account,
});

type Row = {
  id: string;
  photo_path: string | null;
  harmony_score: number;
  is_public: boolean;
  unlocked: boolean;
  created_at: string;
  metrics: AnalysisResult;
};

function Account() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", search: { redirect: "/account" } });
  }, [loading, session, navigate]);

  const { data: profile } = useQuery({
    queryKey: ["profile", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", session!.user.id)
        .maybeSingle();
      return data as { display_name: string | null } | null;
    },
  });

  useEffect(() => {
    if (profile?.display_name) setName(profile.display_name);
  }, [profile?.display_name]);

  const { data: reports } = useQuery({
    queryKey: ["reports", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, photo_path, harmony_score, is_public, unlocked, created_at, metrics")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  async function saveName() {
    if (!session) return;
    setSavingName(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: session.user.id, display_name: name });
    setSavingName(false);
    if (error) { toast.error("Could not save name"); return; }
    toast.success("Saved");
  }

  async function deletePhotos() {
    if (!reports) return;
    const paths = reports.map((r) => r.photo_path).filter(Boolean) as string[];
    if (!paths.length) { toast.info("No stored photos"); return; }
    const { error } = await supabase.storage.from("photos").remove(paths);
    if (error) { toast.error("Could not delete photos"); return; }
    await supabase
      .from("reports")
      .update({ photo_path: null })
      .in(
        "id",
        reports.map((r) => r.id),
      );
    qc.invalidateQueries({ queryKey: ["reports", session?.user.id] });
    toast.success(`${paths.length} photo(s) deleted`);
  }

  async function unshareAll() {
    if (!session) return;
    const { error } = await supabase
      .from("reports")
      .update({ is_public: false })
      .eq("user_id", session.user.id);
    if (error) { toast.error("Could not update sharing"); return; }
    qc.invalidateQueries({ queryKey: ["reports", session?.user.id] });
    toast.success("All share links disabled");
  }

  async function deleteReport(row: Row) {
    if (row.photo_path) await supabase.storage.from("photos").remove([row.photo_path]);
    const { error } = await supabase.from("reports").delete().eq("id", row.id);
    if (error) { toast.error("Could not delete report"); return; }
    qc.invalidateQueries({ queryKey: ["reports", session?.user.id] });
    toast.success("Report deleted");
  }

  async function deleteEverything() {
    if (!session || !reports) return;
    if (!confirm("Delete every report and photo? This cannot be undone.")) return;
    const paths = reports.map((r) => r.photo_path).filter(Boolean) as string[];
    if (paths.length) await supabase.storage.from("photos").remove(paths);
    await supabase.from("reports").delete().eq("user_id", session.user.id);
    qc.invalidateQueries({ queryKey: ["reports", session?.user.id] });
    toast.success("All data erased");
  }

  return (
    <Shell>
      <div className="pt-4">
        <p className="eyebrow">Account</p>
        <h1 className="mt-3 text-4xl leading-tight">Your data.</h1>
        <p className="mt-2 truncate text-sm text-muted-foreground">{session?.user.email}</p>

        <div className="surface mt-7 space-y-3 p-5">
          <Label htmlFor="name">Display name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 rounded-xl"
          />
          <Button
            variant="secondary"
            className="h-11 w-full rounded-full"
            disabled={savingName}
            onClick={saveName}
          >
            Save
          </Button>
        </div>

        <section className="mt-10">
          <p className="eyebrow">Reports</p>
          <div className="mt-4 space-y-3">
            {(reports ?? []).map((r) => (
              <div key={r.id} className="surface p-5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                  <div className="min-w-0">
                    <div className="font-display text-brass text-2xl leading-none">
                      {Number(r.harmony_score).toFixed(1)}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()} ·{" "}
                      {r.unlocked ? "full" : "basic"}
                      {r.is_public ? " · shared" : ""}
                      {r.photo_path ? " · photo stored" : ""}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="secondary" className="shrink-0 rounded-full">
                    <Link to="/report/$id" params={{ id: r.id }}>
                      Open
                    </Link>
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={() => deleteReport(r)}
                  className="mt-4 text-xs text-destructive underline underline-offset-4"
                >
                  Delete this report
                </button>
              </div>
            ))}
            {reports && reports.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No reports yet.{" "}
                <Link to="/analyze" className="text-primary underline underline-offset-4">
                  Run your first analysis
                </Link>
                .
              </p>
            )}
          </div>
        </section>

        <section className="surface mt-10 divide-y divide-border">
          <PrivacyRow
            title="Delete all stored photos"
            body="Removes every image from private storage. Numeric reports are kept."
            action="Delete photos"
            onClick={deletePhotos}
          />
          <PrivacyRow
            title="Disable every share link"
            body="Makes all published cards private again immediately."
            action="Unshare all"
            onClick={unshareAll}
          />
          <PrivacyRow
            title="Erase all my data"
            body="Deletes every report and photo tied to this account."
            action="Erase everything"
            destructive
            onClick={deleteEverything}
          />
        </section>

        <Button
          variant="ghost"
          className="mt-8 h-12 w-full rounded-full"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/" });
          }}
        >
          Sign out
        </Button>
      </div>
    </Shell>
  );
}

function PrivacyRow({
  title,
  body,
  action,
  onClick,
  destructive,
}: {
  title: string;
  body: string;
  action: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <div className="p-5">
      <h2 className="text-base leading-tight">{title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
      <Button
        variant={destructive ? "destructive" : "secondary"}
        className="mt-4 h-10 w-full rounded-full"
        onClick={onClick}
      >
        {action}
      </Button>
    </div>
  );
}
