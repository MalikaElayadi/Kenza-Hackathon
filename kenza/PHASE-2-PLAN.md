# KENZA — PHASE 2 : PLAN DÉTAILLÉ

## 📦 ARBORESCENCE FINALE

```
kenza/
├── docker-compose.yml              # Services : web, api, postgres, redis, worker
├── .env                            # Variables d'environnement (gitignoré)
├── .env.example                    # Template sans secrets
├── .gitignore                      # Exclure .env, node_modules, build
├── package.json                    # Workspace monorepo
├── README.md                       # Documentation complète
│
├── data/                           # READ-ONLY données du jury
│   ├── catalogue.csv
│   ├── clients.csv
│   ├── commandes.csv
│   ├── commandes-lignes.csv
│   ├── livraison.csv
│   ├── promotions.csv
│   ├── conversations.jsonl
│   ├── politique-commerciale.md
│   └── faq-boutique.md
│
├── apps/
│   ├── web/                        # Frontend React + Vite
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── components/
│   │   │   │   ├── ChatSimulator.tsx
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── CatalogView.tsx
│   │   │   │   ├── OrdersView.tsx
│   │   │   │   ├── EscalationsView.tsx
│   │   │   │   └── RelancesView.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useWebSocket.ts
│   │   │   │   └── useApi.ts
│   │   │   ├── styles/
│   │   │   │   └── globals.css
│   │   │   └── types/
│   │   │       └── index.ts
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   └── Dockerfile
│   │
│   └── api/                        # Backend Fastify
│       ├── src/
│       │   ├── main.ts             # Entry point
│       │   ├── server.ts           # Fastify setup
│       │   ├── routes/
│       │   │   ├── chat.ts         # WebSocket /ws
│       │   │   ├── health.ts       # GET /health
│       │   │   ├── orders.ts       # REST orders
│       │   │   ├── catalog.ts      # REST catalog
│       │   │   └── escalations.ts  # REST escalations
│       │   ├── middleware/
│       │   │   └── auth.ts         # Token validation
│       │   └── utils/
│       │       └── logger.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── Dockerfile
│
├── packages/
│   ├── agent/                      # Core LangGraph + orchestration
│   │   ├── src/
│   │   │   ├── graph.ts            # StateGraph + routing
│   │   │   ├── state.ts            # KenzaState interface
│   │   │   │
│   │   │   ├── nodes/
│   │   │   │   ├── multimodal.ts   # Audio/vision detection
│   │   │   │   ├── intent.ts       # Intent classification (GPT-4.1)
│   │   │   │   ├── catalogue.ts    # Product search & tools
│   │   │   │   ├── conversation.ts # Dialogue generation (GPT-5.5)
│   │   │   │   ├── guardrail.ts    # Validation & blocking
│   │   │   │   ├── escalation.ts   # Human handoff
│   │   │   │   └── relance.ts      # Abandoned cart detection
│   │   │   │
│   │   │   ├── tools/
│   │   │   │   ├── search_catalog.ts
│   │   │   │   ├── check_stock.ts
│   │   │   │   ├── suggest_alternatives.ts
│   │   │   │   ├── get_price.ts
│   │   │   │   ├── get_shipping_cost.ts
│   │   │   │   ├── apply_discount.ts
│   │   │   │   ├── update_cart.ts
│   │   │   │   ├── create_order.ts
│   │   │   │   ├── get_client_history.ts
│   │   │   │   └── escalate.ts
│   │   │   │
│   │   │   ├── prompts/
│   │   │   │   ├── fr/
│   │   │   │   │   ├── system.md
│   │   │   │   │   ├── intent.md
│   │   │   │   │   └── conversation.md
│   │   │   │   ├── ar/
│   │   │   │   │   ├── system.md
│   │   │   │   │   ├── intent.md
│   │   │   │   │   └── conversation.md
│   │   │   │   └── darija/
│   │   │   │       ├── system.md
│   │   │   │       ├── intent.md
│   │   │   │       └── conversation.md
│   │   │   │
│   │   │   ├── guardrails/
│   │   │   │   ├── validator.ts
│   │   │   │   ├── schemas.ts     # Zod schemas
│   │   │   │   └── rules.ts       # Business rules
│   │   │   │
│   │   │   ├── memory/
│   │   │   │   ├── redis.ts       # Redis adapter
│   │   │   │   └── checkpointer.ts # PostgreSQL checkpointer
│   │   │   │
│   │   │   └── index.ts           # Export public API
│   │   │
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── db/                         # Database access layer
│   │   ├── src/
│   │   │   ├── index.ts            # Pool + initialization
│   │   │   │
│   │   │   ├── schema/
│   │   │   │   ├── products.sql
│   │   │   │   ├── clients.sql
│   │   │   │   ├── orders.sql
│   │   │   │   ├── conversations.sql
│   │   │   │   ├── messages.sql
│   │   │   │   ├── escalations.sql
│   │   │   │   ├── relances.sql
│   │   │   │   └── indexes.sql
│   │   │   │
│   │   │   ├── migrations/
│   │   │   │   └── 001_initial.sql
│   │   │   │
│   │   │   ├── queries/
│   │   │   │   ├── products.ts
│   │   │   │   ├── clients.ts
│   │   │   │   ├── orders.ts
│   │   │   │   ├── conversations.ts
│   │   │   │   └── escalations.ts
│   │   │   │
│   │   │   ├── seeder/
│   │   │   │   └── seed.ts        # Import CSV + idempotent
│   │   │   │
│   │   │   └── types.ts           # TypeScript interfaces
│   │   │
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── types/                      # Shared TypeScript types
│       ├── src/
│       │   ├── kenza.ts            # Kenza state + messages
│       │   ├── product.ts
│       │   ├── order.ts
│       │   ├── client.ts
│       │   └── index.ts
│       └── package.json
│
├── scripts/
│   ├── seed.ts                     # Run seeder
│   ├── replay-conversations.ts     # Replay 40 conversations for testing
│   ├── demo.sh                     # 2-minute demo scenario
│   └── check-volumes.ts            # Verify data integrity
│
└── docker/
    ├── Dockerfile.worker           # Worker node process
    └── init-db.sh                  # DB initialization script
```

