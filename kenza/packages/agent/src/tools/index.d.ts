import { z } from 'zod';
import { Client } from 'pg';
export declare const SearchCatalogSchema: z.ZodObject<{
    famille: z.ZodOptional<z.ZodString>;
    couleur: z.ZodOptional<z.ZodString>;
    taille: z.ZodOptional<z.ZodString>;
    genre: z.ZodOptional<z.ZodString>;
    matiere: z.ZodOptional<z.ZodString>;
    prix_max: z.ZodOptional<z.ZodNumber>;
    en_stock_seulement: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    en_stock_seulement: boolean;
    taille?: string | undefined;
    famille?: string | undefined;
    couleur?: string | undefined;
    genre?: string | undefined;
    matiere?: string | undefined;
    prix_max?: number | undefined;
}, {
    taille?: string | undefined;
    famille?: string | undefined;
    couleur?: string | undefined;
    genre?: string | undefined;
    matiere?: string | undefined;
    prix_max?: number | undefined;
    en_stock_seulement?: boolean | undefined;
}>;
export declare const CheckStockSchema: z.ZodObject<{
    ref: z.ZodOptional<z.ZodString>;
    modele: z.ZodOptional<z.ZodString>;
    couleur: z.ZodOptional<z.ZodString>;
    taille: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    ref?: string | undefined;
    taille?: string | undefined;
    couleur?: string | undefined;
    modele?: string | undefined;
}, {
    ref?: string | undefined;
    taille?: string | undefined;
    couleur?: string | undefined;
    modele?: string | undefined;
}>;
export declare const SuggestAlternativesSchema: z.ZodObject<{
    ref: z.ZodString;
}, "strip", z.ZodTypeAny, {
    ref: string;
}, {
    ref: string;
}>;
export declare const GetPriceSchema: z.ZodObject<{
    ref: z.ZodString;
}, "strip", z.ZodTypeAny, {
    ref: string;
}, {
    ref: string;
}>;
export declare const GetShippingCostSchema: z.ZodObject<{
    ville: z.ZodString;
}, "strip", z.ZodTypeAny, {
    ville: string;
}, {
    ville: string;
}>;
export declare const ApplyDiscountSchema: z.ZodObject<{
    total: z.ZodNumber;
    pct: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    total: number;
    pct: number;
}, {
    total: number;
    pct: number;
}>;
export declare const UpdateCartSchema: z.ZodObject<{
    conversationId: z.ZodString;
    action: z.ZodEnum<["add", "remove", "change_size", "clear"]>;
    ref: z.ZodOptional<z.ZodString>;
    taille: z.ZodOptional<z.ZodString>;
    qte: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    conversationId: string;
    action: "remove" | "clear" | "add" | "change_size";
    ref?: string | undefined;
    taille?: string | undefined;
    qte?: number | undefined;
}, {
    conversationId: string;
    action: "remove" | "clear" | "add" | "change_size";
    ref?: string | undefined;
    taille?: string | undefined;
    qte?: number | undefined;
}>;
export declare const CreateOrderSchema: z.ZodObject<{
    conversationId: z.ZodString;
    clientId: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        ref: z.ZodString;
        modele: z.ZodString;
        taille: z.ZodString;
        quantite: z.ZodNumber;
        prix_unitaire: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        ref: string;
        taille: string;
        modele: string;
        quantite: number;
        prix_unitaire: number;
    }, {
        ref: string;
        taille: string;
        modele: string;
        quantite: number;
        prix_unitaire: number;
    }>, "many">;
    ville: z.ZodString;
    paiement: z.ZodString;
}, "strip", z.ZodTypeAny, {
    clientId: string;
    conversationId: string;
    ville: string;
    items: {
        ref: string;
        taille: string;
        modele: string;
        quantite: number;
        prix_unitaire: number;
    }[];
    paiement: string;
}, {
    clientId: string;
    conversationId: string;
    ville: string;
    items: {
        ref: string;
        taille: string;
        modele: string;
        quantite: number;
        prix_unitaire: number;
    }[];
    paiement: string;
}>;
export declare const GetClientHistorySchema: z.ZodObject<{
    clientId: z.ZodOptional<z.ZodString>;
    telephone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    clientId?: string | undefined;
    telephone?: string | undefined;
}, {
    clientId?: string | undefined;
    telephone?: string | undefined;
}>;
export declare const EscalateSchema: z.ZodObject<{
    conversationId: z.ZodString;
    motif: z.ZodString;
    contexte: z.ZodString;
    payload: z.ZodObject<{}, "passthrough", z.ZodTypeAny, z.objectOutputType<{}, z.ZodTypeAny, "passthrough">, z.objectInputType<{}, z.ZodTypeAny, "passthrough">>;
}, "strip", z.ZodTypeAny, {
    conversationId: string;
    motif: string;
    contexte: string;
    payload: {} & {
        [k: string]: unknown;
    };
}, {
    conversationId: string;
    motif: string;
    contexte: string;
    payload: {} & {
        [k: string]: unknown;
    };
}>;
export declare class Tools {
    private pgClient;
    constructor(pgClient: Client);
    /**
     * Tool 1: search_catalog
     * Recherche des produits dans le catalogue
     */
    searchCatalog(params: z.infer<typeof SearchCatalogSchema>): Promise<{
        results: any;
        count: any;
        source: string;
    }>;
    /**
     * Tool 2: check_stock
     * Vérifie la disponibilité d'un produit
     */
    checkStock(params: z.infer<typeof CheckStockSchema>): Promise<{
        disponible: boolean;
        stock: any;
        ref: any;
        source: string;
    }>;
    /**
     * Tool 3: suggest_alternatives
     * Propose des alternatives en stock pour un produit
     */
    suggestAlternatives(params: z.infer<typeof SuggestAlternativesSchema>): Promise<{
        alternatives: any;
        source: string;
    }>;
    /**
     * Tool 4: get_price
     * Récupère le prix effectif (normal ou promo) d'un produit
     */
    getPrice(params: z.infer<typeof GetPriceSchema>): Promise<{
        prix_normal: any;
        prix_promo: any;
        prix_effectif: any;
        promo_id: any;
        valide_jusquau: any;
        source: string;
    } | {
        prix_normal: any;
        prix_effectif: any;
        source: string;
        prix_promo?: undefined;
        promo_id?: undefined;
        valide_jusquau?: undefined;
    }>;
    /**
     * Tool 5: get_shipping_cost
     * Récupère les frais et délais de livraison pour une ville
     */
    getShippingCost(params: z.infer<typeof GetShippingCostSchema>): Promise<{
        trouve: boolean;
        ville: string;
        source: string;
        frais_mad?: undefined;
        delai_heures?: undefined;
        cod?: undefined;
        retrait?: undefined;
    } | {
        trouve: boolean;
        frais_mad: any;
        delai_heures: any;
        cod: any;
        retrait: any;
        source: string;
        ville?: undefined;
    }>;
    /**
     * Tool 6: apply_discount
     * Applique une remise (max 10%)
     */
    applyDiscount(params: z.infer<typeof ApplyDiscountSchema>): Promise<{
        autorise: boolean;
        motif: string;
        demandee_pct: number;
        accordee_pct: number;
        montant_original: number;
        montant_final: number;
        source: string;
        montant_reduction?: undefined;
    } | {
        autorise: boolean;
        demandee_pct: number;
        accordee_pct: number;
        montant_original: number;
        montant_reduction: number;
        montant_final: number;
        source: string;
        motif?: undefined;
    }>;
    /**
     * Tool 7: update_cart
     * Mise à jour du panier (add, remove, change_size, clear)
     */
    updateCart(params: z.infer<typeof UpdateCartSchema>): Promise<{
        action: "remove" | "clear" | "add" | "change_size";
        conversationId: string;
        success: boolean;
        source: string;
    }>;
    /**
     * Tool 8: create_order
     * Crée une commande (transactionnel)
     */
    createOrder(params: z.infer<typeof CreateOrderSchema>): Promise<{
        commande_id: string;
        total_mad: any;
        created_by: string;
        source: string;
    }>;
    /**
     * Tool 9: get_client_history
     * Récupère l'historique d'un client
     */
    getClientHistory(params: z.infer<typeof GetClientHistorySchema>): Promise<{
        client: any;
        orders: any;
        source: string;
    }>;
    /**
     * Tool 10: escalate
     * Crée une escalade pour intervention humaine
     */
    escalate(params: z.infer<typeof EscalateSchema>): Promise<{
        escalation_id: any;
        motif: string;
        statut: string;
        source: string;
    }>;
}
export default Tools;
//# sourceMappingURL=index.d.ts.map