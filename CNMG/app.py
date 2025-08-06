from flask import Flask, request, jsonify
import os
import openai  # or groq

app = Flask(__name__)

# Set your API key
openai.api_key = "YOUR_API_KEY"  # or use os.getenv("API_KEY")

@app.route("/chat", methods=["POST"])
def chat():
    user_input = request.json.get("message")

    # Generate AI response
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",  # or "mixtral-8x7b-32768" for Groq
        messages=[
            {"role": "system", "content": "You are a helpful chatbot for complaint management."},
            {"role": "user", "content": user_input}
        ]
    )
    bot_reply = response.choices[0].message["content"]
    return jsonify({"reply": bot_reply})

if __name__ == "__main__":
    app.run(debug=True)
