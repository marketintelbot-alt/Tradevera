import { useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { LockedPanel } from "@/components/common/LockedPanel";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { useTrades } from "@/hooks/useTrades";
import { computeWeeklyReview } from "@/lib/analytics";
import { useToast } from "@/components/common/ToastProvider";

export function ReviewPage() {
  const { user } = useAuth();
  const { trades, loading } = useTrades();
  const navigate = useNavigate();
  const review = useMemo(() => computeWeeklyReview(trades), [trades]);
  const reviewRef = useRef<HTMLElement>(null);
  const { toast } = useToast();

  const exportPdf = async () => {
    if (!reviewRef.current) {
      return;
    }

    const canvas = await html2canvas(reviewRef.current, {
      scale: 2,
      backgroundColor: "#ffffff"
    });

    const image = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = (canvas.height * pageWidth) / canvas.width;
    pdf.addImage(image, "PNG", 18, 20, pageWidth - 36, pageHeight - 20);
    pdf.save(`tradevera-weekly-review-${new Date().toISOString().slice(0, 10)}.pdf`);

    toast({ title: "PDF exported", tone: "success" });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (user?.plan !== "pro") {
    return <LockedPanel onUpgrade={() => navigate("/app/settings")} />;
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Weekly Review"
          subtitle="Evidence-based recap of what worked, what failed, and what to improve next week."
          action={<Button onClick={exportPdf}>Export PDF</Button>}
        />
      </Card>

      <Card ref={reviewRef}>
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-ink-700">Week</p>
            <h3 className="text-2xl font-semibold text-ink-900">
              {new Date(review.weekStart).toLocaleDateString()} - {new Date(review.weekEnd).toLocaleDateString()}
            </h3>
            <p className="mt-1 text-sm text-ink-700">
              {review.totalTrades} trades logged | Win rate {review.winRate.toFixed(1)}%
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-mint-500/30 bg-mint-100/65 p-4">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-ink-900">What worked</h4>
              <ul className="mt-3 space-y-2 text-sm text-ink-800">
                {review.topSetups.length ? review.topSetups.map((item) => <li key={item}>• {item}</li>) : <li>• No standout setup this week.</li>}
              </ul>
            </div>

            <div className="rounded-xl border border-coral-500/30 bg-coral-100/70 p-4">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-ink-900">What didn’t</h4>
              <ul className="mt-3 space-y-2 text-sm text-ink-800">
                {review.commonMistakes.length
                  ? review.commonMistakes.map((item) => <li key={item}>• {item}</li>)
                  : <li>• No repeated mistakes recorded.</li>}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-ink-200 bg-ink-100/55 p-4">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-ink-900">Action Items</h4>
            <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm text-ink-900">
              {review.actionItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </div>
        </div>
      </Card>
    </div>
  );
}
