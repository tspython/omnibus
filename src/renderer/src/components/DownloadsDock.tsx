import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { cn, formatBytes } from "@/lib/utils.ts";
import type { DownloadItem } from "@shared/types.ts";

type Props = {
  downloads: DownloadItem[];
  onCancel: (id: string) => void;
  onClearCompleted: () => void;
};

function percent(item: DownloadItem): number {
  if (item.status === "complete") return 100;
  if (item.totalBytes <= 0) return 0;
  return Math.min(100, Math.round((item.bytes / item.totalBytes) * 100));
}

function statusLabel(item: DownloadItem): string {
  switch (item.status) {
    case "pending":
      return "Pending…";
    case "downloading":
      return item.totalBytes > 0
        ? `${formatBytes(item.bytes)} / ${formatBytes(item.totalBytes)}`
        : formatBytes(item.bytes);
    case "complete":
      return "Complete";
    case "cancelled":
      return "Cancelled";
    case "error":
      return item.error ?? "Failed";
  }
}

// Floating bottom-right downloads drawer. Hides entirely when the queue is
// empty so it doesn't waste screen real estate, and auto-expands on first
// activity so the user sees progress without hunting for a tab.
export function DownloadsDock({ downloads, onCancel, onClearCompleted }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);

  const active = downloads.filter((d) => d.status === "pending" || d.status === "downloading");
  const hasFinished = downloads.some(
    (d) => d.status === "complete" || d.status === "cancelled" || d.status === "error",
  );

  useEffect(() => {
    if (!autoOpened && active.length > 0) {
      setExpanded(true);
      setAutoOpened(true);
    }
    if (downloads.length === 0) {
      setAutoOpened(false);
    }
  }, [active.length, downloads.length, autoOpened]);

  if (downloads.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-14 right-4 z-40 w-[360px] max-w-[calc(100vw-2rem)]">
      <div className="pointer-events-auto overflow-hidden rounded-lg border border-border bg-card shadow-xl">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-accent"
        >
          <div className="flex items-center gap-2">
            <Download className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Downloads</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">
              {active.length > 0 ? `${active.length} active` : `${downloads.length}`}
            </span>
          </div>
          {expanded ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        </button>

        {expanded && (
          <div className="border-t border-border">
            <ScrollArea className={cn("max-h-[360px]")}>
              <ul className="divide-y divide-border">
                {downloads.map((d) => (
                  <li key={d.id} className="flex items-start gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium">{d.title}</span>
                        <span
                          className={cn(
                            "shrink-0 text-[10px]",
                            d.status === "error" ? "text-destructive" : "text-muted-foreground",
                          )}
                        >
                          {statusLabel(d)}
                        </span>
                      </div>
                      <Progress value={percent(d)} className="mt-1.5 h-1.5" />
                    </div>
                    {(d.status === "pending" || d.status === "downloading") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onCancel(d.id)}
                        aria-label="Cancel download"
                      >
                        <X />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </ScrollArea>
            {hasFinished && (
              <div className="flex justify-end border-t border-border p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearCompleted}
                  className="h-7 text-xs"
                >
                  Clear finished
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
