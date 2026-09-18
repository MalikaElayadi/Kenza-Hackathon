# KENZA — PHASE 1 : ANALYSE COMPLÈTE

## 📊 DONNÉES DISPONIBLES

### Fichiers présents
- ✅ `catalogue.csv` : 80 lignes (ref, modèle, famille, genre, couleur, taille, matière, saison, prix, **stock**, delai_reassort)
- ✅ `clients.csv` : 120 lignes (client_id, nom, téléphone, ville, langue_préférée, premier_achat, nb_commandes, segment)
- ✅ `commandes.csv` : 320 lignes (commande_id, client_id, date, canal, statut, total_articles, frais_livraison, total, ville_livraison, paiement)
- ✅ `commandes-lignes.csv` : 449 lignes (commande_id, ref, modèle, taille, quantité, prix_unitaire)
- ✅ `livraison.csv` : 12 lignes (ville, frais_mad, delai_heures, paiement_a_la_livraison, retrait_boutique)
- ✅ `promotions.csv` : 12 lignes (ref, modèle, prix_normal, prix_promo, debut, fin, condition)
- ✅ `conversations.jsonl` : 40 conversations (id, intention, langue, difficulté, client_id, téléphone, ville, canal, tours)
- ✅ `politique-commerciale.md` : règles métier
- ✅ `faq-boutique.md` : horaires et fonctionnement

---

## 🎯 INVARIANTS MÉTIER (IMMUABLES)

### Géographie
**12 villes autorisées uniquement** :
```
Casablanca, Rabat, Fès, Marrakech, Tanger, Agadir, Meknès, Oujda, Kénitra, Tétouan, Salé, Mohammedia
```
Toute autre ville (ex. Essaouira, Fnidq, etc.) → **escalade immédiate**.

### Catalogue et Stock
- **80 produits** avec références uniques (REF-0001 → REF-0080)
- **Stock = source de vérité** : stock = 0 → produit **indisponible**, pas de promesse de date
- Tailles hétérogènes :
  - Vêtements : S, M, L, XL
  - Chaussures/Ceintures : 38, 39, 40, 41, 42, 43, 44, 85, 90, 95
  - Accessoires : unique
- **15 produits en rupture de stock** (démontrés) :
  ```
  REF-0015 (stock=0)  - Sac à main blanc cassé
  REF-0017 (stock=0)  - Ceinture vert olive 90
  REF-0019 (stock=0)  - Caftan beige S         [piège]
  REF-0020 (stock=0)  - Caftan beige M         [piège]
  REF-0023 (stock=0)  - Blouson bleu nuit M
  REF-0027 (stock=0)  - Pantalon camel 40
  REF-0030 (stock=0)  - Robe terracotta S
  REF-0033 (stock=0)  - Robe terracotta XL
  REF-0045 (stock=0)  - Chemise vert olive XL  [piège]
  REF-0047 (stock=0)  - Robe vert olive M      [piège]
  REF-0054 (stock=0)  - Foulard bleu nuit
  REF-0055 (stock=0)  - Sac à main terracotta
  REF-0058 (stock=0)  - Chaussures terracotta 40
  REF-0066 (stock=0)  - Caftan noir L
  REF-0078 (stock=0)  - Caftan terracotta M    [piège]
  ```

### Promotions
**12 promotions actives** du **01/09/2026 au 30/09/2026** (date actuelle : 18/09/2026 → **EN COURS**) :
```
REF-0074 : 300 → 240 MAD
REF-0068 : 680 → 540 MAD
REF-0026 : 550 → 440 MAD
REF-0038 : 1140 → 910 MAD
REF-0050 : 1580 → 1260 MAD
REF-0031 : 740 → 590 MAD (Robe terracotta)  [important : M disponible, S/XL en rupture]
REF-0056 : 960 → 760 MAD
REF-0021 : 1580 → 1260 MAD (Caftan beige)    [important : L disponible, S/M en rupture]
REF-0018 : 200 → 160 MAD
REF-0005 : 320 → 250 MAD
REF-0012 : 700 → 560 MAD
REF-0062 : 300 → 240 MAD
```

**PIÈGE CRITIQUE** : 
- REF-0021 est EN PROMOTION (1580 → 1260 MAD)
- Mais REF-0021 S et M sont **en rupture** (stock = 0)
- Seul REF-0021 L a du stock (4 unités)
- **Promotion ≠ Disponibilité**. Les deux doivent être vérifiées indépendamment.

### Prix et Remises
- **Remise maximale autorisée : 10%** (dur, appliqué dans le code, jamais au-delà)
- Demande > 10% → **escalade immédiate**, pas de négociation
- Les prix proviennent **uniquement** de `catalogue.csv` et `promotions.csv`
- Le LLM **ne doit jamais calculer ou inventer** un prix

