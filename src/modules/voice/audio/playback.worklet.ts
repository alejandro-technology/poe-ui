// @ts-nocheck
const PLAYBACK_SECONDS = 20;

class PlaybackProcessor extends AudioWorkletProcessor {
  private buffer: Float32Array;
  private capacity: number;
  private writeIndex: number;
  private readIndex: number;
  private count: number;

  constructor() {
    super();
    this.capacity = Math.round(sampleRate * PLAYBACK_SECONDS);
    this.buffer = new Float32Array(this.capacity);
    this.writeIndex = 0;
    this.readIndex = 0;
    this.count = 0;

    this.port.onmessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; buffer?: ArrayBuffer };
      if (!data) return;
      if (data.type === "clear") {
        this.writeIndex = 0;
        this.readIndex = 0;
        this.count = 0;
        return;
      }
      if (data.type === "pcm" && data.buffer) {
        const int16 = new Int16Array(data.buffer);
        this.writePcm(int16);
      }
    };
  }

  private writePcm(int16: Int16Array): void {
    let chunk = int16;
    if (chunk.length > this.capacity) {
      chunk = chunk.subarray(chunk.length - this.capacity);
    }
    const overflow = this.count + chunk.length - this.capacity;
    if (overflow > 0) {
      this.readIndex = (this.readIndex + overflow) % this.capacity;
      this.count -= overflow;
    }
    for (let i = 0; i < chunk.length; i++) {
      const sample = chunk[i];
      this.buffer[this.writeIndex] = sample / (sample < 0 ? 0x8000 : 0x7fff);
      this.writeIndex = (this.writeIndex + 1) % this.capacity;
      this.count++;
    }
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const channel = outputs[0]?.[0];
    if (!channel) return true;
    for (let i = 0; i < channel.length; i++) {
      if (this.count > 0) {
        channel[i] = this.buffer[this.readIndex];
        this.readIndex = (this.readIndex + 1) % this.capacity;
        this.count--;
      } else {
        channel[i] = 0;
      }
    }
    return true;
  }
}

registerProcessor("playback-processor", PlaybackProcessor);
