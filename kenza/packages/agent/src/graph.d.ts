import { KenzaState } from './types';
/**
 * Kenza LangGraph - Main Orchestrator
 * 7 nodes, conditional routing, PostgreSQL checkpoint
 */
export declare class KenzaGraph {
    private graph;
    constructor();
    private setupNodes;
    private setupEdges;
    private routeAfterIntent;
    private routeAfterGuardrail;
    private isEscalationIntention;
    private isCatalogueIntention;
    compile(): import("@langchain/langgraph").CompiledStateGraph<KenzaState, Partial<KenzaState>, "__start__">;
}
export default KenzaGraph;
//# sourceMappingURL=graph.d.ts.map