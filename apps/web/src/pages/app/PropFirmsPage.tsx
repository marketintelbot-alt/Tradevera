import { useEffect, useMemo, useState } from "react";
import type { PropFirmAccount } from "@tradevera/shared";
import { Building2, Copy, Link2, Pencil, Plus, ShieldAlert, Trash2, Users } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { useToast } from "@/components/common/ToastProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { ApiError, api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

type PlatformKey =
  | "topstep"
  | "alpha_futures"
  | "lucid_trading"
  | "tradeify"
  | "apex_trader"
  | "take_profit_trader"
  | "my_funded_futures"
  | "custom";

type AccountSize = "50K" | "100K" | "150K" | "custom";
type DrawdownMode = "fixed" | "trailing";
type PageTab = "accounts" | "groups";

interface RuleTemplate {
  profit_target: number | null;
  max_position_size: number | null;
  daily_loss_limit: number | null;
  max_drawdown: number | null;
  drawdown_mode: DrawdownMode;
  note: string;
}

const PLATFORM_OPTIONS: Array<{ value: PlatformKey; label: string }> = [
  { value: "topstep", label: "TopStep" },
  { value: "alpha_futures", label: "Alpha Futures" },
  { value: "lucid_trading", label: "Lucid Trading" },
  { value: "tradeify", label: "Tradeify" },
  { value: "apex_trader", label: "Apex Trader" },
  { value: "take_profit_trader", label: "Take Profit Trader" },
  { value: "my_funded_futures", label: "My Funded Futures" },
  { value: "custom", label: "Custom" }
];

const ACCOUNT_SIZE_OPTIONS: Array<{ value: AccountSize; label: string }> = [
  { value: "50K", label: "50K" },
  { value: "100K", label: "100K" },
  { value: "150K", label: "150K" },
  { value: "custom", label: "Custom" }
];

const DRAWDOWN_MODE_OPTIONS: Array<{ value: DrawdownMode; label: string }> = [
  { value: "fixed", label: "Non-trailing / fixed" },
  { value: "trailing", label: "Trailing" }
];

const EMPTY_TEMPLATE: RuleTemplate = {
  profit_target: null,
  max_position_size: null,
  daily_loss_limit: null,
  max_drawdown: null,
  drawdown_mode: "fixed",
  note: "Enter the official non-trailing values from your prop-firm dashboard. Templates are editable."
};

// Only values you shared/approved are prefilled. Max drawdown stays blank until
// the user confirms the non-trailing/fixed value for their account/rule set.
const TEMPLATE_LIBRARY: Partial<Record<PlatformKey, Partial<Record<AccountSize, RuleTemplate>>>> = {
  apex_trader: {
    "50K": {
      profit_target: 3000,
      max_position_size: 5,
      daily_loss_limit: 1000,
      max_drawdown: null,
      drawdown_mode: "fixed",
      note: "Apex values loaded for target/size/daily loss. Confirm and enter your fixed (non-trailing) max drawdown."
    },
    "100K": {
      profit_target: 6000,
      max_position_size: 10,
      daily_loss_limit: 2000,
      max_drawdown: null,
      drawdown_mode: "fixed",
      note: "Apex values loaded for target/size/daily loss. Confirm and enter your fixed (non-trailing) max drawdown."
    },
    "150K": {
      profit_target: 9000,
      max_position_size: 15,
      daily_loss_limit: 3000,
      max_drawdown: null,
      drawdown_mode: "fixed",
      note: "Apex values loaded for target/size/daily loss. Confirm and enter your fixed (non-trailing) max drawdown."
    }
  }
};

interface AccountFormState {
  name: string;
  platform: PlatformKey;
  custom_platform_name: string;
  account_size: AccountSize;
  is_copy_trading: boolean;
  copy_group_name: string;
  is_group_leader: boolean;
  profit_target: string;
  max_position_size: string;
  daily_loss_limit: string;
  max_drawdown: string;
  drawdown_mode: DrawdownMode;
  notes: string;
}

function emptyForm(): AccountFormState {
  return {
    name: "",
    platform: "topstep",
    custom_platform_name: "",
    account_size: "50K",
    is_copy_trading: false,
    copy_group_name: "",
    is_group_leader: false,
    profit_target: "",
    max_position_size: "",
    daily_loss_limit: "",
    max_drawdown: "",
    drawdown_mode: "fixed",
    notes: ""
  };
}

