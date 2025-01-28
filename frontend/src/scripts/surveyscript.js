let currentQuestionIndex = 0;
let recording = false;
let mediaRecorder = null;
let audioChunks = [];
let questions = [];
let responses = [];

const translations = {
    en: {
        surveyTitle: "Welcome to the",
        backToHome: "Back to Home",
        surveyintro: "The survey comprises 4 questions. Question 1 is created by the survey creator, followed by 3 personalized AI-generated questions. After completing the survey, you can review and submit your responses. Before your responses are submitted, everything is anonymized.",
        titlePlaceholder: "Survey",
        consentText: "I agree to participate in this survey.",
        generateQuestions: "Generate Questions",
        processing: "processing",
        startSurvey: "Start Survey",
        editButton:"Edit Response",
        question:"Question",
        startRecording: "Start Recording",
        stopRecording: "Stop Recording",
        yourResponse: "Your Response",
        responseWillAppear: "Your response will appear here...",
        previous: "Previous",
        next: "Next",
        review: "Review",
        reviewAnswers: "Review Your Answers",
        submitSurvey: "Submit survey",
        questionCounter: "Question {current} of {total}",
    },
    nl: {
        surveyTitle: "Welkom bij de",
        backToHome: "Terug naar Home",
        surveyintro: "De enquête bestaat uit 4 vragen. Vraag 1 wordt gemaakt door de maker van de enquête, gevolgd door 3 gepersonaliseerde, door AI gegenereerde vragen. Nadat u de enquête heeft ingevuld, kunt u uw antwoorden bekijken en verzenden. Voordat uw antwoorden verstuurd wordt alles geanonimiseerd.",
        titlePlaceholder: "Enquête",
        consentText: "Ik ga akkoord met deelname aan deze enquête.",
        generateQuestions: "Genereer Vragen",
        startSurvey: "Start enquête",
        processing: "Verwerken",
        editButton:"Wijzig Antwoord",
        question:"Vraag",
        startRecording: "Start Opname",
        stopRecording: "Stop Opname",
        yourResponse: "Jouw Antwoord",
        responseWillAppear: "Jouw antwoord verschijnt hier...",
        previous: "Vorige",
        next: "Volgende",
        review: "Beoordeling",
        reviewAnswers: "Controleer uw antwoorden",
        submitSurvey: "enquête indienen",
        questionCounter: "Vraag {current} van {total}",
    }
};


function confirmLeave() {
    // Show the confirmation dialog
    return confirm("Are you sure you want to leave? Your progress may not be saved.");
}

function confirmSubmit() {
    // Show the confirmation dialog
    return confirm("Are you sure you want to submit the survey?");
}


function updateText(language) {
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        if (translations[language] && translations[language][key]) {
            element.textContent = translations[language][key];
        } else {
            console.warn(`Missing translation for key: ${key} in language: ${language}`);
            element.textContent = `[${key}]`; // Fallback to key
        }

        const surveyTitleElement = document.getElementById('surveyTitle');
        if (surveyTitleElement) {
            const surveyTitleText = translations[language]?.surveyTitle || 'Welcome to the';
            const titlePlaceholderText = translations[language]?.titlePlaceholder || 'Survey';

            surveyTitleElement.innerHTML = `${surveyTitleText} <span id="titlePlaceholder">${titlePlaceholderText}</span>`;
        }
    });

}

// Extract language parameter from the URL
function getLanguageFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('language') || 'en'; // Default to 'en' if no language is specified
}

// Initialize the language variable
let language = getLanguageFromUrl();


// Extract survey ID from the URL
function getSurveyIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('surveyId');
}

// Enable the Start Survey button only if consent is given
document.getElementById('consentCheckbox').addEventListener('change', function () {
    const startButton = document.getElementById('startSurveyButton');
    startButton.disabled = !this.checked;
    startButton.classList.toggle('opacity-50', !this.checked);
});

// Existing startSurvey function
function startSurvey() {
    document.getElementById('welcomeSection').classList.add('hidden');
    document.getElementById('surveySection').classList.remove('hidden');
}


async function fetchSurveyData(surveyId) {
    try {
        const response = await fetch(`http://localhost:8000/api/surveys/${surveyId}?language=${language}`);
        if (!response.ok) {
            throw new Error('Failed to fetch survey data');
        }
        const survey = await response.json();
        loadSurvey(survey);
    } catch (error) {
        console.error('Error fetching survey:', error);
        document.getElementById('questionSection').innerHTML = 
            '<p class="text-red-500">Failed to load survey. Please try again later.</p>';
    }
}

