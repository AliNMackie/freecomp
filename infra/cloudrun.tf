# ─── Locals ───────────────────────────────────────────────────────────────────

locals {
  common_annotations = {
    "run.googleapis.com/launch-stage" = "GA"
  }
}

# ─── Cloud Run v2 — scout-agent ───────────────────────────────────────────────

resource "google_cloud_run_v2_service" "scout" {
  name     = "scout-agent"
  location = var.region

  template {
    service_account = google_service_account.agents.email

    annotations = local.common_annotations

    containers {
      image = "gcr.io/${var.project_id}/scout:latest"

      env {
        name  = "PUBSUB_TOPIC"
        value = google_pubsub_topic.raw_listings.name
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

# ─── Cloud Run v2 — converter-agent ──────────────────────────────────────────

resource "google_cloud_run_v2_service" "converter" {
  name     = "converter-agent"
  location = var.region

  template {
    service_account = google_service_account.agents.email

    annotations = local.common_annotations

    containers {
      image = "gcr.io/${var.project_id}/converter:latest"

      env {
        name  = "INPUT_TOPIC"
        value = google_pubsub_topic.raw_listings.name
      }

      env {
        name  = "OUTPUT_TOPIC"
        value = google_pubsub_topic.converter_listings.name
      }

      env {
        name  = "GEMINI_API_KEY"
        value = var.gemini_api_key
      }

      env {
        name  = "GEMINI_MODEL"
        value = var.gemini_model
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

# ─── Cloud Run v2 — validator-agent ──────────────────────────────────────────

resource "google_cloud_run_v2_service" "validator" {
  name     = "validator-agent"
  location = var.region

  template {
    service_account = google_service_account.agents.email

    annotations = local.common_annotations

    containers {
      image = "gcr.io/${var.project_id}/validator:latest"

      env {
        name  = "INPUT_TOPIC"
        value = google_pubsub_topic.converter_listings.name
      }

      env {
        name  = "OUTPUT_TOPIC"
        value = google_pubsub_topic.validator_listings.name
      }

      env {
        name  = "GEMINI_API_KEY"
        value = var.gemini_api_key
      }

      env {
        name  = "GEMINI_MODEL"
        value = var.gemini_model
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

# ─── Cloud Run v2 — sink-agent ───────────────────────────────────────────────
# Subscribes to validator-final-listings and upserts records into Postgres.

resource "google_cloud_run_v2_service" "sink" {
  name     = "sink-agent"
  location = var.region

  template {
    service_account = google_service_account.agents.email

    annotations = local.common_annotations

    containers {
      image = "gcr.io/${var.project_id}/sink:latest"

      env {
        name  = "INPUT_TOPIC"
        value = google_pubsub_topic.validator_listings.name
      }

      env {
        name  = "DATABASE_URL"
        value = var.database_url
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

# ─── IAM — Pub/Sub subscriber for the sink topic ─────────────────────────────
# The project-level roles/pubsub.subscriber in main.tf already covers all
# topics, but this topic-scoped binding makes the intent explicit and provides
# defence-in-depth: if the project-level binding is ever removed, sink still
# works.

resource "google_pubsub_topic_iam_member" "sink_subscribe_validator" {
  topic  = google_pubsub_topic.validator_listings.name
  role   = "roles/pubsub.subscriber"
  member = "serviceAccount:${google_service_account.agents.email}"
}

# ─── IAM — Cloud SQL client (conditional) ────────────────────────────────────
# Set var.use_cloud_sql = true in terraform.tfvars when Postgres is hosted on
# Cloud SQL. For external Postgres (Supabase, Neon, self-hosted) leave false —
# DATABASE_URL alone is sufficient and no extra GCP IAM is needed.
#
# If using Cloud SQL you will also want to attach the Cloud SQL Auth Proxy as a
# sidecar, or configure the Cloud Run connector — that is out of scope for this
# file but documented in infra/README.md.

resource "google_project_iam_member" "agents_cloudsql_client" {
  count   = var.use_cloud_sql ? 1 : 0
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.agents.email}"
}

# ─── IAM — allow agents SA to invoke each Cloud Run service ──────────────────
# (Needed if services call each other via HTTP; also satisfies Cloud Run's
#  requirement for the runtime SA to have run.routes.invoke on itself.)


resource "google_cloud_run_service_iam_member" "scout_invoker" {
  project  = var.project_id
  location = var.region
  service  = google_cloud_run_v2_service.scout.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.agents.email}"
}

resource "google_cloud_run_service_iam_member" "converter_invoker" {
  project  = var.project_id
  location = var.region
  service  = google_cloud_run_v2_service.converter.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.agents.email}"
}

resource "google_cloud_run_service_iam_member" "validator_invoker" {
  project  = var.project_id
  location = var.region
  service  = google_cloud_run_v2_service.validator.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.agents.email}"
}

resource "google_cloud_run_service_iam_member" "sink_invoker" {
  project  = var.project_id
  location = var.region
  service  = google_cloud_run_v2_service.sink.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.agents.email}"
}

# ─── Outputs ──────────────────────────────────────────────────────────────────

output "scout_url" {
  description = "Cloud Run URL for the scout agent."
  value       = google_cloud_run_v2_service.scout.uri
}

output "converter_url" {
  description = "Cloud Run URL for the converter agent."
  value       = google_cloud_run_v2_service.converter.uri
}

output "validator_url" {
  description = "Cloud Run URL for the validator agent."
  value       = google_cloud_run_v2_service.validator.uri
}

output "sink_url" {
  description = "Cloud Run URL for the sink agent."
  value       = google_cloud_run_v2_service.sink.uri
}
