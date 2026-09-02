import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Shell, Disclaimer } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { ScoreDial, MetricBar } from "@/components/ScoreDial";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/useAuth";
import { band, type AnalysisResult } from "@/lib/face";
import { UnlockSheet } from "@/components/UnlockSheet";

export const Route = createFileRoute("/report/$id")({
  head: () => ({
    meta: [
      { title: "Your proportion report — Looxrater" },
      {
        name: "description",
        content:
          "Facial proportion and symmetry measurements with reference values for each figure.",
      },
      { property: "og:title", content: "Your proportion report — Looxrater" },
      {
        property: "og:description",
        content: "Landmark measurements with reference values — not a beauty score.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportPage,
});

type ReportRow = {
  id: string;
  user_id: string;
  photo_path: string | null;
  metrics: AnalysisResult;
  harmony_score: number;
  unlocked: boolean;
  is_public: boolean;
  share_slug: string;
  created_at: string;
};

function ReportPage() {
  const { id } = Route.useParams();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", search: { redirect: `/report/${id}` } });
  }, [loading, session, navigate, id]);

  const { data: report, isLoading } = useQuery({
    queryKey: ["report", id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.from("reports").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as unknown as ReportRow | null;
    },
  });

  useEffect(() => {
    let active = true;
    if (!report?.photo_path) return;
    supabase.storage
      .from("photos")
      .createSignedUrl(report.photo_path, 3600)
      .then(({ data }) => {
        if (active) setPhotoUrl(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [report?.photo_path]);

  async function togglePublic(next: boolean) {
    if (!report) return;
    const { error } = await supabase.from("reports").update({ is_public: next }).eq("id", report.id);
    if (error) return toast.error("Could not update sharing");
    qc.setQueryData(["report", id], { ...report, is_public: next });
    toast.success(next ? "Share link is live" : "Share link disabled");
  }

  async function copyShare() {
    if (!report) return;
    const url = `${window.location.origin}/s/${report.share_slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "My Looxrater proportion report", url });
        return;
      } catch {
        /* fell through to clipboard */
      }
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  if (isLoading || !report) {
    return (
      <Shell>
        <p className="pt-16 text-center text-sm text-muted-foreground">
          {isLoading ? "Loading report…" : "Report not found."}
        </p>
      </Shell>
    );
  }

  const m = report.metrics;
  const free = m.metrics.slice(0, 3);
  const locked = m.metrics.slice(3);

  return (
    <Shell>
      <div className="pt-4">
        <p className="eyebrow">Report · {new Date(report.created_at).toLocaleDateString()}</p>

        <div className="mt-6 grid place-items-center">
          <ScoreDial score={Number(report.harmony_score)} label="harmony index" />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {band(Number(report.harmony_score))} — conformity to classical proportion references.
          </p>
          <Disclaimer className="mt-2 max-w-xs text-center" />
        </div>

        {photoUrl && (
          <img
            src={photoUrl}
            alt="Analysed photograph"
            className="mt-8 w-full rounded-[var(--radius-2xl)] border border-border object-cover"
          />
        )}

        <div className="surface mt-8 divide-y divide-border">
          {free.map((metric) => (
            <MetricRow key={metric.key} metric={metric} />
          ))}
        </div>

        {report.unlocked ? (
          <div className="surface mt-4 divide-y divide-border">
            {locked.map((metric) => (
              <MetricRow key={metric.key} metric={metric} />
            ))}
          </div>
        ) : (
          <div className="relative mt-4">
            <div className="surface pointer-events-none divide-y divide-border opacity-40 blur-[5px]">
              {locked.map((metric) => (
                <MetricRow key={metric.key} metric={metric} />
              ))}
            </div>
            <div className="absolute inset-0 grid place-items-center px-6">
              <div className="surface w-full p-6 text-center">
                <p className="eyebrow">{locked.length} more measurements</p>
                <h2 className="mt-2 text-2xl">Unlock the full report</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  One-time $4 unlock for this report. No subscription.
                </p>
                <Button className="mt-5 h-12 w-full rounded-full" onClick={() => setSheet(true)}>
                  Unlock — $4
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="surface mt-8 p-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
            <div className="min-w-0">
              <h2 className="text-lg leading-tight">Shareable card</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Publishes score and symmetry only. Never your photo.
              </p>
            </div>
            <Switch
              checked={report.is_public}
              onCheckedChange={togglePublic}
              className="shrink-0"
            />
          </div>
          {report.is_public && (
            <div className="mt-5 flex flex-col gap-2">
              <Button variant="secondary" className="h-11 rounded-full" onClick={copyShare}>
                Share link
              </Button>
              <Button asChild variant="ghost" className="h-11 rounded-full">
                <Link to="/s/$slug" params={{ slug: report.share_slug }}>
                  Preview card
                </Link>
              </Button>
            </div>
          )}
        </div>

        <Button asChild variant="ghost" className="mt-6 h-12 w-full rounded-full">
          <Link to="/account">All my reports</Link>
        </Button>
      </div>

      <UnlockSheet
        open={sheet}
        onOpenChange={setSheet}
        reportId={report.id}
        onUnlocked={() => qc.invalidateQueries({ queryKey: ["report", id] })}
      />
    </Shell>
  );
}

function MetricRow({ metric }: { metric: AnalysisResult["metrics"][number] }) {
  return (
    <div className="p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
        <h3 className="min-w-0 truncate text-base">{metric.label}</h3>
        <span className="font-mono shrink-0 text-sm text-primary">
          {metric.value}
          <span className="ml-1 text-[10px] text-muted-foreground">{metric.unit}</span>
        </span>
      </div>
      <div className="mt-3">
        <MetricBar value={metric.conformity} />
      </div>
      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-[11px] text-muted-foreground">
        <span className="min-w-0">{metric.description}</span>
        <span className="font-mono shrink-0">{metric.conformity}%</span>
      </div>
    </div>
  );
}
