import { z } from 'zod';
import { Client } from 'pg';

// Schemas Zod pour validation stricte
export const SearchCatalogSchema = z.object({
  terme: z.string().optional(),
  famille: z.string().optional(),
  couleur: z.string().optional(),
  taille: z.string().optional(),
  genre: z.string().optional(),
  matiere: z.string().optional(),
  prix_max: z.number().optional(),
  en_stock_seulement: z.boolean().optional().default(false),
});

export const CheckStockSchema = z.object({
  ref: z.string().optional(),
  modele: z.string().optional(),
  couleur: z.string().optional(),
  taille: z.string().optional(),
});

export const SuggestAlternativesSchema = z.object({
  ref: z.string(),
});

export const GetPriceSchema = z.object({
  ref: z.string(),
});

export const GetShippingCostSchema = z.object({
  ville: z.string(),
});

export const ApplyDiscountSchema = z.object({
  total: z.number(),
  pct: z.number(),
});

export const UpdateCartSchema = z.object({
  conversationId: z.string(),
  action: z.enum(['add', 'remove', 'change_size', 'clear']),
  ref: z.string().optional(),
  taille: z.string().optional(),
  qte: z.number().optional(),
});

export const CreateOrderSchema = z.object({
  conversationId: z.string(),
  clientId: z.string(),
  items: z.array(
    z.object({
      ref: z.string(),
      modele: z.string(),
      taille: z.string(),
      quantite: z.number(),
      prix_unitaire: z.number(),
    })
  ),
  ville: z.string(),
  paiement: z.string(),
});

export const GetClientHistorySchema = z.object({
  clientId: z.string().optional(),
  telephone: z.string().optional(),
});

export const EscalateSchema = z.object({
  conversationId: z.string(),
  motif: z.string(),
  contexte: z.string(),
  payload: z.object({}).passthrough(),
});

// Tools class
export class Tools {
  constructor(private pgClient: Client) {}

  /**
   * Tool 1: search_catalog
   * Recherche des produits dans le catalogue
   */
  async searchCatalog(params: z.infer<typeof SearchCatalogSchema>) {
    const validated = SearchCatalogSchema.parse(params);
    
    let query = `SELECT p.ref, p.modele, p.famille, p.couleur, p.taille, p.prix_mad, p.stock,
      EXISTS (SELECT 1 FROM promotions pr WHERE pr.ref = p.ref AND pr.debut <= CURRENT_DATE AND pr.fin >= CURRENT_DATE) AS promo_active,
      COALESCE((SELECT pr.prix_promo_mad FROM promotions pr WHERE pr.ref = p.ref AND pr.debut <= CURRENT_DATE AND pr.fin >= CURRENT_DATE LIMIT 1), p.prix_mad) AS prix_effectif_mad
      FROM products p WHERE 1=1`;
    const queryParams: unknown[] = [];

    if (validated.terme) {
      queryParams.push(`%${validated.terme}%`);
      query += ` AND (p.modele ILIKE $${queryParams.length} OR p.famille ILIKE $${queryParams.length} OR p.couleur ILIKE $${queryParams.length} OR p.matiere ILIKE $${queryParams.length})`;
    }

    if (validated.famille) {
      queryParams.push(validated.famille);
      query += ` AND p.famille ILIKE $${queryParams.length}`;
    }
    if (validated.couleur) {
      queryParams.push(validated.couleur);
      query += ` AND p.couleur ILIKE $${queryParams.length}`;
    }
    if (validated.taille) {
      queryParams.push(validated.taille);
      query += ` AND p.taille = $${queryParams.length}`;
    }
    if (validated.genre) {
      queryParams.push(validated.genre);
      query += ` AND p.genre ILIKE $${queryParams.length}`;
    }
    if (validated.matiere) {
      queryParams.push(validated.matiere);
      query += ` AND p.matiere ILIKE $${queryParams.length}`;
    }
    if (validated.prix_max) {
      queryParams.push(validated.prix_max);
      query += ` AND p.prix_mad <= $${queryParams.length}`;
    }
    if (validated.en_stock_seulement) {
      query += ' AND stock > 0';
    }

    query += ' LIMIT 10';

    const result = await this.pgClient.query(query, queryParams);
    
    return {
      results: result.rows,
      count: result.rows.length,
      source: 'db:products',
    };
  }

