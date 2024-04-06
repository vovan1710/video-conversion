import { Component, ElementRef, NgZone, OnInit, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { VideoConversionService } from "./video-conversion.service";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { FormsModule } from "@angular/forms";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, MatButtonModule, MatButtonToggleModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit{
  @ViewChild('videoRef') private videoRef!: ElementRef<HTMLVideoElement>;
  recordedBlobs: Blob[] = [];
  stream: MediaStream | null = null;
  mediaRecorder!: MediaRecorder | null;
  finalBlob!: Blob;
  originSrc!: string;
  fileSizeBefore = 'File size';
  isRecording = false;
  duration = 0;
  durationInterval!: any;
  isMultiThreadOption = false;
  constructor(
    private ngZone: NgZone,
    public videoConversionService: VideoConversionService) {
  }
  async ngOnInit() {
    this.startStream();
    this.videoConversionService.loadFFmpeg(this.isMultiThreadOption);
  }
  modeChanged() {
    this.videoConversionService.loadFFmpeg(this.isMultiThreadOption);
  }
  async startStream() {
    const constraints = {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: true
    };
    this.stream = await navigator.mediaDevices.getUserMedia(constraints);

    this.videoRef.nativeElement.srcObject = this.stream;
    this.videoRef.nativeElement.muted = true;
  }
  async startRecording() {
    this.isRecording = true;
    this.recordedBlobs = [];

    this.mediaRecorder = new MediaRecorder(this.stream!, {
      bitsPerSecond: 1000000
    });

    this.mediaRecorder.ondataavailable = (event: any) => {
      if (event.data && event.data.size > 0) {
        this.recordedBlobs.push(event.data);
      }
    };
    this.mediaRecorder.start(100);
    this.startDurationCounter();
  }
  stopRecording() {
    if (!this.mediaRecorder) {
      return;
    }
    clearInterval(this.durationInterval);
    this.mediaRecorder.onstop = async () => {
      this.ngZone.run(() => {
        this.videoConversionService.convert(this.recordedBlobs);
        this.mediaRecorder = null;
        this.finalBlob = new Blob(this.recordedBlobs, {type: 'video/webm'});
        const fileSizeBefore = (this.finalBlob.size / 1024 / 1024).toFixed(2);
        this.fileSizeBefore = `File size before conversion: ${fileSizeBefore} MB`;
        this.originSrc = URL.createObjectURL(this.finalBlob);
      });
    };
    this.mediaRecorder.stop();
    this.isRecording = false;
  }
  startDurationCounter() {
    this.duration = 0;
    this.durationInterval = setInterval(() => {
      this.duration++;
    }, 1000);
  }
}