---

## 🗄️ SCHÉMA POSTGRESQL (DDL)

### 1. products
```sql
CREATE TABLE products (
  ref VARCHAR(20) PRIMARY KEY,
  modele VARCHAR(255) NOT NULL,
  famille VARCHAR(100),
  genre VARCHAR(50),
  couleur VARCHAR(100),
  taille VARCHAR(10),
  matiere VARCHAR(100),
  saison VARCHAR(100),
  prix_mad INT NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  delai_reassort_jours INT,
  code_barre VARCHAR(20),
  poids_g INT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_products_famille ON products(famille);
CREATE INDEX idx_products_couleur ON products(couleur);
CREATE INDEX idx_products_taille ON products(taille);
CREATE INDEX idx_products_stock ON products(stock);
```

### 2. clients
```sql
CREATE TABLE clients (
  client_id VARCHAR(20) PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  telephone VARCHAR(20) UNIQUE NOT NULL,
  ville VARCHAR(100) NOT NULL,
  langue_preferee VARCHAR(10),
  premier_achat DATE,
  nb_commandes INT DEFAULT 0,
  segment VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_clients_telephone ON clients(telephone);
CREATE INDEX idx_clients_ville ON clients(ville);
```

### 3. orders
```sql
CREATE TABLE orders (
  commande_id VARCHAR(20) PRIMARY KEY,
  client_id VARCHAR(20) NOT NULL REFERENCES clients(client_id),
  date DATE NOT NULL,
  canal VARCHAR(50),
  statut VARCHAR(50),
  total_articles_mad INT,
  frais_livraison_mad INT,
  total_mad INT,
  ville_livraison VARCHAR(100),
  paiement VARCHAR(50),
  created_by VARCHAR(20) DEFAULT 'humain', -- 'humain' | 'agent'
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_orders_client_id ON orders(client_id);
CREATE INDEX idx_orders_created_by ON orders(created_by);
```