  /**
   * Tool 2: check_stock
   * Vérifie la disponibilité d'un produit
   */
  async checkStock(params: z.infer<typeof CheckStockSchema>) {
    const validated = CheckStockSchema.parse(params);

    let query = 'SELECT ref, stock FROM products WHERE 1=1';
    const queryParams: any[] = [];

    if (validated.ref) {
      queryParams.push(validated.ref);
      query += ` AND ref = $${queryParams.length}`;
    }
    if (validated.modele) {
      queryParams.push(validated.modele);
      query += ` AND modele = $${queryParams.length}`;
    }
    if (validated.couleur) {
      queryParams.push(validated.couleur);
      query += ` AND couleur = $${queryParams.length}`;
    }
    if (validated.taille) {
      queryParams.push(validated.taille);
      query += ` AND taille = $${queryParams.length}`;
    }

    query += ' LIMIT 1';

    const result = await this.pgClient.query(query, queryParams);

    if (result.rows.length === 0) {
      return {
        disponible: false,
        stock: 0,
        ref: validated.ref,
        source: 'db:products',
      };
    }

    const row = result.rows[0];
    return {
      disponible: row.stock > 0,
      stock: row.stock,
      ref: row.ref,
      source: 'db:products',
    };
  }

  /**
   * Tool 3: suggest_alternatives
   * Propose des alternatives en stock pour un produit
   */
  async suggestAlternatives(params: z.infer<typeof SuggestAlternativesSchema>) {
    const validated = SuggestAlternativesSchema.parse(params);

    // Récupérer le produit original
    const originalResult = await this.pgClient.query(
      'SELECT famille, couleur, prix_mad FROM products WHERE ref = $1',
      [validated.ref]
    );

    if (originalResult.rows.length === 0) {
      return { alternatives: [], source: 'db:products' };
    }

    const original = originalResult.rows[0];

    // Chercher des alternatives
    const query = `
      SELECT ref, modele, couleur, taille, prix_mad, stock
      FROM products
      WHERE famille = $1 AND stock > 0 AND ref != $2
      ORDER BY ABS(prix_mad - $3), stock DESC
      LIMIT 5
    `;

    const result = await this.pgClient.query(query, [
      original.famille,
      validated.ref,
      original.prix_mad,
    ]);

    return {
      alternatives: result.rows,
      source: 'db:products',
    };
  }

  /**
   * Tool 4: get_price
   * Récupère le prix effectif (normal ou promo) d'un produit
   */
  async getPrice(params: z.infer<typeof GetPriceSchema>) {
    const validated = GetPriceSchema.parse(params);

    // Récupérer le prix normal
    const productResult = await this.pgClient.query(
      'SELECT prix_mad FROM products WHERE ref = $1',
      [validated.ref]
    );

    if (productResult.rows.length === 0) {
      throw new Error(`Product not found: ${validated.ref}`);
    }

    const prix_normal = productResult.rows[0].prix_mad;

    // Vérifier s'il y a une promotion active
    const promoResult = await this.pgClient.query(
      `SELECT id, prix_promo_mad, fin FROM promotions 
       WHERE ref = $1 AND debut <= CURRENT_DATE AND fin >= CURRENT_DATE
       LIMIT 1`,
      [validated.ref]
    );

    if (promoResult.rows.length > 0) {
      const promo = promoResult.rows[0];
      return {
        prix_normal,
        prix_promo: promo.prix_promo_mad,
        prix_effectif: promo.prix_promo_mad,
        promo_id: promo.id,
        valide_jusquau: promo.fin,
        source: 'db:promotions',
      };
    }

    return {
      prix_normal,
      prix_effectif: prix_normal,
      source: 'db:products',
    };
  }

  /**
   * Tool 5: get_shipping_cost
   * Récupère les frais et délais de livraison pour une ville
   */
  async getShippingCost(params: z.infer<typeof GetShippingCostSchema>) {
    const validated = GetShippingCostSchema.parse(params);

    const result = await this.pgClient.query(
      'SELECT frais_mad, delai_heures, paiement_a_la_livraison, retrait_boutique FROM shipping_rates WHERE ville = $1',
      [validated.ville]
    );

    if (result.rows.length === 0) {
      return {
        trouve: false,
        ville: validated.ville,
        source: 'db:shipping_rates',
      };
    }

    const row = result.rows[0];
    return {
      trouve: true,
      frais_mad: row.frais_mad,
      delai_heures: row.delai_heures,
      cod: row.paiement_a_la_livraison,
      retrait: row.retrait_boutique,
      source: 'db:shipping_rates',
    };
  }

