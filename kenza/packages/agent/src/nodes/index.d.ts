import { Client } from 'pg';
import { createClient } from 'redis';
import { KenzaState } from '../types';
/**
 * Node 1: Multimodal
 * Détecte et convertit audio/image en texte
 */
export declare function multimodalNode(state: KenzaState, _pgClient: Client, _redisClient: ReturnType<typeof createClient>): Promise<Partial<KenzaState>>;
/**
 * Node 2: Intent Classification
 * Classifie l'intention, la langue, la difficulté
 */
export declare function intentNode(state: KenzaState, _pgClient: Client, redisClient: ReturnType<typeof createClient>): Promise<Partial<KenzaState>>;
/**
 * Node 3: Catalogue Search
 * Utilise les tools pour chercher produits
 */
export declare function catalogueNode(state: KenzaState, pgClient: Client, _redisClient: ReturnType<typeof createClient>): Promise<Partial<KenzaState>>;
/**
 * Node 4: Conversation
 * Génère la réponse via LLM
 */
export declare function conversationNode(state: KenzaState, _pgClient: Client, _redisClient: ReturnType<typeof createClient>): Promise<Partial<KenzaState>>;
/**
 * Node 5: Guardrail
 * Valide la réponse
 */
export declare function guardrailNode(state: KenzaState, _pgClient: Client, _redisClient: ReturnType<typeof createClient>): Promise<Partial<KenzaState>>;
/**
 * Node 6: Escalation
 * Crée une escalade pour intervention humaine
 */
export declare function escalationNode(state: KenzaState, pgClient: Client, _redisClient: ReturnType<typeof createClient>): Promise<Partial<KenzaState>>;
declare const _default: {
    multimodalNode: typeof multimodalNode;
    intentNode: typeof intentNode;
    catalogueNode: typeof catalogueNode;
    conversationNode: typeof conversationNode;
    guardrailNode: typeof guardrailNode;
    escalationNode: typeof escalationNode;
};
export default _default;
//# sourceMappingURL=index.d.ts.map