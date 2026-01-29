/**
 * Auto-migration for V2 Authentication System
 * Runs on server startup to ensure database schema is up-to-date
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { run, all, query } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function runAutoMigration() {
  console.log('\n🔍 Checking for V2 system tables...');
  
  try {
    // Check if V2 tables exist
    const tablesCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('companies', 'company_admins', 'company_employee_relations')
    `);
    
    if (tablesCheck && tablesCheck.length >= 3) {
      console.log('✅ V2 tables already exist, skipping migration.\n');
      return;
    }
    
    console.log('📦 V2 tables not found, running auto-migration...\n');
    
    // Read SQL file
    const sqlPath = join(__dirname, '../migrations/007_v2_auth_system_postgresql.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Executing ${statements.length} SQL statements...\n`);
    
    let successCount = 0;
    let skipCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        await run(statement);
        successCount++;
        console.log(`  [${i + 1}/${statements.length}] ✅`);
      } catch (error) {
        // Skip if already exists
        if (error.code === '42P07' || // relation already exists
            error.code === '42701' || // column already exists
            error.code === '42710' || // object already exists
            error.message?.includes('already exists') ||
            error.message?.includes('duplicate')) {
          skipCount++;
          console.log(`  [${i + 1}/${statements.length}] ⏭️  (already exists)`);
        } else {
          // Log error but continue
          console.error(`  [${i + 1}/${statements.length}] ⚠️  Error (continuing):`, error.message?.substring(0, 100));
          skipCount++;
        }
      }
    }
    
    console.log(`\n✅ Auto-migration complete!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Skipped: ${skipCount}`);
    console.log(`   Total: ${statements.length}\n`);
    
    // Verify tables were created
    const finalCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('companies', 'company_admins', 'company_employee_relations')
      ORDER BY table_name
    `);
    
    if (finalCheck && finalCheck.length > 0) {
      console.log('📊 V2 System Tables:');
      finalCheck.forEach(row => {
        console.log(`   ✅ ${row.table_name}`);
      });
      console.log();
    }
    
  } catch (error) {
    console.error('\n❌ Auto-migration failed:', error.message);
    console.error('⚠️  Server will continue but V2 features may not work.\n');
  }
}
