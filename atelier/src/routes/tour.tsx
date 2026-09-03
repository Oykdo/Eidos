import { createFileRoute } from "@tanstack/react-router";
import { TourView } from "@/components/tour/TourView";

export const Route = createFileRoute("/tour")({
  component: TourView,
});
