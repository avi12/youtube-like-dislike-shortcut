import { YoutubePathname } from "@/lib/utils-initials";
import { isRateRequest, type RateAction, rateContextResultSchema, YtrMessage, ytrMessenger } from "@/lib/ytr-messaging";
import { executeRateRequest, fetchRateParamsFromNext } from "@/lib/ytr-rate-fetch";
import { buildSapisidAuthorization } from "@/lib/ytr-sapisid";

// The answer comes from the page's MAIN world, which any page script can forge
async function requestRateContext(action: RateAction) {
  const response = await ytrMessenger.sendMessage(YtrMessage.GET_RATE_CONTEXT, action).catch(() => null);
  return rateContextResultSchema.safeParse(response).data;
}

async function rateVideoOnPage(action: RateAction) {
  const result = await requestRateContext(action);
  if (!result?.params) {
    return {
      success: false,
      error: "No video context"
    };
  }

  const { context, params } = result;
  const Authorization = await buildSapisidAuthorization();
  if (!Authorization) {
    return {
      success: false,
      error: "No SAPISID cookie"
    };
  }

  try {
    const isOk = await executeRateRequest({
      action,
      context,
      Authorization,
      params
    });
    if (!isOk) {
      return {
        success: false,
        error: "Rate request failed"
      };
    }

    return {
      success: true,
      videoId: context.videoId
    };
  } catch {
    return {
      success: false,
      error: "Rate request threw"
    };
  }
}

async function rateInEmbed(action: RateAction) {
  const result = await requestRateContext(action);
  if (!result) {
    return {
      success: false,
      error: "No embed context"
    };
  }

  const { context } = result;
  const Authorization = await buildSapisidAuthorization();
  if (!Authorization) {
    return {
      success: false,
      error: "No SAPISID cookie"
    };
  }

  try {
    const params = await fetchRateParamsFromNext({
      action,
      context,
      Authorization
    });
    if (!params) {
      return {
        success: false,
        error: "No rate params from /next"
      };
    }

    const isOk = await executeRateRequest({
      action,
      context,
      Authorization,
      params
    });
    if (!isOk) {
      return {
        success: false,
        error: "Rate request failed"
      };
    }

    return {
      success: true,
      videoId: context.videoId
    };
  } catch {
    return {
      success: false,
      error: "Rate request threw"
    };
  }
}

function init() {
  browser.runtime.onMessage.addListener((message: unknown) => {
    if (!isRateRequest(message)) {
      return;
    }

    const { action } = message;
    return location.pathname.startsWith(YoutubePathname.EMBED) ? rateInEmbed(action) : rateVideoOnPage(action);
  });
}

export default defineContentScript({
  matches: ["https://www.youtube.com/*", "https://www.youtube-nocookie.com/*"],
  allFrames: true,
  main: () => init()
});
