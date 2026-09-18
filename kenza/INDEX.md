# 📚 INDEX — Navigation Kenza

Bienvenue ! Voici comment naviguer dans ce projet.

---

## 🗺️ Fichiers principaux

### 📋 Documentation par phase

| Phase | Fichier | Statut | Durée | Pages |
|-------|---------|--------|-------|-------|
| 1 | `PHASE-1-ANALYSE.md` | ✅ | 16h | 20 |
| 2 | `PHASE-2-PLAN.md` | ✅ | 8h | 25 |
| 3 | `PHASE-3-SOCLE.md` | ✅ | 12h | 18 |
| 4 | `PHASE-4-TOOLS.md` | ✅ | 20h | 22 |
| 5 | `PHASE-5-LANGGRAPH.md` | ✅ | 15h | 19 |
| 6 | `PHASE-6-GUARDRAILS.md` | ✅ | 10h | 16 |
| 7 | `PHASE-7-MULTILINGUE.md` | 📅 | 12h | TBD |
| 8 | `PHASE-8-WORKER.md` | 📅 | 10h | TBD |
| 9 | `PHASE-9-MULTIMODAL.md` | 📅 | 15h | TBD |
| 10 | `PHASE-10-DASHBOARD.md` | 📅 | 20h | TBD |
| 11 | `PHASE-11-TESTS-E2E.md` | 📅 | 12h | TBD |
| 12 | `PHASE-12-FINITION.md` | 📅 | 8h | TBD |

### 🎯 Synthèses globales

- **`SYNTHESE-PROJET.md`** : Vue globale du projet (50% complété)
- **`README.md`** : Démarrage rapide
- **`INDEX.md`** : Ce fichier

---

## 🔍 Navigation par sujet

### 📊 Données & Architecture

1. **Données métier** → `PHASE-1-ANALYSE.md`
   - 80 produits, 120 clients, 320 commandes
   - 15 produits en rupture (pièges testés)
   - 12 villes autorisées

2. **Architecture** → `PHASE-2-PLAN.md`
   - Monorepo structure
   - 13 tables PostgreSQL
   - LangGraph design
   - API endpoints

3. **Infrastructure** → `PHASE-3-SOCLE.md`
   - Docker Compose setup
   - PostgreSQL schema
   - Seeder TypeScript
   - Scripts de lancement

### 🛠️ Implémentation

4. **Tools** → `PHASE-4-TOOLS.md`
   - 10 outils métier
   - Schémas Zod
   - 32 tests unitaires
   - SQL sécurisé

5. **LangGraph** → `PHASE-5-LANGGRAPH.md`
   - 7 nœuds (StateGraph)
   - Routing conditionnel
   - PostgreSQL checkpointer
   - Redis cache

6. **Guardrails** → `PHASE-6-GUARDRAILS.md`
   - 8 règles de validation
   - 18 tests
   - Fail-fast + escalade
   - Zero hallucination

### 🌍 Multilingue & Avancé

7. **Multilingue** → `PHASE-7-MULTILINGUE.md` (future)
8. **Worker** → `PHASE-8-WORKER.md` (future)
9. **Multimodal** → `PHASE-9-MULTIMODAL.md` (future)
10. **Dashboard** → `PHASE-10-DASHBOARD.md` (future)

---

## 🚀 Quickstart

### 1. Démarrer les services
```bash
cd kenza
chmod +x scripts/quickstart.sh
./scripts/quickstart.sh
```

### 2. Accéder à l'interface
- Chat : http://localhost:3000
- API : http://localhost:3001

### 3. Lancer les tests
```bash
npm run test
```

---

## 📁 Structure de dossiers

```
kenza/
├── README.md                  ← Démarrage
├── INDEX.md                   ← Vous êtes ici
├── SYNTHESE-PROJET.md         ← Vue globale
│
├── PHASE-*.md                 ← Documentation par phase
├── docker-compose.yml
├── .env (.env.example)
├── package.json
├── tsconfig.json
│
├── data/                      ← Données CSV
├── apps/                      ← Applications
│   ├── api/                   ← Fastify server
│   ├── web/                   ← React UI
│   └── worker/                ← BullMQ worker
├── packages/                  ← Librairies partagées
│   ├── agent/                 ← LangGraph + Tools
│   └── db/                    ← Database utils
├── docker/                    ← Docker configs
├── scripts/                   ← Scripts utiles
└── tests/                     ← Tests E2E (future)
```

