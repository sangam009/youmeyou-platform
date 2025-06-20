# Codaloo Production Environment Outputs

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

output "vm_names" {
  description = "Names of the production VMs"
  value       = google_compute_instance.codaloo_prod_vm[*].name
}

output "vm_internal_ips" {
  description = "Internal IP addresses of the production VMs"
  value       = google_compute_instance.codaloo_prod_vm[*].network_interface.0.network_ip
}

output "vm_external_ips" {
  description = "External IP addresses of the production VMs"
  value       = google_compute_instance.codaloo_prod_vm[*].network_interface.0.access_config.0.nat_ip
}

output "load_balancer_ip" {
  description = "Static IP address of the load balancer"
  value       = google_compute_global_address.codaloo_prod_ip.address
}

output "service_account_email" {
  description = "Email of the service account"
  value       = google_service_account.codaloo_prod_sa.email
}

output "vpc_network_name" {
  description = "Name of the VPC network"
  value       = google_compute_network.codaloo_prod_vpc.name
}

output "subnet_name" {
  description = "Name of the subnet"
  value       = google_compute_subnetwork.codaloo_prod_subnet.name
}

output "data_disk_names" {
  description = "Names of the data disks"
  value       = google_compute_disk.codaloo_prod_data[*].name
}

output "instance_group_name" {
  description = "Name of the instance group"
  value       = google_compute_instance_group.codaloo_prod_group.name
}

output "ssl_certificate_name" {
  description = "Name of the SSL certificate"
  value       = google_compute_managed_ssl_certificate.codaloo_ssl_cert.name
}

output "load_balancer_url" {
  description = "URL of the load balancer"
  value       = "https://${var.domain_name}"
}

output "dns_zone_name" {
  description = "Name of the DNS zone (if created)"
  value       = var.create_dns_zone ? google_dns_managed_zone.codaloo_prod_zone[0].name : null
}

output "dns_zone_name_servers" {
  description = "Name servers for the DNS zone (if created)"
  value       = var.create_dns_zone ? google_dns_managed_zone.codaloo_prod_zone[0].name_servers : null
}

output "health_check_urls" {
  description = "URLs for health checks"
  value = {
    web = "http://${google_compute_global_address.codaloo_prod_ip.address}:3000/"
    api = "http://${google_compute_global_address.codaloo_prod_ip.address}:4000/health"
  }
}

output "ssh_commands" {
  description = "Commands to SSH into the VMs"
  value = [
    for i, vm in google_compute_instance.codaloo_prod_vm :
    "gcloud compute ssh ${vm.name} --zone=${vm.zone}"
  ]
}

output "application_urls" {
  description = "Application URLs"
  value = {
    main_site    = "https://${var.domain_name}"
    auth_api     = "https://auth.${var.domain_name}"
    design_api   = "https://design.${var.domain_name}"
    payment_api  = "https://payment.${var.domain_name}"
  }
}

output "monitoring_dashboard" {
  description = "Link to monitoring dashboard"
  value       = "https://console.cloud.google.com/monitoring/dashboards?project=${var.project_id}"
}

output "deployment_summary" {
  description = "Summary of the deployment"
  value = {
    environment           = "production"
    vm_count             = var.vm_count
    vm_machine_type      = var.vm_machine_type
    load_balancer_ip     = google_compute_global_address.codaloo_prod_ip.address
    ssl_enabled          = true
    dns_managed          = var.create_dns_zone
    high_availability    = var.vm_count > 1
    estimated_monthly_cost = "₹${var.vm_count * 10080 + 1512 + 2856 + 840 + 420}"
  }
} 