// @ts-check
import prettier from "eslint-config-prettier";
import withNuxt from "./.nuxt/eslint.config.mjs";

// `eslint-config-prettier` neutralise les dernières règles de mise en forme — celles
// de Vue, notamment — que Prettier prend désormais en charge.
export default withNuxt().append(prettier);