// Load the survey data into the page
function loadSurvey(survey) {
    // Set survey title and description on the welcome screen
    document.getElementById('titlePlaceholder').textContent = survey.title || "Default Survey Title";
    document.getElementById('descriptionPlaceholder').textContent = survey.description || "Default survey description.";

    // Set the first question and initialize the questions array
    questions = survey.questions.map(q => q.text); // Populate questions array
    updateQuestionCounter(language); // Display the first question
}


function setLanguage(lang) {
    if (!translations[lang]) {
        console.error(`Language '${lang}' not supported.`);
        return;
    }

    // Update the global language variable
    language = lang;

    // Update UI elements and translations
    updateLanguageButtons();
    updateTranslations();

    // Reload survey data with the selected language
    const surveyId = getSurveyIdFromUrl();
    if (surveyId) {
        fetchSurveyData(surveyId);
    }
}

function updateTranslations() {
    // Update static elements with translations
    document.querySelectorAll('[data-translate]').forEach((element) => {
        const key = element.getAttribute('data-translate');
        if (translations[language] && translations[language][key]) {
            element.textContent = translations[language][key];
        }
    });

    const question = document.getElementById('question');
    if (question) {
        const questionTemplate = translations[language]?.question|| 'Question {current}';
        question.textContent = questionTemplate
            .replace('{current}', currentQuestionIndex + 1)
    }
    

    // Update dynamic content like the question counter
    const questionCounter = document.getElementById('questionCounter');
    if (questionCounter) {
        const questionCounterTemplate = translations[language]?.questionCounter || 'Question {current} of {total}';
        questionCounter.textContent = questionCounterTemplate
            .replace('{current}', currentQuestionIndex + 1)
            .replace('{total}', questions.length);
    }
}

function updateDynamicContent() {
    // Update the Record Button text
    const recordButtonText = document.getElementById('recordButtonText');
    if (recordButtonText) {
        const translationKey = recording ? 'stopRecording' : 'startRecording';
        const buttonText = translations[language]?.[translationKey] || `[${translationKey}]`;
        recordButtonText.textContent = buttonText;
    }

    // Update the Question Counter
    const question = document.getElementById('question');
    if (question) {
        const questionTemplate = translations[language]?.question || 'Question {current}';
        const questionText = questionTemplate
            .replace('{current}', currentQuestionIndex + 1)
        question.textContent = questionText;
    }


    // Update the Question Counter
    const questionCounter = document.getElementById('questionCounter');
    if (questionCounter) {
        const questionCounterTemplate = translations[language]?.questionCounter || 'Question {current} of {total}';
        const questionCounterText = questionCounterTemplate
            .replace('{current}', currentQuestionIndex + 1)
            .replace('{total}', questions.length);
        questionCounter.textContent = questionCounterText;
    }
}

function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        updateQuestionCounter(language);
    } else {
        showReviewSection();
    }
}

// Move to the previous question
function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        updateQuestionCounter(language);
    }
}

function showReviewSection() {
    document.getElementById('questionSection').classList.add('hidden');
    document.getElementById('reviewSection').classList.remove('hidden');
    const reviewResponses = document.getElementById('reviewResponses');
    reviewResponses.innerHTML = '';
    responses.forEach((response, index) => {
        if (response) {
            const responseElement = document.createElement('div');
            responseElement.className = 'p-4 bg-gray-50 rounded-lg';
            responseElement.innerHTML = `
                <h3 class="font-semibold mb-2">Question ${index + 1}: ${response.question}</h3>
                <textarea id="response-${index}" class="w-full p-2 border rounded min-h-[300px]">${response.original}</textarea>
            `;
            reviewResponses.appendChild(responseElement);
        }
    });
}

// Start recording audio
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: { sampleRate: 16000, channelCount: 1 } 
        });
        
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
        });
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            await sendAudioToServer(audioBlob);
        };

        mediaRecorder.start();
        updateRecordingUI(true);

    } catch (err) {
        showError('Error accessing microphone');
    }
}

// Stop recording audio
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        updateRecordingUI(false);
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
}

