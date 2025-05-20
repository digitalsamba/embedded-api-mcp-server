/**
 * Webhook Testing Script
 * 
 * A simple utility to test webhook functionality by sending simulated webhook events
 * to the Digital Samba MCP Server's webhook endpoint.
 */
import fetch from 'node-fetch';
import crypto from 'crypto';
import { WebhookEventType } from '../src/webhooks.js';

// Configuration
const DEFAULT_WEBHOOK_URL = 'http://localhost:3000/webhooks/digitalsamba';
const DEFAULT_WEBHOOK_SECRET = '';  // No secret by default

// Get configuration from command-line arguments
const args = process.argv.slice(2);
const webhookUrl = args[0] || DEFAULT_WEBHOOK_URL;
const webhookSecret = args[1] || DEFAULT_WEBHOOK_SECRET;

// Generate a test event
function generateTestEvent(eventType) {
  const now = new Date().toISOString();
  const payload = {
    event: eventType,
    timestamp: now,
    data: {}
  };
  
  // Add specific data based on event type
  switch (eventType) {
    case WebhookEventType.ROOM_CREATED:
    case WebhookEventType.ROOM_UPDATED:
    case WebhookEventType.ROOM_DELETED:
      payload.data = {
        id: 'room-' + crypto.randomUUID().substring(0, 8),
        name: 'Test Room',
        description: 'This is a test room event',
        friendly_url: 'test-room',
        privacy: 'public',
        max_participants: 100,
        created_at: now,
        updated_at: now
      };
      break;
      
    case WebhookEventType.PARTICIPANT_JOINED:
    case WebhookEventType.PARTICIPANT_LEFT:
      payload.data = {
        id: 'participant-' + crypto.randomUUID().substring(0, 8),
        session_id: 'session-' + crypto.randomUUID().substring(0, 8),
        room_id: 'room-' + crypto.randomUUID().substring(0, 8),
        name: 'Test Participant',
        role: 'attendee',
        join_time: now,
        leave_time: eventType === WebhookEventType.PARTICIPANT_LEFT ? now : undefined,
        live: eventType === WebhookEventType.PARTICIPANT_JOINED
      };
      break;
      
    case WebhookEventType.SESSION_STARTED:
    case WebhookEventType.SESSION_ENDED:
      payload.data = {
        id: 'session-' + crypto.randomUUID().substring(0, 8),
        room_id: 'room-' + crypto.randomUUID().substring(0, 8),
        start_time: now,
        end_time: eventType === WebhookEventType.SESSION_ENDED ? now : undefined,
        participants_live: eventType === WebhookEventType.SESSION_STARTED ? 1 : 0,
        participants_total: 1,
        participants_max: 1,
        live: eventType === WebhookEventType.SESSION_STARTED
      };
      break;
      
    case WebhookEventType.RECORDING_STARTED:
    case WebhookEventType.RECORDING_STOPPED:
    case WebhookEventType.RECORDING_READY:
      payload.data = {
        id: 'recording-' + crypto.randomUUID().substring(0, 8),
        room_id: 'room-' + crypto.randomUUID().substring(0, 8),
        session_id: 'session-' + crypto.randomUUID().substring(0, 8),
        status: eventType === WebhookEventType.RECORDING_READY 
          ? 'READY' 
          : (eventType === WebhookEventType.RECORDING_STARTED ? 'IN_PROGRESS' : 'PENDING_CONVERSION'),
        created_at: now,
        updated_at: now
      };
      break;
      
    case WebhookEventType.CHAT_MESSAGE:
      payload.data = {
        id: 'message-' + crypto.randomUUID().substring(0, 8),
        room_id: 'room-' + crypto.randomUUID().substring(0, 8),
        participant_id: 'participant-' + crypto.randomUUID().substring(0, 8),
        participant_name: 'Test Participant',
        message: 'This is a test chat message',
        created_at: now
      };
      break;
      
    case WebhookEventType.POLL_CREATED:
    case WebhookEventType.POLL_UPDATED:
    case WebhookEventType.POLL_DELETED:
      payload.data = {
        id: 'poll-' + crypto.randomUUID().substring(0, 8),
        room_id: 'room-' + crypto.randomUUID().substring(0, 8),
        question: 'This is a test poll question?',
        status: 'OPEN',
        multiple: false,
        anonymous: false,
        options: [
          { id: 'option-1', text: 'Option 1' },
          { id: 'option-2', text: 'Option 2' }
        ],
        created_at: now
      };
      break;
      
    case WebhookEventType.QUESTION_ASKED:
    case WebhookEventType.QUESTION_ANSWERED:
      payload.data = {
        id: 'question-' + crypto.randomUUID().substring(0, 8),
        room_id: 'room-' + crypto.randomUUID().substring(0, 8),
        participant_id: 'participant-' + crypto.randomUUID().substring(0, 8),
        participant_name: 'Test Participant',
        question: 'This is a test question?',
        created_at: now,
        answers: eventType === WebhookEventType.QUESTION_ANSWERED ? [
          {
            id: 'answer-' + crypto.randomUUID().substring(0, 8),
            participant_id: 'participant-' + crypto.randomUUID().substring(0, 8),
            participant_name: 'Test Answerer',
            answer: 'This is a test answer',
            created_at: now
          }
        ] : []
      };
      break;
      
    default:
      // Generic test data for other event types
      payload.data = {
        id: 'event-' + crypto.randomUUID().substring(0, 8),
        name: 'Test Event',
        event_type: eventType,
        created_at: now
      };
  }
  
  return payload;
}

// Sign payload if webhook secret is provided
function signPayload(payload, secret) {
  if (!secret) {
    return null;
  }
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}

// Send webhook event
async function sendWebhookEvent(eventType, url, secret) {
  try {
    const payload = generateTestEvent(eventType);
    const payloadString = JSON.stringify(payload);
    const signature = signPayload(payload, secret);
    
    console.log(`Sending ${eventType} event to ${url}`);
    console.log(`Payload: ${payloadString}`);
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (signature) {
      console.log(`Signature: ${signature}`);
      headers['X-DigitalSamba-Signature'] = signature;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: payloadString
    });
    
    console.log(`Response status: ${response.status}`);
    const responseText = await response.text();
    console.log(`Response body: ${responseText}`);
    
    return {
      status: response.status,
      body: responseText
    };
  } catch (error) {
    console.error(`Error sending webhook event: ${error.message}`);
    return {
      status: 500,
      body: error.message
    };
  }
}

// Choose a random event type or use one provided as an argument
function getEventType() {
  const eventArg = args[2];
  
  if (eventArg && Object.values(WebhookEventType).includes(eventArg)) {
    return eventArg;
  }
  
  const eventTypes = Object.values(WebhookEventType);
  const randomIndex = Math.floor(Math.random() * eventTypes.length);
  return eventTypes[randomIndex];
}

// Main function
async function main() {
  console.log('Digital Samba MCP Server - Webhook Test Tool');
  console.log('===========================================');
  console.log(`Webhook URL: ${webhookUrl}`);
  console.log(`Webhook Secret: ${webhookSecret ? '(configured)' : '(none)'}`);
  
  // Send the webhook event
  const eventType = getEventType();
  await sendWebhookEvent(eventType, webhookUrl, webhookSecret);
}

// Run the test
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});