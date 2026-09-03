import { createFileRoute } from "@tanstack/react-router";
import { Glyphes } from "@/components/Glyphes";

export const Route = createFileRoute("/glyphes")({
  component: Glyphes,
});
