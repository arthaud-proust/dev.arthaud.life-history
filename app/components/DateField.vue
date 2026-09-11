<script setup lang="ts">
/**
 * Champ de date (A1).
 *
 * La saisie de référence reste le **texte libre** : c'est le seul moyen d'écrire les
 * trois précisions que le modèle accepte — « 1998 » quand on ne se souvient que de
 * l'année, « juin 2023 », « 12 juin 2022 ». Le calendrier, posé au-dessus et toujours
 * ouvert, écrit dans le champ ce que le patient aurait tapé ; il travaille au mois, et
 * ne remplace donc pas la saisie texte. La relecture sous le champ montre au fil de la
 * frappe ce qui sera enregistré, pour qu'on n'ait jamais à valider pour savoir.
 */
import { CalendarDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";

const model = defineModel<string>({ required: true });

const props = withDefaults(
  defineProps<{
    label: string;
    hint?: string;
    placeholder?: string;
    /** Accepte « aujourd'hui » pour une période toujours en cours. */
    allowToday?: boolean;
    autofocus?: boolean;
  }>(),
  {
    hint: undefined,
    placeholder: undefined,
    allowToday: false,
    autofocus: false,
  },
);

const emit = defineEmits<{
  /** Un mois vient d'être choisi au calendrier : la saisie peut passer à la suite. */
  picked: [];
}>();

const input = useTemplateRef("input");

const parsed = computed(() => {
  const text = model.value.trim();
  if (!text) return null;
  return props.allowToday ? parseDateBoundary(text) : parsePartialDate(text);
});

const isFilled = computed(() => model.value.trim() !== "");
const isValid = computed(() => parsed.value !== null);

/** Relecture : ce que l'application a compris, écrit sous sa forme canonique. */
const echo = computed(() =>
  parsed.value ? formatPartialDate(parsed.value) : null,
);
const showEcho = computed(
  () => echo.value !== null && echo.value !== model.value.trim(),
);

/** Le calendrier ne se cale que sur une date déjà précise au mois. */
const pickerValue = computed(() => {
  const date = parsed.value;
  if (!date || date === TODAY || date.month === undefined) return undefined;
  return new CalendarDate(date.year, date.month, 1);
});

/** Le mois choisi est écrit dans le champ, exactement comme le patient l'aurait tapé. */
function pick(value: DateValue | undefined) {
  if (!value) return;
  model.value = formatPartialDate({ year: value.year, month: value.month });
  emit("picked");
}

defineExpose({
  focus: () => input.value?.inputRef?.focus(),
});
</script>

<template>
  <UFormField :label="label" :hint="hint" :error="isFilled && !isValid">
    <div class="space-y-2">
      <UCalendar
        type="month"
        locale="fr-FR"
        :calendar-label="`Choisir un mois pour le champ ${label}`"
        :model-value="pickerValue"
        size="xs"
        class="border-default rounded-md border p-2"
        @update:model-value="(value) => pick(value as DateValue | undefined)"
      />

      <UInput
        ref="input"
        v-model="model"
        :placeholder="placeholder"
        :autofocus="autofocus"
        autocomplete="off"
        spellcheck="false"
        class="w-full"
      />
    </div>

    <template #help>
      <span v-if="showEcho" class="text-primary">{{ echo }}</span>
      <span v-else-if="isFilled && !isValid">
        Écrivez par exemple <em>1998</em>, <em>juin 2023</em> ou
        <em>12 juin 2022</em
        ><template v-if="allowToday"> — ou <em>aujourd'hui</em></template
        >.
      </span>
    </template>
  </UFormField>
</template>
