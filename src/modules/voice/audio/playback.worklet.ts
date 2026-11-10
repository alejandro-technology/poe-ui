// @ts-nocheck
class PlaybackProcessor extends AudioWorkletProcessor {
  private buffer: Float32Array;
  private capacity: number;
  private writeIndex: number;
  private readIndex: number;
  private count: number;

  constructor() {
    super();
    this.capacity = 24000 * 5;
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
        for (let i = 0; i < int16.length; i++) {
          if (this.count >= this.capacity) break;
          const v = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
          this.buffer[this.writeIndex] = v;
          this.writeIndex = (this.writeIndex + 1) % this.capacity;
          this.count++;
        }
      }
    };
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
