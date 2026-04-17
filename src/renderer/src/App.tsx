import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ChevronLeft, ChevronRight, FolderOpen, Search, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { ComicCard } from "@/components/ComicCard.tsx";
import { DetailDialog } from "@/components/DetailDialog.tsx";
import { DownloadsDock } from "@/components/DownloadsDock.tsx";
import { SettingsDialog } from "@/components/SettingsDialog.tsx";
import { useDownloads } from "@/hooks/useDownloads.ts";
import type { SearchResponse, SearchResult } from "@shared/types.ts";

type Status = { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string };

export function App() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [pagination, setPagination] = useState({ hasOlder: false, hasNewer: false });
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailResult, setDetailResult] = useState<SearchResult | null>(null);

  const { downloads, enqueue, cancel, clearCompleted } = useDownloads();

  const runSearch = useCallback(
    async (nextPage: number) => {
      setStatus({ kind: "loading" });
      try {
        const res: SearchResponse = await window.api.search({ query, page: nextPage });
        setResults(res.results);
        setPagination({ hasOlder: res.hasOlder, hasNewer: res.hasNewer });
        setPage(res.page);
        setStatus({ kind: "idle" });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setStatus({ kind: "error", message });
      }
    },
    [query],
  );

  // On launch, kick off an empty search so the user sees the latest releases
  // without having to click anything.
  useEffect(() => {
    void runSearch(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSearchSubmit(e: FormEvent): void {
    e.preventDefault();
    void runSearch(1);
  }

  function clearSearch(): void {
    setQuery("");
    setResults([]);
    setPagination({ hasOlder: false, hasNewer: false });
    setPage(1);
    void runSearch(1);
  }

  const isLoading = status.kind === "loading";

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="drag-region flex items-center gap-3 border-b border-border px-4 py-2 pl-20">
        <span className="text-sm font-semibold tracking-tight">Omnibus</span>
        <form onSubmit={onSearchSubmit} className="no-drag ml-4 flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-xl">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search comics — leave blank for latest"
              className="pl-8"
            />
          </div>
          <Button type="submit" disabled={isLoading}>
            Search
          </Button>
          <Button type="button" variant="ghost" onClick={clearSearch} aria-label="Clear search">
            <X />
          </Button>
        </form>
        <div className="no-drag flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void window.api.openDownloadFolder()}
            aria-label="Open download folder"
            title="Open download folder"
          >
            <FolderOpen />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            title="Settings"
          >
            <Settings2 />
          </Button>
        </div>
      </header>

      {status.kind === "error" && (
        <div className="border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          {status.message}
        </div>
      )}

      <main className="flex min-h-0 flex-1 flex-col">
        <ScrollArea className="flex-1">
          {isLoading && results.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
              Loading…
            </div>
          ) : results.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
              No results. Try a different search.
            </div>
          ) : (
            <div className="grid gap-3 p-4 grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
              {results.map((r) => (
                <ComicCard key={r.postUrl} result={r} onClick={() => setDetailResult(r)} />
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex items-center justify-between border-t border-border bg-card/30 px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={!pagination.hasNewer || isLoading}
            onClick={() => void runSearch(Math.max(1, page - 1))}
          >
            <ChevronLeft /> Newer
          </Button>
          <span className="text-xs text-muted-foreground">
            {isLoading ? "Loading…" : `Page ${page}`}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={!pagination.hasOlder || isLoading}
            onClick={() => void runSearch(page + 1)}
          >
            Older <ChevronRight />
          </Button>
        </div>
      </main>

      <DetailDialog
        result={detailResult}
        onOpenChange={(open) => {
          if (!open) setDetailResult(null);
        }}
        onDownload={(r) => void enqueue(r)}
      />

      <DownloadsDock
        downloads={downloads}
        onCancel={(id) => void cancel(id)}
        onClearCompleted={clearCompleted}
      />

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
