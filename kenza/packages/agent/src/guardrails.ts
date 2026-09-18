import { KenzaState, Fact } from './types';

/**
 * Kenza Guardrails
 * Validation stricte des réponses agent
 */

export class Guardrails {
  /**
   * Règle 1: Tous les chiffres mentionnés doivent être tracés
   */
  static validateNumbers(draft: string, facts: Fact[]): string[] {
    const violations: string[] = [];
    
    // Extraire tous les nombres du draft
    const numberPattern = /\b(\d+)\b/g;
    const numbersInDraft = new Set<string>();
    
    let match;
    while ((match = numberPattern.exec(draft)) !== null) {
      numbersInDraft.add(match[1]);
    }
    
    // Vérifier que chaque nombre est dans facts
    const factValues = new Set(facts.map(f => f.value.toString()));
    
    for (const num of numbersInDraft) {
      if (!factValues.has(num)) {
        violations.push(`[GUARDRAIL] Nombre non justifié: ${num}`);
      }
    }
    
    return violations;
  }

  /**
   * Règle 2: Pas de promesse de date de réassort
   */
  static validateReassortPromise(draft: string): string[] {
    const violations: string[] = [];
    
    const patterns = [
      /dans\s+\d+\s+(jour|jours|semaine|mois)/i,
      /revient\s+/i,
      /réassort\s+/i,
      /disponible.*prochainement/i,
      /nous.*reçoit.*bientôt/i,
      /kayn\s+(?:fi\s+)?(\d+|juj|tlata)\s+(yam|nhar|lyam)/i,  // Darija
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(draft)) {
        violations.push(
          `[GUARDRAIL] Promesse de réassort détectée: "${draft.match(pattern)?.[0]}"`
        );
      }
    }
    
