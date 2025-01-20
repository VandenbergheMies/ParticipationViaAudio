import requests
from typing import List

class ThematicAnalyzer:
    def __init__(self):
        self.api_url = "http://localhost:11434/api/generate"

    def extract_themes(self, responses: List[str], num_themes: int = 3) -> List[str]:
        responses_text = "\n".join(responses)
        prompt = f"Extract exactly {num_themes} key themes from these responses. Return only the themes separated by commas:\n\nResponses:\n{responses_text}"
        
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
            themes = response.json()["response"].split(',')
            return [theme.strip() for theme in themes[:num_themes]]
        except Exception as e:
            print(f"Error extracting themes: {str(e)}")
            return ["Community", "Academic Experience", "Campus Life"]