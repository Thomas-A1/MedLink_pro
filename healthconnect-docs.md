**Installation Steps (macOS):**
1. Download `HealthConnect-Pharmacy.dmg`
2. Open DMG file
3. Drag app to Applications folder
4. Open from Applications
5. Allow app in Security & Privacy settings if prompted
6. Log in with credentials
7. Complete initial setup wizard

**Installation Steps (Linux):**
1. Download `HealthConnect-Pharmacy.AppImage` or `.deb`
2. For AppImage: `chmod +x HealthConnect-Pharmacy.AppImage && ./HealthConnect-Pharmacy.AppImage`
3. For DEB: `sudo dpkg -i HealthConnect-Pharmacy.deb`
4. Launch from applications menu
5. Log in and complete setup

**Initial Configuration:**
1. **Pharmacy Details:**
   - Verify pharmacy name and address
   - Set operating hours
   - Add contact information

2. **Inventory Setup:**
   - Import existing inventory (CSV) or
   - Manually add drugs or
   - Connect existing system via API

3. **Backup Configuration:**
   - Choose backup frequency
   - Set local backup location
   - Verify cloud backup connection

4. **Staff Accounts:**
   - Add staff members
   - Assign roles (Admin/Pharmacist/Clerk)
   - Set permissions

---

## Appendix D: API Integration Guide for Existing Systems

### For Pharmacies with Existing Management Software

**Integration Methods:**

**Method 1: REST API (Recommended)**
```javascript
// Example: Sync inventory from your system to HealthConnect

const API_KEY = 'your_api_key_here';
const API_SECRET = 'your_api_secret_here';
const BASE_URL = 'https://api.healthconnect.com/api/v1';

// Step 1: Get access token
async function authenticate() {
  const response = await fetch(`${BASE_URL}/integration/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: API_KEY,
      api_secret: API_SECRET,
      pharmacy_id: 'your_pharmacy_id'
    })
  });
  
  const data = await response.json();
  return data.access_token;
}

// Step 2: Sync inventory
async function syncInventory(token, drugs) {
  const response = await fetch(`${BASE_URL}/integration/drugs/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ drugs })
  });
  
  return await response.json();
}

// Step 3: Real-time stock update after sale
async function updateStock(token, drugId, quantityChange) {
  const response = await fetch(`${BASE_URL}/integration/inventory/stock-update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      updates: [{
        drug_id: drugId,
        quantity_change: quantityChange,
        operation: 'sale'
      }]
    })
  });
  
  return await response.json();
}

// Usage
(async () => {
  const token = await authenticate();
  
  // Sync all drugs
  const drugs = [
    {
      name: 'Paracetamol',
      genericName: 'Acetaminophen',
      category: 'Analgesics',
      form: 'Tablet',
      strength: '500mg',
      quantityInStock: 500,
      sellingPrice: 2.50
    },
    // ... more drugs
  ];
  
  const result = await syncInventory(token, drugs);
  console.log(`Synced ${result.synced_count} drugs`);
  
  // Update stock after a sale
  await updateStock(token, 'drug_123', -10); // Sold 10 units
})();
```

**Method 2: Webhook Integration**
```javascript
// Register webhook to receive prescription notifications
async function registerWebhook(token) {
  const response = await fetch(`${BASE_URL}/integration/webhooks/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      url: 'https://your-system.com/webhooks/healthconnect',
      events: [
        'prescription.received',
        'inventory.low_stock'
      ]
    })
  });
  
  return await response.json();
}

// Your webhook endpoint handler (Express.js example)
app.post('/webhooks/healthconnect', (req, res) => {
  const signature = req.headers['x-healthconnect-signature'];
  const event = req.headers['x-healthconnect-event'];
  
  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }
  
  // Handle event
  if (event === 'prescription.received') {
    const { prescriptionId, medications } = req.body.data;
    // Process prescription in your system
    console.log('New prescription:', prescriptionId);
  }
  
  res.status(200).send('OK');
});
```

**Method 3: CSV Export/Import (Simple)**
```javascript
// Export inventory from your system as CSV
// Format: name,genericName,category,form,strength,quantity,price

// Example CSV:
// Paracetamol,Acetaminophen,Analgesics,Tablet,500mg,500,2.50
// Amoxicillin,Amoxicillin,Antibiotics,Capsule,250mg,300,5.00

// Import into HealthConnect Desktop App:
// 1. Go to Inventory > Import
// 2. Select CSV file
// 3. Map columns
// 4. Review and confirm
// 5. Sync to cloud
```

---

## Appendix E: Troubleshooting Guide

### Common Issues and Solutions

**Issue 1: Desktop App Won't Sync**
- **Symptom:** Pending items in sync queue, not uploading
- **Solutions:**
  1. Check internet connection
  2. Verify login credentials
  3. Check if API is accessible: `ping api.healthconnect.com`
  4. Review error logs: Help > View Logs
  5. Try manual sync: Click sync button
  6. If persistent, restart app

**Issue 2: Backup Failed**
- **Symptom:** Backup status shows "Failed"
- **Solutions:**
  1. Check disk space (need 500MB free)
  2. Verify AWS credentials in settings
  3. Check network connection
  4. Try manual backup
  5. Check backup logs

**Issue 3: Offline Mode Not Working**
- **Symptom:** App shows errors when offline
- **Solutions:**
  1. Ensure offline mode enabled in settings
  2. Check SQLite database integrity
  3. Verify local storage permissions
  4. Reinstall app if corrupted

**Issue 4: Drug Not Showing in Patient Search**
- **Symptom:** Drug exists in inventory but patients can't find it
- **Solutions:**
  1. Check if drug is marked as "Available"
  2. Verify quantity > 0
  3. Ensure sync completed (check sync status)
  4. Refresh inventory cache on server
  5. Check pharmacy location coordinates are correct

**Issue 5: Slow Performance**
- **Symptom:** App is sluggish, takes long to load
- **Solutions:**
  1. Clear cache: Settings > Clear Cache
  2. Optimize database: Tools > Optimize Database
  3. Check RAM usage (should be < 500MB)
  4. Reduce number of stored records
  5. Update to latest version

**Issue 6: Can't Receive Prescriptions**
- **Symptom:** Prescriptions not appearing
- **Solutions:**
  1. Verify pharmacy is approved and active
  2. Check notification settings
  3. Ensure app is running (or webhook configured)
  4. Test webhook endpoint if using API integration
  5. Contact support

---

## Appendix F: Security Best Practices

### For Pharmacy Desktop App Users

**1. Physical Security:**
- Keep computer in secure location
- Lock screen when away
- Don't share login credentials
- Use biometric login if available

**2. Network Security:**
- Use secure WiFi (WPA2/WPA3)
- Enable firewall
- Keep antivirus updated
- Avoid public WiFi for transactions

**3. Data Security:**
- Regular backups (daily minimum)
- Store backup drives securely
- Encrypt sensitive data
- Shred paper records properly

**4. Access Control:**
- Create separate accounts for staff
- Use strong passwords (12+ characters)
- Enable two-factor authentication
- Review user activity logs regularly
- Disable accounts for departed staff immediately

**5. Software Updates:**
- Install updates promptly
- Keep operating system updated
- Update antivirus regularly
- Enable auto-update for app

**6. Incident Response:**
- Report suspicious activity immediately
- Document security incidents
- Change passwords if compromised
- Contact HealthConnect support

---

## Appendix G: Compliance & Legal

### Data Protection Compliance

**Ghana Data Protection Act Compliance:**
- Patient data encrypted at rest and in transit
- Access controls and audit logs
- Data retention policies implemented
- Right to deletion honored
- Data breach notification procedures

**Medical Regulations:**
- Licensed pharmacies only
- Drug authenticity verification
- Prescription validation
- Controlled substance tracking
- Regulatory reporting capabilities

**Financial Compliance:**
- Secure payment processing (PCI DSS)
- Transaction records maintained
- Tax reporting support
- Audit trail for all financial transactions

**Terms of Service:**
- Pharmacies must maintain valid license
- Accurate inventory reporting required
- Comply with data protection laws
- No misuse of patient information
- Responsible drug dispensing

---

## Appendix H: Performance Optimization

### Desktop App Optimization

**Database Optimization:**
```sql
-- Create indexes for frequently queried columns
CREATE INDEX idx_drugs_name ON drugs(name);
CREATE INDEX idx_drugs_category ON drugs(category);
CREATE INDEX idx_drugs_expiry ON drugs(expiryDate);
CREATE INDEX idx_drugs_stock ON drugs(quantityInStock);
CREATE INDEX idx_drugs_sync ON drugs(syncStatus, lastSyncedAt);

-- Vacuum database periodically
VACUUM;

-- Analyze query performance
EXPLAIN QUERY PLAN SELECT * FROM drugs WHERE name LIKE '%para%';
```

**Memory Management:**
```typescript
// Implement pagination for large datasets
const PAGE_SIZE = 50;

function loadDrugsPaginated(page: number) {
  const offset = (page - 1) * PAGE_SIZE;
  return db.prepare(`
    SELECT * FROM drugs 
    ORDER BY name 
    LIMIT ? OFFSET ?
  `).all(PAGE_SIZE, offset);
}

// Clear memory periodically
function clearCache() {
  // Clear old data from memory
  imageCache.clear();
  
  // Force garbage collection (if available)
  if (global.gc) {
    global.gc();
  }
}
```

**Network Optimization:**
```typescript
// Batch API requests
class BatchRequestManager {
  private queue: Request[] = [];
  private timer: NodeJS.Timeout | null = null;

  addRequest(request: Request) {
    this.queue.push(request);
    
    if (this.queue.length >= 10) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), 5000);
    }
  }

  private async flush() {
    if (this.queue.length === 0) return;
    
    const batch = this.queue.splice(0, 10);
    
    try {
      await this.apiClient.post('/batch', { requests: batch });
    } catch (error) {
      // Re-queue failed requests
      this.queue.unshift(...batch);
    }
    
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
```

---

## Appendix I: Scaling Considerations

### For Large Pharmacy Chains

**Multi-Branch Support:**
```typescript
// Branch management data model
interface Branch {
  id: string;
  pharmacyChainId: string;
  branchName: string;
  location: {
    latitude: number;
    longitude: number;
  };
  inventory: Drug[]; // Separate inventory per branch
}

// Centralized inventory visibility
async function getChainInventory(chainId: string, drugName: string) {
  const branches = await getBranches(chainId);
  const availability = [];
  
  for (const branch of branches) {
    const drugs = await searchDrugsInBranch(branch.id, drugName);
    if (drugs.length > 0) {
      availability.push({
        branch: branch.branchName,
        location: branch.location,
        drugs: drugs,
      });
    }
  }
  
  return availability;
}
```

**Inter-branch Transfer:**
```typescript
// Transfer drugs between branches
interface Transfer {
  id: string;
  fromBranchId: string;
  toBranchId: string;
  drugId: string;
  quantity: number;
  status: 'pending' | 'in_transit' | 'completed';
  initiatedBy: string;
  initiatedAt: Date;
  completedAt?: Date;
}

async function initiateTransfer(transfer: Transfer) {
  // Reduce stock at source branch
  await updateStock(transfer.fromBranchId, transfer.drugId, -transfer.quantity);
  
  // Create transfer record
  await createTransferRecord(transfer);
  
  // Notify destination branch
  await notifyBranch(transfer.toBranchId, transfer);
}
```

**Centralized Reporting:**
```typescript
// Aggregate reports across branches
async function getChainReport(chainId: string, startDate: Date, endDate: Date) {
  const branches = await getBranches(chainId);
  const reports = [];
  
  for (const branch of branches) {
    const sales = await getSalesReport(branch.id, startDate, endDate);
    const inventory = await getInventoryValue(branch.id);
    
    reports.push({
      branchName: branch.branchName,
      totalSales: sales.total,
      inventoryValue: inventory.value,
      transactions: sales.count,
    });
  }
  
  return {
    chainTotal: reports.reduce((sum, r) => sum + r.totalSales, 0),
    branches: reports,
  };
}
```

---

## Appendix J: Training Materials

### Quick Start Guide for Pharmacy Staff

**Day 1: Basic Operations**
1. Logging in and out
2. Viewing inventory
3. Searching for drugs
4. Checking stock levels
5. Receiving prescriptions

**Day 2: Inventory Management**
1. Adding new drugs
2. Updating stock quantities
3. Setting reorder levels
4. Managing expiry dates
5. Generating reports

**Day 3: Advanced Features**
1. Prescription fulfillment workflow
2. Syncing inventory
3. Creating backups
4. Managing user accounts
5. Using shortcuts and tips

**Video Tutorials (Available in App):**
- Introduction to HealthConnect (5 min)
- Adding Your First Drug (3 min)
- Receiving Prescriptions (4 min)
- Inventory Reports (6 min)
- Backup and Restore (3 min)
- Troubleshooting Common Issues (8 min)

---

## Appendix K: API Rate Limits

### Integration API Limits

| Endpoint Category | Rate Limit | Window |
|------------------|------------|---------|
| Authentication | 10 requests | 5 minutes |
| Drug Sync | 100 requests | 1 hour |
| Stock Update | 1000 requests | 1 hour |
| Prescription Fetch | 500 requests | 1 hour |
| Search | 200 requests | 1 hour |
| Webhooks | 50 registrations | 24 hours |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699564800
```

**Handling Rate Limits:**
```javascript
async function apiCallWithRetry(url, options, maxRetries = 3) {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        // Rate limited
        const resetTime = parseInt(response.headers.get('X-RateLimit-Reset'));
        const waitTime = (resetTime * 1000) - Date.now();
        
        console.log(`Rate limited. Waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        retries++;
        continue;
      }
      
      return await response.json();
    } catch (error) {
      retries++;
      if (retries >= maxRetries) throw error;
    }
  }
}
```

---

## Appendix L: Support & Maintenance

### Support Channels

**For Pharmacies:**
- **Email:** pharmacy-support@healthconnect.com
- **Phone:** +233 XXX XXX XXX (8 AM - 8 PM, Mon-Sat)
- **WhatsApp:** +233 XXX XXX XXX (Business hours)
- **In-App Chat:** Available 24/7
- **Knowledge Base:** https://help.healthconnect.com

**For Developers (API Integration):**
- **Email:** api-support@healthconnect.com
- **Documentation:** https://docs.healthconnect.com
- **GitHub Issues:** For bug reports
- **Developer Forum:** https://community.healthconnect.com

**Service Level Agreement (SLA):**
- **Critical Issues:** Response within 2 hours
- **High Priority:** Response within 8 hours
- **Medium Priority:** Response within 24 hours
- **Low Priority:** Response within 48 hours

**Scheduled Maintenance:**
- Monthly: First Sunday of each month, 2 AM - 6 AM
- Emergency maintenance: Notified 24 hours in advance
- Zero downtime deployments for minor updates

---

## Document Summary

This comprehensive technical documentation covers:

✅ **Complete Mobile App** (Flutter for patients and doctors)
✅ **Web Dashboard** (React for hospitals and pharmacies)
✅ **Desktop App** (Electron for pharmacy inventory management)
✅ **Backend API** (Node.js with full specifications)
✅ **Inventory Management System** (Complete with offline support)
✅ **Dynamic Geofencing** (Location-based drug search)
✅ **Real-time Sync** (With conflict resolution)
✅ **Backup & Restore** (Local and cloud backups)
✅ **API Integration** (For existing pharmacy systems)
✅ **SMS Integration** (Mnotify for Ghana)
✅ **Push Notifications** (Firebase Cloud Messaging)
✅ **Security** (End-to-end encryption, compliance)
✅ **Deployment Guide** (Complete production checklist)
✅ **Troubleshooting** (Common issues and solutions)
✅ **Training Materials** (For staff onboarding)

**Ready for Development:** This documentation provides everything needed to build a world-class, production-ready telemedicine platform with comprehensive inventory management.

---

**Document End**

**For questions or clarifications, contact:**  
HealthConnect Development Team  
Email: dev@healthconnect.com  
Version: 8.0 (Final)  
Date: November 9, 2025  private async cleanupOldBackups() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldBackups = await this.db.prepare(`
      SELECT * FROM backups 
      WHERE timestamp < ? AND type = 'automatic'
    `).all(thirtyDaysAgo.toISOString());

    for (const backup of oldBackups) {
      try {
        // Delete from cloud
        await this.deleteFromCloud(backup.id);
        
        // Delete metadata
        await this.db.prepare('DELETE FROM backups WHERE id = ?').run(backup.id);
        
        console.log(`Deleted old backup: ${backup.id}`);
      } catch (error) {
        console.error(`Failed to delete backup ${backup.id}:`, error);
      }
    }
  }

  private async deleteFromCloud(backupId: string): Promise<void> {
    const deleteParams = {
      Bucket: process.env.S3_BACKUP_BUCKET!,
      Key: `pharmacy-backups/${backupId}.sql.gz`,
    };

    await this.s3Client.send(new DeleteObjectCommand(deleteParams));
  }

  private getFileSize(filePath: string): number {
    const fs = require('fs');
    const stats = fs.statSync(filePath);
    return stats.size;
  }

  private async getRecordCount(): Promise<number> {
    const result = this.db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM drugs) +
        (SELECT COUNT(*) FROM lab_services) +
        (SELECT COUNT(*) FROM prescription_fulfillments) as total
    `).get();
    
    return result.total;
  }
}
```

### 21.11 Integration API Documentation

```yaml
# API Documentation for Pharmacy Integration
# External pharmacy management systems can integrate via REST API

openapi: 3.0.0
info:
  title: HealthConnect Inventory Integration API
  version: 1.0.0
  description: API for integrating existing pharmacy management systems with HealthConnect

servers:
  - url: https://api.healthconnect.com/api/v1
    description: Production server
  - url: https://staging-api.healthconnect.com/api/v1
    description: Staging server

security:
  - ApiKeyAuth: []
  - BearerAuth: []

paths:
  /integration/auth/token:
    post:
      summary: Obtain API access token
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                api_key:
                  type: string
                  description: API key provided by HealthConnect
                api_secret:
                  type: string
                  description: API secret provided by HealthConnect
                pharmacy_id:
                  type: string
                  description: Your pharmacy ID
      responses:
        '200':
          description: Successfully authenticated
          content:
            application/json:
              schema:
                type: object
                properties:
                  access_token:
                    type: string
                  token_type:
                    type: string
                    example: Bearer
                  expires_in:
                    type: integer
                    example: 3600

  /integration/drugs/sync:
    post:
      summary: Bulk sync drug inventory
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                drugs:
                  type: array
                  items:
                    $ref: '#/components/schemas/Drug'
      responses:
        '200':
          description: Sync successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  synced_count:
                    type: integer
                  failed_count:
                    type: integer
                  errors:
                    type: array
                    items:
                      type: object

  /integration/drugs/{drug_id}:
    put:
      summary: Update single drug
      security:
        - BearerAuth: []
      parameters:
        - name: drug_id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Drug'
      responses:
        '200':
          description: Drug updated successfully

  /integration/inventory/stock-update:
    post:
      summary: Update stock quantities (real-time)
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                updates:
                  type: array
                  items:
                    type: object
                    properties:
                      drug_id:
                        type: string
                      quantity_change:
                        type: integer
                        description: Positive for restock, negative for sale
                      operation:
                        type: string
                        enum: [sale, restock, adjustment, expired]
      responses:
        '200':
          description: Stock updated successfully

  /integration/prescriptions:
    get:
      summary: Get pending prescriptions for your pharmacy
      security:
        - BearerAuth: []
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [received, preparing, ready, completed]
        - name: since
          in: query
          schema:
            type: string
            format: date-time
      responses:
        '200':
          description: List of prescriptions
          content:
            application/json:
              schema:
                type: object
                properties:
                  prescriptions:
                    type: array
                    items:
                      $ref: '#/components/schemas/Prescription'

  /integration/prescriptions/{prescription_id}/status:
    put:
      summary: Update prescription fulfillment status
      security:
        - BearerAuth: []
      parameters:
        - name: prescription_id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                status:
                  type: string
                  enum: [preparing, ready, completed]
                notes:
                  type: string
      responses:
        '200':
          description: Status updated successfully

  /integration/webhooks/register:
    post:
      summary: Register webhook endpoint for real-time updates
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                url:
                  type: string
                  format: uri
                  description: Your webhook endpoint
                events:
                  type: array
                  items:
                    type: string
                    enum: 
                      - prescription.received
                      - prescription.updated
                      - inventory.low_stock
                      - inventory.expiring
      responses:
        '201':
          description: Webhook registered successfully

components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Drug:
      type: object
      required:
        - name
        - category
        - form
        - strength
        - quantityInStock
        - sellingPrice
      properties:
        id:
          type: string
          description: External ID from your system (optional)
        name:
          type: string
        genericName:
          type: string
        brandName:
          type: string
        category:
          type: string
          enum:
            - Analgesics
            - Antibiotics
            - Antimalarials
            - Antihypertensives
            - Antidiabetics
            - Vitamins
            - Other
        form:
          type: string
          enum:
            - Tablet
            - Capsule
            - Syrup
            - Injection
            - Cream
            - Other
        strength:
          type: string
          example: "500mg"
        manufacturer:
          type: string
        batchNumber:
          type: string
        expiryDate:
          type: string
          format: date
        quantityInStock:
          type: integer
          minimum: 0
        reorderLevel:
          type: integer
        unitPrice:
          type: number
          format: float
        sellingPrice:
          type: number
          format: float
        barcode:
          type: string
        requiresPrescription:
          type: boolean

    Prescription:
      type: object
      properties:
        id:
          type: string
        prescriptionId:
          type: string
        patientName:
          type: string
        patientPhone:
          type: string
        doctorName:
          type: string
        medications:
          type: array
          items:
            type: object
            properties:
              drugName:
                type: string
              quantity:
                type: integer
              dosage:
                type: string
              instructions:
                type: string
        receivedAt:
          type: string
          format: date-time
        status:
          type: string
```

### 21.12 Webhook Events for Real-time Integration

```typescript
// Webhook Service for External System Integration
// src/services/webhook.service.ts

export class WebhookService {
  async triggerWebhook(event: WebhookEvent, data: any) {
    const webhooks = await this.getRegisteredWebhooks(event.type);

    for (const webhook of webhooks) {
      try {
        await this.sendWebhook(webhook, event, data);
      } catch (error) {
        console.error(`Webhook failed: ${webhook.url}`, error);
        await this.logWebhookFailure(webhook.id, error);
      }
    }
  }

  private async sendWebhook(webhook: Webhook, event: WebhookEvent, data: any) {
    const payload = {
      event: event.type,
      timestamp: new Date().toISOString(),
      data: data,
    };

    // Generate signature for security
    const signature = this.generateSignature(payload, webhook.secret);

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-HealthConnect-Signature': signature,
        'X-HealthConnect-Event': event.type,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`Webhook returned status ${response.status}`);
    }

    await this.logWebhookSuccess(webhook.id, event.type);
  }

  private generateSignature(payload: any, secret: string): string {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  // Webhook events
  async onPrescriptionReceived(prescription: Prescription) {
    await this.triggerWebhook(
      { type: 'prescription.received' },
      {
        prescriptionId: prescription.id,
        patientName: prescription.patientName,
        medications: prescription.medications,
        receivedAt: prescription.receivedAt,
      }
    );
  }

  async onLowStock(drug: Drug) {
    await this.triggerWebhook(
      { type: 'inventory.low_stock' },
      {
        drugId: drug.id,
        drugName: drug.name,
        currentStock: drug.quantityInStock,
        reorderLevel: drug.reorderLevel,
      }
    );
  }

  async onExpiringDrugs(drugs: Drug[]) {
    await this.triggerWebhook(
      { type: 'inventory.expiring' },
      {
        drugs: drugs.map(d => ({
          drugId: d.id,
          drugName: d.name,
          expiryDate: d.expiryDate,
          quantity: d.quantityInStock,
        })),
      }
    );
  }
}

interface WebhookEvent {
  type: 'prescription.received' | 'prescription.updated' | 
        'inventory.low_stock' | 'inventory.expiring';
}
```

---

## 22. Mobile App Integration with Inventory

### 22.1 Dynamic Drug Search with Geofencing

```dart
// Flutter Mobile App: Drug Search with Geofencing
// lib/features/pharmacy/drug_search_service.dart

class DrugSearchService {
  final ApiClient _apiClient;
  final LocationService _locationService;

  Future<DrugSearchResult> searchDrugNearby({
    required String drugName,
    int radiusKm = 10,
    int? requiredQuantity,
  }) async {
    // Get user's current location
    final position = await _locationService.getCurrentPosition();
    
    // Search for pharmacies with the drug
    final response = await _apiClient.get(
      '/inventory/search-drug',
      queryParameters: {
        'drugName': drugName,
        'latitude': position.latitude,
        'longitude': position.longitude,
        'radius': radiusKm,
        'requiredQuantity': requiredQuantity ?? 1,
      },
    );

    if (response.statusCode == 200) {
      final data = response.data;
      return DrugSearchResult.fromJson(data);
    }

    throw Exception('Failed to search for drug');
  }

  Future<List<LabService>> searchLabService({
    required String serviceName,
    String? category,
    int radiusKm = 10,
  }) async {
    final position = await _locationService.getCurrentPosition();
    
    final response = await _apiClient.get(
      '/inventory/search-lab-service',
      queryParameters: {
        'serviceName': serviceName,
        'category': category,
        'latitude': position.latitude,
        'longitude': position.longitude,
        'radius': radiusKm,
      },
    );

    if (response.statusCode == 200) {
      final data = response.data['facilities'] as List;
      return data.map((f) => LabService.fromJson(f)).toList();
    }

    return [];
  }
}

// UI Screen for Drug Search
class DrugSearchScreen extends ConsumerStatefulWidget {
  @override
  _DrugSearchScreenState createState() => _DrugSearchScreenState();
}

class _DrugSearchScreenState extends ConsumerState<DrugSearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  bool _isSearching = false;
  DrugSearchResult? _searchResult;

  Future<void> _searchDrug() async {
    if (_searchController.text.isEmpty) return;

    setState(() => _isSearching = true);

    try {
      final result = await ref.read(drugSearchServiceProvider).searchDrugNearby(
        drugName: _searchController.text,
        radiusKm: 10,
      );

      setState(() {
        _searchResult = result;
        _isSearching = false;
      });
    } catch (e) {
      setState(() => _isSearching = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Search failed: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Find Drug')),
      body: Column(
        children: [
          Padding(
            padding: EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Enter drug name (e.g., Paracetamol)',
                suffixIcon: IconButton(
                  icon: Icon(Icons.search),
                  onPressed: _searchDrug,
                ),
              ),
              onSubmitted: (_) => _searchDrug(),
            ),
          ),
          
          if (_isSearching)
            Center(child: CircularProgressIndicator())
          else if (_searchResult != null)
            Expanded(
              child: _buildSearchResults(),
            ),
        ],
      ),
    );
  }

  Widget _buildSearchResults() {
    if (_searchResult!.pharmacies.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.local_pharmacy_outlined, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'No pharmacies found with this drug',
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
            SizedBox(height: 8),
            Text(
              'Try expanding search radius',
              style: TextStyle(fontSize: 14, color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      itemCount: _searchResult!.pharmacies.length,
      itemBuilder: (context, index) {
        final result = _searchResult!.pharmacies[index];
        return PharmacyResultCard(
          pharmacy: result.pharmacy,
          drugs: result.drugs,
          distance: result.distance,
          duration: result.duration,
          onNavigate: () => _navigateToPharmacy(result.pharmacy),
          onCall: () => _callPharmacy(result.pharmacy),
        );
      },
    );
  }

  void _navigateToPharmacy(PharmacyInfo pharmacy) {
    // Open Google Maps for navigation
    final url = 'https://www.google.com/maps/dir/?api=1&destination=${pharmacy.latitude},${pharmacy.longitude}';
    launchUrl(Uri.parse(url));
  }

  void _callPharmacy(PharmacyInfo pharmacy) {
    final url = 'tel:${pharmacy.phone}';
    launchUrl(Uri.parse(url));
  }
}

class PharmacyResultCard extends StatelessWidget {
  final PharmacyInfo pharmacy;
  final List<DrugInfo> drugs;
  final DistanceInfo distance;
  final DurationInfo duration;
  final VoidCallback onNavigate;
  final VoidCallback onCall;

  const PharmacyResultCard({
    required this.pharmacy,
    required this.drugs,
    required this.distance,
    required this.duration,
    required this.onNavigate,
    required this.onCall,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.local_pharmacy, color: Colors.blue),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    pharmacy.name,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                if (pharmacy.isOpen)
                  Chip(
                    label: Text('Open', style: TextStyle(fontSize: 12)),
                    backgroundColor: Colors.green.shade100,
                    labelPadding: EdgeInsets.symmetric(horizontal: 8),
                  )
                else
                  Chip(
                    label: Text('Closed', style: TextStyle(fontSize: 12)),
                    backgroundColor: Colors.red.shade100,
                    labelPadding: EdgeInsets.symmetric(horizontal: 8),
                  ),
              ],
            ),
            
            SizedBox(height: 8),
            Text(
              pharmacy.address,
              style: TextStyle(color: Colors.grey[600]),
            ),
            
            SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.location_on, size: 16, color: Colors.grey),
                SizedBox(width: 4),
                Text('${distance.text} away'),
                SizedBox(width: 16),
                Icon(Icons.access_time, size: 16, color: Colors.grey),
                SizedBox(width: 4),
                Text('${duration.text}'),
              ],
            ),
            
            Divider(height: 24),
            
            Text(
              'Available Drugs:',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 8),
            
            ...drugs.map((drug) => Padding(
              padding: EdgeInsets.only(bottom: 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text('${drug.name} (${drug.strength})'),
                  ),
                  Text(
                    'GHS ${drug.price.toStringAsFixed(2)}',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.green,
                    ),
                  ),
                ],
              ),
            )),
            
            SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: onNavigate,
                    icon: Icon(Icons.directions),
                    label: Text('Navigate'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                    ),
                  ),
                ),
                SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: onCall,
                    icon: Icon(Icons.phone),
                    label: Text('Call'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
```

---

## 23. Desktop App Installation & Deployment

### 23.1 Building Desktop App for Distribution

```json
// package.json for Electron app
{
  "name": "healthconnect-pharmacy",
  "version": "1.0.0",
  "description": "HealthConnect Pharmacy Inventory Management",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "concurrently \"npm run dev:main\" \"npm run dev:renderer\"",
    "dev:main": "tsc -p tsconfig.main.json && electron .",
    "dev:renderer": "vite",
    "build": "npm run build:main && npm run build:renderer",
    "build:main": "tsc -p tsconfig.main.json",
    "build:renderer": "vite build",
    "package": "electron-builder",
    "package:win": "electron-builder --win",
    "package:mac": "electron-builder --mac",
    "package:linux": "electron-builder --linux"
  },
  "build": {
    "appId": "com.healthconnect.pharmacy",
    "productName": "HealthConnect Pharmacy",
    "copyright": "Copyright © 2025 HealthConnect",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64", "ia32"]
        }
      ],
      "icon": "build/icon.ico"
    },
    "mac": {
      "target": "dmg",
      "icon": "build/icon.icns",
      "category": "public.app-category.healthcare-fitness"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "icon": "build/icon.png",
      "category": "Office"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

### 23.2 Auto-Update Configuration

```typescript
// Auto-update implementation
// src/main/auto-updater.ts

import { autoUpdater } from 'electron-updater';
import { dialog } from 'electron';

export class AutoUpdater {
  private updateCheckInterval: NodeJS.Timeout | null = null;

  initialize() {
    // Configure update server
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: 'https://updates.healthconnect.com/pharmacy',
    });

    // Check for updates on startup
    autoUpdater.checkForUpdatesAndNotify();

    // Check for updates every 6 hours
    this.updateCheckInterval = setInterval(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 6 * 60 * 60 * 1000);

    // Event handlers
    autoUpdater.on('update-available', (info) => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `A new version (${info.version}) is available. It will be downloaded in the background.`,
        buttons: ['OK'],
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: `Version ${info.version} has been downloaded. The app will restart to install the update.`,
        buttons: ['Restart Now', 'Later'],
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    });

    autoUpdater.on('error', (error) => {
      console.error('Auto-update error:', error);
    });
  }

  cleanup() {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
    }
  }
}
```

---

## 24. Complete System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          HealthConnect Ecosystem                     │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐              ┌──────────────────┐
│                  │              │                  │
│  Flutter Mobile  │◄────────────►│   Backend API    │
│  App (Patient)   │   REST API   │   (Node.js)      │
│                  │   WebSocket  │                  │
└──────────────────┘              └────────┬─────────┘
                                           │
┌──────────────────┐                       │
│                  │                       │
│  Flutter Mobile  │◄──────────────────────┤
│  App (Doctor)    │                       │
│                  │                       │
└──────────────────┘                       │
                                           │
┌──────────────────┐                       │
│                  │                       │
│   React Web      │◄──────────────────────┤
│   (Hospital)     │                       │
│                  │                       │
└──────────────────┘                       │
                                           │
┌──────────────────┐                       │
│                  │                       │
│   React Web      │◄──────────────────────┤
│   (Pharmacy)     │                       │
│                  │                       │
└──────────────────┘                       │
                                           │
┌──────────────────┐                       │
│                  │                       │
│ Electron Desktop │◄──────────────────────┘
│  (Pharmacy POS)  │    Sync & Integration
│                  │
└──────────────────┘

        │
        │ Offline Mode
        ▼
┌──────────────────┐
│  SQLite Local DB │
│  + Sync Queue    │
└──────────────────┘

        │
        │ Auto Sync
        ▼
┌──────────────────┐
│  PostgreSQL      │
│  (Central DB)    │
└──────────────────┘

        │
        │ Geofencing
        ▼
┌──────────────────┐
│  Patient searches│──────┐
│  "Paracetamol"   │      │
└──────────────────┘      │
                          ▼
                 ┌────────────────────┐
                 │  Geofencing Engine │
                 │  1. Get location   │
                 │  2. Find pharmacies│
                 │  3. Check inventory│
                 │  4. Calculate dist │
                 └────────────────────┘
                          │
                          ▼
                 ┌────────────────────┐
                 │ Results with:      │
                 │ - Pharmacy name    │
                 │ - Drug availability│
                 │ - Price            │
                 │ - Distance         │
                 │ - Navigation       │
                 └────────────────────┘
```

