from azure.storage.queue import QueueClient
from azure.cosmos import CosmosClient
import json
import requests
import uuid
from datetime import datetime
import logging
from config.settings import Config
from typing import List
from services.thematic_analyzer import ThematicAnalyzer  # Add this import

class AzureStorage:
    def __init__(self):
        # Initialize the QueueClient
        self.queue_client = QueueClient.from_connection_string(
            conn_str=Config.BLOB_CONNECTION_STRING,
            queue_name=Config.QUEUE_NAME
        )

        # Initialize Azure Translator details
        self.translator_endpoint = Config.TRANSLATOR_ENDPOINT
        self.subscription_key = Config.TRANSLATOR_KEY
        self.region = Config.TRANSLATOR_REGION
        
        # Initialize CosmosClient with endpoint and key
        cosmos_client = CosmosClient(Config.COSMOS_DB_ENDPOINT, credential=Config.COSMOS_DB_KEY)
        self.database = cosmos_client.get_database_client(Config.COSMOS_DATABASE_NAME)
        self.answers_container = self.database.get_container_client(Config.ANSWERS_CONTAINER_NAME)
        self.surveys_container = self.database.get_container_client(Config.SURVEYS_CONTAINER_NAME)

    def translate_text(self, text: str, target_language: str) -> str:
        """
        Translate text using Azure Translator with auto-detect for the source language.
        """
        headers = {
            "Ocp-Apim-Subscription-Key": self.subscription_key,
            "Ocp-Apim-Subscription-Region": self.region,
            "Content-Type": "application/json",
        }
        params = {
            "api-version": "3.0",
            "to": target_language,  # Specify only the target language
        }
        body = [{"text": text}]
        try:
            response = requests.post(f"{self.translator_endpoint}/translate", headers=headers, params=params, json=body)
            response.raise_for_status()
            translations = response.json()
            return translations[0]["translations"][0]["text"]
        except requests.exceptions.RequestException as e:
            raise Exception(f"Translation failed: {str(e)}")


    async def store_survey_response(self, responses: List[dict], questions: List[str]):
        try:
            # Extract original responses for theme analysis
            original_responses = [response['transcription'] for response in responses]
            thematic_analyzer = ThematicAnalyzer()
            themes = thematic_analyzer.extract_themes(original_responses)

            survey_doc = {
                'id': str(uuid.uuid4()),
                'timestamp': datetime.utcnow().isoformat(),
                'language': responses[0]['language'],
                'themes': themes,  # Store themes
                'survey_data': [
                    {
                        'question': questions[i] if i < len(questions) else "Unknown question",
                        'response': response['transcription'],
                        'question_number': response['question_number']
                    }
                    for i, response in enumerate(responses)
                ]
            }

            self.queue_client.send_message(json.dumps(survey_doc))
            self.answers_container.create_item(body=survey_doc)
            return True
        except Exception as e:
            raise Exception(f"Failed to store survey response: {str(e)}")

    def fetch_surveys(self, language: str = "en") -> list:
        """
        Fetch and translate surveys dynamically.
        """
        try:
            surveys = []
            for item in self.surveys_container.query_items(
                query="SELECT * FROM c",
                enable_cross_partition_query=True
            ):
                translated_title = self.translate_text(item["title"], target_language=language)
                translated_description = self.translate_text(
                    item.get("description", "No description available."),
                    target_language=language
                )
                translated_questions = [
                    {
                        "id": q["id"],
                        "text": self.translate_text(q["text"], target_language=language)
                    }
                    for q in item.get("questions", [])
                ]

                surveys.append({
                    "id": item["id"],
                    "title": translated_title,
                    "description": translated_description,
                    "questions": translated_questions,
                    "_rid": item["_rid"],
                    "_self": item["_self"],
                    "_etag": item["_etag"],
                    "_attachments": item["_attachments"],
                    "_ts": item["_ts"]
                })

            return surveys
        except Exception as e:
            raise Exception(f"Failed to fetch surveys: {str(e)}")


# Initialize AzureStorage instance
azure_storage = AzureStorage()
