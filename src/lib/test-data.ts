// Real call data from phone number 7278714862 - use this for manual testing
export const DEFAULT_TEST_CALL_DATA = {
  "data": {
    "agent_id": "agent_1601k5fak9jsfrzsk06455d9f98j",
    "analysis": {
      "call_successful": "success",
      "call_summary_title": "Schedule A/C Appointment",
      "data_collection_results": {
        "appointment_scheduled": {
          "data_collection_id": "appointment_scheduled",
          "json_schema": {
            "constant_value": "",
            "description": "Whether or not the customer scheduled an appointment",
            "dynamic_variable": "",
            "enum": null,
            "type": "boolean"
          },
          "rationale": "The user explicitly requested to schedule an appointment for a technician to come out and take a look at their A/C unit. The agent then proceeded to collect the necessary information and schedule the appointment for Friday, September 26th at 10 AM. The user confirmed all the details of the appointment, indicating that the appointment was successfully scheduled. Therefore, the value is true.",
          "value": true
        },
        "appointment_time": {
          "data_collection_id": "appointment_time",
          "json_schema": {
            "constant_value": "",
            "description": "The date and time of the appointment, if one was scheduled",
            "dynamic_variable": "",
            "enum": null,
            "type": "string"
          },
          "rationale": "The user scheduled an appointment for Friday, September twenty-sixth, at ten in the morning. This information is extracted from the agent's confirmation message at 2025-09-24T15:40:20+00:00.",
          "value": "2025-09-24T12:17:40-04:00"
        },
        "business_id": {
          "data_collection_id": "business_id",
          "json_schema": {
            "constant_value": "",
            "description": "The business's ID",
            "dynamic_variable": "",
            "enum": null,
            "type": "string"
          },
          "rationale": "The business's ID is not mentioned in the conversation. The name of the business is 'Test A/C', but not its ID.",
          "value": "5a8a338e-d401-4a14-a109-6974859ce5b8"
        },
        "business_name": {
          "data_collection_id": "business_name",
          "json_schema": {
            "constant_value": "",
            "description": "The business's name.",
            "dynamic_variable": "",
            "enum": null,
            "type": "string"
          },
          "rationale": "The business's name is mentioned in the first line of the conversation: \"Thanks for calling Test A/C.\"",
          "value": "Test A/C"
        },
        "customer_name": {
          "data_collection_id": "customer_name",
          "json_schema": {
            "constant_value": "",
            "description": "The name of the customer who is calling",
            "dynamic_variable": "",
            "enum": null,
            "type": "string"
          },
          "rationale": "The customer's full name is requested by the agent and provided by the user as 'Ricky Charpentier'.",
          "value": "Ricky Charpentier"
        },
        "email_address": {
          "data_collection_id": "email_address",
          "json_schema": {
            "constant_value": "",
            "description": "The caller's email address, if collected",
            "dynamic_variable": "",
            "enum": null,
            "type": "string"
          },
          "rationale": "The user provided their email address as head2dasky@gmail.com, which was confirmed by the agent.",
          "value": "head2dasky@gmail.com"
        },
        "phone_number": {
          "data_collection_id": "phone_number",
          "json_schema": {
            "constant_value": "",
            "description": "The phone number of the caller",
            "dynamic_variable": "",
            "enum": null,
            "type": "integer"
          },
          "rationale": "The user provided their phone number as '7278714862' in the conversation. This is a ten-digit number, so it can be extracted as the phone number of the caller.",
          "value": 7278714862
        },
        "service_address": {
          "data_collection_id": "service_address",
          "json_schema": {
            "constant_value": "",
            "description": "The address of the location where the service will be performed",
            "dynamic_variable": "",
            "enum": null,
            "type": "string"
          },
          "rationale": "The user provided the address '5605 Trevesta Place, Palmetto, FL 34221' in their message at 2025-09-24T15:39:13+00:00, which was then confirmed by the agent and the user.",
          "value": "5605 Trevesta Place, Palmetto, FL 34221"
        }
      },
      "evaluation_criteria_results": {},
      "transcript_summary": "The user called to schedule an A/C repair appointment. The agent collected the user's name, address, phone number, and email. An appointment was scheduled for Friday, September 26th at 10 AM. The user provided a gate code for the technician. All details were confirmed with the user before ending the call."
    },
    "transcript": [
      {
        "role": "agent",
        "message": "Thanks for calling Test A/C. My name is Sarah. How can I help you today?"
      },
      {
        "role": "user", 
        "message": "Hi, I need to schedule an appointment to have someone come take a look at my A/C unit."
      },
      {
        "role": "agent",
        "message": "I'd be happy to help you schedule an appointment for an A/C technician. Let me get some information from you. Can I get your full name please?"
      },
      {
        "role": "user",
        "message": "Ricky Charpentier"
      },
      {
        "role": "agent",
        "message": "Thank you Ricky. Can I get your phone number?"
      },
      {
        "role": "user",
        "message": "7278714862"
      },
      {
        "role": "agent",
        "message": "Perfect. And what's the address where you need the A/C service?"
      },
      {
        "role": "user",
        "message": "5605 Trevesta Place, Palmetto, FL 34221"
      },
      {
        "role": "agent",
        "message": "Got it. Can I also get your email address for our records?"
      },
      {
        "role": "user",
        "message": "head2dasky@gmail.com"
      },
      {
        "role": "agent",
        "message": "Perfect. I have Friday, September twenty-sixth available at ten in the morning. Would that work for you?"
      },
      {
        "role": "user",
        "message": "Yes, that sounds perfect."
      },
      {
        "role": "agent",
        "message": "Excellent! So to confirm, I have you scheduled for Friday, September twenty-sixth, at ten in the morning at 5605 Trevesta Place, Palmetto, FL 34221. The technician will call you at 7278714862 about thirty minutes before arrival. Is there anything else you need help with today?"
      },
      {
        "role": "user",
        "message": "No, that's everything. Thank you!"
      },
      {
        "role": "agent",
        "message": "You're welcome Ricky! Have a great day and we'll see you Friday morning."
      }
    ]
  }
};