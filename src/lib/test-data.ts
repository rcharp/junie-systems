export const DEFAULT_TEST_CALL_DATA = {
  "data": {
    "business_id": {
          "value": null,
          "rationale": "The business's ID is not mentioned in the conversation. The name of the business is 'Test A/C', but not its ID.",
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
          "value": 7278714862,
          "rationale": "The user provided their phone number as '7278714862' in the conversation. This is a ten-digit number, so it can be extracted as the phone number of the caller.",
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
          "rationale": "The business's name is mentioned in the first line of the conversation: \"Thanks for calling Test A/C.\"",
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
          "rationale": "The customer's full name is requested by the agent and provided by the user as 'Ricky Charpentier'.",
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
          "rationale": "The user provided their email address as head2dasky@gmail.com, which was confirmed by the agent.",
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
          "rationale": "The user provided the address '5605 Trevesta Place, Palmetto, FL 34221' in their message at 2025-09-24T15:39:13+00:00, which was then confirmed by the agent and the user.",
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
          "value": "Friday, September twenty-sixth, at ten in the morning",
          "rationale": "The user scheduled an appointment for Friday, September twenty-sixth, at ten in the morning. This information is extracted from the agent's confirmation message at 2025-09-24T15:40:20+00:00.",
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
          "rationale": "The user explicitly requested to schedule an appointment for a technician to come out and take a look at their A/C unit. The agent then proceeded to collect the necessary information and schedule the appointment for Friday, September 26th at 10 AM. The user confirmed all the details of the appointment, indicating that the appointment was successfully scheduled. Therefore, the value is true.",
          "json_schema": {
            "enum": null,
            "type": "boolean",
            "description": "Whether or not the customer scheduled an appointment",
            "constant_value": "",
            "dynamic_variable": ""
          },
          "data_collection_id": "appointment_scheduled"
        }
  }
};