---

## 25. Production Deployment Guide

### 25.1 Desktop App Distribution

**Windows:**
1. Build installer: `npm run package:win`
2. Sign executable with code signing certificate
3. Upload to update server
4. Distribute via website or email to pharmacies

**macOS:**
1. Build DMG: `npm run package:mac`
2. Notarize with Apple
3. Upload to update server
4. Distribute

**Linux:**
1. Build AppImage/DEB: `npm run package:linux`
2. Upload to update server
3. Distribute

### 25.2 Initial Pharmacy Onboarding

**Step 1: Pharmacy Registration**
- Pharmacy signs up on HealthConnect portal
- Provides business registration details
- Uploads pharmacy license
- Admin verifies and approves

**Step 2: Desktop App Setup**
- Pharmacy downloads desktop app
- Installs on Windows/Mac/Linux PC
- Logs in with credentials
- App creates local SQLite database

**Step 3: Initial Inventory Import**
- Option A: Manual entry via desktop app
- Option B: Import from CSV file
- Option C: API integration with existing system

**Step 4: Training & Support**
- Video tutorials provided
- Phone/email support available
- User manual in PDF format

### 25.3 Monitoring & Maintenance

**Desktop App Monitoring:**
- Automatic error reporting to Sentry
- Usage analytics (anonymized)
- Update installation rates
- Crash reports

**Backup Monitoring:**
- Daily backup success/failure alerts
- Cloud storage usage tracking
- Backup integrity checks

**Sync Monitoring:**
- Track sync success rates
- Monitor sync queue length
- Alert on sync failures > 24 hours

---

## Appendix C: Desktop App Installation Guide

### For Pharmacies & Hospitals

**System Requirements:**
- **OS:** Windows 10/11, macOS 10.15+, Ubuntu 20.04+
- **RAM:** 4GB minimum, 8GB recommended
- **Storage:** 500MB free space
- **Internet:** Required for sync (works offline)
- **Screen:** 1280x720 minimum resolution

**Installation Steps (Windows):**
1. Download `HealthConnect-Pharmacy-Setup.exe`
2. Double-click to run installer
3. Follow installation wizard
4. Launch app from desktop shortcut
5. Log in with your credentials
6. Complete initial setup wizard

**Installation Steps (macOS):**
1. Download `Health  private isPharmacyOpen(pharmacy: Pharmacy): boolean {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const schedule = pharmacy.operatingHours[currentDay];
    if (!schedule) return false;

    const [openHour, openMin] = schedule.open.split(':').map(Number);
    const [closeHour, closeMin] = schedule.close.split(':').map(Number);

    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;

    return currentTime >= openTime && currentTime <= closeTime;
  }

  // Search for lab services
  async findFacilitiesWithLabService(searchDto: SearchLabServiceDto) {
    const {
      serviceName,
      category,
      latitude,
      longitude,
      radius = 10,
    } = searchDto;

    const nearbyFacilities = await this.findNearbyFacilities(
      latitude,
      longitude,
      radius,
      'laboratory'
    );

    const facilitiesWithService = [];

    for (const facility of nearbyFacilities) {
      const services = await this.labServiceRepository.find({
        where: {
          facilityId: facility.id,
          isAvailable: true,
          ...(serviceName && {
            name: Like(`%${serviceName}%`)
          }),
          ...(category && { category }),
        },
      });

      if (services.length > 0) {
        const distance = await this.calculateDistance(
          latitude,
          longitude,
          facility.latitude,
          facility.longitude
        );

        facilitiesWithService.push({
          facility: {
            id: facility.id,
            name: facility.name,
            address: facility.address,
            phone: facility.phone,
            latitude: facility.latitude,
            longitude: facility.longitude,
            type: facility.type,
            hasEmergency: facility.hasEmergency,
          },
          services: services.map(service => ({
            id: service.id,
            name: service.name,
            category: service.category,
            price: service.price,
            estimatedDuration: service.estimatedDuration,
            requiresFasting: service.requiresFasting,
          })),
          distance: distance.distance,
          duration: distance.duration,
        });
      }
    }

    facilitiesWithService.sort((a, b) => a.distance.value - b.distance.value);

    return {
      success: true,
      count: facilitiesWithService.length,
      facilities: facilitiesWithService,
    };
  }
}
```

### 21.8 Desktop App UI Components

