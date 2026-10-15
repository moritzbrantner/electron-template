/** Deny application windows; send only ordinary web/mail URLs to the system opener. */
export function createExternalLinkHandler(openExternal: (url: string) => Promise<void>) {
  return ({ url }: { url: string }): { action: 'deny' } => {
    try {
      const destination = new URL(url);
      if (
        ['https:', 'http:', 'mailto:'].includes(destination.protocol) &&
        !destination.username &&
        !destination.password
      ) {
        void openExternal(destination.toString()).catch(() => undefined);
      }
    } catch {
      // Invalid URLs remain denied.
    }
    return { action: 'deny' };
  };
}
