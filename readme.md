NutriScan AI
NutriScan AI is a web application that allows users to scan food images to track calories and macronutrients and chat with an AI nutritionist powered by the Gemini API. The backend is built with FastAPI, and the frontend uses React with Tailwind CSS for styling.
Features

Food Scanning: Upload images of meals to get a detailed analysis of food items, estimated calories, macronutrients (carbs, proteins, fats), and healthiness assessment.
Nutrition Tracking: Log food items and view a summary of daily calorie and macronutrient intake.
AI Nutritionist: Chat with an AI nutritionist for personalized dietary advice based on your food log.
Responsive Design: A clean, two-column UI for easy navigation on desktop and mobile devices.

Tech Stack

Backend: FastAPI (Python), Gemini API for image analysis and chat, python-dotenv for environment variables.
Frontend: React, Tailwind CSS, Vite (or Create React App) for development.
Storage: In-memory storage for food logs and chat history (extendable to a database like SQLite).

Prerequisites

Python 3.8+
Node.js 18+
Gemini API key from Google AI Studio
A modern web browser (e.g., Chrome, Firefox)

Setup Instructions
Backend Setup

Clone the Repository (if applicable):
git clone <repository-url>
cd nutriscan

Create a Virtual Environment:
python -m venv venv
source venv/bin/activate # On Windows: venv\Scripts\activate

Install Dependencies:
pip install fastapi uvicorn python-dotenv google-generativeai

Set Up Environment Variables:

Create a .env file in the project root:GOOGLE_API_KEY=your_api_key_here

Obtain a Gemini API key from Google AI Studio.

Run the Backend:
uvicorn main:app --reload

The backend will run at http://localhost:8000.

Frontend Setup

Create a React Project (if not already set up):
npm create vite@latest nutriscan-frontend -- --template react
cd nutriscan-frontend
npm install

Install Tailwind CSS:
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

Update tailwind.config.js:
/** @type {import('tailwindcss').Config} \*/
export default {
content: ['./index.html', './src/**/\*.{js,ts,jsx,tsx}'],
theme: { extend: {} },
plugins: [],
};

Add to src/index.css or src/App.css:
@tailwind base;
@tailwind components;
@tailwind utilities;

Add App.jsx:

Replace src/App.jsx with the provided code (see App.jsx in the project files).
Ensure src/App.css includes Tailwind directives or imports index.css.

Run the Frontend:
npm run dev

The frontend will run at http://localhost:5173 (default Vite port). Update the backend’s CORS settings in main.py if using a different port:
app.add_middleware(
CORSMiddleware,
allow_origins=["http://localhost:5173", "http://localhost:3000"],
allow_credentials=True,
allow_methods=["*"],
allow_headers=["*"],
)

Project Structure
nutriscan/
├── main.py # FastAPI backend
├── .env # Environment variables (GOOGLE_API_KEY)
├── nutriscan-frontend/
│ ├── src/
│ │ ├── App.jsx # React frontend component
│ │ ├── App.css # Tailwind styles
│ │ ├── index.css # Tailwind base styles
│ ├── tailwind.config.js
│ ├── package.json
└── README.md # This file

Usage

Start the Backend:
uvicorn main:app --reload

Start the Frontend:
cd nutriscan-frontend
npm run dev

Access the App:

Open http://localhost:5173 in your browser.
Scan a Meal: Upload a JPG/PNG image (under 5MB) and click "Analyze Food" to view calorie and macronutrient details.
Track Nutrition: View logged food items and daily summaries in the Food Log section.
Chat with AI Nutritionist: Enter questions (e.g., “Is my diet balanced?”) to get personalized advice based on your food log.

API Endpoints

POST /analyze-food: Upload an image to analyze food items and log nutrients.
Request: multipart/form-data with file (image).
Response: JSON with analysis, food_items, food_log, and summary.

POST /chat: Send a chat message to the AI nutritionist.
Request: JSON with message (string).
Response: JSON with response (AI reply).

GET /food-log: Retrieve the food log and summary.
GET /chat-history: Retrieve the chat history.

Troubleshooting

No Response After Image Upload:
Check the browser’s Network tab for the /analyze-food request status and response.
Verify backend logs for errors (e.g., ERROR:root:Error in analyze-food: <details>).
Ensure the image is a valid JPG/PNG under 5MB.
Test the endpoint:curl -X POST http://localhost:8000/analyze-food -F "file=@/path/to/image.jpg"

500 Internal Server Error:
Check backend logs for Gemini API errors (e.g., invalid key, rate limits).
Verify .env file has a valid GOOGLE_API_KEY.
Test the Gemini API:import google.generativeai as genai
genai.configure(api_key="your_api_key_here")
model = genai.GenerativeModel('gemini-1.5-flash')
print(model.generate_content("Test").text)

CORS Issues:
Ensure the frontend port is listed in main.py’s CORS allow_origins.

Frontend Errors:
Check the browser Console for JavaScript errors.
Verify Tailirono

System: Limitations:

Image Analysis Accuracy: Gemini API may misidentify foods or estimate portions inaccurately. Use clear, well-lit images for better results.
Storage: Food logs and chat history are stored in memory and reset on server restart. Consider integrating a database (e.g., SQLite) for persistence.
API Quotas: Gemini API has rate limits. Monitor usage in Google Cloud Console.

Development

Backend Enhancements:
Add a database (e.g., SQLite, MongoDB) for persistent storage.
Implement user authentication for personalized logs.
Add support for barcode scanning for packaged foods.

Frontend Enhancements:
Add loading spinners or progress bars for image uploads.
Implement manual food log editing.
Enhance UI with additional visualizations (e.g., nutrient charts).

License
This project is licensed under the MIT License.

Note: This project uses the Gemini API, which requires a valid API key. Ensure compliance with Google’s API usage policies.
