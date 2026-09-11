// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxt/eslint", "@nuxt/ui", "@vueuse/nuxt"],

  /**
   * Aucune donnée de patient ne doit pouvoir transiter par un serveur : l'application
   * est une page statique, et la frise n'est lue et rendue que dans le navigateur.
   */
  ssr: false,

  devtools: {
    enabled: true,
  },

  css: ["~/assets/css/main.css"],

  routeRules: {
    "/": { prerender: true },
    "/imprimer": { prerender: true },
  },

  compatibilityDate: "2026-06-30",

  /**
   * Le formatage est confié à Prettier : les règles de style d'ESLint sont coupées
   * pour qu'il n'y ait pas deux autorités qui se contredisent à chaque sauvegarde.
   * ESLint garde ce qu'il fait de mieux — les règles de correction.
   */
  eslint: {
    config: {
      stylistic: false,
    },
  },

  /**
   * Par défaut, une icône absente du bundle est récupérée sur l'API Iconify. Ce serait
   * une requête réseau partie du navigateur du patient, ce que l'application promet de
   * ne jamais faire : les icônes utilisées sont installées localement, et le repli
   * distant est coupé.
   */
  icon: {
    provider: "none",
    fallbackToApi: false,
    // `provider: 'none'` n'embarque que les icônes explicitement connues : sans ce
    // scan des sources, les `i-lucide-*` des composants ne seraient jamais résolues.
    // Le scan ne tourne qu'au démarrage : après avoir utilisé une icône qui ne
    // servait nulle part, il faut relancer `yarn dev`, sinon elle reste vide.
    // Il ne voit que les noms écrits en clair — un `:icon="`i-lucide-${x}`"` lui
    // échappe, et devra être listé dans `clientBundle.icons`.
    clientBundle: {
      scan: true,
    },
  },
});
