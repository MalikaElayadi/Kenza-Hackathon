import { Client } from 'pg';
import { createClient } from 'redis';
import { KenzaState, Intention, Language, Fact } from '../types';
import Tools from '../tools';
import Guardrails from '../guardrails';

function detectLanguage(text: string): Language {
  if (/[\u0600-\u06ff]/u.test(text)) return 'ar';
  if (/(chhal|ch7al|chal|kayn|kain|bghit|taman|tawsil|makaynach)/i.test(text)) return 'darija';
  return 'fr';
}
function detectIntent(text: string): Intention {
  if (/(ice|facture.*soci[eé]t[eé]|soci[eé]t[eé]|r[eé]clamation|litige|plainte)/i.test(text)) return 'hors_domaine';
  if (/(remise|r[eé]duction|%)/i.test(text)) return 'negociation';
  if (/(taille|size|pointure)/i.test(text)) return 'conseil_taille';
  if (/(rupture|[eé]puis[eé]|makaynach)/i.test(text)) return 'rupture_de_stock';
  if (/(commande|prends|prendre|nsajel)/i.test(text)) return 'client_qui_revient';
  if (/(livraison|livrer|tawsil)/i.test(text)) return 'prix_et_disponibilite';
  if (/(prix|combien|chhal|ch7al|taman|disponible|stock)/i.test(text)) return 'prix_et_disponibilite';
  return 'inconnu';
}
function fact(type: string, value: string | number, source: string, ref?: string): Fact { return { type, value, source, ref, timestamp: new Date() }; }
function cityFrom(text: string) { return ['Casablanca', 'Rabat', 'Fès', 'Marrakech', 'Tanger', 'Agadir', 'Meknès', 'Oujda', 'Kénitra', 'Tétouan', 'Salé', 'Mohammedia'].find((city) => text.toLocaleLowerCase().includes(city.toLocaleLowerCase())); }

export async function multimodalNode(state: KenzaState, _pg: Client, _redis: ReturnType<typeof createClient>): Promise<Partial<KenzaState>> {
  return { messages: state.messages };
}

export async function intentNode(state: KenzaState, _pg: Client, redis: ReturnType<typeof createClient>): Promise<Partial<KenzaState>> {
  const message = state.messages.at(-1);
  if (!message) return { intention: 'inconnu', langue: state.langue };
  const langue = detectLanguage(message.texte);
  const intention = detectIntent(message.texte);
  await redis.hSet(`intent:${state.conversationId}`, { intention, langue });
  return { intention, langue };
}

export async function catalogueNode(state: KenzaState, pg: Client, _redis: ReturnType<typeof createClient>): Promise<Partial<KenzaState>> {
  const message = state.messages.at(-1);
  if (!message) return { facts: [] };
  const tools = new Tools(pg);
  const ref = message.texte.match(/REF-\d{4}/i)?.[0].toUpperCase();
  const family = ['robe', 'caftan', 'chemise', 'pantalon', 'blouson', 'foulard', 'sac', 'chaussures', 'ceinture'].find((value) => new RegExp(`\\b${value}`, 'i').test(message.texte));
  const search = await tools.searchCatalog({ famille: family, en_stock_seulement: false });
  const product = ref ? search.results.find((item) => item.ref === ref) ?? (await pg.query('SELECT ref, modele, famille, couleur, taille, prix_mad, stock FROM products WHERE ref = $1', [ref])).rows[0] : search.results[0];
  if (!product) return { facts: [] };
  const stock = await tools.checkStock({ ref: product.ref, taille: product.taille });
  const price = await tools.getPrice({ ref: product.ref });
  const facts = [fact('stock', stock.stock, 'db:products', product.ref), fact('price', price.prix_effectif, price.promo_id ? 'db:promotions' : 'db:products', product.ref)];
  const ville = cityFrom(message.texte);
  if (ville) {
    const shipping = await tools.getShippingCost({ ville });
    if (shipping.trouve) facts.push(fact('shipping', shipping.frais_mad ?? 0, 'db:shipping_rates'));
    return { facts, ville, shipping: shipping.trouve ? { frais: shipping.frais_mad, delai_h: shipping.delai_heures, cod: shipping.cod } : undefined };
  }
  return { facts };
}

export async function conversationNode(state: KenzaState, _pg: Client, _redis: ReturnType<typeof createClient>): Promise<Partial<KenzaState>> {
  const productFact = state.facts.find((item) => item.type === 'price');
  const stockFact = state.facts.find((item) => item.type === 'stock');
  if (!productFact) return { draft: 'Je peux vérifier un produit réel si vous me donnez sa référence ou sa famille.' };
  if (stockFact?.value === 0) return { draft: 'Ce produit est indisponible. Je peux rechercher une alternative réellement en stock.' };
  const price = `${productFact.value} MAD`;
  const shipping = state.shipping ? ` Livraison : ${state.shipping.frais} MAD.` : '';
  const draft = state.langue === 'darija' ? `Produit kayn b ${price}.${shipping} Bghiti nkemlou ?` : state.langue === 'ar' ? `المنتج متوفر بثمن ${price}.${shipping}` : `Le produit est disponible à ${price}.${shipping}`;
  return { draft };
}

export async function guardrailNode(state: KenzaState, _pg: Client, _redis: ReturnType<typeof createClient>): Promise<Partial<KenzaState>> {
  const result = Guardrails.validate(state);
  return { guardrail: { ...result, retries: state.guardrail?.retries ?? 0 } };
}

export async function escalationNode(state: KenzaState, pg: Client, _redis: ReturnType<typeof createClient>): Promise<Partial<KenzaState>> {
  const motif = state.escalation?.motif ?? 'information_insuffisante';
  const contexte = state.escalation?.contexte ?? state.messages.at(-1)?.texte ?? 'Contexte indisponible';
  await pg.query(`INSERT INTO escalations (conversation_id, motif, contexte_resume, payload, statut) VALUES ($1, $2, $3, $4, 'NEEDS_HUMAN_REVIEW')`, [state.conversationId, motif, contexte.slice(0, 500), JSON.stringify({ intention: state.intention, langue: state.langue, facts: state.facts })]);
  return { needsHuman: true, draft: state.langue === 'ar' ? 'سأحول طلبكم إلى فريقنا مع تفاصيل المحادثة.' : state.langue === 'darija' ? 'Ghadi n7awwel talab dyalk l’équipe dyalna.' : 'Je transmets votre demande à notre équipe avec le contexte de cet échange.' };
}

export default { multimodalNode, intentNode, catalogueNode, conversationNode, guardrailNode, escalationNode };