function toNullableNumberString(value: number | null): string {
  return value === null || value === undefined ? "" : String(value);
}

function fromAccountToForm(account: PropFirmAccount): AccountFormState {
  return {
    name: account.name,
    platform: account.platform as PlatformKey,
    custom_platform_name: account.custom_platform_name ?? "",
    account_size: account.account_size as AccountSize,
    is_copy_trading: account.is_copy_trading,
    copy_group_name: account.copy_group_name ?? "",
    is_group_leader: account.is_group_leader,
    profit_target: toNullableNumberString(account.profit_target),
    max_position_size: toNullableNumberString(account.max_position_size),
    daily_loss_limit: toNullableNumberString(account.daily_loss_limit),
    max_drawdown: toNullableNumberString(account.max_drawdown),
    drawdown_mode: account.drawdown_mode as DrawdownMode,
    notes: account.notes ?? ""
  };
}

function platformLabel(platform: PlatformKey, customName?: string | null): string {
  if (platform === "custom") {
    return customName?.trim() || "Custom";
  }
  return PLATFORM_OPTIONS.find((option) => option.value === platform)?.label ?? platform;
}

function buildPayload(form: AccountFormState) {
  const numericOrNull = (value: string) => {
    const parsed = Number(value);
    return value.trim().length === 0 || !Number.isFinite(parsed) ? null : parsed;
  };

  return {
    name: form.name.trim(),
    platform: form.platform,
    custom_platform_name: form.platform === "custom" ? form.custom_platform_name.trim() || null : null,
    account_size: form.account_size,
    is_copy_trading: form.is_copy_trading,
    copy_group_name: form.is_copy_trading ? form.copy_group_name.trim() || null : null,
    is_group_leader: form.is_copy_trading ? form.is_group_leader : false,
    profit_target: numericOrNull(form.profit_target),
    max_position_size: numericOrNull(form.max_position_size),
    daily_loss_limit: numericOrNull(form.daily_loss_limit),
    max_drawdown: numericOrNull(form.max_drawdown),
    drawdown_mode: form.drawdown_mode,
    notes: form.notes.trim() || null
  };
}

function applyTemplateDefaults(form: AccountFormState): AccountFormState {
  const template = TEMPLATE_LIBRARY[form.platform]?.[form.account_size] ?? EMPTY_TEMPLATE;
  return {
    ...form,
    profit_target: toNullableNumberString(template.profit_target),
    max_position_size: toNullableNumberString(template.max_position_size),
    daily_loss_limit: toNullableNumberString(template.daily_loss_limit),
    max_drawdown: toNullableNumberString(template.max_drawdown),
    drawdown_mode: template.drawdown_mode,
    notes: form.notes.trim().length > 0 ? form.notes : template.note
  };
}

