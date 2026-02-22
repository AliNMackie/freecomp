variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "GCP region for all resources."
  type        = string
  default     = "europe-west2"
}

variable "gemini_api_key" {
  description = "Gemini API key passed to the converter and validator Cloud Run services."
  type        = string
  sensitive   = true
  default     = ""
}

variable "gemini_model" {
  description = "Gemini model name used by converter and validator agents."
  type        = string
  default     = "models/gemini-1.5-flash"
}

variable "database_url" {
  description = "Postgres connection string (DATABASE_URL) for the sink agent."
  type        = string
  sensitive   = true
}

variable "use_cloud_sql" {
  description = <<-EOT
    Set to true when Postgres is hosted on Cloud SQL.
    Grants the agents service account roles/cloudsql.client at the project level.
    Leave false for external Postgres providers (Supabase, Neon, self-hosted).
  EOT
  type        = bool
  default     = false
}

variable "db_password" {
  description = "Password for the Cloud SQL user."
  type        = string
  sensitive   = true
}
