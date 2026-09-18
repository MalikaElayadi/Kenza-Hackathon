import { FormEvent, useEffect, useMemo, useState } from 'react';

type Trace = { tool: string; arguments: Record<string, unknown>; result: unknown };
type Reply = { response: string; language: string; intention: string; traces: Trace[]; facts: Array<{ type: string; value: string | number }>; needsHuman: boolean; latencyMs?: number };
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const conversationId = `CONV-${Date.now()}`;

export default function App() {
  const [view, setView] = useState<'chat' | 'dashboard'>('chat');
  const [text, setText] = useState('');
  const [telephone, setTelephone] = useState('+212697691176');
  const [messages, setMessages] = useState<Array<{ role: string; text: string; reply?: Reply }>>([]);
  const [reply, setReply] = useState<Reply | null>(null);
  const [data, setData] = useState<{ kpis?: Record<string, string>; orders?: unknown[]; escalations?: unknown[]; conversations?: unknown[]; relances?: unknown[] }>({});
  const [loading, setLoading] = useState(false);

  async function refreshDashboard() {
    const [kpis, orders, escalations, conversations, relances] = await Promise.all([fetch(`${API}/api/kpis`).then((r) => r.json()), fetch(`${API}/api/orders`).then((r) => r.json()), fetch(`${API}/api/escalations`).then((r) => r.json()), fetch(`${API}/api/conversations`).then((r) => r.json()), fetch(`${API}/api/relances`).then((r) => r.json())]);
    setData({ kpis, orders, escalations, conversations, relances });
  }
  useEffect(() => { if (view === 'dashboard') void refreshDashboard(); }, [view]);
  const stats = useMemo(() => data.kpis ?? {}, [data.kpis]);

  async function send(event: FormEvent) {
    event.preventDefault(); if (!text.trim() || loading) return; const outgoing = text.trim(); setText(''); setLoading(true);
    setMessages((current) => [...current, { role: 'user', text: outgoing }]);
    try {
      const socket = new WebSocket((import.meta.env.VITE_WS_URL ?? 'ws://localhost:3001') + '/ws');
      socket.onopen = () => socket.send(JSON.stringify({ conversationId, text: outgoing, telephone }));
      socket.onmessage = (event) => { const result = JSON.parse(event.data) as Reply; setReply(result); setMessages((current) => [...current, { role: 'agent', text: result.response, reply: result }]); setLoading(false); socket.close(); };
      socket.onerror = () => setLoading(false);
    } catch { setLoading(false); }
  }

  return <div className="min-h-screen bg-slate-950 text-slate-100">
    <header className="border-b border-slate-800 bg-slate-900/90"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4"><div><p className="text-xs uppercase tracking-[0.3em] text-cyan-400">Kenza commerce intelligence</p><h1 className="text-2xl font-semibold">Agent commercial marocain</h1></div><nav className="flex gap-2"><button className={`rounded-lg px-4 py-2 text-sm ${view === 'chat' ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800'}`} onClick={() => setView('chat')}>Simulateur</button><button className={`rounded-lg px-4 py-2 text-sm ${view === 'dashboard' ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800'}`} onClick={() => setView('dashboard')}>Dashboard</button></nav></div></header>
    <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8">{view === 'chat' ? <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"><div className="border-b border-slate-800 px-6 py-5"><p className="text-sm text-slate-400">Conversation WebSocket</p><h2 className="text-xl font-medium">Testez un cas jury en direct</h2></div><div className="min-h-[420px] space-y-4 p-6">{messages.length === 0 && <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-400">Essayez « prix REF-0026 », « REF-0019 » ou « je veux 30% ».</div>}{messages.map((message, index) => <div key={index} className={message.role === 'user' ? 'ml-10 rounded-xl bg-cyan-400 p-4 text-slate-950' : 'mr-10 rounded-xl bg-slate-800 p-4'}><p>{message.text}</p>{message.reply && <p className="mt-3 text-xs text-slate-400">{message.reply.intention} · {message.reply.language} · {message.reply.latencyMs ?? 'trace'} ms</p>}</div>)}</div><form onSubmit={send} className="flex gap-3 border-t border-slate-800 p-4"><input value={text} onChange={(event) => setText(event.target.value)} placeholder="Votre message..." className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"/><button disabled={loading} className="rounded-lg bg-cyan-400 px-5 font-medium text-slate-950 disabled:opacity-50">{loading ? '...' : 'Envoyer'}</button></form></div>
      <aside className="space-y-6"><div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="mb-4 text-lg">Identité client</h2><input value={telephone} onChange={(event) => setTelephone(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"/><p className="mt-3 text-xs text-slate-500">L’historique est recherché par téléphone côté API.</p></div><div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="mb-4 text-lg">Trace structurée</h2>{(reply?.traces ?? []).length === 0 ? <p className="text-sm text-slate-500">Les appels apparaîtront ici.</p> : reply?.traces.map((trace, index) => <div key={index} className="mb-3 border-l-2 border-cyan-400 pl-3"><p className="font-mono text-sm text-cyan-300">{trace.tool}()</p><p className="text-xs text-slate-400">Résultat PostgreSQL enregistré</p></div>)}</div></aside>
    </section> : <section className="space-y-6"><div className="grid gap-4 sm:grid-cols-4">{[['Conversations', stats.conversations ?? '0'], ['Commandes', stats.orders ?? '0'], ['CA agent', `${stats.agent_revenue ?? '0'} MAD`], ['Escalades', stats.escalations ?? '0']].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-3xl font-semibold text-cyan-300">{value}</p></div>)}</div><div className="grid gap-6 lg:grid-cols-2"><div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="mb-4 text-lg">Commandes récentes</h2>{(data.orders ?? []).slice(0, 8).map((order: any) => <div key={order.commande_id} className="flex justify-between border-b border-slate-800 py-3 text-sm"><span>{order.commande_id} · {order.statut}</span><strong>{order.total_mad} MAD</strong></div>)}</div><div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="mb-4 text-lg">File d’escalade</h2>{(data.escalations ?? []).slice(0, 8).map((item: any) => <div key={item.id} className="border-b border-slate-800 py-3 text-sm"><strong>{item.motif}</strong><p className="text-slate-400">{item.contexte_resume}</p></div>)}</div><div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="mb-4 text-lg">Conversations</h2>{(data.conversations ?? []).slice(0, 8).map((item: any) => <div key={item.id} className="border-b border-slate-800 py-3 text-sm"><strong>{item.id}</strong><p className="text-slate-400">{item.langue} · {item.statut}</p></div>)}</div><div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="mb-4 text-lg">Relances</h2>{(data.relances ?? []).slice(0, 8).map((item: any) => <div key={item.id} className="border-b border-slate-800 py-3 text-sm"><strong>Variante {item.variante}</strong><p className="text-slate-400">{item.resultat} · {item.conversation_id}</p></div>)}</div></div></section>}</main>
  </div>;
}
