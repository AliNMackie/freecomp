# ─── Google Cloud SQL Instance ────────────────────────────────────────────────

resource "google_sql_database_instance" "instance" {
  name             = "ukfreecomps-db"
  project          = var.project_id
  region           = var.region
  database_version = "POSTGRES_15"

  settings {
    tier = "db-f1-micro" # Smallest and cheapest instance for dev

    # Public IP access is needed for direct DATABASE_URL connection from apps/web
    # For agents, they will use the Cloud SQL Auth Proxy connector
    ip_configuration {
      ipv4_enabled = true
      
      # For security, you might want to restrict authorized networks later
      # authorized_networks {
      #   name  = "all"
      #   value = "0.0.0.0/0"
      # }
    }

    backup_configuration {
      enabled = true
    }
  }

  deletion_protection = false # Set to true for production to prevent accidental deletion
}

# ─── Database & User ─────────────────────────────────────────────────────────

resource "google_sql_database" "database" {
  name     = "ukfreecomps"
  instance = google_sql_database_instance.instance.name
}

resource "google_sql_user" "user" {
  name     = "ukf_admin"
  instance = google_sql_database_instance.instance.name
  password = var.db_password
}

# ─── Outputs ──────────────────────────────────────────────────────────────────

output "db_instance_connection_name" {
  value = google_sql_database_instance.instance.connection_name
}

output "db_public_ip" {
  value = google_sql_database_instance.instance.public_ip_address
}
