import torch

class Config:
    DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"
    TORCH_DTYPE = torch.float16 if torch.cuda.is_available() else torch.float32
    
    # Azure Configuration
    BLOB_CONNECTION_STRING = "DefaultEndpointsProtocol=https;AccountName=surveyqueue;AccountKey=POU/qa+mqAA7COg+e1QXMhc53rSnjJvdmKco9vGuvRkKX2w9e/04xRnN2unaUU8K+fPuHq0YAc82+AStR9exzA==;EndpointSuffix=core.windows.net"
    COSMOS_DB_ENDPOINT = "https://surveysprojectdb.documents.azure.com:443/"
    COSMOS_DB_KEY = "OLyKKl2jZv0gJCH4XopmDc8iOx860mmyJBjUGohlEvODsUMUOnSYq0Wnh7OoM3Vog4oz6L5aJb1ZACDbwyTGGw=="
    COSMOS_CONNECTION_STRING = "AccountEndpoint=https://surveysprojectdb.documents.azure.com:443/;AccountKey=OLyKKl2jZv0gJCH4XopmDc8iOx860mmyJBjUGohlEvODsUMUOnSYq0Wnh7OoM3Vog4oz6L5aJb1ZACDbwyTGGw==;"
    QUEUE_NAME = "teamqueue"
    COSMOS_DATABASE_NAME = "surveyplatform"
    ANSWERS_CONTAINER_NAME = "answers"
    SURVEYS_CONTAINER_NAME = "surveys"

    # Azure Translator Configuration
    TRANSLATOR_ENDPOINT = "https://api.cognitive.microsofttranslator.com"
    TRANSLATOR_KEY = "77EZ4990NMgqqmuUIZfgXF0EpKoAuWN1irSh04eP2h9UpcvYiNmBJQQJ99BAAC5T7U2XJ3w3AAAbACOGmwg9"  # Replace with your Azure Translator key
    TRANSLATOR_REGION = "francecentral"       # Replace with your Azure resource region
    
    
    MODELS = {
        'whisper': "openai/whisper-large-v3",
        'question': "microsoft/phi-2",
        'translation': "facebook/nllb-200-distilled-600M"
    }
    
    TECHNICAL_TERMS = {
        'Docker', 'C#', 'JavaScript', 'Python', 'Java', 'React', 'Node.js',
        'HTML', 'CSS', 'PHP', 'Ruby', 'SQL', 'TypeScript', 'Angular', 'Vue.js',
        'Django', 'Flask', 'Spring', 'Laravel', 'Express.js', 'MongoDB', 'PostgreSQL',
        'MySQL', 'Redis', 'Kubernetes', 'Git', 'AWS', 'Azure', 'GCP', 'Linux', 'Unix'
    }