export type Language = 'fr' | 'ar' | 'darija';
export type Intention = 'prix_et_disponibilite' | 'rupture_de_stock' | 'darija_prix' | 'conseil_taille' | 'negociation' | 'question_arabe' | 'client_qui_revient' | 'changement_avis' | 'note_vocale' | 'photo_produit' | 'suivi_commande' | 'retour_produit' | 'hors_domaine' | 'livraison_arabe' | 'rupture_arabe' | 'reclamation_arabe' | 'panier_abandonne' | 'inconnu';
export interface BaseMessage {
    role: 'user' | 'agent';
    texte: string;
    timestamp: Date;
    intention?: Intention;
    langue?: Language;
    tool_calls?: ToolCall[];
}
export interface ToolCall {
    tool_name: string;
    arguments: Record<string, any>;
    result?: any;
    timestamp: Date;
}
export interface CartItem {
    ref: string;
    modele: string;
    taille: string;
    qte: number;
    prix_unitaire: number;
}
export interface Fact {
    type: string;
    value: string | number;
    source: string;
    ref?: string;
    timestamp: Date;
}
export interface GuardrailResult {
    ok: boolean;
    violations: string[];
    retries: number;
}
export interface EscalationInfo {
    motif: string;
    contexte: string;
    timestamp: Date;
}
export interface ShippingInfo {
    frais: number;
    delai_h: number;
    cod: boolean;
}
export interface RemiseInfo {
    demandee_pct: number;
    accordee_pct: number;
}
export interface KenzaState {
    conversationId: string;
    clientId?: string;
    telephone?: string;
    langue: Language;
    messages: BaseMessage[];
    intention?: Intention;
    facts: Fact[];
    cart: CartItem[];
    ville?: string;
    shipping?: ShippingInfo;
    remise?: RemiseInfo;
    draft?: string;
    guardrail?: GuardrailResult;
    escalation?: EscalationInfo;
    orderId?: string;
    needsHuman: boolean;
}
export interface Product {
    ref: string;
    modele: string;
    famille: string;
    genre: string;
    couleur: string;
    taille: string;
    matiere: string;
    saison: string;
    prix_mad: number;
    stock: number;
    delai_reassort_jours?: number;
    code_barre: string;
    poids_g: number;
}
export interface Client {
    client_id: string;
    nom: string;
    telephone: string;
    ville: string;
    langue_preferee: Language;
    premier_achat: Date;
    nb_commandes: number;
    segment: string;
}
export interface Order {
    commande_id: string;
    client_id: string;
    date: Date;
    canal: string;
    statut: string;
    total_articles_mad: number;
    frais_livraison_mad: number;
    total_mad: number;
    ville_livraison: string;
    paiement: string;
    created_by: 'agent' | 'humain';
}
export interface OrderItem {
    id: number;
    commande_id: string;
    ref: string;
    modele: string;
    taille: string;
    quantite: number;
    prix_unitaire_mad: number;
}
export interface ShippingRate {
    ville: string;
    frais_mad: number;
    delai_heures: number;
    paiement_a_la_livraison: boolean;
    retrait_boutique: boolean;
}
export interface Promotion {
    id: number;
    ref: string;
    modele: string;
    prix_normal_mad: number;
    prix_promo_mad: number;
    debut: Date;
    fin: Date;
    condition: string;
}
export interface Conversation {
    id: string;
    client_id?: string;
    telephone: string;
    canal: string;
    langue: Language;
    statut: string;
    cart: CartItem[];
    last_message_at: Date;
    created_at: Date;
}
export interface Message {
    id: number;
    conversation_id: string;
    role: 'user' | 'agent';
    texte: string;
    intention?: Intention;
    langue: Language;
    tool_calls?: ToolCall[];
    guardrail?: GuardrailResult;
    latency_ms: number;
    created_at: Date;
}
export interface Escalation {
    id: number;
    conversation_id: string;
    motif: string;
    contexte_resume: string;
    payload: Record<string, any>;
    statut: 'NEEDS_HUMAN_REVIEW' | 'RESOLVED';
    created_at: Date;
    resolved_at?: Date;
}
export interface Relance {
    id: number;
    conversation_id: string;
    variante: 'A' | 'B';
    planifiee_a: Date;
    envoyee_a?: Date;
    resultat?: string;
    created_at: Date;
}
//# sourceMappingURL=types.d.ts.map