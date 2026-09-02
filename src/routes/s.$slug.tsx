import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { ScoreDial } from "@/components/ScoreDial";
import { band, type AnalysisResult } from "@/lib/face";

export const Route = createFileRoute("/s/$slug")({
  head: () => ({
    meta: [
      { title: "A Looxrater proportion card" },
      {
        name: "description",
        content:
          "A shared facial-proportion card: harmony index and symmetry from landmark measurements. Not a beauty score.",
      },
      { property: "og:title", content: "A Looxrater proportion card" },
      {
        property: "og:description",
        content: "Harmony index and symmetry from deterministic landmark measurements.",
      },
    ],
  }),
  component: SharedCard,
});

function SharedCard() {
  const { slug } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["shared", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("harmony_score, metrics, created_at, is_public")
        .eq("share_slug", slug)
        .eq("is_public", true)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as {
        harmony_score: number;
        metrics: AnalysisResult;
        created_at: string;
      } | null;
    },
  });

  if (isLoading) {
    return (
      <Shell>
        <p className="pt-16 text-center text-sm text-muted-foreground">Loading card…</p>
      </Shell>
    );
  }

  if (!data) {
    return (
      <Shell>
        <div className="pt-16 text-center">
          <h1 className="text-3xl">This card isn't shared</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            The owner has turned sharing off, or the link is wrong.
          </p>
          <Button asChild className="mt-8 h-12 rounded-full px-8">
            <Link to="/">Go to Looxrater</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  const score = Number(data.harmony_score);

  return (
    <Shell>
      <div className="pt-6">
        <div className="surface overflow-hidden">
          <div className="grid place-items-center px-6 pt-10 pb-8">
            <p className="eyebrow">Looxrater proportion card</p>
            <div className="mt-6">
              <ScoreDial score={score} label="harmony index" size={196} />
            </div>
            <p className="mt-5 text-center text-sm text-muted-foreground">{band(score)}</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
            <Stat label="symmetry" value={data.metrics.symmetryIndex.toFixed(1)} />
            <Stat label="landmarks" value={String(data.metrics.landmarkCount)} />
          </div>
        </div>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
          Geometric conformity to classical proportion references. Not an objective measure of
          attractiveness.
        </p>

        <Button asChild size="lg" className="mt-8 h-13 w-full rounded-full">
          <Link to="/analyze">Measure your own proportions</Link>
        </Button>
      </div>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-5 text-center">
      <div className="font-display text-brass text-2xl">{value}</div>
      <div className="eyebrow mt-1 text-[10px]">{label}</div>
    </div>
  );
}
