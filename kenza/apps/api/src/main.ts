import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import { Pool } from 'pg';
import { createClient } from 'redis';
import { Queue } from 'bullmq';
import { classifyWithGpt41, planWithGpt55 } from './llm';

const app = Fastify({ logger: true });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const redis = createClient({ url: process.env.REDIS_URL });
const relanceQueue = new Queue('relances', { connection: { host: 'redis', port: 6379 } });
const cities = ['Casablanca', 'Rabat', 'Fès', 'Marrakech', 'Tanger', 'Agadir', 'Meknès', 'Oujda', 'Kénitra', 'Tétouan', 'Salé', 'Mohammedia'];
type Language = 'fr' | 'ar' | 'darija';
type Trace = { tool: string; arguments: Record<string, unknown>; result: unknown };
type Input = { conversationId: string; text: string; telephone?: string; clientId?: string; ville?: string };

function language(text: string): Language {
  if (/[\u0600-\u06ff]/u.test(text)) return 'ar';
  if (/(chhal|ch7al|chal|kayn|kain|bghit|taman|tawsil|makaynach)/i.test(text)) return 'darija';
  return 'fr';
}
function localized(lang: Language, fr: string, ar: string, darija: string) { return lang === 'ar' ? ar : lang === 'darija' ? darija : fr; }
function cityOf(text: string) { return cities.find((city) => text.toLocaleLowerCase().includes(city.toLocaleLowerCase())); }
function familyOf(text: string) {
  return ['robe', 'caftan', 'chemise', 'pantalon', 'blouson', 'foulard', 'sac', 'chaussures', 'ceinture', 'veste'].find((family) => new RegExp(`\\b${family}`, 'i').test(text));
}
function colorOf(text: string) { return ['noir', 'blanc', 'bleu', 'bordeaux', 'camel', 'beige', 'terracotta', 'vert olive'].find((color) => text.toLocaleLowerCase().includes(color)); }
function sizeOf(text: string) { return text.match(/(?:taille|size|pointure)\s*(S|M|L|XL|\d{2})\b/i)?.[1]?.toUpperCase(); }
function quantityOf(text: string) { return Number(text.match(/\b(\d+)\s+(?:pi[eè]ces?|articles?|produits?|de)/i)?.[1] ?? 1); }
function historyRequest(text: string) { return /(dernier|derni[eè]r|historique|anciens? achats?|achats?|commandes?)/i.test(text) || /(آخر|شريت|الحوايج)/u.test(text); }
function escalationReason(text: string) {
  if (/(ice|facture.*soci[eé]t[eé]|soci[eé]t[eé])/i.test(text)) return 'facturation_societe';
  if (/(r[eé]clamation|litige|plainte)/i.test(text)) return 'reclamation';
  const discount = text.match(/(\d+)\s*%/);
  if (discount && Number(discount[1]) > 10) return 'remise_excessive';
  if (/remboursement.*esp[eè]ces/i.test(text)) return 'remboursement_especes';
  return undefined;
}
async function traced<T>(traces: Trace[], tool: string, args: Record<string, unknown>, run: () => Promise<T>) { const result = await run(); traces.push({ tool, arguments: args, result }); return result; }

