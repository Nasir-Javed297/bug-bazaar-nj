// Typed versions of react-redux's hooks. Use these instead of plain useDispatch/useSelector,
// so `state` and `dispatch` know about every slice in our store.
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "./store";

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
