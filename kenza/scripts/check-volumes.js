import { Pool } from 'pg';
async function checkVolumes() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });
    try {
        console.log('=== Data Volume Validation ===\n');
        const expectedCounts = {
            products: 80,
            clients: 120,
            shipping_rates: 12,
            promotions: 12,
            orders: 320,
            order_items: 449,
        };
        let allValid = true;
        for (const [table, expected] of Object.entries(expectedCounts)) {
            const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
            const actual = parseInt(result.rows[0].count);
            const status = actual === expected ? '✅' : '❌';
            console.log(`${status} ${table}: ${actual}/${expected}`);
            if (actual !== expected)
                allValid = false;
        }
        console.log();
        if (allValid) {
            console.log('✅ All volumes match! Database is ready.');
            process.exit(0);
        }
        else {
            console.log('❌ FAIL: Volume mismatch detected!');
            process.exit(1);
        }
    }
    catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
    finally {
        await pool.end();
    }
}
checkVolumes();
//# sourceMappingURL=check-volumes.js.map