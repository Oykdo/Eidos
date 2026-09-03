import { createFileRoute } from "@tanstack/react-router";
import { ReliqueView } from "@/components/reliques/ReliqueView";

export const Route = createFileRoute("/reliques")({
  component: ReliqueView,
});
