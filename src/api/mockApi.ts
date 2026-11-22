// Week 1 mock. Replaced by the MSW mock server in task D1-2.

export type Severity = "Low" | "Medium" | "High";

export type Bug = {
  id: number;
  title: string;
  severity: Severity;
};

const BUGS: Bug[] = [
  { id: 1, title: "Login button overlaps footer", severity: "Low" },
  { id: 2, title: "Checkout total is wrong", severity: "High" },
  { id: 3, title: "Search ignores capital letters", severity: "Medium" },
];

// The return type says: "a Promise that resolves to an array of Bug".
export function fetchBugs(): Promise<Bug[]> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.25) {
        reject(new Error("The bug server is hiding"));
      } else {
        resolve(BUGS);
      }
    }, 800);
  });
}
