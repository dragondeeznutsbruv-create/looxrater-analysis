/**
 * Deterministic facial-landmark measurement.
 *
 * Everything here is arithmetic on detected landmark coordinates. No model
 * judges beauty: we measure distances/angles and report how closely they match
 * widely cited neoclassical proportion references. The resulting "harmony
 * index" is a conformity figure, not a measure of attractiveness.
 */

export type Pt = { x: number; y: number };

export type MetricKey =
  | "thirds"
  | "fifths"
  | "symmetry"
  | "fwhr"
  | "eyeSpacing"
  | "jawWidth"
  | "mouthNose"
  | "canthalTilt"
  | "lowerThird"
  | "lipRatio";

export type Metric = {
  key: MetricKey;
  label: string;
  /** Measured value, already normalised (ratio, %, or degrees). */
  value: number;
  unit: string;
  /** Reference value from the neoclassical canon used for conformity scoring. */
  reference: number;
  /** 0-100 conformity to the reference. */
  conformity: number;
  description: string;
};

export type AnalysisResult = {
  metrics: Metric[];
  harmony: number;
  symmetryIndex: number;
  landmarkCount: number;
  imageWidth: number;
  imageHeight: number;
};

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** Score how close `value` is to `ref`; `tolerance` is the relative spread that maps to ~0. */
function conform(value: number, ref: number, tolerance: number): number {
  if (!isFinite(value) || ref === 0) return 0;
  const rel = Math.abs(value - ref) / Math.abs(ref);
  const score = 100 * (1 - rel / tolerance);
  return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
}

const round = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d;

/** MediaPipe FaceMesh indices used by the measurements. */
const I = {
  trichion: 10,
  glabella: 9,
  subnasale: 2,
  menton: 152,
  faceL: 234,
  faceR: 454,
  jawL: 172,
  jawR: 397,
  eyeROuter: 33,
  eyeRInner: 133,
  eyeLInner: 362,
  eyeLOuter: 263,
  mouthL: 61,
  mouthR: 291,
  lipTop: 0,
  lipMid: 13,
  lipBottom: 17,
  noseL: 48,
  noseR: 278,
  browR: 105,
  browL: 334,
  cheekR: 116,
  cheekL: 345,
} as const;

/** Paired landmarks used for the mirror-symmetry deviation. */
const PAIRS: Array<[number, number]> = [
  [I.eyeROuter, I.eyeLOuter],
  [I.eyeRInner, I.eyeLInner],
  [I.mouthL, I.mouthR],
  [I.noseL, I.noseR],
  [I.browR, I.browL],
  [I.cheekR, I.cheekL],
  [I.jawL, I.jawR],
  [I.faceL, I.faceR],
  [58, 288],
  [93, 323],
  [132, 361],
  [50, 280],
];