    return violations;
  }

  /**
   * Règle 3: COD seulement dans villes autorisées
   */
  static validateCOD(
    draft: string,
    ville: string | undefined,
    codAuthorized: boolean
  ): string[] {
    const violations: string[] = [];
    
    const codPatterns = [
      /paiement\s+à\s+la\s+livraison/i,
      /à\s+la\s+réception/i,
      /cash\s+on\s+delivery/i,
      /dyal\s+al-istiqbal/i,  // Darija
    ];
    
    const mentionsCOD = codPatterns.some(p => p.test(draft));
    
    if (mentionsCOD && !codAuthorized) {
      violations.push(
        `[GUARDRAIL] COD proposé mais non autorisé à ${ville}`
      );
    }
    
    return violations;
  }

  /**
   * Règle 4: Remise maximale 10%
   */
  static validateDiscount(draft: string, remise?: { accordee_pct: number }): string[] {
    const violations: string[] = [];
    
    if (remise && remise.accordee_pct > 10) {
      violations.push(
        `[GUARDRAIL] Remise ${remise.accordee_pct}% > max 10%`
      );
    }
    
    // Détection de remise mentionnée sans consentement
    const discountPatterns = [
      /r[eé]duction\s+de\s+(\d+)%/i,
      /(\d+)%\s+(?:de\s+)?remise/i,
      /(\d+)%\s+(discount|remise)/i,
      /nqas\s+lih\s+(\d+)%/i,  // Darija: baisse de X%
    ];
    
    for (const pattern of discountPatterns) {
      const match = draft.match(pattern);
      if (match) {
        const pct = parseInt(match[1]);
        if (pct > 10) {
          violations.push(
            `[GUARDRAIL] Remise excessive ${pct}% mentionnée: "${match[0]}"`
          );
        }
      }
    }
    
    return violations;
  }

  /**
   * Règle 5: Pas de référence produit inexistante
   */
  static validateProductReferences(draft: string, factsRefs: Set<string>): string[] {
    const violations: string[] = [];
    
    // Extraire tous les REF-XXXX du draft
    const refPattern = /REF-\d{4}/g;
    const refsInDraft = new Set<string>();
    
    let match;
    while ((match = refPattern.exec(draft)) !== null) {
      refsInDraft.add(match[0]);
    }
    
    // Vérifier que chaque REF est en facts
    for (const ref of refsInDraft) {
      if (!factsRefs.has(ref)) {
        violations.push(`[GUARDRAIL] Produit non trouvé: ${ref}`);
      }
    }
    
    return violations;
  }

  /**
   * Règle 6: Pas de ville inexistante
   */
  static validateCity(
    draft: string,
    authorizedCities: string[]
  ): string[] {
    const violations: string[] = [];
    
    // Vérifier que toutes les villes mentionnées sont autorisées
    const mentionedCities = draft.match(/à\s+([A-Z][a-zà-û]+)/g) || [];
    
    for (const mention of mentionedCities) {
      const city = mention.replace(/à\s+/, '');
      if (!authorizedCities.some(c => c.toLowerCase() === city.toLowerCase())) {
        violations.push(
          `[GUARDRAIL] Ville non autorisée: ${city}`
        );
      }
    }
    
    return violations;
  }

  /**
   * Règle 7: Pas de spéculation sur le stock
   */
  static validateStockTruth(draft: string, stock: number | undefined): string[] {
    const violations: string[] = [];
    
    if (stock === 0) {
      const availabilityPatterns = [
        /disponible/i,
        /en\s+stock/i,
        /kayna/i,  // Darija
        /makaina/i,  // Darija negative
      ];
      
      const falselyAvailable = availabilityPatterns.some(p =>
        p.test(draft) && !/pas|pas|makaynach|walou/.test(draft)
      );
      
      if (falselyAvailable) {
        violations.push(
          `[GUARDRAIL] Stock=0 mais article présenté comme disponible`
        );
      }
    }
    
    return violations;
  }

  /**
   * Règle 8: Langue correcte (pas mélanger)
   */
  static validateLanguage(draft: string, expectedLanguage: string): string[] {
    const violations: string[] = [];
    
    const frenchWords = /\b(bonjour|oui|merci|prix|livraison|commande)\b/i;
    const arabicWords = /[\u0600-\u06FF]/;
    const darijWords = /\b(salam|wah|kayna|chhal|tawsil|nsajel)\b/i;
    
    const hasFrench = frenchWords.test(draft);
    const hasArabic = arabicWords.test(draft);
    const hasDarij = darijWords.test(draft);
    
    const detected = [
      { lang: 'fr', has: hasFrench },
      { lang: 'ar', has: hasArabic },
      { lang: 'darija', has: hasDarij },
    ];
    
    const numLanguages = detected.filter(d => d.has).length;
    
    if (numLanguages > 1) {
      violations.push(
        `[GUARDRAIL] Mélange de langues détecté (${numLanguages} langues)`
      );
    }
    
    if (expectedLanguage === 'fr' && hasArabic) {
      violations.push(
        `[GUARDRAIL] Arabe détecté mais français attendu`
      );
    }
    
    if (expectedLanguage === 'darija' && hasFrench) {
      // Warning only, not critical
    }
    
    return violations;
  }

  /**
   * Exécution complète de tous les guardrails
   */
  static validate(state: KenzaState): { ok: boolean; violations: string[] } {
    let violations: string[] = [];
    
    if (!state.draft) {
      return { ok: false, violations: ['Draft vide'] };
    }
    
    // Rule 1: Numbers
    violations = violations.concat(
      this.validateNumbers(state.draft, state.facts)
    );
    
    // Rule 2: Reassort promise
    violations = violations.concat(
      this.validateReassortPromise(state.draft)
    );
    
    // Rule 3: COD
    violations = violations.concat(
      this.validateCOD(
        state.draft,
        state.ville,
        state.shipping?.cod ?? false
      )
    );
    
    // Rule 4: Discount
    violations = violations.concat(
      this.validateDiscount(state.draft, state.remise)
    );
    
    // Rule 5: Product refs
    const factsRefs = new Set(
      state.facts.map((fact) => fact.ref).filter((ref): ref is string => Boolean(ref))
    );
    violations = violations.concat(
      this.validateProductReferences(state.draft, factsRefs)
    );
    
    // Rule 6: City
    const authorizedCities = [
      'Casablanca', 'Rabat', 'Fès', 'Marrakech', 'Tanger', 'Agadir',
      'Meknès', 'Oujda', 'Kénitra', 'Tétouan', 'Salé', 'Mohammedia',
    ];
    violations = violations.concat(
      this.validateCity(state.draft, authorizedCities)
    );
    
    // Rule 7: Stock truth
    const lastStockFact = [...state.facts]
      .reverse()
      .find(f => f.type === 'stock');
    violations = violations.concat(
      this.validateStockTruth(state.draft, lastStockFact?.value as number)
    );
    
    // Rule 8: Language
    violations = violations.concat(
      this.validateLanguage(state.draft, state.langue)
    );
    
    // Unique violations
    violations = [...new Set(violations)];
    
    return {
      ok: violations.length === 0,
      violations,
    };
  }
}

export default Guardrails;