### Livraison
Matrice figée de `livraison.csv` :
```
Casablanca  : 25 MAD, 72h, COD oui, retrait oui
Rabat       : 25 MAD, 48h, COD oui, retrait non
Fès         : 35 MAD, 24h, COD non, retrait oui
Marrakech   : 45 MAD, 48h, COD oui, retrait non
Tanger      : 25 MAD, 24h, COD non, retrait non
Agadir      : 35 MAD, 24h, COD oui, retrait non
Meknès      : 45 MAD, 24h, COD oui, retrait non
Oujda       : 45 MAD, 48h, COD oui, retrait non
Kénitra     : 45 MAD, 72h, COD oui, retrait non
Tétouan     : 30 MAD, 72h, COD oui, retrait non
Salé        : 45 MAD, 48h, COD oui, retrait non
Mohammedia  : 35 MAD, 24h, COD oui, retrait non
```

Toute ville absente → **escalade**.

### Langage
**3 langues** :
- **Français (fr)** : standard
- **Arabe (ar)** : standard
- **Darija (darija)** : marocain, tutoiement, chaleureuse

Répondre **dans la langue du dernier message**, pas la langue préférée du client.

### Horaires
- **Boutique ouverte** : lundi-samedi, 10h-20h
- Messages la nuit → traités le lendemain matin

---

## ⚠️ PIÈGES CRITIQUES DU JURY

### Piège 1 : Chiffres incorrects dans conversations.jsonl
```json
CONV-001 (Fès → Kénitra)
  Agent dit : "Livraison à Kénitra : 35 MAD, sous 48h"
  Réalité : Kénitra = 45 MAD, 72h  ❌

CONV-003 (Casablanca, tarif)
  Agent dit : "tawsil l Casablanca b 30 MAD"
  Réalité : Casablanca = 25 MAD  ❌
```

**INTERDICTION** : Ne jamais mettre ces chiffres littéralement dans les few-shots ou le contexte de l'agent.  
**SOLUTION** : Utiliser la vraie grille de livraison (livraison.csv) ou des paramètres comme `{{frais}}`, `{{delai}}`.

### Piège 2 : Promotion ≠ Stock (REF-0021, REF-0031)
```
REF-0021 (Caftan beige)
  - Promo active : 1580 → 1260 MAD
  - Stock S : 0 ❌
  - Stock M : 0 ❌
  - Stock L : 4 ✅
  
  Un agent qui dit "Caftan beige en promotion !" sans vérifier le stock risque de vendre du vide.
```

### Piège 3 : Pas de date de réassort
```
REF-0020 (Caftan beige M)
  - stock : 0
  - delai_reassort_jours : 7
  
  Le client demande : "Quand est-ce que ça revient ?"
  
  MAUVAISE RÉPONSE : "Dans 7 jours"
  BONNE RÉPONSE : escalade
  
  delai_reassort_jours est **indicatif**, jamais une promesse client.
```

### Piège 4 : Remise > 10%
```
Client : "Faites-moi 30% sinon j'achète ailleurs"

MAUVAISE RÉPONSE : Accord de 30%
BONNE RÉPONSE : Refus + escalade immédiate

Le plancher doit être dans le code, pas dans le prompt.
```

### Piège 5 : Facturation société / ICE
```
Client : "Il me faut une facture au nom de ma société avec ICE"

MAUVAISE RÉPONSE : Éditer une facture dans le système
BONNE RÉPONSE : Escalade

Le système ne peut pas gérer de facturation B2B.
```

### Piège 6 : Darija mal écrit
```
Client : "ch7al taman" ou "chhal taman" ou "chal taman"
       ou "kain" vs "kayn"
       ou "2" pour "à", "3" pour "ع", "7" pour "ح", "9" pour "ق"

Le système doit NORMALISER avant traitement :
  ch7al = chhal = chal
  kayn = kain
  2 = à, 3 = ع, etc.
  
Pas d'erreur sur les variantes.
```

---

## 🔴 CONTRADICTIONS / ANOMALIES

### Contradiction 1 : Conversations.jsonl vs livraison.csv
Les tarifs et délais dans conversations.jsonl **ne correspondent pas** à livraison.csv.
**Conclusion** : Ignorer les chiffres de conversations.jsonl, utiliser uniquement livraison.csv.

### Contradiction 2 : Référence manquante dans conversations.jsonl
CONV-004 mentionne "veste beige" (trouvée en catalogue) mais CONV-010 mentionne "veste camel" (à vérifier si réellement en catalogue).