### 4. order_items
```sql
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  commande_id VARCHAR(20) NOT NULL REFERENCES orders(commande_id),
  ref VARCHAR(20) NOT NULL REFERENCES products(ref),
  modele VARCHAR(255),
  taille VARCHAR(10),
  quantite INT,
  prix_unitaire_mad INT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_order_items_commande_id ON order_items(commande_id);
```

### 5. shipping_rates
```sql
CREATE TABLE shipping_rates (
  ville VARCHAR(100) PRIMARY KEY,
  frais_mad INT NOT NULL,
  delai_heures INT NOT NULL,
  paiement_a_la_livraison BOOLEAN DEFAULT FALSE,
  retrait_boutique BOOLEAN DEFAULT FALSE
);
```

### 6. promotions
```sql
CREATE TABLE promotions (
  id SERIAL PRIMARY KEY,
  ref VARCHAR(20) NOT NULL REFERENCES products(ref),
  modele VARCHAR(255),
  prix_normal_mad INT,
  prix_promo_mad INT,
  debut DATE NOT NULL,
  fin DATE NOT NULL,
  condition VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_promotions_ref ON promotions(ref);
CREATE INDEX idx_promotions_dates ON promotions(debut, fin);
```

### 7. conversations
```sql
CREATE TABLE conversations (
  id VARCHAR(50) PRIMARY KEY,
  client_id VARCHAR(20) REFERENCES clients(client_id),
  telephone VARCHAR(20),
  canal VARCHAR(50),
  langue VARCHAR(10),
  statut VARCHAR(50),
  cart JSONB,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_conversations_client_id ON conversations(client_id);
CREATE INDEX idx_conversations_telephone ON conversations(telephone);
```

### 8. messages
```sql
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id VARCHAR(50) NOT NULL REFERENCES conversations(id),
  role VARCHAR(20), -- 'user' | 'assistant'
  texte TEXT,
  intention VARCHAR(100),
  langue VARCHAR(10),
  tool_calls JSONB,
  guardrail JSONB,
  latency_ms INT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id, created_at);
```

### 9. escalations
```sql
CREATE TABLE escalations (
  id SERIAL PRIMARY KEY,
  conversation_id VARCHAR(50) NOT NULL REFERENCES conversations(id),
  motif VARCHAR(100),
  contexte_resume TEXT,
  payload JSONB,
  statut VARCHAR(50) DEFAULT 'NEEDS_HUMAN_REVIEW',
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
CREATE INDEX idx_escalations_statut ON escalations(statut);
```

### 10. relances
```sql
CREATE TABLE relances (
  id SERIAL PRIMARY KEY,
  conversation_id VARCHAR(50) NOT NULL REFERENCES conversations(id),
  variante VARCHAR(10), -- 'A' | 'B'
  planifiee_a TIMESTAMP,
  envoyee_a TIMESTAMP,
  resultat VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_relances_conversation_id ON relances(conversation_id);
```

### 11. facts
```sql
CREATE TABLE facts (
  id SERIAL PRIMARY KEY,
  conversation_id VARCHAR(50) NOT NULL REFERENCES conversations(id),
  type VARCHAR(50), -- 'price', 'stock', 'shipping', 'promotion', etc.
  value TEXT,
  source VARCHAR(255), -- 'db:products.prix_mad', 'tool:get_price', etc.
  ref VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🧠 KENZASTATE (TypeScript)

```typescript
interface Fact {
  type: 'price' | 'stock' | 'shipping' | 'promotion' | 'discount';
  value: any;
  source: string; // 'db:table.column' ou 'tool:name'
  ref?: string;
  createdAt: Date;
}

interface CartItem {
  ref: string;
  modele: string;
  taille: string;
  quantite: number;
  prix_unitaire: number;
  sousTotal: number; // prix_unitaire * quantite
}

interface Remise {
  demandee_pct: number;
  accordee_pct: number;
  raison?: string;
}

