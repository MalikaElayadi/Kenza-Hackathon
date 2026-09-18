import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface Tour { role: string; texte: string }
interface Conversation { id: string; intention: string; langue: string; telephone?: string; client_id?: string; ville?: string; tours: Tour[] }
interface Reply { response?: string; language?: string; needsHuman?: boolean; error?: string }

const apiUrl = process.env.KENZA_API_URL ?? 'http://localhost:3001/api/messages';
const dataset = process.env.KENZA_DATA_DIR ?? join(process.cwd(), 'jeu-de-donnees-sujet-02-kenza', 'sujet-02-kenza');
const conversations = readFileSync(join(dataset, 'conversations.jsonl'), 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line) as Conversation);

function expectedEscalation(conversation: Conversation) {
  return ['negociation', 'hors_domaine', 'reclamation_arabe'].includes(conversation.intention);
}
function languageMatches(expected: string, actual?: string) {
  return expected === actual || (expected === 'ar' && actual === 'ar') || (expected === 'darija' && actual === 'darija');
}

let passed = 0;
let failed = 0;
for (const conversation of conversations) {
  const clientTurn = conversation.tours.find((tour) => tour.role === 'client');
  if (!clientTurn) { failed += 1; console.log(`FAIL ${conversation.id}: no client message`); continue; }
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        conversationId: `REPLAY-${conversation.id}`,
        text: clientTurn.texte,
        telephone: conversation.telephone,
        clientId: conversation.client_id,
        ville: conversation.ville,
      }),
    });
    const result = await response.json() as Reply;
    const checks = [
      Boolean(result.response) && !result.error,
      languageMatches(conversation.langue, result.language),
      !expectedEscalation(conversation) || result.needsHuman === true,
    ];
    if (checks.every(Boolean)) { passed += 1; console.log(`PASS ${conversation.id}`); }
    else { failed += 1; console.log(`FAIL ${conversation.id}: ${JSON.stringify({ expected: conversation.langue, actual: result.language, needsHuman: result.needsHuman })}`); }
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${conversation.id}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log(`RESULT PASS=${passed} FAIL=${failed} TOTAL=${conversations.length}`);
if (failed > 0) process.exitCode = 1;
