<script setup lang="ts">
import { fr } from "@nuxt/ui/locale";

const title = "Historique de vie";
const description =
  "Construisez la frise des évènements de votre vie. Vos données restent sur votre navigateur.";

useHead({
  htmlAttrs: { lang: "fr" },
  meta: [{ name: "viewport", content: "width=device-width, initial-scale=1" }],
  link: [
    // Le jalon de l'en-tête, dans la couleur du thème. Le `.ico` — trois tailles —
    // d'abord, le SVG ensuite : un navigateur retient le dernier qu'il sait lire.
    { rel: "icon", href: "/favicon.ico", sizes: "16x16 32x32 48x48" },
    { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
  ],
});
useSeoMeta({ title, description, robots: "noindex" });

const history = useLifeHistory();
history.load();

const toast = useToast();

/**
 * Une nouvelle version ne s'installe pas dans le dos de celui qui écrit : elle attend
 * qu'on la demande. Rien n'est perdu en attendant — la frise vit dans le navigateur,
 * et l'ancienne version continue de fonctionner, hors connexion comprise.
 */
const { $pwa } = useNuxtApp();
watch(
  () => $pwa?.needRefresh,
  (ready) => {
    if (!ready) return;
    toast.add({
      title: "Une nouvelle version est prête",
      description: "Vous pouvez l’appliquer quand vous voulez.",
      color: "neutral",
      icon: "i-lucide-refresh-cw",
      duration: 0,
      actions: [
        {
          label: "Mettre à jour",
          color: "neutral",
          variant: "outline",
          onClick: () => $pwa?.updateServiceWorker(),
        },
      ],
    });
  },
);
const route = useRoute();

/**
 * L'accueil présente l'outil ; les deux autres pages le font fonctionner. L'en-tête
 * n'y propose donc pas les mêmes choses : sur l'accueil, une seule porte d'entrée.
 */
const isLanding = computed(() => route.path === "/");
const isPrinting = computed(() => route.path === "/imprimer");

const privacyOpen = ref(false);
const importOpen = ref(false);
const clearOpen = ref(false);

function exportFrise() {
  if (history.isEmpty.value) {
    toast.add({
      title: "Votre frise est vide",
      color: "neutral",
      icon: "i-lucide-info",
    });
    return;
  }
  downloadText(exportFilename(), history.text.value);
  toast.add({
    title: "Frise exportée",
    description:
      "Rangez ce fichier en lieu sûr : c’est votre seule sauvegarde.",
    color: "success",
    icon: "i-lucide-download",
  });
}

function confirmImport(text: string, mode: ImportMode) {
  const report = history.importText(text, mode);
  importOpen.value = false;
  toast.add({
    title: `${report.added} évènement${report.added > 1 ? "s" : ""} importé${report.added > 1 ? "s" : ""}`,
    description: report.updated ? `${report.updated} mis à jour.` : undefined,
    color: "success",
    icon: "i-lucide-upload",
  });
}

function confirmClear() {
  history.clear();
  clearOpen.value = false;
  privacyOpen.value = false;
  toast.add({
    title: "Frise effacée de ce navigateur",
    color: "neutral",
    icon: "i-lucide-trash-2",
  });
}
</script>

<template>
  <UApp :locale="fr">
    <UHeader :ui="{ root: 'print:hidden' }" :toggle="false">
      <template #left>
        <!-- Sur l'aperçu, il n'y a qu'une chose à faire du titre : en revenir. -->
        <UButton
          v-if="isPrinting"
          to="/app"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          label="Retour à la frise"
        />
        <NuxtLink
          v-else
          to="/"
          class="text-highlighted flex items-center gap-2 font-semibold"
        >
          <UIcon name="i-lucide-milestone" class="text-primary size-5" />
          {{ title }}
        </NuxtLink>
      </template>

      <template #right>
        <UButton
          v-if="isLanding"
          to="/app"
          icon="i-lucide-arrow-right"
          label="Ouvrir ma frise"
        />

        <UButton
          v-if="!isLanding"
          icon="i-lucide-shield-check"
          color="neutral"
          variant="ghost"
          label="Vos données"
          :ui="{ label: 'hidden lg:inline' }"
          aria-label="Vos données : où sont-elles stockées ?"
          @click="privacyOpen = true"
        />
        <UButton
          v-if="!isLanding"
          icon="i-lucide-upload"
          color="neutral"
          variant="ghost"
          label="Importer"
          :ui="{ label: 'hidden lg:inline' }"
          aria-label="Importer une frise"
          @click="importOpen = true"
        />
        <UButton
          v-if="!isLanding"
          icon="i-lucide-download"
          color="neutral"
          variant="ghost"
          label="Exporter"
          :ui="{ label: 'hidden lg:inline' }"
          aria-label="Exporter la frise"
          @click="exportFrise"
        />
        <UButton
          v-if="!isLanding && !isPrinting"
          to="/imprimer"
          icon="i-lucide-printer"
          color="primary"
          label="Imprimer"
          :ui="{ label: 'hidden lg:inline' }"
          aria-label="Imprimer la frise"
        />
        <UColorModeButton />
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>

    <PrivacyDialog
      v-model:open="privacyOpen"
      @export="exportFrise"
      @clear="clearOpen = true"
    />

    <ImportDialog
      v-model:open="importOpen"
      :has-existing-events="!history.isEmpty.value"
      @confirm="confirmImport"
    />

    <ConfirmDialog
      v-model:open="clearOpen"
      title="Effacer définitivement votre frise ?"
      description="Tous vos évènements seront supprimés de ce navigateur. Cette action est irréversible."
      confirm-label="Effacer définitivement"
      color="error"
      @confirm="confirmClear"
    >
      <UButton
        class="mt-4"
        color="neutral"
        variant="outline"
        icon="i-lucide-download"
        label="Exporter d’abord, par précaution"
        @click="exportFrise"
      />
    </ConfirmDialog>
  </UApp>
</template>
