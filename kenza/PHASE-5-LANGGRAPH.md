# KENZA — PHASE 5 : LANGGRAPH
## Orchestration agentique multi-nœuds

**Date** : 2026-09-18  
**Status** : ✅ COMPLÉTÉE  

---

## 🏗️ Architecture LangGraph

### Graphe conceptuel

```
                    ┌─────────────────────┐
                    │  Message entrant    │
                    └──────────┬──────────┘
                               ↓
                      ┌─────────────────────┐
                      │ multimodal_node     │
                      │ (STT, vision)       │
                      └──────────┬──────────┘
                               ↓
                      ┌─────────────────────┐
                      │  intent_node        │
                      │ (classify, langue)  │
                      └──────────┬──────────┘
                               ↓
                      ┌─────────────────────┐
                      │ Intention?          │
                      └─┬─────────┬─────────┬─────────┐
                        │         │         │         │
                   Catalogue Conversation Escalade  Autre
                        │         │         │         │
                        ↓         ↓         ↓         ↓
                    ┌────────────┐ ┌──────────┐ ┌─────────┐
                    │catalogue   │ │conversat.│ │escalat. │
                    │_node       │ │_node     │ │_node    │
                    └────────┬───┘ └──────┬───┘ └────┬────┘
                             │           │           │
                             └───────────┼───────────┘
                                         ↓
                            ┌─────────────────────┐
                            │ guardrail_node      │
                            │ (validate)          │
                            └──────────┬──────────┘
                                       ↓
                            ┌─────────────────────┐
                            │ Guardrail OK?       │
                            └─┬─────────────┬─────┘
                              │             │
                           YES             NO
                              │             │
                              ↓             ↓
                           ┌──┴─────────────────┐
                           │ Retries < 1?       │
                           └──┬──────────┬──────┘
                              │          │
                           YES           NO
                              │          │
                              ↓          ↓
                           RETRY    ESCALATION
                              │          │
                              └──────┬───┘
                                     ↓
                                  ┌──┴───┐
                                  │ END  │
                                  └──────┘
```

### Nœuds (7)

#### 1. **multimodal_node**
Traite les entrées multimodales.

