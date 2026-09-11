<script setup lang="ts">
/**
 * Import d'un fichier de frise (B3).
 *
 * On analyse avant d'appliquer, et on montre ce qui a été compris — y compris les
 * lignes qui ne l'ont pas été. Rien n'est écrasé tant que le patient n'a pas confirmé.
 */
import type { ImportMode } from "~/composables/useLifeHistory";
import type { LifeDocument } from "~/utils/life-document";

const open = defineModel<boolean>("open", { required: true });

const props = defineProps<{ hasExistingEvents: boolean }>();

const emit = defineEmits<{ confirm: [text: string, mode: ImportMode] }>();

const file = ref<File | null>(null);
const text = ref("");
const preview = ref<LifeDocument | null>(null);
const readError = ref<string | null>(null);
const mode = ref<ImportMode>("merge");

watch(open, (isOpen) => {
  if (isOpen) return;
  file.value = null;
  text.value = "";
  preview.value = null;
  readError.value = null;
  mode.value = props.hasExistingEvents ? "merge" : "replace";
});

watch(file, async (selected) => {
  readError.value = null;
  preview.value = null;
  if (!selected) return;
  try {
    text.value = await selected.text();
    preview.value = parseDocument(text.value);
  } catch {
    readError.value = "Ce fichier n'a pas pu être lu.";
  }
});

const modeItems = [
  {
    value: "merge" as const,
    label: "Fusionner",
    description: "Ajoute les évènements absents et conserve les vôtres.",
  },
  {
    value: "replace" as const,
    label: "Remplacer",
    description: "Votre frise actuelle est remplacée par le fichier.",
  },
];
</script>

<template>
  <UModal
    v-model:open="open"
    title="Importer une frise"
    description="Choisissez un fichier .txt exporté depuis cette application."
  >
    <template #body>
      <div class="space-y-4">
        <UFileUpload
          v-model="file"
          accept=".txt,text/plain"
          icon="i-lucide-file-text"
          label="Déposez votre fichier ici"
          description="ou cliquez pour le choisir — format .txt"
          class="min-h-40 w-full"
        />

        <UAlert
          v-if="readError"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :description="readError"
        />

        <template v-if="preview">
          <div class="border-default space-y-1 rounded-md border p-3 text-sm">
            <p class="text-highlighted font-medium">
              {{ preview.events.length }} évènement{{
                preview.events.length > 1 ? "s" : ""
              }}
              compris
            </p>
            <p v-if="preview.issues.length" class="text-warning">
              {{ preview.issues.length }} ligne{{
                preview.issues.length > 1 ? "s n’ont" : " n’a"
              }}
              pas été comprise{{ preview.issues.length > 1 ? "s" : "" }} —
              elle{{
                preview.issues.length > 1
                  ? "s seront conservées"
                  : " sera conservée"
              }}
              telle{{ preview.issues.length > 1 ? "s" : "" }} quelle{{
                preview.issues.length > 1 ? "s" : ""
              }}.
            </p>
            <p v-else-if="preview.events.length === 0" class="text-muted">
              Ce fichier ne contient aucun évènement.
            </p>
          </div>

          <URadioGroup
            v-if="hasExistingEvents"
            v-model="mode"
            :items="modeItems"
            variant="card"
            legend="Votre frise contient déjà des évènements"
          />
        </template>
      </div>
    </template>

    <template #footer="{ close }">
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          label="Annuler"
          @click="close"
        />
        <UButton
          :disabled="!preview || preview.events.length === 0"
          icon="i-lucide-upload"
          label="Importer"
          @click="emit('confirm', text, mode)"
        />
      </div>
    </template>
  </UModal>
</template>
