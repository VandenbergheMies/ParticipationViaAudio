// Add Survey
document.getElementById("addSurveyForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = document.getElementById("title").value;
    const description = document.getElementById("description").value;
    const questions = document.getElementById("questions").value;

    try {
        const response = await fetch("http://localhost:8000/api/admin/surveys", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                title,
                description,
                questions: JSON.parse(questions), // Parse JSON input
            }),
        });

        if (response.ok) {
            const data = await response.json();
            alert(`Survey added successfully! ID: ${data.id}`);
            document.getElementById("addSurveyForm").reset();
        } else {
            const errorData = await response.json();
            alert(`Failed to add survey: ${errorData.detail}`);
        }
    } catch (error) {
        console.error("Error adding survey:", error);
        alert("Failed to add survey.");
    }
});


// Fetch and display surveys with clickable links
async function loadSurveysForModification() {
    const surveyListContainer = document.getElementById("surveyList");

    try {
        const response = await fetch("http://localhost:8000/api/admin/surveys");
        if (!response.ok) {
            throw new Error("Failed to fetch surveys.");
        }
        const data = await response.json();

        if (data.surveys && data.surveys.length > 0) {
            surveyListContainer.innerHTML = ""; // Clear loading text
            data.surveys.forEach((survey) => {
                const surveyElement = document.createElement("div");
                surveyElement.className = "flex items-center space-x-2";
                surveyElement.innerHTML = `
                    <a href="modify.html?surveyId=${survey.id}" class="text-blue-500 hover:underline">
                        ${survey.title} (ID: ${survey.id})
                    </a>
                `;
                surveyListContainer.appendChild(surveyElement);
            });
        } else {
            surveyListContainer.innerHTML = "<p class='text-gray-500'>No surveys found.</p>";
        }
    } catch (error) {
        console.error("Error fetching surveys:", error);
        surveyListContainer.innerHTML = "<p class='text-red-500'>Failed to load surveys.</p>";
    }
}

// Load surveys when the page is ready
document.addEventListener("DOMContentLoaded", loadSurveysForModification);

document.addEventListener("DOMContentLoaded", () => {
    // Add event listener for the "Download All Surveys as JSON" button
    const downloadButton = document.getElementById("downloadJsonButton");

    downloadButton.addEventListener("click", async () => {
        try {
            // Fetch surveys data from the backend API
            const response = await fetch("/api/surveys", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            // Check if the request was successful
            if (!response.ok) {
                throw new Error(`Failed to fetch surveys: ${response.statusText}`);
            }

            const surveys = await response.json();

            // Convert the surveys data to a JSON string
            const jsonString = JSON.stringify(surveys, null, 2);

            // Create a Blob from the JSON string
            const blob = new Blob([jsonString], { type: "application/json" });

            // Create a temporary link to trigger the download
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "surveys.json"; // Name of the downloaded file
            document.body.appendChild(a);
            a.click();

            // Clean up
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log("Surveys downloaded successfully.");
        } catch (error) {
            console.error("Error downloading surveys:", error.message);
            alert("Failed to download surveys. Please try again later.");
        }
    });
});