async function handle(input: Input) {
  const started = Date.now(); let lang = language(input.text); const traces: Trace[] = [];
  await pool.query(`INSERT INTO conversations (id, client_id, telephone, canal, langue, statut, cart, last_message_at) VALUES ($1, $2, $3, 'web', $4, 'ACTIVE', '[]'::jsonb, NOW()) ON CONFLICT (id) DO UPDATE SET last_message_at = NOW()`, [input.conversationId, input.clientId ?? null, input.telephone ?? null, lang]);
  let clientId = input.clientId;
  if (!clientId && input.telephone) clientId = (await traced(traces, 'get_client_history', { telephone: input.telephone }, async () => (await pool.query('SELECT client_id FROM clients WHERE telephone = $1', [input.telephone])).rows[0] ?? null))?.client_id;
  const requestedCity = cityOf(input.text);
  const mentionsDelivery = /(livraison|livrer|tawsil)/i.test(input.text);
  const reason = escalationReason(input.text) ?? (mentionsDelivery && !requestedCity && !input.ville ? 'ville_hors_grille' : undefined);
  let intention = reason ? 'hors_domaine' : historyRequest(input.text) ? 'suivi_commande' : /commande|prends|prendre|nsajel/i.test(input.text) ? 'commande' : /taille|size|pointure/i.test(input.text) ? 'conseil_taille' : 'prix_et_disponibilite';
  if (!reason) {
    try {
      const classified = await classifyWithGpt41(input.text);
      if (classified && classified.confiance >= 85) {
        intention = classified.intention;
        lang = classified.langue;
        traces.push({ tool: 'llm_classify_gpt41', arguments: { model: 'gpt-4.1' }, result: { intention, langue: lang, confiance: classified.confiance } });
      }
    } catch (error) {
      app.log.warn({ error }, 'GPT-4.1 classification unavailable; using deterministic fallback');
    }
  }
  if (reason || intention === 'changement_avis' || intention === 'negociation' || intention === 'inconnu') {
    try {
      const plan = await planWithGpt55({ message: input.text, intention, langue: lang, hasBusinessFacts: false });
      if (plan) traces.push({ tool: 'llm_plan_gpt55', arguments: { model: 'gpt-5.5' }, result: { decision: plan.decision ?? plan.action ?? 'structured' } });
    } catch (error) {
      app.log.warn({ error }, 'GPT-5.5 planning unavailable; continuing with deterministic workflow');
    }
  }
  let draft: string; let facts: Array<{ type: string; value: string | number; source: string; ref?: string }> = [];
  let cart = ((await pool.query('SELECT cart FROM conversations WHERE id = $1', [input.conversationId])).rows[0]?.cart ?? []) as Array<{ ref: string; modele: string; taille: string; qte: number; prix_unitaire: number }>;
  if (reason) {
    await traced(traces, 'escalate', { motif: reason }, async () => (await pool.query(`INSERT INTO escalations (conversation_id, motif, contexte_resume, payload) VALUES ($1, $2, $3, $4) RETURNING id, statut`, [input.conversationId, reason, input.text, JSON.stringify({ clientId, lang })])).rows[0]);
    draft = localized(lang, 'Je transmets votre demande à notre équipe avec le contexte de cet échange.', 'سأحول طلبكم إلى فريقنا مع تفاصيل المحادثة.', 'Ghadi n7awwel talab dyalk l’équipe dyalna m3a tafasil dyal l-mohadata.');
  } else if (intention === 'suivi_commande') {
    const history = await traced(traces, 'get_client_history', { clientId, telephone: input.telephone }, async () => {
      const client = clientId ? (await pool.query('SELECT client_id, nom FROM clients WHERE client_id = $1', [clientId])).rows[0] : null;
      if (!client) return { client: null, orders: [] };
      return { client, orders: (await pool.query(`SELECT o.commande_id, o.date, o.total_mad, o.statut, COALESCE(json_agg(json_build_object('modele', oi.modele, 'taille', oi.taille, 'quantite', oi.quantite)) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items FROM orders o LEFT JOIN order_items oi ON oi.commande_id = o.commande_id WHERE o.client_id = $1 GROUP BY o.commande_id ORDER BY o.date DESC LIMIT 5`, [client.client_id])).rows };
    });
    if (!history.client) draft = localized(lang, 'J’ai besoin de votre téléphone ou identifiant client pour retrouver vos commandes.', 'أحتاج إلى رقم هاتفكم أو معرف العميل للعثور على طلباتكم.', 'Khasni numéro téléphone dyalk bach nl9a commandes dyalk.');
    else draft = localized(lang, `Voici vos dernières commandes : ${history.orders.map((order: { commande_id: string; statut: string }) => `${order.commande_id} (${order.statut})`).join(', ')}.`, `هذه آخر طلباتكم: ${history.orders.map((order: { commande_id: string; statut: string }) => `${order.commande_id} (${order.statut})`).join('، ')}.`, `Hadi huma akher commandes dyalk: ${history.orders.map((order: { commande_id: string; statut: string }) => `${order.commande_id} (${order.statut})`).join(', ')}.`);
  } else {
    const ref = input.text.match(/REF-\d{4}/i)?.[0].toUpperCase() ?? cart[0]?.ref;
    const family = familyOf(input.text);
    const color = colorOf(input.text);
    const requestedSize = sizeOf(input.text);
    const product = await traced(traces, 'search_catalog', { ref, famille: family }, async () => {
      const result = ref
        ? requestedSize
          ? await pool.query('SELECT ref, modele, taille, famille, couleur, prix_mad, stock FROM products WHERE modele = (SELECT modele FROM products WHERE ref = $1 LIMIT 1) AND taille = $2 LIMIT 1', [ref, requestedSize])
          : await pool.query('SELECT ref, modele, taille, famille, couleur, prix_mad, stock FROM products WHERE ref = $1', [ref])
        : family
          ? await pool.query('SELECT ref, modele, taille, famille, couleur, prix_mad, stock FROM products WHERE famille ILIKE $1 AND ($2::text IS NULL OR couleur ILIKE $2) AND stock > 0 ORDER BY ref LIMIT 1', [`%${family}%`, color ? `%${color}%` : null])
          : { rows: [] };
      return result.rows[0] ?? null;
    });
    if (!product) {
      draft = localized(lang, 'Je n’ai pas trouvé ce produit dans notre catalogue. Donnez-moi une autre caractéristique ou une couleur.', 'لم أجد هذا المنتج في الكتالوج. اذكروا خاصية أو لونا آخر.', 'Ma l9it had produit f-catalogue. 3tini couleur wela caractéristique okhra.');
    } else {
      const stock = await traced(traces, 'check_stock', { ref: product.ref, taille: product.taille }, async () => ({ disponible: product.stock > 0, stock: product.stock, ref: product.ref }));
      facts.push({ type: 'stock', value: stock.stock, source: 'db:products', ref: product.ref });
      if (!stock.disponible) {
        await traced(traces, 'suggest_alternatives', { ref: product.ref }, async () => (await pool.query('SELECT ref, modele, taille, couleur, stock FROM products WHERE famille = $1 AND stock > 0 AND ref <> $2 ORDER BY ABS(prix_mad - $3) LIMIT 3', [product.famille, product.ref, product.prix_mad])).rows);
        draft = localized(lang, `La référence ${product.ref} est indisponible. Je peux proposer une alternative réellement en stock.`, `المرجع ${product.ref} غير متوفر. يمكنني اقتراح بديل متوفر فعليا.`, `${product.ref} makaynch daba. Nqder n9ترح 3lik alternative kayna f-stock.`);
      } else {
        const price = await traced(traces, 'get_price', { ref: product.ref }, async () => (await pool.query(`SELECT p.prix_mad AS prix_normal, COALESCE((SELECT prix_promo_mad FROM promotions pr WHERE pr.ref = p.ref AND pr.debut <= CURRENT_DATE AND pr.fin >= CURRENT_DATE LIMIT 1), p.prix_mad) AS prix_effectif FROM products p WHERE p.ref = $1`, [product.ref])).rows[0]);
        facts.push({ type: 'price', value: price.prix_effectif, source: 'db:products+promotions', ref: product.ref });
        const city = input.ville ?? cityOf(input.text);
        const shipping = city ? await traced(traces, 'get_shipping_cost', { ville: city }, async () => { const row = (await pool.query('SELECT frais_mad, delai_heures, paiement_a_la_livraison FROM shipping_rates WHERE ville = $1', [city])).rows[0]; return row ? { trouve: true, ...row } : { trouve: false }; }) : null;
        if (shipping && !shipping.trouve) draft = localized(lang, 'Cette ville ne figure pas dans notre grille. Je transmets la demande à un conseiller.', 'هذه المدينة غير موجودة في شبكة التوصيل. سأحول الطلب إلى مستشار.', 'Had l-mdina makaynach f-grille dyal tawsil. Ghadi n7awwel talab l-mostaشار.');
        else if (shipping && intention === 'commande' && clientId) {
          facts.push({ type: 'shipping', value: shipping.frais_mad, source: 'db:shipping_rates' });
          const order = await traced(traces, 'create_order', { ref: product.ref, ville: city }, async () => {
            await pool.query('BEGIN');
            try {
              const locked = (await pool.query('SELECT stock FROM products WHERE ref = $1 FOR UPDATE', [product.ref])).rows[0];
              if (!locked || locked.stock < 1) throw new Error('Stock insufficient');
              await pool.query('UPDATE products SET stock = stock - 1 WHERE ref = $1', [product.ref]); const id = `CMD-${Date.now()}`; const total = price.prix_effectif + shipping.frais_mad;
              await pool.query(`INSERT INTO orders (commande_id, client_id, date, canal, statut, total_articles_mad, frais_livraison_mad, total_mad, ville_livraison, paiement, created_by) VALUES ($1, $2, CURRENT_DATE, 'web', 'en préparation', $3, $4, $5, $6, $7, 'agent')`, [id, clientId, price.prix_effectif, shipping.frais_mad, total, city, shipping.paiement_a_la_livraison ? 'à la livraison' : 'virement']);
              await pool.query('INSERT INTO order_items (commande_id, ref, modele, taille, quantite, prix_unitaire_mad) VALUES ($1, $2, $3, $4, 1, $5)', [id, product.ref, product.modele, product.taille, price.prix_effectif]); await pool.query('COMMIT'); return { commande_id: id, total_mad: total };
            } catch (error) { await pool.query('ROLLBACK'); throw error; }
          });
          facts.push({ type: 'total', value: order.total_mad, source: 'calc:order' }); draft = localized(lang, `Commande ${order.commande_id} créée. Total: ${order.total_mad} MAD.`, `تم إنشاء الطلب ${order.commande_id}. المجموع: ${order.total_mad} MAD.`, `Commande ${order.commande_id} tsjlat. Total: ${order.total_mad} MAD.`);
        } else { if (shipping) facts.push({ type: 'shipping', value: shipping.frais_mad, source: 'db:shipping_rates' }); cart = [{ ref: product.ref, modele: product.modele, taille: product.taille, qte: quantityOf(input.text), prix_unitaire: price.prix_effectif }]; draft = shipping ? localized(lang, `Le produit est disponible à ${price.prix_effectif} MAD. Livraison à ${city} : ${shipping.frais_mad} MAD.`, `المنتج متوفر بثمن ${price.prix_effectif} MAD. التوصيل إلى ${city}: ${shipping.frais_mad} درهم.`, `Produit kayn b ${price.prix_effectif} MAD. Tawsil l ${city}: ${shipping.frais_mad} MAD.`) : localized(lang, `Le produit est disponible à ${price.prix_effectif} MAD. Donnez votre ville pour vérifier la livraison.`, `المنتج متوفر بثمن ${price.prix_effectif} MAD. أرسلوا المدينة للتحقق من التوصيل.`, `Produit kayn b ${price.prix_effectif} MAD. 3tini l-mdina bach nchecki tawsil.`); }
      }
    }
  }
  await pool.query('UPDATE conversations SET langue = $2, cart = $3, last_message_at = NOW() WHERE id = $1', [input.conversationId, lang, JSON.stringify(cart)]);
  if (cart.length > 0 && intention !== 'commande' && !reason) {
    const delay = Number(process.env.DEMO_DELAY_MINUTES ?? 1440) * 60_000;
    await relanceQueue.add('abandoned-cart', { conversationId: input.conversationId, language: lang }, { delay, jobId: `abandoned-${input.conversationId}` });
  }
  await pool.query(`INSERT INTO messages (conversation_id, role, texte, intention, langue, tool_calls, latency_ms) VALUES ($1, 'user', $2, $3, $4, $5, $6), ($1, 'agent', $7, $3, $4, $5, $6)`, [input.conversationId, input.text, intention, lang, JSON.stringify(traces), Date.now() - started, draft]);
  return { conversationId: input.conversationId, response: draft, language: lang, intention, traces, facts, latencyMs: Date.now() - started, needsHuman: Boolean(reason) };
}

