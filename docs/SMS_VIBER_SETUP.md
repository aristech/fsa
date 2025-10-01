# SMS/Viber Service Reminders Setup Guide

This guide explains how to configure and use the SMS/Viber service reminder feature using Yuboto OMNI API.

## Features

- 📱 **SMS & Viber Support**: Send reminders via SMS or Viber with automatic fallback
- 🎯 **Personalized Messages**: Template-based messages with client/service information
- 📞 **Phone Validation**: Automatic phone number validation and formatting
- 🔄 **Work Order Integration**: Messages tied to specific work orders and clients
- ⚙️ **Automated Processing**: Scheduled processing via cron jobs
- 📊 **Delivery Tracking**: Monitor message delivery status

## Prerequisites

1. **Yuboto Account**: Sign up at [https://octapush.yuboto.com](https://octapush.yuboto.com)
2. **API Key**: Obtain your OMNI API key from the Developers section
3. **Account Balance**: Top up your account for message sending

## Environment Configuration

Add the following environment variables to your `.env` file:

```bash
# SMS/Viber Service Configuration
SMS_REMINDERS_ENABLED=true
YUBOTO_API_KEY=your_yuboto_api_key_here
YUBOTO_SENDER=FSA
YUBOTO_PRIORITY=viber
YUBOTO_FALLBACK_SMS=true

# Company Information (used in message templates)
COMPANY_NAME="Field Service Automation"
COMPANY_PHONE="+30-210-123-4567"
COMPANY_EMAIL="support@yourcompany.com"

# Custom Message Templates (optional)
SMS_TEMPLATE_MONTHLY="Hello {{contactPerson.name}}, this is a reminder that your {{service.type}} service for {{client.company}} is due on {{service.nextDue}}. Please schedule an appointment. Contact us: {{company.phone}}"

SMS_TEMPLATE_YEARLY="Dear {{contactPerson.name}}, your annual {{service.type}} service is due for {{client.company}}. Schedule now to ensure compliance. Call: {{company.phone}}"

SMS_TEMPLATE_CUSTOM="Hi {{contactPerson.name}}, time for your {{service.type}} service at {{client.company}}. {{service.description}} Contact: {{company.phone}}"

SMS_TEMPLATE_URGENT="URGENT: {{contactPerson.name}}, {{service.type}} service overdue for {{client.company}}. Please schedule immediately: {{company.phone}}"
```

### Configuration Options

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SMS_REMINDERS_ENABLED` | Enable/disable SMS reminders | `false` | Yes |
| `YUBOTO_API_KEY` | Your Yuboto OMNI API key | - | Yes |
| `YUBOTO_SENDER` | Sender name (up to 11 characters) | `FSA` | No |
| `YUBOTO_PRIORITY` | Channel priority: `viber` or `sms` | `viber` | No |
| `YUBOTO_FALLBACK_SMS` | Fallback to SMS if Viber fails | `true` | No |
| `COMPANY_NAME` | Your company name for messages | `Field Service Automation` | No |
| `COMPANY_PHONE` | Your company phone number | `+1-800-FSA-HELP` | No |
| `COMPANY_EMAIL` | Your company email | `support@fsa.com` | No |

## Message Templates

### Available Variables

You can use the following variables in your message templates:

#### Client Information
- `{{client.name}}` - Client name
- `{{client.company}}` - Client company name
- `{{client.phone}}` - Client phone number
- `{{client.email}}` - Client email

#### Contact Person
- `{{contactPerson.name}}` - Contact person name
- `{{contactPerson.phone}}` - Contact person phone
- `{{contactPerson.email}}` - Contact person email

#### Service Information
- `{{service.type}}` - Service type (e.g., "Monthly Service", "Annual Inspection")
- `{{service.description}}` - Service description
- `{{service.nextDue}}` - Next service due date (formatted)

#### Work Order
- `{{workOrder.title}}` - Work order title
- `{{workOrder.workOrderNumber}}` - Work order number

#### Task Information
- `{{task.title}}` - Task title
- `{{task.description}}` - Task description
- `{{task.dueDate}}` - Task due date (formatted)

#### Company Information
- `{{company.name}}` - Your company name
- `{{company.phone}}` - Your company phone
- `{{company.email}}` - Your company email

### Template Examples

#### Monthly Service Reminder
```
Hello {{contactPerson.name}}, this is a reminder that your {{service.type}} service for {{client.company}} is due on {{service.nextDue}}. Please schedule an appointment. Contact us: {{company.phone}}
```

#### Urgent Reminder
```
URGENT: {{contactPerson.name}}, {{service.type}} service overdue for {{client.company}}. Please schedule immediately: {{company.phone}}
```

## API Endpoints

### Process Pending Reminders
```bash
POST /api/v1/sms-reminders/process
```
Processes all pending SMS/Viber reminders (used by cron job).

### Send Specific Task Reminder
```bash
POST /api/v1/sms-reminders/send/:taskId
Content-Type: application/json

{
  "templateType": "monthly" // monthly, yearly, custom, urgent
}
```

### Test SMS Service
```bash
POST /api/v1/sms-reminders/test
Content-Type: application/json

{
  "phoneNumber": "+30-693-123-4567",
  "message": "Test message from FSA"
}
```

### Get Service Status
```bash
GET /api/v1/sms-reminders/status
```
Returns service configuration and Yuboto account status.

### Preview Message
```bash
POST /api/v1/sms-reminders/preview
Content-Type: application/json

{
  "template": "Hello {{contactPerson.name}}, your service is due!",
  "taskId": "task_id_here"
}
```

### Get Pending Tasks
```bash
GET /api/v1/sms-reminders/pending
```
Returns tasks eligible for SMS reminders (have valid phone numbers).

## Phone Number Requirements

For clients to receive SMS/Viber reminders, they must have:

1. **Valid phone number** in international format (e.g., `+30-693-123-4567`)
2. **Contact Person phone** (priority) OR **Client phone** (fallback)

### Phone Number Validation

The system automatically:
- Validates phone number format
- Converts to international format
- Assumes Greek numbers (+30) if no country code
- Filters out clients without valid phone numbers

### Supported Formats
- `+30-693-123-4567` ✅
- `+306931234567` ✅
- `693-123-4567` ✅ (assumes Greek)
- `6931234567` ✅ (assumes Greek)
- `123-456` ❌ (too short)
- `invalid` ❌ (not a number)

## Automated Processing

The system automatically processes SMS reminders every 30 minutes via the cron script:

```bash
# Add to crontab
*/30 * * * * /path/to/process-scheduled-tasks.sh
```

The updated script now includes:
1. Email reminders
2. **SMS/Viber reminders** (new)
3. Recurring task creation

## Testing the Setup

1. **Verify Configuration**:
   ```bash
   curl http://localhost:3001/api/v1/sms-reminders/status
   ```

2. **Send Test Message**:
   ```bash
   curl -X POST http://localhost:3001/api/v1/sms-reminders/test \
     -H "Content-Type: application/json" \
     -d '{"phoneNumber": "+30-693-123-4567", "message": "Test from FSA"}'
   ```

3. **Check Pending Tasks**:
   ```bash
   curl http://localhost:3001/api/v1/sms-reminders/pending
   ```

## Troubleshooting

### Common Issues

1. **"SMS reminders not configured"**
   - Check `SMS_REMINDERS_ENABLED=true`
   - Verify `YUBOTO_API_KEY` is set

2. **"Invalid phone number format"**
   - Ensure phone numbers are in international format
   - Check client and contact person phone fields

3. **"No phone number available"**
   - Client has no phone number
   - Contact person has no phone number
   - Add phone numbers to client or contact person

4. **Messages not sending**
   - Check Yuboto account balance
   - Verify API key is correct
   - Check service status endpoint

### Logs

Monitor the application logs for SMS processing:
```bash
# Docker logs
docker logs fsa-backend

# PM2 logs
pm2 logs backend
```

## Message Costs

- **SMS**: ~0.05 EUR per message
- **Viber**: ~0.035 EUR per message
- **Fallback**: Viber → SMS (if Viber fails)

Check your Yuboto account balance regularly and top up as needed.

## Security Considerations

1. **API Key Protection**: Keep your Yuboto API key secure
2. **Phone Number Privacy**: Ensure compliance with local privacy laws
3. **Message Content**: Avoid sensitive information in messages
4. **Rate Limiting**: The system includes built-in delays to respect API limits

## Support

For technical issues:
- **Yuboto Support**: support@yuboto.com
- **Sales Questions**: sales@yuboto.com
- **Phone**: +30 211 11 44 111 (9 AM - 6 PM, weekdays)

## Example Client Setup

For SMS reminders to work, ensure your clients have proper phone numbers:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+30-693-123-4567",
  "company": "Example Corp",
  "contactPerson": {
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+30-694-567-8901"
  }
}
```

The system will use Jane's phone number (contact person) first, then fall back to John's phone number if needed.