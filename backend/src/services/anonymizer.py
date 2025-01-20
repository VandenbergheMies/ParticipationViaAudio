import spacy
import re
from typing import Dict
from faker import Faker
import random

BELGIAN_CITIES = [
    'Antwerpen', 'Gent', 'Brugge', 'Leuven', 'Mechelen', 'Oostende', 
    'Hasselt', 'Kortrijk', 'Aalst', 'Sint-Niklaas', 'Roeselare', 'Genk']

class Anonymizer:
    def __init__(self):
        self.models = {
            'en': spacy.load("en_core_web_lg"),
            'nl': spacy.load("nl_core_news_lg")
        }
        self.fakers = {
            'en': Faker('en_US'),
            'nl': Faker('nl_NL')
        }
        self.replacements = {
            'PERSON': {}, 'GPE': {}, 'ORG': {}, 'LOC': {}, 'FAC': {},
            'AGE': {}
        }

    def anonymize(self, text: str, language: str = 'en') -> str:
        if language not in self.models:
            language = 'en'
            
        doc = self.models[language](text)
        anonymized = self._process_entities(doc, text, language)
        return self._anonymize_ages(anonymized, language)

    def _get_replacement(self, entity_type: str, original: str, language: str) -> str:
        if original not in self.replacements[entity_type]:
            faker = self.fakers[language]
            if entity_type == 'PERSON':
                replacement = faker.first_name()
            elif entity_type in ['GPE', 'LOC']:
                replacement = random.choice(BELGIAN_CITIES)
            elif entity_type == 'ORG':
                replacement = faker.company()
            elif entity_type == 'AGE':
                replacement = str(faker.random_int(min=18, max=80))
            else:
                replacement = faker.building_name()
            self.replacements[entity_type][original] = replacement
        return self.replacements[entity_type][original]

    def _process_entities(self, doc, text: str, language: str) -> str:
        replacements = []
        for ent in doc.ents:
            if ent.label_ in self.replacements:
                replacement = self._get_replacement(ent.label_, ent.text, language)
                replacements.append((ent.start_char, ent.end_char, replacement))
        return self._apply_replacements(text, sorted(replacements, key=lambda x: x[0], reverse=True))

    def _anonymize_ages(self, text: str, language: str) -> str:
        patterns = {
            'nl': [r'\b(\d{1,3})\s*(?:jaar\s*oud|jarige?)\b',
                  r'\b(?:leeftijd\s+van\s+)(\d{1,3})\b'],
            'en': [r'\b(\d{1,3})\s*(?:years?\s*old|\-years?\-old|yr\s*old)\b',
                  r'\b(?:age(?:d)?\s+)(\d{1,3})\b']
        }
        
        for pattern in patterns.get(language, patterns['en']):
            matches = re.finditer(pattern, text, flags=re.IGNORECASE)
            for match in matches:
                age = match.group(1)
                replacement = self._get_replacement('AGE', age, language)
                text = text[:match.start()] + replacement + ' years old' + text[match.end():]
        return text

    @staticmethod
    def _apply_replacements(text: str, replacements: list) -> str:
        for start, end, replacement in replacements:
            text = f"{text[:start]}{replacement}{text[end:]}"
        return text