```typescript
// Desktop App: React Component for Drug Management
// src/renderer/pages/DrugManagement.tsx

import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Modal,
  Form,
  Select,
  InputNumber,
  DatePicker,
  message,
  Space,
  Tag,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SyncOutlined,
  CloudDownloadOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import moment from 'moment';

const { Search } = Input;
const { Option } = Select;

export const DrugManagement: React.FC = () => {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);
  const [syncStatus, setSyncStatus] = useState({ pending: 0, synced: 0 });
  const [form] = Form.useForm();

  useEffect(() => {
    loadDrugs();
    loadSyncStatus();
  }, []);

  const loadDrugs = async () => {
    setLoading(true);
    try {
      const result = await window.electron.invoke('drug:getAll');
      setDrugs(result);
    } catch (error) {
      message.error('Failed to load drugs');
    } finally {
      setLoading(false);
    }
  };

  const loadSyncStatus = async () => {
    const status = await window.electron.invoke('sync:getStatus');
    setSyncStatus(status);
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      const result = await window.electron.invoke('sync:start');
      message.success(`Synced ${result.synced} items successfully`);
      loadDrugs();
      loadSyncStatus();
    } catch (error) {
      message.error('Sync failed. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      const result = await window.electron.invoke('backup:create', 'manual');
      message.success(`Backup created successfully (${(result.size / 1024 / 1024).toFixed(2)} MB)`);
    } catch (error) {
      message.error('Backup failed');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingDrug) {
        await window.electron.invoke('drug:update', editingDrug.id, values);
        message.success('Drug updated successfully');
      } else {
        const newDrug = {
          id: `drug_${Date.now()}`,
          ...values,
          pharmacyId: localStorage.getItem('pharmacyId'),
          isAvailable: true,
          lastRestocked: new Date().toISOString(),
        };
        await window.electron.invoke('drug:create', newDrug);
        message.success('Drug added successfully');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingDrug(null);
      loadDrugs();
      loadSyncStatus();
    } catch (error) {
      message.error('Operation failed');
    }
  };

  const handleEdit = (drug: Drug) => {
    setEditingDrug(drug);
    form.setFieldsValue({
      ...drug,
      expiryDate: moment(drug.expiryDate),
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this drug?',
      icon: <ExclamationCircleOutlined />,
      content: 'This action cannot be undone',
      onOk: async () => {
        await window.electron.invoke('drug:delete', id);
        message.success('Drug deleted successfully');
        loadDrugs();
      },
    });
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Generic Name',
      dataIndex: 'genericName',
      key: 'genericName',
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => <Tag color="blue">{category}</Tag>,
    },
    {
      title: 'Form',
      dataIndex: 'form',
      key: 'form',
    },
    {
      title: 'Strength',
      dataIndex: 'strength',
      key: 'strength',
    },
    {
      title: 'Stock',
      dataIndex: 'quantityInStock',
      key: 'stock',
      render: (qty: number, record: Drug) => {
        const isLow = qty <= record.reorderLevel;
        return (
          <Badge
            count={qty}
            showZero
            style={{
              backgroundColor: isLow ? '#ff4d4f' : '#52c41a',
            }}
          />
        );
      },
    },
    {
      title: 'Price (GHS)',
      dataIndex: 'sellingPrice',
      key: 'price',
      render: (price: number) => `₵${price.toFixed(2)}`,
    },
    {
      title: 'Expiry Date',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      render: (date: string) => {
        const expiryDate = moment(date);
        const daysUntilExpiry = expiryDate.diff(moment(), 'days');
        const isExpiringSoon = daysUntilExpiry <= 30;
        
        return (
          <span style={{ color: isExpiringSoon ? '#ff4d4f' : 'inherit' }}>
            {expiryDate.format('DD/MM/YYYY')}
            {isExpiringSoon && <Tag color="red" style={{ marginLeft: 8 }}>Expiring Soon</Tag>}
          </span>
        );
      },
    },
    {
      title: 'Sync Status',
      dataIndex: 'syncStatus',
      key: 'syncStatus',
      render: (status: string) => {
        const colors = {
          synced: 'green',
          pending: 'orange',
          conflict: 'red',
          error: 'red',
        };
        return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: Drug) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingDrug(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            Add Drug
          </Button>
          <Button
            icon={<SyncOutlined />}
            onClick={handleSync}
            loading={loading}
          >
            Sync ({syncStatus.pending} pending)
          </Button>
          <Button
            icon={<CloudDownloadOutlined />}
            onClick={handleCreateBackup}
          >
            Create Backup
          </Button>
        </Space>
        <Search
          placeholder="Search drugs..."
          onSearch={(value) => {
            // Implement search
          }}
          style={{ width: 300 }}
        />
      </div>

      <Table
        columns={columns}
        dataSource={drugs}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} items`,
        }}
      />

      <Modal
        title={editingDrug ? 'Edit Drug' : 'Add New Drug'}
        visible={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingDrug(null);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Drug Name"
            rules={[{ required: true, message: 'Please enter drug name' }]}
          >
            <Input placeholder="e.g., Paracetamol" />
          </Form.Item>

          <Form.Item
            name="genericName"
            label="Generic Name"
          >
            <Input placeholder="e.g., Acetaminophen" />
          </Form.Item>

          <Form.Item
            name="brandName"
            label="Brand Name"
          >
            <Input placeholder="e.g., Panadol" />
          </Form.Item>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              name="category"
              label="Category"
              rules={[{ required: true }]}
              style={{ width: 200 }}
            >
              <Select placeholder="Select category">
                <Option value="Analgesics">Analgesics</Option>
                <Option value="Antibiotics">Antibiotics</Option>
                <Option value="Antimalarials">Antimalarials</Option>
                <Option value="Antihypertensives">Antihypertensives</Option>
                <Option value="Antidiabetics">Antidiabetics</Option>
                <Option value="Vitamins">Vitamins</Option>
                <Option value="Other">Other</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="form"
              label="Form"
              rules={[{ required: true }]}
              style={{ width: 200 }}
            >
              <Select placeholder="Select form">
                <Option value="Tablet">Tablet</Option>
                <Option value="Capsule">Capsule</Option>
                <Option value="Syrup">Syrup</Option>
                <Option value="Injection">Injection</Option>
                <Option value="Cream">Cream</Option>
                <Option value="Drops">Drops</Option>
              </Select>
            </Form.Item>
          </Space>

          <Form.Item
            name="strength"
            label="Strength"
            rules={[{ required: true }]}
          >
            <Input placeholder="e.g., 500mg" />
          </Form.Item>

          <Form.Item
            name="manufacturer"
            label="Manufacturer"
          >
            <Input placeholder="e.g., GSK" />
          </Form.Item>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              name="batchNumber"
              label="Batch Number"
              style={{ width: 200 }}
            >
              <Input placeholder="e.g., BT123456" />
            </Form.Item>

            <Form.Item
              name="expiryDate"
              label="Expiry Date"
              rules={[{ required: true }]}
              style={{ width: 200 }}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              name="quantityInStock"
              label="Quantity in Stock"
              rules={[{ required: true }]}
              style={{ width: 200 }}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="reorderLevel"
              label="Reorder Level"
              style={{ width: 200 }}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              name="unitPrice"
              label="Unit Price (GHS)"
              rules={[{ required: true }]}
              style={{ width: 200 }}
            >
              <InputNumber
                min={0}
                step={0.01}
                precision={2}
                style={{ width: '100%' }}
                prefix="₵"
              />
            </Form.Item>

            <Form.Item
              name="sellingPrice"
              label="Selling Price (GHS)"
              rules={[{ required: true }]}
              style={{ width: 200 }}
            >
              <InputNumber
                min={0}
                step={0.01}
                precision={2}
                style={{ width: '100%' }}
                prefix="₵"
              />
            </Form.Item>
          </Space>

          <Form.Item
            name="barcode"
            label="Barcode"
          >
            <Input placeholder="Scan or enter barcode" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingDrug ? 'Update Drug' : 'Add Drug'}
              </Button>
              <Button onClick={() => {
                setModalVisible(false);
                setEditingDrug(null);
                form.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
```

### 21.9 Automatic Sync Strategy

```typescript
// Sync Service with Conflict Resolution
// src/services/sync.service.ts

export class SyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;

  // Start automatic sync every 5 minutes
  startAutoSync() {
    this.syncInterval = setInterval(() => {
      if (this.isOnline() && !this.isSyncing) {
        this.performSync();
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }

  async performSync() {
    this.isSyncing = true;
    
    try {
      // Step 1: Push local changes to server
      await this.pushLocalChanges();
      
      // Step 2: Pull remote changes from server
      await this.pullRemoteChanges();
      
      // Step 3: Resolve conflicts if any
      await this.resolveConflicts();
      
      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async pushLocalChanges() {
    const pendingChanges = await this.db.prepare(`
      SELECT * FROM sync_queue 
      WHERE attempts < 3 
      ORDER BY createdAt
    `).all();

    for (const change of pendingChanges) {
      try {
        const response = await this.apiClient.post('/inventory/sync', {
          table: change.tableName,
          recordId: change.recordId,
          operation: change.operation,
          data: JSON.parse(change.data),
          timestamp: change.createdAt,
        });

        if (response.status === 200) {
          // Success - remove from queue
          await this.db.prepare('DELETE FROM sync_queue WHERE id = ?')
            .run(change.id);
        } else if (response.status === 409) {
          // Conflict - mark for resolution
          await this.db.prepare(`
            UPDATE sync_queue 
            SET syncStatus = 'conflict', serverData = ?
            WHERE id = ?
          `).run(JSON.stringify(response.data), change.id);
        }
      } catch (error) {
        // Network error - increment attempts
        await this.db.prepare(`
          UPDATE sync_queue 
          SET attempts = attempts + 1, lastAttempt = ?
          WHERE id = ?
        `).run(new Date().toISOString(), change.id);
      }
    }
  }

  private async pullRemoteChanges() {
    const lastSync = await this.getLastSyncTimestamp();
    
    const response = await this.apiClient.get('/inventory/changes', {
      params: { since: lastSync }
    });

    const remoteChanges = response.data.changes;

    for (const change of remoteChanges) {
      const localRecord = await this.getLocalRecord(
        change.tableName,
        change.recordId
      );

      if (!localRecord) {
        // New record - insert
        await this.insertLocalRecord(change.tableName, change.data);
      } else if (localRecord.updatedAt < change.updatedAt) {
        // Remote is newer - update local
        await this.updateLocalRecord(
          change.tableName,
          change.recordId,
          change.data
        );
      } else if (localRecord.updatedAt > change.updatedAt) {
        // Local is newer - potential conflict
        await this.markConflict(change.tableName, change.recordId, {
          local: localRecord,
          remote: change.data,
        });
      }
    }
  }

  private async resolveConflicts() {
    const conflicts = await this.db.prepare(`
      SELECT * FROM sync_queue WHERE syncStatus = 'conflict'
    `).all();

    for (const conflict of conflicts) {
      // Conflict resolution strategies:
      // 1. Last write wins (timestamp)
      // 2. Server always wins
      // 3. Manual resolution required

      const strategy = this.getConflictStrategy(conflict.tableName);

      if (strategy === 'last_write_wins') {
        const local = JSON.parse(conflict.data);
        const remote = JSON.parse(conflict.serverData);

        if (new Date(local.updatedAt) > new Date(remote.updatedAt)) {
          // Local is newer - push to server with force flag
          await this.forceUpdateServer(conflict);
        } else {
          // Remote is newer - accept remote changes
          await this.acceptRemoteChanges(conflict);
        }
      } else if (strategy === 'server_wins') {
        await this.acceptRemoteChanges(conflict);
      } else {
        // Manual resolution - notify user
        await this.notifyConflict(conflict);
      }
    }
  }

  private getConflictStrategy(tableName: string): string {
    // Different tables can have different strategies
    const strategies = {
      drugs: 'last_write_wins',
      lab_services: 'server_wins',
      prescription_fulfillments: 'manual',
    };
    
    return strategies[tableName] || 'last_write_wins';
  }

  private isOnline(): boolean {
    return navigator.onLine;
  }

  // Optimistic locking for critical operations
  async updateWithLock(
    tableName: string,
    recordId: string,
    updates: any,
    version: number
  ) {
    const response = await this.apiClient.put(
      `/inventory/${tableName}/${recordId}`,
      {
        ...updates,
        version, // Send current version
      }
    );

    if (response.status === 409) {
      // Version conflict - fetch latest and retry
      throw new Error('Record has been modified by another user');
    }

    return response.data;
  }
}
```

### 21.10 Backup & Restore System

```typescript
// Backup & Restore Service
// src/services/backup.service.ts

export class BackupService {
  private s3Client: S3Client;
  private db: Database;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  // Automatic daily backup at 2 AM
  scheduleAutomaticBackup() {
    const schedule = require('node-schedule');
    
    // Run at 2 AM every day
    schedule.scheduleJob('0 2 * * *', async () => {
      console.log('Starting automatic backup...');
      await this.createBackup(BackupType.AUTO);
    });
  }

  async createBackup(type: BackupType): Promise<Backup> {
    const backupId = `backup_${Date.now()}`;
    const timestamp = new Date();

    console.log(`Creating ${type} backup: ${backupId}`);

    // Step 1: Create database dump
    const dumpPath = await this.createDatabaseDump(backupId);

    // Step 2: Compress the dump
    const compressedPath = await this.compressBackup(dumpPath);

    // Step 3: Calculate checksum
    const checksum = await this.calculateChecksum(compressedPath);

    // Step 4: Upload to S3
    const cloudUrl = await this.uploadToCloud(compressedPath, backupId);

    // Step 5: Save backup metadata
    const backup: Backup = {
      id: backupId,
      timestamp,
      type,
      size: this.getFileSize(compressedPath),
      location: cloudUrl,
      status: BackupStatus.COMPLETED,
      recordCount: await this.getRecordCount(),
      checksum,
    };

    await this.saveBackupMetadata(backup);

    // Step 6: Clean up old backups (keep last 30 days)
    await this.cleanupOldBackups();

    console.log(`Backup completed: ${backupId}`);
    return backup;
  }

  private async createDatabaseDump(backupId: string): Promise<string> {
    const fs = require('fs');
    const path = require('path');
    
    const backupDir = path.join(app.getPath('userData'), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const dumpPath = path.join(backupDir, `${backupId}.sql`);

    // Export all tables to SQL
    const tables = ['drugs', 'lab_services', 'stock_movements', 'prescription_fulfillments'];
    let sqlDump = '';

    for (const table of tables) {
      const rows = this.db.prepare(`SELECT * FROM ${table}`).all();
      
      sqlDump += `-- Table: ${table}\n`;
      sqlDump += `DELETE FROM ${table};\n`;

      for (const row of rows) {
        const columns = Object.keys(row).join(', ');
        const values = Object.values(row)
          .map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v)
          .join(', ');
        
        sqlDump += `INSERT INTO ${table} (${columns}) VALUES (${values});\n`;
      }
      
      sqlDump += '\n';
    }

    fs.writeFileSync(dumpPath, sqlDump);
    return dumpPath;
  }

  private async compressBackup(filePath: string): Promise<string> {
    const zlib = require('zlib');
    const fs = require('fs');
    const { pipeline } = require('stream/promises');

    const compressedPath = `${filePath}.gz`;
    const gzip = zlib.createGzip();
    const source = fs.createReadStream(filePath);
    const destination = fs.createWriteStream(compressedPath);

    await pipeline(source, gzip, destination);

    // Delete uncompressed file
    fs.unlinkSync(filePath);

    return compressedPath;
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    const crypto = require('crypto');
    const fs = require('fs');
    
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  private async uploadToCloud(filePath: string, backupId: string): Promise<string> {
    const fs = require('fs');
    const fileStream = fs.createReadStream(filePath);

    const uploadParams = {
      Bucket: process.env.S3_BACKUP_BUCKET!,
      Key: `pharmacy-backups/${backupId}.sql.gz`,
      Body: fileStream,
      ServerSideEncryption: 'AES256',
      Metadata: {
        backupId,
        timestamp: new Date().toISOString(),
      },
    };

    await this.s3Client.send(new PutObjectCommand(uploadParams));

    return `https://${process.env.S3_BACKUP_BUCKET}.s3.amazonaws.com/pharmacy-backups/${backupId}.sql.gz`;
  }

  async restoreBackup(backupId: string): Promise<void> {
    console.log(`Starting restore from backup: ${backupId}`);

    const backup = await this.getBackupMetadata(backupId);
    
    if (!backup) {
      throw new Error('Backup not found');
    }

    // Step 1: Download backup from cloud
    const localPath = await this.downloadFromCloud(backup.location, backupId);

    // Step 2: Decompress
    const decompressedPath = await this.decompressBackup(localPath);

    // Step 3: Verify checksum
    const checksum = await this.calculateChecksum(localPath);
    if (checksum !== backup.checksum) {
      throw new Error('Backup file corrupted - checksum mismatch');
    }

    // Step 4: Create backup of current database before restore
    await this.createBackup(BackupType.MANUAL);

    // Step 5: Restore database
    await this.restoreDatabase(decompressedPath);

    console.log('Restore completed successfully');
  }

  private async downloadFromCloud(url: string, backupId: string): Promise<string> {
    const path = require('path');
    const fs = require('fs');
    const https = require('https');

    const localPath = path.join(
      app.getPath('userData'),
      'temp',
      `${backupId}.sql.gz`
    );

    // Ensure temp directory exists
    const tempDir = path.dirname(localPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(localPath);
      
      https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(localPath);
        });
      }).on('error', (err) => {
        fs.unlinkSync(localPath);
        reject(err);
      });
    });
  }

  private async decompressBackup(filePath: string): Promise<string> {
    const zlib = require('zlib');
    const fs = require('fs');
    const { pipeline } = require('stream/promises');

    const decompressedPath = filePath.replace('.gz', '');
    const gunzip = zlib.createGunzip();
    const source = fs.createReadStream(filePath);
    const destination = fs.createWriteStream(decompressedPath);

    await pipeline(source, gunzip, destination);

    return decompressedPath;
  }

  private async restoreDatabase(sqlFilePath: string): Promise<void> {
    const fs = require('fs');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Execute SQL statements
    this.db.exec(sqlContent);
  }

  private async cleanupOldBackups() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldBackups = await this.db.**Document Version:** 8.0  
**Last Updated:** November 9, 2025  
**Prepared By:** HealthConnect Development Team

---

## 21. Pharmacy & Hospital Inventory Management System

### 21.1 System Overview

The HealthConnect Inventory Management System enables pharmacies and hospitals to:
- Manage drug inventory in real-time
- Track laboratory services availability
- Synchronize inventory with the mobile app
- Enable geofencing-based search for patients
- Operate offline with automatic synchronization
- Integrate with existing pharmacy management systems via API

### 21.2 Desktop Application Architecture

**Platform:** Cross-platform desktop app (Windows, macOS, Linux)  
**Technology Stack:**
- **Framework:** Electron.js with React + TypeScript
- **State Management:** Redux Toolkit with Redux Persist
- **Local Database:** SQLite (embedded)
- **Sync Engine:** Custom sync with conflict resolution
- **UI Library:** Ant Design or Material-UI
- **Charts:** Recharts
- **Print:** Electron print API
- **Auto-updates:** electron-updater
- **Offline Support:** Service Workers + IndexedDB

**Why Electron:**
- Single codebase for all platforms
- Web technologies (React) - familiar to developers
- Native OS integration
- Auto-update capabilities
- Robust offline support
- Easy deployment

### 21.3 Desktop App Features

#### Core Features:
1. **Inventory Management**
   - Add/edit/delete drugs
   - Categorize by drug type
   - Track stock levels
   - Set reorder points
   - Batch/lot number tracking
   - Expiry date monitoring
   - Barcode/QR code scanning

2. **Service Management**
   - Lab services catalog
   - Service availability status
   - Pricing management
   - Service categories

3. **Real-time Sync**
   - Automatic sync when online
   - Manual sync option
   - Conflict resolution
   - Sync status indicators
   - Last sync timestamp

4. **Offline Mode**
   - Full functionality offline
   - Queue changes for sync
   - Local SQLite database
   - Automatic sync on reconnection

5. **Prescription Fulfillment**
   - Receive prescriptions from doctors
   - Mark prescriptions as ready
   - Track prescription status
   - Generate pickup notifications

6. **Reporting & Analytics**
   - Sales reports
   - Stock movement reports
   - Expiry alerts
   - Low stock alerts
   - Revenue analytics

7. **User Management**
   - Multi-user support
   - Role-based access (Admin, Pharmacist, Clerk)
   - Activity logs
   - User permissions

8. **Backup & Restore**
   - Automatic daily backups
   - Manual backup option
   - Cloud backup (AWS S3)
   - Local backup to external drive
   - One-click restore

### 21.4 Data Models for Inventory

```typescript
// Drug Inventory Model
interface Drug {
  id: string;
  name: string;
  genericName: string;
  brandName?: string;
  category: DrugCategory;
  form: DrugForm; // Tablet, Capsule, Syrup, Injection, etc.
  strength: string;
  manufacturer: string;
  batchNumber: string;
  expiryDate: Date;
  quantityInStock: number;
  reorderLevel: number;
  unitPrice: number;
  sellingPrice: number;
  barcode?: string;
  requiresPrescription: boolean;
  storageConditions?: string;
  sideEffects?: string;
  contraindications?: string;
  dosageInstructions?: string;
  pharmacyId: string;
  isAvailable: boolean;
  lastRestocked: Date;
  createdAt: Date;
  updatedAt: Date;
  syncStatus: SyncStatus; // synced, pending, conflict
  lastSyncedAt?: Date;
}

enum DrugCategory {
  ANALGESICS = 'Analgesics',
  ANTIBIOTICS = 'Antibiotics',
  ANTIMALARIALS = 'Antimalarials',
  ANTIHYPERTENSIVES = 'Antihypertensives',
  ANTIDIABETICS = 'Antidiabetics',
  VITAMINS = 'Vitamins',
  SUPPLEMENTS = 'Supplements',
  DERMATOLOGY = 'Dermatology',
  GASTRO = 'Gastroenterology',
  RESPIRATORY = 'Respiratory',
  CARDIO = 'Cardiovascular',
  OTHER = 'Other',
}

enum DrugForm {
  TABLET = 'Tablet',
  CAPSULE = 'Capsule',
  SYRUP = 'Syrup',
  SUSPENSION = 'Suspension',
  INJECTION = 'Injection',
  CREAM = 'Cream',
  OINTMENT = 'Ointment',
  DROPS = 'Drops',
  INHALER = 'Inhaler',
  PATCH = 'Patch',
  OTHER = 'Other',
}

enum SyncStatus {
  SYNCED = 'synced',
  PENDING = 'pending',
  CONFLICT = 'conflict',
  ERROR = 'error',
}

// Laboratory Service Model
interface LabService {
  id: string;
  name: string;
  category: LabCategory;
  description: string;
  price: number;
  estimatedDuration: number; // in minutes
  requiresFasting: boolean;
  specialInstructions?: string;
  isAvailable: boolean;
  facilityId: string;
  createdAt: Date;
  updatedAt: Date;
  syncStatus: SyncStatus;
}

enum LabCategory {
  BLOOD_TEST = 'Blood Test',
  URINE_TEST = 'Urine Analysis',
  STOOL_TEST = 'Stool Test',
  IMAGING = 'Imaging',
  BIOPSY = 'Biopsy',
  MICROBIOLOGY = 'Microbiology',
  PATHOLOGY = 'Pathology',
  OTHER = 'Other',
}

// Stock Movement Model
interface StockMovement {
  id: string;
  drugId: string;
  movementType: MovementType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  reference?: string; // Invoice number, prescription ID, etc.
  performedBy: string;
  timestamp: Date;
  syncStatus: SyncStatus;
}

enum MovementType {
  RESTOCK = 'Restock',
  SALE = 'Sale',
  RETURN = 'Return',
  ADJUSTMENT = 'Adjustment',
  EXPIRED = 'Expired',
  DAMAGED = 'Damaged',
  TRANSFER = 'Transfer',
}

// Prescription Fulfillment Model
interface PrescriptionFulfillment {
  id: string;
  prescriptionId: string;
  pharmacyId: string;
  patientId: string;
  doctorId: string;
  medications: PrescriptionMedication[];
  totalAmount: number;
  status: FulfillmentStatus;
  receivedAt: Date;
  preparedAt?: Date;
  completedAt?: Date;
  pickedUpAt?: Date;
  notes?: string;
  syncStatus: SyncStatus;
}

interface PrescriptionMedication {
  drugId: string;
  drugName: string;
  quantity: number;
  dispensedQuantity: number;
  unitPrice: number;
  totalPrice: number;
  isAvailable: boolean;
  substituteOffered?: string;
}

enum FulfillmentStatus {
  RECEIVED = 'received',
  PREPARING = 'preparing',
  READY = 'ready',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// Backup Model
interface Backup {
  id: string;
  timestamp: Date;
  type: BackupType;
  size: number; // in bytes
  location: string; // file path or cloud URL
  status: BackupStatus;
  recordCount: number;
  checksum: string;
}

enum BackupType {
  AUTO = 'automatic',
  MANUAL = 'manual',
}

enum BackupStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
```

### 21.5 Desktop App Implementation

```typescript
// Desktop App: Main Process (Electron)
// src/main/index.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import Database from 'better-sqlite3';
import path from 'path';

class InventoryApp {
  private mainWindow: BrowserWindow | null = null;
  private db: Database.Database;

  constructor() {
    this.db = this.initializeDatabase();
    this.setupIPCHandlers();
    this.startAutoUpdater();
  }

  private initializeDatabase(): Database.Database {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'inventory.db');
    const db = new Database(dbPath);

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS drugs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        genericName TEXT,
        brandName TEXT,
        category TEXT NOT NULL,
        form TEXT NOT NULL,
        strength TEXT NOT NULL,
        manufacturer TEXT,
        batchNumber TEXT,
        expiryDate TEXT,
        quantityInStock INTEGER NOT NULL,
        reorderLevel INTEGER,
        unitPrice REAL NOT NULL,
        sellingPrice REAL NOT NULL,
        barcode TEXT,
        requiresPrescription INTEGER,
        pharmacyId TEXT NOT NULL,
        isAvailable INTEGER NOT NULL,
        lastRestocked TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT NOT NULL DEFAULT 'pending',
        lastSyncedAt TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_drugs_pharmacy ON drugs(pharmacyId);
      CREATE INDEX IF NOT EXISTS idx_drugs_name ON drugs(name);
      CREATE INDEX IF NOT EXISTS idx_drugs_sync ON drugs(syncStatus);

      CREATE TABLE IF NOT EXISTS lab_services (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        estimatedDuration INTEGER,
        requiresFasting INTEGER,
        specialInstructions TEXT,
        isAvailable INTEGER NOT NULL,
        facilityId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT NOT NULL DEFAULT 'pending'
      );

      CREATE TABLE IF NOT EXISTS stock_movements (
        id TEXT PRIMARY KEY,
        drugId TEXT NOT NULL,
        movementType TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        previousQuantity INTEGER NOT NULL,
        newQuantity INTEGER NOT NULL,
        reason TEXT,
        reference TEXT,
        performedBy TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        syncStatus TEXT NOT NULL DEFAULT 'pending',
        FOREIGN KEY (drugId) REFERENCES drugs(id)
      );

      CREATE TABLE IF NOT EXISTS prescription_fulfillments (
        id TEXT PRIMARY KEY,
        prescriptionId TEXT NOT NULL,
        pharmacyId TEXT NOT NULL,
        patientId TEXT NOT NULL,
        doctorId TEXT NOT NULL,
        medications TEXT NOT NULL, -- JSON
        totalAmount REAL NOT NULL,
        status TEXT NOT NULL,
        receivedAt TEXT NOT NULL,
        preparedAt TEXT,
        completedAt TEXT,
        pickedUpAt TEXT,
        notes TEXT,
        syncStatus TEXT NOT NULL DEFAULT 'pending'
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tableName TEXT NOT NULL,
        recordId TEXT NOT NULL,
        operation TEXT NOT NULL,
        data TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        attempts INTEGER DEFAULT 0,
        lastAttempt TEXT
      );

      CREATE TABLE IF NOT EXISTS backups (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        type TEXT NOT NULL,
        size INTEGER NOT NULL,
        location TEXT NOT NULL,
        status TEXT NOT NULL,
        recordCount INTEGER NOT NULL,
        checksum TEXT NOT NULL
      );
    `);

    return db;
  }

  private setupIPCHandlers() {
    // Drug operations
    ipcMain.handle('drug:create', async (_, drug) => {
      return this.createDrug(drug);
    });

    ipcMain.handle('drug:update', async (_, id, updates) => {
      return this.updateDrug(id, updates);
    });

    ipcMain.handle('drug:delete', async (_, id) => {
      return this.deleteDrug(id);
    });

    ipcMain.handle('drug:getAll', async () => {
      return this.getAllDrugs();
    });

    ipcMain.handle('drug:search', async (_, query) => {
      return this.searchDrugs(query);
    });

    // Sync operations
    ipcMain.handle('sync:start', async () => {
      return this.syncWithServer();
    });

    ipcMain.handle('sync:getStatus', async () => {
      return this.getSyncStatus();
    });

    // Backup operations
    ipcMain.handle('backup:create', async (_, type) => {
      return this.createBackup(type);
    });

    ipcMain.handle('backup:restore', async (_, backupId) => {
      return this.restoreBackup(backupId);
    });

    ipcMain.handle('backup:getAll', async () => {
      return this.getAllBackups();
    });

    // Prescription operations
    ipcMain.handle('prescription:receive', async (_, prescription) => {
      return this.receivePrescription(prescription);
    });

    ipcMain.handle('prescription:updateStatus', async (_, id, status) => {
      return this.updatePrescriptionStatus(id, status);
    });
  }

  // Drug CRUD operations
  private createDrug(drug: any) {
    const stmt = this.db.prepare(`
      INSERT INTO drugs (
        id, name, genericName, category, form, strength,
        manufacturer, batchNumber, expiryDate, quantityInStock,
        reorderLevel, unitPrice, sellingPrice, pharmacyId,
        isAvailable, createdAt, updatedAt, syncStatus
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      drug.id,
      drug.name,
      drug.genericName,
      drug.category,
      drug.form,
      drug.strength,
      drug.manufacturer,
      drug.batchNumber,
      drug.expiryDate,
      drug.quantityInStock,
      drug.reorderLevel,
      drug.unitPrice,
      drug.sellingPrice,
      drug.pharmacyId,
      drug.isAvailable ? 1 : 0,
      new Date().toISOString(),
      new Date().toISOString(),
      'pending'
    );

    // Add to sync queue
    this.addToSyncQueue('drugs', drug.id, 'CREATE', drug);

    return { success: true, id: drug.id };
  }

  private updateDrug(id: string, updates: any) {
    const stmt = this.db.prepare(`
      UPDATE drugs 
      SET name = ?, quantityInStock = ?, sellingPrice = ?,
          updatedAt = ?, syncStatus = 'pending'
      WHERE id = ?
    `);

    stmt.run(
      updates.name,
      updates.quantityInStock,
      updates.sellingPrice,
      new Date().toISOString(),
      id
    );

    // Add to sync queue
    this.addToSyncQueue('drugs', id, 'UPDATE', updates);

    return { success: true };
  }

  private getAllDrugs() {
    const stmt = this.db.prepare('SELECT * FROM drugs ORDER BY name');
    return stmt.all();
  }

  private searchDrugs(query: string) {
    const stmt = this.db.prepare(`
      SELECT * FROM drugs 
      WHERE name LIKE ? OR genericName LIKE ?
      ORDER BY name
    `);
    return stmt.all(`%${query}%`, `%${query}%`);
  }

  // Sync with server
  private async syncWithServer() {
    const pendingChanges = this.db.prepare(`
      SELECT * FROM sync_queue ORDER BY id
    `).all();

    for (const change of pendingChanges) {
      try {
        // Send to server
        const response = await fetch(`${process.env.API_URL}/api/v1/inventory/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAuthToken()}`,
          },
          body: JSON.stringify({
            table: change.tableName,
            recordId: change.recordId,
            operation: change.operation,
            data: JSON.parse(change.data),
          }),
        });

        if (response.ok) {
          // Remove from sync queue
          this.db.prepare('DELETE FROM sync_queue WHERE id = ?').run(change.id);
          
          // Update sync status
          this.db.prepare(`
            UPDATE ${change.tableName} 
            SET syncStatus = 'synced', lastSyncedAt = ?
            WHERE id = ?
          `).run(new Date().toISOString(), change.recordId);
        } else {
          // Increment attempts
          this.db.prepare(`
            UPDATE sync_queue 
            SET attempts = attempts + 1, lastAttempt = ?
            WHERE id = ?
          `).run(new Date().toISOString(), change.id);
        }
      } catch (error) {
        console.error('Sync error:', error);
      }
    }

    // Pull changes from server
    await this.pullChangesFromServer();

    return { success: true, synced: pendingChanges.length };
  }

  private async pullChangesFromServer() {
    const lastSync = this.getLastSyncTimestamp();
    
    const response = await fetch(
      `${process.env.API_URL}/api/v1/inventory/changes?since=${lastSync}`,
      {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      }
    );

    const changes = await response.json();

    for (const change of changes.data) {
      // Apply changes to local database
      // Handle conflicts if necessary
      this.applyRemoteChange(change);
    }
  }

  // Backup operations
  private async createBackup(type: BackupType) {
    const backupId = `backup_${Date.now()}`;
    const userDataPath = app.getPath('userData');
    const backupPath = path.join(userDataPath, 'backups', `${backupId}.db`);

    // Create backup directory if not exists
    const fs = require('fs');
    const backupDir = path.join(userDataPath, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Copy database file
    const dbPath = this.db.name;
    fs.copyFileSync(dbPath, backupPath);

    // Get file size
    const stats = fs.statSync(backupPath);

    // Calculate checksum
    const crypto = require('crypto');
    const fileBuffer = fs.readFileSync(backupPath);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Get record count
    const recordCount = this.db.prepare('SELECT COUNT(*) as count FROM drugs').get().count;

    // Save backup metadata
    this.db.prepare(`
      INSERT INTO backups (id, timestamp, type, size, location, status, recordCount, checksum)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      backupId,
      new Date().toISOString(),
      type,
      stats.size,
      backupPath,
      BackupStatus.COMPLETED,
      recordCount,
      checksum
    );

    // Upload to cloud (AWS S3)
    await this.uploadBackupToCloud(backupPath, backupId);

    return { success: true, backupId, size: stats.size };
  }

  private async uploadBackupToCloud(filePath: string, backupId: string) {
    // AWS S3 upload logic
    const AWS = require('aws-sdk');
    const fs = require('fs');
    
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });

    const fileContent = fs.readFileSync(filePath);

    const params = {
      Bucket: process.env.S3_BACKUP_BUCKET,
      Key: `pharmacy-backups/${backupId}.db`,
      Body: fileContent,
      ServerSideEncryption: 'AES256',
    };

    try {
      await s3.upload(params).promise();
      console.log('Backup uploaded to cloud successfully');
    } catch (error) {
      console.error('Cloud backup failed:', error);
    }
  }

  private addToSyncQueue(table: string, recordId: string, operation: string, data: any) {
    this.db.prepare(`
      INSERT INTO sync_queue (tableName, recordId, operation, data, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(table, recordId, operation, JSON.stringify(data), new Date().toISOString());
  }

  private getAuthToken(): string {
    // Retrieve from secure storage
    return process.env.AUTH_TOKEN || '';
  }

  private getLastSyncTimestamp(): string {
    const result = this.db.prepare(`
      SELECT MAX(lastSyncedAt) as lastSync FROM drugs
    `).get();
    return result?.lastSync || new Date(0).toISOString();
  }

  private startAutoUpdater() {
    autoUpdater.checkForUpdatesAndNotify();
    
    autoUpdater.on('update-downloaded', () => {
      // Notify user that update is available
      this.mainWindow?.webContents.send('update-available');
    });
  }
}

// Initialize app
app.whenReady().then(() => {
  new InventoryApp();
});
```

### 21.6 REST API for Inventory Integration

```typescript
// Backend API for Inventory Management
// src/api/v1/inventory/inventory.controller.ts

@Controller('api/v1/inventory')
export class InventoryController {
  constructor(
    private inventoryService: InventoryService,
    private geofencingService: GeofencingService
  ) {}

  // Drug CRUD endpoints
  @Post('drugs')
  @UseGuards(PharmacyAuthGuard)
  async createDrug(@Body() createDrugDto: CreateDrugDto, @Req() req) {
    return this.inventoryService.createDrug(createDrugDto, req.user.pharmacyId);
  }

  @Put('drugs/:id')
  @UseGuards(PharmacyAuthGuard)
  async updateDrug(@Param('id') id: string, @Body() updateDrugDto: UpdateDrugDto) {
    return this.inventoryService.updateDrug(id, updateDrugDto);
  }

  @Delete('drugs/:id')
  @UseGuards(PharmacyAuthGuard)
  async deleteDrug(@Param('id') id: string) {
    return this.inventoryService.deleteDrug(id);
  }

  @Get('drugs')
  @UseGuards(PharmacyAuthGuard)
  async getAllDrugs(@Req() req, @Query() query) {
    return this.inventoryService.getAllDrugs(req.user.pharmacyId, query);
  }

  // Sync endpoint
  @Post('sync')
  @UseGuards(PharmacyAuthGuard)
  async syncInventory(@Body() syncData: SyncDto, @Req() req) {
    return this.inventoryService.processSyncRequest(syncData, req.user.pharmacyId);
  }

  @Get('changes')
  @UseGuards(PharmacyAuthGuard)
  async getChanges(@Query('since') since: string, @Req() req) {
    return this.inventoryService.getChangesSince(since, req.user.pharmacyId);
  }

  // Search for drugs by name (for geofencing)
  @Get('search-drug')
  async searchDrugAvailability(@Query() searchDto: SearchDrugDto) {
    return this.geofencingService.findPharmaciesWithDrug(searchDto);
  }

  // Prescription fulfillment
  @Post('prescriptions/receive')
  @UseGuards(PharmacyAuthGuard)
  async receivePrescription(@Body() prescriptionDto: PrescriptionDto, @Req() req) {
    return this.inventoryService.receivePrescription(prescriptionDto, req.user.pharmacyId);
  }

  @Put('prescriptions/:id/status')
  @UseGuards(PharmacyAuthGuard)
  async updatePrescriptionStatus(
    @Param('id') id: string,
    @Body() statusDto: UpdateStatusDto
  ) {
    return this.inventoryService.updatePrescriptionStatus(id, statusDto.status);
  }

  // Lab services
  @Post('lab-services')
  @UseGuards(HospitalAuthGuard)
  async createLabService(@Body() serviceDto: CreateLabServiceDto, @Req() req) {
    return this.inventoryService.createLabService(serviceDto, req.user.facilityId);
  }

  @Get('lab-services')
  async getLabServices(@Query() query) {
    return this.inventoryService.getLabServices(query);
  }

  // Reports
  @Get('reports/low-stock')
  @UseGuards(PharmacyAuthGuard)
  async getLowStockReport(@Req() req) {
    return this.inventoryService.getLowStockReport(req.user.pharmacyId);
  }

  @Get('reports/expiring-soon')
  @UseGuards(PharmacyAuthGuard)
  async getExpiringSoonReport(@Req() req, @Query('days') days: number = 30) {
    return this.inventoryService.getExpiringSoonReport(req.user.pharmacyId, days);
  }
}
```

### 21.7 Dynamic Geofencing Algorithm

```typescript
// src/services/geofencing.service.ts

export class GeofencingService {
  constructor(
    private drugRepository: DrugRepository,
    private pharmacyRepository: PharmacyRepository,
    private googleMapsService: GoogleMapsService
  ) {}

  async findPharmaciesWithDrug(searchDto: SearchDrugDto) {
    const {
      drugName,
      latitude,
      longitude,
      radius = 10, // km
      requiredQuantity = 1,
    } = searchDto;

    // Step 1: Find all pharmacies within radius
    const nearbyPharmacies = await this.findNearbyPharmacies(
      latitude,
      longitude,
      radius
    );

    if (nearbyPharmacies.length === 0) {
      return {
        success: false,
        message: 'No pharmacies found in your area',
        pharmacies: [],
      };
    }

    // Step 2: Check drug availability in these pharmacies
    const pharmaciesWithDrug = [];

    for (const pharmacy of nearbyPharmacies) {
      const drugs = await this.drugRepository.find({
        where: {
          pharmacyId: pharmacy.id,
          isAvailable: true,
          quantityInStock: MoreThanOrEqual(requiredQuantity),
          $or: [
            { name: Like(`%${drugName}%`) },
            { genericName: Like(`%${drugName}%`) },
          ],
        },
      });

      if (drugs.length > 0) {
        // Calculate actual distance using Google Maps
        const distance = await this.calculateDistance(
          latitude,
          longitude,
          pharmacy.latitude,
          pharmacy.longitude
        );

        pharmaciesWithDrug.push({
          pharmacy: {
            id: pharmacy.id,
            name: pharmacy.name,
            address: pharmacy.address,
            phone: pharmacy.phone,
            latitude: pharmacy.latitude,
            longitude: pharmacy.longitude,
            rating: pharmacy.rating,
            isOpen: this.isPharmacyOpen(pharmacy),
          },
          drugs: drugs.map(drug => ({
            id: drug.id,
            name: drug.name,
            genericName: drug.genericName,
            form: drug.form,
            strength: drug.strength,
            price: drug.sellingPrice,
            quantityAvailable: drug.quantityInStock,
          })),
          distance: distance.distance,
          duration: distance.duration,
        });
      }
    }

    // Step 3: Sort by distance
    pharmaciesWithDrug.sort((a, b) => a.distance.value - b.distance.value);

    return {
      success: true,
      count: pharmaciesWithDrug.length,
      pharmacies: pharmaciesWithDrug,
    };
  }

  private async findNearbyPharmacies(
    latitude: number,
    longitude: number,
    radiusKm: number
  ) {
    // Using Haversine formula for initial filtering
    const R = 6371; // Earth's radius in km

    const pharmacies = await this.pharmacyRepository.findAll();

    return pharmacies.filter(pharmacy => {
      const dLat = this.toRad(pharmacy.latitude - latitude);
      const dLon = this.toRad(pharmacy.longitude - longitude);

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(this.toRad(latitude)) *
          Math.cos(this.toRad(pharmacy.latitude)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      return distance <= radiusKm;
    });
  }

  private async calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) {
    // Use Google Maps Distance Matrix API for accurate distance
    const result = await this.googleMapsService.getDistance(
      { lat: lat1, lng: lon1 },
      { lat: lat2, lng: lon2 }
    );

    return {
      distance: result.distance, // { text: "2.5 km", value: 2500 }
      duration: result.duration, // { text: "8 mins", value: 480 }
    };
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private isPharmacyOpen(pharmacy: Pharmacy): boolean {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday:# HealthConnect - Software Technical Documentation

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Functional Requirements](#functional-requirements)
5. [Non-Functional Requirements](#non-functional-requirements)
6. [Patient User Journey](#patient-user-journey)
7. [Doctor User Journey](#doctor-user-journey)
8. [Data Models](#data-models)
9. [Technical Architecture](#technical-architecture)
10. [API Specifications](#api-specifications)
11. [Third-Party Integrations](#third-party-integrations)
12. [Security & Privacy](#security--privacy)
13. [UI/UX Requirements](#uiux-requirements)

---

## 1. Executive Summary

**HealthConnect** is a mobile telemedicine application designed to connect patients with healthcare providers in Ghana, with special focus on rural accessibility. The platform enables voice/video consultations, prescription management, lab request coordination, and pharmacy connections while supporting local languages (Twi and English).

**Primary Objectives:**
- Reduce hospital overcrowding by facilitating online consultations
- Provide accessible healthcare for rural communities
- Enable efficient patient-doctor-pharmacy-lab coordination
- Ensure data privacy and secure health information management
- Support local language communication

---

## 2. System Overview

### 2.1 Platform Type
- **Primary:** Mobile application (iOS & Android)
- **Secondary:** Web dashboard (for doctors - optional)

### 2.2 Target Users
- **Patients:** General public seeking medical consultation
- **Doctors:** Licensed medical practitioners
- **Hospital Management:** Triage and patient routing
- **Pharmacies:** Prescription fulfillment (future phase)
- **Laboratories:** Test requests and results (future phase)

### 2.3 Core Features
1. Multi-language support (Twi/English)
2. Voice and video calling
3. Queue management system
4. Real-time translation and transcription
5. Lab request management
6. Prescription management with pharmacy integration
7. Payment processing (Paystack)
8. Location-based services (Google Maps)
9. Document upload and sharing
10. Automated triage system

---

## 3. User Roles & Permissions

### 3.1 Patient Role

**Capabilities:**
- Register and manage profile
- Search and filter doctors by specialty
- Initiate consultation requests
- Join queue for doctor consultation
- Make voice calls to doctors
- Request video calls (requires doctor approval)
- Record audio messages
- Receive prescriptions
- View and upload lab reports
- Make payments
- View consultation history
- Access pharmacy locations
- Rate and review doctors
- Receive post-consultation instructions

**Restrictions:**
- Cannot access doctor dashboard
- Cannot view other patients' information
- Cannot modify prescription details
- Cannot skip payment before consultation

### 3.2 Doctor Role

**Capabilities:**
- Register with medical license verification
- Set availability status (on-call/off-duty)
- View patient queue
- Accept/reject consultation requests
- Conduct voice calls with patients
- Grant/deny video call requests
- Access patient basic information (during consultation)
- View uploaded lab reports
- Send lab request forms to laboratories
- Create and send prescriptions
- Upload stamped prescription documents
- Share pharmacy locations with patients
- Provide post-consultation instructions
- View patient history (if returning patient)
- Refer patients to hospitals/specialists
- End consultations and generate summaries
- View earnings and payment history

**Restrictions:**
- Cannot modify patient personal data
- Cannot access other doctors' consultations
- Cannot process payments directly

### 3.3 Hospital Management Role

**Capabilities:**
- Receive incoming patient requests
- Perform initial triage assessment
- Route patients to appropriate doctors/specialists
- Determine urgency level (emergency vs routine)
- Assign doctors to patients
- View hospital queue status
- Generate reports

**Restrictions:**
- Cannot conduct consultations
- Cannot access detailed medical records without authorization

### 3.4 Administrator Role

**Capabilities:**
- Manage user accounts
- Verify doctor credentials
- Monitor system performance
- Access analytics and reports
- Manage payments and disputes
- Configure system settings
- Moderate content and reviews

---

## 4. Functional Requirements

### FR1: User Registration & Authentication

**FR1.1 Patient Registration**
- Collect: Full name, date of birth, gender, phone number, email (optional), location (region/district), emergency contact
- Support Twi and English language input
- Phone number verification via OTP
- Optional: National ID verification for enhanced security
- Create secure password (minimum 8 characters, mix of letters and numbers)
- Biometric authentication option (fingerprint/face ID)

**FR1.2 Doctor Registration**
- Collect: Full name, medical license number, specialty, years of experience, qualification documents, phone number, email, hospital affiliation (if any)
- Upload medical license and credentials
- Admin verification required before account activation
- Set consultation fees
- Define availability schedule
- Professional profile with bio

**FR1.3 Login System**
- Phone number or email login
- Password authentication
- Biometric authentication (if enabled)
- "Remember me" functionality
- Password recovery via phone/email
- Multi-device login support

### FR2: Language & Localization

**FR2.1 Default Language**
- App launches in Twi by default
- First-time users see language selection screen

**FR2.2 Language Switching**
- Toggle between Twi and English in settings
- Language preference saved to user profile
- All UI elements translated
- System messages and notifications translated

**FR2.3 Speech-to-Text & Translation**
- Real-time audio recording in both languages
- Automatic transcription of voice messages
- Optional: Real-time translation during calls (if Twi ↔ English)
- Transcription storage for consultation records

### FR3: Doctor Discovery & Search

**FR3.1 Doctor Listings**
- Browse available doctors by specialty
- Filter by:
  - Specialty (General Practitioner, Pediatrics, Cardiology, etc.)
  - Availability status
  - Consultation fees
  - Rating and reviews
  - Distance from patient location
  - Language spoken

**FR3.2 Doctor Profile**
- Display: Name, photo, specialty, experience, qualifications, ratings, reviews, consultation fee, average wait time, languages spoken
- Availability indicator (online/offline/busy)
- Current queue length

### FR4: Consultation Request & Queue Management

**FR4.1 Initiating Consultation**
- Patient selects doctor
- Patient types or records voice message describing symptoms
- System performs basic triage assessment based on input
- Patient confirms consultation fee
- Patient proceeds to payment

**FR4.2 Payment Processing**
- Integration with Paystack
- Support Mobile Money (MTN, Vodafone, AirtelTigo)
- Support card payments
- Display fee breakdown
- Payment confirmation before joining queue
- Local language support for payment prompts
- Payment receipt generation
- Refund policy display

**FR4.3 Queue Management**
- Patient added to doctor's queue after payment
- Display queue position and estimated wait time
- Real-time queue position updates
- Push notifications for queue progress
- Patient moves to "Ready" state when reaching front of queue
- Doctor receives notification of ready patient

**FR4.4 Queue Timeout**
- Patient has 3 minutes to accept call when ready
- System sends notification at 2-minute mark, 1-minute mark, and 30-second mark
- If no response within timeout period, patient removed from queue
- Consultation fee held for 24 hours for rescheduling
- Patient can rejoin queue without repayment within 24 hours

**FR4.5 Queue Abandonment**
- Patient can leave queue voluntarily
- Refund policy applies (e.g., full refund if leaving before consultation starts)
- Patient can reschedule for another time slot

### FR5: Communication System

**FR5.1 Voice Calling**
- Primary consultation mode
- WebRTC-based voice calls
- Call quality indicators
- Mute/unmute functionality
- Speaker/earpiece toggle
- Call recording (with consent notification)
- Call duration display
- Shortcodes for doctor calling (optional)

**FR5.2 Video Calling**
- Patient can request video call during voice consultation
- Doctor receives video call request notification
- Doctor can approve or deny request
- Mandatory for:
  - Skin conditions requiring visual inspection
  - Eye swelling or visible injuries
  - Rashes or lesions
  - Any condition requiring visual assessment
- Video quality adjustment based on network
- Camera switch (front/back)
- Video call recording (with consent)

**FR5.3 In-Call Features**
- Real-time transcription display (optional)
- Text chat backup (if call quality poor)
- Screen sharing (doctor can share educational materials)
- Call reconnection on network failure
- Emergency call escalation button

### FR6: Laboratory Services Integration

**FR6.1 Lab Request Creation**
- Doctor creates lab request form during/after consultation
- Pre-filled templates for common tests:
  - Blood tests (FBC, lipid profile, glucose, etc.)
  - Urine analysis
  - Stool tests
  - Imaging requests (X-ray, ultrasound, CT)
  - Other diagnostic tests
- Free-form text entry for custom requests
- Attach additional instructions

**FR6.2 Lab Request Delivery**
- System sends lab request directly to selected laboratory
- Patient receives copy of lab request
- Patient can download PDF of lab request
- Lab receives notification of new request

**FR6.3 Lab Report Upload**
- Patient uploads lab results (photo/PDF)
- Laboratory can send results directly to doctor (future phase)
- Doctor receives notification of uploaded results
- Doctor can review results and follow up with patient

### FR7: Prescription Management

**FR7.1 Prescription Creation**
- Doctor creates prescription during/after consultation
- Searchable drug database with common medications
- Specify: Drug name, dosage, frequency, duration, special instructions
- Support for generic and brand names
- Allergy warning system
- Drug interaction checking (if database available)

**FR7.2 Prescription Delivery**
- Digital prescription sent to patient immediately
- Prescription includes:
  - Doctor's name and license number
  - Patient's name and age
  - Date and time
  - Drug details
  - Doctor's digital signature/stamp
  - Verification QR code (optional)

**FR7.3 Pharmacy Integration**

**Option A: Pharmacy Partners Available**
- Doctor can send prescription directly to selected pharmacy
- Patient receives pharmacy location and contact
- Pharmacy receives prescription and prepares medication
- Patient gets notification when ready for pickup
- In-app navigation to pharmacy

**Option B: No Pharmacy Partners**
- Doctor uploads photo of handwritten/stamped prescription
- Prescription watermarked with verification details
- Patient downloads prescription document
- Patient presents at any pharmacy

**FR7.4 Prescription Document**
- Professional template with doctor's stamp/signature
- Hospital/clinic letterhead (if applicable)
- Tamper-proof features
- Downloadable as PDF
- Shareable via WhatsApp/other apps

### FR8: Location Services

**FR8.1 Google Maps Integration**
- Display nearby hospitals and clinics
- Display nearby pharmacies
- Display nearby laboratories
- Filter by service type
- Distance calculation from patient location
- Estimated travel time
- Turn-by-turn navigation (launches Google Maps app)

**FR8.2 Location Sharing**
- Doctor can share specific pharmacy/lab location with patient
- Patient receives GPS coordinates and address
- In-app distance calculation
- "Navigate" button opens Google Maps
- Similar UI/UX to Bolt/Uber distance display

**FR8.3 Geofencing (Optional)**
- Automatic routing based on patient location to nearest hospital
- Emergency services locator
- Service availability by region

### FR9: Post-Consultation Features

**FR9.1 Consultation Summary**
- Auto-generated summary of consultation
- Key points discussed
- Symptoms recorded
- Diagnosis (if provided)
- Prescriptions issued
- Lab tests requested
- Follow-up instructions
- Next appointment recommendations

**FR9.2 Instructions to Patient**
- Doctor can provide written instructions
- Voice-recorded instructions (with transcription)
- Lifestyle recommendations
- Warning signs to watch for
- When to seek emergency care
- Follow-up timeline

**FR9.3 Referrals**
- Doctor can refer patient to:
  - Hospital for in-person visit
  - Specialist doctor
  - Pharmacy for medication
  - Laboratory for tests
- Referral includes reason and urgency level
- Patient receives referral document

### FR10: Record Keeping & History

**FR10.1 Patient Medical Records**
- Consultation history with timestamps
- Doctor consulted and specialty
- Symptoms reported
- Diagnoses received
- Prescriptions issued
- Lab requests and results
- Audio/text transcripts (if enabled)
- Uploaded documents
- Searchable and filterable

**FR10.2 Doctor Consultation Records**
- List of patients consulted
- Consultation notes
- Prescriptions issued
- Referrals made
- Payment received
- Consultation duration
- Patient feedback/ratings

**FR10.3 Data Retention**
- Consultation records stored for minimum 5 years
- Call recordings stored for 90 days (configurable)
- Compliance with healthcare data retention laws
- Option for patient to delete records (with limitations)

### FR11: Payment System

**FR11.1 Payment Methods**
- Mobile Money (MTN, Vodafone, AirtelTigo)
- Credit/Debit Cards (Visa, Mastercard)
- Bank transfer (optional)
- Wallet system (prepaid balance)

**FR11.2 Payment Flow**
- Display consultation fee before payment
- Secure payment gateway (Paystack)
- Payment confirmation
- Transaction receipt
- Payment history
- Support for local currency (GHS)

**FR11.3 Payment Agreement**
- Patient must agree to fees before consultation
- Clear terms and conditions
- Refund policy displayed
- No hidden charges
- Payment breakdown (consultation fee + platform fee if applicable)

**FR11.4 Doctor Payouts**
- Automatic calculation of doctor earnings
- Scheduled payouts (weekly/bi-weekly)
- Payment threshold settings
- Transaction history
- Tax information (if required)

### FR12: Triage System

**FR12.1 Automated Triage**
- Analyze patient's symptom description
- Keyword detection for emergency conditions:
  - Chest pain
  - Difficulty breathing
  - Severe bleeding
  - Loss of consciousness
  - Severe allergic reactions
- Assign urgency level: Emergency, Urgent, Routine
- Emergency cases flagged for immediate attention

**FR12.2 Hospital Management Triage**
- Hospital staff can review patient request
- Assess severity based on symptoms and patient info
- Determine if suitable for telemedicine or needs in-person visit
- Route to appropriate specialist
- Prioritize emergency cases

**FR12.3 Emergency Handling**
- Emergency cases bypass queue
- Immediate notification to on-call doctor
- Option to redirect to emergency services (ambulance)
- Display nearest emergency facility

### FR13: Notifications System

**FR13.1 Push Notifications**
- Queue position updates
- Doctor availability
- Consultation start notification
- Call attempt notifications
- Timeout warnings
- Prescription ready
- Lab results uploaded
- Payment confirmations
- Appointment reminders

**FR13.2 SMS Notifications (Fallback)**
- Important notifications via SMS if app not active
- Especially for rural areas with limited internet

**FR13.3 In-App Notifications**
- Notification center
- Unread notification badge
- Notification history
- Customizable notification preferences

### FR14: Accessibility Features

**FR14.1 Rural Accessibility**
- Optimized for low bandwidth
- Offline mode for viewing history
- Data usage indicator
- Lite version of app (smaller download)
- Works on older smartphone models

**FR14.2 Usability**
- Large touch targets for easy tapping
- Clear visual hierarchy
- Simplified navigation
- Audio instructions for illiterate users
- High contrast mode
- Font size adjustment

**FR14.3 Network Resilience**
- Automatic call reconnection
- Message queuing when offline
- Data sync when connection restored
- Network quality indicator

### FR15: Rating & Feedback

**FR15.1 Patient Rating**
- Rate doctor after consultation (1-5 stars)
- Written review (optional)
- Specific feedback categories:
  - Professionalism
  - Communication clarity
  - Helpfulness
  - Wait time
- Anonymous rating option

**FR15.2 Doctor Feedback**
- Flag problematic patients (no-shows, abusive, etc.)
- Report system issues
- Provide app improvement suggestions

---

## 5. Non-Functional Requirements

### NFR1: Performance

**NFR1.1 Response Time**
- App launch: < 3 seconds
- Page navigation: < 1 second
- Search results: < 2 seconds
- Payment processing: < 5 seconds
- Call connection: < 5 seconds

**NFR1.2 Scalability**
- Support 10,000+ concurrent users
- Handle 1,000+ simultaneous consultations
- Database scalable to millions of records
- Load balancing for high traffic

**NFR1.3 Availability**
- 99.9% uptime SLA
- Maximum planned downtime: 4 hours/month
- Automatic failover for critical services
- 24/7 monitoring

### NFR2: Security

**NFR2.1 Data Encryption**
- End-to-end encryption for calls
- TLS 1.3 for data transmission
- AES-256 encryption for stored data
- Encrypted database backups

**NFR2.2 Authentication & Authorization**
- JWT token-based authentication
- Role-based access control (RBAC)
- Two-factor authentication (optional)
- Session timeout after 30 minutes of inactivity
- Secure password storage (bcrypt/scrypt)

**NFR2.3 Compliance**
- GDPR compliance (if applicable)
- HIPAA-equivalent standards for medical data
- Ghana Data Protection Act compliance
- Medical Board of Ghana regulations
- PCI DSS compliance for payments

### NFR3: Privacy

**NFR3.1 Data Protection**
- Patient data access only during active consultation
- Doctor cannot access patient data outside consultation context
- No data sharing with third parties without consent
- Right to data deletion (within legal limits)
- Data anonymization for analytics

**NFR3.2 Consent Management**
- Explicit consent for call recording
- Consent for data processing
- Opt-in for marketing communications
- Transparent privacy policy

### NFR4: Reliability

**NFR4.1 Error Handling**
- Graceful degradation on network failure
- Automatic retry for failed operations
- User-friendly error messages in Twi/English
- Detailed error logging for debugging

**NFR4.2 Data Integrity**
- Transaction atomicity for payments
- Database consistency checks
- Regular automated backups
- Data validation at all input points

### NFR5: Usability

**NFR5.1 User Interface**
- Intuitive navigation
- Consistent design language
- Accessibility guidelines (WCAG 2.1)
- Maximum 3 taps to reach any feature
- Clear call-to-action buttons

**NFR5.2 Onboarding**
- First-time user tutorial
- Contextual help tooltips
- FAQ section
- Video tutorials in Twi/English

### NFR6: Maintainability

**NFR6.1 Code Quality**
- Modular architecture
- Clean code principles
- Comprehensive documentation
- 80%+ code coverage for critical features
- Automated testing (unit, integration, E2E)

**NFR6.2 Monitoring & Logging**
- Application performance monitoring (APM)
- Error tracking and alerting
- User analytics
- Audit trails for sensitive operations

### NFR7: Compatibility

**NFR7.1 Mobile Platforms**
- iOS 13.0 and above
- Android 8.0 (API level 26) and above
- Responsive design for various screen sizes
- Tablet support

**NFR7.2 Network**
- Works on 2G/3G/4G/5G networks
- Graceful degradation on slow connections
- Offline mode for viewing history

### NFR8: Localization

**NFR8.1 Language Support**
- Full Twi translation
- Full English translation
- Right-to-left support (future: Arabic)
- Local date/time formats
- Local currency display

---

## 6. Patient User Journey

### Journey 1: First-Time User Registration

**Step 1: App Download & Launch**
- User downloads HealthConnect from App Store/Play Store
- User opens app
- Language selection screen appears (Twi selected by default)
- User can switch to English if preferred

**Step 2: Welcome Screen**
- Brief introduction to HealthConnect (3 slides max)
- Key features highlighted
- "Get Started" button

**Step 3: Registration**
- User selects "Sign Up as Patient"
- Form fields:
  - Full Name (First and Last)
  - Date of Birth (date picker)
  - Gender (Male/Female/Other/Prefer not to say)
  - Phone Number (with Ghana country code +233)
  - Email Address (optional)
  - Region/District (dropdown)
  - Emergency Contact Name and Number
  - Create Password
  - Confirm Password
- Checkbox: "I agree to Terms & Conditions and Privacy Policy"
- "Register" button

**Step 4: Phone Verification**
- OTP sent to phone number
- User enters 6-digit code
- "Verify" button
- Option to resend OTP after 60 seconds

**Step 5: Profile Setup (Optional)**
- Add profile photo
- Add medical history (allergies, chronic conditions)
- Add insurance information (if any)
- "Skip" or "Continue" options

**Step 6: Tutorial**
- Quick 4-step interactive tutorial:
  1. How to find a doctor
  2. How to join queue
  3. How to make payments
  4. How consultations work
- "Skip Tutorial" option available
- "Done" button leads to home screen

---

### Journey 2: Booking and Consulting a Doctor

**Step 1: Home Screen**
- Welcome message: "Akwaaba [User Name]" or "Welcome [User Name]"
- Quick actions:
  - "Consult a Doctor" (primary button)
  - "My Consultations"
  - "Upload Lab Results"
  - "Emergency"
- Recent doctors (if returning user)
- Health tips carousel

**Step 2: Doctor Selection**
- Tap "Consult a Doctor"
- Search bar at top
- Filter options:
  - Specialty (All, General, Pediatrics, Cardiology, etc.)
  - Availability (Online Now, Available Today, All)
  - Price Range (slider)
  - Rating (4+ stars, 3+ stars, All)
  - Distance (Nearest, Within 5km, Within 10km, All)
- Sort options:
  - Recommended
  - Lowest Price
  - Highest Rated
  - Shortest Wait Time

**Step 3: Doctor Profile View**
- Doctor's photo and name
- Specialty and qualifications
- Experience (years)
- Rating (stars and number of reviews)
- Consultation fee (e.g., GHS 50)
- Current status (Online/Offline/Busy)
- Queue length (e.g., "3 patients waiting")
- Estimated wait time (e.g., "~15 minutes")
- Languages spoken
- About section (bio)
- Reviews section (expandable)
- "Consult Now" button (green if available, gray if offline)

**Step 4: Symptom Description**
- Screen prompts: "Describe your symptoms" (in Twi: "Ka wo yareɛ ho asɛm")
- Two options:
  - Text input field
  - Voice recording button (hold to record)
- Recording indicator shows duration
- Play button to review audio
- Character/time limit indicator
- "Next" button

**Step 5: Triage Assessment**
- Brief assessment based on symptoms
- Questions may appear:
  - "How severe is the pain?" (1-10 scale)
  - "How long have you had these symptoms?"
  - "Is this an emergency?"
- System assigns urgency level (patient doesn't see this)

**Step 6: Fee Confirmation**
- Summary screen:
  - Doctor: Dr. [Name]
  - Specialty: [Specialty]
  - Consultation Fee: GHS [Amount]
  - Platform Fee: GHS [Amount] (if applicable)
  - Total: GHS [Total]
- Checkbox: "I agree to pay GHS [Total] for this consultation"
- "Proceed to Payment" button

**Step 7: Payment**
- Payment method selection:
  - Mobile Money (MTN, Vodafone, AirtelTigo)
  - Card Payment
  - Wallet Balance (if available)
- For Mobile Money:
  - Enter phone number
  - Confirm on phone via USSD prompt
  - Wait for payment confirmation
- For Card:
  - Enter card details (Paystack secure form)
  - 3D Secure verification
  - Payment confirmation
- Loading indicator: "Processing payment..."
- Success message: "Payment successful!"
- Receipt displayed with transaction ID
- "Continue" button

**Step 8: Joining Queue**
- Screen shows:
  - "You're in the queue!"
  - Queue position: "Position #3"
  - Estimated wait time: "~10 minutes"
  - Queue visualization (dots or progress bar)
  - Doctor's name and photo
- Real-time updates as queue moves
- "Leave Queue" button (bottom, in red)
- Timer showing elapsed wait time

**Step 9: Queue Updates**
- Push notifications:
  - "You're now #2 in the queue"
  - "You're next! Please be ready"
- Screen updates automatically
- When reaching front:
  - "Get Ready!" message
  - "Dr. [Name] will call you shortly"
  - Countdown timer: 3:00 minutes to accept

**Step 10: Incoming Call**
- Full-screen call notification
- Doctor's photo and name
- "Dr. [Name] is calling"
- Large green "Accept" button
- Red "Decline" button
- If missed:
  - Notification: "You missed the call"
  - Options:
    - "Call Back" (rejoin queue without payment)
    - "Reschedule"
    - "Get Refund"

**Step 11: Voice Consultation**
- In-call screen:
  - Doctor's photo and name
  - Call duration timer
  - Buttons:
    - Mute/Unmute microphone
    - Speaker/Earpiece toggle
    - Request Video (camera icon)
    - End Call (red button)
- Audio waveform visualization
- Network quality indicator
- Optional: Real-time transcription display (in Twi/English)

**Step 12: Video Call Request (If Needed)**
- Patient taps "Request Video" button
- Prompt: "Request video call? The doctor will review your request."
- "Send Request" or "Cancel"
- Waiting indicator: "Waiting for doctor's approval..."
- If approved:
  - Video screen opens
  - Camera preview
  - Same controls as voice + camera flip
- If denied:
  - Message: "Doctor has declined video request. Continuing voice call."

**Step 13: During Consultation**
- Doctor asks questions, patient responds
- Optional transcription visible on screen
- Doctor may:
  - Request more information
  - Ask patient to upload photos (e.g., rash)
  - Inform patient they'll prescribe medication
  - Inform patient they need lab tests
- Call reconnection if network drops

**Step 14: End of Consultation**
- Doctor ends call
- Screen shows: "Consultation ended"
- Duration: [X] minutes
- "View Summary" button appears
- "Rate Doctor" button

**Step 15: Consultation Summary**
- Auto-generated summary:
  - Date and time
  - Doctor's name
  - Duration
  - Symptoms discussed
  - Diagnosis (if provided)
  - Prescriptions issued (if any)
  - Lab tests requested (if any)
  - Instructions from doctor
  - Follow-up recommendations
- Buttons:
  - "Download Summary" (PDF)
  - "Share" (via WhatsApp, email)
  - "Done"

**Step 16: Prescription Received (If Applicable)**
- Push notification: "You have a new prescription"
- Prescription screen shows:
  - Doctor's name and stamp
  - Patient's name
  - Date
  - Medications list:
    - Drug name
    - Dosage
    - Frequency
    - Duration
    - Instructions
  - Doctor's signature/stamp
- Buttons:
  - "Download Prescription" (PDF)
  - "Send to Pharmacy" (if pharmacy integration available)
  - "Find Nearby Pharmacies"

**Step 17: Finding Pharmacy**
- Tap "Find Nearby Pharmacies"
- Map view with pharmacy markers
- List view toggle:
  - Pharmacy name
  - Address
  - Distance from user
  - Rating
  - Open/Closed status
  - Phone number
- Tap pharmacy:
  - Show details
  - "Navigate" button (opens Google Maps)
  - "Call" button
  - "Send Prescription" button (if integrated)
- If doctor shared specific pharmacy:
  - Highlight on map
  - Distance display: "1.5 km away" (similar to Bolt)
  - Estimated travel time: "5 minutes by car"

**Step 18: Lab Test Request (If Applicable)**
- Push notification: "You have a new lab request"
- Lab request screen shows:
  - Doctor's name
  - Tests requested
  - Instructions
  - Recommended laboratories (if doctor specified)
- Buttons:
  - "Download Lab Request" (PDF)
  - "Find Nearby Labs"
- Find Labs:
  - Map view with lab markers
  - List view with details
  - "Navigate" button for each lab

**Step 19: Rating Doctor**
- Rating screen:
  - "How was your consultation with Dr. [Name]?"
  - Star rating (1-5 stars, tap to select)
  - Specific ratings:
    - Professionalism (stars)
    - Communication (stars)
    - Helpfulness (stars)
  - Text review (optional)
  - Anonymous review checkbox
- "Submit Rating" button
- Thank you message
- Return to home screen

**Step 20: Post-Consultation**
- Consultation appears in "My Consultations" history
- Can access:
  - Consultation summary
  - Prescription (if issued)
  - Lab requests (if issued)
  - Audio recording (if available)
- Option to:
  - Book follow-up with same doctor
  - Upload lab results when ready
  - Message doctor (if enabled)

---

### Journey 3: Uploading Lab Results

**Step 1: Access Feature**
- From home screen, tap "Upload Lab Results"
- Or from consultation history, tap specific consultation

**Step 2: Select Consultation**
- If from home, list of recent consultations appears
- Select consultation for which lab results are available

**Step 3: Upload Files**
- Screen prompts: "Upload your lab results"
- Options:
  - Take Photo (camera opens)
  - Choose from Gallery (photo picker)
  - Choose Document (PDF picker)
- Multiple files can be selected
- Preview uploaded files
- Option to remove/replace files

**Step 4: Add Notes (Optional)**
- Text field: "Add any notes about these results"
- "Skip" or "Continue"

**Step 5: Submit**
- "Upload Results" button
- Loading indicator: "Uploading..."
- Success message: "Lab results uploaded successfully"
- Notification sent to doctor
- Return to consultation history

**Step 6: Doctor Review**
- Patient may receive notification:
  - "Dr. [Name] has reviewed your lab results"
  - Options:
    - "View Doctor's Comments"
    - "Schedule Follow-up"

---

### Journey 4: Emergency Consultation

**Step 1: Access Emergency**
- Red "Emergency" button on home screen
- Tap emergency button
- Warning prompt:
  - "Is this a life-threatening emergency?"
  - "For severe emergencies, call 112 or 193"
  - Options:
    - "Yes, this is urgent" (green)
    - "No, I need regular consultation" (gray)
    - "Call Emergency Services" (red, dials 193)

**Step 2: Emergency Symptom Entry**
- Simplified symptom entry
- Pre-populated emergency categories:
  - Chest pain
  - Difficulty breathing
  - Severe bleeding
  - Loss of consciousness
  - Severe allergic reaction
  - Other (text input)
- "Get Help Now" button

**Step 3: Instant Triage**
- System assesses severity
- If truly emergency:
  - Show nearest hospital on map
  - "Navigate to Hospital" button
  - "Call Hospital" button
  - Simultaneously connect to on-call doctor
- If urgent but not emergency:
  - Connect to available doctor immediately
  - Skip queue
  - Payment deducted from wallet or charged after

**Step 4: Priority Connection**
- "Connecting you to a doctor immediately..."
- First available doctor notified
- Call connects within 30 seconds
- If no answer, routes to next available doctor

**Step 5: Emergency Consultation**
- Video call automatically enabled (if patient has camera)
- Doctor assesses situation
- Doctor can:
  - Provide immediate guidance
  - Recommend going to hospital
  - Send ambulance (if available)
  - Prescribe emergency medication
  - Connect patient to specialist

**Step 6: Follow-up**
- Emergency consultation recorded
- Automatic follow-up scheduled
- Patient receives emergency summary
- Emergency contact notified (if configured)

---

## 7. Doctor User Journey

### Journey 1: Doctor Registration & Verification

**Step 1: App Download & Launch**
- Doctor downloads HealthConnect app
- Opens app
- Language selection (Twi/English)
- Welcome screen

**Step 2: Registration Selection**
- Selects "Sign Up as Doctor"
- Information screen:
  - "Register as a Healthcare Provider"
  - Requirements listed:
    - Valid medical license
    - Professional credentials
    - Hospital affiliation (optional)
  - "Continue" button

**Step 3: Personal Information**
- Form fields:
  - Full Name (as on license)
  - Date of Birth
  - Gender
  - Phone Number
  - Email Address (required for doctors)
  - Create Password
  - Confirm Password
- "Next" button

**Step 4: Professional Information**
- Form fields:
  - Medical License Number
  - Issuing Authority (dropdown: Ghana Medical & Dental Council, etc.)
  - Specialty (dropdown with searchable specialties)
  - Sub-specialty (optional)
  - Years of Experience
  - Current Hospital/Clinic Affiliation (optional)
  - Other Qualifications (text area)
  - Professional Bio (max 500 characters)
- "Next" button

**Step 5: Document Upload**
- Upload required documents:
  - Medical License (PDF/Image)
  - Professional ID (PDF/Image)
  - Qualification Certificates (PDF/Image, multiple allowed)
  - Recent Passport Photo
- Document preview after upload
- "Next" button

**Step 6: Consultation Settings**
- Set consultation fee (GHS): [slider or number input]
  - Recommended range displayed
- Set availability:
  - Days of week (checkbox for each day)
  - Time slots for each day
- Maximum patients per day (optional): [number input]
- Consultation duration (average): [15/30/45/60 minutes dropdown]
- Languages spoken: [checkboxes: English, Twi, Other]
- "Next" button

**Step 7: Payment Information**
- Bank account for payouts:
  - Bank Name (dropdown)
  - Account Number
  - Account Name
  - Branch (optional)
  - Mobile Money Number (alternative)
- Tax information (if applicable)
- "Submit Application" button

**Step 8: Verification Pending**
- Screen shows:
  - "Application Submitted Successfully!"
  - "Your application is under review"
  - "You'll receive an email/SMS within 24-48 hours"
  - Verification checklist:
    - Documents received ✓
    - License verification (pending)
    - Admin review (pending)
    - Account activation (pending)
- "Close" button

**Step 9: Verification Complete**
- Push notification: "Your doctor account has been approved!"
- Email confirmation sent
- SMS sent
- Doctor can now log in

**Step 10: First Login & Profile Setup**
- Login with credentials
- Complete profile:
  - Add profile photo
  - Review and edit bio
  - Set profile visibility preferences
- Tutorial for doctor features:
  1. How to go online/offline
  2. Managing queue
  3. Conducting consultations
  4. Prescriptions and referrals
- "Start Taking Consultations" button

---

### Journey 2: Daily Work Flow - Consultation

**Step 1: Starting the Day**
- Doctor opens app
- Dashboard shows:
  - Online/Offline toggle (currently Offline)
  - Today's statistics:
    - Patients consulted: 0
    - Earnings today: GHS 0
    - Average rating: [rating]
  - Upcoming scheduled consultations (if any)
  - "Go Online" button (large, green)

**Step 2: Going Online**
- Doctor toggles to "Online"
- Status changes to "Available"
- Toast notification: "You're now online and accepting patients"
- Doctor icon turns green on patient search results

**Step 3: Patient Request Notification**
- Push notification: "New patient request"
- In-app notification badge on "Queue" tab
- Doctor navigates to Queue screen

**Step 4: Queue Management Screen**
- List of patients in queue:
  - Patient name (or Patient ID if privacy-focused)
  - Chief complaint/symptoms preview
  - Wait time
  - Payment status (✓ Paid)
  - Urgency indicator (Emergency/Urgent/Routine)
- Emergency patients highlighted in red at top
- Urgent patients in orange
- Routine patients in green
- Sort options:
  - By urgency
  - By wait time
  - By payment time

**Step 5: Reviewing Patient Request**
- Doctor taps patient to view details:
  - Patient basic info (name, age, gender)
  - Chief complaint (text/audio transcription)
  - Urgency level assigned by system
  - How long patient has been waiting
  - Medical history (if returning patient)
  - Previous consultations (if any)
- Buttons:
  - "Call Patient" (green)
  - "Skip" (sends to bottom of queue)
  - "Reject" (with reason, refunds patient)

**Step 6: Initiating Call**
- Doctor taps "Call Patient"
- System attempts to connect
- Patient receives call notification
- Ringing indicator on doctor's screen
- If patient accepts within 30 seconds:
  - Call connects
- If patient doesn't accept:
  - Options:
    - "Try Again"
    - "Move to Bottom of Queue"
    - "Remove from Queue" (refund)

**Step 7: Voice Consultation**
- In-call screen:
  - Patient's name and age
  - Call timer
  - Controls:
    - Mute/Unmute
    - Speaker toggle
    - Approve Video Request (if patient requests)
    - Open Patient Notes (quick view)
    - End Consultation
- Audio waveform visualization
- Network quality indicator
- Notes panel (collapsible):
  - Quick notes during call
  - Templates for common conditions
  - Voice-to-text for notes

**Step 8: Approving Video Call**
- If patient requests video:
  - Notification appears: "Patient is requesting video call"
  - Buttons:
    - "Approve" (green)
    - "Decline" (red)
- If approved:
  - Video screen activates
  - Patient's video feed shows
  - Doctor's video feed in corner
  - Controls:
    - Switch camera (front/back)
    - Turn off video (keep voice)
    - Screenshot (for records, with consent)
    - Same consultation tools available

**Step 9: Taking Consultation Notes**
- Sidebar or overlay accessible during call
- Sections:
  - Chief Complaint (auto-filled from patient request)
  - History of Present Illness
  - Physical Examination (if video)
  - Assessment (diagnosis)
  - Plan (treatment plan)
- Quick templates for common conditions:
  - Upper Respiratory Infection
  - Malaria
  - Hypertension
  - Diabetes
  - Gastroenteritis
  - etc.
- Voice-to-text for hands-free note-taking

**Step 10: Prescribing Medication**
- During or after call, tap "Create Prescription"
- Prescription creation screen:
  - Search drug database:
    - Type drug name
    - Common drugs suggested
    - Recent prescriptions (for quick selection)
  - For each medication:
    - Drug name
    - Strength/dosage
    - Frequency (dropdown: Once daily, Twice daily, etc.)
    - Duration (number of days/weeks)
    - Special instructions (text field)
  - Add more medications (+ button)
  - Allergy check (if patient allergies on file)
- Preview prescription
- "Send to Patient" button
- Option to "Print" or "Upload Stamped Copy"

**Step 11: Uploading Physical Prescription**
- If doctor wants to send stamped/handwritten prescription:
  - Tap "Upload Stamped Prescription"
  - Options:
    - Take Photo (camera)
    - Choose from Gallery
  - Preview image
  - Crop/rotate tools
  - "Send to Patient" button
- Prescription sent to patient with doctor's stamp/signature visible

**Step 12: Sending Pharmacy Location**
- Tap "Recommend Pharmacy"
- Map opens with nearby pharmacies
- Doctor can:
  - Search for specific pharmacy
  - Select from favorites
  - Choose nearest pharmacy
- Tap pharmacy to select
- Confirm: "Send this pharmacy to patient?"
- Patient receives:
  - Pharmacy name, address, phone
  - GPS location
  - Distance from patient
  - Navigation link

**Step 13: Creating Lab Request**
- Tap "Request Lab Tests"
- Lab request screen:
  - Pre-defined test categories:
    - Blood Tests (expand for options):
      - Full Blood Count (FBC)
      - Blood Glucose
      - Lipid Profile
      - Liver Function Tests (LFT)
      - Renal Function Tests (RFT)
      - Malaria Test
      - HIV Test
      - Hepatitis Panel
      - Others (searchable)
    - Urine Tests
    - Stool Tests
    - Imaging:
      - X-Ray (specify area)
      - Ultrasound (specify area)
      - CT Scan
      - MRI
    - Other Tests (free text)
  - Select tests (checkboxes)
  - Add clinical notes/reason for test
  - Urgent checkbox (priority handling)
- "Send Lab Request" button
- Options:
  - Send to patient (patient takes to any lab)
  - Send to specific lab (if integrated)
  - Send to both

**Step 14: Giving Patient Instructions**
- Tap "Add Instructions"
- Text field for written instructions
- Or tap mic icon for voice instructions (auto-transcribed)
- Template options:
  - Medication instructions
  - Lifestyle advice
  - Follow-up timeline
  - Warning signs
  - Emergency indicators
- "Send Instructions" button
- Instructions added to consultation summary

**Step 15: Making Referrals**
- Tap "Refer Patient"
- Referral type:
  - Hospital Visit (for in-person examination)
  - Specialist Consultation (select specialty)
  - Pharmacy (for medication)
  - Laboratory (for tests)
  - Emergency (immediate hospital visit)
- Select urgency: Urgent/Routine
- Add referral notes
- Select facility (if specific hospital/clinic)
- "Send Referral" button
- Patient receives referral document

**Step 16: Ending Consultation**
- Tap "End Consultation" button
- Confirmation prompt: "Are you done with this consultation?"
- Options:
  - "Yes, End Consultation"
  - "Not yet, Continue"
- If ending:
  - Consultation time recorded
  - Automatic summary generation initiated
  - Call disconnects
  - Consultation moves to "Completed" list

**Step 17: Consultation Summary Auto-Generation**
- System compiles:
  - Patient details
  - Chief complaint
  - Doctor's notes
  - Diagnosis
  - Prescriptions issued
  - Lab tests requested
  - Instructions given
  - Referrals made
  - Consultation duration
- Doctor can review and edit summary
- "Finalize and Send" button
- Summary sent to patient automatically
- Copy saved in doctor's records

**Step 18: Moving to Next Patient**
- After ending consultation, screen shows:
  - "Consultation completed!"
  - Earnings updated
  - Next patient preview:
    - Name
    - Chief complaint
    - Wait time
  - Buttons:
    - "Call Next Patient" (green)
    - "Take a Break" (pauses queue, go offline temporarily)
    - "View Queue" (see all waiting patients)

**Step 19: Taking a Break**
- Doctor taps "Take a Break"
- Status changes to "On Break"
- Patients see "Doctor is temporarily unavailable"
- Queue pauses (patients keep their position)
- Timer: "Break time: 15:00" (countdown)
- Option to return early: "End Break"
- After break time expires, automatically back to "Available"

**Step 20: Going Offline**
- At end of shift, doctor toggles to "Offline"
- Confirmation: "Are you sure? [X] patients are still waiting"
- Options:
  - "Complete current queue" (no new patients, finish waiting ones)
  - "Go offline immediately" (patients notified, offered refund or wait)
- End of day summary:
  - Patients consulted: [number]
  - Total earnings: GHS [amount]
  - Average consultation time: [time]
  - Average rating: [stars]
  - Top issue consulted: [condition]

---

### Journey 3: Managing Patient Queue

**Step 1: Queue Dashboard**
- Accessible anytime via "Queue" tab
- Shows:
  - Current queue length: [number] patients
  - Estimated time to clear queue: [time]
  - Patients waiting:
    - List view with patient cards
    - Each card shows:
      - Patient name/ID
      - Wait time
      - Chief complaint preview
      - Urgency indicator
- Sort and filter options

**Step 2: Prioritizing Patients**
- Long-press or swipe on patient card for options:
  - Move to Top (for urgent cases)
  - Call Now
  - View Full Details
  - Remove from Queue (with reason)
- Drag-and-drop to reorder (optional)

**Step 3: Viewing Patient Details Before Call**
- Tap patient card to expand
- Shows:
  - Full symptom description (text/audio)
  - Medical history (if available)
  - Previous consultations with you (if any)
  - Allergies and chronic conditions
  - Current medications (if on file)
- Better preparation for consultation
- "Call Patient" button at bottom

**Step 4: Handling Difficult Cases**
- If case is too complex or outside specialty:
  - Tap "Refer to Another Doctor"
  - Select specialty required
  - Add notes for next doctor
  - Patient moved to different queue
  - Patient notified
  - Partial refund processed if needed

---

### Journey 4: Lab Results Review

**Step 1: Lab Results Notification**
- Push notification: "Patient [Name] uploaded lab results"
- Badge on "Results" tab

**Step 2: Accessing Results**
- Navigate to "Lab Results" or "Consultations"
- List of pending results to review:
  - Patient name
  - Test type
  - Upload date
  - Status (New/Reviewed)

**Step 3: Reviewing Results**
- Tap patient to view results
- Image viewer for scanned reports:
  - Pinch to zoom
  - Pan to navigate
  - Multiple images if uploaded
- PDF viewer for digital reports
- Side panel with original consultation notes

**Step 4: Adding Comments**
- Text field for doctor's interpretation
- Highlight critical values
- Recommendations:
  - Continue current treatment
  - Adjust medication
  - Further tests needed
  - Follow-up consultation
- Urgency indicator if results concerning

**Step 5: Follow-up Action**
- Options:
  - "Send Comments to Patient" (patient can read in app)
  - "Schedule Follow-up Consultation" (create appointment)
  - "Call Patient Now" (if urgent)
  - "Mark as Reviewed" (no action needed)

---

### Journey 5: Earnings & Payouts

**Step 1: Earnings Dashboard**
- Navigate to "Earnings" tab
- Overview:
  - Today: GHS [amount]
  - This Week: GHS [amount]
  - This Month: GHS [amount]
  - Pending Payout: GHS [amount]
- Chart showing earnings over time
- Breakdown:
  - Consultations: [number] x GHS [fee] = GHS [subtotal]
  - Platform Fee: - GHS [amount]
  - Net Earnings: GHS [total]

**Step 2: Transaction History**
- List of all consultations:
  - Date and time
  - Patient (anonymized if privacy enabled)
  - Consultation duration
  - Amount earned
  - Status (Completed/Refunded)
- Filter by date range
- Export as CSV

**Step 3: Payout Schedule**
- Next payout date: [date]
- Payout frequency: Weekly/Bi-weekly (configurable)
- Minimum payout threshold: GHS [amount]
- Bank account on file
- "Request Early Payout" (if available, with small fee)

**Step 4: Managing Payout Settings**
- Navigate to Settings > Payments
- Update bank details
- Change payout frequency
- Set minimum threshold
- View payout history

---

### Journey 6: Managing Availability

**Step 1: Schedule Settings**
- Navigate to Settings > Availability
- Weekly schedule view:
  - Each day shows set hours
  - Toggle days on/off
  - Edit time slots
- "I'm available now" quick toggle

**Step 2: Editing Schedule**
- Tap day to edit
- Set time blocks:
  - Start time (time picker)
  - End time (time picker)
  - Add break times (optional)
  - Add multiple blocks per day
- "Save Schedule" button

**Step 3: Time Off**
- "Request Time Off" button
- Select date range
- Add reason (optional)
- Patients attempting to book will see "Doctor unavailable during this period"
- Automatic scheduling of future consultations around time off

**Step 4: Emergency Availability**
- Toggle "Available for Emergencies Only"
- Receive only urgent/emergency cases
- Higher fee can be set for emergency consultations

---

## 8. Data Models

### 8.1 User Model
```
User {
  id: UUID (primary key)
  role: ENUM (patient, doctor, hospital_staff, admin)
  phone_number: STRING (unique, indexed)
  email: STRING (optional, unique, indexed)
  password_hash: STRING
  profile_photo_url: STRING (optional)
  language_preference: ENUM (twi, english)
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
  last_login: TIMESTAMP
  is_verified: BOOLEAN
  is_active: BOOLEAN
  otp_code: STRING (temporary)
  otp_expiry: TIMESTAMP
}
```

### 8.2 Patient Profile Model
```
PatientProfile {
  id: UUID (primary key)
  user_id: UUID (foreign key to User)
  first_name: STRING
  last_name: STRING
  date_of_birth: DATE
  gender: ENUM (male, female, other, prefer_not_to_say)
  region: STRING
  district: STRING
  emergency_contact_name: STRING
  emergency_contact_phone: STRING
  allergies: TEXT ARRAY (optional)
  chronic_conditions: TEXT ARRAY (optional)
  current_medications: TEXT ARRAY (optional)
  insurance_provider: STRING (optional)
  insurance_number: STRING (optional)
  blood_group: STRING (optional)
  location_latitude: DECIMAL (optional)
  location_longitude: DECIMAL (optional)
}
```

### 8.3 Doctor Profile Model
```
DoctorProfile {
  id: UUID (primary key)
  user_id: UUID (foreign key to User)
  first_name: STRING
  last_name: STRING
  medical_license_number: STRING (unique, indexed)
  issuing_authority: STRING
  specialty: STRING
  sub_specialty: STRING (optional)
  years_of_experience: INTEGER
  qualifications: TEXT ARRAY
  bio: TEXT (max 500 chars)
  hospital_affiliation: STRING (optional)
  languages_spoken: STRING ARRAY
  consultation_fee: DECIMAL
  average_consultation_duration: INTEGER (minutes)
  rating: DECIMAL (calculated)
  total_reviews: INTEGER
  total_consultations: INTEGER
  is_verified: BOOLEAN
  verification_date: TIMESTAMP (optional)
  license_document_url: STRING
  id_document_url: STRING
  certificate_urls: STRING ARRAY
  bank_name: STRING
  bank_account_number: STRING
  bank_account_name: STRING
  mobile_money_number: STRING (optional)
  is_online: BOOLEAN
  status: ENUM (available, busy, on_break, offline)
  location_latitude: DECIMAL (optional)
  location_longitude: DECIMAL (optional)
}
```

### 8.4 Consultation Model
```
Consultation {
  id: UUID (primary key)
  patient_id: UUID (foreign key to PatientProfile)
  doctor_id: UUID (foreign key to DoctorProfile)
  status: ENUM (requested, queued, in_progress, completed, cancelled, no_show)
  urgency_level: ENUM (emergency, urgent, routine)
  chief_complaint: TEXT
  audio_complaint_url: STRING (optional)
  consultation_type: ENUM (voice, video)
  payment_status: ENUM (pending, paid, refunded, failed)
  payment_amount: DECIMAL
  payment_transaction_id: STRING
  queue_position: INTEGER (optional)
  queue_joined_at: TIMESTAMP (optional)
  estimated_wait_time: INTEGER (minutes, optional)
  call_started_at: TIMESTAMP (optional)
  call_ended_at: TIMESTAMP (optional)
  call_duration: INTEGER (seconds, optional)
  call_recording_url: STRING (optional)
  transcript: TEXT (optional)
  doctor_notes: TEXT (optional)
  diagnosis: TEXT (optional)
  treatment_plan: TEXT (optional)
  follow_up_required: BOOLEAN
  follow_up_date: DATE (optional)
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

### 8.5 Prescription Model
```
Prescription {
  id: UUID (primary key)
  consultation_id: UUID (foreign key to Consultation)
  patient_id: UUID (foreign key to PatientProfile)
  doctor_id: UUID (foreign key to DoctorProfile)
  medications: JSONB ARRAY [{
    drug_name: STRING
    strength: STRING
    dosage: STRING
    frequency: STRING
    duration: STRING
    instructions: STRING
  }]
  prescription_document_url: STRING (optional, if stamped)
  is_sent_to_pharmacy: BOOLEAN
  pharmacy_id: UUID (optional, foreign key to Pharmacy)
  verification_code: STRING (optional)
  created_at: TIMESTAMP
  expires_at: TIMESTAMP (optional)
}
```

### 8.6 Lab Request Model
```
LabRequest {
  id: UUID (primary key)
  consultation_id: UUID (foreign key to Consultation)
  patient_id: UUID (foreign key to PatientProfile)
  doctor_id: UUID (foreign key to DoctorProfile)
  tests_requested: JSONB ARRAY [{
    test_type: STRING
    test_category: STRING
    clinical_notes: STRING
  }]
  urgency: ENUM (urgent, routine)
  lab_id: UUID (optional, foreign key to Laboratory)
  request_document_url: STRING
  created_at: TIMESTAMP
}
```

### 8.7 Lab Result Model
```
LabResult {
  id: UUID (primary key)
  lab_request_id: UUID (foreign key to LabRequest)
  patient_id: UUID (foreign key to PatientProfile)
  doctor_id: UUID (foreign key to DoctorProfile)
  result_files: STRING ARRAY (URLs to uploaded documents)
  upload_source: ENUM (patient, laboratory)
  uploaded_by: UUID (foreign key to User)
  doctor_comments: TEXT (optional)
  reviewed_at: TIMESTAMP (optional)
  created_at: TIMESTAMP
}
```

### 8.8 Referral Model
```
Referral {
  id: UUID (primary key)
  consultation_id: UUID (foreign key to Consultation)
  patient_id: UUID (foreign key to PatientProfile)
  referring_doctor_id: UUID (foreign key to DoctorProfile)
  referral_type: ENUM (hospital, specialist, pharmacy, laboratory, emergency)
  specialty_required: STRING (optional)
  urgency: ENUM (urgent, routine)
  referral_notes: TEXT
  facility_id: UUID (optional)
  facility_name: STRING (optional)
  facility_address: STRING (optional)
  facility_latitude: DECIMAL (optional)
  facility_longitude: DECIMAL (optional)
  status: ENUM (pending, completed, cancelled)
  created_at: TIMESTAMP
}
```

### 8.9 Payment Model
```
Payment {
  id: UUID (primary key)
  consultation_id: UUID (foreign key to Consultation)
  patient_id: UUID (foreign key to PatientProfile)
  doctor_id: UUID (foreign key to DoctorProfile)
  amount: DECIMAL
  currency: STRING (default: GHS)
  payment_method: ENUM (mobile_money, card, wallet)
  payment_provider: STRING (e.g., Paystack)
  transaction_reference: STRING (unique, indexed)
  status: ENUM (pending, successful, failed, refunded)
  platform_fee: DECIMAL
  doctor_earnings: DECIMAL
  mobile_money_number: STRING (optional)
  metadata: JSONB (additional payment info)
  paid_at: TIMESTAMP (optional)
  refunded_at: TIMESTAMP (optional)
  created_at: TIMESTAMP
}
```

### 8.10 Payout Model
```
Payout {
  id: UUID (primary key)
  doctor_id: UUID (foreign key to DoctorProfile)
  amount: DECIMAL
  currency: STRING (default: GHS)
  bank_account_number: STRING
  bank_name: STRING
  mobile_money_number: STRING (optional)
  status: ENUM (pending, processing, completed, failed)
  payment_reference: STRING (optional)
  payout_date: DATE
  consultations_included: UUID ARRAY (consultation IDs)
  created_at: TIMESTAMP
  completed_at: TIMESTAMP (optional)
}
```

### 8.11 Queue Model
```
Queue {
  id: UUID (primary key)
  doctor_id: UUID (foreign key to DoctorProfile)
  patient_id: UUID (foreign key to PatientProfile)
  consultation_id: UUID (foreign key to Consultation)
  position: INTEGER
  joined_at: TIMESTAMP
  estimated_wait_time: INTEGER (minutes)
  ready_at: TIMESTAMP (optional, when patient reaches front)
  timeout_at: TIMESTAMP (optional, when patient will be removed)
  status: ENUM (waiting, ready, calling, timed_out, removed)
  urgency_level: ENUM (emergency, urgent, routine)
}
```

### 8.12 Review Model
```
Review {
  id: UUID (primary key)
  consultation_id: UUID (foreign key to Consultation)
  patient_id: UUID (foreign key to PatientProfile)
  doctor_id: UUID (foreign key to DoctorProfile)
  overall_rating: INTEGER (1-5)
  professionalism_rating: INTEGER (1-5)
  communication_rating: INTEGER (1-5)
  helpfulness_rating: INTEGER (1-5)
  review_text: TEXT (optional)
  is_anonymous: BOOLEAN
  created_at: TIMESTAMP
}
```

### 8.13 Pharmacy Model
```
Pharmacy {
  id: UUID (primary key)
  name: STRING
  address: STRING
  region: STRING
  district: STRING
  phone_number: STRING
  email: STRING (optional)
  latitude: DECIMAL
  longitude: DECIMAL
  is_verified: BOOLEAN
  is_partner: BOOLEAN (integrated with system)
  operating_hours: JSONB
  rating: DECIMAL
  total_reviews: INTEGER
  created_at: TIMESTAMP
}
```

### 8.14 Laboratory Model
```
Laboratory {
  id: UUID (primary key)
  name: STRING
  address: STRING
  region: STRING
  district: STRING
  phone_number: STRING
  email: STRING (optional)
  latitude: DECIMAL
  longitude: DECIMAL
  is_verified: BOOLEAN
  is_partner: BOOLEAN (integrated with system)
  services_offered: STRING ARRAY
  operating_hours: JSONB
  rating: DECIMAL
  total_reviews: INTEGER
  created_at: TIMESTAMP
}
```

### 8.15 Notification Model
```
Notification {
  id: UUID (primary key)
  user_id: UUID (foreign key to User)
  type: ENUM (queue_update, call_incoming, payment, prescription, lab_result, general)
  title: STRING
  message: TEXT
  data: JSONB (additional context)
  is_read: BOOLEAN
  sent_at: TIMESTAMP
  read_at: TIMESTAMP (optional)
}
```

### 8.16 Availability Schedule Model
```
AvailabilitySchedule {
  id: UUID (primary key)
  doctor_id: UUID (foreign key to DoctorProfile)
  day_of_week: ENUM (monday, tuesday, wednesday, thursday, friday, saturday, sunday)
  start_time: TIME
  end_time: TIME
  is_active: BOOLEAN
}
```

### 8.17 Time Off Model
```
TimeOff {
  id: UUID (primary key)
  doctor_id: UUID (foreign key to DoctorProfile)
  start_date: DATE
  end_date: DATE
  reason: TEXT (optional)
  created_at: TIMESTAMP
}
```

### 8.18 Hospital Model
```
Hospital {
  id: UUID (primary key)
  name: STRING
  address: STRING
  region: STRING
  district: STRING
  phone_number: STRING
  emergency_number: STRING (optional)
  email: STRING (optional)
  latitude: DECIMAL
  longitude: DECIMAL
  hospital_type: ENUM (public, private, clinic, health_center)
  services: STRING ARRAY
  has_emergency: BOOLEAN
  operating_hours: JSONB
  rating: DECIMAL
  created_at: TIMESTAMP
}
```

---

## 9. Technical Architecture

### 9.1 System Architecture Overview

**Architecture Pattern:** Microservices with API Gateway

**Components:**
1. **Mobile Applications** (iOS & Android)
   - React Native or Flutter for cross-platform development
   - Native modules for performance-critical features (calls, maps)
   
2. **API Gateway**
   - Routes requests to appropriate microservices
   - Handles authentication and authorization
   - Rate limiting and request throttling
   - Load balancing
   
3. **Microservices:**
   - **User Service:** Authentication, user management, profiles
   - **Consultation Service:** Queue management, consultation flow
   - **Communication Service:** Voice/video calling, WebRTC signaling
   - **Payment Service:** Payment processing, payouts
   - **Prescription Service:** Prescription creation, management
   - **Lab Service:** Lab requests, results management
   - **Notification Service:** Push notifications, SMS, email
   - **Location Service:** Maps integration, pharmacy/lab/hospital finding
   - **Analytics Service:** Reporting, insights, monitoring
   
4. **Database Layer**
   - PostgreSQL for relational data (users, consultations, etc.)
   - MongoDB for unstructured data (transcripts, notes)
   - Redis for caching and session management
   - Amazon S3 or similar for file storage (documents, images, recordings)
   
5. **Real-time Communication**
   - WebRTC for peer-to-peer voice/video
   - WebSocket for real-time updates (queue position, notifications)
   - Socket.io or similar for bi-directional communication
   
6. **Third-Party Integrations**
   - Paystack for payments
   - Google Maps API for location services
   - Twilio or similar for SMS/fallback calling
   - Firebase Cloud Messaging (FCM) for push notifications
   - AWS Transcribe or Google Speech-to-Text for transcription
   - Google Translate API for language translation

### 9.2 Technology Stack

**Frontend (Mobile App - Patients & Doctors):**
- **Framework:** Flutter 3.16+
- **State Management:** Riverpod or Bloc
- **WebRTC:** flutter_webrtc package
- **Maps:** google_maps_flutter package
- **Local Storage:** sqflite for SQLite database
- **Secure Storage:** flutter_secure_storage for tokens
- **HTTP Client:** dio package with interceptors
- **Real-time:** socket_io_client for WebSocket
- **Push Notifications:** firebase_messaging package
- **Audio/Video:** flutter_sound, camera packages
- **File Handling:** file_picker, image_picker
- **PDF Generation:** pdf package
- **Localization:** flutter_localizations, intl
- **UI Components:** Material Design 3

**Frontend (Web - Hospitals & Pharmacies):**
- **Framework:** React 18+ with TypeScript
- **State Management:** Redux Toolkit or Zustand
- **UI Library:** Material-UI (MUI) or Ant Design
- **Maps:** @react-google-maps/api
- **HTTP Client:** Axios
- **Real-time:** socket.io-client
- **Forms:** React Hook Form with Yup validation
- **Charts:** Recharts or Chart.js
- **Authentication:** JWT with refresh token rotation

**Backend:**
- **API Server:** Node.js with NestJS (TypeScript)
- **WebRTC Signaling:** Node.js with Socket.io
- **AI/ML Service:** Python with FastAPI (for triage algorithm)
- **Background Jobs:** Bull queue with Redis
- **API Documentation:** Swagger/OpenAPI

**Database:**
- **Primary Database:** PostgreSQL 15+ (with TimescaleDB for time-series data)
- **Document Store:** MongoDB 6+ (for logs, transcripts)
- **Cache:** Redis 7+ (queue management, sessions, cache)
- **Search:** Elasticsearch (optional, for advanced search)

**Cloud Infrastructure:**
- **Hosting:** AWS, Google Cloud, or DigitalOcean
- **Containerization:** Docker
- **Orchestration:** Docker Compose (development) / Kubernetes (production)
- **CDN:** CloudFlare for static assets
- **Storage:** AWS S3 or Google Cloud Storage
- **CI/CD:** GitHub Actions

**Monitoring & Logging:**
- **Error Tracking:** Sentry
- **APM:** DataDog, New Relic, or open-source alternatives
- **Logging:** Winston (Node.js) with centralized logging
- **Analytics:** Google Analytics, Mixpanel

### 9.3 Data Flow Diagrams

**Consultation Flow:**
```
Patient App → API Gateway → Consultation Service
                          ↓
                    Payment Service → Paystack
                          ↓
                    Queue Service (Redis)
                          ↓
Doctor App ← WebSocket ← Queue Manager
                          ↓
Communication Service ← WebRTC Signaling
                          ↓
Call Recording → S3 Storage
                          ↓
Transcription Service → Database
```

**Payment Flow:**
```
Patient → Payment Gateway (Paystack)
              ↓
        Webhook received
              ↓
        Payment Service validates
              ↓
        Update consultation status
              ↓
        Add patient to queue
              ↓
        Notify doctor
              ↓
        Record transaction
```

### 9.4 Security Architecture

**Authentication:**
- JWT tokens for API authentication
- Refresh tokens for extended sessions
- Token rotation and blacklisting
- OAuth 2.0 for third-party integrations

**Authorization:**
- Role-Based Access Control (RBAC)
- Fine-grained permissions
- Resource-level authorization

**Data Security:**
- TLS 1.3 for all communications
- End-to-end encryption for calls
- Database encryption at rest
- Field-level encryption for sensitive data (medical records)
- Regular security audits and penetration testing

**Privacy:**
- Data minimization principle
- Anonymization for analytics
- GDPR-compliant data deletion
- Audit logs for data access

### 9.5 Scalability Strategy

**Horizontal Scaling:**
- Stateless microservices
- Load balancing across multiple instances
- Auto-scaling based on metrics (CPU, memory, request count)

**Database Scaling:**
- Read replicas for high-read operations
- Database sharding for large datasets
- Connection pooling
- Query optimization and indexing

**Caching Strategy:**
- Redis for frequently accessed data
- CDN for static assets
- Application-level caching
- Cache invalidation strategy

**Content Delivery:**
- CDN for media files (images, documents, recordings)
- Edge locations for reduced latency
- Geo-distributed storage

---

## 10. API Specifications

### 10.1 Authentication Endpoints

**POST /api/v1/auth/register/patient**
```json
Request:
{
  "first_name": "Kwame",
  "last_name": "Mensah",
  "phone_number": "+233241234567",
  "email": "kwame@example.com",
  "password": "SecurePass123!",
  "date_of_birth": "1990-05-15",
  "gender": "male",
  "region": "Greater Accra",
  "district": "Accra Metropolitan",
  "emergency_contact_name": "Ama Mensah",
  "emergency_contact_phone": "+233207654321",
  "language_preference": "twi"
}

Response (201):
{
  "success": true,
  "message": "Registration successful. Please verify your phone number.",
  "data": {
    "user_id": "uuid",
    "phone_number": "+233241234567",
    "otp_sent": true
  }
}
```

**POST /api/v1/auth/register/doctor**
```json
Request:
{
  "first_name": "Dr. Akosua",
  "last_name": "Boateng",
  "phone_number": "+233241234567",
  "email": "akosua.boateng@hospital.com",
  "password": "SecurePass123!",
  "medical_license_number": "MDC12345",
  "specialty": "General Practitioner",
  "years_of_experience": 10,
  "bio": "Experienced GP with focus on preventive care",
  "consultation_fee": 50.00,
  "languages_spoken": ["english", "twi"],
  "bank_account": {
    "bank_name": "GCB Bank",
    "account_number": "1234567890",
    "account_name": "Akosua Boateng"
  }
}

Response (201):
{
  "success": true,
  "message": "Doctor registration submitted for review",
  "data": {
    "user_id": "uuid",
    "verification_status": "pending"
  }
}
```

**POST /api/v1/auth/verify-otp**
```json
Request:
{
  "phone_number": "+233241234567",
  "otp_code": "123456"
}

Response (200):
{
  "success": true,
  "message": "Phone number verified successfully",
  "data": {
    "user_id": "uuid",
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "token_type": "Bearer",
    "expires_in": 3600
  }
}
```

**POST /api/v1/auth/login**
```json
Request:
{
  "phone_number": "+233241234567",
  "password": "SecurePass123!"
}

Response (200):
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "role": "patient",
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "token_type": "Bearer",
    "expires_in": 3600
  }
}
```

### 10.2 Doctor Discovery Endpoints

**GET /api/v1/doctors**
```
Query Parameters:
- specialty: string (optional)
- available: boolean (optional)
- min_rating: float (optional)
- max_fee: float (optional)
- latitude: float (optional)
- longitude: float (optional)
- radius: integer (km, optional)
- language: string (optional)
- sort_by: string (rating|price|distance|wait_time)
- page: integer
- limit: integer

Response (200):
{
  "success": true,
  "data": {
    "doctors": [
      {
        "doctor_id": "uuid",
        "first_name": "Dr. Akosua",
        "last_name": "Boateng",
        "specialty": "General Practitioner",
        "rating": 4.8,
        "total_reviews": 150,
        "consultation_fee": 50.00,
        "is_online": true,
        "queue_length": 2,
        "estimated_wait_time": 15,
        "languages": ["english", "twi"],
        "profile_photo_url": "https://...",
        "distance_km": 2.5
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "total_pages": 3
    }
  }
}
```

**GET /api/v1/doctors/{doctor_id}**
```
Response (200):
{
  "success": true,
  "data": {
    "doctor_id": "uuid",
    "first_name": "Dr. Akosua",
    "last_name": "Boateng",
    "specialty": "General Practitioner",
    "sub_specialty": null,
    "years_of_experience": 10,
    "bio": "Experienced GP...",
    "rating": 4.8,
    "total_reviews": 150,
    "total_consultations": 500,
    "consultation_fee": 50.00,
    "average_consultation_duration": 20,
    "is_online": true,
    "status": "available",
    "queue_length": 2,
    "estimated_wait_time": 15,
    "languages": ["english", "twi"],
    "profile_photo_url": "https://...",
    "hospital_affiliation": "Ridge Hospital",
    "reviews": [
      {
        "rating": 5,
        "text": "Very professional and helpful",
        "date": "2025-10-15",
        "is_anonymous": false
      }
    ]
  }
}
```

### 10.3 Consultation Endpoints

**POST /api/v1/consultations**
```json
Request:
{
  "doctor_id": "uuid",
  "chief_complaint": "I have been experiencing headaches for 3 days",
  "audio_complaint_url": "https://..." (optional),
  "urgency_level": "routine"
}

Response (201):
{
  "success": true,
  "message": "Consultation request created",
  "data": {
    "consultation_id": "uuid",
    "doctor_id": "uuid",
    "status": "requested",
    "payment_required": true,
    "payment_amount": 50.00,
    "payment_url": "https://paystack.com/pay/..."
  }
}
```

**POST /api/v1/consultations/{consultation_id}/payment**
```json
Request:
{
  "payment_method": "mobile_money",
  "mobile_money_number": "+233241234567",
  "mobile_money_provider": "MTN"
}

Response (200):
{
  "success": true,
  "message": "Payment initiated",
  "data": {
    "payment_id": "uuid",
    "transaction_reference": "TXN123456",
    "payment_url": "https://paystack.com/pay/...",
    "status": "pending"
  }
}
```

**POST /api/v1/consultations/{consultation_id}/join-queue**
```json
Request:
{
  "payment_transaction_id": "uuid"
}

Response (200):
{
  "success": true,
  "message": "Added to queue successfully",
  "data": {
    "consultation_id": "uuid",
    "queue_position": 3,
    "estimated_wait_time": 15,
    "doctor": {
      "name": "Dr. Akosua Boateng",
      "photo_url": "https://..."
    }
  }
}
```

**GET /api/v1/consultations/{consultation_id}/queue-status**
```
Response (200):
{
  "success": true,
  "data": {
    "consultation_id": "uuid",
    "status": "queued",
    "queue_position": 2,
    "estimated_wait_time": 10,
    "joined_at": "2025-11-04T10:30:00Z",
    "timeout_at": "2025-11-04T11:00:00Z"
  }
}
```

**POST /api/v1/consultations/{consultation_id}/accept-call**
```json
Request:
{
  "accepted": true
}

Response (200):
{
  "success": true,
  "message": "Call accepted",
  "data": {
    "consultation_id": "uuid",
    "status": "in_progress",
    "call_token": "webrtc_token",
    "signaling_server": "wss://signaling.healthconnect.com"
  }
}
```

**POST /api/v1/consultations/{consultation_id}/request-video**
```json
Request:
{
  "reason": "Doctor needs to see the rash"
}

Response (200):
{
  "success": true,
  "message": "Video request sent to doctor"
}
```

**POST /api/v1/consultations/{consultation_id}/end**
```json
Request:
{
  "ended_by": "doctor",
  "doctor_notes": "Patient presents with...",
  "diagnosis": "Upper respiratory infection",
  "treatment_plan": "Rest and hydration..."
}

Response (200):
{
  "success": true,
  "message": "Consultation ended",
  "data": {
    "consultation_id": "uuid",
    "status": "completed",
    "duration_seconds": 1200,
    "summary_available": true
  }
}
```

**GET /api/v1/consultations/{consultation_id}/summary**
```
Response (200):
{
  "success": true,
  "data": {
    "consultation_id": "uuid",
    "date": "2025-11-04",
    "doctor": {
      "name": "Dr. Akosua Boateng",
      "specialty": "General Practitioner"
    },
    "duration_minutes": 20,
    "chief_complaint": "Headaches for 3 days",
    "diagnosis": "Tension headache",
    "prescriptions": [...],
    "lab_requests": [...],
    "instructions": "Rest and avoid stress...",
    "follow_up_required": false,
    "transcript": "..."
  }
}
```

### 10.4 Prescription Endpoints

**POST /api/v1/prescriptions**
```json
Request:
{
  "consultation_id": "uuid",
  "medications": [
    {
      "drug_name": "Paracetamol",
      "strength": "500mg",
      "dosage": "1 tablet",
      "frequency": "Three times daily",
      "duration": "5 days",
      "instructions": "Take after meals"
    }
  ],
  "prescription_document_url": "https://..." (optional)
}

Response (201):
{
  "success": true,
  "message": "Prescription created",
  "data": {
    "prescription_id": "uuid",
    "consultation_id": "uuid",
    "medications": [...],
    "created_at": "2025-11-04T11:00:00Z",
    "verification_code": "PRX123456"
  }
}
```

**POST /api/v1/prescriptions/{prescription_id}/send-to-pharmacy**
```json
Request:
{
  "pharmacy_id": "uuid"
}

Response (200):
{
  "success": true,
  "message": "Prescription sent to pharmacy",
  "data": {
    "pharmacy": {
      "name": "MedPlus Pharmacy",
      "address": "123 Oxford Street, Accra",
      "phone": "+233302123456",
      "latitude": 5.6037,
      "longitude": -0.1870,
      "distance_km": 2.1,
      "estimated_travel_time_minutes": 8
    }
  }
}
```

### 10.5 Lab Request Endpoints

**POST /api/v1/lab-requests**
```json
Request:
{
  "consultation_id": "uuid",
  "tests_requested": [
    {
      "test_type": "Full Blood Count",
      "test_category": "Blood Test",
      "clinical_notes": "Check for anemia"
    }
  ],
  "urgency": "routine",
  "lab_id": "uuid" (optional)
}

Response (201):
{
  "success": true,
  "message": "Lab request created",
  "data": {
    "lab_request_id": "uuid",
    "consultation_id": "uuid",
    "tests_requested": [...],
    "request_document_url": "https://..."
  }
}
```

**POST /api/v1/lab-results**
```json
Request (multipart/form-data):
{
  "lab_request_id": "uuid",
  "files": [file1, file2]
}

Response (201):
{
  "success": true,
  "message": "Lab results uploaded",
  "data": {
    "lab_result_id": "uuid",
    "files": ["https://...", "https://..."],
    "uploaded_at": "2025-11-05T09:00:00Z"
  }
}
```

### 10.6 Location Services Endpoints

**GET /api/v1/locations/pharmacies**
```
Query Parameters:
- latitude: float (required)
- longitude: float (required)
- radius: integer (km, default: 10)
- is_partner: boolean (optional)

Response (200):
{
  "success": true,
  "data": {
    "pharmacies": [
      {
        "pharmacy_id": "uuid",
        "name": "MedPlus Pharmacy",
        "address": "123 Oxford Street, Accra",
        "phone": "+233302123456",
        "latitude": 5.6037,
        "longitude": -0.1870,
        "distance_km": 2.1,
        "is_partner": true,
        "rating": 4.5,
        "is_open": true
      }
    ]
  }
}
```

**GET /api/v1/locations/laboratories**
```
Query Parameters:
- latitude: float (required)
- longitude: float (required)
- radius: integer (km, default: 10)
- services: string array (optional)

Response: Similar to pharmacies endpoint
```

**GET /api/v1/locations/hospitals**
```
Query Parameters:
- latitude: float (required)
- longitude: float (required)
- radius: integer (km, default: 10)
- has_emergency: boolean (optional)
- hospital_type: string (optional)

Response: Similar to pharmacies endpoint
```

### 10.7 Queue Management Endpoints (Doctor)

**GET /api/v1/doctors/queue**
```
Response (200):
{
  "success": true,
  "data": {
    "queue_length": 3,
    "estimated_clear_time": 45,
    "patients": [
      {
        "consultation_id": "uuid",
        "patient_name": "Kwame M.",
        "patient_age": 35,
        "chief_complaint": "Headaches for 3 days",
        "wait_time_minutes": 15,
        "urgency_level": "routine",
        "payment_status": "paid",
        "audio_complaint_url": "https://..."
      }
    ]
  }
}
```

**POST /api/v1/doctors/queue/{consultation_id}/call**
```json
Request:
{
  "call_type": "voice"
}

Response (200):
{
  "success": true,
  "message": "Calling patient",
  "data": {
    "consultation_id": "uuid",
    "call_token": "webrtc_token",
    "signaling_server": "wss://signaling.healthconnect.com"
  }
}
```

**POST /api/v1/doctors/status**
```json
Request:
{
  "status": "available"
}

Response (200):
{
  "success": true,
  "message": "Status updated",
  "data": {
    "status": "available",
    "updated_at": "2025-11-05T09:00:00Z"
  }
}
```

### 10.8 Payment & Earnings Endpoints (Doctor)

**GET /api/v1/doctors/earnings**
```
Query Parameters:
- start_date: date (optional)
- end_date: date (optional)
- period: string (today|week|month|year)

Response (200):
{
  "success": true,
  "data": {
    "period": "month",
    "total_earnings": 5000.00,
    "platform_fees": 500.00,
    "net_earnings": 4500.00,
    "total_consultations": 100,
    "average_per_consultation": 50.00,
    "pending_payout": 2000.00,
    "next_payout_date": "2025-11-10",
    "breakdown": [
      {
        "date": "2025-11-01",
        "consultations": 5,
        "earnings": 250.00
      }
    ]
  }
}
```

**POST /api/v1/doctors/payout-request**
```json
Request:
{
  "amount": 2000.00,
  "bank_account_id": "uuid"
}

Response (200):
{
  "success": true,
  "message": "Payout requested",
  "data": {
    "payout_id": "uuid",
    "amount": 2000.00,
    "status": "pending",
    "estimated_completion": "2025-11-10"
  }
}
```

### 10.9 Notification Endpoints

**GET /api/v1/notifications**
```
Query Parameters:
- type: string (optional)
- is_read: boolean (optional)
- page: integer
- limit: integer

Response (200):
{
  "success": true,
  "data": {
    "notifications": [
      {
        "notification_id": "uuid",
        "type": "queue_update",
        "title": "Queue Update",
        "message": "You are now #2 in the queue",
        "data": {
          "consultation_id": "uuid",
          "queue_position": 2
        },
        "is_read": false,
        "sent_at": "2025-11-05T09:30:00Z"
      }
    ],
    "unread_count": 5
  }
}
```

**POST /api/v1/notifications/{notification_id}/read**
```
Response (200):
{
  "success": true,
  "message": "Notification marked as read"
}
```

### 10.10 WebSocket Events

**Queue Updates (Patient):**
```json
Event: "queue_position_update"
Data: {
  "consultation_id": "uuid",
  "queue_position": 2,
  "estimated_wait_time": 10
}

Event: "queue_ready"
Data: {
  "consultation_id": "uuid",
  "timeout_seconds": 180
}

Event: "incoming_call"
Data: {
  "consultation_id": "uuid",
  "doctor_name": "Dr. Akosua Boateng",
  "call_token": "webrtc_token"
}
```

**Queue Updates (Doctor):**
```json
Event: "new_patient_in_queue"
Data: {
  "consultation_id": "uuid",
  "patient_info": {...},
  "queue_position": 3
}

Event: "patient_ready"
Data: {
  "consultation_id": "uuid",
  "patient_info": {...}
}
```

---

## 11. Third-Party Integrations

### 11.1 Paystack Integration

**Purpose:** Payment processing for consultations

**Integration Points:**
1. Initialize payment
2. Verify payment via webhook
3. Handle refunds
4. Process doctor payouts

**Configuration:**
- API Keys: Public and Secret keys
- Webhook URL: `https://api.healthconnect.com/webhooks/paystack`
- Webhook Events: `charge.success`, `transfer.success`, `transfer.failed`

**Payment Flow:**
1. Frontend initializes payment with Paystack
2. User completes payment on Paystack
3. Paystack sends webhook to backend
4. Backend verifies payment signature
5. Update consultation status and add to queue

**Security:**
- Verify webhook signatures
- Use HTTPS for all communications
- Never expose secret key to frontend

### 11.2 Google Maps API

**Purpose:** Location services for pharmacies, labs, hospitals

**APIs Used:**
1. **Maps SDK for Mobile:** Display maps in app
2. **Places API:** Search for pharmacies, labs, hospitals
3. **Geocoding API:** Convert addresses to coordinates
4. **Directions API:** Calculate distance and travel time
5. **Distance Matrix API:** Batch distance calculations

**Integration:**
```javascript
// Example: Finding nearby pharmacies
const response = await fetch(
  `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
  `location=${lat},${lng}&radius=5000&type=pharmacy&key=${API_KEY}`
);
```

**Best Practices:**
- Cache results to minimize API calls
- Use Place IDs for consistent references
- Implement rate limiting
- Use appropriate zoom levels for mobile

### 11.3 Speech-to-Text Service

**Options:**
- Google Cloud Speech-to-Text
- AWS Transcribe
- Azure Speech Services

**Purpose:** Transcribe patient audio complaints and consultations

**Features Required:**
- Real-time streaming transcription
- Support for Twi language (if available, otherwise English)
- Speaker diarization (identify different speakers)
- Custom vocabulary (medical terms)

**Integration:**
```javascript
// Example: Transcribe audio file
const transcription = await speechClient.recognize({
  audio: { uri: audioFileUrl },
  config: {
    encoding: 'LINEAR16',
    languageCode: 'en-US',
    alternativeLanguageCodes: ['tw-GH'], // Twi if available
    enableSpeakerDiarization: true
  }
});
```

### 11.4 Translation Service

**Purpose:** Translate between Twi and English

**Options:**
- Google Cloud Translation API
- AWS Translate

**Use Cases:**
- Translate UI text
- Translate patient complaints
- Translate doctor instructions
- Real-time call translation (optional)

**Integration:**
```javascript
// Example: Translate text
const translation = await translationClient.translate(text, {
  from: 'en',
  to: 'tw'
});
```

### 11.5 SMS Service (Mnotify - Ghana)

**Purpose:** SMS notifications and fallback communication specifically for Ghana

**Provider:** Mnotify (https://mnotify.com)

**Integration Points:**
1. OTP verification for registration
2. Payment confirmations
3. Appointment reminders
4. Queue position updates (for users without internet)
5. Prescription ready notifications
6. Lab results notifications
7. Emergency notifications
8. Doctor availability alerts

**Configuration:**
- **API Key:** Obtained from Mnotify dashboard
- **Sender ID:** Custom sender ID (e.g., "HealthConnect")
- **Base URL:** https://api.mnotify.com/api/

**API Integration:**

```javascript
// Mnotify SMS Service Class
class MnotifyService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.mnotify.com/api';
  }

  // Send single SMS
  async sendSMS(recipient, message) {
    const response = await fetch(`${this.baseUrl}/sms/quick`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: this.apiKey,
        to: recipient, // Format: 233241234567
        msg: message,
        sender_id: 'HealthConnect'
      })
    });
    
    return await response.json();
  }

  // Send OTP
  async sendOTP(phoneNumber, otpCode, language = 'en') {
    const messages = {
      en: `Your HealthConnect verification code is: ${otpCode}. Valid for 10 minutes.`,
      tw: `Wo HealthConnect verification code ne: ${otpCode}. Ɛbɛyɛ adwuma simma 10 mu.`
    };
    
    return await this.sendSMS(phoneNumber, messages[language]);
  }

  // Send payment confirmation
  async sendPaymentConfirmation(phoneNumber, amount, doctorName, language = 'en') {
    const messages = {
      en: `Payment of GHS ${amount} received. Your consultation with ${doctorName} is confirmed.`,
      tw: `Wɔagye wo sika GHS ${amount}. Wo ne ${doctorName} nhyiamu aba mu.`
    };
    
    return await this.sendSMS(phoneNumber, messages[language]);
  }

  // Send queue position update
  async sendQueueUpdate(phoneNumber, position, estimatedWait, language = 'en') {
    const messages = {
      en: `You are now #${position} in the queue. Estimated wait: ${estimatedWait} minutes.`,
      tw: `Wonni #${position} wɔ nhyehyɛeɛ no mu. Twɛn berɛ: simma ${estimatedWait}.`
    };
    
    return await this.sendSMS(phoneNumber, messages[language]);
  }

  // Send call ready notification
  async sendCallReady(phoneNumber, doctorName, language = 'en') {
    const messages = {
      en: `Dr. ${doctorName} is ready to see you! Please open the HealthConnect app now.`,
      tw: `Odɔkotani ${doctorName} awie. Bue HealthConnect app no mprempren!`
    };
    
    return await this.sendSMS(phoneNumber, messages[language]);
  }

  // Send prescription ready
  async sendPrescriptionReady(phoneNumber, language = 'en') {
    const messages = {
      en: `Your prescription is ready. Open HealthConnect app to view and download.`,
      tw: `Wo aduro ho krataa aba. Bue HealthConnect app no na hwɛ.`
    };
    
    return await this.sendSMS(phoneNumber, messages[language]);
  }

  // Send bulk SMS (for reminders, announcements)
  async sendBulkSMS(recipients, message) {
    const response = await fetch(`${this.baseUrl}/sms/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: this.apiKey,
        recipients: recipients.join(','), // Comma-separated
        msg: message,
        sender_id: 'HealthConnect',
        is_schedule: false
      })
    });
    
    return await response.json();
  }

  // Schedule SMS (for future reminders)
  async scheduleSMS(recipient, message, scheduleTime) {
    const response = await fetch(`${this.baseUrl}/sms/quick`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: this.apiKey,
        to: recipient,
        msg: message,
        sender_id: 'HealthConnect',
        is_schedule: true,
        schedule_date: scheduleTime // Format: YYYY-MM-DD HH:MM:SS
      })
    });
    
    return await response.json();
  }

  // Check SMS balance
  async checkBalance() {
    const response = await fetch(`${this.baseUrl}/balance?key=${this.apiKey}`);
    return await response.json();
  }

  // Get SMS delivery report
  async getDeliveryReport(messageId) {
    const response = await fetch(
      `${this.baseUrl}/sms/report?key=${this.apiKey}&msg_id=${messageId}`
    );
    return await response.json();
  }
}

// Usage in backend
const mnotify = new MnotifyService(process.env.MNOTIFY_API_KEY);

// Example: Send OTP during registration
async function sendRegistrationOTP(phoneNumber, otpCode, language) {
  try {
    const result = await mnotify.sendOTP(phoneNumber, otpCode, language);
    
    if (result.status === 'success') {
      // Log successful SMS
      await logSMS({
        recipient: phoneNumber,
        type: 'OTP',
        status: 'sent',
        messageId: result.message_id
      });
      return { success: true, messageId: result.message_id };
    } else {
      // Handle error
      console.error('SMS sending failed:', result);
      return { success: false, error: result.message };
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { success: false, error: error.message };
  }
}
```

**SMS Templates (English & Twi):**

1. **Registration OTP:**
   - EN: "Your HealthConnect verification code is: {CODE}. Valid for 10 minutes."
   - TW: "Wo HealthConnect verification code ne: {CODE}. Ɛbɛyɛ adwuma simma 10 mu."

2. **Payment Success:**
   - EN: "Payment of GHS {AMOUNT} received. Consultation with {DOCTOR} confirmed."
   - TW: "Wɔagye wo sika GHS {AMOUNT}. Wo ne {DOCTOR} nhyiamu aba mu."

3. **Queue Update:**
   - EN: "You are #{POSITION} in queue. Est. wait: {TIME} min."
   - TW: "Wonni #{POSITION} wɔ nhyehyɛeɛ mu. Twɛn: simma {TIME}."

4. **Doctor Ready:**
   - EN: "Dr. {DOCTOR} is ready! Open HealthConnect app now."
   - TW: "Odɔkotani {DOCTOR} awie! Bue app no mprempren!"

5. **Prescription Ready:**
   - EN: "Your prescription is ready. Open app to view."
   - TW: "Wo aduro krataa aba. Bue app no na hwɛ."

6. **Lab Results:**
   - EN: "Lab results uploaded. Dr. {DOCTOR} will review shortly."
   - TW: "Lab nhwehwɛmu aba. Odɔkotani {DOCTOR} bɛhwɛ."

7. **Appointment Reminder:**
   - EN: "Reminder: Consultation with Dr. {DOCTOR} in {TIME}."
   - TW: "Kae: Wo ne Odɔkotani {DOCTOR} nhyiamu wɔ {TIME} mu."

**Best Practices:**
- Keep messages under 160 characters when possible (single SMS)
- Always include sender ID "HealthConnect"
- Log all SMS with delivery status
- Implement retry logic for failed SMS
- Monitor SMS balance and alert when low
- Rate limit SMS to prevent abuse
- Sanitize phone numbers (format: 233XXXXXXXXX)
- Use scheduled SMS for reminders
- Track delivery reports for critical messages (OTP, payments)

**SMS Fallback Strategy:**
- If push notification fails or user offline for 5 minutes, send SMS
- Always send SMS for critical actions (OTP, payment, ready to call)
- Optional SMS for non-critical updates (configurable in user settings)

**Cost Optimization:**
- Use push notifications as primary method
- SMS as fallback or for critical notifications
- Allow users to opt-out of non-critical SMS
- Batch SMS for announcements
- Monitor and alert on unusual SMS volume

### 11.6 Push Notification Service (Firebase Cloud Messaging)

**Firebase Cloud Messaging (FCM) for In-App Notifications**

**Purpose:** Real-time push notifications for Flutter mobile app (iOS & Android)

**Setup & Configuration:**

**1. Firebase Project Setup:**
```yaml
# Steps to set up Firebase:
1. Create Firebase project at console.firebase.google.com
2. Add Android app (package name: com.healthconnect.app)
3. Download google-services.json → android/app/
4. Add iOS app (bundle ID: com.healthconnect.app)
5. Download GoogleService-Info.plist → ios/Runner/
6. Enable Cloud Messaging API in Firebase Console
7. Generate FCM Server Key for backend
```

**2. Flutter Dependencies:**
```yaml
# pubspec.yaml
dependencies:
  firebase_core: ^2.24.0
  firebase_messaging: ^14.7.0
  flutter_local_notifications: ^16.3.0 # For foreground notifications
  timezone: ^0.9.2 # For scheduled notifications
```

**3. Flutter Implementation:**

```dart
// lib/services/firebase_notification_service.dart
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class FirebaseNotificationService {
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  static final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  // Initialize Firebase and notifications
  static Future<void> initialize() async {
    await Firebase.initializeApp();
    
    // Request permissions (iOS)
    NotificationSettings settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      print('User granted notification permission');
      
      // Get FCM token
      String? token = await _messaging.getToken();
      print('FCM Token: $token');
      
      // Send token to backend
      await _sendTokenToBackend(token);
      
      // Listen for token refresh
      _messaging.onTokenRefresh.listen(_sendTokenToBackend);
    }

    // Initialize local notifications (for foreground)
    await _initializeLocalNotifications();
    
    // Setup message handlers
    _setupMessageHandlers();
  }

  // Initialize local notifications
  static Future<void> _initializeLocalNotifications() async {
    const AndroidInitializationSettings androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    
    const DarwinInitializationSettings iosSettings =
        DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const InitializationSettings settings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      settings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    // Create notification channels (Android)
    await _createNotificationChannels();
  }

  // Create Android notification channels
  static Future<void> _createNotificationChannels() async {
    const AndroidNotificationChannel queueChannel = AndroidNotificationChannel(
      'queue_updates',
      'Queue Updates',
      description: 'Notifications about your position in the queue',
      importance: Importance.high,
      playSound: true,
      enableVibration: true,
    );

    const AndroidNotificationChannel callChannel = AndroidNotificationChannel(
      'incoming_calls',
      'Incoming Calls',
      description: 'Notifications for incoming doctor calls',
      importance: Importance.max,
      playSound: true,
      enableVibration: true,
      sound: RawResourceAndroidNotificationSound('call_ringtone'),
    );

    const AndroidNotificationChannel generalChannel = AndroidNotificationChannel(
      'general',
      'General Notifications',
      description: 'General app notifications',
      importance: Importance.defaultImportance,
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(queueChannel);

    await _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(callChannel);

    await _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(generalChannel);
  }

  // Setup message handlers
  static void _setupMessageHandlers() {
    // Handle foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('Foreground message: ${message.messageId}');
      _showLocalNotification(message);
    });

    // Handle background messages (app in background)
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print('Message clicked: ${message.messageId}');
      _handleNotificationClick(message);
    });

    // Handle terminated state (app closed)
    _messaging.getInitialMessage().then((RemoteMessage? message) {
      if (message != null) {
        print('App opened from terminated state: ${message.messageId}');
        _handleNotificationClick(message);
      }
    });
  }

  // Show local notification when app is in foreground
  static Future<void> _showLocalNotification(RemoteMessage message) async {
    final notification = message.notification;
    final android = message.notification?.android;
    final data = message.data;

    // Determine channel based on notification type
    String channelId = 'general';
    if (data['type'] == 'incoming_call') {
      channelId = 'incoming_calls';
    } else if (data['type'] == 'queue_update') {
      channelId = 'queue_updates';
    }

    if (notification != null) {
      await _localNotifications.show(
        notification.hashCode,
        notification.title,
        notification.body,
        NotificationDetails(
          android: AndroidNotificationDetails(
            channelId,
            channelId == 'incoming_calls' ? 'Incoming Calls' : 
            channelId == 'queue_updates' ? 'Queue Updates' : 'General Notifications',
            channelDescription: notification.body,
            importance: channelId == 'incoming_calls' 
                ? Importance.max 
                : Importance.high,
            priority: channelId == 'incoming_calls'
                ? Priority.max
                : Priority.high,
            playSound: true,
            enableVibration: true,
            fullScreenIntent: channelId == 'incoming_calls',
            icon: '@mipmap/ic_launcher',
            styleInformation: BigTextStyleInformation(
              notification.body ?? '',
              contentTitle: notification.title,
            ),
          ),
          iOS: DarwinNotificationDetails(
            presentAlert: true,
            presentBadge: true,
            presentSound: true,
            sound: channelId == 'incoming_calls' ? 'call_ringtone.aiff' : null,
          ),
        ),
        payload: message.data.toString(),
      );
    }
  }

  // Handle notification click
  static void _handleNotificationClick(RemoteMessage message) {
    final data = message.data;
    final type = data['type'];

    switch (type) {
      case 'incoming_call':
        // Navigate to call screen
        navigatorKey.currentState?.pushNamed(
          '/call',
          arguments: {
            'consultationId': data['consultation_id'],
          },
        );
        break;
      
      case 'queue_update':
        // Navigate to queue screen
        navigatorKey.currentState?.pushNamed(
          '/queue',
          arguments: {
            'consultationId': data['consultation_id'],
          },
        );
        break;
      
      case 'prescription_ready':
        // Navigate to prescription screen
        navigatorKey.currentState?.pushNamed(
          '/prescription',
          arguments: {
            'prescriptionId': data['prescription_id'],
          },
        );
        break;
      
      case 'payment_success':
        // Navigate to consultation history
        navigatorKey.currentState?.pushNamed('/consultations');
        break;
      
      case 'lab_results':
        // Navigate to lab results
        navigatorKey.currentState?.pushNamed(
          '/lab-results',
          arguments: {
            'resultId': data['result_id'],
          },
        );
        break;
      
      default:
        // Navigate to home
        navigatorKey.currentState?.pushNamed('/');
    }
  }

  // Handle local notification tap
  static void _onNotificationTapped(NotificationResponse response) {
    print('Notification tapped: ${response.payload}');
    // Parse payload and navigate accordingly
  }

  // Send FCM token to backend
  static Future<void> _sendTokenToBackend(String? token) async {
    if (token == null) return;
    
    try {
      // Get user ID from local storage
      final userId = await _getUserId();
      if (userId == null) return;

      // Send to backend
      final response = await dio.post(
        '/api/v1/notifications/register-device',
        data: {
          'user_id': userId,
          'fcm_token': token,
          'device_type': Platform.isIOS ? 'ios' : 'android',
          'device_info': await _getDeviceInfo(),
        },
      );

      if (response.statusCode == 200) {
        print('FCM token registered successfully');
      }
    } catch (e) {
      print('Error sending FCM token: $e');
    }
  }

  // Subscribe to topic (for broadcast messages)
  static Future<void> subscribeToTopic(String topic) async {
    await _messaging.subscribeToTopic(topic);
    print('Subscribed to topic: $topic');
  }

  // Unsubscribe from topic
  static Future<void> unsubscribeFromTopic(String topic) async {
    await _messaging.unsubscribeFromTopic(topic);
    print('Unsubscribed from topic: $topic');
  }

  // Delete FCM token (on logout)
  static Future<void> deleteToken() async {
    await _messaging.deleteToken();
    print('FCM token deleted');
  }
}
```

**4. Backend Integration (Node.js/NestJS):**

```typescript
// notification.service.ts
import * as admin from 'firebase-admin';

export class NotificationService {
  private messaging: admin.messaging.Messaging;

  constructor() {
    // Initialize Firebase Admin SDK
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    
    this.messaging = admin.messaging();
  }

  // Send notification to specific user
  async sendToUser(userId: string, notification: NotificationPayload) {
    // Get user's FCM tokens from database
    const tokens = await this.getUserFCMTokens(userId);
    
    if (tokens.length === 0) {
      console.log(`No FCM tokens found for user: ${userId}`);
      return;
    }

    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
      },
      data: notification.data,
      android: {
        priority: 'high' as const,
        notification: {
          channelId: this.getChannelId(notification.type),
          sound: notification.type === 'incoming_call' ? 'call_ringtone' : 'default',
          priority: notification.type === 'incoming_call' ? 'max' as const : 'high' as const,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: notification.type === 'incoming_call' ? 'call_ringtone.aiff' : 'default',
            badge: 1,
            contentAvailable: true,
          },
        },
      },
      tokens: tokens,
    };

    try {
      const response = await this.messaging.sendMulticast(message);
      
      console.log(`Successfully sent notification to ${response.successCount} devices`);
      
      // Handle failed tokens (remove invalid ones)
      if (response.failureCount > 0) {
        await this.handleFailedTokens(response, tokens, userId);
      }
      
      return response;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  // Send notification to multiple users
  async sendToMultipleUsers(userIds: string[], notification: NotificationPayload) {
    const promises = userIds.map(userId => this.sendToUser(userId, notification));
    return Promise.allSettled(promises);
  }

  // Send to topic (broadcast)
  async sendToTopic(topic: string, notification: NotificationPayload) {
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data,
      topic: topic,
    };

    try {
      const response = await this.messaging.send(message);
      console.log('Successfully sent message to topic:', response);
      return response;
    } catch (error) {
      console.error('Error sending to topic:', error);
      throw error;
    }
  }

  // Notification type handlers
  async sendQueueUpdateNotification(userId: string, position: number, estimatedWait: number) {
    await this.sendToUser(userId, {
      title: 'Queue Update',
      body: `You are now #${position} in the queue. Estimated wait: ${estimatedWait} minutes.`,
      type: 'queue_update',
      data: {
        type: 'queue_update',
        position: position.toString(),
        estimated_wait: estimatedWait.toString(),
      },
    });
  }

  async sendIncomingCallNotification(userId: string, doctorName: string, consultationId: string) {
    await this.sendToUser(userId, {
      title: 'Incoming Call',
      body: `Dr. ${doctorName} is calling you`,
      type: 'incoming_call',
      data: {
        type: 'incoming_call',
        consultation_id: consultationId,
        doctor_name: doctorName,
        action: 'answer_call',
      },
    });
  }

  async sendPaymentSuccessNotification(userId: string, amount: number, doctorName: string) {
    await this.sendToUser(userId, {
      title: 'Payment Successful',
      body: `Payment of GHS ${amount} confirmed. Consultation with ${doctorName} added to queue.`,
      type: 'payment_success',
      data: {
        type: 'payment_success',
        amount: amount.toString(),
      },
    });
  }

  async sendPrescriptionReadyNotification(userId: string, prescriptionId: string) {
    await this.sendToUser(userId, {
      title: 'Prescription Ready',
      body: 'Your prescription is ready to view and download',
      type: 'prescription_ready',
      data: {
        type: 'prescription_ready',
        prescription_id: prescriptionId,
      },
    });
  }

  async sendLabResultsNotification(userId: string, doctorName: string) {
    await this.sendToUser(userId, {
      title: 'Lab Results Uploaded',
      body: `Dr. ${doctorName} will review your lab results shortly`,
      type: 'lab_results',
      data: {
        type: 'lab_results',
      },
    });
  }

  // Helper methods
  private getChannelId(type: string): string {
    switch (type) {
      case 'incoming_call':
        return 'incoming_calls';
      case 'queue_update':
        return 'queue_updates';
      default:
        return 'general';
    }
  }

  private async getUserFCMTokens(userId: string): Promise<string[]> {
    // Query database for user's FCM tokens
    const devices = await this.deviceRepository.find({ userId, isActive: true });
    return devices.map(device => device.fcmToken);
  }

  private async handleFailedTokens(
    response: admin.messaging.BatchResponse,
    tokens: string[],
    userId: string
  ) {
    const failedTokens: string[] = [];
    
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const error = resp.error;
        if (
          error?.code === 'messaging/invalid-registration-token' ||
          error?.code === 'messaging/registration-token-not-registered'
        ) {
          failedTokens.push(tokens[idx]);
        }
      }
    });

    // Remove invalid tokens from database
    if (failedTokens.length > 0) {
      await this.deviceRepository.deleteMany({
        userId,
        fcmToken: { $in: failedTokens },
      });
      console.log(`Removed ${failedTokens.length} invalid tokens`);
    }
  }
}

