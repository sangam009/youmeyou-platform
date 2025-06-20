# YouMeYou Staging Environment Variables

variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region"
  type        = string
  default     = "asia-south1"  # Mumbai, India - closest to your location
}

variable "zone" {
  description = "The GCP zone"
  type        = string
  default     = "asia-south1-a"  # Mumbai zone for staging
}

variable "domain_name" {
  description = "The domain name for the youmeyou application"
  type        = string
  default     = "youmeyou.ai"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "staging"
}

variable "machine_type" {
  description = "Machine type for the VM"
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

variable "admin_user" {
  description = "Admin username for SSH access"
  type        = string
  default     = "ubuntu"
}

variable "ssh_public_key_path" {
  description = "Path to SSH public key file"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
} 