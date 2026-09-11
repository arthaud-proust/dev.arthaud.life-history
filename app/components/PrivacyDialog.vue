<script setup lang="ts">
/**
 * « Vos données » (B1).
 *
 * Le patient doit pouvoir écrire des choses intimes en sachant exactement où elles
 * vont. On dit donc aussi les contreparties — perte possible, poste partagé — plutôt
 * que de se contenter d'une promesse rassurante.
 */
const open = defineModel<boolean>("open", { required: true });

defineEmits<{ export: []; clear: [] }>();
</script>

<template>
  <UModal
    v-model:open="open"
    title="Vos données restent sur cet appareil"
    description="Comment cette application stocke ce que vous écrivez."
  >
    <template #body>
      <div class="text-default space-y-4 text-sm">
        <p>
          Tout ce que vous saisissez est enregistré
          <strong
            >dans le stockage local de ce navigateur, sur cet appareil</strong
          >. Rien n'est envoyé sur Internet : il n'y a ni compte, ni serveur, ni
          statistiques d'usage.
        </p>

        <div class="space-y-3">
          <p class="text-highlighted font-medium">
            Ce que cela implique, concrètement
          </p>
          <div class="flex gap-3">
            <UIcon
              name="i-lucide-eraser"
              class="text-warning mt-0.5 size-4 shrink-0"
            />
            <p>
              Effacer les données de navigation, naviguer en privé, changer de
              navigateur ou d'ordinateur
              <strong>fait disparaître votre frise</strong>.
            </p>
          </div>
          <div class="flex gap-3">
            <UIcon
              name="i-lucide-users"
              class="text-warning mt-0.5 size-4 shrink-0"
            />
            <p>
              Toute personne qui utilise cette session du navigateur peut lire
              votre frise. Soyez prudent sur un ordinateur partagé.
            </p>
          </div>
          <div class="flex gap-3">
            <UIcon
              name="i-lucide-download"
              class="text-primary mt-0.5 size-4 shrink-0"
            />
            <p>
              La sauvegarde, c'est vous :
              <strong
                >exportez votre frise après chaque séance de saisie</strong
              >
              et rangez le fichier en lieu sûr.
            </p>
          </div>
        </div>

        <p class="text-muted border-default border-t pt-4 text-xs">
          Cette application est un support de travail, pas un dispositif de
          soin. Elle n'analyse pas ce que vous écrivez et ne vous conseille rien
          — elle vous aide à mettre votre histoire en forme, à partager avec la
          personne qui vous accompagne.
        </p>
      </div>
    </template>

    <template #footer="{ close }">
      <div class="flex w-full flex-wrap justify-between gap-2">
        <UButton
          color="error"
          variant="ghost"
          icon="i-lucide-trash-2"
          label="Tout effacer"
          @click="$emit('clear')"
        />
        <div class="flex gap-2">
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-download"
            label="Exporter"
            @click="$emit('export')"
          />
          <UButton label="J'ai compris" @click="close" />
        </div>
      </div>
    </template>
  </UModal>
</template>
