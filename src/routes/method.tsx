import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/method")({
  head: () => ({
    meta: [
      { title: "Method — How Looxrater measures a face" },
      {
        name: "description",
        content:
          "Every Looxrater figure comes from landmark arithmetic: facial thirds, fifths, mirror symmetry, fWHR, canthal tilt and more, each with its reference value.",
      },
      { property: "og:title", content: "Method — How Looxrater measures a face" },
      {
        property: "og:description",
        content: "Landmark arithmetic, reference values, and the limits of the harmony index.",
      },
    ],
  }),
  component: Method,
});

const ITEMS: Array<[string, string, string]> = [
  ["Facial thirds", "Trichion → glabella → subnasale → menton", "Each band ≈ 33.3%"],
  ["Facial fifths", "Face edge, eye corners, face edge", "Each column ≈ 20%"],
  ["Mirror symmetry", "12 paired landmarks reflected across the midline", "Index 100 = identical"],
  ["fWHR", "Bizygomatic width ÷ brow-to-lip height", "≈ 1.90"],
  ["Intercanthal ratio", "Inner-corner distance ÷ eye width", "≈ 1.00"],
  ["Jaw-to-face width", "Gonial width ÷ bizygomatic width", "≈ 0.83"],
  ["Mouth-to-nose", "Mouth width ÷ alar width", "≈ 1.50"],
  ["Canthal tilt", "Angle inner corner → outer corner", "≈ +4°"],
  ["Chin-to-philtrum", "Chin height ÷ philtrum length", "≈ 2.20"],
  ["Lip ratio", "Lower vermilion ÷ upper vermilion", "≈ 1.60"],
];

function Method() {
  return (
    <Shell>
      <div className="pt-8">
        <p className="eyebrow">Method</p>
        <h1 className="mt-3 text-4xl leading-tight">
          Arithmetic on <span className="text-brass italic">coordinates</span>.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          A facial-mesh model returns landmark positions. Looxrater then applies fixed formulas to
          those coordinates. The same photo always produces the same numbers, and no model is asked
          whether a face looks good.
        </p>
      </div>

      <div className="surface mt-8 divide-y divide-border">
        {ITEMS.map(([name, how, ref]) => (
          <div key={name} className="p-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
              <h2 className="min-w-0 truncate text-lg">{name}</h2>
              <span className="font-mono shrink-0 text-xs text-primary">{ref}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{how}</p>
          </div>
        ))}
      </div>

      <div className="surface mt-8 p-6">
        <p className="eyebrow">What the score is not</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The harmony index averages how closely each measurement sits to its reference value. Those
          references come from neoclassical canons of proportion — historical drawing conventions,
          not biology. A low figure does not mean a face is unattractive, and a high one does not
          mean it is attractive. Beauty is not a quantity, and this tool does not claim to measure
          it. Results also shift with head tilt, lens distance, and expression.
        </p>
      </div>

      <Button asChild size="lg" className="mt-8 h-13 w-full rounded-full">
        <Link to="/analyze">Run an analysis</Link>
      </Button>
    </Shell>
  );
}
