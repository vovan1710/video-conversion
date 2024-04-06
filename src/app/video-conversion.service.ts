import { Injectable } from '@angular/core';
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { BehaviorSubject } from "rxjs";
import { FFMessageLoadConfig } from "@ffmpeg/ffmpeg/dist/esm/types";

@Injectable({ providedIn: 'root' })
export class VideoConversionService {
  message = new BehaviorSubject('');
  conversionTime = new BehaviorSubject('');
  convertedVideoSrc = new BehaviorSubject('');
  ffmpeg!: FFmpeg;

  async loadFFmpeg(isMultiThreadOption: boolean) {
    this.ffmpeg = new FFmpeg();
    this.ffmpeg.on('log', ({ message }) => {
      this.message.next( message)
    });
    const config = isMultiThreadOption ? await this.getMultiThreadConfig() : await this.getSingleThreadConfig();
    try {
      await this.ffmpeg.load(config);
    } catch (error) {
      console.error(error);
    }
  }
  private async getSingleThreadConfig(): Promise<FFMessageLoadConfig> {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    return {
      coreURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.js`,
        'text/javascript'
      ),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        'application/wasm'
      ),
      classWorkerURL: 'assets/ffmpeg/worker.js'
    };
  }
  private async getMultiThreadConfig(): Promise<FFMessageLoadConfig> {
    const baseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm';
    return {
      coreURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.js`,
        'text/javascript'
      ),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        'application/wasm'
      ),
      classWorkerURL: 'assets/ffmpeg/worker.js',
      workerURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.worker.js`,
        'text/javascript'
      ),
    };
  }
  async convert(recordedBlobs: Blob[]) {
    this.convertedVideoSrc.next('');
    if (!this.checkIfFmpegLoaded()) {
      return;
    }
    const blob = new Blob(recordedBlobs, { type: 'video/webm' });
    const name = 'input.webm';
    await this.ffmpeg.writeFile(name, await fetchFile(blob));
    const startTime = performance.now();

    await this.ffmpeg.exec([
      '-i',
      name, // Input file
      '-t',
      '60', // Limit the output duration to 60 seconds
      '-c:v',
      'libx264', // Video codec: H.264
      '-preset',
      'ultrafast', // Preset for faster encoding
      '-r',
      '20', // Frame rate: Reduced to 20 FPS
      '-s',
      '480x360', // Reduced resolution
      '-crf',
      '28', // Slightly reduced quality for speed
      'output.mp4' // Output file
    ]);
    this.message.next(  'Conversion completed.');

    const endTime = performance.now();
    const diffTime = ((endTime - startTime) / 1000).toFixed(2);
    this.conversionTime.next(  ` ${diffTime} s`);

    const data = (await this.ffmpeg.readFile('output.mp4')) as any;
    this.convertedVideoSrc.next( URL.createObjectURL(
      new Blob([data.buffer], { type: 'video/mp4' })
    ));
  }
  private checkIfFmpegLoaded() {
    if (this.ffmpeg.loaded) {
      this.message.next('FFmpeg is loaded and ready to use.');
      return true;
    } else {
      this.message.next('FFmpeg failed to load.');
      return false;
    }
  }
}