  /**
   * Tool 6: apply_discount
   * Applique une remise (max 10%)
   */
  async applyDiscount(params: z.infer<typeof ApplyDiscountSchema>) {
    const validated = ApplyDiscountSchema.parse(params);

    const maxDiscount = 10;
    
    if (validated.pct > maxDiscount) {
      return {
        autorise: false,
        motif: `Remise maximale autorisée: ${maxDiscount}%`,
        demandee_pct: validated.pct,
        accordee_pct: 0,
        montant_original: validated.total,
        montant_final: validated.total,
        source: 'rule:business_logic',
      };
    }

    if (validated.pct < 0) {
      return {
        autorise: false,
        motif: 'Une remise négative est interdite',
        demandee_pct: validated.pct,
        accordee_pct: 0,
        montant_original: validated.total,
        montant_final: validated.total,
        source: 'rule:business_logic',
      };
    }

    const montant_reduction = Math.round((validated.total * validated.pct) / 100);
    const montant_final = validated.total - montant_reduction;

    return {
      autorise: true,
      demandee_pct: validated.pct,
      accordee_pct: validated.pct,
      montant_original: validated.total,
      montant_reduction,
      montant_final,
      source: 'rule:business_logic',
    };
  }

  /**
   * Tool 7: update_cart
   * Mise à jour du panier (add, remove, change_size, clear)
   */
  async updateCart(params: z.infer<typeof UpdateCartSchema>) {
    const validated = UpdateCartSchema.parse(params);
    const currentResult = await this.pgClient.query('SELECT cart FROM conversations WHERE id = $1 FOR UPDATE', [validated.conversationId]);
    const cart = (currentResult.rows[0]?.cart ?? []) as Array<{ ref: string; modele: string; taille: string; qte: number; prix_unitaire: number }>;
    if (validated.action === 'clear') {
      await this.pgClient.query('UPDATE conversations SET cart = $2, updated_at = NOW() WHERE id = $1', [validated.conversationId, JSON.stringify([])]);
      return { action: validated.action, conversationId: validated.conversationId, cart: [], success: true, source: 'db:conversations.cart' };
    }
    if (!validated.ref) throw new Error('ref is required for cart changes');
    const product = (await this.pgClient.query('SELECT ref, modele, taille, prix_mad, stock FROM products WHERE ref = $1 AND ($2::text IS NULL OR taille = $2)', [validated.ref, validated.taille ?? null])).rows[0];
    if (!product) throw new Error(`Product variant not found: ${validated.ref}`);
    const index = cart.findIndex((item) => item.ref === validated.ref);
    if (validated.action === 'remove') {
      if (index < 0) throw new Error(`Cart item not found: ${validated.ref}`);
      cart.splice(index, 1);
    } else if (validated.action === 'change_size') {
      if (product.stock < (validated.qte ?? cart[index]?.qte ?? 1)) throw new Error('Stock insufficient for requested size');
      if (index >= 0) cart[index] = { ...cart[index], taille: product.taille, prix_unitaire: product.prix_mad };
      else cart.push({ ref: product.ref, modele: product.modele, taille: product.taille, qte: validated.qte ?? 1, prix_unitaire: product.prix_mad });
    } else {
      const qte = validated.qte ?? 1;
      if (product.stock < qte) throw new Error('Stock insufficient');
      if (index >= 0) cart[index].qte += qte;
      else cart.push({ ref: product.ref, modele: product.modele, taille: product.taille, qte, prix_unitaire: product.prix_mad });
    }
    await this.pgClient.query('UPDATE conversations SET cart = $2, updated_at = NOW() WHERE id = $1', [validated.conversationId, JSON.stringify(cart)]);
    return { action: validated.action, conversationId: validated.conversationId, cart, success: true, source: 'db:conversations.cart' };
  }

