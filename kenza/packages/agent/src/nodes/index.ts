import { Client } from 'pg';
import { createClient } from 'redis';
import { KenzaState, Intention, Language, Fact } from '../types';


/**
 * Node 1: Multimodal
 * Détecte et convertit audio/image en texte
 */
export async function multimodalNode(
  state: KenzaState,
  _pgClient: Client,
  _redisClient: ReturnType<typeof createClient>
): Promise<Partial<KenzaState>> {
  // TODO: Implémenter STT si audio
  // TODO: Implémenter vision si image
  // Pour maintenant : pass-through
  
  return {
    messages: state.messages,
  };
}

/**
 * Node 2: Intent Classification
 * Classifie l'intention, la langue, la difficulté
 */
export async function intentNode(
  state: KenzaState,
  _pgClient: Client,
  redisClient: ReturnType<typeof createClient>
): Promise<Partial<KenzaState>> {
  const lastMessage = state.messages[state.messages.length - 1];
  
  if (!lastMessage) {
    return { intention: 'inconnu' };
  }

  // TODO: Appeler LLM (GPT-4.1) avec few-shots
  // Pour maintenant : simple heuristique
  
  let intention: Intention = 'inconnu';
  let langue: Language = 'fr';
  let confiance = 85;

  const text = lastMessage.texte.toLowerCase();

  // Détection langue
  if (text.includes('السلام') || text.includes('سعر')) {
    langue = 'ar';
  } else if (
    text.includes('chhal') ||
    text.includes('kayna') ||
    text.includes('tawsil')
  ) {
    langue = 'darija';
  }

  // Détection intention
  if (
    text.includes('disponible') ||
    text.includes('stock') ||
    text.includes('chhal taman')
  ) {
    intention = 'prix_et_disponibilite';
  } else if (
    text.includes('rupture') ||
    text.includes('épuisé') ||
    text.includes('makaynach')
  ) {
    intention = 'rupture_de_stock';
  } else if (
    text.includes('taille') ||
    text.includes('quelle taille') ||
    text.includes('tsize')
  ) {
    intention = 'conseil_taille';
  } else if (
    text.includes('remise') ||
    text.includes('geste') ||
    text.includes('négociation')
  ) {
    intention = 'negociation';
  } else if (
    text.includes('facture') ||
    text.includes('ice') ||
    text.includes('société')
  ) {
    intention = 'hors_domaine';
  }

  // Cache en Redis
  await redisClient.hSet(`intent:${state.conversationId}`, {
    intention,
    langue,
    confiance: confiance.toString(),
  });

  return {
    intention,
    langue: langue as Language,
  };
}

/**
 * Node 3: Catalogue Search
 * Utilise les tools pour chercher produits
 */
export async function catalogueNode(
  state: KenzaState,
  pgClient: Client,
  _redisClient: ReturnType<typeof createClient>
): Promise<Partial<KenzaState>> {
  // TODO: Implémenter avec Tools (search_catalog, check_stock, get_price, etc.)
  // Pour maintenant : stub
  
  const facts: Fact[] = [];

  // Exemple : rechercher produit mentionné
  const lastMessage = state.messages[state.messages.length - 1];
  if (!lastMessage) {
    return { facts };
  }

  // Rechercher dans le catalogue
  const result = await pgClient.query(
    'SELECT ref, modele, prix_mad, stock FROM products WHERE modele ILIKE $1 LIMIT 1',
    [`%${lastMessage.texte}%`]
  );

  if (result.rows.length > 0) {
    const product = result.rows[0];
    facts.push({
      type: 'price',
      value: product.prix_mad,
      source: 'db:products',
      ref: product.ref,
      timestamp: new Date(),
    });
    facts.push({
      type: 'stock',
      value: product.stock,
      source: 'db:products',
      ref: product.ref,
      timestamp: new Date(),
    });
  }

  return { facts };
}

/**
 * Node 4: Conversation
 * Génère la réponse via LLM
 */
export async function conversationNode(
  _state: KenzaState,
  _pgClient: Client,
  _redisClient: ReturnType<typeof createClient>
): Promise<Partial<KenzaState>> {
  // TODO: Appeler LLM (GPT-5.5 pour raisonnement complexe, GPT-4.1 pour simple)
  // Utiliser state.facts, state.cart, state.langue, state.intention
  // Générer draft response
  
  const draft = `Je comprends votre demande. [Draft à générer par LLM]`;

  return {
    draft,
  };
}

/**
 * Node 5: Guardrail
 * Valide la réponse
 */
export async function guardrailNode(
  state: KenzaState,
  _pgClient: Client,
  _redisClient: ReturnType<typeof createClient>
): Promise<Partial<KenzaState>> {
  const violations: string[] = [];

  // Vérifier que tous les nombres mentionnés sont tracés
  const numberPattern = /\d+/g;
  const numbersInDraft = state.draft?.match(numberPattern) || [];
  
  for (const num of numbersInDraft) {
    const found = state.facts.some((f) => f.value.toString() === num);
    if (!found) {
      violations.push(`Nombre non justifié: ${num}`);
    }
  }

  // Vérifier pas de promesse de réassort
  if (state.draft?.includes('jours') && state.draft?.includes('revient')) {
    violations.push('Promesse de réassort détectée (interdit)');
  }

  // Vérifier pas de COD non autorisé
  if (state.draft?.includes('paiement à la livraison') && state.shipping?.cod === false) {
    violations.push('COD proposé non autorisé dans cette ville');
  }

  const ok = violations.length === 0;

  return {
    guardrail: {
      ok,
      violations,
      retries: 0,
    },
  };
}

/**
 * Node 6: Escalation
 * Crée une escalade pour intervention humaine
 */
export async function escalationNode(
  state: KenzaState,
  pgClient: Client,
  _redisClient: ReturnType<typeof createClient>
): Promise<Partial<KenzaState>> {
  const motif = state.escalation?.motif || 'motif_non_défini';
  const contexte = state.escalation?.contexte || 'Pas de contexte';

  // Créer l'escalade en BD
  await pgClient.query(
    `INSERT INTO escalations (conversation_id, motif, contexte_resume, payload, statut)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      state.conversationId,
      motif,
      contexte.substring(0, 500),
      JSON.stringify({
        intention: state.intention,
        langue: state.langue,
        derniers_messages: state.messages.slice(-3),
        facts: state.facts,
      }),
      'NEEDS_HUMAN_REVIEW',
    ]
  );

  return {
    needsHuman: true,
    draft: `Je transfère votre demande à mon équipe. Nous vous répondrons dans les meilleurs délais.`,
  };
}

export default {
  multimodalNode,
  intentNode,
  catalogueNode,
  conversationNode,
  guardrailNode,
  escalationNode,
};
