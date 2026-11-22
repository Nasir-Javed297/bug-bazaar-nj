// Floating "Back to top" button, shown after scrolling down.
// Example of an effect with cleanup: a scroll listener AND a scheduled animation frame,
// both removed when the page closes, so nothing keeps running.
import { useEffect, useState } from "react";

/** Show the button after scrolling this far down. */
const SHOW_AFTER_PX = 400;

function scrollToTop() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  // The button is about to disappear, so move keyboard focus to the start of the content.
  document.getElementById("main-content")?.focus({ preventScroll: true });
}

export function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // `scroll` fires many times per second. Instead of updating state on every event,
    // schedule at most ONE update per screen frame.
    let frameId = 0;

    const handleScroll = () => {
      if (frameId !== 0) return; // an update is already scheduled for the next frame
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        setVisible(window.scrollY > SHOW_AFTER_PX);
      });
    };

    handleScroll(); // set the right state on first render (e.g. after a refresh mid-page)
    // passive: we never call preventDefault(), so the browser can scroll without waiting for us.
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Cleanup: runs when the page closes. Remove the listener AND cancel a pending frame,
    // otherwise setVisible could run after this component is gone.
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.cancelAnimationFrame(frameId);
    };
  }, []); // [] = set up once when the component appears, clean up once when it leaves

  if (!visible) return null;

  return (
    <button type="button" className="back-to-top" onClick={scrollToTop}>
      <span aria-hidden="true">↑</span> Back to top
    </button>
  );
}
