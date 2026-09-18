import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import Tools from './index';

describe('Kenza Tools - Unit Tests', () => {
  let pgClient: Client;
  let tools: Tools;

  beforeAll(async () => {
    pgClient = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await pgClient.connect();
    tools = new Tools(pgClient);
  });

  afterAll(async () => {
    await pgClient.end();
  });

  describe('Tool 1: searchCatalog', () => {
    it('should search products by famille', async () => {
      const result = await tools.searchCatalog({ famille: 'Foulard', en_stock_seulement: false });
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
    });

    it('should search products in stock', async () => {
      const result = await tools.searchCatalog({ en_stock_seulement: true });
      expect(result.results.every((r: any) => r.stock > 0)).toBe(true);
    });

    it('should return results with correct fields', async () => {
      const result = await tools.searchCatalog({ famille: 'Robe', en_stock_seulement: false });
      if (result.results.length > 0) {
        const item = result.results[0];
        expect(item).toHaveProperty('ref');
        expect(item).toHaveProperty('modele');
        expect(item).toHaveProperty('prix_mad');
        expect(item).toHaveProperty('stock');
      }
    });
  });

  describe('Tool 2: checkStock', () => {
    it('should find product in stock', async () => {
      // REF-0001 has stock > 0
      const result = await tools.checkStock({ ref: 'REF-0001' });
      expect(result.disponible).toBe(true);
      expect(result.stock).toBeGreaterThan(0);
    });

    it('should detect out of stock products', async () => {
      // REF-0015 has stock = 0
      const result = await tools.checkStock({ ref: 'REF-0015' });
      expect(result.disponible).toBe(false);
      expect(result.stock).toBe(0);
    });

    it('should handle non-existent products', async () => {
      const result = await tools.checkStock({ ref: 'REF-NONEXISTENT' });
      expect(result.disponible).toBe(false);
    });
  });

  describe('Tool 3: suggestAlternatives', () => {
    it('should suggest alternatives for out of stock product', async () => {
      // REF-0019 is out of stock, has famille 'Caftan'
      const result = await tools.suggestAlternatives({ ref: 'REF-0019' });
      expect(result.alternatives).toBeDefined();
      expect(Array.isArray(result.alternatives)).toBe(true);
      // All alternatives should be in stock
      result.alternatives.forEach((alt: any) => {
        expect(alt.stock).toBeGreaterThan(0);
      });
    });
  });

  describe('Tool 4: getPrice', () => {
    it('should return normal price for non-promo product', async () => {
      // REF-0001 has no promotion
      const result = await tools.getPrice({ ref: 'REF-0001' });
      expect(result.prix_effectif).toBe(result.prix_normal);
      expect(result.prix_effectif).toBe(100); // From fixture
    });

    it('should return promo price for promoted product', async () => {
      // REF-0026 is in promotion (550 -> 440)
      const result = await tools.getPrice({ ref: 'REF-0026' });
      expect(result.prix_promo).toBeDefined();
      expect(result.prix_effectif).toBe(440); // Promo price
      expect(result.promo_id).toBeDefined();
    });

    it('should throw error for non-existent product', async () => {
      await expect(
        tools.getPrice({ ref: 'REF-NONEXISTENT' })
      ).rejects.toThrow('Product not found');
    });
  });

  describe('Tool 5: getShippingCost', () => {
    it('should return shipping info for authorized city', async () => {
      const result = await tools.getShippingCost({ ville: 'Casablanca' });
      expect(result.trouve).toBe(true);
      expect(result.frais_mad).toBe(25);
      expect(result.delai_heures).toBe(72);
    });

    it('should reject unauthorized city', async () => {
      const result = await tools.getShippingCost({ ville: 'Essaouira' });
      expect(result.trouve).toBe(false);
    });

    it('should return COD info', async () => {
      const result = await tools.getShippingCost({ ville: 'Fès' });
      expect(result.trouve).toBe(true);
      expect(result.cod).toBeDefined();
      expect(result.retrait).toBe(true); // Fès has retrait
    });
  });

  describe('Tool 6: applyDiscount', () => {
    it('should apply discount <= 10%', async () => {
      const result = await tools.applyDiscount({ total: 1000, pct: 10 });
      expect(result.autorise).toBe(true);
      expect(result.accordee_pct).toBe(10);
      expect(result.montant_final).toBe(900);
    });

    it('should reject discount > 10%', async () => {
      const result = await tools.applyDiscount({ total: 1000, pct: 30 });
      expect(result.autorise).toBe(false);
      expect(result.accordee_pct).toBe(0);
      expect(result.montant_final).toBe(1000);
    });

    it('should handle 0% discount', async () => {
      const result = await tools.applyDiscount({ total: 1000, pct: 0 });
      expect(result.autorise).toBe(true);
      expect(result.montant_final).toBe(1000);
    });
  });

  describe('Tool 7: updateCart', () => {
    it('should handle add action', async () => {
      const result = await tools.updateCart({
        conversationId: 'CONV-TEST-001',
        action: 'add',
        ref: 'REF-0001',
        taille: 'M',
        qte: 1,
      });
      expect(result.success).toBe(true);
      expect(result.action).toBe('add');
    });

    it('should handle clear action', async () => {
      const result = await tools.updateCart({
        conversationId: 'CONV-TEST-001',
        action: 'clear',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Tool 8: createOrder', () => {
    it('should create order with sufficient stock', async () => {
      // REF-0001 has stock = 2
      const result = await tools.createOrder({
        conversationId: 'CONV-TEST-001',
        clientId: 'CLI-0001',
        items: [
          {
            ref: 'REF-0001',
            modele: 'Foulard bordeaux',
            taille: 'unique',
            quantite: 1,
            prix_unitaire: 100,
          },
        ],
        ville: 'Casablanca',
        paiement: 'à la livraison',
      });

      expect(result.commande_id).toBeDefined();
      expect(result.total_mad).toBe(125); // 100 + 25 shipping
      expect(result.created_by).toBe('agent');
    });

    it('should fail with insufficient stock', async () => {
      // REF-0015 has stock = 0
      await expect(
        tools.createOrder({
          conversationId: 'CONV-TEST-002',
          clientId: 'CLI-0002',
          items: [
            {
              ref: 'REF-0015',
              modele: 'Sac à main blanc cassé',
              taille: 'unique',
              quantite: 1,
              prix_unitaire: 820,
            },
          ],
          ville: 'Rabat',
          paiement: 'virement',
        })
      ).rejects.toThrow('Stock insufficient');
    });

    it('should reject unknown shipping city', async () => {
      await expect(
        tools.createOrder({
          conversationId: 'CONV-TEST-003',
          clientId: 'CLI-0001',
          items: [
            {
              ref: 'REF-0001',
              modele: 'Foulard bordeaux',
              taille: 'unique',
              quantite: 1,
              prix_unitaire: 100,
            },
          ],
          ville: 'Essaouira',
          paiement: 'à la livraison',
        })
      ).rejects.toThrow();
    });
  });

  describe('Tool 9: getClientHistory', () => {
    it('should find client by client_id', async () => {
      const result = await tools.getClientHistory({ clientId: 'CLI-0001' });
      expect(result.client).toBeDefined();
      expect(result.client.client_id).toBe('CLI-0001');
    });

    it('should find client by telephone', async () => {
      const result = await tools.getClientHistory({
        telephone: '+212697691176',
      });
      expect(result.client).toBeDefined();
      expect(result.client.telephone).toBe('+212697691176');
    });

    it('should return empty for non-existent client', async () => {
      const result = await tools.getClientHistory({ clientId: 'CLI-FAKE' });
      expect(result.client).toBeNull();
      expect(result.orders).toEqual([]);
    });

    it('should return client orders', async () => {
      const result = await tools.getClientHistory({ clientId: 'CLI-0001' });
      expect(result.orders).toBeDefined();
      expect(Array.isArray(result.orders)).toBe(true);
    });
  });

  describe('Tool 10: escalate', () => {
    it('should create escalation', async () => {
      const result = await tools.escalate({
        conversationId: 'CONV-TEST-ESC',
        motif: 'remise_excessive',
        contexte: 'Client demande 50% de remise',
        payload: {
          demande_pct: 50,
          client_id: 'CLI-0001',
        },
      });

      expect(result.escalation_id).toBeDefined();
      expect(result.statut).toBe('NEEDS_HUMAN_REVIEW');
    });
  });

  describe('Business Logic: Promotion + Stock', () => {
    it('should distinguish promotion from availability (REF-0021)', async () => {
      // REF-0021 is in promotion BUT S/M are out of stock, L is in stock
      const priceResult = await tools.getPrice({ ref: 'REF-0021' });
      expect(priceResult.prix_promo).toBe(1260); // Promo active

      // Check specific sizes
      const checkS = await tools.checkStock({ ref: 'REF-0021', taille: 'S' });
      const checkL = await tools.checkStock({ ref: 'REF-0021', taille: 'L' });

      expect(checkS.disponible).toBe(false); // Out of stock
      expect(checkL.disponible).toBe(true); // In stock
    });
  });
});
