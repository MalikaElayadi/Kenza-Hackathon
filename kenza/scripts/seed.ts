import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import pg from 'pg';

const { Client } = pg;

interface Product {
  ref: string;
  modele: string;
  famille: string;
  genre: string;
  couleur: string;
  taille: string;
  matiere: string;
  saison: string;
  prix_mad: string;
  stock: string;
  delai_reassort_jours: string;
  code_barre: string;
  poids_g: string;
}

interface Client {
  client_id: string;
  nom: string;
  telephone: string;
  ville: string;
  langue_preferee: string;
  premier_achat: string;
  nb_commandes: string;
  segment: string;
}

interface Order {
  commande_id: string;
  client_id: string;
  date: string;
  canal: string;
  statut: string;
  total_articles_mad: string;
  frais_livraison_mad: string;
  total_mad: string;
  ville_livraison: string;
  paiement: string;
}

interface OrderItem {
  commande_id: string;
  ref: string;
  modele: string;
  taille: string;
  quantite: string;
  prix_unitaire_mad: string;
}

interface ShippingRate {
  ville: string;
  frais_mad: string;
  delai_heures: string;
  paiement_a_la_livraison: string;
  retrait_boutique: string;
}

interface Promotion {
  ref: string;
  modele: string;
  prix_normal_mad: string;
  prix_promo_mad: string;
  debut: string;
  fin: string;
  condition: string;
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function loadCSV(filename: string): Promise<any[]> {
  const filePath = path.join(process.cwd(), 'data', filename);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  
  return records;
}

async function seedProducts() {
  console.log('Seeding products...');
  const products = await loadCSV('catalogue.csv') as Product[];
  
  if (products.length !== 80) {
    throw new Error(`Expected 80 products, got ${products.length}`);
  }
  
  for (const product of products) {
    await client.query(
      `INSERT INTO products (ref, modele, famille, genre, couleur, taille, matiere, saison, prix_mad, stock, delai_reassort_jours, code_barre, poids_g)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (ref) DO NOTHING`,
      [
        product.ref,
        product.modele,
        product.famille,
        product.genre,
        product.couleur,
        product.taille,
        product.matiere,
        product.saison,
        parseInt(product.prix_mad),
        parseInt(product.stock),
        product.delai_reassort_jours ? parseInt(product.delai_reassort_jours) : null,
        product.code_barre,
        product.poids_g ? parseInt(product.poids_g) : null,
      ]
    );
  }
  
  const count = await client.query('SELECT COUNT(*) FROM products');
  console.log(`✅ Products seeded: ${count.rows[0].count}/80`);
}

async function seedClients() {
  console.log('Seeding clients...');
  const clients = await loadCSV('clients.csv') as Client[];
  
  if (clients.length !== 120) {
    throw new Error(`Expected 120 clients, got ${clients.length}`);
  }
  
  for (const c of clients) {
    await client.query(
      `INSERT INTO clients (client_id, nom, telephone, ville, langue_preferee, premier_achat, nb_commandes, segment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (client_id) DO NOTHING`,
      [
        c.client_id,
        c.nom,
        c.telephone,
        c.ville,
        c.langue_preferee,
        c.premier_achat,
        parseInt(c.nb_commandes),
        c.segment,
      ]
    );
  }
  
  const count = await client.query('SELECT COUNT(*) FROM clients');
  console.log(`✅ Clients seeded: ${count.rows[0].count}/120`);
}

async function seedShippingRates() {
  console.log('Seeding shipping rates...');
  const rates = await loadCSV('livraison.csv') as ShippingRate[];
  
  if (rates.length !== 12) {
    throw new Error(`Expected 12 shipping rates, got ${rates.length}`);
  }
  
  for (const rate of rates) {
    await client.query(
      `INSERT INTO shipping_rates (ville, frais_mad, delai_heures, paiement_a_la_livraison, retrait_boutique)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (ville) DO NOTHING`,
      [
        rate.ville,
        parseInt(rate.frais_mad),
        parseInt(rate.delai_heures),
        rate.paiement_a_la_livraison === 'oui',
        rate.retrait_boutique === 'oui',
      ]
    );
  }
  
  const count = await client.query('SELECT COUNT(*) FROM shipping_rates');
  console.log(`✅ Shipping rates seeded: ${count.rows[0].count}/12`);
}

async function seedPromotions() {
  console.log('Seeding promotions...');
  const promos = await loadCSV('promotions.csv') as Promotion[];
  
  if (promos.length !== 12) {
    throw new Error(`Expected 12 promotions, got ${promos.length}`);
  }
  
  for (const promo of promos) {
    await client.query(
      `INSERT INTO promotions (ref, modele, prix_normal_mad, prix_promo_mad, debut, fin, condition)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING`,
      [
        promo.ref,
        promo.modele,
        parseInt(promo.prix_normal_mad),
        parseInt(promo.prix_promo_mad),
        promo.debut,
        promo.fin,
        promo.condition,
      ]
    );
  }
  
  const count = await client.query('SELECT COUNT(*) FROM promotions');
  console.log(`✅ Promotions seeded: ${count.rows[0].count}/12`);
}

async function seedOrders() {
  console.log('Seeding orders...');
  const orders = await loadCSV('commandes.csv') as Order[];
  
  if (orders.length !== 320) {
    throw new Error(`Expected 320 orders, got ${orders.length}`);
  }
  
  for (const order of orders) {
    await client.query(
      `INSERT INTO orders (commande_id, client_id, date, canal, statut, total_articles_mad, frais_livraison_mad, total_mad, ville_livraison, paiement, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (commande_id) DO NOTHING`,
      [
        order.commande_id,
        order.client_id,
        order.date,
        order.canal,
        order.statut,
        parseInt(order.total_articles_mad),
        parseInt(order.frais_livraison_mad),
        parseInt(order.total_mad),
        order.ville_livraison,
        order.paiement,
        'humain',
      ]
    );
  }
  
  const count = await client.query('SELECT COUNT(*) FROM orders');
  console.log(`✅ Orders seeded: ${count.rows[0].count}/320`);
}

async function seedOrderItems() {
  console.log('Seeding order items...');
  const items = await loadCSV('commandes-lignes.csv') as OrderItem[];
  
  if (items.length !== 449) {
    throw new Error(`Expected 449 order items, got ${items.length}`);
  }
  
  for (const item of items) {
    await client.query(
      `INSERT INTO order_items (commande_id, ref, modele, taille, quantite, prix_unitaire_mad)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [
        item.commande_id,
        item.ref,
        item.modele,
        item.taille,
        parseInt(item.quantite),
        parseInt(item.prix_unitaire_mad),
      ]
    );
  }
  
  const count = await client.query('SELECT COUNT(*) FROM order_items');
  console.log(`✅ Order items seeded: ${count.rows[0].count}/449`);
}

async function validateCounts() {
  console.log('\n📊 Validating counts...');
  
  const checks = [
    { table: 'products', expected: 80 },
    { table: 'clients', expected: 120 },
    { table: 'orders', expected: 320 },
    { table: 'order_items', expected: 449 },
    { table: 'shipping_rates', expected: 12 },
    { table: 'promotions', expected: 12 },
  ];
  
  let allValid = true;
  
  for (const check of checks) {
    const result = await client.query(`SELECT COUNT(*) FROM ${check.table}`);
    const actual = parseInt(result.rows[0].count);
    const status = actual === check.expected ? '✅' : '❌';
    console.log(`${status} ${check.table}: ${actual}/${check.expected}`);
    
    if (actual !== check.expected) {
      allValid = false;
    }
  }
  
  if (!allValid) {
    throw new Error('Validation failed: Not all tables have the expected row counts');
  }
  
  console.log('\n✅ All counts validated successfully!');
}

async function main() {
  try {
    console.log('🌱 Starting Kenza database seeding...\n');
    
    await client.connect();
    console.log('✅ Connected to PostgreSQL');
    
    // Seed all tables
    await seedProducts();
    await seedClients();
    await seedShippingRates();
    await seedPromotions();
    await seedOrders();
    await seedOrderItems();
    
    // Validate
    await validateCounts();
    
    console.log('\n🎉 Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
