/**
 * Conversion oklch → sRGB.
 *
 * Tailwind 4 exprime toute sa palette en `oklch()`. Ni un canvas ni un calcul de
 * contraste ne savent la lire : on convertit une fois, à la compilation.
 * Matrices de Björn Ottosson (OKLab), puis transfert sRGB.
 */
export function oklchToHex(
  lightness: number,
  chroma: number,
  hue: number,
): string {
  const radians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);

  const long = (lightness + 0.396_337_777_4 * a + 0.215_803_757_3 * b) ** 3;
  const medium = (lightness - 0.105_561_345_8 * a - 0.063_854_172_8 * b) ** 3;
  const short = (lightness - 0.089_484_177_5 * a - 1.291_485_548_0 * b) ** 3;

  const linear = [
    4.076_741_662_1 * long - 3.307_711_591_3 * medium + 0.230_969_929_2 * short,
    -1.268_438_004_6 * long +
      2.609_757_401_1 * medium -
      0.341_319_396_5 * short,
    -0.004_196_086_3 * long -
      0.703_418_614_7 * medium +
      1.707_614_701_0 * short,
  ];

  return `#${linear
    .map((channel) => {
      const encoded =
        channel <= 0.003_130_8
          ? 12.92 * channel
          : 1.055 * channel ** (1 / 2.4) - 0.055;
      return Math.round(Math.min(1, Math.max(0, encoded)) * 255)
        .toString(16)
        .padStart(2, "0");
    })
    .join("")}`;
}
