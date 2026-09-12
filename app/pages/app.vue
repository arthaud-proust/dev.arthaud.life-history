<script setup lang="ts">
/**
 * La frise et sa saisie.
 *
 * Au premier lancement, avant qu'on y écrive quoi que ce soit, la page dit où vont les
 * données : c'est l'exigence B1, et elle vient en tête parce qu'elle conditionne la
 * confiance de tout ce qui suit.
 */
import type { LifeEvent } from "~/utils/life-document";

const history = useLifeHistory();
const { events, issues, isEmpty, loaded } = history;
const toast = useToast();

const timeline = useTemplateRef("timeline");
/**
 * Revenir à la ligne, ou dérouler la frise d'un seul trait. Une vie entière lue sans
 * rupture n'est pas la même chose qu'une vie rangée par lignes : c'est au patient de
 * choisir, et le réglage ne vaut que pour l'écran — le papier revient toujours.
 *
 * Le choix reste d'une visite à l'autre : c'est une habitude de lecture, pas une
 * décision à reprendre à chaque ouverture. Il vit à côté de la frise dans le
 * `localStorage`, et ne part donc pas davantage sur le réseau qu'elle (B1).
 */
const wrap = useLocalStorage("life-history:wrap", true);
const editing = ref<LifeEvent | null>(null);
const editForm = useTemplateRef<{ submit: () => void }>("editForm");

/**
 * ⌘↵ enregistre depuis n'importe où dans la modale d'édition.
 *
 * Le formulaire écoute déjà ses propres champs, mais la modale s'ouvre avec le focus
 * sur son bouton de fermeture, et son cadre n'appartient pas au formulaire : on écoute
 * donc le document, le temps que la modale soit ouverte. Le raccourci lancé depuis un
 * champ ne remonte pas jusqu'ici — le formulaire arrête l'évènement.
 */
useEventListener(document, "keydown", (event: KeyboardEvent) => {
  if (!editing.value) return;
  if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) return;
  event.preventDefault();
  editForm.value?.submit();
});

function add(fields: Omit<LifeEvent, "id">) {
  const event = history.addEvent(fields);
  // La frise est une suite de cartes : celle qu'on vient d'écrire peut atterrir
  // n'importe où dans l'ordre chronologique, on l'amène donc sous les yeux.
  nextTick(() => timeline.value?.focusEvent(event.id));
}

function saveEdit(fields: Omit<LifeEvent, "id">) {
  if (!editing.value) return;
  history.updateEvent(editing.value.id, fields);
  editing.value = null;
}

function remove(event: LifeEvent) {
  history.removeEvent(event.id);
  toast.add({
    title: `« ${titleOf(event)} » supprimé`,
    color: "neutral",
    icon: "i-lucide-trash-2",
    duration: 8000,
    actions: [
      {
        label: "Annuler",
        color: "neutral",
        variant: "outline",
        onClick: () => history.undoRemove(),
      },
    ],
  });
}
</script>

<template>
  <div class="space-y-6 py-6 print:hidden">
    <UContainer class="space-y-6">
      <UPageCard
        v-if="isEmpty"
        icon="i-lucide-shield-check"
        title="Votre histoire ne quitte pas ce navigateur"
        description="Les évènements que vous ajoutez sont enregistrés uniquement sur cet appareil. Rien n’est envoyé sur Internet. En contrepartie, effacer les données de votre navigateur ferait disparaître votre frise : pensez à l’exporter régulièrement."
        variant="subtle"
      />

      <UCard title="Ajouter un évènement">
        <EventForm @submit="add" />
      </UCard>

      <UAlert
        v-if="issues.length"
        color="warning"
        variant="subtle"
        icon="i-lucide-file-warning"
        :title="`${issues.length} ligne${issues.length > 1 ? 's' : ''} de votre fichier n’${issues.length > 1 ? 'ont' : 'a'} pas été comprise${issues.length > 1 ? 's' : ''}`"
      >
        <template #description>
          <p class="mb-2">
            Elles sont conservées telles quelles et réapparaîtront à l’export —
            rien n’est perdu.
          </p>
          <ul class="space-y-1">
            <li
              v-for="issue in issues"
              :key="issue.line"
              class="flex flex-wrap items-baseline gap-x-2 text-xs"
            >
              <code class="bg-elevated rounded px-1 py-0.5"
                >ligne {{ issue.line }}</code
              >
              <span class="text-highlighted">{{ issue.raw.trim() }}</span>
              <span class="text-muted">— {{ issue.reason }}</span>
              <UButton
                size="xs"
                variant="link"
                color="neutral"
                label="Abandonner cette ligne"
                @click="history.dismissIssue(issue)"
              />
            </li>
          </ul>
        </template>
      </UAlert>
      <!--
      Déroulée, la frise n'est plus un texte mais une bande qui défile : la largeur de
      lecture ne lui sert à rien, elle prend tout l'écran. Rangée par lignes, elle
      revient dans la colonne du reste de la page. Un conteneur écrit à la main plutôt
      qu'un `UContainer` neutralisé : c'est la même règle, dite une fois.
    -->
      <UCard
        v-if="!isEmpty"
        :ui="{
          body: wrap ? '' : 'p-0 sm:p-0',
          header: wrap ? '' : 'border-none',
        }"
      >
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-highlighted font-semibold">Votre frise</h2>
            <UCheckbox
              v-model="wrap"
              label="Revenir à la ligne"
              :ui="{ label: 'text-muted font-normal' }"
            />
          </div>
        </template>
        <ClientOnly v-if="wrap">
          <LifeTimeline
            v-if="loaded"
            ref="timeline"
            :events="events"
            :wrap="wrap"
            @select="
              (id) =>
                (editing = events.find((event) => event.id === id) ?? null)
            "
          />
          <template #fallback>
            <div class="h-64" />
          </template>
        </ClientOnly>
      </UCard>
    </UContainer>

    <ClientOnly v-if="!isEmpty">
      <LifeTimeline
        v-if="loaded && !wrap"
        ref="timeline"
        :events="events"
        :wrap="wrap"
        @select="
          (id) => (editing = events.find((event) => event.id === id) ?? null)
        "
      />
      <template #fallback>
        <div class="h-64" />
      </template>
    </ClientOnly>

    <UModal
      :open="editing !== null"
      title="Modifier l’évènement"
      :ui="{ content: 'max-w-6xl' }"
      @update:open="
        (value) => {
          if (!value) editing = null;
        }
      "
    >
      <template #body>
        <EventForm
          v-if="editing"
          ref="editForm"
          :event="editing"
          edition
          submit-label="Enregistrer"
          @submit="saveEdit"
          @cancel="editing = null"
          @delete="
            () => {
              if (editing) {
                remove(editing);
                editing = null;
              }
            }
          "
        />
      </template>
    </UModal>
  </div>
</template>