  /**
   * Tool 8: create_order
   * Crée une commande (transactionnel)
   */
  async createOrder(params: z.infer<typeof CreateOrderSchema>) {
    const validated = CreateOrderSchema.parse(params);

    try {
      // Démarrer une transaction
      await this.pgClient.query('BEGIN');

      // Vérifier le stock pour tous les items
      for (const item of validated.items) {
        const result = await this.pgClient.query(
          'SELECT stock FROM products WHERE ref = $1 FOR UPDATE',
          [item.ref]
        );

        if (result.rows.length === 0 || result.rows[0].stock < item.quantite) {
          throw new Error(`Stock insufficient for ${item.ref}`);
        }

        // Décrémenter le stock
        await this.pgClient.query(
          'UPDATE products SET stock = stock - $1 WHERE ref = $2',
          [item.quantite, item.ref]
        );
      }

      // Créer la commande
      const commande_id = `CMD-${Date.now()}`;
      const total_articles_mad = validated.items.reduce(
        (sum, item) => sum + item.prix_unitaire * item.quantite,
        0
      );

      const shippingResult = await this.pgClient.query(
        'SELECT frais_mad FROM shipping_rates WHERE ville = $1',
        [validated.ville]
      );

      if (shippingResult.rows.length === 0) {
        throw new Error(`Unknown shipping city: ${validated.ville}`);
      }

      const frais_livraison_mad = shippingResult.rows[0].frais_mad;
      const total_mad = total_articles_mad + frais_livraison_mad;

      await this.pgClient.query(
        `INSERT INTO orders (commande_id, client_id, date, statut, total_articles_mad, frais_livraison_mad, total_mad, ville_livraison, paiement, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          commande_id,
          validated.clientId,
          new Date(),
          'en préparation',
          total_articles_mad,
          frais_livraison_mad,
          total_mad,
          validated.ville,
          validated.paiement,
          'agent',
        ]
      );

      // Créer les items de commande
      for (const item of validated.items) {
        await this.pgClient.query(
          `INSERT INTO order_items (commande_id, ref, modele, taille, quantite, prix_unitaire_mad)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            commande_id,
            item.ref,
            item.modele,
            item.taille,
            item.quantite,
            item.prix_unitaire,
          ]
        );
      }

      // Commit
      await this.pgClient.query('COMMIT');

      return {
        commande_id,
        total_mad,
        created_by: 'agent',
        source: 'db:orders',
      };
    } catch (error) {
      // Rollback
      await this.pgClient.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Tool 9: get_client_history
   * Récupère l'historique d'un client
   */
  async getClientHistory(params: z.infer<typeof GetClientHistorySchema>) {
    const validated = GetClientHistorySchema.parse(params);

    let query = 'SELECT client_id, nom, telephone, ville, nb_commandes FROM clients WHERE 1=1';
    const queryParams: any[] = [];

    if (validated.clientId) {
      queryParams.push(validated.clientId);
      query += ` AND client_id = $${queryParams.length}`;
    } else if (validated.telephone) {
      queryParams.push(validated.telephone);
      query += ` AND telephone = $${queryParams.length}`;
    } else {
      return { client: null, orders: [], source: 'db:clients' };
    }

    const clientResult = await this.pgClient.query(query, queryParams);

    if (clientResult.rows.length === 0) {
      return { client: null, orders: [], source: 'db:clients' };
    }

    const client = clientResult.rows[0];

    // Récupérer les commandes
    const ordersResult = await this.pgClient.query(
      'SELECT commande_id, date, total_mad, statut FROM orders WHERE client_id = $1 ORDER BY date DESC LIMIT 10',
      [client.client_id]
    );

    return {
      client,
      orders: ordersResult.rows,
      source: 'db:clients',
    };
  }

  /**
   * Tool 10: escalate
   * Crée une escalade pour intervention humaine
   */
  async escalate(params: z.infer<typeof EscalateSchema>) {
    const validated = EscalateSchema.parse(params);

    const result = await this.pgClient.query(
      `INSERT INTO escalations (conversation_id, motif, contexte_resume, payload, statut)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        validated.conversationId,
        validated.motif,
        validated.contexte.substring(0, 500),
        JSON.stringify(validated.payload),
        'NEEDS_HUMAN_REVIEW',
      ]
    );

    return {
      escalation_id: result.rows[0].id,
      motif: validated.motif,
      statut: 'NEEDS_HUMAN_REVIEW',
      source: 'db:escalations',
    };
  }
}

export default Tools;
