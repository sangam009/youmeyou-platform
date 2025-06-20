# Codaloo Production Environment - GCP Terraform Configuration
# This creates a high-availability production environment with load balancer

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# Configure the Google Cloud Provider
provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "compute.googleapis.com",
    "dns.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "certificatemanager.googleapis.com"
  ])
  
  project = var.project_id
  service = each.value
  
  disable_on_destroy = false
}

# Create VPC Network
resource "google_compute_network" "codaloo_prod_vpc" {
  name                    = "codaloo-prod-vpc"
  auto_create_subnetworks = false
  description             = "VPC for Codaloo production environment"
  
  depends_on = [google_project_service.required_apis]
}

# Create Subnet
resource "google_compute_subnetwork" "codaloo_prod_subnet" {
  name          = "codaloo-prod-subnet"
  ip_cidr_range = "10.1.1.0/24"
  region        = var.region
  network       = google_compute_network.codaloo_prod_vpc.id
  
  # Enable private Google access
  private_ip_google_access = true
}

# Create Cloud Router for NAT
resource "google_compute_router" "codaloo_prod_router" {
  name    = "codaloo-prod-router"
  region  = var.region
  network = google_compute_network.codaloo_prod_vpc.id
}

# Create Cloud NAT for outbound internet access
resource "google_compute_router_nat" "codaloo_prod_nat" {
  name                               = "codaloo-prod-nat"
  router                            = google_compute_router.codaloo_prod_router.name
  region                            = var.region
  nat_ip_allocate_option            = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}

# Reserve static IP for load balancer
resource "google_compute_global_address" "codaloo_prod_ip" {
  name         = "codaloo-prod-ip"
  description  = "Static IP for Codaloo production load balancer"
  address_type = "EXTERNAL"
}

# Firewall rule for load balancer health checks
resource "google_compute_firewall" "allow_health_check" {
  name    = "codaloo-prod-allow-health-check"
  network = google_compute_network.codaloo_prod_vpc.name
  
  allow {
    protocol = "tcp"
    ports    = ["80", "443", "3000", "4000"]
  }
  
  # Google Cloud health check IP ranges
  source_ranges = ["130.211.0.0/22", "35.191.0.0/16"]
  target_tags   = ["codaloo-prod"]
}

# Firewall rule for load balancer
resource "google_compute_firewall" "allow_lb" {
  name    = "codaloo-prod-allow-lb"
  network = google_compute_network.codaloo_prod_vpc.name
  
  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }
  
  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["codaloo-prod"]
}

# Firewall rule for SSH access
resource "google_compute_firewall" "allow_ssh" {
  name    = "codaloo-prod-allow-ssh"
  network = google_compute_network.codaloo_prod_vpc.name
  
  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
  
  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["codaloo-prod"]
}

# Firewall rule for internal communication
resource "google_compute_firewall" "allow_internal" {
  name    = "codaloo-prod-allow-internal"
  network = google_compute_network.codaloo_prod_vpc.name
  
  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }
  
  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }
  
  source_ranges = ["10.1.1.0/24"]
  target_tags   = ["codaloo-prod"]
}

# Create persistent disks for data (one for each VM)
resource "google_compute_disk" "codaloo_prod_data" {
  count = var.vm_count
  name  = "codaloo-prod-data-${count.index + 1}"
  type  = "pd-ssd"
  zone  = var.zone
  size  = var.data_disk_size
  
  labels = {
    environment = "production"
    application = "codaloo"
    instance    = "vm-${count.index + 1}"
  }
}

