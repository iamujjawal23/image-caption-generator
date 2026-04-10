# Use the official Python 3.10 image from Docker Hub
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port that the FastAPI app runs on
EXPOSE 7860

# Command to run the FastAPI app (Hugging Face routes traffic to port 7860 via 0.0.0.0)
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