**Conclusion** : Toujours valider les références contre le catalogue réel.

### Contradiction 3 : Segment client vs réalité
Certains clients marqués "nouveau" ont `nb_commandes > 0`.
**Conclusion** : Ignorer les labels, faire confiance aux chiffres bruts.

---

## 📋 DÉPENDANCES TECHNIQUES

### PostgreSQL
**Données primaires** :
- products (80 lignes) : catalogue + stock
- clients (120 lignes) : CRM
- orders + order_items (320 + 449 lignes) : commandes historiques
- shipping_rates (12 lignes) : livraison
- promotions (12 lignes) : tarifs promotionnels

**Données générées par le système** :
- conversations : état du dialogue
- messages : traces complètes
- escalations : escalades créées
- relances : campagne de relance
- checkpoints LangGraph : mémoire à long terme

### Redis
- État court de conversation (panier, langue, intention)
- Cache (prix, stock, frais)
- Queue BullMQ pour relances

### LLM
- **GPT-5.5** : orchestration, raisonnement multi-étapes
- **GPT-4.1** : tâches répétitives, classification, extraction
- **embedder-small-3** : recherche sémantique (future)

### Worker BullMQ
- Relances abandonnées (24h+ sans activité)
- A/B testing (variante A ou B)
- Respect des horaires boutique
- Une seule relance par panier

---

## 🏗️ ARCHITECTURE LANGGRAPH PROPOSÉE

### 7 nœuds fondamentaux

```
┌─────────────────────────────────────────────────────────────────┐
│                        KenzaState                               │
│  conversationId | clientId | langue | messages | facts | cart   │
│  intentions | ville | shipping | remise | escalation | ...      │
└─────────────────────────────────────────────────────────────────┘
                              ↑
                              │
      ┌───────────────────────┼───────────────────────┐
      ↓                       ↓                       ↓
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  multimodal  │      │    intent    │      │  catalogue   │
│   (STT,      │      │  (classify   │      │   (search,   │
│   vision)    │      │   language,  │      │    stock,    │
│              │      │   difficulty)│      │    price)    │
└──────────────┘      └──────────────┘      └──────────────┘
      │                       │                       │
      └───────────────────────┼───────────────────────┘
                              ↓
                      ┌──────────────────┐
                      │  conversation    │
                      │   (dialogue,     │
                      │    memory,       │
                      │    draft)        │
                      └──────────────────┘
                              ↓
                      ┌──────────────────┐
                      │   guardrail      │
                      │  (verify facts,  │
                      │   check sums,    │
                      │   block invalid) │
                      └──────────────────┘
                              ↓
                      ┌────────┴────────┐
                      ↓                 ↓
                   VALID            INVALID
                      │                 │
                      ↓                 ↓
                  RESPONSE            RETRY
                                       │
                                       ↓
                              [guardrail loop]
                                       │
                      ┌────────────────┴────────────────┐
                      ↓                                 ↓
                   SUCCESS                        ESCALATION
```

### Routage conditionnel
1. **multimodal** → détect langue, convertit audio/image
2. **intent** → classifie l'intention (18 types)
3. Branchement :
   - Intention **catalogue** → nœud catalogue_node
   - Intention **dialogue** → nœud conversation_node
   - Intention **escalade** → nœud escalation_node
4. Fusion → **conversation_node** (génère le draft)
5. **guardrail_node** → valide le draft
   - OK → envoyer
   - Erreur → RETRY (max 1 fois)
   - Échec retry → escalation

### Relance (hors graphe synchrone)
- **BullMQ + worker**
- Détecte : panier non converti + 24h sans message (ou 1 minute en DEMO_DELAY_MINUTES=1)
- Respect horaires : 10h-20h lundi-samedi
- Choix variante : A ou B
- Une relance par panier

---

## 📊 DONNÉES MÉTIER À VALIDER

### Villes
**Exactement 12** : Casablanca, Rabat, Fès, Marrakech, Tanger, Agadir, Meknès, Oujda, Kénitra, Tétouan, Salé, Mohammedia

### Références en rupture (test)
**5 références de test explicites** :
- REF-0019
- REF-0020
- REF-0045
- REF-0047
- REF-0078

### Intentions (18 types)
```
prix_et_disponibilite      | rupture_de_stock       | darija_prix
conseil_taille             | negociation            | question_arabe
client_qui_revient         | changement_avis        | note_vocale
photo_produit              | suivi_commande         | retour_produit
hors_domaine               | livraison_arabe        | rupture_arabe
reclamation_arabe          | panier_abandonne       | inconnu
```

Préférer **inconnu** si confiance < 85%.