---

## 🎯 Points clés par phase

### PHASE 1 : Comprendre les données
**À lire si** : Vous voulez comprendre les pièges métier
- 15 produits en rupture
- Promotions ≠ stock
- 12 villes autorisées
- 3 langues supportées

### PHASE 2 : Architecture globale
**À lire si** : Vous voulez voir le design du système
- LangGraph design
- 7 nœuds orchestrés
- 10 tools métier
- Database schema

### PHASE 3 : Lancer Docker
**À lire si** : Vous installez le projet localement
- Docker Compose setup
- PostgreSQL schema
- Seeder (charger données)
- Scripts de démarrage

### PHASE 4 : Utiliser les tools
**À lire si** : Vous développez les outils
- 10 tools avec Zod
- SQL paramétrisé
- Transactions ACID
- 32 tests unitaires

### PHASE 5 : Orchestrer avec LangGraph
**À lire si** : Vous développez le graphe
- StateGraph<KenzaState>
- 7 nœuds implémentés
- Routing conditionnel
- PostgreSQL checkpointer

### PHASE 6 : Valider avec Guardrails
**À lire si** : Vous travaillez sur la robustesse
- 8 règles de validation
- Fail-fast strategy
- 18 tests
- Zero hallucination

---

## ✅ Checklist de démarrage

- [ ] Cloner le repo
- [ ] Installer Node.js 20+
- [ ] Installer Docker + Docker Compose
- [ ] Copier `.env.example` → `.env`
- [ ] Ajouter les clés LLM dans `.env`
- [ ] Lancer `docker-compose up -d`
- [ ] Attendre PostgreSQL/Redis prêts (30s)
- [ ] Lancer `npm run seed`
- [ ] Vérifier avec `npm run test`
- [ ] Accéder http://localhost:3000

---

## 🔗 Liens rapides

| Tâche | Fichier | Commande |
|-------|---------|----------|
| Lancer | `scripts/quickstart.sh` | `./quickstart.sh` |
| Tester | `packages/agent/src/tools/tools.test.ts` | `npm run test` |
| Seeder | `scripts/seed.ts` | `npm run seed` |
| Logs | Docker Compose | `npm run logs` |
| Arrêter | Docker Compose | `npm run down` |
| Nettoyer | Docker Compose | `npm run clean` |

---

## 📊 Stats

| Métrique | Valeur |
|----------|--------|
| Phases complétées | 6/12 |
| Ligne de code | ~2,500 |
| Tests | 50+ |
| Heures investies | 81h |
| Taux complétude | 50% |

---

## ❓ Questions fréquentes

**Q: Par où commencer ?**
A: Lire `SYNTHESE-PROJET.md` pour une vue globale, puis `README.md` pour démarrer.

**Q: Comment lancer les tests ?**
A: `npm run test` (voir PHASE-4 et PHASE-6 pour détails)

**Q: Comment déboguer ?**
A: `npm run logs` pour voir les logs Docker en temps réel

**Q: Quand Phase 7 sera prête ?**
A: TBD — Follow `PHASE-7-MULTILINGUE.md` quand elle sera créée

**Q: Comment contribuer ?**
A: Fork, créer une branche, envoyer un PR

---

## 🛟 Support

- **Erreur Docker** → Check `docker-compose logs`
- **Erreur seeder** → Check PostgreSQL healthy
- **Erreur tests** → Run `npm install` puis `npm run test`
- **Autre** → Check la phase correspondante

---

## 🎓 Prochaines lectures recommandées

1. **Vue globale** → `SYNTHESE-PROJET.md`
2. **Démarrage** → `README.md`
3. **Données** → `PHASE-1-ANALYSE.md`
4. **Architecture** → `PHASE-2-PLAN.md`
5. **Installation** → `PHASE-3-SOCLE.md`
6. **Tools** → `PHASE-4-TOOLS.md`
7. **Orchestration** → `PHASE-5-LANGGRAPH.md`
8. **Validation** → `PHASE-6-GUARDRAILS.md`

---

**Dernière mise à jour** : 2026-09-18  
**Version** : 1.0.0  
**Status** : ✅ Foundation Ready

