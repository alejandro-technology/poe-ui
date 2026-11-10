// @ts-nocheck
class CaptureProcessor extends AudioWorkletProcessor {
  private input: number[];
  private factor: number;
  private chunkSamples: number;

  constructor() {
    super();
    this.input = [];
    this.factor = Math.max(1, Math.round(sampleRate / 16000));
    this.chunkSamples = 1600;
  }

  process(inputs: Float32Array[][]): boolean {
    const channel = inputs[0]?.[0];
    if (channel) {
      for (let i = 0; i < channel.length; i++) {
        this.input.push(channel[i]);
      }
    }
    const needed = this.chunkSamples * this.factor;
    while (this.input.length >= needed) {
      const out = new Int16Array(this.chunkSamples);
      for (let j = 0; j < this.chunkSamples; j++) {
        const s = this.input[j * this.factor];
        const clamped = Math.max(-1, Math.min(1, s));
        out[j] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      }
      this.input.splice(0, needed);
      const buffer = out.buffer;
      this.port.postMessage({ type: "audio", buffer }, [buffer]);
    }
    return true;
  }
}

registerProcessor("capture-processor", CaptureProcessor);
