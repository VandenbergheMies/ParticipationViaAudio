from typing import List
import requests
import re

class QuestionGenerator:
    def __init__(self):
        self.api_url = "http://localhost:11434/api/generate"
        
    def clean_question(self, question: str) -> str:
        """Clean and format a single question."""
        question = question.split('?')[0] + '?'
        
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

    def generate_questions(self, text: str) -> List[str]:
        prompt = (
            f"Based on this student's response: '{text}', generate 3 short but sweet follow-up questions about their experience at our school.\n"
            "Focus on topics like the campus environment, facilities and how they feel about being part of the school community.\n"
            "Keep the questions professional, engaging, and open-ended. Do not use any locations or names nor ask for.\n"
            "Format: Q1:, Q2:, Q3:"
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
            
            questions = re.findall(r'Q\d:\s*([^\n]+)', generated_text)
            return [self.clean_question(q) for q in questions[:3]]
            
        except Exception as e:
            print(f"Error generating questions: {str(e)}")
            return [
                "What aspects of the campus facilities do you find most helpful for your studies?",
                "How has your experience been with the school community so far?",
                "What activities or programs would you like to see more of at our school?"
            ]
        
    def process_survey_batch(self, original_responses: List[str], anonymized_responses: List[str]) -> dict:
        """Process a batch of survey responses with theme extraction and follow-up questions"""
        themes = self.thematic_analyzer.extract_themes(original_responses)
        
        all_follow_up_questions = []
        for response in anonymized_responses:
            questions = self.generate_questions(response)
            all_follow_up_questions.extend(questions)
            
        return {
            "themes": themes,
            "follow_up_questions": all_follow_up_questions
        }