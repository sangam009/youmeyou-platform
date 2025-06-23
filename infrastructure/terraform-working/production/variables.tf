# Codaloo Production Environment Variables

variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "The GCP zone"
  type        = string
  default     = "us-central1-a"
}

variable "domain_name" {
  description = "The domain name for the youmeyou application"
  type        = string
  default     = "youmeyou.ai"
}

variable "create_dns_zone" {
  description = "Whether to create a DNS zone for production"
  type        = bool
  default     = true
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "vm_count" {
  description = "Number of VMs to create for high availability"
  type        = number
  default     = 2
}

variable "vm_machine_type" {
  description = "Machine type for the VMs"
  type        = string
  default     = "e2-standard-4"
}

variable "data_disk_size" {
  description = "Size of the data disk in GB"
  type        = number
  default     = 100
}

variable "boot_disk_size" {
  description = "Size of the boot disk in GB"
  type        = number
  default     = 50
}

variable "enable_monitoring" {
  description = "Whether to enable monitoring and alerting"
  type        = bool
  default     = true
}

variable "enable_backup" {
  description = "Whether to enable automated backups"
  type        = bool
  default     = true
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

variable "ssl_certificate_domains" {
  description = "List of domains for SSL certificate"
  type        = list(string)
  default     = []
}

variable "health_check_path" {
  description = "Path for health checks"
  type        = string
  default     = "/health"
}

variable "load_balancer_timeout" {
  description = "Load balancer timeout in seconds"
  type        = number
  default     = 30
}

# Multi-region deployment variables for US and India markets
variable "deploy_multi_region" {
  description = "Whether to deploy in multiple regions for global reach"
  type        = bool
  default     = false  # Set to true when ready for global deployment
}

variable "primary_region" {
  description = "Primary region for production (US market)"
  type        = string
  default     = "us-central1"  # US Central for US market
}

variable "secondary_region" {
  description = "Secondary region for production (India market)"
  type        = string
  default     = "asia-south1"  # Mumbai for India market
}

variable "primary_zone" {
  description = "Primary zone"
  type        = string
  default     = "us-central1-a"
}

variable "secondary_zone" {
  description = "Secondary zone"
  type        = string
  default     = "asia-south1-a"
} 