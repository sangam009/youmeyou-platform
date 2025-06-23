# Hostinger DNS Setup for YouMeYou Staging

## 🎯 Required DNS Records

Add these records in your Hostinger DNS Zone Editor:

### **Main Staging Domain**
```
Type: A
Name: staging
Value: 34.93.209.77
TTL: 300 (5 minutes)
```

### **API Subdomain**
```
Type: A  
Name: api-staging
Value: 34.93.209.77
TTL: 300
```

### **Portainer Management**
```
Type: A
Name: portainer-staging  
Value: 34.93.209.77
TTL: 300
```

### **Wildcard for Future Services** (Optional)
```
Type: A
Name: *.staging
Value: 34.93.209.77
TTL: 300
```

## 🔗 **Final URLs After DNS Setup**

- **Main App**: https://staging.youmeyou.ai
- **API**: https://api-staging.youmeyou.ai
- **Portainer**: https://portainer-staging.youmeyou.ai
- **Direct IP Access**: http://34.93.209.77:9000 (Portainer)

## 📋 **Step-by-Step Hostinger Setup**

1. **Login to Hostinger**
   - Go to hPanel → Domains → Manage
   - Select `youmeyou.ai` domain

2. **Access DNS Zone**
   - Click "DNS Zone" or "DNS/Nameservers"
   - Look for "Manage DNS records"

3. **Add Each Record**
   - Click "Add Record" 
   - Select "A Record"
   - Enter Name and Value as shown above
   - Set TTL to 300 seconds
   - Save each record

4. **Verify DNS Propagation**
   ```bash
   # Test from your local machine (after 5-10 minutes)
   nslookup staging.youmeyou.ai
   nslookup api-staging.youmeyou.ai
   nslookup portainer-staging.youmeyou.ai
   ```

## ⚠️ **Important Notes**

- **Staging is NOT Public**: While DNS records are public, your staging environment will be secured
- **SSL Certificates**: Will be automatically generated via Let's Encrypt
- **Propagation Time**: 5-30 minutes for DNS changes to take effect
- **Backup Access**: Always available via IP: http://34.93.209.77:9000

## 🔐 **Security Considerations**

- Staging will have basic authentication
- SSL certificates for secure HTTPS access
- Firewall rules already configured
- VM automatically shuts down during off-hours (cost savings)

## 🚀 **Next Steps After DNS Setup**

1. Wait for DNS propagation (5-10 minutes)
2. Run domain setup script: `./setup-domain.sh`
3. Deploy YouMeYou application via Portainer
4. Test all services and endpoints 