function AccountEditor({
  title,
  subtitle,
  form,
  setForm,
  submitting,
  onSubmit,
  submitLabel
}: {
  title: string;
  subtitle?: string;
  form: AccountFormState;
  setForm: React.Dispatch<React.SetStateAction<AccountFormState>>;
  submitting: boolean;
  onSubmit: () => void;
  submitLabel: string;
}) {
  const templatePreview = TEMPLATE_LIBRARY[form.platform]?.[form.account_size] ?? EMPTY_TEMPLATE;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <CardHeader title={title} subtitle={subtitle} />
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Account name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="TopStep 100K Eval #1"
          />

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-ink-800">Platform</span>
            <select
              value={form.platform}
              onChange={(event) => setForm((current) => ({ ...current, platform: event.target.value as PlatformKey }))}
              className="h-11 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900"
            >
              {PLATFORM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {form.platform === "custom" && (
            <Input
              label="Custom platform name"
              value={form.custom_platform_name}
              onChange={(event) => setForm((current) => ({ ...current, custom_platform_name: event.target.value }))}
              placeholder="Your prop firm name"
            />
          )}

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-ink-800">Account size</span>
            <select
              value={form.account_size}
              onChange={(event) => setForm((current) => ({ ...current, account_size: event.target.value as AccountSize }))}
              className="h-11 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900"
            >
              {ACCOUNT_SIZE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 rounded-xl border border-ink-200 bg-ink-100/45 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-ink-900">Rule template helper</p>
              <p className="text-xs text-ink-700">{templatePreview.note}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setForm((current) => applyTemplateDefaults(current))}>
              Apply template
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input
            label="Profit target ($)"
            type="number"
            min={0}
            value={form.profit_target}
            onChange={(event) => setForm((current) => ({ ...current, profit_target: event.target.value }))}
          />
          <Input
            label="Max position size (contracts)"
            type="number"
            min={0}
            value={form.max_position_size}
            onChange={(event) => setForm((current) => ({ ...current, max_position_size: event.target.value }))}
          />
          <Input
            label="Daily loss limit ($)"
            type="number"
            min={0}
            value={form.daily_loss_limit}
            onChange={(event) => setForm((current) => ({ ...current, daily_loss_limit: event.target.value }))}
          />
          <Input
            label="Max drawdown ($)"
            type="number"
            min={0}
            value={form.max_drawdown}
            onChange={(event) => setForm((current) => ({ ...current, max_drawdown: event.target.value }))}
            hint="Enter fixed/non-trailing value unless your rule set explicitly uses trailing."
          />

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-ink-800">Drawdown type</span>
            <select
              value={form.drawdown_mode}
              onChange={(event) => setForm((current) => ({ ...current, drawdown_mode: event.target.value as DrawdownMode }))}
              className="h-11 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900"
            >
              {DRAWDOWN_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 rounded-xl border border-ink-200 bg-white p-3">
          <label className="inline-flex items-center gap-2 text-sm text-ink-900">
            <input
              type="checkbox"
              checked={form.is_copy_trading}
              onChange={(event) => setForm((current) => ({ ...current, is_copy_trading: event.target.checked }))}
            />
            This account is part of a copy-trading group
          </label>

          {form.is_copy_trading && (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Input
                label="Copy group name"
                value={form.copy_group_name}
                onChange={(event) => setForm((current) => ({ ...current, copy_group_name: event.target.value }))}
                placeholder="MNQ Eval Cluster A"
                hint="Accounts with the same group name will be shown together."
              />
              <label className="inline-flex items-center gap-2 pt-8 text-sm text-ink-900">
                <input
                  type="checkbox"
                  checked={form.is_group_leader}
                  onChange={(event) => setForm((current) => ({ ...current, is_group_leader: event.target.checked }))}
                />
                Mark as group leader account
              </label>
            </div>
          )}
        </div>

        <label className="mt-4 flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink-800">Notes</span>
          <textarea
            rows={4}
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Notes, evaluation phase details, any firm-specific rule variations..."
            className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none transition placeholder:text-ink-700/55 focus:border-ink-700 focus:ring-4 focus:ring-ink-200/70"
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={onSubmit} loading={submitting}>
            {submitLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function PropFirmsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<PageTab>("accounts");
  const [accounts, setAccounts] = useState<PropFirmAccount[]>([]);
  const [createForm, setCreateForm] = useState<AccountFormState>(() => emptyForm());
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PropFirmAccount | null>(null);
  const [editForm, setEditForm] = useState<AccountFormState>(() => emptyForm());
  const [savingEdit, setSavingEdit] = useState(false);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const response = await api.listPropFirmAccounts();
      setAccounts(response.accounts);
    } catch (error) {
      toast({
        title: "Could not load prop firm accounts",
        description: error instanceof Error ? error.message : "Unexpected error",
        tone: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts().catch((error) => console.error(error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groupedAccounts = useMemo(() => {
    const grouped = new Map<string, PropFirmAccount[]>();
    for (const account of accounts.filter((item) => item.is_copy_trading && item.copy_group_key)) {
      const key = account.copy_group_key!;
      grouped.set(key, [...(grouped.get(key) ?? []), account]);
    }
    return Array.from(grouped.entries()).map(([groupKey, items]) => ({
      groupKey,
      groupName: items[0]?.copy_group_name ?? groupKey,
      items: items.sort((a, b) => Number(b.is_group_leader) - Number(a.is_group_leader) || a.name.localeCompare(b.name))
    }));
  }, [accounts]);

  const summary = useMemo(() => {
    const total = accounts.length;
    const copyTrading = accounts.filter((item) => item.is_copy_trading).length;
    const standalone = total - copyTrading;
    const avgDailyLoss =
      accounts.filter((item) => item.daily_loss_limit !== null).length > 0
        ? accounts.filter((item) => item.daily_loss_limit !== null).reduce((sum, item) => sum + Number(item.daily_loss_limit ?? 0), 0) /
          accounts.filter((item) => item.daily_loss_limit !== null).length
        : null;
    return { total, copyTrading, standalone, avgDailyLoss };
  }, [accounts]);

  const createAccount = async () => {
    try {
      if (!createForm.name.trim()) {
        toast({ title: "Account name is required", tone: "error" });
        return;
      }
      if (createForm.platform === "custom" && !createForm.custom_platform_name.trim()) {
        toast({ title: "Custom platform name is required", tone: "error" });
        return;
      }
      setCreating(true);
      const response = await api.createPropFirmAccount(buildPayload(createForm));
      setAccounts((current) => [response.account, ...current]);
      setCreateForm(emptyForm());
      toast({ title: "Prop firm account added", tone: "success" });
    } catch (error) {
      toast({
        title: "Could not add account",
        description:
          error instanceof ApiError && error.status === 402
            ? error.message
            : error instanceof Error
              ? error.message
              : "Unexpected error",
        tone: "error"
      });
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (account: PropFirmAccount) => {
    setEditing(account);
    setEditForm(fromAccountToForm(account));
  };

  const saveEdit = async () => {
    if (!editing) {
      return;
    }
    try {
      if (!editForm.name.trim()) {
        toast({ title: "Account name is required", tone: "error" });
        return;
      }
      if (editForm.platform === "custom" && !editForm.custom_platform_name.trim()) {
        toast({ title: "Custom platform name is required", tone: "error" });
        return;
      }
      setSavingEdit(true);
      const response = await api.updatePropFirmAccount(editing.id, buildPayload(editForm));
      setAccounts((current) => current.map((item) => (item.id === editing.id ? response.account : item)));
      setEditing(null);
      toast({ title: "Account updated", tone: "success" });
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Unexpected error",
        tone: "error"
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteAccount = async (account: PropFirmAccount) => {
    const confirmed = window.confirm(`Delete prop firm account "${account.name}"?`);
    if (!confirmed) {
      return;
    }
    try {
      await api.deletePropFirmAccount(account.id);
      setAccounts((current) => current.filter((item) => item.id !== account.id));
      toast({ title: "Account deleted", tone: "success" });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unexpected error",
        tone: "error"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Prop Firm Accounts" subtitle="Track multiple funded/eval accounts with editable rule sets and copy-trading group pairing." />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-ink-700">Accounts</p>
            <p className="mt-2 text-2xl font-semibold text-ink-900">{summary.total}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-ink-700">Copy-trading paired</p>
            <p className="mt-2 text-2xl font-semibold text-ink-900">{summary.copyTrading}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-ink-700">Standalone</p>
            <p className="mt-2 text-2xl font-semibold text-ink-900">{summary.standalone}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-ink-700">Avg daily loss cap</p>
            <p className="mt-2 text-2xl font-semibold text-ink-900">
              {summary.avgDailyLoss === null ? "-" : formatCurrency(summary.avgDailyLoss)}
            </p>
          </Card>
        </div>
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-100/60 p-3 text-sm text-ink-900">
          <p className="inline-flex items-center gap-2 font-semibold">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            Non-trailing drawdown values must be verified manually
          </p>
          <p className="mt-1 text-xs text-ink-800">
            Templates are editable by design because prop-firm rules can vary by account, phase, and promotions.
          </p>
        </div>
      </Card>

      <Tabs
        tabs={[
          { key: "accounts", label: "Accounts" },
          { key: "groups", label: "Copy Groups" }
        ]}
        activeKey={tab}
        onChange={(key) => setTab(key as PageTab)}
      />

      {tab === "accounts" ? (
        <div className="grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
          <AccountEditor
            title="Add account"
            subtitle="Create as many accounts as needed and edit each rule set independently."
            form={createForm}
            setForm={setCreateForm}
            submitting={creating}
            onSubmit={() => void createAccount()}
            submitLabel="Add prop account"
          />

          <Card>
            <CardHeader
              title="All accounts"
              subtitle="Separate accounts, separate rules. Pair by copy group if needed."
              action={<Badge tone="neutral">{accounts.length}</Badge>}
            />
            {accounts.length === 0 ? (
              <EmptyState
                title="No prop accounts yet"
                description="Add your first account and save the rule set so you can track limits by account."
                actionLabel="Load sample values"
                onAction={() => setCreateForm((current) => applyTemplateDefaults({ ...current, platform: "apex_trader", account_size: "50K" }))}
              />
            ) : (
              <div className="space-y-3">
                {accounts.map((account) => (
                  <article key={account.id} className="rounded-xl border border-ink-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink-900">{account.name}</p>
                        <p className="mt-1 text-xs text-ink-700">
                          {platformLabel(account.platform as PlatformKey, account.custom_platform_name)} · {account.account_size}
                          {account.is_copy_trading && account.copy_group_name ? ` · ${account.copy_group_name}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {account.drawdown_mode === "fixed" ? <Badge tone="success">Fixed DD</Badge> : <Badge tone="warning">Trailing DD</Badge>}
                        {account.is_copy_trading && <Badge tone="accent">{account.is_group_leader ? "Copy leader" : "Copy paired"}</Badge>}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-ink-200 bg-ink-100/40 px-3 py-2 text-xs text-ink-800">
                        Profit target: <strong className="text-ink-900">{account.profit_target === null ? "Not set" : formatCurrency(account.profit_target)}</strong>
                      </div>
                      <div className="rounded-lg border border-ink-200 bg-ink-100/40 px-3 py-2 text-xs text-ink-800">
                        Max size: <strong className="text-ink-900">{account.max_position_size === null ? "Not set" : `${account.max_position_size} contracts`}</strong>
                      </div>
                      <div className="rounded-lg border border-ink-200 bg-ink-100/40 px-3 py-2 text-xs text-ink-800">
                        Daily loss: <strong className="text-ink-900">{account.daily_loss_limit === null ? "Not set" : formatCurrency(account.daily_loss_limit)}</strong>
                      </div>
                      <div className="rounded-lg border border-ink-200 bg-ink-100/40 px-3 py-2 text-xs text-ink-800">
                        Max drawdown: <strong className="text-ink-900">{account.max_drawdown === null ? "Not set" : formatCurrency(account.max_drawdown)}</strong>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(account)} className="gap-2">
                        <Pencil className="h-4 w-4" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void deleteAccount(account)} className="gap-2 text-coral-500">
                        <Trash2 className="h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Copy-Trading Groups" subtitle="Accounts with the same group name are displayed together." />
            {groupedAccounts.length === 0 ? (
              <p className="text-sm text-ink-700">No copy-trading groups yet. Turn on copy-trading for any account and assign a group name.</p>
            ) : (
              <div className="space-y-3">
                {groupedAccounts.map((group) => (
                  <div key={group.groupKey} className="rounded-xl border border-ink-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
                        <Users className="h-4 w-4" />
                        {group.groupName}
                      </p>
                      <Badge tone="accent">{group.items.length} accounts</Badge>
                    </div>
                    <div className="mt-3 space-y-2">
                      {group.items.map((account) => (
                        <div key={account.id} className="flex items-center justify-between rounded-lg border border-ink-200 bg-ink-100/35 px-3 py-2">
                          <div>
                            <p className="text-sm font-semibold text-ink-900">{account.name}</p>
                            <p className="text-xs text-ink-700">
                              {platformLabel(account.platform as PlatformKey, account.custom_platform_name)} · {account.account_size}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {account.is_group_leader ? <Badge tone="success">Leader</Badge> : <Badge tone="neutral">Follower</Badge>}
                            <Button size="sm" variant="secondary" onClick={() => openEdit(account)}>
                              Edit
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="How Pairing Works" subtitle="Simple pairing for copy-trading setups without forcing one-size-fits-all rules." />
            <div className="space-y-3 text-sm text-ink-800">
              <p className="inline-flex items-start gap-2">
                <Link2 className="mt-0.5 h-4 w-4 text-ink-700" />
                Enable <strong>copy-trading</strong> on any account and give it a shared group name (for example, “NQ Cluster A”).
              </p>
              <p className="inline-flex items-start gap-2">
                <Copy className="mt-0.5 h-4 w-4 text-ink-700" />
                Accounts remain fully editable so you can handle firm-specific rule differences even inside the same copy group.
              </p>
              <p className="inline-flex items-start gap-2">
                <Building2 className="mt-0.5 h-4 w-4 text-ink-700" />
                Platform templates only prefill what is safe and known. Always verify your max drawdown type/value.
              </p>
            </div>
          </Card>
        </div>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing ? `Edit ${editing.name}` : "Edit account"}>
        {editing && (
          <AccountEditor
            title="Edit account"
            subtitle="Update values independently or change copy-group pairing."
            form={editForm}
            setForm={setEditForm}
            submitting={savingEdit}
            onSubmit={() => void saveEdit()}
            submitLabel="Save account"
          />
        )}
      </Modal>
    </div>
  );
}
