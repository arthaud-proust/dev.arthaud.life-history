<script setup lang="ts">
import type { ButtonProps } from "@nuxt/ui";

/**
 * La page d'accueil : ce que l'outil est, et ce qu'il promet.
 *
 * Elle s'adresse à quelqu'un qui arrive par un lien, souvent avant une séance, et qui
 * doit pouvoir décider en une minute s'il confie son histoire à cette page. La
 * promesse de confidentialité (B1) vient donc tôt et en clair, avant les fonctions.
 *
 * La frise montrée en exemple est la vraie : le composant de la frise, avec quelques
 * évènements écrits dans le format du fichier. Rien n'y est simulé — ce qu'on voit ici
 * est ce qu'on obtient.
 */
const { isEmpty, loaded } = useLifeHistory();

const demo = computed(
  () =>
    parseDocument(
      [
        "# 12 juin 1998\nNaissance de ma sœur",
        "# septembre 2004 à juin 2007; sky\nCollège\nTrois années difficiles.",
        "# juin 2012\nLe bac, enfin",
        "# 2015 à 2019; emerald\nÉtudes à Lyon\nLa ville où j’ai appris à vivre.",
        "# mars 2020\nConfinement",
      ].join("\n\n"),
    ).events,
);

/** Une frise déjà commencée se reprend ; sinon, elle s'ouvre. */
const startLabel = computed(() =>
  loaded.value && !isEmpty.value ? "Reprendre ma frise" : "Commencer ma frise",
);

const cta = computed(
  () =>
    [
      { label: startLabel.value, to: "/app", icon: "i-lucide-arrow-right" },
      {
        label: "La construire avec un(e) psychologue",
        to: "https://monsoutienpsy.ameli.fr/recherche-psychologue",
        variant: "outline",
        target: "_blank",
      },
    ] satisfies ButtonProps[],
);

const example = `# 2022; blue
Déménagement à Lille

# septembre 2004 à juin 2007; red
Collège
Trois années difficiles.

# 12 juin 1998; green
Naissance de ma sœur`;
</script>

<template>
  <div>
    <UPageHero
      headline="Outil d'accompagnement thérapeutique"
      title="Réalisez une frise de votre vie"
      description="Placez les évènements de votre vie les uns après les autres, avec vos mots et vos dates. La frise se met en page toute seule, s’imprime, et ne quitte jamais votre navigateur."
      :links="cta"
    >
      <div
        class="bg-default ring-default overflow-hidden rounded-xl shadow-sm ring"
      >
        <ClientOnly>
          <div class="pointer-events-none select-none" aria-hidden="true">
            <LifeTimeline :events="demo" />
          </div>
          <template #fallback>
            <div class="h-56" />
          </template>
        </ClientOnly>
      </div>
    </UPageHero>

    <UPageSection
      icon="i-lucide-shield-check"
      headline="Confidentialité"
      title="Vos données ne quittent pas ce navigateur"
      description="Il n’y a ni compte, ni cookie, ni collecte. Ce que vous écrivez est enregistré sur cet appareil, et nulle part ailleurs. En contrepartie, c’est à vous de garder une copie : l’export vous rend un fichier texte, que vous pouvez relire et réimporter."
      :features="[
        {
          icon: 'i-lucide-wifi-off',
          title: 'Rien n’est envoyé',
          description:
            'La page fonctionne entièrement dans votre navigateur, même hors ligne.',
        },
        {
          icon: 'i-lucide-download',
          title: 'Un fichier à vous',
          description:
            'L’export est un texte lisible, que vous rangez où vous voulez.',
        },
        {
          icon: 'i-lucide-trash-2',
          title: 'Effaçable d’un geste',
          description:
            'Un bouton efface la frise de cet appareil, sans rien laisser derrière.',
        },
      ]"
    />

    <UPageSection
      headline="Ce que vous posez"
      title="Notez ce dont vous vous souvenez"
      description="On se ne souvient parfois pas d’un jour précis. Écrivez ce que vous savez et laissez le reste de côté."
    >
      <UPageGrid>
        <UPageCard
          icon="i-lucide-calendar"
          title="Des dates"
          description="« 1998 » est une date valable. « juin 2023 » et « 12 juin 2022 » aussi."
        />
        <UPageCard
          icon="i-lucide-move-horizontal"
          title="Des périodes"
          description="Une période de changement, une relation notable, deviennent un bandeau posé au-dessus des mois qu’il recouvrent."
        />
        <UPageCard
          icon="i-lucide-align-left"
          title="Des descriptions"
          description="Une humeur, une raison ou encore une conséquence sont des informations utiles."
        />
        <UPageCard
          icon="i-lucide-palette"
          title="Des couleur"
          description="Identifier d’un coup d’œil ce qui se ressemble grâce aux couleurs."
        />
        <UPageCard
          icon="i-lucide-ellipsis"
          title="Des ellipses"
          description="Quand plus d’un mois sépare deux évènements, la frise le dit d’un « … » : les silences comptent aussi."
        />
        <UPageCard
          icon="i-lucide-printer"
          title="Ce que vous voulez"
          description="Imprimez des feuilles A4 pour avoir un support annotable."
        />
      </UPageGrid>
    </UPageSection>

    <UPageSection
      headline="Le fichier"
      title="Un format de sauvegarde lisible par les humains"
      description="Votre frise est enregistrée telle que vous la liriez. Chaque évènement commence par un dièse, suivi d'une date ou d'une période, d'une couleur et de sa description en dessous. Vous pouvez l’écrire à la main, le corriger dans un éditeur, le réimporter."
      orientation="horizontal"
    >
      <!--
        Pas de chasse fixe : ce n'est pas du code, c'est un texte que quelqu'un a
        écrit et qu'il doit pouvoir relire.
      -->
      <pre
        class="bg-elevated ring-default overflow-x-auto rounded-lg p-4 font-sans text-sm ring"
        >{{ example }}</pre>
    </UPageSection>

    <UPageCTA
      :title="`Voulez-vous ${loaded && !isEmpty ? 'reprendre' : 'commencer'} ?`"
      :description="
        loaded && !isEmpty
          ? `Allez-y à votre rythme.`
          : `Vous n'avez rien à installer. Une première date suffit.`
      "
      variant="subtle"
      :links="cta"
    />

    <UFooter>
      <template #left>
        <p class="text-muted text-sm">
          Libre de droits, créé par
          <a href="https://arthaudproust.fr" target="_blank" class="underline"
            >Arthaud Proust</a
          >
        </p>
      </template>

      <template #right>
        <UButton
          icon="i-simple-icons-github"
          color="neutral"
          variant="ghost"
          to="https://github.com/arthaud-proust/dev.arthaud.life-history"
          target="_blank"
          aria-label="GitHub"
        />
      </template>
    </UFooter>
  </div>
</template>
