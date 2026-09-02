import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

/**
 * One-time unlock for a single report.
 *
 * Checkout is not connected yet, so this currently records the unlock directly.
 * When the payment provider is enabled, replace `unlock()` with a checkout
 * session and let the provider webhook flip `reports.unlocked`.
 */
export function UnlockSheet({
  open,
  onOpenChange,
  reportId,
  onUnlocked,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reportId: string;
  onUnlocked: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function unlock() {
    setBusy(true);
    const { error } = await supabase.from("reports").update({ unlocked: true }).eq("id", reportId);
    setBusy(false);
    if (error) return toast.error("Could not unlock this report");
    toast.success("Full report unlocked");
    onUnlocked();
    onOpenChange(false);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-md">
        <DrawerHeader className="text-left">
          <DrawerTitle className="font-display text-3xl">Full report — $4</DrawerTitle>
          <DrawerDescription>
            One-time unlock for this report. All ten measurements, reference values and derivation
            notes.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[
              "Seven additional measurements",
              "Reference value beside every figure",
              "Shareable results card",
              "Kept in your private history",
            ].map((f) => (
              <li key={f} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                <span className="text-primary">—</span>
                <span className="min-w-0">{f}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 rounded-xl border border-border bg-secondary/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
            Card checkout is still being connected. Until then, unlocking is free so you can use the
            full report.
          </p>
          <Button className="mt-4 h-12 w-full rounded-full" disabled={busy} onClick={unlock}>
            {busy ? "Unlocking…" : "Unlock full report"}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