await app.register(cors, { origin: true }); await app.register(websocket);
app.get('/health', async () => ({ status: 'ok', db: (await pool.query('SELECT 1')).rowCount === 1, redis: (await redis.ping()) === 'PONG' }));
app.get('/api/catalog', async () => (await pool.query(`SELECT p.*, COALESCE((SELECT prix_promo_mad FROM promotions pr WHERE pr.ref = p.ref AND pr.debut <= CURRENT_DATE AND pr.fin >= CURRENT_DATE LIMIT 1), p.prix_mad) AS prix_effectif FROM products p ORDER BY ref`)).rows);
app.get('/api/orders', async () => (await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 100')).rows);
app.get('/api/conversations', async () => (await pool.query('SELECT * FROM conversations ORDER BY last_message_at DESC LIMIT 100')).rows);
app.get('/api/escalations', async () => (await pool.query('SELECT * FROM escalations ORDER BY created_at DESC LIMIT 100')).rows);
app.get('/api/relances', async () => (await pool.query('SELECT * FROM relances ORDER BY created_at DESC LIMIT 100')).rows);
app.get('/api/kpis', async () => (await pool.query(`SELECT (SELECT COUNT(*) FROM conversations WHERE statut = 'ACTIVE') AS conversations, (SELECT COUNT(*) FROM orders) AS orders, (SELECT COALESCE(SUM(total_mad), 0) FROM orders WHERE created_by = 'agent') AS agent_revenue, (SELECT COUNT(*) FROM escalations WHERE statut = 'NEEDS_HUMAN_REVIEW') AS escalations`)).rows[0]);
app.post<{ Body: Omit<Input, 'conversationId'> & { conversationId?: string } }>('/api/messages', async (request) => handle({ conversationId: request.body.conversationId ?? `CONV-${Date.now()}`, ...request.body }));
app.get('/ws', { websocket: true }, (socket) => socket.on('message', async (raw: Buffer) => { try { socket.send(JSON.stringify(await handle(JSON.parse(raw.toString())))); } catch (error) { socket.send(JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur interne' })); } }));

async function start() { await pool.query('SELECT 1'); await redis.connect(); await app.listen({ port: Number(process.env.API_PORT ?? 3001), host: '0.0.0.0' }); }
start().catch((error) => { app.log.error(error); process.exit(1); });
