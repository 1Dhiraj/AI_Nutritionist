from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import os
from dotenv import load_dotenv
import google.generativeai as genai
from datetime import datetime
import re
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load .env file
load_dotenv()

app = FastAPI()

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Adjust for your frontend port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini API
try:
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    if not GOOGLE_API_KEY:
        logger.error("GOOGLE_API_KEY not found in .env file")
        raise ValueError("GOOGLE_API_KEY not found in .env file")
    genai.configure(api_key=GOOGLE_API_KEY)
except Exception as e:
    logger.error(f"Error configuring Gemini API: {str(e)}")
    raise

# In-memory storage
food_log: List[Dict] = []
chat_history: List[Dict] = []

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

def parse_gemini_response(response_text: str) -> List[Dict]:
    """Parse Gemini response to extract food items."""
    food_items = []
    lines = response_text.split('\n')
    current_item = {}
    for line in lines:
        if line.startswith("- Item:"):
            if current_item:
                food_items.append(current_item)
            current_item = {'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
            try:
                current_item['name'] = line.split("Item: ")[1].split(" - ")[0]
            except IndexError:
                current_item['name'] = "Unknown"
        elif "Calories:" in line:
            match = re.search(r"Calories: ([\d.]+) kcal", line)
            if match:
                current_item['calories'] = float(match.group(1))
        elif "Carbs:" in line:
            match = re.search(r"Carbs: ([\d.]+) g", line)
            if match:
                current_item['carbs'] = float(match.group(1))
        elif "Proteins:" in line:
            match = re.search(r"Proteins: ([\d.]+) g", line)
            if match:
                current_item['proteins'] = float(match.group(1))
        elif "Fats:" in line:
            match = re.search(r"Fats: ([\d.]+) g", line)
            if match:
                current_item['fats'] = float(match.group(1))
    if current_item:
        food_items.append(current_item)
    return food_items

@app.post("/analyze-food")
async def analyze_food(file: UploadFile = File(...)):
    try:
        # Validate image
        if not file.content_type.startswith("image/"):
            logger.warning(f"Invalid file type: {file.content_type}")
            raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image (jpg, jpeg, png).")
        
        # Check file size (e.g., max 5MB)
        content = await file.read()
        if len(content) > 5 * 1024 * 1024:
            logger.warning("File too large")
            raise HTTPException(status_code=400, detail="Image size exceeds 5MB limit.")
        
        logger.info(f"Processing image: {file.filename}")
        input_prompt = """
        You are an expert nutritionist. Analyze the food items in the uploaded image and provide:
        1. A list of identified food items with their estimated calories and macronutrients (carbs, proteins, fats) in the format:
           - Item: [Name] - Calories: [X kcal], Carbs: [X g], Proteins: [X g], Fats: [X g]
        2. Total calories and macronutrient breakdown for the meal.
        3. A brief assessment of the meal's healthiness and suggestions for improvement.
        """
        
        # Try primary model, fallback to flash if it fails
        try:
            model = genai.GenerativeModel('gemini-2.0-flash')
            response = model.generate_content([
                input_prompt,
                {"mime_type": file.content_type, "data": content}
            ])
        except Exception as e:
            logger.warning(f"Primary model failed: {str(e)}. Falling back to gemini-1.5-flash")
            model = genai.GenerativeModel('gemini-2.0-flash')
            response = model.generate_content([
                input_prompt,
                {"mime_type": file.content_type, "data": content}
            ])
        
        if not response.text:
            logger.error("Empty response from Gemini API")
            raise HTTPException(status_code=500, detail="No response from Gemini API. Please try again.")
        
        food_items = parse_gemini_response(response.text)
        food_log.extend(food_items)
        
        summary = {
            "total_calories": sum(item.get('calories', 0) for item in food_log),
            "total_carbs": sum(item.get('carbs', 0) for item in food_log),
            "total_proteins": sum(item.get('proteins', 0) for item in food_log),
            "total_fats": sum(item.get('fats', 0) for item in food_log)
        }
        
        logger.info("Food analysis successful")
        return {
            "analysis": response.text,
            "food_items": food_items,
            "food_log": food_log,
            "summary": summary
        }
    except Exception as e:
        logger.error(f"Error in analyze-food: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@app.post("/chat", response_model=ChatResponse)
async def chat_with_nutritionist(request: ChatRequest):
    try:
        if not request.message.strip():
            logger.warning("Empty chat message received")
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        food_log_str = str([{
            "name": item.get("name"),
            "timestamp": item.get("timestamp"),
            "calories": item.get("calories", 0),
            "carbs": item.get("carbs", 0),
            "proteins": item.get("proteins", 0),
            "fats": item.get("fats", 0)
        } for item in food_log])
        
        try:
            model = genai.GenerativeModel('gemini-2.0-flash')
            prompt = f"You are an expert nutritionist. Provide accurate and helpful nutritional advice based on the following user input: {request.message}. If relevant, refer to the user's food log: {food_log_str}"
            logger.info(f"Sending prompt to Gemini: {prompt[:100]}...")
            response = model.generate_content(prompt)
        except Exception as e:
            logger.warning(f"Primary model failed: {str(e)}. Falling back to gemini-1.5-flash")
            model = genai.GenerativeModel('gemini-2.0-flash')
            response = model.generate_content(prompt)
        
        if not response.text:
            logger.error("Empty chat response from Gemini API")
            raise HTTPException(status_code=500, detail="No response from Gemini API")
        
        chat_history.append({"user": request.message, "bot": response.text})
        logger.info("Chat response successful")
        
        return {"response": response.text}
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error in chat response: {str(e)}")

@app.get("/food-log")
async def get_food_log():
    try:
        summary = {
            "total_calories": sum(item.get('calories', 0) for item in food_log),
            "total_carbs": sum(item.get('carbs', 0) for item in food_log),
            "total_proteins": sum(item.get('proteins', 0) for item in food_log),
            "total_fats": sum(item.get('fats', 0) for item in food_log)
        }
        logger.info("Food log retrieved")
        return {"food_log": food_log, "summary": summary}
    except Exception as e:
        logger.error(f"Error in food-log endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving food log: {str(e)}")

@app.get("/chat-history")
async def get_chat_history():
    try:
        logger.info("Chat history retrieved")
        return {"chat_history": chat_history}
    except Exception as e:
        logger.error(f"Error in chat-history endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving chat history: {str(e)}")