from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from services.audio_processor import AudioProcessor
from services.question import QuestionGenerator
from services.anonymizer import Anonymizer
from utils.logger import logger
from services.thematic_analyzer import ThematicAnalyzer
from transformers import (
    AutoModelForSpeechSeq2Seq, AutoProcessor,
    pipeline
)
from azure.cosmos import CosmosClient
from config.settings import Config
from typing import List
from services.azure_storage import azure_storage
from models.schemas import QuestionRequest, QuestionResponse, Survey, SurveyRequest, SurveyUpdate
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize Cosmos DB Client
client = CosmosClient(Config.COSMOS_DB_ENDPOINT, Config.COSMOS_DB_KEY)
database = client.get_database_client(Config.COSMOS_DATABASE_NAME)

# Containers
surveys_container = database.get_container_client(Config.SURVEYS_CONTAINER_NAME)
answers_container = database.get_container_client(Config.ANSWERS_CONTAINER_NAME)


# Initialize all required services
question_generator = QuestionGenerator()
anonymizer = Anonymizer()
thematic_analyzer = ThematicAnalyzer()

class ThemeAnalysisRequest(BaseModel):
    responses: List[str]

# Initialize whisper model and pipeline
processor = AutoProcessor.from_pretrained(Config.MODELS['whisper'])
model = AutoModelForSpeechSeq2Seq.from_pretrained(
    Config.MODELS['whisper'],
    torch_dtype=Config.TORCH_DTYPE,
    low_cpu_mem_usage=True,
    use_safetensors=True
).to(Config.DEVICE)

whisper_pipe = pipeline(
    "automatic-speech-recognition",
    model=model,
    tokenizer=processor.tokenizer,
    feature_extractor=processor.feature_extractor,
    device=Config.DEVICE,
)


def get_next_survey_id():
    """Get the next auto-incrementing survey ID."""
    try:
        # Query all items and sort by the numerical ID
        surveys = list(surveys_container.query_items(
            query="SELECT c.id FROM c",
            enable_cross_partition_query=True
        ))

        # Extract numeric IDs, assume ID is a string that represents an integer
        numeric_ids = [int(survey["id"]) for survey in surveys if survey["id"].isdigit()]
        if numeric_ids:
            return str(max(numeric_ids) + 1)  # Increment the largest ID
        else:
            return "1"  # Start with 1 if no surveys exist
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate survey ID: {str(e)}")
    
@router.post("/api/generate-questions")
async def generate_questions_endpoint(request: QuestionRequest) -> QuestionResponse:
    try:
        questions = question_generator.generate_questions(
            request.previous_answer,
            language=request.language
        )
        return QuestionResponse(
            success=True,
            questions=questions
        ) if questions else QuestionResponse(
            success=False,
            error="Failed to generate questions"
        )
    except Exception as e:
        logger.error(f"Error generating questions: {str(e)}", exc_info=True)
        return QuestionResponse(success=False, error=str(e))

# Update a survey
@router.put("/api/admin/surveys/{survey_id}")
async def update_survey(i: str, survey: SurveyUpdate):
    try:
        # Fetch the survey to ensure it exists
        existing_survey = next(
            surveys_container.query_items(
                query="SELECT * FROM c WHERE c.id = @id",
                parameters=[{"name": "@id", "value": id}],
                enable_cross_partition_query=True
            ),
            None
        )
        if not existing_survey:
            raise HTTPException(status_code=404, detail="Survey not found.")

        # Update the survey with new data
        updated_survey = {
            **existing_survey,
            "title": survey.title,
            "description": survey.description,
            "questions": survey.questions,
        }
        surveys_container.upsert_item(updated_survey)

        return {"success": True, "message": "Survey updated successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update survey: {str(e)}")


