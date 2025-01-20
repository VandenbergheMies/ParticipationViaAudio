import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from typing import List
from config.settings import Config

class TranslationService:
    def __init__(self):
        self.tokenizer = AutoTokenizer.from_pretrained(Config.MODELS['translation'])
        self.model = AutoModelForSeq2SeqLM.from_pretrained(Config.MODELS['translation'])
        if torch.cuda.is_available():
            self.model = self.model.to(Config.DEVICE)

    def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        try:
            inputs = self.tokenizer(text, return_tensors="pt", max_length=512, truncation=True)
            if torch.cuda.is_available():
                inputs = {k: v.to(Config.DEVICE) for k, v in inputs.items()}
            
            translated = self.model.generate(
                **inputs,
                forced_bos_token_id=self.tokenizer.convert_tokens_to_ids([target_lang])[0],
                max_length=512,
                no_repeat_ngram_size=3,
                length_penalty=1.0
            )
            return self.tokenizer.batch_decode(translated, skip_special_tokens=True)[0]
        except Exception as e:
            print(f"Translation error: {str(e)}")
            return text

    def process_dutch_questions(self, dutch_text: str, question_gen) -> List[str]:
        try:
            # First translate Dutch text to English
            english_text = self.translate(dutch_text, "nld_Latn", "eng_Latn")
            print(f"Translated to English: {english_text}")
            
            # Create question generator instance and generate questions
            questions = question_gen.generate_questions(english_text)
            print(f"Generated English questions: {questions}")
            
            # Translate each question back to Dutch
            dutch_questions = []
            for question in questions:
                dutch_question = self.translate(question, "eng_Latn", "nld_Latn")
                print(f"Translated question to Dutch: {dutch_question}")
                dutch_questions.append(dutch_question)
            
            return dutch_questions
            
        except Exception as e:
            print(f"Error in process_dutch_questions: {str(e)}")
            if hasattr(question_gen, 'generate_questions'):
                return question_gen.generate_questions(dutch_text)
            return []