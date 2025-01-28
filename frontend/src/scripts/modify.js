async function getSurveyDetails(surveyId) {
    const surveyDetailsContainer = document.getElementById("surveyDetails");
    const deleteButton = document.getElementById("deleteButton");

    try {
        const response = await fetch(`http://localhost:8000/api/surveys/${surveyId}`);
        if (!response.ok) {
            throw new Error("Failed to fetch survey details.");
        }
        const survey = await response.json();

        surveyDetailsContainer.innerHTML = `
            <div>
                <label class="block text-sm font-medium text-gray-700">Title</label>
                <input id="surveyTitle" type="text" value="${survey.title}" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
            </div>
            <div class="mt-4">
                <label class="block text-sm font-medium text-gray-700">Description</label>
                <textarea id="surveyDescription" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">${survey.description}</textarea>
            </div>
            <div class="mt-4">
                <label class="block text-sm font-medium text-gray-700">Questions (JSON format)</label>
                <textarea id="surveyQuestions" rows="10" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    ${JSON.stringify(survey.questions, null, 2)}
                </textarea>
            </div>

            <button id="updateButton" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Update Survey</button>
        `;
        deleteButton.classList.remove("hidden");

        document.getElementById("updateButton").addEventListener("click", async () => {
            const updatedSurvey = {
                title: document.getElementById("surveyTitle").value,
                description: document.getElementById("surveyDescription").value,
                questions: JSON.parse(document.getElementById("surveyQuestions").value), // Ensure JSON format
            };
        
            try {
                const surveyId = new URLSearchParams(window.location.search).get("surveyId");
                const updateResponse = await fetch(`http://localhost:8000/api/admin/surveys/${surveyId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updatedSurvey),
                });
        
                if (updateResponse.ok) {
                    alert("Survey updated successfully!");
                    window.location.href = "admin.html"; // Redirect to admin page
                } else {
                    const errorData = await updateResponse.json();
                    alert(`Failed to update survey: ${errorData.detail}`);
                }
            } catch (error) {
                console.error("Error updating survey:", error);
                alert("Failed to update survey.");
            }
        });
        

        deleteButton.addEventListener("click", async () => {
            if (!confirm("Are you sure you want to delete this survey?")) return;

            try {
                const deleteResponse = await fetch(`http://localhost:8000/api/admin/surveys/${surveyId}`, {
                    method: "DELETE",
                });

                if (deleteResponse.ok) {
                    alert("Survey deleted successfully!");
                    window.location.href = "admin.html";
                } else {
                    alert("Failed to delete survey.");
                }
            } catch (error) {
                console.error("Error deleting survey:", error);
                alert("Failed to delete survey.");
            }
        });
    } catch (error) {
        console.error("Error fetching survey details:", error);
        surveyDetailsContainer.innerHTML = "<p class='text-red-500'>Failed to load survey details.</p>";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const surveyId = params.get("surveyId");

    if (surveyId) {
        getSurveyDetails(surveyId);
    } else {
        document.getElementById("surveyDetails").innerHTML = "<p class='text-red-500'>Invalid survey ID.</p>";
    }
});
