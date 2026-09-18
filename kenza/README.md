# Kenza — Agent Commercial IA

**Kenza** est un agent commercial autonome multi-nœuds basé sur LangGraph, conçu pour gérer des conversations de messagerie, qualifier les demandes clients, recommander des produits, gérer les paniers et créer des commandes en direct.

## 🎯 Caractéristiques principales

- ✅ **Agentique réel** : Orchestration LangGraph avec 7 nœuds spécialisés
- ✅ **Zero hallucination** : Toute donnée provient d'un tool + DB
- ✅ **Multilingue** : Français, Arabe, Darija (avec normalisation)
- ✅ **Mémoire persistante** : PostgreSQL + checkpointer LangGraph
- ✅ **Relances abandonnées** : BullMQ worker avec A/B testing
- ✅ **Guardrails stricts** : Validation de chaque réponse
- ✅ **Escalade humaine** : Transfert avec contexte complet
- ✅ **Dashboard complet** : KPIs, conversations, escalades, relances

## 📦 Stack technique

- **Frontend** : React 18 + Vite + Tailwind CSS
- **Backend** : Fastify + Node.js 20
- **Orchestration** : LangGraph.js
- **BD primaire** : PostgreSQL 16
- **Cache/Queue** : Redis 7 + BullMQ
- **LLM** : GPT-5.5 (orchestration) + GPT-4.1 (tâches répétitives)

## 🚀 Démarrage rapide

### Prérequis
- Docker & Docker Compose
- Variables d'environnement (voir `.env.example`)

### Installation

```bash
# 1. Cloner le repo
git clone https://github.com/your/kenza.git
cd kenza

# 2. Copier les variables d'environnement
cp .env.example .env
# Éditer .env avec vos clés API

# 3. Lancer
docker-compose up --build

# 4. Accéder
# - Chat: http://localhost:3000
# - API: http://localhost:3001
# - Healthcheck: http://localhost:3001/health
```

## 📊 Architecture

### LangGraph Orchestrator

```
User Message
  ↓
multimodal_node    → Détecte langue, convertit audio/image
  ↓
intent_node        → Classifie 18 intentions (GPT-4.1)
  ↓
[Routage]
  ├─ catalogue_node    → Recherche, stock, prix, livraison
  ├─ conversation_node → Dialogue (GPT-5.5)
  └─ escalation_node   → Escalade humaine
  ↓
guardrail_node     → Valide chaque chiffre, bloque hallucinations
  ├─ OK   → Response
  ├─ Err  → Retry (1×)
  └─ Fail → Escalation
  ↓
Response
```

### 10 Tools

1. `search_catalog()` — Recherche produits
2. `check_stock()` — Vérifie stock
3. `suggest_alternatives()` — Propose alternatives
4. `get_price()` — Prix + promotions
5. `get_shipping_cost()` — Frais + délais
6. `apply_discount()` — Applique remise (max 10%)
7. `update_cart()` — Gère panier
8. `create_order()` — Crée commande (transactionnelle)
9. `get_client_history()` — Historique client
10. `escalate()` — Crée escalade

### Mémoire

- **Courte (Redis)** : État conversation, panier actuel, langue
- **Longue (PostgreSQL + LangGraph checkpointer)** : Historique complet, survit aux redémarrages

## 🛡️ Règles métier strictes

### Remises
- **Max 10%** → Escalade au-delà

### Stock
- **Stock = 0** → Indisponible, alternative proposée
- **Pas de date réassort** → Escalade sur demande

### Livraison
- **12 villes autorisées** → Essaouira, Fnidq, etc. = Escalade
- **Frais & délais** : De `livraison.csv` uniquement

### Escalades obligatoires
- Remise > 10%
- Facture B2B / ICE
- Réclamation / litige
- Ville inconnue
- Remboursement espèces
- Question hors domaine

## 📊 Dashboard KPIs

- Conversations actives
- Commandes + conversion
- Chiffre d'affaires
- Ventes agent (created_by='agent')
- Taux escalade
- Panier moyen
- Récupération paniers abandonnés
- A/B relance

## 🧪 Tests

```bash
# Replay 40 conversations
docker-compose exec api npm run replay

# Validation volumes
docker-compose exec api npm run check-volumes

# Logs API
docker-compose logs -f api

# Logs Worker
docker-compose logs -f worker
```

## 📋 Données

Fichiers CSV fournis dans `data/` (READ-ONLY) :
- `catalogue.csv` : 80 produits
- `clients.csv` : 120 clients
- `livraison.csv` : 12 villes
- `promotions.csv` : 12 promos (01/09 - 30/09/2026)
- `commandes.csv` : 320 commandes historiques
- `commandes-lignes.csv` : 449 lignes de commande
- `conversations.jsonl` : 40 samples (FR/AR/DARIJA)

Le seeder importe automatiquement au démarrage (idempotent).

## 🗄️ Schéma PostgreSQL

- `products` : Catalogue + stock
- `clients` : CRM
- `orders` + `order_items` : Commandes
- `shipping_rates` : Grille livraison
- `promotions` : Tarifs promotionnels
- `conversations` : État dialogues
- `messages` : Traces complètes
- `escalations` : Escalades + contexte
- `relances` : Campagne relance
- `facts` : Faits de traçabilité

## 🔄 Relances (BullMQ)

- Détecte : Panier non converti + 24h+ sans message (1 min en DEMO_DELAY_MINUTES=1)
- Variantes : A (Urgence) | B (Rappel doux)
- Horaires : 10h-20h lun-sam
- Une seule relance par panier

## 🌍 Multilingue

- **Français** : Standard commercial
- **Arabe** : Support complet
- **Darija** : Marocain, naturel, chaleureuse, tutoiement

Normalise : ch7al/chhal, 2/3/7/9 pour darija.

## 📝 Logs & Observabilité

Chaque message génère :
- `tool_calls` : Arguments + résultats
- `facts` : Données avec source
- `guardrail` : Violations + retries
- `latency_ms` : Latence complète

Zero LLM chain-of-thought exposé → Dashboard affiche uniquement données structurées.

## ⚠️ Pièges du jury

1. **Chiffres faux dans conversations.jsonl** : Ignorer, utiliser grille réelle
2. **Promotion ≠ Stock** : REF-0021 en promo mais S/M en rupture
3. **Pas de réassort promis** : Escalade, pas délai_reassort_jours
4. **Remise > 10%** : Refus + escalade, pas négociation
5. **Darija mal écrit** : Normaliser avant traitement

## 🎯 EX-01 → EX-08 (Critères jury)

- **EX-01** : Conversation complète (catalogue → stock → commande)
- **EX-02** : Journal structuré des tools
- **EX-03** : Commande réelle en DB (created_by='agent')
- **EX-04** : Même client après redémarrage Docker
- **EX-05** : Relance BullMQ visible
- **EX-06** : Escalade avec contexte
- **EX-07** : Dashboard KPIs + traces
- **EX-08** : Démo FR/AR/DARIJA + fautes orthographe

## 📞 Support

Questions ? Consultez `PHASE-1-ANALYSE.md` et `PHASE-2-PLAN.md`.

---

**Version** : 1.0.0 | **Date** : 2026-09-18 | **Status** : 🚧 En développement