@router.post("/api/admin/surveys")
async def add_survey(survey: Survey):
    try:
        new_survey = {
            "id": get_next_survey_id(),
            "title": survey.title,
            "description": survey.description,
            # Ensure each question has an "id" and "text" field
            "questions": [
                {"id": f"q{i+1}", "text": question["text"] if isinstance(question, dict) else question}
                for i, question in enumerate(survey.questions)
            ],
        }
        surveys_container.create_item(new_survey)
        return {"success": True, "message": "Survey added successfully.", "id": new_survey["id"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add survey: {str(e)}")



# Delete a survey by ID
@router.delete("/api/admin/surveys/{survey_id}")
async def delete_survey(survey_id: str):
    try:
        survey = next(
            surveys_container.query_items(
                query="SELECT * FROM c WHERE c.id = @id",
                parameters=[{"name": "@id", "value": survey_id}],
                enable_cross_partition_query=True
            ),
            None
        )
        if not survey:
            raise HTTPException(status_code=404, detail="Survey not found.")
        surveys_container.delete_item(survey["id"], partition_key=survey["id"])
        return {"success": True, "message": "Survey deleted successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete survey: {str(e)}")

@router.get("/api/surveys/{survey_id}")
async def get_survey(survey_id: str, language: str = "en"):
    """Fetch a specific survey by its ID with dynamic translations."""
    try:
        survey = next(
            surveys_container.query_items(
                query="SELECT * FROM c WHERE c.id = @id",
                parameters=[{"name": "@id", "value": survey_id}],
                enable_cross_partition_query=True
            ),
            None
        )
        if not survey:
            raise HTTPException(status_code=404, detail="Survey not found.")
        
        # Translate survey data
        survey["title"] = azure_storage.translate_text(survey["title"], target_language=language)
        survey["description"] = azure_storage.translate_text(survey["description"], target_language=language)
        survey["questions"] = [
            {"id": q["id"], "text": azure_storage.translate_text(q["text"], target_language=language)}
            for q in survey["questions"]
        ]
        return survey
    except Exception as e:
        logger.error(f"Error fetching survey: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch survey.")



@router.get("/api/surveys")
async def get_surveys(language: str = "en"):
    """
    Fetch surveys with dynamic translation based on the selected language.
    """
    try:
        surveys = azure_storage.fetch_surveys(language)
        return {"surveys": surveys}
    except Exception as e:
        logger.error(f"Failed to fetch surveys: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch surveys.")


@router.get("/api/admin/surveys")
async def get_all_surveys():
    """Fetch all surveys with their IDs and titles."""
    try:
        surveys = list(surveys_container.query_items(
            query="SELECT c.id, c.title FROM c",
            enable_cross_partition_query=True
        ))
        return {"surveys": surveys}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch surveys: {str(e)}")


@router.post("/api/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: str = Form(...),
    questionId: str = Form(...),
    generate_questions: bool = Form(False)
):
    try:
        audio_data, samplerate = await AudioProcessor.process_audio(audio, language)
        result = whisper_pipe(
            {"array": audio_data, "sampling_rate": samplerate},
            generate_kwargs={"language": language}
        )
        transcribed_text = result["text"] if isinstance(result, dict) else result
        
        return {"success": True, "text": transcribed_text}
        
    except Exception as e:
        logger.error(f"Error processing audio: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/api/analyze-themes")
async def analyze_themes(request: ThemeAnalysisRequest):
    try:
        themes = thematic_analyzer.extract_themes(request.responses)
        return {"success": True, "themes": themes}
    except Exception as e:
        logger.error(f"Error analyzing themes: {str(e)}", exc_info=True)
        return {"success": False, "error": str(e)}

@router.post("/api/submit-survey")
async def submit_survey(survey_data: SurveyRequest):
    try:
        # Extract original responses for theme analysis
        original_responses = [response.transcription for response in survey_data.responses]
        themes = thematic_analyzer.extract_themes(original_responses)
        
        anonymized_responses = []
        for response in survey_data.responses:
            lang_code = response.language[:2].lower()
            if lang_code not in ['nl', 'en']:
                lang_code = 'en'
            
            anonymized_response = {
                'question_number': response.question_number,
                'language': response.language,
                'question': azure_storage.translate_text(response.question, target_language="nl"),
                'transcription': azure_storage.translate_text(anonymizer.anonymize(response.transcription, language=lang_code), target_language="nl"),
                'themes': themes  # Include themes in the response object
            }
            anonymized_responses.append(anonymized_response)
            
            print(f"Processing response {response.question_number}")
            print(f"Original language: {response.language}")
            print(f"Normalized language code: {lang_code}")
            print(f"Original text: {response.transcription}")
            print(f"Anonymized text: {anonymized_response['transcription']}")
        
        await azure_storage.store_survey_response(anonymized_responses, survey_data.questions)
        return {"success": True, "themes": themes}
    except Exception as e:
        logger.error(f"Error submitting survey: {str(e)}", exc_info=True)
        return {"success": False, "error": str(e)}