interface NotificationPayload {
  title: string;
  body: string;
  type: string;
  data: { [key: string]: string };
  imageUrl?: string;
}
```

**5. Background Message Handler (Flutter):**

```dart
// lib/main.dart
import 'package:firebase_messaging/firebase_messaging.dart';

// Top-level function for background messages
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('Handling background message: ${message.messageId}');
  
  // Process background message
  if (message.data['type'] == 'incoming_call') {
    // Show high-priority notification
    await FirebaseNotificationService.showIncomingCallNotification(message);
  }
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Register background message handler
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  
  // Initialize Firebase
  await FirebaseNotificationService.initialize();
  
  runApp(MyApp());
}
```

**6. Notification Types & Channels:**

| Type | Channel ID | Priority | Sound | Use Case |
|------|-----------|----------|-------|----------|
| incoming_call | incoming_calls | MAX | call_ringtone | Doctor calling patient |
| queue_update | queue_updates | HIGH | default | Queue position changes |
| payment_success | general | DEFAULT | default | Payment confirmed |
| prescription_ready | general | DEFAULT | default | Prescription available |
| lab_results | general | DEFAULT | default | Lab results uploaded |
| general | general | DEFAULT | default | Other notifications |

**7. Best Practices:**

- **Token Management:**
  - Store FCM tokens with device info (iOS/Android, model, OS version)
  - Mark tokens as inactive when user logs out
  - Clean up invalid tokens regularly
  - Handle token refresh automatically

- **Notification Delivery:**
  - Use high priority for time-sensitive notifications (calls, queue updates)
  - Implement retry logic for failed deliveries
  - Log all notification attempts
  - Track delivery rates and engagement

- **User Experience:**
  - Allow users to customize notification preferences
  - Respect system notification settings
  - Use appropriate sounds for different notification types
  - Group related notifications
  - Clear notifications when user opens app

- **Performance:**
  - Send targeted notifications (not broadcast unless necessary)
  - Batch notifications when possible
  - Use topics for announcements
  - Implement rate limiting

- **Testing:**
  - Test on both iOS and Android
  - Test foreground, background, and terminated states
  - Test notification actions and deep linking
  - Test with poor network conditions

### 11.7 WebRTC Signaling Server

**Purpose:** Facilitate peer-to-peer voice/video connections

**Options:**
- Custom Node.js server with Socket.io
- Twilio Video
- Agora.io
- Daily.co

**Components:**
1. Signaling server for WebRTC negotiation
2. STUN/TURN servers for NAT traversal
3. Media server for recording (optional)

**Flow:**
1. Doctor and patient connect to signaling server
2. Exchange SDP offers/answers via server
3. Exchange ICE candidates
4. Establish peer-to-peer connection
5. Media flows directly between peers
6. Fallback to TURN server if P2P fails

### 11.8 Cloud Storage (AWS S3 / Google Cloud Storage)

**Purpose:** Store files and media

**Stored Content:**
1. Profile photos
2. Medical documents
3. Lab reports
4. Prescriptions
5. Call recordings
6. Medical license documents

**Best Practices:**
- Use CDN for faster delivery
- Implement signed URLs for security
- Set appropriate retention policies
- Encrypt sensitive files
- Use lifecycle policies to archive old files

---

## 12. Security & Privacy

### 12.1 Authentication & Authorization

**Authentication Mechanisms:**
1. **Phone Number + Password**
   - Bcrypt/Scrypt for password hashing
   - Minimum 8 characters, complexity requirements
   - Account lockout after 5 failed attempts

2. **Two-Factor Authentication (Optional)**
   - SMS OTP
   - Time-based OTP (TOTP)

3. **Biometric Authentication**
   - Fingerprint
   - Face ID
   - Stored locally, never transmitted

**JWT Token Management:**
- Short-lived access tokens (1 hour)
- Long-lived refresh tokens (30 days)
- Token rotation on refresh
- Blacklist compromised tokens
- Store refresh tokens securely (HTTP-only cookies or secure storage)

**Session Management:**
- Automatic logout after 30 minutes inactivity
- Single session per device (optional)
- Revoke all sessions on password change

### 12.2 Data Encryption

**In Transit:**
- TLS 1.3 for all API communications
- Certificate pinning for mobile apps
- WebRTC DTLS-SRTP for call encryption

**At Rest:**
- AES-256 encryption for database
- Field-level encryption for:
  - Medical records
  - Prescription details
  - Payment information
  - Personal identifiable information (PII)
- Encrypted backups

**Key Management:**
- Use AWS KMS, Google Cloud KMS, or Azure Key Vault
- Regular key rotation
- Separate keys for different data types
- Hardware Security Modules (HSM) for sensitive keys

### 12.3 Privacy Compliance

**Data Minimization:**
- Collect only necessary information
- Delete data when no longer needed
- Anonymize data for analytics

**Consent Management:**
- Explicit consent for data collection
- Consent for call recording
- Consent for data sharing with third parties
- Easy consent withdrawal

**Data Access Controls:**
- Doctors can only access patient data during active consultation
- Patients can view their own data
- Audit logs for all data access
- Data access requests handled within 30 days

**Right to be Forgotten:**
- Patients can request data deletion
- Exceptions for legal/medical retention requirements
- Data anonymization for historical records

### 12.4 HIPAA-Equivalent Standards

**Administrative Safeguards:**
- Security management process
- Workforce training
- Access management procedures
- Security incident procedures

**Physical Safeguards:**
- Facility access controls
- Workstation security
- Device and media controls

**Technical Safeguards:**
- Access controls (unique user IDs, emergency access)
- Audit controls (logging all activities)
- Integrity controls (detect unauthorized changes)
- Transmission security (encryption)

### 12.5 Vulnerability Management

**Security Testing:**
- Regular penetration testing (quarterly)
- Automated vulnerability scanning
- Code security analysis (SAST/DAST)
- Dependency vulnerability checks

**Incident Response:**
- Security incident response plan
- 24/7 security monitoring
- Automated alerting for suspicious activities
- Incident documentation and reporting

**Patch Management:**
- Regular security updates
- Critical patches within 24 hours
- Update process for mobile apps

### 12.6 API Security

**Rate Limiting:**
- Per-user rate limits
- Per-endpoint rate limits
- Progressive delays for repeated violations
- IP-based blocking for abuse

**Input Validation:**
- Validate all user inputs
- Sanitize data to prevent injection attacks
- Use parameterized queries for database
- Content Security Policy (CSP) headers

**API Authentication:**
- API keys for third-party integrations
- OAuth 2.0 for delegated access
- Signature verification for webhooks

### 12.7 Audit & Compliance

**Audit Logging:**
- Log all access to patient data
- Log all authentication attempts
- Log all payment transactions
- Log all prescription creations
- Log all administrative actions
- Retain logs for minimum 7 years

**Compliance Audits:**
- Annual security audits
- GDPR compliance review (if applicable)
- Ghana Data Protection Act compliance
- Medical Board regulations compliance

**Data Breach Protocol:**
1. Detect and contain breach
2. Assess impact and affected users
3. Notify affected users within 72 hours
4. Report to regulatory authorities
5. Implement remediation measures
6. Post-incident review and improvements

---

## 13. UI/UX Requirements

### 13.1 Design Principles

**Simplicity:**
- Clean, uncluttered interface
- Maximum 3 taps to reach any feature
- Clear visual hierarchy
- Prominent call-to-action buttons

**Accessibility:**
- WCAG 2.1 Level AA compliance
- Large touch targets (minimum 44x44 points)
- High contrast color scheme
- Scalable fonts (support for larger text)
- Screen reader support
- Alternative text for images

**Cultural Sensitivity:**
- Culturally appropriate imagery
- Local naming conventions
- Respect for privacy and modesty
- Consideration for rural users

**Consistency:**
- Consistent design language throughout
- Standard UI patterns
- Predictable navigation
- Uniform terminology

### 13.2 Color Scheme

**Primary Colors:**
- Primary: Healthcare Blue (#0066CC) - trust, professionalism
- Secondary: Warm Green (#00A86B) - health, growth
- Accent: Energetic Orange (#FF8C00) - action, urgency

**Functional Colors:**
- Success: Green (#28A745)
- Warning: Yellow (#FFC107)
- Error: Red (#DC3545)
- Info: Blue (#17A2B8)

**Neutral Colors:**
- Dark: #2C3E50 (text)
- Medium: #95A5A6 (secondary text)
- Light: #ECF0F1 (backgrounds)
- White: #FFFFFF

**Emergency:**
- Emergency Red: #E74C3C (for emergency buttons)

### 13.3 Typography

**Font Family:**
- Primary: SF Pro (iOS) / Roboto (Android)
- Alternative for Twi: Noto Sans (better Unicode support)

**Font Sizes:**
- Heading 1: 28pt (bold)
- Heading 2: 24pt (semi-bold)
- Heading 3: 20pt (semi-bold)
- Body: 16pt (regular)
- Small: 14pt (regular)
- Caption: 12pt (regular)

**Line Spacing:**
- Minimum 1.5x for body text
- 1.3x for headings

### 13.4 Iconography

**Icon Style:**
- Line icons (consistent stroke width)
- Simple and recognizable
- Size: 24x24pt standard, 48x48pt for primary actions

**Common Icons:**
- Home: House icon
- Doctors: Stethoscope or doctor icon
- Consultations: Chat bubble or calendar
- Emergency: Exclamation in circle or medical cross
- Profile: Person silhouette
- Settings: Gear icon
- Payment: Credit card or money icon
- Pharmacy: Pill or mortar and pestle
- Lab: Test tube or microscope
- Location: Map pin

### 13.5 Navigation Structure

**Bottom Tab Navigation (Patient):**
1. Home
2. Doctors
3. Consultations
4. Profile

**Bottom Tab Navigation (Doctor):**
1. Dashboard
2. Queue
3. Consultations
4. Earnings
5. Profile

**Persistent Elements:**
- Emergency button (floating action button)
- Notification bell (top right)
- Language toggle (in settings)

### 13.6 Screen Layouts

**Home Screen (Patient):**
```
┌─────────────────────────────────┐
│ Welcome, Kwame          🔔 ⚙️   │
│                                 │
│ ┌─────────────────────────────┐ │
│ │   Consult a Doctor          │ │
│ │   [Primary Action Button]   │ │
│ └─────────────────────────────┘ │
│                                 │
│ Quick Actions:                  │
│ [Upload Lab]  [Emergency]       │
│                                 │
│ Recent Doctors:                 │
│ ┌───┐ Dr. Akosua               │
│ │ 👤│ General Practitioner      │
│ └───┘ ⭐ 4.8  GHS 50           │
│                                 │
│ Health Tips:                    │
│ [Carousel of tips]              │
└─────────────────────────────────┘
```

**Doctor Search Screen:**
```
┌─────────────────────────────────┐
│ ← Doctors               🔍      │
│                                 │
│ [Filters] [Sort]                │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 👤 Dr. Akosua Boateng       │ │
│ │ General Practitioner        │ │
│ │ ⭐ 4.8 (150) | GHS 50       │ │
│ │ 🟢 Online | 2 in queue      │ │
│ │ ~15 min wait                │ │
│ └─────────────────────────────┘ │
│                                 │
│ [More doctors...]               │
└─────────────────────────────────┘
```

**Queue Screen (Patient):**
```
┌─────────────────────────────────┐
│ ← Queue Status                  │
│                                 │
│ You're in the queue!            │
│                                 │
│        Position                 │
│           #2                    │
│                                 │
│ ● ● ○ ○ ○                       │
│                                 │
│ Estimated wait: ~10 minutes     │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 👤 Dr. Akosua Boateng       │ │
│ │ General Practitioner        │ │
│ └─────────────────────────────┘ │
│                                 │
│ Waiting since: 10:35 AM         │
│                                 │
│                                 │
│ [Leave Queue]                   │
└─────────────────────────────────┘
```

**In-Call Screen:**
```
┌─────────────────────────────────┐
│                                 │
│       👤                         │
│   Dr. Akosua Boateng            │
│   General Practitioner          │
│                                 │
│       15:23                     │
│                                 │
│                                 │
│   🔊  🎥  💬                    │
│   Speaker Video Chat            │
│                                 │
│                                 │
│        🔴 End Call              │
└─────────────────────────────────┘
```

### 13.7 Loading & Empty States

**Loading States:**
- Skeleton screens for lists
- Spinner for single items
- Progress bar for file uploads
- Loading text: "Loading..." or "Erekɔ so..." (Twi)

**Empty States:**
- Friendly illustrations
- Clear explanation of why it's empty
- Action button to resolve
- Example: "No consultations yet. Start by consulting a doctor!"

**Error States:**
- Error icon (red)
- Clear error message in user's language
- Suggested actions
- "Try Again" button

### 13.8 Micro-interactions

**Button Press:**
- Scale down slightly (0.95) on press
- Return to normal on release
- Haptic feedback

**Swipe Actions:**
- Reveal actions on swipe (iOS style)
- Visual feedback during swipe

**Pull to Refresh:**
- Standard pull-to-refresh pattern
- Custom animation with HealthConnect branding

**Notifications:**
- Slide in from top
- Auto-dismiss after 3 seconds
- Swipe to dismiss

### 13.9 Onboarding Flow

**First-Time User Experience:**

**Slide 1:**
- Illustration of doctor-patient connection
- Text: "Connect with doctors from anywhere"
- "Next" button

**Slide 2:**
- Illustration of payment
- Text: "Secure payments, no hidden fees"
- "Next" button

**Slide 3:**
- Illustration of prescription
- Text: "Get prescriptions and referrals instantly"
- "Get Started" button

**Registration Tutorial:**
- Interactive tooltips on first use
- Highlight key features
- Option to skip
- Mark as completed in user profile

### 13.10 Localization (Twi)

**Key Translations:**
- Home: Fie / Efipano
- Doctors: Adɔkotafoɔ
- Consultation: Nhyiam / Adwenkyerɛ
- Payment: Ka ho dwumadie
- Emergency: Ntɛmpɛ
- Queue: Nhyehyɛeɛ
- Welcome: Akwaaba
- Loading: Erekɔ so
- Success: Ɛyɛ yie
- Error: Mfomsoɔ
- Continue: Kɔ so
- Cancel: Twa hɔ

**Date/Time Formats:**
- Use local format: DD/MM/YYYY
- 12-hour time with AM/PM
- Day names in Twi if selected

### 13.11 Responsive Design

**Mobile Phones:**
- Optimize for screens 5" to 6.7"
- Portrait orientation primary
- Landscape support for video calls

**Tablets:**
- Support for iPad and Android tablets
- Two-column layouts where appropriate
- Larger touch targets

**Adaptive Layouts:**
- Adjust font sizes based on screen size
- Flexible grids
- Scalable images

---

## 14. Implementation Roadmap

### Phase 1: MVP (Minimum Viable Product) - 3 months

**Core Features:**
1. User registration and authentication (patient and doctor)
2. Doctor profile and discovery
3. Voice calling (WebRTC)
4. Basic queue management
5. Payment integration (Paystack - Mobile Money only)
6. Consultation history
7. Push notifications
8. Twi and English language support
9. Basic prescription sharing (image upload)

**Deliverables:**
- iOS and Android apps
- Backend API
- Admin panel for doctor verification
- Basic analytics dashboard

### Phase 2: Enhanced Features - 2 months

**Additional Features:**
1. Video calling
2. Real-time transcription
3. Lab request management
4. Lab results upload
5. Advanced queue management (triage)
6. Pharmacy location services (Google Maps)
7. Digital prescriptions (structured data)
8. Doctor earnings dashboard
9. SMS notifications (fallback)

### Phase 3: Optimization - 2 months

**Improvements:**
1. Performance optimization
2. Offline mode
3. Advanced analytics
4. AI-powered triage
5. Automated consultation summaries
6. Doctor ratings and reviews
7. Referral system
8. Follow-up appointment scheduling
9. In-app chat (text messaging)

### Phase 4: Scaling - Ongoing

**Scale Features:**
1. Pharmacy integration (partner pharmacies)
2. Laboratory integration (partner labs)
3. Hospital management dashboard
4. Insurance integration
5. E-pharmacy (medication delivery)
6. Health records management
7. Telemedicine for specialists
8. Multi-region support
9. Web app for doctors

---

## 15. Testing Requirements

### 15.1 Unit Testing
- Test coverage: 80%+ for critical paths
- Test all business logic
- Mock external dependencies

### 15.2 Integration Testing
- API endpoint testing
- Database integration
- Third-party service integration
- WebRTC connection testing

### 15.3 End-to-End Testing
- Complete user journeys (patient and doctor)
- Payment flows
- Call scenarios
- Queue management

### 15.4 Performance Testing
- Load testing (1000+ concurrent users)
- Stress testing
- API response time benchmarks
- Call quality testing

### 15.5 Security Testing
- Penetration testing
- Vulnerability scanning
- Authentication testing
- Data encryption verification

### 15.6 User Acceptance Testing (UAT)
- Beta testing with real doctors and patients
- Usability testing
- Accessibility testing
- Language testing (Twi and English)

### 15.7 Device Testing
- Test on various iOS devices (iPhone 8 to latest)
- Test on various Android devices (budget to flagship)
- Network condition testing (2G, 3G, 4G, WiFi)
- Battery consumption testing

---

## 17. Flutter Mobile App Architecture

### 17.1 Project Structure

```
healthconnect_mobile/
├── android/                    # Android native code
├── ios/                       # iOS native code
├── lib/
│   ├── core/
│   │   ├── constants/         # App constants, colors, strings
│   │   ├── errors/            # Error handling
│   │   ├── network/           # HTTP client, interceptors
│   │   ├── storage/           # Local storage
│   │   └── utils/             # Utility functions
│   ├── features/
│   │   ├── auth/
│   │   │   ├── data/          # API, models, repositories
│   │   │   ├── domain/        # Entities, use cases
│   │   │   └── presentation/  # UI, state management
│   │   ├── consultation/
│   │   ├── doctor/
│   │   ├── payment/
│   │   ├── prescription/
│   │   ├── queue/
│   │   └── profile/
│   ├── l10n/                  # Localization (Twi/English)
│   ├── routes/                # Navigation
│   ├── services/              # FCM, WebRTC, Location
│   ├── shared/                # Shared widgets, theme
│   └── main.dart
├── assets/
│   ├── images/
│   ├── icons/
│   ├── translations/
│   └── sounds/
├── test/
└── pubspec.yaml
```

### 17.2 Core Dependencies

```yaml
# pubspec.yaml
name: healthconnect_mobile
description: HealthConnect - Telemedicine Platform

