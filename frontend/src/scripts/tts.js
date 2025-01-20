class TTSManager {
    constructor() {
        this.enabled = localStorage.getItem('ttsEnabled') === 'true';
        this.synth = window.speechSynthesis;
        this.initializeUI();
    }

    initializeUI() {
        this.updateToggleButton();
        document.getElementById('ttsToggle').addEventListener('click', () => this.toggle());
    }

    updateToggleButton() {
        const ttsStatus = document.getElementById('ttsStatus');
        ttsStatus.textContent = this.enabled ? 'Disable TTS' : 'Enable TTS';
    }

    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('ttsEnabled', this.enabled.toString());
        this.updateToggleButton();
        
        if (!this.enabled && this.synth.speaking) {
            this.synth.cancel();
        }
    }

    speak(text, language = 'en') {
        if (!this.enabled || !text) return;
        
        if (this.synth.speaking) {
            this.synth.cancel();
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === 'nl' ? 'nl-NL' : 'en-US';
        this.synth.speak(utterance);
    }
}

// Export instance
const TTSManager = {
    enabled: localStorage.getItem('ttsEnabled') === 'true',
    synth: window.speechSynthesis,

    init() {
        this.updateToggleButton();
        document.getElementById('ttsToggle').addEventListener('click', () => this.toggle());
    },

    updateToggleButton() {
        const ttsStatus = document.getElementById('ttsStatus');
        ttsStatus.textContent = this.enabled ? 'Disable TTS' : 'Enable TTS';
    },

    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('ttsEnabled', this.enabled.toString());
        this.updateToggleButton();
        
        if (!this.enabled && this.synth.speaking) {
            this.synth.cancel();
        }
    },

    speak(text, language = 'en') {
        if (!this.enabled || !text) return;
        
        if (this.synth.speaking) {
            this.synth.cancel();
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === 'nl' ? 'nl-NL' : 'en-US';
        this.synth.speak(utterance);
    }
};

window.TTSManager = TTSManager;