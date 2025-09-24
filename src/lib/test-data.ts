export const DEFAULT_TEST_CALL_DATA = {
  "data": {
    "status": "done",
    "user_id": "test_user_id",
    "agent_id": "test_agent",
    "analysis": {
      "call_successful": "success",
      "call_summary_title": "Test A/C Repair Appointment",
      "transcript_summary": "Test customer called to schedule an A/C repair appointment. The agent collected the customer's information and scheduled the appointment.",
      "data_collection_results": {
        "business_name": {
          "value": "Test A/C",
          "data_collection_id": "business_name"
        },
        "customer_name": {
          "value": "Test Customer",
          "data_collection_id": "customer_name"
        },
        "phone_number": {
          "value": "5551234567",
          "data_collection_id": "phone_number"
        },
        "email_address": {
          "value": "test@example.com",
          "data_collection_id": "email_address"
        },
        "service_address": {
          "value": "123 Test Street, Test City, FL 12345",
          "data_collection_id": "service_address"
        },
        "appointment_time": {
          "value": "Wednesday, September twenty-fourth, two thousand twenty-five, from ten thirty a.m. to eleven thirty a.m.",
          "data_collection_id": "appointment_time"
        },
        "appointment_scheduled": {
          "value": true,
          "data_collection_id": "appointment_scheduled"
        }
      }
    }
  }
};