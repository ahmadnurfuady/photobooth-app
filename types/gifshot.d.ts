declare module 'gifshot' {
  export interface GifShotOptions {
    images?:  string[];
    gifWidth?: number;
    gifHeight?:  number;
    interval?: number;
    numFrames?: number;
    frameDuration?: number;
    fontWeight?: string;
    fontSize?: string;
    fontFamily?: string;
    fontColor?:  string;
    textAlign?: string;
    textBaseline?: string;
    sampleInterval?: number;
    numWorkers?: number;
    progressCallback?: (progress: number) => void;
    completeCallback?: () => void;
  }

  export interface GifShotResult {
    image: string;
    error:  boolean;
    errorCode?: string;
    errorMsg?: string;
  }

  export function createGIF(
    options: GifShotOptions,
    callback: (obj: GifShotResult) => void
  ): void;

  export function takeSnapShot(
    options: any,
    callback: (obj:  any) => void
  ): void;
}