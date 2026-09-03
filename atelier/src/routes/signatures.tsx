import { createFileRoute } from "@tanstack/react-router";
import { Signatures } from "@/components/Signatures";

export const Route = createFileRoute("/signatures")({
  component: Signatures,
});
