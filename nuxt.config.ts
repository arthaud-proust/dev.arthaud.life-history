// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxt/eslint", "@nuxt/ui", "@vueuse/nuxt", "@vite-pwa/nuxt"],

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
    "/app": { prerender: true },
    "/imprimer": { prerender: true },
  },

  /**
   * Hors-ligne (§7 de PRODUCT.md).
   *
   * L'application n'a besoin de rien d'autre que du navigateur : tout ce qu'elle sait
   * faire est déjà dans la page, et la frise vit dans le `localStorage`. Un agent de
   * service met donc ses fichiers en cache au premier passage, et elle s'ouvre ensuite
   * sans connexion — dans le train, dans une salle d'attente, partout.
   *
   * Ce cache ne change rien à la promesse de confidentialité : il **reçoit** des
   * fichiers, il n'envoie rien. Aucune donnée du patient n'y passe.
   *
   * Installée depuis un téléphone, l'application s'ouvre directement sur la frise :
   * la page d'accueil sert à décider, pas à revenir.
   */
  pwa: {
    // `autoUpdate` rechargerait la page de lui-même dès qu'une version est déployée,
    // au milieu d'une phrase le cas échéant. On la propose : c'est le patient qui
    // décide quand elle s'applique (voir `app.vue`).
    registerType: "prompt",
    manifest: {
      name: "Historique de vie",
      short_name: "Historique",
      description:
        "Une frise des évènements d’une vie, pour un usage en thérapie. Ce qui y est écrit reste sur votre appareil.",
      lang: "fr",
      dir: "ltr",
      display: "standalone",
      orientation: "any",
      start_url: "/app",
      scope: "/",
      theme_color: "#00bba7",
      background_color: "#ffffff",
      icons: [
        { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
        { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
        {
          src: "/pwa-maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    workbox: {
      // Tout ce que la page charge : le code, les styles, les polices, les icônes.
      globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
      // Une route inconnue hors connexion retombe sur la page d'accueil, qui sait
      // afficher le reste elle-même — l'application est rendue par le navigateur.
      navigateFallback: "/",
    },
    // L'agent de service ne tourne pas en développement : il ferait servir du code
    // périmé à chaque rechargement.
    devOptions: { enabled: false },
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
