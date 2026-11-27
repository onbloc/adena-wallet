import type { OpenAIModel, ReasoningEffort } from './catalog';

type CallReasoning = ReasoningEffort | 'provider-default';

// Lowest to highest, the order the API ranks efforts in.
const ORDER: readonly ReasoningEffort[] = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];

/** The requested effort, or the nearest one the model accepts: lower first, then higher. */
function nearestEffort(efforts: readonly ReasoningEffort[], wanted: ReasoningEffort): ReasoningEffort {
  const at = ORDER.indexOf(wanted);
  const nearest = [wanted, ...ORDER.slice(0, at).reverse(), ...ORDER.slice(at + 1)].find(effort => efforts.includes(effort));
  // A reasoning model always lists at least one effort (catalog.test.ts).
  return nearest ?? wanted;
}

/**
 * What a model needs changed in a call. The API answers 400 to an effort or a sampling
 * parameter the model does not accept, so the portable settings are fitted to the model here.
 */
export function fitCallToModel(
  model: OpenAIModel,
  { reasoning, maxOutputTokens }: { reasoning?: CallReasoning; maxOutputTokens?: number }
): { reasoning: CallReasoning | undefined; sampling: boolean; forceReasoning: boolean } {
  if (maxOutputTokens !== undefined && maxOutputTokens > model.maxOutputTokens) {
    throw new RangeError(`maxOutputTokens ${maxOutputTokens} exceeds the ${model.maxOutputTokens} tokens ${model.id} can output.`);
  }
  // Only reasoning models take an effort; sending one to another model draws a warning every step.
  if (!model.reasoning.supported) return { reasoning: undefined, sampling: true, forceReasoning: false };

  // Unset or provider-default sends no effort: the model runs at its documented default.
  const effort = reasoning === undefined || reasoning === 'provider-default'
    ? reasoning : nearestEffort(model.reasoning.efforts, reasoning);
  const effective = effort === undefined || effort === 'provider-default' ? model.reasoning.default : effort;
  // Temperature and top-p are accepted only while the model does not reason.
  return { reasoning: effort, sampling: effective === 'none', forceReasoning: true };
}
