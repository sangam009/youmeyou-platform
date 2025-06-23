# YouMeYou Staging Environment - Simplified for Personal Project
# This configuration creates a VM with public access and SSH security

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

# APIs are enabled manually via gcloud commands
# Required APIs: compute.googleapis.com, dns.googleapis.com, serviceusage.googleapis.com

# VPC Network
resource "google_compute_network" "youmeyou_staging_vpc" {
  name                    = "youmeyou-staging-vpc"
  auto_create_subnetworks = false
}

# Subnet
resource "google_compute_subnetwork" "youmeyou_staging_subnet" {
  name          = "youmeyou-staging-subnet"
  ip_cidr_range = "10.0.1.0/24"
  region        = var.region
  network       = google_compute_network.youmeyou_staging_vpc.id
}

# Cloud Router for NAT
resource "google_compute_router" "youmeyou_staging_router" {
  name    = "youmeyou-staging-router"
  region  = var.region
  network = google_compute_network.youmeyou_staging_vpc.id
}

# NAT Gateway
resource "google_compute_router_nat" "youmeyou_staging_nat" {
  name                               = "youmeyou-staging-nat"
  router                             = google_compute_router.youmeyou_staging_router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# Firewall rule for SSH access
resource "google_compute_firewall" "youmeyou_staging_ssh" {
  name    = "youmeyou-staging-allow-ssh"
  network = google_compute_network.youmeyou_staging_vpc.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["0.0.0.0/0"]  # Restrict this to your IP for better security
  target_tags   = ["youmeyou-staging"]
}

# Firewall rule for HTTP/HTTPS access
resource "google_compute_firewall" "youmeyou_staging_web" {
  name    = "youmeyou-staging-allow-web"
  network = google_compute_network.youmeyou_staging_vpc.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443", "3000", "4000", "9000"]  # Web app, API, Portainer
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["youmeyou-staging"]
}

# Data disk for persistent storage
resource "google_compute_disk" "youmeyou_staging_data" {
  name = "youmeyou-staging-data"
  type = "pd-ssd"
  zone = var.zone
  size = 100

  labels = {
    environment = "staging"
    project     = "youmeyou"
  }
}

# Compute Instance
resource "google_compute_instance" "youmeyou_staging_vm" {
  name         = "youmeyou-staging-vm"
  machine_type = var.machine_type
  zone         = var.zone

  tags = ["youmeyou-staging"]

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
      size  = 50
      type  = "pd-ssd"
    }
  }

  # Attach data disk
  attached_disk {
    source      = google_compute_disk.youmeyou_staging_data.id
    device_name = "youmeyou-data"
  }

  network_interface {
    network    = google_compute_network.youmeyou_staging_vpc.id
    subnetwork = google_compute_subnetwork.youmeyou_staging_subnet.id
    
    # Public IP for direct access
    access_config {
      // Ephemeral public IP
    }
  }

  # Startup script
  metadata_startup_script = templatefile("${path.module}/startup-script.sh", {
    environment = "staging"
  })

  metadata = {
    ssh-keys = "${var.admin_user}:${file(var.ssh_public_key_path)}"
  }

  labels = {
    environment = "staging"
    project     = "youmeyou"
  }

  depends_on = [
    google_compute_disk.youmeyou_staging_data
  ]
} 