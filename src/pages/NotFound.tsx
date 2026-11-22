// "Not found": for unknown URLs (route "*") and for API 404s (a product or order that doesn't
// exist). NotFoundMessage is the content, usable inside another page; NotFound is a whole page.
import { Link } from "react-router-dom";

type NotFoundProps = {
  title?: string;
  message?: string;
};

// Default values in the destructuring: used when the prop isn't passed.
export function NotFoundMessage({
  title = "Page not found",
  message = "Sorry, the page you're looking for doesn't exist.",
}: NotFoundProps) {
  return (
    <div className="not-found">
      <h1>{title}</h1>
      <p>{message}</p>
      <Link to="/" className="button">
        Back to the shop
      </Link>
    </div>
  );
}

export function NotFound(props: NotFoundProps) {
  return (
    <div className="page">
      <NotFoundMessage {...props} />
    </div>
  );
}
