// Models the life of one request as a "discriminated union".
//
// The `status` field is the discriminant: it tells TypeScript which variant we have.
// Because each variant only carries the fields that make sense for it,
// impossible combinations cannot be written:
//   - you cannot have `data` while loading
//   - you cannot have an `error` and `data` at the same time
//   - you cannot read `data` without first checking `status === "success"`
//
// Compare with three separate useState calls (loading, error, data), where
// `loading: true` + `error: "boom"` + old `data` can all exist together.

export type RequestState<TData, TError = string> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: TData }
  | { status: "error"; error: TError };
