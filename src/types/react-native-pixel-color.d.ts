declare module 'react-native-pixel-color' {
    /**
     * Retrieves the hexadecimal color string of a single pixel from an image.
     * @param imagePath The local URI or path to the image file.
     * @param x The x-coordinate of the pixel.
     * @param y The y-coordinate of the pixel.
     * @returns A promise that resolves with the hex color string (e.g., '#RRGGBB').
     */
    export function getPixelColor(
      imagePath: string,
      x: number,
      y: number
    ): Promise<string>;
  }