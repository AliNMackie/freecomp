project_id = "freecomp-488221"
region     = "europe-west2"

# Required: Provide your Postgres connection string (e.g. from Supabase or Neon)
database_url = "" 

# Required: Provide your Google AI (Gemini) API Key
gemini_api_key = "AIzaSyAYTjjth1jbz5s5zOIG1wy_OPrJjnFT9IM"

# Set to true to provision and use Google Cloud SQL (Postgres)
use_cloud_sql = true

# Required if use_cloud_sql is true: Provide a strong password for the DB user
db_password = ""
