from typing import List
import requests
import re
from .thematic_analyzer import ThematicAnalyzer

class QuestionGenerator:
    def __init__(self):
        self.api_url = "http://localhost:11434/api/generate"
        
    def clean_question(self, question: str) -> str:
        if '?' in question:
            parts = question.split('?')
            question = '?'.join(parts[:-1]) + '?'
        
        patterns = [
            (r'^\s*\d+[\.\)]\s*', ''),
            (r'^Question\s*:', ''),
            (r'\[.*?\]', ''),
            (r'\(.*?\)', ''),
            (r'"', ''),
            (r'\s+', ' ')
        ]
        
        for pattern, replacement in patterns:
            question = re.sub(pattern, replacement, question)
            
        return question.strip()

    def generate_questions(self, text: str, language: str = "nl") -> List[str]:
        if language == "nl":
            prompt = (
                f"Gegeven het antwoord van de student over hun studiekeuze: '{text}'\n\n"
                "Genereer 3 Nederlandse vervolgvragen die:\n"
                "- Direct ingaan op de genoemde details\n"
                "- De motivaties en ervaringen verkennen\n"
                "- Het besluitvormingsproces helpen begrijpen\n"
                "- Privacy respecteren\n\n"
                "Formatteer elke vraag als 'V1:', 'V2:', 'V3:' gevolgd door je vraag.\n"
            )
        else:
            prompt = (
                f"Based on the student's response: '{text}'\n\n"
                "Generate 3 follow-up questions that:\n"
                "- Directly relate to specific details mentioned\n"
                "- Explore their motivations and experiences\n"
                "- Help understand their decision-making process\n"
                "- Maintain privacy\n\n"
                "Format each question as 'Q1:', 'Q2:', 'Q3:' followed by your question.\n"
            )

        try:
            response = requests.post(
                self.api_url,
                json={
                    "model": "llama3.1",
                    "prompt": prompt,
                    "stream": False
                }
            )
            response.raise_for_status()
            generated_text = response.json()["response"]
            
            questions = []
            for line in generated_text.split('\n'):
                if ('?' in line) and (line.strip().startswith('V') or line.strip().startswith('Q')):
                    question = re.sub(r'^[VQ]\d:\s*', '', line.strip())
                    questions.append(question)
            
            return [self.clean_question(q) for q in questions[:3]]
            
        except requests.RequestException as e:
            print(f"An error occurred: {e}")
            return []

    def analyze_themes(self, text: str) -> dict:
        analyzer = ThematicAnalyzer()
        return analyzer.analyze(text)