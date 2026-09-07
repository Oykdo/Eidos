import { createFileRoute } from "@tanstack/react-router";
import { VeilleeView } from "@/components/veillee/VeilleeView";

export const Route = createFileRoute("/veillee")({
  component: VeilleeView,
});
