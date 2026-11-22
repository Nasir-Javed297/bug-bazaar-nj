// Sets the browser tab title for a page (task D4-1), e.g. "Your cart · The Bug Bazaar".
// Screen readers announce the title when a page opens, and it names the browser tab and history
// entry, so every page needs its own.
import { useEffect } from "react";

const SITE_NAME = "The Bug Bazaar";

export function useDocumentTitle(pageTitle: string | undefined): void {
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} · ${SITE_NAME}` : SITE_NAME;
  }, [pageTitle]);
}
