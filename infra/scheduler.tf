# ─── Enable Cloud Scheduler API ──────────────────────────────────────────────
# (Safe to apply even if already enabled — Terraform is idempotent here.)

resource "google_project_service" "cloudscheduler" {
  project            = var.project_id
  service            = "cloudscheduler.googleapis.com"
  disable_on_destroy = false
}

# ─── IAM — allow the agents SA to invoke the scout Cloud Run service ──────────
# Cloud Scheduler signs requests using the SA's OIDC token; Cloud Run checks
# that the token's principal has roles/run.invoker on the target service.
# This binding already exists in cloudrun.tf for SA→SA calls, but we add an
# explicit one scoped to the scheduler context for clarity and auditability.

resource "google_cloud_run_service_iam_member" "scheduler_scout_invoker" {
  project  = var.project_id
  location = var.region
  service  = google_cloud_run_v2_service.scout.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.agents.email}"
}

# ─── Cloud Scheduler job ──────────────────────────────────────────────────────

resource "google_cloud_scheduler_job" "scout_hourly" {
  name             = "scout-hourly-trigger"
  description      = "Triggers the scout agent every hour to crawl competition listings."
  project          = var.project_id
  region           = var.region
  schedule         = "0 * * * *" # top of every hour
  time_zone        = "Europe/London"
  attempt_deadline = "30s"

  # Retry up to 3 times with exponential back-off on transient errors
  retry_config {
    retry_count          = 3
    min_backoff_duration = "5s"
    max_backoff_duration = "60s"
    max_doublings        = 3
  }

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.scout.uri}/trigger"

    body = base64encode(jsonencode({
      source = "cloud-scheduler"
    }))

    headers = {
      "Content-Type" = "application/json"
    }

    oidc_token {
      service_account_email = google_service_account.agents.email
      # audience must match the Cloud Run service URL (no trailing slash)
      audience = google_cloud_run_v2_service.scout.uri
    }
  }

  depends_on = [google_project_service.cloudscheduler]
}

# ─── Outputs ──────────────────────────────────────────────────────────────────

output "scout_scheduler_job_name" {
  description = "Fully-qualified Cloud Scheduler job name."
  value       = google_cloud_scheduler_job.scout_hourly.id
}
