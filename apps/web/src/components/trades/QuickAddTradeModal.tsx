import { Modal } from "@/components/ui/Modal";
import { TradeForm } from "@/components/trades/TradeForm";

interface QuickAddTradeModalProps {
  open: boolean;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

export function QuickAddTradeModal({ open, onClose, onSubmit, submitting }: QuickAddTradeModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Quick Add Trade">
      <p className="mb-4 text-sm text-ink-700">Fast entry for execution flow. You can enrich notes and tags later.</p>
      <TradeForm mode="quick" onSubmit={onSubmit} submitting={submitting} submitLabel="Add trade" onCancel={onClose} />
    </Modal>
  );
}
