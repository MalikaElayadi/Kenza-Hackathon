#!/bin/bash
set -e

echo "=== Initializing Kenza Database ==="

# Create schema
psql -U postgres -d kenza <<EOF

-- Products table
CREATE TABLE IF NOT EXISTS products (
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

CREATE INDEX IF NOT EXISTS idx_products_famille ON products(famille);
CREATE INDEX IF NOT EXISTS idx_products_couleur ON products(couleur);
CREATE INDEX IF NOT EXISTS idx_products_taille ON products(taille);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
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

CREATE INDEX IF NOT EXISTS idx_clients_telephone ON clients(telephone);
CREATE INDEX IF NOT EXISTS idx_clients_ville ON clients(ville);

-- Shipping rates table
CREATE TABLE IF NOT EXISTS shipping_rates (
  ville VARCHAR(100) PRIMARY KEY,
  frais_mad INT NOT NULL,
  delai_heures INT NOT NULL,
  paiement_a_la_livraison BOOLEAN DEFAULT FALSE,
  retrait_boutique BOOLEAN DEFAULT FALSE
);

-- Promotions table
CREATE TABLE IF NOT EXISTS promotions (
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

CREATE INDEX IF NOT EXISTS idx_promotions_ref ON promotions(ref);
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(debut, fin);
CREATE UNIQUE INDEX IF NOT EXISTS uq_promotions_ref_dates ON promotions(ref, debut, fin);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  commande_id VARCHAR(20) PRIMARY KEY,
  client_id VARCHAR(20) REFERENCES clients(client_id),
  date DATE NOT NULL,
  canal VARCHAR(50),
  statut VARCHAR(50),
  total_articles_mad INT,
  frais_livraison_mad INT,
  total_mad INT,
  ville_livraison VARCHAR(100),
  paiement VARCHAR(50),
  created_by VARCHAR(20) DEFAULT 'humain',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  commande_id VARCHAR(20) NOT NULL REFERENCES orders(commande_id),
  ref VARCHAR(20) NOT NULL REFERENCES products(ref),
  modele VARCHAR(255),
  taille VARCHAR(10),
  quantite INT,
  prix_unitaire_mad INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_commande_id ON order_items(commande_id);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
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

CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_telephone ON conversations(telephone);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id VARCHAR(50) NOT NULL REFERENCES conversations(id),
  role VARCHAR(20),
  texte TEXT,
  intention VARCHAR(100),
  langue VARCHAR(10),
  tool_calls JSONB,
  guardrail JSONB,
  latency_ms INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id, created_at);

-- Escalations table
CREATE TABLE IF NOT EXISTS escalations (
  id SERIAL PRIMARY KEY,
  conversation_id VARCHAR(50) NOT NULL REFERENCES conversations(id),
  motif VARCHAR(100),
  contexte_resume TEXT,
  payload JSONB,
  statut VARCHAR(50) DEFAULT 'NEEDS_HUMAN_REVIEW',
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_escalations_statut ON escalations(statut);

-- Relances table
CREATE TABLE IF NOT EXISTS relances (
  id SERIAL PRIMARY KEY,
  conversation_id VARCHAR(50) NOT NULL REFERENCES conversations(id),
  variante VARCHAR(10),
  planifiee_a TIMESTAMP,
  envoyee_a TIMESTAMP,
  resultat VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_relances_conversation_id ON relances(conversation_id);

-- Facts table
CREATE TABLE IF NOT EXISTS facts (
  id SERIAL PRIMARY KEY,
  conversation_id VARCHAR(50) NOT NULL REFERENCES conversations(id),
  type VARCHAR(50),
  value TEXT,
  source VARCHAR(255),
  ref VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- LangGraph Checkpoints table
CREATE TABLE IF NOT EXISTS langgraph_checkpoints (
  thread_id VARCHAR(255) NOT NULL,
  checkpoint_id VARCHAR(255) NOT NULL,
  checkpoint_ns VARCHAR(255) DEFAULT '',
  parent_checkpoint_id VARCHAR(255),
  type_str VARCHAR(255),
  timestamp BIGINT,
  config JSONB,
  values JSONB,
  metadata JSONB,
  PRIMARY KEY (thread_id, checkpoint_id, checkpoint_ns)
);

CREATE INDEX IF NOT EXISTS idx_langgraph_checkpoints_thread_id ON langgraph_checkpoints(thread_id);

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;

EOF

echo "=== Database schema created successfully ==="
