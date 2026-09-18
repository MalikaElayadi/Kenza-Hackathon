import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { Client } from 'pg';
import { createClient } from 'redis';
import { catalogueNode, conversationNode, escalationNode, guardrailNode, intentNode, multimodalNode } from './nodes';
import { KenzaState, Language } from './types';

const StateAnnotation = Annotation.Root({
  conversationId: Annotation<string>,
  clientId: Annotation<string | undefined>,
  telephone: Annotation<string | undefined>,
  langue: Annotation<Language>({ reducer: (_left, right) => right, default: () => 'fr' }),
  messages: Annotation<KenzaState['messages']>({ reducer: (_left, right) => right, default: () => [] }),
  intention: Annotation<KenzaState['intention']>,
  facts: Annotation<KenzaState['facts']>({ reducer: (_left, right) => right, default: () => [] }),
  cart: Annotation<KenzaState['cart']>({ reducer: (_left, right) => right, default: () => [] }),
  ville: Annotation<string | undefined>,
  shipping: Annotation<KenzaState['shipping']>,
  remise: Annotation<KenzaState['remise']>,
  draft: Annotation<string | undefined>,
  guardrail: Annotation<KenzaState['guardrail']>,
  escalation: Annotation<KenzaState['escalation']>,
  orderId: Annotation<string | undefined>,
  needsHuman: Annotation<boolean>({ reducer: (_left, right) => right, default: () => false }),
});

export class KenzaGraph {
  private readonly graph: StateGraph<any>;

  constructor(private readonly pgClient: Client, private readonly redisClient: ReturnType<typeof createClient>) {
    this.graph = new StateGraph(StateAnnotation);
    this.graph
      .addNode('multimodal', (state) => multimodalNode(state as unknown as KenzaState, this.pgClient, this.redisClient))
      .addNode('intent', (state) => intentNode(state as unknown as KenzaState, this.pgClient, this.redisClient))
      .addNode('catalogue', (state) => catalogueNode(state as unknown as KenzaState, this.pgClient, this.redisClient))
      .addNode('conversation', (state) => conversationNode(state as unknown as KenzaState, this.pgClient, this.redisClient))
      .addNode('guardrail', (state) => guardrailNode(state as unknown as KenzaState, this.pgClient, this.redisClient))
      .addNode('escalation', (state) => escalationNode(state as unknown as KenzaState, this.pgClient, this.redisClient))
      .addEdge(START, 'multimodal')
      .addEdge('multimodal', 'intent')
      .addConditionalEdges('intent', (state) => this.routeAfterIntent(state as unknown as KenzaState), {
        catalogue: 'catalogue', conversation: 'conversation', escalate: 'escalation',
      })
      .addEdge('catalogue', 'conversation')
      .addEdge('conversation', 'guardrail')
      .addConditionalEdges('guardrail', (state) => this.routeAfterGuardrail(state as unknown as KenzaState), {
        valid: END, retry: 'conversation', escalate: 'escalation',
      })
      .addEdge('escalation', END);
  }

  private routeAfterIntent(state: KenzaState): 'catalogue' | 'conversation' | 'escalate' {
    if (state.needsHuman || ['hors_domaine', 'reclamation_arabe', 'rupture_arabe'].includes(state.intention ?? '')) return 'escalate';
    if (['prix_et_disponibilite', 'rupture_de_stock', 'darija_prix', 'conseil_taille', 'livraison_arabe'].includes(state.intention ?? '')) return 'catalogue';
    return 'conversation';
  }

  private routeAfterGuardrail(state: KenzaState): 'valid' | 'retry' | 'escalate' {
    if (state.guardrail?.ok) return 'valid';
    if ((state.guardrail?.retries ?? 0) < 1) return 'retry';
    return 'escalate';
  }

  compile() { return this.graph.compile(); }

  async invoke(state: KenzaState) {
    const result = await this.compile().invoke(state as unknown as Record<string, unknown>);
    return result as KenzaState;
  }
}

export { StateAnnotation };
export default KenzaGraph;
