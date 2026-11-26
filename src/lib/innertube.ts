import { z } from "@/lib/zod";

// Field names confirmed against real `ytInitialData` and `/youtubei/v1/next` responses via DevTools.
// YouTube publishes no official documentation for Innertube, and these names occasionally change
const likeEndpointSchema = z.object({
  likeParams: z.string().optional(),
  dislikeParams: z.string().optional(),
  removeLikeParams: z.string().optional()
});

export type RateParamField = keyof z.infer<typeof likeEndpointSchema>;

const signInEndpointSchema = z.object({
  nextEndpoint: z.object({ likeEndpoint: likeEndpointSchema.optional() }).optional()
});

const modalButtonSchema = z.object({
  buttonRenderer: z
    .object({
      navigationEndpoint: z.object({ signInEndpoint: signInEndpointSchema.optional() }).optional()
    })
    .optional()
});

const innertubeCommandSchema = z.object({
  likeEndpoint: likeEndpointSchema.optional(),
  modalEndpoint: z
    .object({
      modal: z
        .object({
          modalWithTitleAndButtonRenderer: z.object({ button: modalButtonSchema.optional() }).optional()
        })
        .optional()
    })
    .optional()
});

const buttonViewModelContainerSchema = z.object({
  buttonViewModel: z
    .object({
      onTap: z
        .object({
          serialCommand: z
            .object({
              commands: z.array(z.object({ innertubeCommand: innertubeCommandSchema.optional() })).optional()
            })
            .optional()
        })
        .optional()
    })
    .optional()
});

export type ButtonViewModelContainer = z.infer<typeof buttonViewModelContainerSchema>;

const toggleButtonViewModelContainerSchema = z.object({
  toggleButtonViewModel: z
    .object({
      toggleButtonViewModel: z
        .object({
          defaultButtonViewModel: buttonViewModelContainerSchema.optional(),
          toggledButtonViewModel: buttonViewModelContainerSchema.optional()
        })
        .optional()
    })
    .optional()
});

export type ToggleButtonViewModelContainer = z.infer<typeof toggleButtonViewModelContainerSchema>;

const segmentedLikeDislikeButtonSchema = z.object({
  likeButtonViewModel: z.object({ likeButtonViewModel: toggleButtonViewModelContainerSchema.optional() }).optional(),
  dislikeButtonViewModel: z
    .object({ dislikeButtonViewModel: toggleButtonViewModelContainerSchema.optional() })
    .optional()
});

const videoActionsSchema = z.object({
  menuRenderer: z
    .object({
      topLevelButtons: z
        .array(z.object({ segmentedLikeDislikeButtonViewModel: segmentedLikeDislikeButtonSchema.optional() }))
        .optional()
    })
    .optional()
});

const watchContentSchema = z.object({
  videoPrimaryInfoRenderer: z.object({ videoActions: videoActionsSchema.optional() }).optional()
});

const watchResultsSchema = z.object({
  results: z
    .object({
      results: z.object({ contents: z.array(watchContentSchema).optional() }).optional()
    })
    .optional()
});

const quickActionsViewModelSchema = z.object({
  quickActionButtons: z
    .array(
      z.object({
        likeButtonViewModel: toggleButtonViewModelContainerSchema.optional(),
        dislikeButtonViewModel: toggleButtonViewModelContainerSchema.optional()
      })
    )
    .optional()
});

const playerOverlayRendererSchema = z.object({
  fullscreenQuickActionsBar: z.object({ quickActionsViewModel: quickActionsViewModelSchema.optional() }).optional()
});

// The shape both `ytInitialData` on the watch page and `/youtubei/v1/next` responses share
export const watchDataSchema = z.object({
  contents: z.object({ twoColumnWatchNextResults: watchResultsSchema.optional() }).optional(),
  playerOverlays: z.object({ playerOverlayRenderer: playerOverlayRendererSchema.optional() }).optional()
});

// Rate requests send only this allow-listed `client` out of YouTube's much larger `INNERTUBE_CONTEXT`
export const innertubeContextSchema = z.object({
  client: z.object({
    clientName: z.string(),
    clientVersion: z.string(),
    hl: z.string().optional(),
    gl: z.string().optional()
  })
});

export type InnertubeContext = z.infer<typeof innertubeContextSchema>;
