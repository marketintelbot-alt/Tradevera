import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card className="border-dashed text-center">
      <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-ink-700">{description}</p>
      {actionLabel && onAction && (
        <Button className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Card>
  );
}
