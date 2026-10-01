// Sistema de feedback sonoro simples usando Web Audio API
// Apropriado para crianças com sons agradáveis e não irritantes

class AudioFeedback {
  private audioContext: AudioContext | null = null;

  constructor() {
    // AudioContext será inicializado apenas na primeira interação do usuário
  }

  private async ensureAudioContext() {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.warn('Web Audio API não suportada:', error);
        return false;
      }
    }
    
    // Resume o contexto se estiver suspenso (política de autoplay)
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.warn('Não foi possível resumir o AudioContext:', error);
        return false;
      }
    }
    
    return this.audioContext.state === 'running';
  }

  private createTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
    if (!this.audioContext || this.audioContext.state !== 'running') return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    // Envelope suave para evitar cliques
    const now = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  // Som de sucesso - melodia ascendente alegre
  async playSuccess() {
    if (!(await this.ensureAudioContext())) return;
    
    // Sequência musical alegre: C4-E4-G4-C5
    const notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach((freq, index) => {
      setTimeout(() => {
        this.createTone(freq, 0.2, 'sine');
      }, index * 100);
    });
  }

  // Som de erro - tom suave e não assustador
  async playError() {
    if (!(await this.ensureAudioContext())) return;
    
    // Tom descendente suave, não agressivo
    this.createTone(220, 0.3, 'triangle');
    setTimeout(() => {
      this.createTone(196, 0.3, 'triangle');
    }, 150);
  }

  // Som de clique/interação
  async playClick() {
    if (!(await this.ensureAudioContext())) return;
    
    // Clique suave
    this.createTone(800, 0.1, 'square');
  }

  // Som de vitória - fanfarra alegre
  async playVictory() {
    if (!(await this.ensureAudioContext())) return;
    
    // Fanfarra: C4-G4-C5-G5-C6
    const fanfare = [261.63, 392.00, 523.25, 783.99, 1046.50];
    fanfare.forEach((freq, index) => {
      setTimeout(() => {
        this.createTone(freq, 0.4, 'triangle');
      }, index * 200);
    });
  }

  // Som de par encontrado
  async playMatch() {
    if (!(await this.ensureAudioContext())) return;
    
    // Acordes harmoniosos
    this.createTone(523.25, 0.3, 'sine'); // C5
    setTimeout(() => {
      this.createTone(659.25, 0.3, 'sine'); // E5
    }, 50);
  }

  // Som de embaralhar cartas
  async playShuffle() {
    if (!(await this.ensureAudioContext())) return;
    
    // Sequência rápida de tons
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const freq = 400 + Math.random() * 400;
        this.createTone(freq, 0.05, 'sawtooth');
      }, i * 50);
    }
  }
}

// Instância singleton
export const audioFeedback = new AudioFeedback();