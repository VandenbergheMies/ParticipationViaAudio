


document.addEventListener('DOMContentLoaded', () => {
    const surveyContainer = document.getElementById('survey-container');
    const languageSelect = document.getElementById('language-select');

    const translations = {
        en: {
            welcomeTitle: "Welcome to the Survey Platform",
            welcomeDescription: "Explore the surveys available below and share your feedback.",
            surveyHeader: "Available Surveys",
            footerText: "© 2025 Survey Platform",
            noSurveys: "No surveys available at the moment.",
            loading: "Loading surveys...",
            loadError: "Failed to load surveys. Please try again later."
        },
        nl: {
            welcomeTitle: "Welkom bij het enquêteplatform",
            welcomeDescription: "Ontdek de beschikbare enquêtes hieronder en deel uw feedback.",
            surveyHeader: "Beschikbare enquêtes",
            footerText: "© 2025 Enquêteplatform",
            noSurveys: "Momenteel geen enquêtes beschikbaar.",
            loading: "Enquêtes laden...",
            loadError: "Kon enquêtes niet laden. Probeer het later opnieuw."
        }
    };

    // Function to update static text
    function updateText(language) {
        document.getElementById('welcome-title').textContent = translations[language].welcomeTitle;
        document.getElementById('welcome-description').textContent = translations[language].welcomeDescription;
        document.getElementById('survey-header').textContent = translations[language].surveyHeader;
        document.getElementById('footer-text').textContent = translations[language].footerText;
    }

    // Update static text for error messages
    function updateErrorMessage(language, type) {
        const messages = translations[language] || translations.en;
        return messages[type];
    }

        // Fetch surveys from the backend
    async function fetchSurveys(language) {
        surveyContainer.innerHTML = `<p class="text-gray-500">${updateErrorMessage(language, 'loading')}</p>`;
        try {
            const response = await fetch(`/api/surveys?language=${language}`);
            if (!response.ok) {
                throw new Error('Failed to fetch surveys');
            }
            const data = await response.json();
            if (data.surveys && data.surveys.length > 0) {
                loadSurveys(data.surveys);
            } else {
                surveyContainer.innerHTML = `<p class="text-gray-700">${updateErrorMessage(language, 'noSurveys')}</p>`;
            }
        } catch (error) {
            console.error('Error fetching surveys:', error);
            surveyContainer.innerHTML = `<p class="text-red-500">${updateErrorMessage(language, 'loadError')}</p>`;
        }
    }

    

    // Load surveys into the list
    function loadSurveys(surveys) {
        surveyContainer.innerHTML = ''; // Clear previous content
        surveys.forEach((survey) => {
            const li = document.createElement('li');
            li.className = 'p-4 bg-gray-100 rounded shadow space-y-4 text-center';
            li.innerHTML = `
                <h3 class="text-lg font-bold">${survey.title}</h3>
                <p class="text-gray-700">${survey.description}</p>
                <div class="flex justify-center">
                    <button onclick="navigateToSurvey('${survey.id}')" 
                            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200">
                        Start Survey
                    </button>
                </div>
            `;
            surveyContainer.appendChild(li);
        });
    }

    function navigateToSurvey(surveyId) {
        const selectedLanguage = document.getElementById("language-select").value || "en"; // Assuming a language dropdown
        window.location.href = `survey.html?surveyId=${surveyId}&language=${selectedLanguage}`;
    }
    

    // Navigate to survey page
    window.navigateToSurvey = (surveyId) => {
        navigateToSurvey(surveyId);
    };

    // Handle language change
    languageSelect.addEventListener('change', (event) => {
        const selectedLanguage = event.target.value;
        updateText(selectedLanguage);
        fetchSurveys(selectedLanguage);
    });

    // Initialize the homepage
    const defaultLanguage = languageSelect.value || 'en';
    updateText(defaultLanguage);
    fetchSurveys(defaultLanguage);
});
