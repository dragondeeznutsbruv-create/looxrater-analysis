import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Looxrater — Facial Proportion & Symmetry Report" },
      {
        name: "description",
        content:
          "Upload one front-facing photo. Looxrater measures facial landmarks and reports proportions and symmetry against classical references — measurements, not beauty judgments.",
      },
      { property: "og:title", content: "Looxrater — Facial Proportion & Symmetry Report" },
      {
        property: "og:description",
        content: "Deterministic landmark measurements of facial proportion and symmetry.",
      },
    ],
  }),
  component: Landing,
});

const STEPS = [
  {
    n: "01",
    t: "Upload one photo",
    d: "Front-facing, neutral expression, even light. Processing happens on your device.",
  },
  {
    n: "02",
    t: "468 landmarks detected",
    d: "A facial-mesh model locates landmark coordinates. No model scores your face.",
  },
  {
    n: "03",
    t: "Proportions computed",
    d: "Ten geometric measurements: thirds, fifths, symmetry, fWHR, canthal tilt and more.",
  },
  {
    n: "04",
    t: "Report delivered",
    d: "Every figure shown with its reference value and how it was derived.",
  },
];

function Landing() {
  return (
    <Shell>
      <section className="pt-8">
        <p className="eyebrow">Deterministic facial geometry</p>
        <h1 className="mt-4 text-5xl leading-[1.02] tracking-tight">
          Your face,
          <br />
          <span className="text-brass italic">measured</span> — not judged.
        </h1>
        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
          Looxrater detects facial landmarks and computes fixed proportion and symmetry
          measurements. The harmony index reports conformity to classical proportion references. It
          is not an objective measure of attractiveness.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Button asChild size="lg" className="h-13 rounded-full text-base">
            <Link to="/analyze">Start an analysis</Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="h-12 rounded-full">
            <Link to="/method">How the numbers are derived</Link>
          </Button>
        </div>
      </section>

      <section className="surface mt-10 grid grid-cols-3 divide-x divide-border p-5 text-center">
        {[
          ["468", "landmarks"],
          ["10", "measurements"],
          ["0", "opinions"],
        ].map(([v, l]) => (
          <div key={l} className="px-1">
            <div className="font-display text-brass text-3xl">{v}</div>
            <div className="eyebrow mt-1 text-[10px]">{l}</div>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <p className="eyebrow">The process</p>
        <ol className="mt-5 space-y-6">
          {STEPS.map((s) => (
            <li key={s.n} className="grid grid-cols-[auto_minmax(0,1fr)] gap-4">
              <span className="font-mono shrink-0 text-xs text-primary">{s.n}</span>
              <div className="min-w-0">
                <h3 className="text-lg leading-tight">{s.t}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="surface mt-12 p-6">
        <p className="eyebrow">Privacy by default</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Landmark detection runs in your browser. Your photo is stored in private storage that only
          your account can read, reports stay unlisted unless you publish them, and you can delete
          any photo or your entire account at any time.
        </p>
        <Button asChild variant="secondary" className="mt-5 w-full rounded-full">
          <Link to="/account">Privacy controls</Link>
        </Button>
      </section>

      <section className="mt-12">
        <p className="eyebrow">Pricing</p>
        <div className="surface mt-4 p-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
            <div className="min-w-0">
              <h3 className="text-2xl">Full report</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                One-time unlock, per report. Basic score and symmetry are always free.
              </p>
            </div>
            <span className="font-display text-brass shrink-0 text-3xl">$4</span>
          </div>
          <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
            {[
              "All ten measurements with reference values",
              "Landmark overlay and derivation notes",
              "Shareable results card",
              "Saved to your private history",
            ].map((f) => (
              <li key={f} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                <span className="text-primary">—</span>
                <span className="min-w-0">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </Shell>
  );
}
