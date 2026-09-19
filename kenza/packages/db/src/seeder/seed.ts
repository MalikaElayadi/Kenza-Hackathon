import { Pool } from 'pg';
import { parse } from 'csv-parse/sync';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  statement_timeout: 30000,
});

interface SeedResult {
  success: boolean;
  productsCount: number;
  clientsCount: number;
  shippingRatesCount: number;
  promotionsCount: number;
  ordersCount: number;
  orderItemsCount: number;
  message: string;
}

function dataFile(name: string): string {
  const configuredDirectory = process.env.KENZA_DATA_DIR;
  const candidates = [
    configuredDirectory ? join(configuredDirectory, name) : '',
    join(process.cwd(), '..', '..', 'data', name),
    join(process.cwd(), '..', '..', 'jeu-de-donnees-sujet-02-kenza', 'sujet-02-kenza', name),
  ].filter(Boolean);
  const path = candidates.find((candidate) => existsSync(candidate));
  if (!path) {
    throw new Error(`Official dataset file not found: ${name}`);
  }
  return path;
}

async function seed(): Promise<SeedResult> {
  const client = await pool.connect();

  try {
    console.log('=== Starting Kenza Data Seeding ===\n');

    // 1. Import products
    console.log('📦 Importing products...');
    const catalogData = readFileSync(dataFile('catalogue.csv'), 'utf-8');
    const products = parse(catalogData, { columns: true, skip_empty_lines: true });

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
          product.taille || null,
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

    const productsCount = await client.query('SELECT COUNT(*) FROM products');
    console.log(`✅ Products: ${productsCount.rows[0].count} rows\n`);

    // 2. Import shipping rates
    console.log('🚚 Importing shipping rates...');
    const shippingData = readFileSync(dataFile('livraison.csv'), 'utf-8');
    const shippingRates = parse(shippingData, { columns: true, skip_empty_lines: true });

    for (const rate of shippingRates) {
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

    const shippingCount = await client.query('SELECT COUNT(*) FROM shipping_rates');
    console.log(`✅ Shipping rates: ${shippingCount.rows[0].count} rows\n`);

    // 3. Import promotions
    console.log('🎉 Importing promotions...');
    const promoData = readFileSync(dataFile('promotions.csv'), 'utf-8');
    const promos = parse(promoData, { columns: true, skip_empty_lines: true });

    for (const promo of promos) {
      await client.query(
        `INSERT INTO promotions (ref, modele, prix_normal_mad, prix_promo_mad, debut, fin, condition)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (ref, debut, fin) DO NOTHING`,
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

    const promoCount = await client.query('SELECT COUNT(*) FROM promotions');
    console.log(`✅ Promotions: ${promoCount.rows[0].count} rows\n`);

    // 4. Import clients
    console.log('👥 Importing clients...');
    const clientsData = readFileSync(dataFile('clients.csv'), 'utf-8');
    const clients = parse(clientsData, { columns: true, skip_empty_lines: true });

    for (const client_data of clients) {
      await client.query(
        `INSERT INTO clients (client_id, nom, telephone, ville, langue_preferee, premier_achat, nb_commandes, segment)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (client_id) DO NOTHING`,
        [
          client_data.client_id,
          client_data.nom,
          client_data.telephone,
          client_data.ville,
          client_data.langue_preferee,
          client_data.premier_achat,
          parseInt(client_data.nb_commandes),
          client_data.segment,
        ]
      );
    }

    const clientsCount = await client.query('SELECT COUNT(*) FROM clients');
    console.log(`✅ Clients: ${clientsCount.rows[0].count} rows\n`);

    // 5. Import orders
    console.log('📋 Importing orders...');
    const ordersData = readFileSync(dataFile('commandes.csv'), 'utf-8');
    const orders = parse(ordersData, { columns: true, skip_empty_lines: true });

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

    const ordersCount = await client.query('SELECT COUNT(*) FROM orders');
    console.log(`✅ Orders: ${ordersCount.rows[0].count} rows\n`);

    // 6. Import order items
    console.log('📦 Importing order items...');
    const itemsData = readFileSync(dataFile('commandes-lignes.csv'), 'utf-8');
    const items = parse(itemsData, { columns: true, skip_empty_lines: true });

    const existingItems = await client.query('SELECT COUNT(*) FROM order_items');
    if (Number(existingItems.rows[0].count) === 0) {
      for (const item of items) {
        await client.query(
          `INSERT INTO order_items (commande_id, ref, modele, taille, quantite, prix_unitaire_mad)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            item.commande_id,
            item.ref,
            item.modele,
            item.taille || null,
            parseInt(item.quantite),
            parseInt(item.prix_unitaire_mad),
          ]
        );
      }
    }

    const itemsCount = await client.query('SELECT COUNT(*) FROM order_items');
    console.log(`✅ Order items: ${itemsCount.rows[0].count} rows\n`);

    // Validation
    console.log('=== Validation ===');
    const expectedCounts = {
      products: 80,
      clients: 120,
      shipping_rates: 12,
      promotions: 12,
      orders: 320,
      order_items: 449,
    };

    const actualCounts = {
      products: parseInt(productsCount.rows[0].count),
      clients: parseInt(clientsCount.rows[0].count),
      shipping_rates: parseInt(shippingCount.rows[0].count),
      promotions: parseInt(promoCount.rows[0].count),
      orders: parseInt(ordersCount.rows[0].count),
      order_items: parseInt(itemsCount.rows[0].count),
    };

    let allValid = true;
    for (const [table, expected] of Object.entries(expectedCounts)) {
      const actual = actualCounts[table as keyof typeof actualCounts];
      const generatedDataTable = table === 'orders' || table === 'order_items';
      const valid = generatedDataTable ? actual >= expected : actual === expected;
      const status = valid ? '✅' : '❌';
      console.log(`${status} ${table}: ${actual}/${expected}`);
      if (!valid) allValid = false;
    }

    if (!allValid) {
      throw new Error('❌ FAIL FAST: Data volumes do not match expected counts!');
    }

    console.log('\n=== ✅ Seeding complete! ===');

    return {
      success: true,
      productsCount: actualCounts.products,
      clientsCount: actualCounts.clients,
      shippingRatesCount: actualCounts.shipping_rates,
      promotionsCount: actualCounts.promotions,
      ordersCount: actualCounts.orders,
      orderItemsCount: actualCounts.order_items,
      message: 'All data imported successfully',
    };
  } catch (error) {
    console.error('❌ Seeding error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
