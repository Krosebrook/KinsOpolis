/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
class AudioEngine {
  private ctx: AudioContext | null = null;
  private volume: number = 0.5;
  private initialized: boolean = false;
  private ambienceNodes: (AudioBufferSourceNode | OscillatorNode)[] = [];
  private ambienceGain: GainNode | null = null;

  init() {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.initialized = true;
  }

  setVolume(vol: number) {
    this.volume = vol;
    if (this.ambienceGain && this.ctx) {
        this.ambienceGain.gain.setTargetAtTime(vol * 0.2, this.ctx.currentTime, 0.1);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  startAmbience() {
    if (!this.ctx || this.ambienceNodes.length > 0) return;

    this.ambienceGain = this.ctx.createGain();
    this.ambienceGain.gain.value = this.volume * 0.2;
    this.ambienceGain.connect(this.ctx.destination);

    // 1. Wind/City Noise (Pink Noise approximation)
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; 
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    
    // Lowpass filter to make it sound like distant city/wind
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 400;

    noise.connect(noiseFilter);
    noiseFilter.connect(this.ambienceGain);
    noise.start();
    this.ambienceNodes.push(noise);

    // 2. Low Hum (City Drone)
    const drone = this.ctx.createOscillator();
    drone.type = 'triangle';
    drone.frequency.value = 40;
    
    const droneGain = this.ctx.createGain();
    droneGain.gain.value = 0.2;

    drone.connect(droneGain);
    droneGain.connect(this.ambienceGain);
    drone.start();
    this.ambienceNodes.push(drone);
  }

  stopAmbience() {
      this.ambienceNodes.forEach(n => {
          try { n.stop(); n.disconnect(); } catch(e){}
      });
      this.ambienceNodes = [];
      if (this.ambienceGain) {
          this.ambienceGain.disconnect();
          this.ambienceGain = null;
      }
  }

  private createOscillator(type: OscillatorType, freq: number, duration: number, startTime: number = 0) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);
    
    gain.gain.setValueAtTime(this.volume * 0.1, this.ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + startTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(this.ctx.currentTime + startTime);
    osc.stop(this.ctx.currentTime + startTime + duration);
  }

  playClick() {
    this.createOscillator('sine', 800, 0.1);
  }

  playBuild() {
    this.createOscillator('square', 400, 0.1);
    this.createOscillator('sine', 600, 0.2, 0.1);
  }

  playBulldoze() {
    this.createOscillator('sawtooth', 150, 0.3);
    this.createOscillator('sawtooth', 100, 0.3, 0.1);
  }

  playCash() {
    this.createOscillator('sine', 1200, 0.1);
    this.createOscillator('sine', 1600, 0.3, 0.1);
  }

  playError() {
    this.createOscillator('sawtooth', 150, 0.2);
  }
}

export const audio = new AudioEngine();