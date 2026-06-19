import { z } from "zod";

export const inputTypeOptions = ["url", "image"] as const;
export const pageTypeOptions = ["landing_page", "homepage", "waitlist", "lead_capture"] as const;
export const viewportTypeOptions = ["desktop", "mobile"] as const;
export const analysisGoalOptions = ["lead_generation", "click_through", "sign_up", "awareness"] as const;
export const analysisStatusOptions = ["pending", "capturing", "processing", "reporting", "completed", "failed"] as const;

export type InputType = (typeof inputTypeOptions)[number];
export type PageType = (typeof pageTypeOptions)[number];
export type ViewportType = (typeof viewportTypeOptions)[number];
export type AnalysisGoal = (typeof analysisGoalOptions)[number];
export type AnalysisStatus = (typeof analysisStatusOptions)[number];

export const createAnalysisRequestSchema = z.object({
  projectId: z.string().uuid().optional(),
  inputType: z.enum(inputTypeOptions),
  pageType: z.enum(pageTypeOptions),
  goal: z.enum(analysisGoalOptions),
  url: z.string().url().optional(),
  screenshotUrl: z.string().url().optional(),
  uploadedFilePath: z.string().min(1).optional(),
  sourceLabel: z.string().min(1).max(120).optional(),
}).superRefine((value, ctx) => {
  if (value.inputType === "url" && !value.url) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["url"],
      message: "`url` e obrigatorio quando `inputType` for `url`.",
    });
  }

  if (value.inputType === "image" && !value.screenshotUrl && !value.uploadedFilePath) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["uploadedFilePath"],
      message: "envie `uploadedFilePath` (upload) ou `screenshotUrl` quando `inputType` for `image`.",
    });
  }
});

export const detectedElementSchema = z.object({
  id: z.string(),
  type: z.enum(["headline", "subheadline", "cta", "form", "logo", "nav", "hero_image", "trust_badge", "text_block"]),
  label: z.string().optional(),
  bbox: z.object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  }),
  aboveFold: z.boolean(),
  contrastScore: z.number().min(0).max(1).optional(),
});

export const visionWorkerResponseSchema = z.object({
  analysisId: z.string().uuid(),
  viewport: z.enum(viewportTypeOptions),
  artifacts: z.object({
    sourceImageUrl: z.string().url(),
    normalizedImageUrl: z.string().url(),
    heatmapUrl: z.string().url(),
    focusMapUrl: z.string().url(),
  }),
  elements: z.array(detectedElementSchema),
  attention: z.object({
    primaryRegions: z.array(z.object({
      x: z.number(),
      y: z.number(),
      intensity: z.number().min(0).max(1),
    })),
    gazePath: z.array(z.object({
      x: z.number(),
      y: z.number(),
      order: z.number().int().positive(),
    })),
    elementShares: z.array(z.object({
      elementId: z.string(),
      attentionShare: z.number().min(0).max(1),
    })),
  }),
  scores: z.object({
    ctaVisibility: z.number().min(0).max(1),
    headlineAttention: z.number().min(0).max(1),
    visualHierarchy: z.number().min(0).max(1),
    attentionCompetition: z.number().min(0).max(1),
    aboveTheFoldEfficiency: z.number().min(0).max(1),
    clutterScore: z.number().min(0).max(1),
  }),
});

export type CreateAnalysisRequest = z.infer<typeof createAnalysisRequestSchema>;
export type VisionWorkerResponse = z.infer<typeof visionWorkerResponseSchema>;