interface Shipping {
  ville?: string;
  frais_mad: number;
  delai_heures: number;
  cod: boolean;
  retrait: boolean;
}

interface Guardrail {
  ok: boolean;
  violations: string[];
  retries: number;
  lastAttempt?: Date;
}

interface Escalation {
  motif: string;
  contexte: string;
  payload?: Record<string, any>;
}

type KenzaState = {
  // Identité
  conversationId: string;
  clientId?: string;
  telephone?: string;

  // Langue
  langue: 'fr' | 'ar' | 'darija';

  // Messages historique
  messages: BaseMessage[]; // LangChain BaseMessage

  // Détection
  intention?: string;
  difficulte?: 'standard' | 'difficile' | 'très difficile';

  // Données métier
  facts: Fact[]; // Toute donnée provenant d'une source
  cart: CartItem[];
  ville?: string;
  shipping?: Shipping;
  remise?: Remise;

  // Génération
  draft?: string; // Réponse avant guardrail
  response?: string; // Réponse finale approuvée

  // Validation
  guardrail?: Guardrail;

  // Escalade
  escalation?: Escalation;
  needsHuman: boolean;

  // Commande
  orderId?: string;

  // Mémoire
  clientHistory?: {
    nbCommandes: number;
    derniereCommande?: Date;
    villeHabituelle?: string;
  };

  // Métadonnées
  timestamp: Date;
  latency?: number;
};
```

---

## 📊 LANGGRAPH ARCHITECTURE

### Graphe d'orchestration

```
START
  ↓
multimodal_node
  ├─ Détecte langue (fr|ar|darija)
  ├─ Convertit audio → texte (STT)
  ├─ Analyse image → tags
  └─ Fallback si erreur
  ↓
intent_node
  ├─ Classification 18 intentions (GPT-4.1)
  ├─ Validation Zod
  └─ Confiance < 85% → 'inconnu'
  ↓
[ROUTAGE CONDITIONNEL]
  ├─ intention === 'inconnu' → escalation
  ├─ intention === 'hors_domaine' → escalation
  ├─ intention === 'reclamation*' → escalation
  ├─ Sinon → continue
  ↓
catalogue_node
  ├─ search_catalog() si recherche produit
  ├─ check_stock() → facts
  ├─ get_price() → facts (avec promo)
  ├─ suggest_alternatives() si rupture
  └─ get_shipping_cost() si livraison
  ↓
conversation_node
  ├─ Appel LLM (GPT-5.5 pour raisonnement)
  ├─ Utilise UNIQUEMENT les facts
  ├─ Génère draft
  ├─ Insère dans état
  └─ Jamais de chiffre sans fact
  ↓
guardrail_node
  ├─ Zod validation du draft
  ├─ Vérifier chaque nombre
  ├─ Vérifier stock > 0 si promesse
  ├─ Vérifier remise ≤ 10%
  ├─ Bloquer réassort
  ├─ Bloquer B2B
  ├─ Bloquer remboursement espèces
  │
  ├─ SI OK → response = draft
  │
  ├─ SI ERREUR (retry < 1) → RETRY
  │          ↓
  │       conversation_node (re-call)
  │          ↓
  │       guardrail_node
  │
  └─ SI TOUJOURS ERREUR → escalation
  ↓
[OUTPUT DECISION]
  ├─ needsHuman = true → escalation_node
  ├─ Sinon → END (send response)
  ↓
escalation_node
  ├─ Crée record DB
  ├─ Enregistre motif + contexte
  ├─ Génère message client
  └─ Marque conversation
  ↓
[HORS GRAPHE SYNC]
  relance_node (via BullMQ)
  ├─ 24h+ sans message OU DEMO_DELAY_MINUTES
  ├─ Panier non vide
  ├─ Choix variante A/B
  ├─ Respect horaires 10h-20h
  └─ Une seule relance
  ↓