# Create VM instances
resource "google_compute_instance" "codaloo_prod_vm" {
  count        = var.vm_count
  name         = "codaloo-prod-vm-${count.index + 1}"
  machine_type = var.vm_machine_type
  zone         = var.zone
  
  tags = ["codaloo-prod"]
  
  labels = {
    environment = "production"
    application = "codaloo"
    instance    = "vm-${count.index + 1}"
  }
  
  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
      size  = var.boot_disk_size
      type  = "pd-ssd"
    }
  }
  
  # Attach data disk
  attached_disk {
    source      = google_compute_disk.codaloo_prod_data[count.index].id
    device_name = "data-disk"
  }
  
  network_interface {
    network    = google_compute_network.codaloo_prod_vpc.id
    subnetwork = google_compute_subnetwork.codaloo_prod_subnet.id
    
    # External IP for SSH access (can be removed after setup)
    access_config {
      # Ephemeral IP
    }
  }
  
  # Install Docker and setup environment
  metadata_startup_script = templatefile("${path.module}/scripts/startup.sh", {
    environment = "production"
    vm_index    = count.index + 1
  })
  
  service_account {
    email  = google_service_account.codaloo_prod_sa.email
    scopes = ["cloud-platform"]
  }
  
  # Allow stopping for maintenance
  allow_stopping_for_update = true
}

# Create service account for the VMs
resource "google_service_account" "codaloo_prod_sa" {
  account_id   = "codaloo-prod-sa"
  display_name = "Codaloo Production Service Account"
  description  = "Service account for Codaloo production environment"
}

# IAM binding for the service account
resource "google_project_iam_member" "codaloo_prod_sa_roles" {
  for_each = toset([
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/storage.objectViewer",
    "roles/dns.admin"
  ])
  
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.codaloo_prod_sa.email}"
}

# Create instance group
resource "google_compute_instance_group" "codaloo_prod_group" {
  name        = "codaloo-prod-group"
  description = "Instance group for Codaloo production VMs"
  zone        = var.zone
  
  instances = google_compute_instance.codaloo_prod_vm[*].id
  
  named_port {
    name = "http"
    port = "80"
  }
  
  named_port {
    name = "https"
    port = "443"
  }
  
  named_port {
    name = "web-app"
    port = "3000"
  }
  
  named_port {
    name = "api"
    port = "4000"
  }
}

# Health check for web application
resource "google_compute_health_check" "codaloo_web_health_check" {
  name                = "codaloo-web-health-check"
  description         = "Health check for Codaloo web application"
  timeout_sec         = 5
  check_interval_sec  = 10
  healthy_threshold   = 2
  unhealthy_threshold = 3
  
  http_health_check {
    port         = "3000"
    request_path = "/"
  }
}

# Health check for API
resource "google_compute_health_check" "codaloo_api_health_check" {
  name                = "codaloo-api-health-check"
  description         = "Health check for Codaloo API"
  timeout_sec         = 5
  check_interval_sec  = 10
  healthy_threshold   = 2
  unhealthy_threshold = 3
  
  http_health_check {
    port         = "4000"
    request_path = "/health"
  }
}

# Backend service for web application
resource "google_compute_backend_service" "codaloo_web_backend" {
  name                  = "codaloo-web-backend"
  description           = "Backend service for Codaloo web application"
  protocol              = "HTTP"
  port_name             = "web-app"
  load_balancing_scheme = "EXTERNAL"
  timeout_sec           = 30
  
  backend {
    group           = google_compute_instance_group.codaloo_prod_group.id
    balancing_mode  = "UTILIZATION"
    capacity_scaler = 1.0
  }
  
  health_checks = [google_compute_health_check.codaloo_web_health_check.id]
}

# Backend service for API
resource "google_compute_backend_service" "codaloo_api_backend" {
  name                  = "codaloo-api-backend"
  description           = "Backend service for Codaloo API"
  protocol              = "HTTP"
  port_name             = "api"
  load_balancing_scheme = "EXTERNAL"
  timeout_sec           = 30
  
  backend {
    group           = google_compute_instance_group.codaloo_prod_group.id
    balancing_mode  = "UTILIZATION"
    capacity_scaler = 1.0
  }
  
  health_checks = [google_compute_health_check.codaloo_api_health_check.id]
}