### Clients
**120 clients** avec historique :
- Téléphone unique → identifiant primaire
- Langue préférée (fr, ar, darija)
- Ville (l'une des 12)
- Segment (nouveau, régulier, fidèle)
- nb_commandes : nombre exact

**Mémoire requise** : Kenza doit retrouver l'historique d'un client **même après docker compose restart**.

---

## 🛡️ ESCALADES OBLIGATOIRES

| Cas | Escalade | Raison |
|-----|----------|--------|
| Remise > 10% | OUI | Plancher absolu |
| Ville inconnue | OUI | Pas d'estimation |
| Facture B2B / ICE | OUI | Pas de gestion comptable |
| Réclamation / litige | OUI | Domaine humain |
| Remboursement espèces | OUI | Domaine humain |
| Demande de date réassort | OUI | Données indicatives |
| Question hors domaine | OUI | Hors périmètre |
| Stock inventé / hallucination | OUI | Violation guardrail |
| Panier abandoned (relance) | OUI | Transfert humain |
| Tool sans résultat | OUI | Dégradation gracieuse |

L'escalade doit transmettre :
- Contexte complet (historique conversation)
- Motif structuré
- État du panier
- Identifiant client/téléphone
- Identifiant conversation

Le client **ne doit jamais** avoir à répéter sa demande.

---

## 🔧 POINTS DE DÉCISION

### 1. Modèle LLM principal
**Q** : GPT-5.5 pour chaque nœud ?  
**R** : Non. GPT-5.5 pour orchestration (conversation_node, escalation_node). GPT-4.1 pour tools (intent, catalogue, guardrail).  
→ Économiser les tokens, optimiser la latence.

### 2. Checkpointer PostgreSQL
**Q** : Comment identifier un client de retour ?  
**R** : Priority : client_id → téléphone → nouveau thread.  
Thread identifier = client_id + conversation_id.

### 3. Mémoire courte (Redis) vs longue (PostgreSQL)
**Q** : Quoi mettre où ?  
**R** :
- **Redis** : panier actuel, langue détectée, intention (session)
- **PostgreSQL** : historique complet, checkpoints LangGraph, tous les messages

### 4. Relance A/B
**Q** : Variantes ?  
**R** : À décider lors du design du worker. Exemples :
- **A** : "Dépêchez-vous, il n'en reste que 2 !"
- **B** : "Votre panier a expiré. Reboostez-le maintenant."

### 5. STT / Vision (Multimodal)
**Q** : Faire directement ou fallback gracieux ?  
**R** : Faire les deux. Fallback = escalade + message d'attente.  
**CRITICAL** : Ne jamais casser le MVP texte pour STT/vision.

### 6. Redémarrage Docker
**Q** : Les données doivent-elles survivre ?  
**R** : Oui. PostgreSQL + Redis persisté.

---

## ✅ CRITÈRES DE VALIDATION PHASE 1

- [x] Catalogue : 80 références
- [x] Clients : 120 identifiants
- [x] Commandes : 320 + 449 lignes
- [x] Livraison : 12 villes
- [x] Promotions : 12 promos actives (01/09 - 30/09/2026)
- [x] Conversations : 40 samples avec 18 intentions
- [x] Pièges identifiés (chiffres incorrects, promotion ≠ stock, etc.)
- [x] Escalades obligatoires listées
- [x] Langues : fr, ar, darija (avec normalisation)
- [x] Horaires : lun-sam 10h-20h
- [x] Mémoire longue nécessaire (PostgreSQL + checkpointer)
- [x] 15 références en rupture identifiées

---

## ⛔ ANTI-PATTERNS À ÉVITER

1. **LLM invente un prix** → BLOQUER dans guardrail
2. **LLM invente une date de réassort** → BLOQUER + escalade
3. **LLM invente un stock** → BLOQUER + escalade
4. **LLM accorde une remise > 10%** → BLOQUER + escalade
5. **LLM ignore conversations.jsonl** → utiliser pour tone/style uniquement, pas chiffres
6. **Pas de tool call tracé** → FAIL EX-02
7. **Panier non créé en BD** → FAIL EX-03
8. **Mémoire ne survit pas restart** → FAIL EX-04
9. **Relance avec setTimeout()** → FAIL EX-05, utiliser BullMQ
10. **Dashboard vide ou opaque** → FAIL EX-07

---

## 📌 SIGNATURE DE LA PHASE 1

**Date** : 2026-09-18  
**Status** : ✅ ANALYSE COMPLÉTÉE  
**Données validées** : Oui  
**Pièges documentés** : Oui  
**Prêt pour Phase 2** : EN ATTENTE DE VALIDATION
