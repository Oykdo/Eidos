import { createFileRoute } from "@tanstack/react-router";
import { Guide } from "@/components/Guide";

export const Route = createFileRoute("/guide")({
  component: Guide,
});