END
```

### Checkpointer PostgreSQL
- Thread ID = `client_id` ou `telephone`
- Persiste après redémarrage
- LangGraph charge automatiquement l'historique

---

## 🛠️ API FASTIFY

### Routes WebSocket

```
POST /ws
  ├─ Upgrade WebSocket
  ├─ Identifie client (phone ou nouveau)
  ├─ Charge/crée conversation
  ├─ Lance LangGraph
  ├─ Stream réponse
  └─ Persiste messages
```

### Routes REST

```
GET /health
  └─ { status: 'ok', db: bool, redis: bool, llm: bool }

GET /api/orders
  ├─ Query: client_id?, status?, limit=20
  └─ Retourne orders + order_items

GET /api/orders/:orderId
  └─ Détail commande

GET /api/catalog
  ├─ Query: famille?, couleur?, taille?, en_stock_only?
  └─ Retourne produits

GET /api/conversations/:conversationId
  ├─ Historique messages
  ├─ État panier
  └─ État agent

GET /api/escalations
  ├─ Query: statut=NEEDS_HUMAN_REVIEW
  └─ Escalades en attente

PATCH /api/escalations/:escalationId
  ├─ Body: { statut: 'RESOLVED' }
  └─ Clôt escalade
```

---

## 💾 SEEDER (idempotent)

```typescript
1. Vérifier si déjà seedé (SELECT COUNT)
2. ON CONFLICT DO NOTHING pour chaque import
3. Importer dans l'ordre :
   - products (80)
   - shipping_rates (12)
   - promotions (12)
   - clients (120)
   - orders (320)
   - order_items (449)