environment:
  sdk: '>=3.2.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  
  # State Management
  flutter_riverpod: ^2.4.9
  
  # Networking
  dio: ^5.4.0
  retrofit: ^4.0.3
  pretty_dio_logger: ^1.3.1
  
  # Local Storage
  shared_preferences: ^2.2.2
  flutter_secure_storage: ^9.0.0
  sqflite: ^2.3.0
  
  # Firebase
  firebase_core: ^2.24.0
  firebase_messaging: ^14.7.0
  firebase_analytics: ^10.7.4
  
  # Notifications
  flutter_local_notifications: ^16.3.0
  
  # WebRTC (Calls)
  flutter_webrtc: ^0.9.48
  socket_io_client: ^2.0.3+1
  permission_handler: ^11.1.0
  
  # Audio/Video
  flutter_sound: ^9.2.13
  camera: ^0.10.5+7
  image_picker: ^1.0.7
  file_picker: ^6.1.1
  
  # Maps & Location
  google_maps_flutter: ^2.5.0
  geolocator: ^10.1.0
  geocoding: ^2.1.1
  
  # UI Components
  flutter_svg: ^2.0.9
  cached_network_image: ^3.3.1
  shimmer: ^3.0.0
  lottie: ^2.7.0
  flutter_rating_bar: ^4.0.1
  
  # Forms & Validation
  flutter_form_builder: ^9.1.1
  form_builder_validators: ^9.1.0
  
  # Payment (Paystack)
  flutter_paystack: ^1.0.7
  
  # PDF
  pdf: ^3.10.7
  printing: ^5.11.1
  
  # Utilities
  intl: ^0.18.1
  uuid: ^4.3.1
  url_launcher: ^6.2.2
  share_plus: ^7.2.1
  path_provider: ^2.1.1
  
  # Localization
  flutter_localizations:
    sdk: flutter
  easy_localization: ^3.0.3
  
  # Crash Reporting
  sentry_flutter: ^7.14.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_launcher_icons: ^0.13.1
  flutter_native_splash: ^2.3.9
  build_runner: ^2.4.7
  retrofit_generator: ^8.0.6
  json_serializable: ^6.7.1
  mockito: ^5.4.4
