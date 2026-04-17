import { useState } from "react";
import { cn } from "@/lib/utils.ts";
import type { SearchResult } from "@shared/types.ts";

type Props = {
  result: SearchResult;
  onClick: () => void;
};

// Individual card in the cover grid. Shows the cover art at a consistent 2:3
// aspect, overlays the title on hover, and falls through to a plain-text
// placeholder if the cover fails to load (GetComics occasionally blocks hot-
// linked thumbnails behind Cloudflare).
export function ComicCard({ result, onClick }: Props) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card",
        "text-left transition-all hover:border-ring hover:shadow-lg hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
        {result.coverUrl && !imgFailed ? (
          <img
            src={result.coverUrl}
            alt={result.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
            {result.title}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5 p-2.5">
        <h3 className="line-clamp-2 text-xs font-medium leading-snug">{result.title}</h3>
        {result.date && <p className="text-[10px] text-muted-foreground">{result.date}</p>}
      </div>
    </button>
  );
}