4. FAIL FAST si volumes ≠ attendus
5. Retour : { success, productsCount, clientsCount, ... }
```

---

## 🤖 NŒUDS LangGraph (responsabilités)

### multimodal_node
- **Entrée** : message brut (texte, audio, image)
- **Sortie** : texte normalisé + langue
- Appelle STT si audio (dégradation gracieuse)
- Appelle vision si image
- Fallback : escalade si service down

### intent_node
- **Entrée** : texte normalisé
- **LLM** : GPT-4.1 avec Zod schema
- **Sortie** : intention (18 types) + confiance
- Confiance < 85% → 'inconnu'
- Jamais supposer

### catalogue_node
- **Entrée** : intention + facts
- **Tools** :
  - search_catalog()
  - check_stock()
  - get_price()
  - suggest_alternatives()
  - get_shipping_cost()
- **Sortie** : facts enrichis

### conversation_node
- **Entrée** : state complet
- **LLM** : GPT-5.5 (raisonnement)
- **Langue** : fr|ar|darija
- **Utilisation** : UNIQUEMENT facts (pas d'invention)
- **Sortie** : draft en langue client

### guardrail_node
- **Entrée** : draft + facts
- **Valide** : Zod schema
- **Bloque** :
  - Nombre sans fact source
  - Remise > 10%
  - Stock = 0 mais promesse
  - Réassort promis
  - B2B / ICE
  - Remboursement espèces
- **Retry** : 1× max
- **Escalade** : si retry échoue

### escalation_node
- **Crée** : record escalations
- **Enregistre** : motif + contexte complet
- **Message** : "Un agent humain va vous répondre"
- **Marque** : conversation.needsHuman = true

### relance_node (BullMQ)
- Détecte : panier non converti + 24h+ sans message
- Crée job : `{ conversationId, variante: 'A'|'B' }`
- Respect horaires : 10h-20h lun-sam
- Envoie via WebSocket

---

## 📦 TOOLS (10 fonctions)

### 1. search_catalog
```
Input: { famille?, couleur?, taille?, genre?, matiere?, prix_max?, en_stock_seulement? }
Output: [{ ref, modele, famille, couleur, taille, prix_mad, prix_effectif, stock, promo_active }]
Source: SELECT * FROM products ... WHERE ...
```

### 2. check_stock
```
Input: { ref?, modele?, couleur?, taille? }
Output: { disponible: bool, stock: int, ref }
Source: SELECT stock FROM products WHERE ref = ?
```

### 3. suggest_alternatives
```
Input: { ref }
Output: [{ ref, modele, famille, couleur, taille, prix_mad, stock }] (max 3)
Source: Même famille + stock > 0, même/couleur/taille/prix proches
```

### 4. get_price
```
Input: { ref }
Output: { prix_normal, prix_promo?, prix_effectif, promo_id?, valide_jusquau, source }
Source: SELECT * FROM products, promotions WHERE ... NOW() BETWEEN debut AND fin
```

### 5. get_shipping_cost
```
Input: { ville }
Output: { trouve: bool, frais_mad, delai_heures, cod, retrait }
Source: SELECT * FROM shipping_rates WHERE ville = ?
Escalade si trouve = false
```

### 6. apply_discount
```
Input: { total, pct }
Output: { autorise: bool, nouveau_total, raison? }
Source: if (pct <= 10) autorise = true; else escalade
```

### 7. update_cart
```
Input: { conversationId, action, ref?, quantite?, taille?, ... }
Actions: 'add' | 'remove' | 'change_size' | 'clear'
Output: { cart, sousTotal, frais, total }
Source: Redis + state
```

### 8. create_order
```
Input: { conversationId, clientId?, telephone, items, ville, paiement }
Output: { commande_id, total_mad }
Source: Transaction PostgreSQL (verrouillage de stock)
Atomic: check stock → décrémente → crée order + items
```

### 9. get_client_history
```
Input: { clientId | telephone }
Output: { nom, nb_commandes, derniereCommande, villeHabituelle, segment }
Source: SELECT * FROM clients LEFT JOIN orders ...
```

### 10. escalate
```
Input: { motif, contexte }
Output: { escalation_id, success }
Source: INSERT INTO escalations
```

---

## 🎯 VARIANTES RELANCE A/B

### Variante A (Urgence)
```
"Salam ! Votre panier est prêt (2 articles, 680 MAD). 
Il ne reste que 3 pièces en stock. 
Confirmer avant que ce soit trop tard ?"
```

### Variante B (Rappel doux)
```
"Bonjour ! Vous aviez un panier en attente. 
On vous l'a gardé exactement (680 MAD).
Vous le confirmer aujourd'hui ?"
```

---

## 📱 SIMULATEUR WEB (React Components)

### ChatSimulator
- Sélectionner client existant
- Créer nouveau client
- Textarea message
- File upload audio/image
- Affichage réponse temps réel
- Affichage traces structurées (tool calls, facts, guardrail)
- Affichage latence

### Dashboard
**KPIs** :
- Conversations actives (24h)
- Commandes (total + count)
- Taux conversion (orders / conversations)
- Chiffre d'affaires (sum total_mad)
- Panier moyen
- Ventes agent (created_by='agent')
- Taux escalade
- Récupération paniers abandonnés

**Sections** :
- Conversations (liste + détail)
- Catalog (grid products)
- Stock (table avec filtres)
- Commandes (table + tri)
- Escalades (liste + bouton reprendre)
- Relances (historique A/B)

---

## 🐳 DOCKER COMPOSE

Services :
1. **web** (React/Vite) : port 3000
2. **api** (Fastify) : port 3000 (interne)
3. **postgres** : port 5432
4. **redis** : port 6379
5. **worker** (Node.js) : BullMQ consumer

Healthchecks : ok sur tous les services

Dépendances : api depends_on postgres + redis (condition: service_healthy)

Volumes :
- postgres_data
- redis_data

---

## ✅ CHECKLIST PHASE 2

- [x] Arborescence monorepo complète
- [x] Schéma PostgreSQL (11 tables + indexes)
- [x] KenzaState TypeScript interface
- [x] LangGraph routing et nœuds (7)
- [x] 10 tools avec input/output
- [x] Seeder idempotent
- [x] API Fastify (WebSocket + REST)
- [x] Dashboard sections
- [x] Docker Compose (5 services)
- [x] Variantes relance A/B
- [x] Prompts multilingues (structure)

---

## 🛑 PRÊT POUR PHASE 3 — SOCLE

Démarrer maintenant ?