```

### 17.3 State Management with Riverpod

```dart
// lib/features/consultation/presentation/providers/consultation_provider.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Consultation State
class ConsultationState {
  final bool isLoading;
  final Consultation? consultation;
  final int? queuePosition;
  final int? estimatedWait;
  final String? error;

  ConsultationState({
    this.isLoading = false,
    this.consultation,
    this.queuePosition,
    this.estimatedWait,
    this.error,
  });

  ConsultationState copyWith({
    bool? isLoading,
    Consultation? consultation,
    int? queuePosition,
    int? estimatedWait,
    String? error,
  }) {
    return ConsultationState(
      isLoading: isLoading ?? this.isLoading,
      consultation: consultation ?? this.consultation,
      queuePosition: queuePosition ?? this.queuePosition,
      estimatedWait: estimatedWait ?? this.estimatedWait,
      error: error ?? this.error,
    );
  }
}

// Consultation Notifier
class ConsultationNotifier extends StateNotifier<ConsultationState> {
  final ConsultationRepository _repository;
  final WebSocketService _webSocketService;

  ConsultationNotifier(this._repository, this._webSocketService)
      : super(ConsultationState()) {
    _listenToQueueUpdates();
  }

  // Create consultation
  Future<void> createConsultation({
    required String doctorId,
    required String chiefComplaint,
    String? audioUrl,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final consultation = await _repository.createConsultation(
        doctorId: doctorId,
        chiefComplaint: chiefComplaint,
        audioUrl: audioUrl,
      );
      
      state = state.copyWith(
        isLoading: false,
        consultation: consultation,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  // Make payment and join queue
  Future<void> payAndJoinQueue(String consultationId) async {
    state = state.copyWith(isLoading: true);
    
    try {
      await _repository.processPayment(consultationId);
      await _repository.joinQueue(consultationId);
      
      // Listen for queue updates via WebSocket
      _webSocketService.emit('join_consultation', {'consultation_id': consultationId});
      
      state = state.copyWith(isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  // Listen to queue updates via WebSocket
  void _listenToQueueUpdates() {
    _webSocketService.on('queue_position_update', (data) {
      state = state.copyWith(
        queuePosition: data['queue_position'],
        estimatedWait: data['estimated_wait_time'],
      );
    });
    
    _webSocketService.on('queue_ready', (data) {
      state = state.copyWith(queuePosition: 0);
      // Show incoming call notification
    });
  }

  // Accept call
  Future<void> acceptCall(String consultationId) async {
    try {
      await _repository.acceptCall(consultationId);
      // Navigate to call screen
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  @override
  void dispose() {
    _webSocketService.dispose();
    super.dispose();
  }
}

// Provider
final consultationProvider = StateNotifierProvider<ConsultationNotifier, ConsultationState>((ref) {
  final repository = ref.watch(consultationRepositoryProvider);
  final webSocket = ref.watch(webSocketServiceProvider);
  return ConsultationNotifier(repository, webSocket);
});
```

### 17.4 WebRTC Implementation for Voice/Video Calls

```dart
// lib/services/webrtc_service.dart
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;

class WebRTCService {
  RTCPeerConnection? _peerConnection;
  MediaStream? _localStream;
  MediaStream? _remoteStream;
  IO.Socket? _socket;
  
  final RTCVideoRenderer localRenderer = RTCVideoRenderer();
  final RTCVideoRenderer remoteRenderer = RTCVideoRenderer();
  
  bool isVideoEnabled = false;
  bool isAudioMuted = false;

  // Initialize WebRTC
  Future<void> initialize(String signalingServerUrl, String consultationId) async {
    await localRenderer.initialize();
    await remoteRenderer.initialize();
    
    // Connect to signaling server
    _socket = IO.io(signalingServerUrl, <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': false,
      'extraHeaders': {
        'consultation_id': consultationId,
      }
    });
    
    _socket?.connect();
    _setupSocketListeners();
  }

  // Start call (voice only initially)
  Future<void> startCall({required bool isDoctor}) async {
    // Get user media (audio only)
    _localStream = await navigator.mediaDevices.getUserMedia({
      'audio': true,
      'video': false,
    });
    
    localRenderer.srcObject = _localStream;
    
    // Create peer connection
    await _createPeerConnection();
    
    // Add local stream to peer connection
    _localStream?.getTracks().forEach((track) {
      _peerConnection?.addTrack(track, _localStream!);
    });
    
    if (isDoctor) {
      // Doctor creates offer
      await _createOffer();
    }
  }

  // Enable video (when approved)
  Future<void> enableVideo() async {
    if (isVideoEnabled) return;
    
    // Get video stream
    final videoStream = await navigator.mediaDevices.getUserMedia({
      'video': {
        'facingMode': 'user',
        'width': {'ideal': 1280},
        'height': {'ideal': 720},
      }
    });
    
    // Add video track to existing stream
    final videoTrack = videoStream.getVideoTracks()[0];
    _localStream?.addTrack(videoTrack);
    _peerConnection?.addTrack(videoTrack, _localStream!);
    
    localRenderer.srcObject = _localStream;
    isVideoEnabled = true;
    
    // Notify peer
    _socket?.emit('video_enabled', {});
  }

  // Disable video
  Future<void> disableVideo() async {
    if (!isVideoEnabled) return;
    
    _localStream?.getVideoTracks().forEach((track) {
      track.stop();
      _localStream?.removeTrack(track);
    });
    
    isVideoEnabled = false;
    _socket?.emit('video_disabled', {});
  }

  // Toggle audio
  void toggleAudio() {
    isAudioMuted = !isAudioMuted;
    _localStream?.getAudioTracks().forEach((track) {
      track.enabled = !isAudioMuted;
    });
  }

  // Switch camera (front/back)
  Future<void> switchCamera() async {
    if (!isVideoEnabled) return;
    
    final videoTrack = _localStream?.getVideoTracks()[0];
    await Helper.switchCamera(videoTrack!);
  }

  // Create peer connection
  Future<void> _createPeerConnection() async {
    final configuration = {
      'iceServers': [
        {'urls': 'stun:stun.l.google.com:19302'},
        {
          'urls': 'turn:turnserver.example.com:3478',
          'username': 'user',
          'credential': 'pass'
        }
      ]
    };
    
    _peerConnection = await createPeerConnection(configuration);
    
    // Listen for remote stream
    _peerConnection?.onTrack = (RTCTrackEvent event) {
      if (event.streams.isNotEmpty) {
        _remoteStream = event.streams[0];
        remoteRenderer.srcObject = _remoteStream;
      }
    };
    
    // Listen for ICE candidates
    _peerConnection?.onIceCandidate = (RTCIceCandidate candidate) {
      _socket?.emit('ice_candidate', {
        'candidate': candidate.toMap(),
      });
    };
    
    // Monitor connection state
    _peerConnection?.onConnectionState = (RTCPeerConnectionState state) {
      print('Connection state: $state');
      if (state == RTCPeerConnectionState.RTCPeerConnectionStateDisconnected) {
        // Handle disconnection
      }
    };
  }

  // Create offer (doctor side)
  Future<void> _createOffer() async {
    final offer = await _peerConnection?.createOffer();
    await _peerConnection?.setLocalDescription(offer!);
    
    _socket?.emit('offer', {
      'sdp': offer?.sdp,
      'type': offer?.type,
    });
  }

  // Create answer (patient side)
  Future<void> _createAnswer() async {
    final answer = await _peerConnection?.createAnswer();
    await _peerConnection?.setLocalDescription(answer!);
    
    _socket?.emit('answer', {
      'sdp': answer?.sdp,
      'type': answer?.type,
    });
  }

  // Setup socket listeners for signaling
  void _setupSocketListeners() {
    // Receive offer
    _socket?.on('offer', (data) async {
      await _peerConnection?.setRemoteDescription(
        RTCSessionDescription(data['sdp'], data['type']),
      );
      await _createAnswer();
    });
    
    // Receive answer
    _socket?.on('answer', (data) async {
      await _peerConnection?.setRemoteDescription(
        RTCSessionDescription(data['sdp'], data['type']),
      );
    });
    
    // Receive ICE candidate
    _socket?.on('ice_candidate', (data) async {
      await _peerConnection?.addCandidate(
        RTCIceCandidate(
          data['candidate']['candidate'],
          data['candidate']['sdpMid'],
          data['candidate']['sdpMLineIndex'],
        ),
      );
    });
    
    // Peer enabled video
    _socket?.on('video_enabled', (data) {
      // Update UI to show video is available
    });
    
    // Peer disabled video
    _socket?.on('video_disabled', (data) {
      // Update UI
    });
  }

  // End call
  Future<void> endCall() async {
    _localStream?.getTracks().forEach((track) {
      track.stop();
    });
    
    await _peerConnection?.close();
    await localRenderer.dispose();
    await remoteRenderer.dispose();
    
    _socket?.disconnect();
    _socket?.dispose();
  }

  void dispose() {
    endCall();
  }
}
```

### 17.5 Audio Recording for Symptoms

```dart
// lib/services/audio_recorder_service.dart
import 'package:flutter_sound/flutter_sound.dart';
import 'package:permission_handler/permission_handler.dart';

class AudioRecorderService {
  final FlutterSoundRecorder _recorder = FlutterSoundRecorder();
  bool isRecording = false;
  String? recordingPath;

  // Initialize recorder
  Future<void> initialize() async {
    await _recorder.openRecorder();
    
    // Request microphone permission
    final status = await Permission.microphone.request();
    if (!status.isGranted) {
      throw Exception('Microphone permission not granted');
    }
  }

  // Start recording
  Future<void> startRecording() async {
    if (isRecording) return;
    
    // Generate file path
    final directory = await getApplicationDocumentsDirectory();
    recordingPath = '${directory.path}/${DateTime.now().millisecondsSinceEpoch}.aac';
    
    await _recorder.startRecorder(
      toFile: recordingPath,
      codec: Codec.aacADTS,
      bitRate: 128000,
      sampleRate: 44100,
    );
    
    isRecording = true;
  }

  // Stop recording
  Future<String?> stopRecording() async {
    if (!isRecording) return null;
    
    await _recorder.stopRecorder();
    isRecording = false;
    
    return recordingPath;
  }

  // Get recording duration
  Stream<RecordingDisposition>? onProgress() {
    return _recorder.onProgress;
  }

  // Dispose
  Future<void> dispose() async {
    await _recorder.closeRecorder();
  }
}
```

### 17.6 Offline Mode & Caching

```dart
// lib/core/network/cache_manager.dart
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class CacheManager {
  static Database? _database;

  // Initialize database
  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    final databasesPath = await getDatabasesPath();
    final path = join(databasesPath, 'healthconnect_cache.db');

    return await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        // Create tables for offline caching
        await db.execute('''
          CREATE TABLE consultations (
            id TEXT PRIMARY KEY,
            data TEXT,
            timestamp INTEGER
          )
        ''');
        
        await db.execute('''
          CREATE TABLE doctors (
            id TEXT PRIMARY KEY,
            data TEXT,
            timestamp INTEGER
          )
        ''');
        
        await db.execute('''
          CREATE TABLE prescriptions (
            id TEXT PRIMARY KEY,
            data TEXT,
            timestamp INTEGER
          )
        ''');
      },
    );
  }

  // Cache consultation
  Future<void> cacheConsultation(String id, Map<String, dynamic> data) async {
    final db = await database;
    await db.insert(
      'consultations',
      {
        'id': id,
        'data': jsonEncode(data),
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  // Get cached consultation
  Future<Map<String, dynamic>?> getCachedConsultation(String id) async {
    final db = await database;
    final results = await db.query(
      'consultations',
      where: 'id = ?',
      whereArgs: [id],
    );
    
    if (results.isEmpty) return null;
    
    return jsonDecode(results.first['data'] as String);
  }

  // Clear old cache (older than 7 days)
  Future<void> clearOldCache() async {
    final db = await database;
    final sevenDaysAgo = DateTime.now().subtract(Duration(days: 7)).millisecondsSinceEpoch;
    
    await db.delete(
      'consultations',
      where: 'timestamp < ?',
      whereArgs: [sevenDaysAgo],
    );
  }
}
```

### 17.7 Network Connectivity Check

```dart
// lib/core/network/network_info.dart
import 'package:connectivity_plus/connectivity_plus.dart';

class NetworkInfo {
  final Connectivity _connectivity = Connectivity();

  // Check if connected
  Future<bool> get isConnected async {
    final result = await _connectivity.checkConnectivity();
    return result != ConnectivityResult.none;
  }

  // Listen to connectivity changes
  Stream<ConnectivityResult> get onConnectivityChanged {
    return _connectivity.onConnectivityChanged;
  }

  // Get connection type
  Future<String> getConnectionType() async {
    final result = await _connectivity.checkConnectivity();
    switch (result) {
      case ConnectivityResult.wifi:
        return 'WiFi';
      case ConnectivityResult.mobile:
        return 'Mobile Data';
      case ConnectivityResult.ethernet:
        return 'Ethernet';
      default:
        return 'No Connection';
    }
  }
}

// Usage in Provider
final networkInfoProvider = Provider<NetworkInfo>((ref) => NetworkInfo());

// In UI
Consumer(
  builder: (context, ref, child) {
    ref.listen(networkInfoProvider, (previous, next) async {
      final isConnected = await next.isConnected;
      if (!isConnected) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('No internet connection')),
        );
      }
    });
    return child!;
  },
  child: YourApp(),
)
```

---

## 18. React Web Dashboard (Hospitals & Pharmacies)

### 18.1 Project Structure

```
healthconnect_web/
├── public/
├── src/
│   ├── api/                   # API calls
│   ├── assets/               # Images, icons
│   ├── components/
│   │   ├── common/           # Reusable components
│   │   ├── hospital/         # Hospital-specific
│   │   └── pharmacy/         # Pharmacy-specific
│   ├── features/
│   │   ├── auth/
│   │   ├── triage/           # Hospital triage
│   │   ├── prescriptions/    # Pharmacy orders
│   │   └── analytics/
│   ├── hooks/                # Custom React hooks
│   ├── layouts/              # Page layouts
│   ├── pages/                # Route pages
│   ├── store/                # Redux/Zustand store
│   ├── styles/               # Global styles
│   ├── types/                # TypeScript types
│   ├── utils/                # Utility functions
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── tsconfig.json
```

### 18.2 Core Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "typescript": "^5.3.0",
    
    "@mui/material": "^5.15.0",
    "@mui/x-data-grid": "^6.18.0",
    "@mui/x-date-pickers": "^6.18.0",
    "@emotion/react": "^11.11.0",
    "@emotion/styled": "^11.11.0",
    
    "axios": "^1.6.0",
    "socket.io-client": "^4.6.0",
    
    "zustand": "^4.4.0",
    "react-query": "^3.39.0",
    
    "react-hook-form": "^7.49.0",
    "yup": "^1.3.0",
    
    "@react-google-maps/api": "^2.19.0",
    
    "recharts": "^2.10.0",
    "date-fns": "^2.30.0",
    
    "react-toastify": "^9.1.0",
    
    "jwt-decode": "^4.0.0"
  }
}
```

### 18.3 Hospital Triage Dashboard

```typescript
// src/pages/hospital/TriageDashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Chip,
  Button,
  Grid,
  Dialog,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useTriageStore } from '../../store/triageStore';
import { PatientRequest } from '../../types';

export const TriageDashboard: React.FC = () => {
  const { pendingRequests, assignDoctor, rejectRequest } = useTriageStore();
  const [selectedRequest, setSelectedRequest] = useState<PatientRequest | null>(null);

  const columns: GridColDef[] = [
    { field: 'patientName', headerName: 'Patient', width: 150 },
    { field: 'age', headerName: 'Age', width: 80 },
    { field: 'gender', headerName: 'Gender', width: 100 },
    {
      field: 'urgencyLevel',
      headerName: 'Urgency',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={
            params.value === 'emergency' ? 'error' :
            params.value === 'urgent' ? 'warning' : 'success'
          }
          size="small"
        />
      ),
    },
    { field: 'chiefComplaint', headerName: 'Chief Complaint', width: 300 },
    { field: 'waitTime', headerName: 'Wait Time', width: 100 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      renderCell: (params) => (
        <Box>
          <Button
            size="small"
            variant="contained"
            onClick={() => setSelectedRequest(params.row)}
          >
            Review
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Patient Triage Queue
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6">{pendingRequests.length}</Typography>
            <Typography color="textSecondary">Pending Requests</Typography>
          </Card>
        </Grid>
      </Grid>

      <DataGrid
        rows={pendingRequests}
        columns={columns}
        pageSize={10}
        checkboxSelection={false}
        disableSelectionOnClick
        autoHeight
      />

      {/* Request Details Dialog */}
      {selectedRequest && (
        <TriageDialog
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onAssign={assignDoctor}
          onReject={rejectRequest}
        />
      )}
    </Box>
  );
};
```

### 18.4 Pharmacy Orders Dashboard

```typescript
// src/pages/pharmacy/OrdersDashboard.tsx
import React from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  Chip,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { usePharmacyStore } from '../../store/pharmacyStore';

export const OrdersDashboard: React.FC = () => {
  const { orders, updateOrderStatus } = usePharmacyStore();

  const columns: GridColDef[] = [
    { field: 'orderId', headerName: 'Order ID', width: 150 },
    { field: 'patientName', headerName: 'Patient', width: 150 },
    { field: 'doctor', headerName: 'Prescribing Doctor', width: 150 },
    {
      field: 'medications',
      headerName: 'Medications',
      width: 250,
      renderCell: (params) => params.value.join(', '),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={
            params.value === 'ready' ? 'success' :
            params.value === 'preparing' ? 'warning' : 'default'
          }
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 250,
      renderCell: (params) => (
        <Box>
          {params.row.status === 'pending' && (
            <Button
              size="small"
              onClick={() => updateOrderStatus(params.row.id, 'preparing')}
            >
              Start Preparing
            </Button>
          )}
          {params.row.status === 'preparing' && (
            <Button
              size="small"
              variant="contained"
              onClick={() => updateOrderStatus(params.row.id, 'ready')}
            >
              Mark Ready
            </Button>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Prescription Orders
      </Typography>

      <DataGrid
        rows={orders}
        columns={columns}
        pageSize={10}
        autoHeight
      />
    </Box>
  );
};
```

---

### 16.1 CI/CD Pipeline
- Automated builds on commit
- Automated testing
- Code quality checks
- Automated deployment to staging
- Manual approval for production

### 16.2 Environment Setup
- Development
- Staging (production-like)
- Production
- Separate databases for each environment

### 16.3 Monitoring & Alerting
- Application Performance Monitoring (APM)
- Error tracking (Sentry)
- Log aggregation (ELK or CloudWatch)
- Uptime monitoring
- Alert on critical errors

### 16.4 Backup & Disaster Recovery
- Daily automated database backups
- Backup retention: 30 days
- Point-in-time recovery capability
- Disaster recovery plan and testing

### 16.5 Mobile App Distribution
- iOS: TestFlight (beta), App Store (production)
- Android: Google Play Internal Testing (beta), Play Store (production)
- Version management and release notes

---

## Appendix A: Glossary

**Terms:**
- **Chief Complaint:** The primary reason for the consultation
- **Queue:** A waiting line of patients for a doctor
- **Triage:** Assessment of urgency/severity of condition
- **WebRTC:** Web Real-Time Communication for voice/video calls
- **JWT:** JSON Web Token for authentication
- **OTP:** One-Time Password for verification
- **CDN:** Content Delivery Network
- **HIPAA:** Health Insurance Portability and Accountability Act
- **GDPR:** General Data Protection Regulation
- **SLA:** Service Level Agreement

---

## Appendix B: Contact & Support

**Technical Support:**
- Email: support@healthconnect.com
- Phone: +233XXXXXXXXX
- Hours: 24/7

**Documentation:**
- Developer docs: https://docs.healthconnect.com
- API docs: https://api.healthconnect.com/docs
- User guides: https://help.healthconnect.com

---

**Document Version:** 1.0
**Last Updated:** November 5, 2025
**Prepared By:** HealthConnect Development Team