# 1. Use a lightweight official Python image
FROM python:3.11-slim

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy dependencies first for caching optimization
COPY requirements.txt .

# 4. Install required Python packages
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy your application assets and code files
COPY . .

# 6. Run the localized patching script to inject analytics into the underlying server
RUN python patch_analytics.py

# 7. Expose the standard cloud environment port configuration
EXPOSE 8080

# 8. Start the application bound to the environment port
CMD ["streamlit", "run", "app.py", "--server.port=8080", "--server.address=0.0.0.0"]