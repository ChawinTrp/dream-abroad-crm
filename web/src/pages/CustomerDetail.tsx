import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronLeft, ChevronRight, ExternalLink,
  Star, AlertTriangle, Clock, Check,
  ArrowDownLeft, ArrowUpRight, RefreshCw,
} from 'lucide-react';
import { useFetch } from '../api/hooks';
import { api } from '../api/client';
import type { Customer, Agent, StageDefinition, TagDefinition, MessageResponse } from '../api/types';
import { useBoardFilters } from '../contexts/board-filters';
import { applyBoardFilters } from '../api/customer-list';

function SaveFlash({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium animate-pulse">
      <Check size={12} /> saved
    </span>
  );
}

function formatRelative(date: string | null): string {
  if (!date) return 'Never';
  const ms = Date.now() - new Date(date).getTime();
  const hours = Math.floor(ms / 3600000);
  if (hours < 1) return `${Math.floor(ms / 60000)}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function unattendedInfo(lastMessageAt: string | null, lastReplyAt: string | null) {
  if (!lastMessageAt) return null;
  const lastIn = new Date(lastMessageAt).getTime();
  const lastOut = lastReplyAt ? new Date(lastReplyAt).getTime() : 0;
  if (lastOut >= lastIn) return null;
  const ms = Date.now() - lastIn;
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const severity = hours >= 8 ? 'high' : hours >= 2 ? 'med' : 'low';
  return { hours, mins, severity };
}

const LINE_CHANNEL_ID = '1234567890';

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customer, refetch } = useFetch<Customer>(`/customers/${id}`, [id]);
  const { data: messagesRes, refetch: refetchMessages } = useFetch<MessageResponse>(
    `/customers/${id}/messages`,
    [id],
  );
  const { data: stages } = useFetch<StageDefinition[]>('/stages');
  const { data: agents } = useFetch<Agent[]>('/agents');
  const { data: allTags } = useFetch<TagDefinition[]>('/tags');
  const { data: allCustomers } = useFetch<Customer[]>('/customers');

  const filters = useBoardFilters();
  const currentAgent = useMemo(
    () => (agents ?? []).find((a) => a.role === 'agent'),
    [agents],
  );

  // Same ordered list the board shows, so prev/next walks the working set.
  const orderedList = useMemo(
    () =>
      applyBoardFilters(allCustomers ?? [], {
        search: filters.search,
        agentFilter: filters.agentFilter,
        countryFilter: filters.countryFilter,
        sort: filters.sort,
        currentAgentId: currentAgent?.id,
      }),
    [allCustomers, filters.search, filters.agentFilter, filters.countryFilter, filters.sort, currentAgent],
  );

  const currentIdx = useMemo(
    () => orderedList.findIndex((c) => c.id === Number(id)),
    [orderedList, id],
  );
  const prevCustomer = currentIdx > 0 ? orderedList[currentIdx - 1] : null;
  const nextCustomer = currentIdx >= 0 && currentIdx < orderedList.length - 1 ? orderedList[currentIdx + 1] : null;

  const [savedField, setSavedField] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [pendingTagId, setPendingTagId] = useState<number | null>(null);
  const [pendingUrgency, setPendingUrgency] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const notesTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (customer) setNotes(customer.notes ?? '');
  }, [customer]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesRes]);

  // Keyboard arrow nav (← →)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowLeft' && prevCustomer) navigate(`/customers/${prevCustomer.id}`);
      if (e.key === 'ArrowRight' && nextCustomer) navigate(`/customers/${nextCustomer.id}`);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [prevCustomer, nextCustomer, navigate]);

  const flash = useCallback((field: string) => {
    setSavedField(field);
    setTimeout(() => setSavedField(null), 1600);
  }, []);

  const patchCustomer = useCallback(
    async (field: string, data: Record<string, unknown>) => {
      await api.patch(`/customers/${id}`, data);
      flash(field);
      await refetch();
    },
    [id, flash, refetch],
  );

  const toggleUrgency = useCallback(async () => {
    if (!customer || pendingUrgency) return;
    setPendingUrgency(true);
    try {
      await patchCustomer('urgency', { urgencyFlag: !customer.urgencyFlag });
    } finally {
      setPendingUrgency(false);
    }
  }, [customer, pendingUrgency, patchCustomer]);

  const handleNotesBlur = useCallback(() => {
    if (notesTimer.current) clearTimeout(notesTimer.current);
    patchCustomer('notes', { notes });
  }, [notes, patchCustomer]);

  const handleNotesChange = useCallback((val: string) => {
    setNotes(val);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      patchCustomer('notes', { notes: val });
    }, 1500);
  }, [patchCustomer]);

  const handleMarkReplied = useCallback(async () => {
    if (!id) return;
    setReplyLoading(true);
    try {
      await api.post(`/customers/${id}/replied`);
      flash('reply');
      refetch();
    } finally {
      setReplyLoading(false);
    }
  }, [id, flash, refetch]);

  const toggleTag = useCallback(
    async (tagDefId: number, isActive: boolean) => {
      // Guard against double-click race: `isActive` is captured at render
      // time. Without awaiting refetch, fast successive clicks on the same
      // chip both see the same stale value and either both delete or both
      // post (latter is idempotent).
      if (pendingTagId === tagDefId) return;
      setPendingTagId(tagDefId);
      try {
        if (isActive) {
          await api.del(`/customers/${id}/tags/${tagDefId}`);
        } else {
          await api.post(`/customers/${id}/tags/${tagDefId}`);
        }
        flash('tags');
        await refetch();
      } finally {
        setPendingTagId(null);
      }
    },
    [id, flash, refetch, pendingTagId],
  );

  if (!customer || !stages || !agents || !allTags) {
    return <div className="flex items-center justify-center h-full text-muted">Loading...</div>;
  }

  const messages = messagesRes?.data ?? [];
  const uInfo = unattendedInfo(customer.lastMessageAt, customer.lastReplyAt);

  const tagsByType = (type: string) =>
    allTags.filter((t) => t.tagType === type);

  const customerHasTag = (tagDefId: number) =>
    customer.tags.some((t) => t.tagDefinitionId === tagDefId);

  // Group interested schools by country
  const interestedByCountry: Record<string, TagDefinition[]> = {};
  for (const t of tagsByType('interested_school')) {
    const cc = t.countryCode ?? 'Other';
    if (!interestedByCountry[cc]) interestedByCountry[cc] = [];
    interestedByCountry[cc].push(t);
  }

  // Group messages by date
  const messagesByDate: Record<string, typeof messages> = {};
  for (const m of messages) {
    const day = new Date(m.sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    if (!messagesByDate[day]) messagesByDate[day] = [];
    messagesByDate[day].push(m);
  }

  // "Needs reply" = customer's last inbound message is newer than agent's last reply.
  // Uses customer-level timestamps (which webhook + markReplied keep in sync) so
  // it works even for legacy customers whose chat history isn't fully captured.
  const needsReply = (() => {
    if (!customer.lastMessageAt) return false;
    const lastIn = new Date(customer.lastMessageAt).getTime();
    const lastOut = customer.lastReplyAt ? new Date(customer.lastReplyAt).getTime() : 0;
    return lastIn > lastOut;
  })();

  return (
    <div className="flex flex-col h-full">
      {/* Top nav */}
      <div className="bg-white border-b border-border px-6 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/board')} className="flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft size={16} /> Back
        </button>
        <span className="text-sm text-muted">›</span>
        <span className="text-sm font-semibold text-ink">{customer.displayName}</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => prevCustomer && navigate(`/customers/${prevCustomer.id}`)}
            disabled={!prevCustomer}
            title={prevCustomer ? `← ${prevCustomer.displayName}` : 'No previous'}
            className="p-1 rounded hover:bg-cream disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          {currentIdx >= 0 && orderedList.length > 0 && (
            <span className="text-[11px] text-muted tabular-nums px-1">
              {currentIdx + 1} of {orderedList.length}
            </span>
          )}
          <button
            onClick={() => nextCustomer && navigate(`/customers/${nextCustomer.id}`)}
            disabled={!nextCustomer}
            title={nextCustomer ? `→ ${nextCustomer.displayName}` : 'No next'}
            className="p-1 rounded hover:bg-cream disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
          {customer.lineUserId && (
            <a
              href={`https://chat.line.biz/${LINE_CHANNEL_ID}/chat/${customer.lineUserId}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded-lg hover:bg-green-600"
            >
              <ExternalLink size={12} /> Open in LINE OA
            </a>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left panel */}
        <div className="w-1/2 border-r border-border overflow-y-auto p-6 space-y-5">
          {/* Profile header */}
          <div className="flex items-center gap-3">
            {customer.pictureUrl ? (
              <img
                src={customer.pictureUrl}
                alt={customer.initials}
                className="w-12 h-12 rounded-full object-cover shrink-0"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0"
                style={{ background: customer.avatarColor }}
              >
                {customer.initials}
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-ink">{customer.displayName}</h2>
              {customer.followedAt ? (
                <p className="text-xs text-muted">
                  LINE follower since {new Date(customer.followedAt).toLocaleDateString()}
                </p>
              ) : (
                <p className="text-xs text-muted italic">
                  Discovered via message — follow date unknown
                </p>
              )}
            </div>
          </div>

          {/* Unattended panel */}
          {uInfo && (
            <div className={`rounded-lg p-3 ${uInfo.severity === 'high' ? 'bg-idle-high' : uInfo.severity === 'med' ? 'bg-idle-med' : 'bg-idle-low'}`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} className={uInfo.severity === 'high' ? 'text-red-600' : 'text-amber-600'} />
                <span className={`text-sm font-semibold ${uInfo.severity === 'high' ? 'text-red-700' : 'text-amber-700'}`}>
                  {uInfo.hours}h {uInfo.mins}m unattended
                </span>
              </div>
              <p className="text-xs text-muted">Last message: {formatRelative(customer.lastMessageAt)}</p>
              <p className="text-xs text-muted">Last reply: {customer.lastReplyAt ? formatRelative(customer.lastReplyAt) : 'No reply sent yet'}</p>
            </div>
          )}

          {/* Stage */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-xs font-semibold text-muted uppercase tracking-wide">Stage</label>
              <SaveFlash show={savedField === 'stage'} />
            </div>
            <select
              value={customer.stageId}
              onChange={(e) => patchCustomer('stage', { stageId: Number(e.target.value) })}
              className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Urgency */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-xs font-semibold text-muted uppercase tracking-wide">Urgency</label>
              <SaveFlash show={savedField === 'urgency'} />
            </div>
            <button
              onClick={toggleUrgency}
              disabled={pendingUrgency}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                customer.urgencyFlag
                  ? 'bg-red-100 text-red-700 border border-red-300'
                  : 'bg-cream text-muted border border-border'
              }`}
            >
              {customer.urgencyFlag ? '⚠ Flagged urgent' : 'Not flagged'}
            </button>
          </div>

          {/* Commitment */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-xs font-semibold text-muted uppercase tracking-wide">Commitment</label>
              <SaveFlash show={savedField === 'score'} />
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => patchCustomer('score', { commitmentScore: s })}
                  className="text-xl transition-colors"
                >
                  <Star
                    size={22}
                    className={s <= (customer.commitmentScore ?? 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}
                  />
                </button>
              ))}
              <span className="ml-2 text-xs text-muted">{customer.commitmentScore ?? 0}/5</span>
            </div>
          </div>

          {/* Tags — Current School (single select) */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-xs font-semibold text-muted uppercase tracking-wide">Current School</label>
              <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">single</span>
              <SaveFlash show={savedField === 'tags'} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tagsByType('current_school').map((t) => {
                const active = customerHasTag(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTag(t.id, active)}
                    disabled={pendingTagId === t.id}
                    className="text-xs font-medium px-2.5 py-1 rounded border transition-colors disabled:opacity-50"
                    style={
                      active
                        ? { background: t.colorBg ?? '#EEEDFE', borderColor: t.colorBorder ?? '#AFA9EC', color: t.colorText ?? '#3C3489' }
                        : { background: '#fff', borderColor: '#E8E6E1', color: '#6F6B65' }
                    }
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags — Interested Schools (multi, grouped by country) */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-xs font-semibold text-muted uppercase tracking-wide">Interested Schools</label>
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">multi</span>
            </div>
            {Object.entries(interestedByCountry).map(([country, tags]) => (
              <div key={country} className="mb-2">
                <span className="text-[11px] text-muted font-medium">{country}</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {tags.map((t) => {
                    const active = customerHasTag(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => toggleTag(t.id, active)}
                        disabled={pendingTagId === t.id}
                        className="text-xs font-medium px-2.5 py-1 rounded border transition-colors disabled:opacity-50"
                        style={
                          active
                            ? { background: t.colorBg ?? '#E1F5EE', borderColor: t.colorBorder ?? '#5DCAA5', color: t.colorText ?? '#085041' }
                            : { background: '#fff', borderColor: '#E8E6E1', color: '#6F6B65' }
                        }
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Tags — Countries */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-xs font-semibold text-muted uppercase tracking-wide">Countries</label>
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">multi</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tagsByType('country').map((t) => {
                const active = customerHasTag(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTag(t.id, active)}
                    disabled={pendingTagId === t.id}
                    className="text-xs font-medium px-2.5 py-1 rounded border transition-colors disabled:opacity-50"
                    style={
                      active
                        ? { background: t.colorBg ?? '#FAECE7', borderColor: t.colorBorder ?? '#F0997B', color: t.colorText ?? '#712B13' }
                        : { background: '#fff', borderColor: '#E8E6E1', color: '#6F6B65' }
                    }
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags — Programs */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-xs font-semibold text-muted uppercase tracking-wide">Programs</label>
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">multi</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tagsByType('program').map((t) => {
                const active = customerHasTag(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTag(t.id, active)}
                    disabled={pendingTagId === t.id}
                    className="text-xs font-medium px-2.5 py-1 rounded border transition-colors disabled:opacity-50"
                    style={
                      active
                        ? { background: t.colorBg ?? '#FAEEDA', borderColor: t.colorBorder ?? '#EF9F27', color: t.colorText ?? '#633806' }
                        : { background: '#fff', borderColor: '#E8E6E1', color: '#6F6B65' }
                    }
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-xs font-semibold text-muted uppercase tracking-wide">Notes</label>
              <SaveFlash show={savedField === 'notes'} />
            </div>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Add context about this student..."
              className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm focus:outline-none resize-y"
            />
          </div>

          {/* Assigned to */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-xs font-semibold text-muted uppercase tracking-wide">Assigned to</label>
              <SaveFlash show={savedField === 'agent'} />
            </div>
            <select
              value={customer.assignedAgentId ?? ''}
              onChange={(e) => patchCustomer('agent', { assignedAgentId: e.target.value ? Number(e.target.value) : null })}
              className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="">Unassigned</option>
              {agents.filter((a) => a.role === 'agent').map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Timeline */}
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 block">Timeline</label>
            <div className="space-y-1 text-xs text-muted">
              <div className="flex items-center gap-2">
                <Clock size={12} /> Followed: {customer.followedAt ? new Date(customer.followedAt).toLocaleDateString() : '—'}
              </div>
              <div className="flex items-center gap-2">
                <Clock size={12} /> Last message in: <span className={uInfo?.severity === 'high' ? 'text-red-600 font-medium' : ''}>{formatRelative(customer.lastMessageAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={12} /> Last reply out: {customer.lastReplyAt ? formatRelative(customer.lastReplyAt) : <span className="text-red-600 font-medium">None yet</span>}
                {customer.lastReplier && <span>· {customer.lastReplier.name}</span>}
              </div>
              <div className="flex items-center gap-2">
                <Clock size={12} /> Total messages: {customer.totalMessages}
              </div>
            </div>
          </div>
        </div>

        {/* Right panel — Chat history */}
        <div className="w-1/2 flex flex-col min-h-0">
          <div className="px-6 py-3 border-b border-border flex items-center gap-2 shrink-0">
            <h3 className="text-sm font-semibold text-ink">Chat history</h3>
            <span className="text-xs text-muted">{messages.length} messages · captured from LINE OA</span>
            <button onClick={refetchMessages} className="ml-auto p-1 rounded hover:bg-cream">
              <RefreshCw size={14} className="text-muted" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {Object.entries(messagesByDate).map(([day, msgs]) => (
              <div key={day}>
                <div className="flex justify-center mb-3">
                  <span className="text-[10px] text-muted bg-cream px-3 py-1 rounded-full">{day}</span>
                </div>
                {msgs.map((m) => {
                  const isOut = m.direction === 'out';
                  const agent = isOut ? agents.find((a) => a.id === m.agentId) : null;
                  return (
                    <div key={m.id} className={`flex gap-2 mb-3 ${isOut ? 'justify-end' : 'justify-start'}`}>
                      {!isOut && (
                        customer.pictureUrl ? (
                          <img
                            src={customer.pictureUrl}
                            alt={customer.initials}
                            className="w-7 h-7 rounded-full object-cover shrink-0 mt-1"
                          />
                        ) : (
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-1"
                            style={{ background: customer.avatarColor }}
                          >
                            {customer.initials}
                          </div>
                        )
                      )}
                      <div className={`max-w-[75%] ${isOut ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`rounded-xl px-3 py-2 text-sm ${
                            isOut ? 'bg-tag-school-bg text-ink rounded-tr-sm' : 'bg-white border border-border text-ink rounded-tl-sm'
                          }`}
                        >
                          {m.body}
                        </div>
                        <div className={`flex items-center gap-1 mt-0.5 text-[10px] text-muted ${isOut ? 'justify-end' : ''}`}>
                          {isOut ? <ArrowUpRight size={10} /> : <ArrowDownLeft size={10} />}
                          <span>{isOut && agent ? agent.name : customer.displayName}</span>
                          <span>·</span>
                          <span>{new Date(m.sentAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                      {isOut && agent && (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-1"
                          style={{ background: agent.avatarColor }}
                        >
                          {agent.initials}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Reply action bar */}
          <div className="border-t border-border bg-white">
            {needsReply && (
              <div className="px-6 py-2 bg-idle-high text-xs text-red-700 font-medium border-b border-red-200">
                No reply sent yet — reply in LINE OA, then mark below
              </div>
            )}
            <div className="px-6 py-3 flex items-center gap-3">
              {customer.lineUserId && (
                <a
                  href={`https://chat.line.biz/${LINE_CHANNEL_ID}/chat/${customer.lineUserId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1A1815] hover:underline"
                >
                  <ExternalLink size={12} /> Open in LINE OA
                </a>
              )}
              <div className="flex-1" />
              <button
                onClick={handleMarkReplied}
                disabled={replyLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-[#1A1815] hover:bg-[#3D3A35] disabled:opacity-50 transition-colors"
              >
                <Check size={12} strokeWidth={2.5} />
                {replyLoading ? 'Saving…' : 'Mark as replied'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