// Send recorded audio to the server
async function sendAudioToServer(audioBlob) {
    document.getElementById('processingIndicator').classList.remove('hidden');
    try {
        const formData = new FormData();
        formData.append('audio', new File([audioBlob], 'recording.webm', { 
            type: 'audio/webm',
            lastModified: Date.now()
        }));
        formData.append('language', language);
        formData.append('questionId', currentQuestionIndex.toString());
        formData.append('generate_questions', 'false');

        console.log('Sending request with language:', language);
        const response = await fetch('http://localhost:8000/api/transcribe', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        console.log('Received data from server:', data);

        if (data.success) {
            responses[currentQuestionIndex] = {
                question: questions[currentQuestionIndex],
                original: data.text
            };
            
            document.getElementById('originalTranscript').textContent = data.text;
            document.getElementById('editButton').classList.remove('hidden');
            
            const nextButton = document.getElementById('nextButton');
            nextButton.disabled = false;
            nextButton.classList.remove('opacity-50');
        }
    } catch (err) {
        console.error('Error:', err);
        showError('Error processing audio');
    } finally {
        document.getElementById('processingIndicator').classList.add('hidden');
    }
}

// Update the UI for recording state
function updateRecordingUI(isRecording) {
    recording = isRecording;
    const recordButton = document.getElementById('recordButton');
    const recordButtonText = document.getElementById('recordButtonText');
    recordButton.className = `flex items-center space-x-2 px-4 py-2 rounded-full ${isRecording ? 'bg-red-500' : 'bg-blue-500'} text-white`;
    recordButtonText.textContent = isRecording ? 'Stop Recording' : 'Start Recording';
}

// Show error message
function showError(message) {
    const errorAlert = document.getElementById('errorAlert');
    errorAlert.textContent = message;
    errorAlert.classList.remove('hidden');
    setTimeout(() => errorAlert.classList.add('hidden'), 5000);
}

function updateQuestionCounter(language) {
    const questionNumber = currentQuestionIndex + 1;
    const totalQuestions = questions.length;
    
    // 1. Gebruik het vertaalde template voor de vraagcounter
    // (met fallback op Engels als de key niet bestaat)
    let questionCounterText = translations[language]?.questionCounter || translations.en.questionCounter;
    // Vervang de placeholders {current} en {total}
    questionCounterText = questionCounterText
      .replace('{current}', questionNumber)
      .replace('{total}', totalQuestions);
    document.getElementById('questionCounter').textContent = questionCounterText;
  
    // 2. Update de eigenlijke vraagtekst (uit je questions-array)
    document.getElementById('questionText').textContent =
      questions[currentQuestionIndex] || '';
  
    // 3. Pas ook de titel “Question X” of “Vraag X” aan
    const questionTitleKey = translations[language]?.question || translations.en.question;
    document.querySelector('h2.text-2xl.font-semibold').textContent = `${questionTitleKey} ${questionNumber}`;
  
    // 4. Previous button (standaard logica)
    const previousButton = document.getElementById('previousButton');
    previousButton.disabled = currentQuestionIndex === 0;
    previousButton.classList.toggle('opacity-50', currentQuestionIndex === 0);
  
    // 5. Next button
    const nextButton = document.getElementById('nextButton');
    if (currentQuestionIndex === 0) {
      // Op de eerste vraag?
      nextButton.textContent = translations[language]?.generateQuestions || translations.en.generateQuestions;
      nextButton.onclick = generateQuestionsFromResponse;
    } else {
      const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
      nextButton.textContent = isLastQuestion 
        ? (translations[language]?.review || translations.en.review)
        : (translations[language]?.next || translations.en.next);
      nextButton.onclick = nextQuestion;
    }
  
    // 6. Als er een opname bezig is, stop die
    if (recording) {
      stopRecording();
    }
  
    // 7. Toon het antwoord of placeholder
    if (!responses[currentQuestionIndex]) {
      const placeholder = translations[language]?.yourResponseWillAppearHere || translations.en.yourResponseWillAppearHere;
      document.getElementById('originalTranscript').textContent = placeholder;
    } else {
      document.getElementById('originalTranscript').textContent = responses[currentQuestionIndex].original;
    }
  
    // 8. Verberg de edit-button (voor nu)
    const editButton = document.getElementById('editButton');
    if (editButton) {
      editButton.classList.add('hidden');
    }
  }

function saveAndConfirm() {
    const editor = document.getElementById('responseEditor');
    if (editor && responses[currentQuestionIndex]) {
        responses[currentQuestionIndex].original = editor.value;
        document.getElementById('originalTranscript').textContent = editor.value;
        document.getElementById('responseEditMode').classList.add('hidden');
        document.getElementById('responseViewMode').classList.remove('hidden');
        
        // Enable the next/generate button
        const nextButton = document.getElementById('nextButton');
        nextButton.disabled = false;
        nextButton.classList.remove('opacity-50');
    }
}

function saveAndGenerateQuestions() {
    saveAndConfirm();
    generateQuestionsFromResponse();
}

// Submit the survey
async function submitSurvey() {
    // Show a confirmation dialog
    const userConfirmed = confirm("Are you sure you want to submit the survey? You won't be able to make changes after submission.");

    if (!userConfirmed) {
        // User canceled submission
        return;
    }

    try {
        // First save any pending edits
        responses.forEach((_, index) => {
            const textarea = document.getElementById(`response-${index}`);
            if (textarea) {
                responses[index].original = textarea.value;
            }
        });

        const themesResponse = await fetch('http://localhost:8000/api/analyze-themes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                responses: responses.filter(r => r).map(r => r.original)
            })
        });

        const themesData = await themesResponse.json();

        const surveyData = {
            responses: responses.filter(r => r).map((response, index) => ({
                question_number: index + 1,
                language: language,
                transcription: response.original,
                question: response.question
            })),
            questions: questions,
            themes: themesData.themes || []
        };

        const response = await fetch('http://localhost:8000/api/submit-survey', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(surveyData)
        });

        const result = await response.json();
        
        if (result.success) {
            alert('Survey submitted successfully!');
            window.location.href = "thankyou.html"
        } else {
            throw new Error(result.error || 'Failed to submit survey');
        }
    } catch (error) {
        showError(`Failed to submit survey: ${error.message}`);
    }
}

