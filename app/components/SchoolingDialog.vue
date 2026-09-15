<script setup lang="ts">
/**
 * Les années d'école, posées d'un coup (A1).
 *
 * Une scolarité, c'est une quinzaine de périodes que le patient connaît déjà sans les
 * avoir en tête : il sait quand il est né, pas en quelle année il est entré au collège.
 * On lui demande donc la seule chose qu'il sait par cœur, et on calcule le reste.
 *
 * Tout est modifiable ensuite : ce qui est posé est une frise ordinaire. Et rien n'est
 * inséré à l'aveugle — l'aperçu montre les périodes avant qu'elles n'existent.
 */
import type { StageChoice } from "~/utils/schooling";

const open = defineModel<boolean>("open", { required: true });

const props = defineProps<{
  /** La frise telle qu'elle est : on y relit le parcours déjà posé. */
  events: LifeEvent[];
}>();

const emit = defineEmits<{ confirm: [events: Omit<LifeEvent, "id">[]] }>();

const birth = ref("");
const choices = ref<Record<string, StageChoice>>(defaultChoices());

/** Ce qu'un remplacement effacerait : la naissance et les périodes déjà posées. */
const existing = computed(
  () =>
    props.events.filter((event) =>
      [SCHOOLING_CATEGORY, BIRTH_CATEGORY].includes(event.category ?? ""),
    ).length,
);

/**
 * À chaque ouverture, la modale repart de la frise : la date de naissance déjà
 * inscrite, les étapes posées et leurs durées. Sans cela, « Remplacer »
 * effacerait un parcours corrigé au profit des réglages par défaut.
 */
watch(open, (isOpen) => {
  if (!isOpen) return;
  const posed = readSchooling(props.events);
  birth.value = posed.birth ? formatPartialDate(posed.birth) : "";
  choices.value = posed.choices;
});

const parsedBirth = computed(() =>
  birth.value.trim() ? parsePartialDate(birth.value) : null,
);

/** Les périodes telles qu'elles seront écrites, ou rien tant que la date manque. */
const preview = computed(() =>
  parsedBirth.value
    ? buildSchooling({ birth: parsedBirth.value, choices: choices.value })
    : [],
);

function setYears(key: string, years: number) {
  const choice = choices.value[key];
  if (choice) choice.years = Math.max(0, years);
}

function confirm() {
  if (!preview.value.length) return;
  emit("confirm", preview.value);
  open.value = false;
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Gérer les périodes scolaires"
    description="Indiquez votre date de naissance, les périodes scolaires se rempliront automatiquement. Tout est ajustable par la suite."
    :ui="{ content: 'max-w-3xl' }"
  >
    <template #body>
      <div class="space-y-5">
        <DateField
          v-model="birth"
          label="Date de naissance"
          placeholder="12 juin 2000"
        />

        <!--
          Un `UFormField` désigne **un** contrôle : il donne son identifiant à tout ce
          qu'il contient, et les sept cases se retrouvaient à partager le même — cliquer
          n'importe quel libellé cochait la première. Un groupe de cases, c'est un
          `fieldset`, et chaque case garde alors son identifiant.
        -->
        <fieldset>
          <legend class="text-default text-sm font-medium">
            Votre parcours
          </legend>
          <p class="text-muted mt-1 text-xs">
            En France, la classe se fait par année de naissance : seule l’année
            compte pour les rentrées. Une étape qui a duré plus longtemps décale
            celles qui suivent.
          </p>

          <ul class="divide-default mt-2 divide-y">
            <li
              v-for="stage in SCHOOL_STAGES"
              :key="stage.key"
              class="flex flex-wrap items-center justify-between gap-3 py-2"
            >
              <UCheckbox
                v-model="choices[stage.key]!.enabled"
                :label="stage.label"
              />

              <!--
                Une étape se règle en années, et rien de plus : une année de plus peut
                être un redoublement, une année sabbatique, une réorientation, une
                maladie. L'application n'a pas à en décider, ni à la nommer.
              -->
              <UFieldGroup v-if="choices[stage.key]!.enabled" size="xs">
                <UButton
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-minus"
                  :disabled="choices[stage.key]!.years <= 0"
                  :aria-label="`Une année de moins en ${stage.label}`"
                  @click="setYears(stage.key, choices[stage.key]!.years - 1)"
                />
                <UButton color="neutral" variant="outline" class="tabular-nums">
                  {{ choices[stage.key]!.years }}
                  {{ choices[stage.key]!.years > 1 ? "ans" : "an" }}
                </UButton>
                <UButton
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-plus"
                  :aria-label="`Une année de plus en ${stage.label}`"
                  @click="setYears(stage.key, choices[stage.key]!.years + 1)"
                />
              </UFieldGroup>
            </li>
          </ul>
        </fieldset>

        <section v-if="preview.length">
          <h3 class="text-default mb-2 text-sm font-medium">
            Ce qui sera posé
          </h3>
          <ul class="border-default divide-default divide-y rounded-md border">
            <li
              v-for="(event, index) in preview"
              :key="index"
              class="flex flex-wrap items-baseline justify-between gap-x-3 px-3 py-1.5 text-sm"
            >
              <span class="text-highlighted">{{ titleOf(event) }}</span>
              <span class="text-muted tabular-nums">{{
                formatDateField(event)
              }}</span>
            </li>
          </ul>
        </section>

        <UAlert
          v-if="existing > 0"
          color="warning"
          variant="subtle"
          icon="i-lucide-refresh-cw"
          :description="`Vos ${existing} périodes d’école déjà posées seront remplacées. Le reste de votre frise n’y touche pas.`"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          label="Annuler"
          @click="open = false"
        />
        <UButton
          :disabled="!preview.length"
          icon="i-lucide-graduation-cap"
          :label="existing > 0 ? 'Remplacer' : 'Ajouter à ma frise'"
          @click="confirm"
        />
      </div>
    </template>
  </UModal>
</template>