**Entrée** :
- Message texte (JSON, transcription STT, OCR d'image)

**Traitement** :
- STT → texte (si audio)
- OCR/Vision → description produit (si image)
- Normalisation Darija (ch7al → chhal, etc.)

**Sortie** :
- Messages normalisés

**Implémentation** :
```typescript
async multimodalNode(state: KenzaState) : Promise<KenzaState> {
  const msg = state.messages[last];
  
  // Si [audio]: STT
  // Si [image]: Vision
  // Si text: Pass-through
  
  return { ...state, messages };
}
```

#### 2. **intent_node**
Classifie l'intention, la langue, la difficulté.

**Entrée** :
- Message utilisateur

**Traitement** :
- Appeler LLM (GPT-4.1) avec few-shots
- Schema Zod de sortie strict
- Sauvegarder en Redis

**Sortie** :
```typescript
{
  intention: Intention,     // 18 types
  langue: Language,         // fr|ar|darija
  confiance: number,        // 0-100
  difficulte: Difficulty   // facile|standard|difficile
}
```

**Exemple** :
```
Input: "chhal taman robe vert olive L?"
Output: {
  intention: 'prix_et_disponibilite',
  langue: 'darija',
  confiance: 92,
  difficulte: 'standard'
}
```

#### 3. **catalogue_node**
Récupère les données métier (produits, prix, stock).

**Entrée** :
- Intention
- Texte du message

**Traitement** :
- Appeler Tools :
  - `search_catalog()` si recherche
  - `check_stock()` si vérif stock
  - `get_price()` si prix
  - `suggest_alternatives()` si rupture
- Tracer chaque résultat dans `facts`

**Sortie** :
```typescript
{
  facts: [
    {
      type: 'price',
      value: 450,
      source: 'db:products',
      ref: 'REF-0048'
    },
    {
      type: 'stock',
      value: 22,
      source: 'db:products',
      ref: 'REF-0048'
    },
    ...
  ]
}
```

#### 4. **conversation_node**
Génère la réponse via LLM.

**Entrée** :
- `state.facts` (validés)
- `state.cart` (panier)
- `state.langue` (langue)
- `state.intention` (intention)
- `state.messages` (historique)

**Traitement** :
- Construire prompt avec :
  - Systeme (rolle: agent commercial)
  - Few-shots (conversations.jsonl)
  - Facts (source de vérité)
  - Contexte client (historique)
  - Contraintes (max remise 10%, etc.)
- Appeler LLM (GPT-5.5 pour raisonnement, GPT-4.1 pour simple)
- Générer `draft`

**Sortie** :
```typescript
{
  draft: string,  // Réponse proposeée
  cart: CartItem[], // Panier modifié si besoin
  remise?: RemiseInfo
}
```

**Exemple de prompt** :
```
Vous êtes Kenza, agent commercial pour une boutique marocaine de mode.
Vous répondez en darija, chaleureux, tutoiement.

Contexte:
- Client: Rania Ouazzani, +212615903661, Fès
- Historique: 3 commandes (dernier 15/10)
- Langue: darija
- Panier actuel: vide

Message client: "chhal taman robe vert olive L?"

Facts (source de vérité):
- Robe vert olive, taille L: stock=22, prix=450 MAD
- Livraison Fès: 35 MAD, 24h

Règles absolues:
- Aucun chiffre non justifié par facts
- Max remise 10%
- Pas de promesse de réassort
- Pas de COD si non autorisé dans la ville
```

#### 5. **guardrail_node**
Valide la réponse avant envoi.

**Entrée** :
- `state.draft` (réponse proposée)
- `state.facts` (données validées)
- `state.guardrail.retries` (compteur)

**Traitement** :
1. Extraction tous les nombres du draft
2. Vérification dans facts
3. Détection promesse réassort
4. Vérification COD autorisé
5. Vérification remise ≤ 10%

**Sortie** :
```typescript
{
  guardrail: {
    ok: boolean,
    violations: string[],
    retries: number
  }
}
```

**Violations possibles** :
```
✗ "Nombre non justifié: 150"
✗ "Promesse réassort: 'dans 7 jours'"
✗ "COD proposé non autorisé à Fès"
✗ "Remise 15% > max 10%"
```

#### 6. **escalation_node**
Transfère à intervention humaine.

**Entrée** :
- `state.escalation` (motif + contexte)

**Traitement** :
- Insérer dans `escalations` table
- Sauvegarder contexte complet
- Gérer la réponse appropriée

**Sortie** :
```typescript
{
  needsHuman: true,
  draft: "Je transfère à mon équipe..."
}
```

#### 7. **relance_node**
*Note: Exécuté HORS graphe, via BullMQ*

Worker qui :
- Détecte paniers abandonnés (24h sans message)
- Respecte horaires (10h-20h, lun-sam)
- Choisit variante A/B
- Trace résultat

---

## 🔀 Routage conditionnel

### 1. Après `intent_node`

```typescript
function routeAfterIntent(state: KenzaState): string {
  const intention = state.intention;
  
  if (isEscalationIntention(intention)) {
    return 'escalation'; // Bypass directly
  }
  
  if (isCatalogueIntention(intention)) {
    return 'catalogue';  // Need product data
  }
  
  return 'conversation'; // Simple dialog
}
```

**Escalation intentions** :
```
hors_domaine         // "Faites-moi une facture ICE"
reclamation_arabe    // "Produit défectueux"
rupture_arabe        // "Quand revient?"
```

**Catalogue intentions** :
```
prix_et_disponibilite
rupture_de_stock
conseil_taille
darija_prix
```

### 2. Après `guardrail_node`

```typescript
function routeAfterGuardrail(state: KenzaState): string {
  const { ok, retries } = state.guardrail;
  
  if (ok) return END;              // ✅ Envoy

er
  
  if (retries < 1) {
    retries++;
    return 'conversation';          // 🔄 Retry
  }
  
  return 'escalation';              // ⛔ Échec
}
```

---

## 🗂️ Checkpoint PostgreSQL

Mémoire persistante du thread de conversation.

**Table** : `langgraph_checkpoints`

```sql
CREATE TABLE langgraph_checkpoints (
  thread_id VARCHAR(255),         -- Identifiant client (ex. CLI-0001)
  checkpoint_id VARCHAR(255),     -- Checkpoint unique
  checkpoint_ns VARCHAR(255),     -- Namespace (optionnel)
  parent_checkpoint_id VARCHAR,   -- Précédent checkpoint
  type_str VARCHAR(255),          -- Type (graph|node)
  timestamp BIGINT,               -- Unix timestamp
  config JSONB,                   -- Configuration du state
  values JSONB,                   -- État complet KenzaState
  metadata JSONB,                 -- Métadonnées
  PRIMARY KEY (thread_id, checkpoint_id, checkpoint_ns)
);
```

**Utilisation** :

```typescript
// Créer un checkpointer PostgreSQL
const saver = new PostgresSaver(pgClient);

// Compiler le graphe avec checkpoints
const graphWithMemory = graph.compile({
  checkpointer: saver,
});

// Invoquer avec thread persistant
const config = {
  configurable: {
    thread_id: `CLI-${clientId}`,  // Client persistent ID
  }
};

const result = await graphWithMemory.invoke(
  initialState,
  config
);
```

**Résultat** :
- Après restart Docker
- Le client peut continuer sa conversation
- État historique retrouvé

---

## 🧠 Mémoire courte (Redis)

Cache de session pour latence basse.

**Keys Redis** :

```
conversation:{conversationId}:langue
conversation:{conversationId}:intention
conversation:{conversationId}:cart
conversation:{conversationId}:facts
```

**TTL** : 30 minutes (conversation active)

**Utilisation** :

```typescript
// Sauvegarder après intent
await redisClient.hSet(`intent:${conversationId}`, {
  intention,
  langue,
  confiance
});

// Récupérer pour validation
const cached = await redisClient.hGetAll(`cart:${conversationId}`);
```

---

## 📊 État complet (KenzaState)

```typescript
interface KenzaState {
  // Identifiants
  conversationId: string;      // CONV-001
  clientId?: string;           // CLI-0001
  telephone?: string;          // +212697691176
  
  // Langue
  langue: Language;            // fr|ar|darija
  
  // Messages
  messages: BaseMessage[];     // Historique
  
  // Intention
  intention?: Intention;       // 18 types
  
  // Données métier (facts)
  facts: Fact[];               // Tracés, source connue
  
  // Panier
  cart: CartItem[];            // Produits sélectionnés
  
  // Livraison
  ville?: string;              // Casablanca, etc.
  shipping?: {
    frais: number,
    delai_h: number,
    cod: boolean
  };
  
  // Remise
  remise?: {
    demandee_pct: number,
    accordee_pct: number
  };
  
  // Réponse générée
  draft?: string;              // À envoyer au client
  
  // Validation
  guardrail?: {
    ok: boolean,
    violations: string[],
    retries: number
  };
  
  // Escalade
  escalation?: {
    motif: string,
    contexte: string
  };
  
  // Commande créée
  orderId?: string;            // CMD-xxxxx
  
  // Flag humain
  needsHuman: boolean;         // Transféré?
}
```

---

## 🚀 Invocation du graphe

```typescript
// 1. Créer instance
const kenzaGraph = new KenzaGraph();
const compiledGraph = kenzaGraph.compile();

// 2. État initial
const initialState: KenzaState = {
  conversationId: 'CONV-001',
  clientId: 'CLI-0001',
  telephone: '+212697691176',
  langue: 'fr',
  messages: [
    {
      role: 'user',
      texte: "Avez-vous la robe vert olive en taille L?",
      timestamp: new Date(),
    }
  ],
  facts: [],
  cart: [],
  needsHuman: false,
};

// 3. Configuration avec checkpoint
const config = {
  configurable: {
    thread_id: 'CLI-0001',  // Persistent client ID
  }
};

// 4. Invocation
const result = await compiledGraph.invoke(initialState, config);

console.log('Response:', result.draft);
console.log('Escalation?', result.needsHuman);
console.log('Order created?', result.orderId);
```

---

## 📈 Flux complet exemple

**Message client** (darija) :
```
"chhal taman robe vert olive L?"
```

**Nœuds exécutés** :

1. **multimodal** : Pass-through (texte)
2. **intent** : Classification
   ```
   intention: 'prix_et_disponibilite'
   langue: 'darija'
   confiance: 95
   ```
3. **Routing** : → catalogue
4. **catalogue** :
   ```
   Tool: search_catalog({famille: 'Robe', couleur: 'vert olive'})
   Tool: check_stock({ref: 'REF-0048', taille: 'L'})
   Tool: get_price({ref: 'REF-0048'})
   
   Facts added:
   - price: 450 MAD (db:products)
   - stock: 22 (db:products)
   - shipping (Fès): 35 MAD, 24h
   ```
5. **conversation** : Génère réponse
   ```
   "Wah khti! Robe kayna f L b 450 MAD. 
    Tawsil l Fès b 35 MAD f 24 saa.
    Total 485 MAD. Nsajel?"
   ```
6. **guardrail** : Valide
   ```
   Nombres: 450, 35, 24, 485
   ✅ Tous justifiés dans facts
   ✅ Pas de COD non autorisé
   ✅ Pas de remise
   OK: true
   ```
7. **END** : Envoyer réponse

---

## ✅ Checklist PHASE 5

- [x] StateGraph créé
- [x] 7 nœuds implémentés
- [x] Routing conditionnel (after intent)
- [x] Routing conditionnel (after guardrail)
- [x] Escalation intentions
- [x] Catalogue intentions
- [x] PostgreSQL checkpointer
- [x] Redis memory courte
- [x] KenzaState complet
- [x] Facts tracés (source)
- [x] Retry logic
- [x] Nœud escalation
- [x] Documentation complète

---

## 🔌 Interface TypeScript

```typescript
class KenzaGraph {
  setupNodes()
  setupEdges()
  routeAfterIntent(state: KenzaState): string
  routeAfterGuardrail(state: KenzaState): string
  compile(): CompiledStateGraph
}
```

---

## 🛑 PHASE 5 — STATUS : ✅ TERMINÉE

**Prêt pour PHASE 6** : Guardrails (validation robuste)