export function analyseLandmarks(raw: Pt[], width: number, height: number): AnalysisResult {
  // Work in pixel space so ratios are geometrically meaningful.
  const p = raw.map((l) => ({ x: l.x * width, y: l.y * height }));
  const g = (i: number): Pt => p[i] ?? { x: 0, y: 0 };

  const faceWidth = dist(g(I.faceL), g(I.faceR));
  

  // --- Facial thirds -------------------------------------------------------
  const upper = Math.abs(g(I.glabella).y - g(I.trichion).y);
  const middle = Math.abs(g(I.subnasale).y - g(I.glabella).y);
  const lower = Math.abs(g(I.menton).y - g(I.subnasale).y);
  const totalThirds = upper + middle + lower || 1;
  const thirds = [upper, middle, lower].map((v) => (v / totalThirds) * 100);
  const thirdsDev = thirds.reduce((s, v) => s + Math.abs(v - 100 / 3), 0) / 3;

  // --- Facial fifths -------------------------------------------------------
  const xs = [I.faceL, I.eyeROuter, I.eyeRInner, I.eyeLInner, I.eyeLOuter, I.faceR].map(
    (i) => g(i).x,
  );
  const sorted = [...xs].sort((a, b) => a - b);
  const spans: number[] = [];
  for (let i = 1; i < sorted.length; i++) spans.push((sorted[i] ?? 0) - (sorted[i - 1] ?? 0));
  const spanTotal = spans.reduce((a, b) => a + b, 0) || 1;
  const fifths = spans.map((s) => (s / spanTotal) * 100);
  const fifthsDev = fifths.reduce((s, v) => s + Math.abs(v - 20), 0) / fifths.length;

  // --- Mirror symmetry -----------------------------------------------------
  const axisTop = g(I.trichion);
  const axisBottom = g(I.menton);
  const ax = axisBottom.x - axisTop.x;
  const ay = axisBottom.y - axisTop.y;
  const axisLen = Math.hypot(ax, ay) || 1;
  const signedDist = (q: Pt) => ((q.x - axisTop.x) * ay - (q.y - axisTop.y) * ax) / axisLen;
  const projection = (q: Pt) => ((q.x - axisTop.x) * ax + (q.y - axisTop.y) * ay) / axisLen;

  let devSum = 0;
  for (const [a, b] of PAIRS) {
    if (!p[a] || !p[b]) continue;
    const lateral = Math.abs(Math.abs(signedDist(g(a))) - Math.abs(signedDist(g(b))));
    const vertical = Math.abs(projection(g(a)) - projection(g(b)));
    devSum += Math.hypot(lateral, vertical);
  }
  const meanDev = devSum / PAIRS.length / (faceWidth || 1);
  const symmetryIndex = Math.max(0, Math.min(100, Math.round((1 - meanDev * 6) * 1000) / 10));

  // --- Individual ratios ---------------------------------------------------
  const bizygomatic = dist(g(I.cheekR), g(I.cheekL));
  const browToLip = Math.abs(g(I.lipTop).y - (g(I.browR).y + g(I.browL).y) / 2);
  const fwhr = bizygomatic / (browToLip || 1);

  const eyeWidth = (dist(g(I.eyeROuter), g(I.eyeRInner)) + dist(g(I.eyeLOuter), g(I.eyeLInner))) / 2;
  const intercanthal = dist(g(I.eyeRInner), g(I.eyeLInner));
  const eyeSpacing = intercanthal / (eyeWidth || 1);

  const jawWidth = dist(g(I.jawL), g(I.jawR)) / (faceWidth || 1);

  const mouthWidth = dist(g(I.mouthL), g(I.mouthR));
  const noseWidth = dist(g(I.noseL), g(I.noseR));
  const mouthNose = mouthWidth / (noseWidth || 1);

  const tiltR =
    (Math.atan2(g(I.eyeRInner).y - g(I.eyeROuter).y, Math.abs(g(I.eyeROuter).x - g(I.eyeRInner).x)) *
      180) /
    Math.PI;
  const tiltL =
    (Math.atan2(g(I.eyeLInner).y - g(I.eyeLOuter).y, Math.abs(g(I.eyeLOuter).x - g(I.eyeLInner).x)) *
      180) /
    Math.PI;
  const canthalTilt = round((tiltR + tiltL) / 2, 2);

  const philtrum = Math.abs(g(I.lipTop).y - g(I.subnasale).y);
  const chin = Math.abs(g(I.menton).y - g(I.lipBottom).y);
  const lowerThird = chin / (philtrum || 1);

  const upperLip = Math.abs(g(I.lipMid).y - g(I.lipTop).y);
  const lowerLip = Math.abs(g(I.lipBottom).y - g(I.lipMid).y);
  const lipRatio = lowerLip / (upperLip || 1);

  const metrics: Metric[] = [
    {
      key: "thirds",
      label: "Facial thirds balance",
      value: round(thirdsDev, 2),
      unit: "% mean deviation",
      reference: 0,
      conformity: Math.max(0, Math.min(100, Math.round((100 - thirdsDev * 9) * 10) / 10)),
      description: `Upper ${(thirds[0] ?? 0).toFixed(1)}% · middle ${(thirds[1] ?? 0).toFixed(1)}% · lower ${(thirds[2] ?? 0).toFixed(1)}%. The canon divides the face into three equal bands.`,
    },
    {
      key: "fifths",
      label: "Facial fifths balance",
      value: round(fifthsDev, 2),
      unit: "% mean deviation",
      reference: 0,
      conformity: Math.max(0, Math.min(100, Math.round((100 - fifthsDev * 11) * 10) / 10)),
      description: `Horizontal segments measure ${fifths.map((f) => f.toFixed(0) + "%").join(" · ")}. The canon divides face width into five equal columns.`,
    },
    {
      key: "symmetry",
      label: "Mirror symmetry",
      value: symmetryIndex,
      unit: "index",
      reference: 100,
      conformity: symmetryIndex,
      description:
        "Average positional difference between 12 paired landmarks reflected across the vertical midline.",
    },
    {
      key: "fwhr",
      label: "Facial width-to-height (fWHR)",
      value: round(fwhr, 2),
      unit: "ratio",
      reference: 1.9,
      conformity: conform(fwhr, 1.9, 0.45),
      description: "Cheekbone width divided by the brow-to-upper-lip height.",
    },
    {
      key: "eyeSpacing",
      label: "Intercanthal ratio",
      value: round(eyeSpacing, 2),
      unit: "ratio",
      reference: 1.0,
      conformity: conform(eyeSpacing, 1.0, 0.35),
      description: "Distance between inner eye corners relative to one eye's width.",
    },
    {
      key: "jawWidth",
      label: "Jaw-to-face width",
      value: round(jawWidth, 2),
      unit: "ratio",
      reference: 0.83,
      conformity: conform(jawWidth, 0.83, 0.3),
      description: "Gonial width relative to the widest point of the face.",
    },
    {
      key: "mouthNose",
      label: "Mouth-to-nose width",
      value: round(mouthNose, 2),
      unit: "ratio",
      reference: 1.5,
      conformity: conform(mouthNose, 1.5, 0.4),
      description: "Mouth width divided by alar (nostril) width.",
    },
    {
      key: "canthalTilt",
      label: "Canthal tilt",
      value: canthalTilt,
      unit: "°",
      reference: 4,
      conformity: conform(canthalTilt + 10, 14, 0.6),
      description: "Angle from the inner to the outer eye corner, averaged across both eyes.",
    },
    {
      key: "lowerThird",
      label: "Chin-to-philtrum",
      value: round(lowerThird, 2),
      unit: "ratio",
      reference: 2.2,
      conformity: conform(lowerThird, 2.2, 0.5),
      description: "Chin height relative to philtrum length within the lower third.",
    },
    {
      key: "lipRatio",
      label: "Lower-to-upper lip",
      value: round(lipRatio, 2),
      unit: "ratio",
      reference: 1.6,
      conformity: conform(lipRatio, 1.6, 0.6),
      description: "Vermilion height of the lower lip relative to the upper lip.",
    },
  ];

  const harmony =
    Math.round((metrics.reduce((s, m) => s + m.conformity, 0) / metrics.length) * 10) / 10;

  return {
    metrics,
    harmony,
    symmetryIndex,
    landmarkCount: raw.length,
    imageWidth: width,
    imageHeight: height,
  };
}


export function band(score: number): string {
  if (score >= 85) return "Very close to canon";
  if (score >= 70) return "Close to canon";
  if (score >= 55) return "Moderately close";
  if (score >= 40) return "Diverges from canon";
  return "Strongly diverges from canon";
}

let landmarkerPromise: Promise<{
  detect: (img: HTMLImageElement | HTMLCanvasElement) => Pt[] | null;
}> | null = null;

/** Loads the MediaPipe face landmarker in the browser (lazily, once). */
export async function getLandmarker() {
  if (typeof window === "undefined") throw new Error("Landmarker is browser-only");
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await import("@mediapipe/tasks-vision");
      const fileset = await vision.FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm",
      );
      const landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        },
        runningMode: "IMAGE",
        numFaces: 1,
      });
      return {
        detect: (img: HTMLImageElement | HTMLCanvasElement) => {
          const res = landmarker.detect(img);
          const lm = res.faceLandmarks?.[0];
          if (!lm || lm.length < 400) return null;
          return lm.map((l) => ({ x: l.x, y: l.y }));
        },
      };
    })();
  }
  return landmarkerPromise;
}
