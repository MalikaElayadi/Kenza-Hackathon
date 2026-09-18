import { KenzaState, Fact } from '../types';
/**
 * Kenza Guardrails
 * Validation stricte des réponses agent
 */
export declare class Guardrails {
    /**
     * Règle 1: Tous les chiffres mentionnés doivent être tracés
     */
    static validateNumbers(draft: string, facts: Fact[]): string[];
    /**
     * Règle 2: Pas de promesse de date de réassort
     */
    static validateReassortPromise(draft: string): string[];
    /**
     * Règle 3: COD seulement dans villes autorisées
     */
    static validateCOD(draft: string, ville: string | undefined, codAuthorized: boolean): string[];
    /**
     * Règle 4: Remise maximale 10%
     */
    static validateDiscount(draft: string, remise?: {
        accordee_pct: number;
    }): string[];
    /**
     * Règle 5: Pas de référence produit inexistante
     */
    static validateProductReferences(draft: string, factsRefs: Set<string>): string[];
    /**
     * Règle 6: Pas de ville inexistante
     */
    static validateCity(draft: string, authorizedCities: string[]): string[];
    /**
     * Règle 7: Pas de spéculation sur le stock
     */
    static validateStockTruth(draft: string, stock: number | undefined): string[];
    /**
     * Règle 8: Langue correcte (pas mélanger)
     */
    static validateLanguage(draft: string, expectedLanguage: string): string[];
    /**
     * Exécution complète de tous les guardrails
     */
    static validate(state: KenzaState): {
        ok: boolean;
        violations: string[];
    };
}
export default Guardrails;
//# sourceMappingURL=guardrails.d.ts.map