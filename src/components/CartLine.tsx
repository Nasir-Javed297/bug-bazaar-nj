// One line in the cart: product, quantity picker, line total and a Remove button.
// Changes the cart ONLY by dispatching actions (the reducer enforces the stock limit too).
import { Link } from "react-router-dom";
import { itemRemoved, quantityChanged, type CartItem } from "../store/cartSlice";
import { useAppDispatch } from "../store/hooks";
import { formatPrice } from "../utils/formatPrice";

type CartLineProps = {
  item: CartItem;
};

export function CartLine({ item }: CartLineProps) {
  const dispatch = useAppDispatch();
  const selectId = `quantity-${item.productId}`;

  // Options 1..stock: the picker can't even offer an invalid quantity.
  const options = Array.from({ length: item.stock }, (_, index) => index + 1);

  return (
    <li className="cart-line">
      <img className="cart-line__image" src={item.imageUrl} alt="" width={96} height={72} />
      <div className="cart-line__info">
        <Link to={`/products/${item.productId}`} className="cart-line__name">
          {item.name}
        </Link>
        <span className="cart-line__unit">{formatPrice(item.price)} each</span>
      </div>
      <div className="cart-line__quantity">
        <label htmlFor={selectId}>Quantity</label>
        <select
          id={selectId}
          value={item.quantity}
          onChange={(e) =>
            dispatch(
              quantityChanged({ productId: item.productId, quantity: Number(e.target.value) }),
            )
          }
        >
          {options.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <strong className="cart-line__total">{formatPrice(item.price * item.quantity)}</strong>
      <button
        type="button"
        className="button button--secondary"
        onClick={() => dispatch(itemRemoved(item.productId))}
        // A visible "Remove" alone is ambiguous for screen readers in a list of lines.
        aria-label={`Remove ${item.name} from cart`}
      >
        Remove
      </button>
    </li>
  );
}
