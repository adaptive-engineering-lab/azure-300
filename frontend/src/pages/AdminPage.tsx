import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth/AuthProvider';
import { useIsAdmin } from '../lib/admin/useIsAdmin';
import { useAdminQuestions } from '../lib/admin/useAdminQuestions';
import type { BankItem, NewQuestionInput } from '../lib/admin/mutations';
import { validateItem, type ItemType } from '../lib/admin/validators';
import { ROUTES } from '../lib/routes';
import { DOMAINS, DOMAIN_LABELS, type Domain } from '../lib/questions/types';

type Toast = { kind: 'success' | 'error'; message: string };

export default function AdminPage() {
  const { user } = useAuth();
  const adminStatus = useIsAdmin();
  const { items, status, error, create, update, remove } = useAdminQuestions();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<ItemType | 'all'>('all');
  const [filterDomain, setFilterDomain] = useState<Domain | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [addingType, setAddingType] = useState<ItemType | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const reviewerId = user?.email ?? user?.id ?? '';

  const visibleItems = useMemo(() => {
    return items
      .filter((it) => (filterType === 'all' ? true : it.type === filterType))
      .filter((it) => (filterDomain === 'all' ? true : it.domain === filterDomain))
      .filter((it) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          it.topic.toLowerCase().includes(q) ||
          JSON.stringify(it.content).toLowerCase().includes(q) ||
          it.id.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.type.localeCompare(b.type) || a.topic.localeCompare(b.topic));
  }, [items, search, filterType, filterDomain]);

  if (adminStatus === 'loading') return <p className="text-fg-muted">Checking access…</p>;
  if (!user || adminStatus === 'no') {
    return (
      <section className="mx-auto w-full max-w-2xl">
        <h1 className="text-2xl font-bold">Not authorized</h1>
        <p className="mt-3 text-fg-muted">This area is restricted to maintainers.</p>
        <Link to={ROUTES.home} className="mt-4 inline-flex rounded-md bg-bg-elevated px-4 py-2 text-sm">
          ← Home
        </Link>
      </section>
    );
  }
  if (status === 'loading' || status === 'idle') return <p className="text-fg-muted">Loading bank…</p>;
  if (status === 'error') return <p className="text-error">Failed to load: {error}</p>;

  function flash(t: Toast) {
    setToast(t);
    window.setTimeout(() => setToast(null), 3000);
  }

  async function onSave(id: string, draft: BankItem) {
    try {
      await update(
        id,
        { domain: draft.domain, topic: draft.topic, difficulty: draft.difficulty, source: draft.source, content: draft.content },
        reviewerId,
      );
      flash({ kind: 'success', message: 'Saved.' });
    } catch (e: unknown) {
      flash({ kind: 'error', message: (e as Error).message ?? 'Save failed' });
    }
  }

  async function onCreate(item: NewQuestionInput) {
    try {
      await create(item, reviewerId);
      setAddingType(null);
      flash({ kind: 'success', message: 'Created.' });
    } catch (e: unknown) {
      flash({ kind: 'error', message: (e as Error).message ?? 'Create failed' });
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Delete this question? This cannot be undone.')) return;
    try {
      await remove(id);
      if (openId === id) setOpenId(null);
      flash({ kind: 'success', message: 'Deleted.' });
    } catch (e: unknown) {
      flash({ kind: 'error', message: (e as Error).message ?? 'Delete failed' });
    }
  }

  return (
    <section>
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Live editor. Changes write directly to Supabase via RLS — no JSON export, no seed step.
        </p>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Search by topic, content, or id…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-md border border-divider bg-bg px-3 py-2 text-sm"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as ItemType | 'all')}
          className="rounded-md border border-divider bg-bg px-2 py-2 text-sm"
        >
          <option value="all">All types</option>
          <option value="flashcard">Flashcard</option>
          <option value="mcq">MCQ</option>
          <option value="product-id">Product-ID</option>
        </select>
        <select
          value={filterDomain}
          onChange={(e) => setFilterDomain(e.target.value as Domain | 'all')}
          className="rounded-md border border-divider bg-bg px-2 py-2 text-sm"
        >
          <option value="all">All domains</option>
          {DOMAINS.map((d) => (
            <option key={d} value={d}>{DOMAIN_LABELS[d]}</option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="ml-auto flex gap-2 text-xs">
          <button type="button" onClick={() => setAddingType('flashcard')} className="rounded-md bg-bg-elevated px-3 py-2">+ Flashcard</button>
          <button type="button" onClick={() => setAddingType('mcq')} className="rounded-md bg-bg-elevated px-3 py-2">+ MCQ</button>
          <button type="button" onClick={() => setAddingType('product-id')} className="rounded-md bg-bg-elevated px-3 py-2">+ Product-ID</button>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className={`mt-4 rounded-md p-3 text-sm ${
            toast.kind === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
          }`}
        >
          {toast.message}
        </div>
      )}

      {addingType && (
        <NewItemForm
          type={addingType}
          onCreate={onCreate}
          onCancel={() => setAddingType(null)}
        />
      )}

      <ul className="mt-4 space-y-2">
        {visibleItems.map((original) => {
          const isOpen = openId === original.id;
          return (
            <li key={original.id} className="rounded-lg bg-bg-elevated p-3">
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : original.id)}
                className="flex w-full items-baseline justify-between gap-2 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-fg-muted">
                    {original.type} · {DOMAIN_LABELS[original.domain as Domain] ?? original.domain} · {original.topic} · L{original.difficulty}
                  </p>
                  <p className="mt-1 truncate text-sm">{summary(original)}</p>
                </div>
                <span className="text-xs text-fg-muted">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <EditPanel
                  original={original}
                  onSave={(draft) => onSave(original.id, draft)}
                  onDelete={() => onDelete(original.id)}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function summary(it: BankItem): string {
  if (it.type === 'flashcard') return (it.content.front as string) ?? '';
  if (it.type === 'mcq') return (it.content.question as string) ?? '';
  if (it.type === 'product-id') return (it.content.service_name as string) ?? '';
  return '';
}

function EditPanel({
  original,
  onSave,
  onDelete,
}: {
  original: BankItem;
  onSave: (draft: BankItem) => Promise<void>;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<BankItem>(original);
  const [saving, setSaving] = useState(false);

  function setContentField(key: string, value: unknown) {
    setDraft({ ...draft, content: { ...draft.content, [key]: value } });
  }

  const validation = validateItem(draft.type, draft);
  const errors = validation.valid ? [] : validation.errors;
  const isDirty = JSON.stringify(original) !== JSON.stringify(draft);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 space-y-3 border-t border-divider pt-3">
      <p className="text-xs text-fg-muted">id: <code>{original.id}</code></p>

      {draft.type === 'flashcard' && (
        <>
          <Field label="Front" value={draft.content.front as string} onChange={(v) => setContentField('front', v)} multiline />
          <Field label="Back" value={draft.content.back as string} onChange={(v) => setContentField('back', v)} multiline />
        </>
      )}

      {draft.type === 'mcq' && (
        <>
          <Field label="Question" value={draft.content.question as string} onChange={(v) => setContentField('question', v)} multiline />
          {(['A', 'B', 'C', 'D'] as const).map((letter) => (
            <Field
              key={letter}
              label={`Option ${letter}`}
              value={(draft.content.options as Record<string, string>)[letter]}
              onChange={(v) =>
                setContentField('options', { ...(draft.content.options as Record<string, string>), [letter]: v })
              }
            />
          ))}
          <Field label="Correct (A/B/C/D)" value={draft.content.correct as string} onChange={(v) => setContentField('correct', v.toUpperCase())} />
          <Field label="Explanation" value={draft.content.explanation as string} onChange={(v) => setContentField('explanation', v)} multiline />
        </>
      )}

      {draft.type === 'product-id' && (
        <>
          <Field label="Service name" value={draft.content.service_name as string} onChange={(v) => setContentField('service_name', v)} />
          <Field label="Category" value={draft.content.category as string} onChange={(v) => setContentField('category', v)} />
          <Field label="Description" value={draft.content.description as string} onChange={(v) => setContentField('description', v)} multiline />
        </>
      )}

      <Field label="Topic" value={draft.topic} onChange={(v) => setDraft({ ...draft, topic: v })} />
      <Field
        label="Difficulty (1/2/3)"
        value={String(draft.difficulty)}
        onChange={(v) => setDraft({ ...draft, difficulty: (Number(v) || 1) as 1 | 2 | 3 } as never)}
      />

      {errors.length > 0 && (
        <ul className="rounded-md bg-error/10 p-2 text-xs text-error">
          {errors.map((e, i) => (
            <li key={i}>
              {e.field}: {e.reason}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || errors.length > 0 || saving}
          className="rounded-md bg-accent px-4 py-1.5 text-xs font-semibold text-accent-fg disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {isDirty && (
          <button type="button" onClick={() => setDraft(original)} className="rounded-md bg-bg px-3 py-1.5 text-xs">
            Revert
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="ml-auto rounded-md bg-error/15 px-3 py-1.5 text-xs text-error"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function NewItemForm({
  type,
  onCreate,
  onCancel,
}: {
  type: ItemType;
  onCreate: (item: NewQuestionInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<NewQuestionInput>(() => makeBlank(type));
  const [submitting, setSubmitting] = useState(false);
  const validation = validateItem(type, { id: 'pending', ...draft });
  const errors = validation.valid ? [] : validation.errors;

  function setContentField(key: string, value: unknown) {
    setDraft({ ...draft, content: { ...draft.content, [key]: value } });
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await onCreate(draft);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg bg-success/10 p-4 ring-1 ring-success">
      <h2 className="text-base font-bold">New {type}</h2>
      <div className="mt-3 space-y-3">
        {type === 'flashcard' && (
          <>
            <Field label="Front" value={draft.content.front as string} onChange={(v) => setContentField('front', v)} multiline />
            <Field label="Back" value={draft.content.back as string} onChange={(v) => setContentField('back', v)} multiline />
          </>
        )}
        {type === 'mcq' && (
          <>
            <Field label="Question" value={draft.content.question as string} onChange={(v) => setContentField('question', v)} multiline />
            {(['A', 'B', 'C', 'D'] as const).map((letter) => (
              <Field
                key={letter}
                label={`Option ${letter}`}
                value={(draft.content.options as Record<string, string>)[letter]}
                onChange={(v) =>
                  setContentField('options', { ...(draft.content.options as Record<string, string>), [letter]: v })
                }
              />
            ))}
            <Field label="Correct (A/B/C/D)" value={draft.content.correct as string} onChange={(v) => setContentField('correct', v.toUpperCase())} />
            <Field label="Explanation" value={draft.content.explanation as string} onChange={(v) => setContentField('explanation', v)} multiline />
          </>
        )}
        {type === 'product-id' && (
          <>
            <Field label="Service name" value={draft.content.service_name as string} onChange={(v) => setContentField('service_name', v)} />
            <Field label="Category" value={draft.content.category as string} onChange={(v) => setContentField('category', v)} />
            <Field label="Description" value={draft.content.description as string} onChange={(v) => setContentField('description', v)} multiline />
          </>
        )}
        <label className="block text-sm">
          <span className="block font-medium text-fg-muted">Domain</span>
          <select
            value={draft.domain}
            onChange={(e) => setDraft({ ...draft, domain: e.target.value })}
            className="mt-1 block w-full rounded-md border border-divider bg-bg px-3 py-2 text-fg"
          >
            {DOMAINS.map((d) => (
              <option key={d} value={d}>{DOMAIN_LABELS[d]}</option>
            ))}
          </select>
        </label>
        <Field label="Topic" value={draft.topic} onChange={(v) => setDraft({ ...draft, topic: v })} />
        <Field
          label="Difficulty (1/2/3)"
          value={String(draft.difficulty)}
          onChange={(v) => setDraft({ ...draft, difficulty: (Number(v) || 1) as 1 | 2 | 3 } as never)}
        />
      </div>

      {errors.length > 0 && (
        <ul className="mt-3 rounded-md bg-error/10 p-2 text-xs text-error">
          {errors.map((e, i) => (
            <li key={i}>{e.field}: {e.reason}</li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={errors.length > 0 || submitting}
          onClick={handleSubmit}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md bg-bg-elevated px-4 py-2 text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="block font-medium text-fg-muted">{label}</span>
      {multiline ? (
        <textarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 block w-full rounded-md border border-divider bg-bg px-3 py-2 text-fg"
          rows={3}
        />
      ) : (
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 block w-full rounded-md border border-divider bg-bg px-3 py-2 text-fg"
        />
      )}
    </label>
  );
}

function makeBlank(type: ItemType): NewQuestionInput {
  if (type === 'flashcard') {
    return {
      type: 'flashcard',
      domain: 'ml-lifecycle',
      topic: '',
      difficulty: 1,
      source: 'bank',
      content: { front: '', back: '' },
    };
  }
  if (type === 'mcq') {
    return {
      type: 'mcq',
      domain: 'ml-lifecycle',
      topic: '',
      difficulty: 1,
      source: 'bank',
      content: { question: '', options: { A: '', B: '', C: '', D: '' }, correct: 'A', explanation: '' },
    };
  }
  return {
    type: 'product-id',
    domain: 'ml-lifecycle',
    topic: '',
    difficulty: 1,
    source: 'bank',
    content: { service_name: '', category: 'Storage', description: '' },
  };
}
