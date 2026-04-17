import { useEffect, useState } from "react";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import type { Settings } from "@shared/types.ts";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (next: Settings) => void;
};

// Lightweight controlled form: we load the current settings when the dialog
// opens, mutate a local draft, and persist on Save. Cancel/close discards.
export function SettingsDialog({ open, onOpenChange, onSaved }: Props) {
  const [draft, setDraft] = useState<Settings | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void window.api.getSettings().then((s) => {
      if (!cancelled) setDraft(s);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function pickDownload(): Promise<void> {
    const picked = await window.api.pickFolder();
    if (picked && draft) setDraft({ ...draft, downloadLocation: picked });
  }

  async function pickLog(): Promise<void> {
    const picked = await window.api.pickFolder();
    if (picked && draft) setDraft({ ...draft, logLocation: picked });
  }

  async function save(): Promise<void> {
    if (!draft) return;
    const next = await window.api.updateSettings(draft);
    onSaved?.(next);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Where Omnibus saves comics and how it talks to GetComics.
          </DialogDescription>
        </DialogHeader>

        {draft ? (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="download-path">Download location</Label>
              <div className="flex gap-2">
                <Input
                  id="download-path"
                  value={draft.downloadLocation}
                  onChange={(e) => setDraft({ ...draft, downloadLocation: e.target.value })}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={pickDownload}
                  aria-label="Choose download folder"
                >
                  <FolderOpen />
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="log-path">Log location</Label>
              <div className="flex gap-2">
                <Input
                  id="log-path"
                  value={draft.logLocation}
                  onChange={(e) => setDraft({ ...draft, logLocation: e.target.value })}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={pickLog}
                  aria-label="Choose log folder"
                >
                  <FolderOpen />
                </Button>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={draft.logEnabled}
                  onChange={(e) => setDraft({ ...draft, logEnabled: e.target.checked })}
                />
                Write download activity to log.txt
              </label>
            </div>

            <Separator />

            <div className="grid gap-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Cloudflare cookies
              </Label>
              <p className="text-xs text-muted-foreground">
                If GetComics blocks requests, visit it in Safari, copy the <code>cf_clearance</code>{" "}
                and
                <code> __cfduid</code> cookie values, and paste them below.
              </p>
              <Label htmlFor="cf-clearance" className="mt-2">
                cf_clearance
              </Label>
              <Input
                id="cf-clearance"
                value={draft.cfClearance}
                onChange={(e) => setDraft({ ...draft, cfClearance: e.target.value })}
              />
              <Label htmlFor="cfduid" className="mt-2">
                __cfduid
              </Label>
              <Input
                id="cfduid"
                value={draft.cfduid}
                onChange={(e) => setDraft({ ...draft, cfduid: e.target.value })}
              />
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Loading…</div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!draft}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