function saveEdit(index) {
    const textarea = document.getElementById(`response-${index}`);
    if (textarea && responses[index]) {
        responses[index].original = textarea.value;
        // Visual feedback for save
        const saveButton = textarea.parentElement.nextElementSibling;
        const originalText = saveButton.textContent;
        saveButton.textContent = 'Saved!';
        saveButton.classList.add('bg-green-500');
        setTimeout(() => {
            saveButton.textContent = originalText;
            saveButton.classList.remove('bg-green-500');
        }, 2000);
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    const surveyId = getSurveyIdFromUrl();
    updateText(language); // Apply translations
    if (surveyId) {
        fetchSurveyData(surveyId);
    } else {
        document.getElementById('questionSection').innerHTML = '<p class="text-red-500">Invalid survey ID. Please return to the homepage.</p>';
    }

    document.getElementById('recordButton').addEventListener('click', () => {
        if (!recording) startRecording();
        else stopRecording();
    });
    setLanguage(language || 'en'); // Set default language
    updateTranslations();
    updateQuestionCounter(language);
});


function enableEditMode() {
    document.getElementById('responseViewMode').classList.add('hidden');
    document.getElementById('responseEditMode').classList.remove('hidden');
    document.getElementById('responseEditor').value = responses[currentQuestionIndex].original;
}

function cancelEdit() {
    document.getElementById('responseEditMode').classList.add('hidden');
    document.getElementById('responseViewMode').classList.remove('hidden');
}

async function generateQuestionsFromResponse() {
    if (!responses[0] || !responses[0].original) {
        showError('Please record your response first');
        return;
    }

    // Show processing indicator
    document.getElementById('processingIndicator').classList.remove('hidden');
    
    try {
        const response = await fetch('http://localhost:8000/api/generate-questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                language: language,
                previous_answer: responses[0].original,
                current_question_number: 1
            })
        });

        const data = await response.json();
        
        if (data.success && data.questions) {
            // Update questions array
            questions = [questions[0], ...data.questions];
            
            // Initialize response slots for new questions
            data.questions.forEach((_, index) => {
                responses[index + 1] = null;
            });
            
            // Move to next question
            currentQuestionIndex++;
            updateQuestionCounter();
        }
    } catch (err) {
        console.error('Error:', err);
        showError('Error generating questions');
    } finally {
        document.getElementById('processingIndicator').classList.add('hidden');
    }
}