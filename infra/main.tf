terraform {
  required_version = ">= 1.7"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
}

# ─── Providers ────────────────────────────────────────────────────────────────

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# ─── Pub/Sub topics ───────────────────────────────────────────────────────────

resource "google_pubsub_topic" "raw_listings" {
  name = "scout-raw-listings"

  message_retention_duration = "86400s" # 24 h
}

resource "google_pubsub_topic" "converter_listings" {
  name = "converter-validated-listings"

  message_retention_duration = "86400s"
}

resource "google_pubsub_topic" "validator_listings" {
  name = "validator-final-listings"

  message_retention_duration = "86400s"
}

# ─── Service account for Cloud Run agent services ─────────────────────────────

resource "google_service_account" "agents" {
  account_id   = "ukfreecomps-agents"
  display_name = "UKFreeComps Agent Services"
  description  = "Shared service account used by scout, converter, and validator Cloud Run services."
}

# Grant the agents SA permission to publish and subscribe on all three topics

resource "google_pubsub_topic_iam_member" "agents_publish_raw" {
  topic  = google_pubsub_topic.raw_listings.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${google_service_account.agents.email}"
}

resource "google_pubsub_topic_iam_member" "agents_publish_converter" {
  topic  = google_pubsub_topic.converter_listings.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${google_service_account.agents.email}"
}

resource "google_pubsub_topic_iam_member" "agents_publish_validator" {
  topic  = google_pubsub_topic.validator_listings.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${google_service_account.agents.email}"
}

resource "google_project_iam_member" "agents_subscriber" {
  project = var.project_id
  role    = "roles/pubsub.editor"
  member  = "serviceAccount:${google_service_account.agents.email}"
}

# ─── Outputs ──────────────────────────────────────────────────────────────────

output "agents_service_account_email" {
  description = "Email of the shared agent service account (use as Cloud Run identity)."
  value       = google_service_account.agents.email
}

output "topic_raw_listings" {
  description = "Pub/Sub topic name for raw scout listings."
  value       = google_pubsub_topic.raw_listings.name
}

output "topic_converter_listings" {
  description = "Pub/Sub topic name for converter-validated listings."
  value       = google_pubsub_topic.converter_listings.name
}

output "topic_validator_listings" {
  description = "Pub/Sub topic name for final validator-approved listings."
  value       = google_pubsub_topic.validator_listings.name
}
