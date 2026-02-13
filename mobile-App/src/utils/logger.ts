export function logDebug(message: string, payload?: unknown) {
  if (!__DEV__) {
    return;
  }

  if (payload === undefined) {
    console.log(`[LPG] ${message}`);
    return;
  }

  console.log(`[LPG] ${message}`, payload);
}

export function logError(message: string, payload?: unknown) {
  if (!__DEV__) {
    return;
  }

  if (payload === undefined) {
    console.error(`[LPG] ${message}`);
    return;
  }

  console.error(`[LPG] ${message}`, payload);
}
