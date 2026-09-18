import { z } from 'zod';

const IntentSchema = z.object({
  intention: z.enum([
    'prix_et_disponibilite', 'rupture_de_stock', 'darija_prix', 'conseil_taille',
    'negociation', 'question_arabe', 'client_qui_revient', 'changement_avis',
    'note_vocale', 'photo_produit', 'suivi_commande', 'retour_produit',
    'hors_domaine', 'livraison_arabe', 'rupture_arabe', 'reclamation_arabe',
    'panier_abandonne', 'inconnu',
  ]),
  langue: z.enum(['fr', 'ar', 'darija']),
  confiance: z.number().min(0).max(100),
});

export type LlmIntent = z.infer<typeof IntentSchema>;

function configured(value: string | undefined) {
  return Boolean(value && !value.startsWith('REPLACE_WITH_'));
}

async function request(url: string, apiKey: string, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}`, ...headers },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`LLM request failed: ${response.status}`);
  return response.json() as Promise<{ choices?: Array<{ message?: { content?: string } }> }>;
}

function parseJson(content: string | undefined) {
  if (!content) throw new Error('LLM returned empty content');
  const json = content.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error('LLM returned non-JSON content');
  return JSON.parse(json) as unknown;
}

export async function classifyWithGpt41(text: string): Promise<LlmIntent | null> {
  const key = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME ?? 'gpt-4.1';
  const version = process.env.AZURE_OPENAI_API_VERSION ?? '2024-12-01-preview';
  if (!configured(key) || !configured(endpoint)) return null;
  const azureKey = key;
  const azureEndpoint = endpoint;
  const result = await request(`${azureEndpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=${version}`, azureKey, {
    messages: [
      { role: 'system', content: 'Classifie le message commercial marocain. Réponds uniquement en JSON avec intention, langue et confiance. Ne donne aucun prix, stock ou délai.' },
      { role: 'user', content: text },
    ],
    temperature: 0,
    max_tokens: 120,
    response_format: { type: 'json_object' },
  }, { 'api-key': azureKey });
  return IntentSchema.parse(parseJson(result.choices?.[0]?.message?.content));
}

export async function planWithGpt55(context: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const key = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_URL;
  if (!configured(key) || !configured(baseUrl)) return null;
  const result = await request(`${baseUrl!.replace(/\/$/, '')}/chat/completions`, key!, {
    model: process.env.LLM_MODEL ?? 'gpt-5.5',
    messages: [
      { role: 'system', content: 'Tu planifies un workflow commercial. Retourne uniquement un JSON décisionnel. Les données métier sont absentes volontairement : ne crée aucun nombre, prix, stock ou délai.' },
      { role: 'user', content: JSON.stringify(context) },
    ],
    temperature: 0,
    max_tokens: 300,
    response_format: { type: 'json_object' },
  });
  return z.record(z.unknown()).parse(parseJson(result.choices?.[0]?.message?.content));
}
