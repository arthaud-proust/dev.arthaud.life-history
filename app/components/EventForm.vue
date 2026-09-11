<script setup lang="ts">
/**
 * Le formulaire d'ajout (A1) — le geste central du produit.
 *
 * Visible en permanence, trois champs affichés d'emblée, `Entrée` valide et rend la
 * main pour le suivant : une séance de saisie, c'est trente évènements d'affilée.
 *
 * Disposition : les dates à gauche, chacune sous son calendrier ; à droite ce qui
 * décrit l'évènement, sa couleur et la validation. L'alerte de chronologie porte sur
 * les deux dates à la fois, elle traverse donc les deux colonnes.
 *
 * La mise en page suit des **requêtes de conteneur** et non de fenêtre : ce formulaire
 * est rendu aussi bien en pleine largeur qu'au fond d'une modale d'édition, et un
 * `lg:` regarderait la fenêtre — il couperait la colonne de droite dans la modale.
 */
import type { LifeEvent } from "~/utils/life-document";

const props = defineProps<{
  /** Fourni en édition ; absent en ajout. */
  event?: LifeEvent;
  submitLabel?: string;
  edition?: boolean;
}>();

const emit = defineEmits<{
  submit: [fields: Omit<LifeEvent, "id">];
  cancel: [];
  delete: [];
}>();

const start = ref("");
const end = ref("");
/** Un évènement dure — c'est l'exception, et la date de fin ne s'affiche qu'alors. */
const isPeriod = ref(false);
const description = ref("");
const DEFAULT_COLOR = "amber";
const color = ref<string>(DEFAULT_COLOR);
const endField = useTemplateRef<{ focus: () => void }>("endField");
const descriptionField = useTemplateRef<{ textareaRef?: HTMLTextAreaElement }>(
  "descriptionField",
);

watchEffect(() => {
  const event = props.event;
  start.value = event ? formatPartialDate(event.start) : "";
  end.value = event?.end ? formatPartialDate(event.end) : "";
  isPeriod.value = Boolean(event?.end);
  description.value = event?.description ?? "";
  color.value = event?.color ?? DEFAULT_COLOR;
});

// Décocher, c'est renoncer à la date de fin : la garder en mémoire la ferait
// réapparaître à la prochaine coche, sans que personne l'ait demandée.
watch(isPeriod, (periode) => {
  if (!periode) end.value = "";
});

function focusDescription() {
  nextTick(() => descriptionField.value?.textareaRef?.focus());
}

/**
 * Après un mois choisi au calendrier, la saisie passe d'elle-même à la suite : la date
 * de fin s'il en faut une, la description sinon.
 */
function afterStartPicked() {
  if (isPeriod.value && !end.value.trim()) {
    nextTick(() => endField.value?.focus());
    return;
  }
  focusDescription();
}

const parsedStart = computed(() =>
  start.value.trim() ? parsePartialDate(start.value) : null,
);
const parsedEnd = computed(() =>
  end.value.trim() ? parseDateBoundary(end.value) : null,
);
const cleanedDescription = computed(() =>
  normalizeDescription(description.value),
);
const lineCount = computed(() =>
  Math.max(1, cleanedDescription.value.split("\n").length),
);

/** Le seul contrôle qui ne tient pas dans un champ isolé : l'ordre des deux dates. */
const chronologyError = computed(() => {
  if (!parsedStart.value || !parsedEnd.value) return null;
  return toEndDate(parsedEnd.value).getTime() <
    toStartDate(parsedStart.value).getTime()
    ? "La date de fin est antérieure à la date de début."
    : null;
});

const canSubmit = computed(() =>
  Boolean(
    parsedStart.value &&
    cleanedDescription.value &&
    !chronologyError.value &&
    (isPeriod.value ? parsedEnd.value : true),
  ),
);

function submit() {
  if (!canSubmit.value || !parsedStart.value) return;
  const started = parsedStart.value;
  emit("submit", {
    start: started,
    end: (isPeriod.value ? parsedEnd.value : null) ?? undefined,
    description: cleanedDescription.value,
    color: color.value,
  });
  if (props.event) return;
  // La date avance d'elle-même : on raconte une vie dans l'ordre, un mois après
  // l'autre. Elle reste modifiable, mais n'est presque jamais à retaper.
  start.value = formatPartialDate(nextPeriod(started));
  end.value = "";
  isPeriod.value = false;
  description.value = "";
  // La couleur, elle, reste : on décrit souvent plusieurs évènements d'une même
  // teinte à la suite, et la redemander à chaque fois serait un clic de trop.
  focusDescription();
}
</script>

<template>
  <div class="@container">
    <form
      class="grid gap-4 @4xl:grid-cols-[auto_minmax(0,1fr)] @4xl:items-start"
      @submit.prevent="submit"
    >
      <div class="flex gap-3 @max-xl:flex-col">
        <div class="space-y-3">
          <DateField
            v-model="start"
            label="Date"
            placeholder="juin 2023"
            :autofocus="!event"
            @picked="afterStartPicked"
          />
          <UCheckbox v-model="isPeriod" label="Cet évènement est une période" />
        </div>
        <DateField
          v-if="isPeriod"
          ref="endField"
          v-model="end"
          label="Date de fin"
          placeholder="juillet 2024"
          allow-today
          @picked="focusDescription"
        />
      </div>

      <div class="space-y-3">
        <UFormField
          label="Description"
          :hint="`${lineCount} ligne${lineCount > 1 ? 's' : ''}`"
        >
          <UTextarea
            ref="descriptionField"
            v-model="description"
            :rows="3"
            autoresize
            placeholder="Ex: Changement de travail"
            class="w-full"
            @keydown.enter.meta="submit"
            @keydown.enter.ctrl="submit"
          />
          <template #help>
            <span class="whitespace-nowrap"
              ><UKbd value="meta" /> <UKbd value="enter" /> pour valider</span
            >
          </template>
        </UFormField>

        <UFormField label="Couleur">
          <ColorPalettePicker v-model="color" />
        </UFormField>

        <div class="flex gap-2">
          <UButton
            type="submit"
            :disabled="!canSubmit"
            :icon="edition ? 'i-lucide-save' : 'i-lucide-plus'"
            :label="edition ? 'Enregister' : 'Ajouter'"
          />
          <UButton
            v-if="event"
            color="neutral"
            variant="ghost"
            label="Annuler"
            @click="emit('cancel')"
          />

          <UButton
            v-if="edition"
            class="ml-auto"
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            label="Supprimer cet évènement"
            @click="emit('delete')"
          />
        </div>
      </div>

      <UAlert
        v-if="chronologyError"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :description="chronologyError"
        class="@4xl:col-span-2"
      />
    </form>
  </div>
</template>
