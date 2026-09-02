import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Shell, Disclaimer } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/useAuth";
import { analyseLandmarks, getLandmarker } from "@/lib/face";

export const Route = createFileRoute("/analyze")({
  head: () => ({
    meta: [
      { title: "New analysis — Looxrater" },
      {
        name: "description",
        content:
          "Upload a front-facing photo. Landmarks are detected in your browser and proportions are computed on the spot.",
      },
      { property: "og:title", content: "New analysis — Looxrater" },
      {
        property: "og:description",
        content: "On-device landmark detection and proportion measurement.",
      },
    ],
  }),
  component: Analyze,
});

const PHASES = [
  "Preparing image",
  "Loading landmark model",
  "Detecting 468 landmarks",
  "Computing proportions",
  "Saving report",
];

function Analyze() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [phase, setPhase] = useState(-1);
  const [storePhoto, setStorePhoto] = useState(true);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", search: { redirect: "/analyze" } });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function run() {
    if (!file || !session) return;
    try {
      setPhase(0);
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
      const w = Math.round(bitmap.width * scale);
      const h = Math.round(bitmap.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);

      setPhase(1);
      const landmarker = await getLandmarker();

      setPhase(2);
      const pts = landmarker.detect(canvas);
      if (!pts) {
        setPhase(-1);
        toast.error("No face detected. Use a clear, front-facing photo with even lighting.");
        return;
      }

      setPhase(3);
      const result = analyseLandmarks(pts, w, h);

      setPhase(4);
      let photoPath: string | null = null;
      if (storePhoto) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("photos").upload(path, file, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });
        if (error) toast.warning("Photo could not be saved; the report will be numbers only.");
        else photoPath = path;
      }

      const { data, error } = await supabase
        .from("reports")
        .insert({
          user_id: session.user.id,
          photo_path: photoPath,
          harmony_score: result.harmony,
          metrics: result as unknown as Record<string, unknown>,
        })
        .select("id")
        .single();
      if (error) throw error;

      navigate({ to: "/report/$id", params: { id: data.id } });
    } catch (err) {
      setPhase(-1);
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    }
  }

  const running = phase >= 0;

  return (
    <Shell>
      <div className="pt-6">
        <p className="eyebrow">New analysis</p>
        <h1 className="mt-3 text-4xl leading-tight">Upload a front-facing photo.</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Neutral expression, hair off the face, camera at eye level, even lighting. Head tilt and
          close-up lens distortion change the measurements.
        </p>
      </div>

      <button
        type="button"
        onClick={() => !running && inputRef.current?.click()}
        className="surface mt-7 grid w-full place-items-center overflow-hidden p-0"
        style={{ aspectRatio: "3 / 4" }}
      >
        {preview ? (
          <img
            src={preview}
            alt="Photo selected for analysis"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="px-8 text-center text-sm text-muted-foreground">
            Tap to choose or take a photo
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      {running ? (
        <div className="surface mt-6 p-5">
          <p className="eyebrow">Analysing</p>
          <ol className="mt-4 space-y-3">
            {PHASES.map((p, i) => (
              <li
                key={p}
                className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 text-sm ${
                  i <= phase ? "text-foreground" : "text-muted-foreground/50"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    i < phase ? "bg-primary" : i === phase ? "animate-pulse bg-primary" : "bg-border"
                  }`}
                />
                <span className="min-w-0 truncate">{p}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <>
          <label className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
            <span className="min-w-0 text-sm">
              Keep the photo in my private storage
              <span className="block text-xs text-muted-foreground">
                Off means only the numbers are saved.
              </span>
            </span>
            <input
              type="checkbox"
              checked={storePhoto}
              onChange={(e) => setStorePhoto(e.target.checked)}
              className="h-5 w-5 shrink-0 accent-[var(--color-primary)]"
            />
          </label>

          <Button
            size="lg"
            className="mt-6 h-13 w-full rounded-full"
            disabled={!file}
            onClick={run}
          >
            Analyse proportions
          </Button>
          <Disclaimer className="mt-4" />
        </>
      )}
    </Shell>
  );
}
