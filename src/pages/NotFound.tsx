// Shown for unknown URLs (route "*") and for API 404s (e.g. a product that doesn't exist).
import { Link } from "react-router-dom";

type NotFoundProps = {
  title?: string;
  message?: string;
};

// Default values in the destructuring: used when the prop isn't passed.
export function NotFound({
  title = "Page not found",
  message = "Sorry, the page you're looking for doesn't exist.",
}: NotFoundProps) {
  return (
    <div className="page not-found">
      <h1>{title}</h1>
      <p>{message}</p>
      <Link to="/" className="button">
        Back to the shop
      </Link>
    </div>
  );
}
