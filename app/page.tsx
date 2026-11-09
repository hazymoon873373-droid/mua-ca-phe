import Dashboard from "./dashboard";
import latest from "../public/data/latest.json";
export default function Home() {
  return <Dashboard initial={latest} />;
}
