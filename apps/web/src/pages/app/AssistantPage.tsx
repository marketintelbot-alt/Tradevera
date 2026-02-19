import { useState } from "react";
import type { AiCoachResponse } from "@tradevera/shared";
import { Bot, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LockedPanel } from "@/components/common/LockedPanel";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/common/ToastProvider";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const STARTER_QUESTIONS = [
  "Where is my biggest leak right now?",
  "How should I reduce drawdown next week?",
  "Which setup deserves the most size?"
];

export function AssistantPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const [lookbackDays, setLookbackDays] = useState("60");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AiCoachResponse | null>(null);

  const askAssistant = async (nextQuestion?: string) => {
    const prompt = (nextQuestion ?? question).trim();
    setLoading(true);
    try {
      const result = await api.askAiCoach({
        question: prompt.length > 0 ? prompt : undefined,
        lookbackDays: Number(lookbackDays)
      });
      setResponse(result);
      if (nextQuestion) {
        setQuestion(nextQuestion);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        toast({
          title: "Pro feature",
          description: "AI Assistant is available on Tradevera Pro.",
          tone: "info"
        });
        navigate("/app/settings");
        return;
      }
      toast({
        title: "Assistant unavailable",
        description: error instanceof Error ? error.message : "Unexpected error",
        tone: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  if (user?.plan !== "pro") {
    return (
      <div className="space-y-5">
        <Card>
          <CardHeader title="AI Assistant" subtitle="Pro-only coaching based on your own trade history." />
          <p className="text-sm text-ink-800">
            Upgrade to Pro to unlock AI guidance, personalized action items, and faster weekly execution feedback.
          </p>
        </Card>
        <LockedPanel onUpgrade={() => navigate("/app/settings")} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="AI Assistant"
          subtitle="Pro-only. Ask for risk controls, setup focus, and session optimization using your trade data."
          action={
            <span className="inline-flex items-center gap-2 rounded-full bg-mint-100 px-3 py-1 text-xs font-semibold text-ink-900">
              <Sparkles className="h-3.5 w-3.5" /> Included in Pro
            </span>
          }
        />

        <div className="space-y-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-ink-800">Question</span>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Example: How can I improve plan adherence without reducing opportunity?"
              rows={4}
              className="w-full resize-y rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none transition placeholder:text-ink-700/55 focus:border-ink-700 focus:ring-4 focus:ring-ink-200/70"
            />
          </label>

          <div className="grid gap-3 md:grid-cols-[220px,1fr]">
            <Input
              label="Lookback window (days)"
              type="number"
              min={14}
              max={365}
              value={lookbackDays}
              onChange={(event) => setLookbackDays(event.target.value)}
              hint="Use 30-90 days for tighter signal."
            />
            <div className="flex items-end">
              <Button loading={loading} onClick={() => askAssistant()} className="w-full md:w-auto">
                Ask Assistant
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {STARTER_QUESTIONS.map((starter) => (
              <Button
                key={starter}
                variant="secondary"
                size="sm"
                onClick={() => askAssistant(starter)}
                disabled={loading}
                className="justify-start"
              >
                {starter}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {response ? (
        <>
          <Card>
            <CardHeader title={response.headline} subtitle={`Generated ${new Date(response.generatedAt).toLocaleString()}`} />
            <div className="rounded-xl border border-ink-200 bg-ink-100/60 p-4">
              <p className="flex items-start gap-2 text-sm leading-6 text-ink-900">
                <Bot className="mt-0.5 h-4 w-4 shrink-0 text-ink-800" />
                <span>{response.answer}</span>
              </p>
            </div>
          </Card>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <p className="text-xs uppercase tracking-[0.12em] text-ink-700">Win rate</p>
              <p className="mt-2 text-2xl font-semibold text-ink-900">{response.snapshot.winRate.toFixed(1)}%</p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-[0.12em] text-ink-700">Total PnL</p>
              <p className="mt-2 text-2xl font-semibold text-ink-900">{formatCurrency(response.snapshot.totalPnl)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-[0.12em] text-ink-700">Best setup</p>
              <p className="mt-2 text-lg font-semibold text-ink-900">{response.snapshot.bestSetup}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-[0.12em] text-ink-700">Adherence</p>
              <p className="mt-2 text-2xl font-semibold text-ink-900">{response.snapshot.adherenceRate.toFixed(1)}%</p>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Card>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-900">What worked</h3>
              <ul className="mt-3 space-y-2 text-sm text-ink-800">
                {response.whatWorked.length === 0 ? <li>No standout positives yet in this window.</li> : response.whatWorked.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-900">What to improve</h3>
              <ul className="mt-3 space-y-2 text-sm text-ink-800">
                {response.whatToImprove.length === 0 ? <li>No major weaknesses detected yet.</li> : response.whatToImprove.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-900">Action items</h3>
              <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm text-ink-900">
                {response.actionItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </Card>
          </section>
        </>
      ) : (
        <Card>
          <p className="text-sm text-ink-700">Ask your first question to generate a personalized coaching brief.</p>
        </Card>
      )}
    </div>
  );
}
