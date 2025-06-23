# VM Scheduling for Cost Optimization
# This creates Cloud Scheduler jobs to automatically start/stop the VM

# Enable Cloud Scheduler API
resource "google_project_service" "scheduler_api" {
  service = "cloudscheduler.googleapis.com"
  disable_on_destroy = false
}

# Enable Cloud Functions API
resource "google_project_service" "functions_api" {
  service = "cloudfunctions.googleapis.com"
  disable_on_destroy = false
}

# Service Account for VM operations
resource "google_service_account" "vm_scheduler" {
  account_id   = "vm-scheduler"
  display_name = "VM Scheduler Service Account"
  description  = "Service account for starting and stopping VMs"
}

# IAM role for the service account
resource "google_project_iam_member" "vm_scheduler_compute_admin" {
  project = var.project_id
  role    = "roles/compute.instanceAdmin.v1"
  member  = "serviceAccount:${google_service_account.vm_scheduler.email}"
}

# Cloud Scheduler Job - START VM (9:00 AM IST, Monday-Friday)
resource "google_cloud_scheduler_job" "start_vm" {
  name             = "start-youmeyou-staging-vm"
  description      = "Start YouMeYou staging VM at 9:00 AM IST on weekdays"
  schedule         = "0 9 * * 1-5"  # 9:00 AM, Monday-Friday
  time_zone        = "Asia/Kolkata"
  attempt_deadline = "320s"

  http_target {
    http_method = "POST"
    uri         = "https://compute.googleapis.com/compute/v1/projects/${var.project_id}/zones/${var.zone}/instances/${google_compute_instance.youmeyou_staging_vm.name}/start"
    
    oauth_token {
      service_account_email = google_service_account.vm_scheduler.email
    }
  }

  depends_on = [
    google_project_service.scheduler_api,
    google_service_account.vm_scheduler
  ]
}

# Cloud Scheduler Job - STOP VM (7:00 PM IST, Monday-Friday)
resource "google_cloud_scheduler_job" "stop_vm" {
  name             = "stop-youmeyou-staging-vm"
  description      = "Stop YouMeYou staging VM at 7:00 PM IST on weekdays"
  schedule         = "0 19 * * 1-5"  # 7:00 PM, Monday-Friday
  time_zone        = "Asia/Kolkata"
  attempt_deadline = "320s"

  http_target {
    http_method = "POST"
    uri         = "https://compute.googleapis.com/compute/v1/projects/${var.project_id}/zones/${var.zone}/instances/${google_compute_instance.youmeyou_staging_vm.name}/stop"
    
    oauth_token {
      service_account_email = google_service_account.vm_scheduler.email
    }
  }

  depends_on = [
    google_project_service.scheduler_api,
    google_service_account.vm_scheduler
  ]
}

# Weekend Shutdown - STOP VM (Friday 7:00 PM)
resource "google_cloud_scheduler_job" "weekend_stop_vm" {
  name             = "weekend-stop-youmeyou-staging-vm"
  description      = "Ensure YouMeYou staging VM is stopped for the weekend"
  schedule         = "0 19 * * 5"  # 7:00 PM on Friday
  time_zone        = "Asia/Kolkata"
  attempt_deadline = "320s"

  http_target {
    http_method = "POST"
    uri         = "https://compute.googleapis.com/compute/v1/projects/${var.project_id}/zones/${var.zone}/instances/${google_compute_instance.youmeyou_staging_vm.name}/stop"
    
    oauth_token {
      service_account_email = google_service_account.vm_scheduler.email
    }
  }

  depends_on = [
    google_project_service.scheduler_api,
    google_service_account.vm_scheduler
  ]
}

# Optional: Emergency start job (can be triggered manually)
resource "google_cloud_scheduler_job" "emergency_start_vm" {
  name             = "emergency-start-youmeyou-staging-vm"
  description      = "Emergency start for YouMeYou staging VM (disabled by default)"
  schedule         = "0 0 1 1 0"  # Disabled schedule (Jan 1st on Sunday, which never occurs)
  time_zone        = "Asia/Kolkata"
  attempt_deadline = "320s"

  http_target {
    http_method = "POST"
    uri         = "https://compute.googleapis.com/compute/v1/projects/${var.project_id}/zones/${var.zone}/instances/${google_compute_instance.youmeyou_staging_vm.name}/start"
    
    oauth_token {
      service_account_email = google_service_account.vm_scheduler.email
    }
  }

  depends_on = [
    google_project_service.scheduler_api,
    google_service_account.vm_scheduler
  ]
} 