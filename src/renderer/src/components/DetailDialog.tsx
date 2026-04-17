import { useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import type { SearchResult } from "@shared/types.ts";

type Props = {
  result: SearchResult | null;
  onOpenChange: (open: boolean) => void;
  onDownload: (result: SearchResult) => void;
};

// Modal detail view. Opens when a card is clicked in the grid; closes on ESC,
// backdrop click, or after Download is pressed so the queue takes focus.
export function DetailDialog({ result, onOpenChange, onDownload }: Props) {
  const [imgFailed, setImgFailed] = useState(false);

  const open = result !== null;

  function handleDownload() {
    if (!result) return;
    onDownload(result);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setImgFailed(false);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-2xl">
        {result && (
          <>
            <DialogHeader>
              <DialogTitle className="pr-8">{result.title}</DialogTitle>
              {result.date && <DialogDescription>{result.date}</DialogDescription>}
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
              <div className="flex aspect-[2/3] w-full items-center justify-center overflow-hidden rounded-md bg-muted">
                {result.coverUrl && !imgFailed ? (
                  <img
                    src={result.coverUrl}
                    alt={result.title}
                    className="h-full w-full object-cover"
                    onError={() => setImgFailed(true)}
                  />
                ) : (
                  <span className="p-3 text-center text-xs text-muted-foreground">No cover</span>
                )}
              </div>

              <ScrollArea className="max-h-[260px]">
                <p className="text-sm text-muted-foreground">
                  {result.description || "No description available."}
                </p>
              </ScrollArea>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => void window.api.openUrl(result.postUrl)}>
                <ExternalLink /> Open on GetComics
              </Button>
              <Button onClick={handleDownload}>
                <Download /> Download
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
