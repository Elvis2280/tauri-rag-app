import { CONFIGURATION_LABELS } from "@/constants/configuration";

export default function LlmModelsConfiguration() {
  return (
    <section
      aria-labelledby="llm-models-configuration-title"
      className="space-y-3 rounded border border-border bg-card p-4"
    >
      <h2 id="llm-models-configuration-title" className="font-heading text-base font-semibold">
        {CONFIGURATION_LABELS.llmModelsCategory}
      </h2>
    </section>
  );
}