# URL map for routing
resource "google_compute_url_map" "codaloo_url_map" {
  name            = "codaloo-url-map"
  description     = "URL map for Codaloo application routing"
  default_service = google_compute_backend_service.codaloo_web_backend.id
  
  host_rule {
    hosts        = [var.domain_name]
    path_matcher = "main"
  }
  
  host_rule {
    hosts        = ["auth.${var.domain_name}"]
    path_matcher = "api"
  }
  
  host_rule {
    hosts        = ["design.${var.domain_name}"]
    path_matcher = "api"
  }
  
  host_rule {
    hosts        = ["payment.${var.domain_name}"]
    path_matcher = "api"
  }
  
  path_matcher {
    name            = "main"
    default_service = google_compute_backend_service.codaloo_web_backend.id
    
    path_rule {
      paths   = ["/api/*"]
      service = google_compute_backend_service.codaloo_api_backend.id
    }
  }
  
  path_matcher {
    name            = "api"
    default_service = google_compute_backend_service.codaloo_api_backend.id
  }
}

# HTTP(S) proxy
resource "google_compute_target_https_proxy" "codaloo_https_proxy" {
  name             = "codaloo-https-proxy"
  url_map          = google_compute_url_map.codaloo_url_map.id
  ssl_certificates = [google_compute_managed_ssl_certificate.codaloo_ssl_cert.id]
}

# HTTP proxy (redirects to HTTPS)
resource "google_compute_target_http_proxy" "codaloo_http_proxy" {
  name    = "codaloo-http-proxy"
  url_map = google_compute_url_map.codaloo_redirect_url_map.id
}

# URL map for HTTP to HTTPS redirect
resource "google_compute_url_map" "codaloo_redirect_url_map" {
  name = "codaloo-redirect-url-map"
  
  default_url_redirect {
    https_redirect = true
    strip_query    = false
  }
}

# Global forwarding rule for HTTPS
resource "google_compute_global_forwarding_rule" "codaloo_https_forwarding_rule" {
  name       = "codaloo-https-forwarding-rule"
  target     = google_compute_target_https_proxy.codaloo_https_proxy.id
  port_range = "443"
  ip_address = google_compute_global_address.codaloo_prod_ip.address
}

# Global forwarding rule for HTTP
resource "google_compute_global_forwarding_rule" "codaloo_http_forwarding_rule" {
  name       = "codaloo-http-forwarding-rule"
  target     = google_compute_target_http_proxy.codaloo_http_proxy.id
  port_range = "80"
  ip_address = google_compute_global_address.codaloo_prod_ip.address
}

# Managed SSL certificate
resource "google_compute_managed_ssl_certificate" "codaloo_ssl_cert" {
  name = "codaloo-ssl-cert"
  
  managed {
    domains = [
      var.domain_name,
      "auth.${var.domain_name}",
      "design.${var.domain_name}",
      "payment.${var.domain_name}"
    ]
  }
}

# Create Cloud DNS zone
resource "google_dns_managed_zone" "codaloo_prod_zone" {
  count       = var.create_dns_zone ? 1 : 0
  name        = "codaloo-prod-zone"
  dns_name    = "${var.domain_name}."
  description = "DNS zone for Codaloo production environment"
  
  labels = {
    environment = "production"
    application = "codaloo"
  }
}

# DNS A record for main domain
resource "google_dns_record_set" "codaloo_main_a" {
  count        = var.create_dns_zone ? 1 : 0
  name         = "${var.domain_name}."
  managed_zone = google_dns_managed_zone.codaloo_prod_zone[0].name
  type         = "A"
  ttl          = 300
  
  rrdatas = [google_compute_global_address.codaloo_prod_ip.address]
}

# DNS A records for subdomains
resource "google_dns_record_set" "codaloo_subdomain_a" {
  for_each = var.create_dns_zone ? toset([
    "auth.${var.domain_name}.",
    "design.${var.domain_name}.",
    "payment.${var.domain_name}."
  ]) : toset([])
  
  name         = each.key
  managed_zone = google_dns_managed_zone.codaloo_prod_zone[0].name
  type         = "A"
  ttl          = 300
  
  rrdatas = [google_compute_global_address.codaloo_prod_ip.address]
} 