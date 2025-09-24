export const DEFAULT_TEST_CALL_DATA = {
  "data": {
    "status": "done",
    "user_id": "o3zdIqYwDYfKPw2KrSE2Tbi9kxX2",
    "agent_id": "agent_1601k5fak9jsfrzsk06455d9f98j",
    "analysis": {
      "call_successful": "success",
      "call_summary_title": "Schedule A/C Service",
      "transcript_summary": "The user called to schedule an A/C service. The agent collected the user's name, address, phone number, email, and the issue they were experiencing. An appointment was scheduled for Wednesday, September 24, 2025, from 10:30 a.m. to 11:30 a.m. The user provided a gate code. All details were confirmed before the call ended.\n",
      "data_collection_results": {
        "business_id": {
          "value": null,
          "rationale": "The business's ID is not mentioned in the conversation. Therefore, I cannot extract it.",
          "json_schema": {
            "enum": null,
            "type": "string",
            "description": "The business's ID",
            "constant_value": "",
            "dynamic_variable": ""
          },
          "data_collection_id": "business_id"
        },
        "phone_number": {
          "value": 9412584006,
          "rationale": "The phone number of the caller is mentioned as '9412584006' by the user at 2025-09-24T04:11:18+00:00.",
          "json_schema": {
            "enum": null,
            "type": "integer",
            "description": "The phone number of the caller",
            "constant_value": "",
            "dynamic_variable": ""
          },
          "data_collection_id": "phone_number"
        },
        "business_name": {
          "value": "Test A/C",
          "rationale": "The business's name is mentioned in the agent's first and last messages: \"Thanks for calling Test A/C.\" and \"Thank you for choosing Test A/C. Have a great day!\"",
          "json_schema": {
            "enum": null,
            "type": "string",
            "description": "The business's name.",
            "constant_value": "",
            "dynamic_variable": ""
          },
          "data_collection_id": "business_name"
        },
        "customer_name": {
          "value": "Ricky Charpentier",
          "rationale": "The customer's name is explicitly stated as 'Ricky Charpentier' in the conversation at 2025-09-24T04:10:54+00:00.",
          "json_schema": {
            "enum": null,
            "type": "string",
            "description": "The name of the customer who is calling",
            "constant_value": "",
            "dynamic_variable": ""
          },
          "data_collection_id": "customer_name"
        },
        "email_address": {
          "value": "head2dasky@gmail.com",
          "rationale": "The user provided their email address as head2dasky@gmail.com, which was confirmed by the agent at 2025-09-24T04:11:32+00:00.",
          "json_schema": {
            "enum": null,
            "type": "string",
            "description": "The caller's email address, if collected",
            "constant_value": "",
            "dynamic_variable": ""
          },
          "data_collection_id": "email_address"
        },
        "service_address": {
          "value": "5605 Trevesta Place, Palmetto, FL 34221",
          "rationale": "The user provides the address '5605 Trevesta Place, Palmetto, FL 34221' in their message at 2025-09-24T04:11:04+00:00, which is then confirmed by the agent at 2025-09-24T04:12:27+00:00.",
          "json_schema": {
            "enum": null,
            "type": "string",
            "description": "The address of the location where the service will be performed",
            "constant_value": "",
            "dynamic_variable": ""
          },
          "data_collection_id": "service_address"
        },
        "appointment_time": {
          "value": "Friday, September 26, 2025, from 10:30 a.m. to 11:30 a.m.",
          "rationale": "The agent confirms the appointment time with the user as 'Wednesday, September 24, 2025, from 10:30 a.m. to 11:30 a.m.' This is the date and time of the appointment.",
          "json_schema": {
            "enum": null,
            "type": "string",
            "description": "The date and time of the appointment, if one was scheduled",
            "constant_value": "",
            "dynamic_variable": ""
          },
          "data_collection_id": "appointment_time"
        },
        "appointment_scheduled": {
          "value": true,
          "rationale": "The user successfully scheduled an appointment for A/C service on Wednesday, September 24, 2025, from 10:30 a.m. to 11:30 a.m. The agent confirmed all the details with the user, and the user confirmed that all the information was correct.",
          "json_schema": {
            "enum": null,
            "type": "boolean",
            "description": "Whether or not the customer scheduled an appointment",
            "constant_value": "",
            "dynamic_variable": ""
          },
          "data_collection_id": "appointment_scheduled"
        }
      },
      "evaluation_criteria_results": {}
    }
  }
};