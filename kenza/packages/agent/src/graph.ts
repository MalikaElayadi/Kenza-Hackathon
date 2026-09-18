import { StateGraph, END, START } from '@langchain/langgraph';
import { KenzaState, Intention } from './types';

/**
 * Kenza LangGraph - Main Orchestrator
 * 7 nodes, conditional routing, PostgreSQL checkpoint
 */

export class KenzaGraph {
  private graph: StateGraph<any, any, any, any>;

  constructor() {
    this.graph = new StateGraph({ channels: {} } as any);
    this.setupNodes();
    this.setupEdges();
  }

  private setupNodes() {
    // Node 1: Multimodal (STT, Vision)
    this.graph.addNode('multimodal', async (state: KenzaState) => {
      // TODO: Handle audio/image inputs
      // For now, pass through
      return state;
    });

    // Node 2: Intent Classification
    this.graph.addNode('intent', async (state: KenzaState) => {
      // TODO: Call LLM to classify intention + language + difficulty
      // Parse response using Zod
      // Update state.intention, state.langue
      return state;
    });

    // Node 3: Catalogue Search
    this.graph.addNode('catalogue', async (state: KenzaState) => {
      // TODO: Call tools (search_catalog, check_stock, get_price, etc.)
      // Fill facts array with traced results
      return state;
    });

    // Node 4: Conversation (Main Dialog)
    this.graph.addNode('conversation', async (state: KenzaState) => {
      // TODO: Call LLM for dialog
      // Use facts (not hallucinate)
      // Generate draft response
      // Manage memory and cart
      return state;
    });

    // Node 5: Guardrail (Validation)
    this.graph.addNode('guardrail', async (state: KenzaState) => {
      // TODO: Validate response
      // Check no invented numbers
      // Check remise <= 10%
      // Check no reassort promises
      // Return guardrail result
      return state;
    });

    // Node 6: Escalation
    this.graph.addNode('escalation', async (state: KenzaState) => {
      // TODO: Create escalation record
      // Send context to human
      return state;
    });

    // Node 7: Relance (Abandoned Cart)
    // Note: This runs async via BullMQ, not in sync loop
  }

  private setupEdges() {
    // Entry point
    // Flow: start -> multimodal -> intent
    this.graph.addEdge(START, 'multimodal');
    this.graph.addEdge('multimodal', 'intent');

    // Flow: intent -> catalogue OR conversation (conditional)
    this.graph.addConditionalEdges(
      'intent',
      this.routeAfterIntent,
      {
        catalogue: 'catalogue',
        conversation: 'conversation',
        escalate: 'escalation',
      }
    );

    // Flow: catalogue -> conversation
    this.graph.addEdge('catalogue', 'conversation');

    // Flow: conversation -> guardrail
    this.graph.addEdge('conversation', 'guardrail');

    // Flow: guardrail -> END or retry (conditional)
    this.graph.addConditionalEdges(
      'guardrail',
      this.routeAfterGuardrail,
      {
        valid: END,
        retry: 'conversation',
        escalate: 'escalation',
      }
    );

    // Flow: escalation -> END
    this.graph.addEdge('escalation', END);
  }

  private routeAfterIntent(state: KenzaState): string {
    const intention = state.intention;

    // Escalade intentions go directly
    if (this.isEscalationIntention(intention)) {
      return 'escalate';
    }

    // Catalogue-related intentions
    if (this.isCatalogueIntention(intention)) {
      return 'catalogue';
    }

    // Default to conversation
    return 'conversation';
  }

  private routeAfterGuardrail(state: KenzaState): string {
    const guardrail = state.guardrail;

    if (!guardrail) {
      return 'valid';
    }

    if (guardrail.ok) {
      return 'valid';
    }

    // If violations and retries < 1
    if (guardrail.retries < 1) {
      guardrail.retries++;
      return 'retry';
    }

    // Max retries exceeded
    return 'escalate';
  }

  private isEscalationIntention(intention?: Intention): boolean {
    const escalationIntentions = [
      'hors_domaine',
      'reclamation_arabe',
      'rupture_arabe',
    ];
    return intention ? escalationIntentions.includes(intention) : false;
  }

  private isCatalogueIntention(intention?: Intention): boolean {
    const catalogueIntentions = [
      'prix_et_disponibilite',
      'rupture_de_stock',
      'conseil_taille',
    ];
    return intention ? catalogueIntentions.includes(intention) : false;
  }

  public compile() {
    return this.graph.compile();
  }
}

export default KenzaGraph;
