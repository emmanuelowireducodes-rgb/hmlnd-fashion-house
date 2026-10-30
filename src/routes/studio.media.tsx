import { createFileRoute } from "@tanstack/react-router";

import { MediaLibrary } from "@/components/studio/MediaLibrary";

export const Route = createFileRoute("/studio/media")({ component: StudioMediaPage });

function StudioMediaPage() {
  return (
    <main className="studio-products">
      <MediaLibrary />
    </main>
  );
}
