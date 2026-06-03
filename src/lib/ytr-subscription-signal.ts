export enum SubscriptionDecision {
  claimed = "claimed",
  released = "released"
}

const SUBSCRIPTION_DECISION_EVENT = "ytr-subscription-decision";

declare global {
  interface Window {
    ytrSubscriptionDecision: SubscriptionDecision | undefined;
  }
}

function isSubscriptionDecision(value: SubscriptionDecision | string | null | undefined): value is SubscriptionDecision {
  return value === SubscriptionDecision.claimed || value === SubscriptionDecision.released;
}

export function announceSubscriptionDecision(decision: SubscriptionDecision) {
  window.ytrSubscriptionDecision = decision;
  document.dispatchEvent(new CustomEvent(SUBSCRIPTION_DECISION_EVENT, { detail: decision }));
}

export function resetSubscriptionDecision() {
  window.ytrSubscriptionDecision = undefined;
  document.dispatchEvent(new CustomEvent(SUBSCRIPTION_DECISION_EVENT, { detail: undefined }));
}

export function getSubscriptionDecision() {
  return window.ytrSubscriptionDecision;
}

export function onSubscriptionDecision(callback: (decision: SubscriptionDecision | undefined) => void) {
  const handler = (e: Event) => {
    if (!(e instanceof CustomEvent)) {
      return;
    }
    const { detail } = e;
    const decision = isSubscriptionDecision(detail) ? detail : undefined;
    callback(decision);
  };
  document.addEventListener(SUBSCRIPTION_DECISION_EVENT, handler);
  return () => document.removeEventListener(SUBSCRIPTION_DECISION_EVENT, handler);
}
