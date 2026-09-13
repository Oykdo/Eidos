import { createFileRoute } from "@tanstack/react-router";
import { BatailleView } from "@/components/tactique/BatailleView";

export const Route = createFileRoute("/bataille")({
  component: BatailleView,
});
