import { useState, useEffect } from 'react';
import './App.css'; // Ensure Tailwind is set up

const App = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analysis, setAnalysis] = useState('');
  const [foodLog, setFoodLog] = useState([]);
  const [summary, setSummary] = useState({});
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFoodLog();
    fetchChatHistory();
  }, []);

  const fetchFoodLog = async () => {
    try {
      const response = await fetch('http://localhost:8000/food-log');
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      console.log('Food log fetched:', data); // Debug
      setFoodLog(data.food_log || []);
      setSummary(data.summary || {});
    } catch (err) {
      setError(`Failed to fetch food log: ${err.message}`);
      console.error(err);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const response = await fetch('http://localhost:8000/chat-history');
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      console.log('Chat history fetched:', data); // Debug
      setChatHistory(data.chat_history || []);
    } catch (err) {
      setError(`Failed to fetch chat history: ${err.message}`);
      console.error(err);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setAnalysis(''); // Clear previous analysis
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        setError('Please upload a valid image (jpg, jpeg, png).');
        setPreview(null);
        setFile(null);
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('Image size exceeds 5MB limit.');
        setPreview(null);
        setFile(null);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError('Please upload an image');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('http://localhost:8000/analyze-food', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      console.log('Analysis response:', data); // Debug
      setAnalysis(data.analysis || 'No analysis provided.');
      setFoodLog(data.food_log || []);
      setSummary(data.summary || {});
    } catch (err) {
      setError(`Failed to analyze image: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) {
      setError('Please enter a message');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chatInput }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      console.log('Chat response:', data); // Debug
      setChatHistory([...chatHistory, { user: chatInput, bot: data.response }]);
      setChatInput('');
    } catch (err) {
      setError(`Failed to get chat response: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="main" className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold text-center mb-6">🍎 NutriScan AI</h1>
      <p className="text-center mb-8">Upload a food photo to track nutrients or chat with our AI nutritionist!</p>
      {error && <p className="text-red-500 text-center mb-4">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">📸 Scan Your Meal</h2>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="mb-4"
          />
          {preview && (
            <img src={preview} alt="Preview" className="w-full h-64 object-cover mb-4 rounded" />
          )}
          <button
            id="analyze-button"
            onClick={handleAnalyze}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Analyzing...' : 'Analyze Food'}
          </button>
          {analysis && (
            <div className="mt-4">
              <h3 className="text-xl font-semibold">Meal Analysis</h3>
              <pre className="bg-gray-100 p-4 rounded whitespace-pre-wrap">{analysis}</pre>
            </div>
          )}
          <h2 className="text-2xl font-semibold mt-6 mb-4">📊 Food Log</h2>
          {foodLog.length > 0 ? (
            <>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border p-2">Time</th>
                    <th className="border p-2">Food</th>
                    <th className="border p-2">Calories (kcal)</th>
                    <th className="border p-2">Carbs (g)</th>
                    <th className="border p-2">Proteins (g)</th>
                    <th className="border p-2">Fats (g)</th>
                  </tr>
                </thead>
                <tbody>
                  {foodLog.map((item, index) => (
                    <tr key={index}>
                      <td className="border p-2">{item.timestamp}</td>
                      <td className="border p-2">{item.name || 'Unknown'}</td>
                      <td className="border p-2">{item.calories?.toFixed(2) || '-'}</td>
                      <td className="border p-2">{item.carbs?.toFixed(2) || '-'}</td>
                      <td className="border p-2">{item.proteins?.toFixed(2) || '-'}</td>
                      <td className="border p-2">{item.fats?.toFixed(2) || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4">
                <h3 className="text-xl font-semibold">Daily Summary</h3>
                <p>Total Calories: {summary.total_calories?.toFixed(2) || 0} kcal</p>
                <p>Total Carbs: {summary.total_carbs?.toFixed(2) || 0} g</p>
                <p>Total Proteins: {summary.total_proteins?.toFixed(2) || 0} g</p>
                <p>Total Fats: {summary.total_fats?.toFixed(2) || 0} g</p>
              </div>
            </>
          ) : (
            <p>No food logged yet.</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">💬 AI Nutritionist</h2>
          <div className="h-64 overflow-y-auto bg-gray-100 p-4 rounded mb-4">
            {chatHistory.map((chat, index) => (
              <div key={index} className="mb-2">
                <p className="font-bold">You:</p>
                <p>{chat.user}</p>
                <p className="font-bold">Nutritionist:</p>
                <p>{chat.bot}</p>
                <hr className="my-2" />
              </div>
            ))}
          </div>
          <form onSubmit={handleChatSubmit} className="flex">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about nutrition or diet plans..."
              className="flex-1 border p-2 rounded-l"
            />
            <button
              id="send-button"
              type="submit"
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded-r hover:bg-green-600 disabled:bg-gray-400"
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default App;