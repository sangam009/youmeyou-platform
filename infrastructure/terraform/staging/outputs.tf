# YouMeYou Staging Environment Outputs

output "project_id" {
  description = "The GCP project ID"
  value       = var.project_id
}

output "region" {
  description = "The GCP region"
  value       = var.region
}

output "zone" {
  description = "The GCP zone"
  value       = var.zone
}

output "vm_name" {
  description = "Name of the staging VM"
  value       = google_compute_instance.youmeyou_staging_vm.name
}

output "vm_public_ip" {
  description = "Public IP address of the staging VM"
  value       = google_compute_instance.youmeyou_staging_vm.network_interface[0].access_config[0].nat_ip
}

output "vm_private_ip" {
  description = "Private IP address of the staging VM"
  value       = google_compute_instance.youmeyou_staging_vm.network_interface[0].network_ip
}

output "vm_zone" {
  description = "Zone where the VM is deployed"
  value       = google_compute_instance.youmeyou_staging_vm.zone
}

output "ssh_command" {
  description = "SSH command to connect to the VM"
  value       = "ssh -i ~/.ssh/id_rsa ubuntu@${google_compute_instance.youmeyou_staging_vm.network_interface[0].access_config[0].nat_ip}"
}

output "web_frontend_url" {
  description = "URL for the web frontend"
  value       = "http://${google_compute_instance.youmeyou_staging_vm.network_interface[0].access_config[0].nat_ip}:3000"
}

output "api_url" {
  description = "URL for the API"
  value       = "http://${google_compute_instance.youmeyou_staging_vm.network_interface[0].access_config[0].nat_ip}:4000"
}

output "portainer_url" {
  description = "URL for Portainer dashboard"
  value       = "http://${google_compute_instance.youmeyou_staging_vm.network_interface[0].access_config[0].nat_ip}:9000"
}

output "deployment_info" {
  description = "Important deployment information"
  value = {
    environment     = "staging"
    location       = "Mumbai, India (asia-south1)"
    vm_specs       = "e2-standard-4 (4 vCPU, 16GB RAM)"
    storage        = "100GB SSD data disk + 50GB boot disk"
    default_password = "youmeyou123! (change immediately)"
    current_cost    = "₹11,928/month (~$142/month) - 24/7 operation"
  }
}

output "next_steps" {
  description = "Next steps after deployment"
  value = [
    "1. SSH into the VM: ssh -i ~/.ssh/id_rsa ubuntu@${google_compute_instance.youmeyou_staging_vm.network_interface[0].access_config[0].nat_ip}",
    "2. Check status: /opt/youmeyou/status.sh",
    "3. Access Portainer: http://${google_compute_instance.youmeyou_staging_vm.network_interface[0].access_config[0].nat_ip}:9000",
    "4. Upload your YouMeYou code to /opt/youmeyou/youmeyou/",
    "5. Deploy: /opt/youmeyou/deploy-youmeyou.sh",
    "6. Change default Portainer password!",
    "7. Apply VM scheduling: terraform apply (to add cost-saving schedule)"
  ]
}

output "cost_optimization" {
  description = "Cost optimization through VM scheduling"
  value = {
    current_monthly_cost = "₹11,928 (~$142) - 24/7 operation"
    scheduled_monthly_cost = "₹3,500 (~$42) - with weekday schedule"
    monthly_savings = "₹8,428 (~$100) - 70% cost reduction"
    schedule = "9:00 AM - 7:00 PM IST (Monday-Friday only)"
    manual_control = "./vm-control.sh [status|start|stop|restart|schedule]"
  }
} 