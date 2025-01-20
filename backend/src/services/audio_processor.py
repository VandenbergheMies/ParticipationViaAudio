import numpy as np
import soundfile as sf
from fastapi import UploadFile
from pydub import AudioSegment
import tempfile
import os
from utils.logger import logger

class AudioProcessor:
    @staticmethod
    async def process_audio(audio_file: UploadFile, language: str) -> tuple[np.ndarray, int]:
        contents = await audio_file.read()
        return AudioProcessor.convert_webm_to_wav(contents)

    @staticmethod
    def convert_webm_to_wav(webm_data: bytes) -> tuple[np.ndarray, int]:
        with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_webm:
            temp_webm.write(webm_data)
            temp_webm_path = temp_webm.name

        try:
            audio = AudioSegment.from_file(temp_webm_path, format="webm")
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_wav:
                audio.export(temp_wav.name, format="wav")
                audio_data, samplerate = sf.read(temp_wav.name)
                return np.mean(audio_data, axis=1).astype(np.float32) if len(audio_data.shape) > 1 else audio_data, samplerate
        finally:
            for temp_file in [temp_webm_path, temp_wav.name]:
                try:
                    os.unlink(temp_file)
                except Exception as e:
                    logger.warning(f"Failed to delete temp file {temp_file}: {e}")