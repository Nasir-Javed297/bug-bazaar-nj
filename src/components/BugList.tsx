import BugCard from "./BugCard";
import type { Bug } from "../api/mockApi";

type BugListProps = {
  bugs: Bug[];
};

export const BugList = ({ bugs }: BugListProps) => {
  return (
    <div className="bug-list">
      {bugs.map((bug) => (
        <BugCard key={bug.id} bug={bug} />
      ))}
    </div>
  );
};
