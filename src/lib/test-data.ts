export const DEFAULT_TEST_CALL_DATA = {
  "data": {
    "status": "done",
    "user_id": "o3zdIqYwDYfKPw2KrSE2Tbi9kxX2",
    "agent_id": "agent_1601k5fak9jsfrzsk06455d9f98j",
    "analysis": {
      "call_successful": "success",
      "call_summary_title": "Schedule A/C Appointment",
      "transcript_summary": "The user called to schedule an A/C repair appointment. The agent collected the user's name, address, phone number, and email. An appointment was scheduled for Friday, September 26th at 10 AM. The user provided a gate code for the technician. All details were confirmed with the user before ending the call.\n",
      "data_collection_results": {
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
      },
      "evaluation_criteria_results": {}
    },
    "metadata": {
      "cost": 567,
      "error": null,
      "charging": {
        "tier": "creator",
        "is_burst": false,
        "llm_price": 0.08489500000000001,
        "llm_usage": {
          "initiated_generation": {
            "model_usage": {
              "gpt-4o": {
                "input": {
                  "price": 0.044745,
                  "tokens": 17898
                },
                "output_total": {
                  "price": 0.00543,
                  "tokens": 543
                },
                "input_cache_read": {
                  "price": 0.03472,
                  "tokens": 27776
                },
                "input_cache_write": {
                  "price": 0,
                  "tokens": 0
                }
              }
            }
          },
          "irreversible_generation": {
            "model_usage": {
              "gpt-4o": {
                "input": {
                  "price": 0.044745,
                  "tokens": 17898
                },
                "output_total": {
                  "price": 0.00543,
                  "tokens": 543
                },
                "input_cache_read": {
                  "price": 0.03472,
                  "tokens": 27776
                },
                "input_cache_write": {
                  "price": 0,
                  "tokens": 0
                }
              }
            }
          }
        },
        "llm_charge": 385,
        "call_charge": 182,
        "dev_discount": true,
        "free_minutes_consumed": 0,
        "free_llm_dollars_consumed": 0
      },
      "feedback": {
        "likes": 0,
        "dislikes": 0,
        "overall_score": null
      },
      "timezone": null,
      "rag_usage": null,
      "text_only": true,
      "batch_call": null,
      "phone_call": null,
      "initiator_id": "o3zdIqYwDYfKPw2KrSE2Tbi9kxX2",
      "main_language": "en",
      "features_usage": {
        "workflow": {
          "enabled": true,
          "tool_node": {
            "used": true,
            "enabled": false
          }
        },
        "dtmf_tones": {
          "used": false,
          "enabled": false
        },
        "is_livekit": false,
        "multivoice": {
          "used": false,
          "enabled": false
        },
        "agent_testing": {
          "enabled": false,
          "tests_ran_in_last_7_days": false,
          "tests_ran_after_last_modification": false
        },
        "pii_zrm_agent": false,
        "pii_zrm_workspace": false,
        "transfer_to_agent": {
          "used": false,
          "enabled": false
        },
        "language_detection": {
          "used": false,
          "enabled": true
        },
        "transfer_to_number": {
          "used": false,
          "enabled": false
        },
        "voicemail_detection": {
          "used": false,
          "enabled": false
        },
        "external_mcp_servers": {
          "used": false,
          "enabled": false
        },
        "tool_dynamic_variable_updates": {
          "used": false,
          "enabled": false
        }
      },
      "eleven_assistant": {
        "is_eleven_assistant": false
      },
      "deletion_settings": {
        "delete_audio": false,
        "deletion_time_unix_secs": null,
        "delete_transcript_and_pii": false,
        "deleted_logs_at_time_unix_secs": null,
        "deleted_audio_at_time_unix_secs": null,
        "deleted_transcript_at_time_unix_secs": null
      },
      "call_duration_secs": 133,
      "termination_reason": "end_call tool was called.",
      "authorization_method": "authorization_header",
      "start_time_unix_secs": 1758728314,
      "accepted_time_unix_secs": 1758728314,
      "conversation_initiation_source": "react_sdk",
      "conversation_initiation_source_version": "0.5.0"
    },
    "transcript": [
      {
        "role": "agent",
        "message": "Thanks for calling Test A/C. How can I help you today?",
        "feedback": null,
        "llm_usage": null,
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": null,
        "agent_metadata": {
          "agent_id": "agent_1601k5fak9jsfrzsk06455d9f98j",
          "workflow_node_id": "node_main_routing"
        },
        "original_message": null,
        "time_in_call_secs": 0,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": null
      },
      {
        "role": "user",
        "message": "hi, my a/c isn't working, can i schedule an appointment for a technician to come out and take a look at it?",
        "feedback": null,
        "llm_usage": null,
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": "text",
        "agent_metadata": null,
        "original_message": null,
        "time_in_call_secs": 0,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": null
      },
      {
        "role": "agent",
        "message": null,
        "feedback": null,
        "llm_usage": null,
        "tool_calls": [
          {
            "type": "workflow",
            "tool_name": "notify_condition_4_met",
            "request_id": "call_nzbY3YGwmOb2mkfBuE9OGsP0",
            "tool_details": null,
            "params_as_json": "{}",
            "tool_has_been_called": true
          }
        ],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": null,
        "agent_metadata": {
          "agent_id": "agent_1601k5fak9jsfrzsk06455d9f98j",
          "workflow_node_id": "node_main_routing"
        },
        "original_message": null,
        "time_in_call_secs": 26,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": {
          "metrics": {
            "convai_llm_service_ttfb": {
              "elapsed_time": 2.5373468350007897
            },
            "convai_llm_tool_request_generation_latency": {
              "elapsed_time": 2.5386010560032446
            }
          }
        }
      },
      {
        "role": "agent",
        "message": null,
        "feedback": null,
        "llm_usage": null,
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [
          {
            "type": "workflow",
            "result": {
              "steps": [
                {
                  "type": "nested_tools",
                  "node_id": "node_appointment_scheduling",
                  "results": [
                    {
                      "type": "system",
                      "result": {
                        "status": "success",
                        "delay_ms": 0,
                        "to_agent": "node_appointment_scheduling",
                        "condition": "",
                        "from_agent": "agent_1601k5fak9jsfrzsk06455d9f98j",
                        "result_type": "transfer_to_agent_success",
                        "transfer_message": null,
                        "enable_transferred_agent_first_message": false
                      },
                      "is_error": false,
                      "tool_name": "transfer_to_agent",
                      "request_id": "tlcal_2001k5y61kh9e80tbn6ckcstj0fz",
                      "result_value": "{\"result_type\":\"transfer_to_agent_success\",\"status\":\"success\",\"from_agent\":\"agent_1601k5fak9jsfrzsk06455d9f98j\",\"to_agent\":\"node_appointment_scheduling\",\"condition\":\"\",\"delay_ms\":0,\"transfer_message\":null,\"enable_transferred_agent_first_message\":false}",
                      "tool_latency_secs": 0.00010347799980081618,
                      "tool_has_been_called": true,
                      "dynamic_variable_updates": []
                    }
                  ],
                  "requests": [
                    {
                      "type": "system",
                      "tool_name": "transfer_to_agent",
                      "request_id": "tlcal_2001k5y61kh9e80tbn6ckcstj0fz",
                      "tool_details": null,
                      "params_as_json": "{\"reason\": \"Transferring to agent as part of a workflow route.\", \"agent_number\": 0}",
                      "tool_has_been_called": false
                    }
                  ],
                  "is_successful": true,
                  "step_latency_secs": 0.004701588994066697
                }
              ]
            },
            "is_error": false,
            "tool_name": "notify_condition_4_met",
            "request_id": "call_nzbY3YGwmOb2mkfBuE9OGsP0",
            "result_value": "{\"steps\":[{\"step_latency_secs\":0.004701588994066697,\"type\":\"nested_tools\",\"node_id\":\"node_appointment_scheduling\",\"requests\":[{\"type\":\"system\",\"request_id\":\"tlcal_2001k5y61kh9e80tbn6ckcstj0fz\",\"tool_name\":\"transfer_to_agent\",\"params_as_json\":\"{\\\"reason\\\": \\\"Transferring to agent as part of a workflow route.\\\", \\\"agent_number\\\": 0}\",\"tool_has_been_called\":false,\"tool_details\":null}],\"results\":[{\"request_id\":\"tlcal_2001k5y61kh9e80tbn6ckcstj0fz\",\"tool_name\":\"transfer_to_agent\",\"result_value\":\"{\\\"result_type\\\":\\\"transfer_to_agent_success\\\",\\\"status\\\":\\\"success\\\",\\\"from_agent\\\":\\\"agent_1601k5fak9jsfrzsk06455d9f98j\\\",\\\"to_agent\\\":\\\"node_appointment_scheduling\\\",\\\"condition\\\":\\\"\\\",\\\"delay_ms\\\":0,\\\"transfer_message\\\":null,\\\"enable_transferred_agent_first_message\\\":false}\",\"is_error\":false,\"tool_has_been_called\":true,\"tool_latency_secs\":0.00010347799980081618,\"dynamic_variable_updates\":[],\"type\":\"system\",\"result\":{\"result_type\":\"transfer_to_agent_success\",\"status\":\"success\",\"from_agent\":\"agent_1601k5fak9jsfrzsk06455d9f98j\",\"to_agent\":\"node_appointment_scheduling\",\"condition\":\"\",\"delay_ms\":0,\"transfer_message\":null,\"enable_transferred_agent_first_message\":false}}],\"is_successful\":true}]}",
            "tool_latency_secs": 0.004924897999444511,
            "tool_has_been_called": true,
            "dynamic_variable_updates": []
          }
        ],
        "source_medium": null,
        "agent_metadata": {
          "agent_id": "agent_1601k5fak9jsfrzsk06455d9f98j",
          "workflow_node_id": "node_main_routing"
        },
        "original_message": null,
        "time_in_call_secs": 26,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": null
      },
      {
        "role": "agent",
        "message": "Sure thing, I'll get someone out to take a look at that for you. May I have your full name, please?",
        "feedback": null,
        "llm_usage": {
          "model_usage": {
            "gpt-4o": {
              "input": {
                "price": 0.012045,
                "tokens": 4818
              },
              "output_total": {
                "price": 0.00038999999999999994,
                "tokens": 39
              },
              "input_cache_read": {
                "price": 0,
                "tokens": 0
              },
              "input_cache_write": {
                "price": 0,
                "tokens": 0
              }
            }
          }
        },
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": null,
        "agent_metadata": {
          "agent_id": "agent_1601k5fak9jsfrzsk06455d9f98j",
          "workflow_node_id": "node_appointment_scheduling"
        },
        "original_message": null,
        "time_in_call_secs": 26,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": {
          "metrics": {
            "convai_llm_service_ttfb": {
              "elapsed_time": 1.2794262919996982
            },
            "convai_llm_service_ttf_sentence": {
              "elapsed_time": 1.8166668740013847
            },
            "convai_llm_service_tt_last_sentence": {
              "elapsed_time": 2.2806561830002465
            }
          }
        }
      },
      {
        "role": "user",
        "message": "Ricky Charpentier",
        "feedback": null,
        "llm_usage": null,
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": "text",
        "agent_metadata": null,
        "original_message": null,
        "time_in_call_secs": 26,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": null
      },
      {
        "role": "agent",
        "message": "Thank you, Ricky. Let me spell that back to you: R-I-C-K-Y C-H-A-R-P-E-N-T-I-E-R. Is that correct?",
        "feedback": null,
        "llm_usage": {
          "model_usage": {
            "gpt-4o": {
              "input": {
                "price": 0.0000825,
                "tokens": 33
              },
              "output_total": {
                "price": 0.00035,
                "tokens": 35
              },
              "input_cache_read": {
                "price": 0.00384,
                "tokens": 3072
              },
              "input_cache_write": {
                "price": 0,
                "tokens": 0
              }
            }
          }
        },
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": null,
        "agent_metadata": {
          "agent_id": "agent_1601k5fak9jsfrzsk06455d9f98j",
          "workflow_node_id": "node_appointment_scheduling"
        },
        "original_message": null,
        "time_in_call_secs": 34,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": {
          "metrics": {
            "convai_llm_service_ttfb": {
              "elapsed_time": 0.6003040029972908
            },
            "convai_llm_service_ttf_sentence": {
              "elapsed_time": 0.7139818459982052
            },
            "convai_llm_service_tt_last_sentence": {
              "elapsed_time": 2.5298362959947553
            }
          }
        }
      },
      {
        "role": "user",
        "message": "yes",
        "feedback": null,
        "llm_usage": null,
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": "text",
        "agent_metadata": null,
        "original_message": null,
        "time_in_call_secs": 34,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": null
      },
      {
        "role": "agent",
        "message": "Great! What's the address where you need the service?",
        "feedback": null,
        "llm_usage": {
          "model_usage": {
            "gpt-4o": {
              "input": {
                "price": 0.00019,
                "tokens": 76
              },
              "output_total": {
                "price": 0.00012,
                "tokens": 12
              },
              "input_cache_read": {
                "price": 0.00384,
                "tokens": 3072
              },
              "input_cache_write": {
                "price": 0,
                "tokens": 0
              }
            }
          }
        },
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": null,
        "agent_metadata": {
          "agent_id": "agent_1601k5fak9jsfrzsk06455d9f98j",
          "workflow_node_id": "node_appointment_scheduling"
        },
        "original_message": null,
        "time_in_call_secs": 39,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": {
          "metrics": {
            "convai_llm_service_ttfb": {
              "elapsed_time": 1.864124494997668
            },
            "convai_llm_service_ttf_sentence": {
              "elapsed_time": 1.8649287599982927
            },
            "convai_llm_service_tt_last_sentence": {
              "elapsed_time": 2.385272259998601
            }
          }
        }
      },
      {
        "role": "user",
        "message": "5605 Trevesta Place, Palmetto, FL 34221",
        "feedback": null,
        "llm_usage": null,
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": "text",
        "agent_metadata": null,
        "original_message": null,
        "time_in_call_secs": 39,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": null
      },
      {
        "role": "agent",
        "message": "Thank you. Just to confirm, the address is 5605 Trevesta Place, Palmetto, Florida 34221. Is that correct?",
        "feedback": null,
        "llm_usage": {
          "model_usage": {
            "gpt-4o": {
              "input": {
                "price": 0.000275,
                "tokens": 110
              },
              "output_total": {
                "price": 0.00032,
                "tokens": 32
              },
              "input_cache_read": {
                "price": 0.00384,
                "tokens": 3072
              },
              "input_cache_write": {
                "price": 0,
                "tokens": 0
              }
            }
          }
        },
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": null,
        "agent_metadata": {
          "agent_id": "agent_1601k5fak9jsfrzsk06455d9f98j",
          "workflow_node_id": "node_appointment_scheduling"
        },
        "original_message": null,
        "time_in_call_secs": 51,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": {
          "metrics": {
            "convai_llm_service_ttfb": {
              "elapsed_time": 0.6917269819969079
            },
            "convai_llm_service_ttf_sentence": {
              "elapsed_time": 0.7937224649940617
            },
            "convai_llm_service_tt_last_sentence": {
              "elapsed_time": 1.1526902159966994
            }
          }
        }
      },
      {
        "role": "user",
        "message": "yes",
        "feedback": null,
        "llm_usage": null,
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": "text",
        "agent_metadata": null,
        "original_message": null,
        "time_in_call_secs": 51,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": null
      },
      {
        "role": "agent",
        "message": "Perfect. Could you please provide your ten-digit phone number?",
        "feedback": null,
        "llm_usage": {
          "model_usage": {
            "gpt-4o": {
              "input": {
                "price": 0.008055,
                "tokens": 3222
              },
              "output_total": {
                "price": 0.00013,
                "tokens": 13
              },
              "input_cache_read": {
                "price": 0,
                "tokens": 0
              },
              "input_cache_write": {
                "price": 0,
                "tokens": 0
              }
            }
          }
        },
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": null,
        "agent_metadata": {
          "agent_id": "agent_1601k5fak9jsfrzsk06455d9f98j",
          "workflow_node_id": "node_appointment_scheduling"
        },
        "original_message": null,
        "time_in_call_secs": 53,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": {
          "metrics": {
            "convai_llm_service_ttfb": {
              "elapsed_time": 1.1716566280010738
            },
            "convai_llm_service_ttf_sentence": {
              "elapsed_time": 1.3781199820004986
            },
            "convai_llm_service_tt_last_sentence": {
              "elapsed_time": 2.0629376560027595
            }
          }
        }
      },
      {
        "role": "user",
        "message": "7278714862",
        "feedback": null,
        "llm_usage": null,
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": "text",
        "agent_metadata": null,
        "original_message": null,
        "time_in_call_secs": 53,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": null
      },
      {
        "role": "agent",
        "message": "Thank you. Let me repeat that back to you: seven two seven, eight seven one, four eight six two. Is that correct?",
        "feedback": null,
        "llm_usage": {
          "model_usage": {
            "gpt-4o": {
              "input": {
                "price": 0.008115,
                "tokens": 3246
              },
              "output_total": {
                "price": 0.00029,
                "tokens": 29
              },
              "input_cache_read": {
                "price": 0,
                "tokens": 0
              },
              "input_cache_write": {
                "price": 0,
                "tokens": 0
              }
            }
          }
        },
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": null,
        "agent_metadata": {
          "agent_id": "agent_1601k5fak9jsfrzsk06455d9f98j",
          "workflow_node_id": "node_appointment_scheduling"
        },
        "original_message": null,
        "time_in_call_secs": 65,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": {
          "metrics": {
            "convai_llm_service_ttfb": {
              "elapsed_time": 0.7182439289972535
            },
            "convai_llm_service_ttf_sentence": {
              "elapsed_time": 0.7820544979986153
            },
            "convai_llm_service_tt_last_sentence": {
              "elapsed_time": 1.5330437279990292
            }
          }
        }
      },
      {
        "role": "user",
        "message": "yes",
        "feedback": null,
        "llm_usage": null,
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": "text",
        "agent_metadata": null,
        "original_message": null,
        "time_in_call_secs": 65,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": null
      },
      {
        "role": "agent",
        "message": "Great! Could I have your email address, please?",
        "feedback": null,
        "llm_usage": {
          "model_usage": {
            "gpt-4o": {
              "input": {
                "price": 0.0002075,
                "tokens": 83
              },
              "output_total": {
                "price": 0.00012,
                "tokens": 12
              },
              "input_cache_read": {
                "price": 0.004,
                "tokens": 3200
              },
              "input_cache_write": {
                "price": 0,
                "tokens": 0
              }
            }
          }
        },
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": null,
        "agent_metadata": {
          "agent_id": "agent_1601k5fak9jsfrzsk06455d9f98j",
          "workflow_node_id": "node_appointment_scheduling"
        },
        "original_message": null,
        "time_in_call_secs": 69,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": {
          "metrics": {
            "convai_llm_service_ttfb": {
              "elapsed_time": 0.9280162400027621
            },
            "convai_llm_service_ttf_sentence": {
              "elapsed_time": 0.9288513029969181
            },
            "convai_llm_service_tt_last_sentence": {
              "elapsed_time": 1.1882023229991319
            }
          }
        }
      },
      {
        "role": "user",
        "message": "head2dasky@gmail.com",
        "feedback": null,
        "llm_usage": null,
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": "text",
        "agent_metadata": null,
        "original_message": null,
        "time_in_call_secs": 69,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": null
      },
      {
        "role": "agent",
        "message": "Thank you. Let me spell that back to you: H-E-A-D, the number two, D-A-S-K-Y at G-M-A-I-L dot com. Is that correct?",
        "feedback": null,
        "llm_usage": {
          "model_usage": {
            "gpt-4o": {
              "input": {
                "price": 0.0002725,
                "tokens": 109
              },
              "output_total": {
                "price": 0.00039,
                "tokens": 39
              },
              "input_cache_read": {
                "price": 0.004,
                "tokens": 3200
              },
              "input_cache_write": {
                "price": 0,
                "tokens": 0
              }
            }
          }
        },
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": null,
        "agent_metadata": {
          "agent_id": "agent_1601k5fak9jsfrzsk06455d9f98j",
          "workflow_node_id": "node_appointment_scheduling"
        },
        "original_message": null,
        "time_in_call_secs": 74,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": {
          "metrics": {
            "convai_llm_service_ttfb": {
              "elapsed_time": 0.6534446340010618
            },
            "convai_llm_service_ttf_sentence": {
              "elapsed_time": 0.8258986150030978
            },
            "convai_llm_service_tt_last_sentence": {
              "elapsed_time": 1.3515096870032721
            }
          }
        }
      },
      {
        "role": "user",
        "message": "yes",
        "feedback": null,
        "llm_usage": null,
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": "text",
        "agent_metadata": null,
        "original_message": null,
        "time_in_call_secs": 74,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": null
      },
      {
        "role": "agent",
        "message": "Thank you, Ricky. Now, let's schedule your appointment. We have the following available times: Wednesday, September twenty-fourth, from ten thirty to eleven thirty in the morning or two forty-five to four thirty in the afternoon; Thursday, September twenty-fifth, from nine to eleven forty-five in the morning or one forty-five to four in the afternoon; and Friday, September twenty-sixth, from nine to three. Which time would work best for you?",
        "feedback": null,
        "llm_usage": {
          "model_usage": {
            "gpt-4o": {
              "input": {
                "price": 0.00007,
                "tokens": 28
              },
              "output_total": {
                "price": 0.00094,
                "tokens": 94
              },
              "input_cache_read": {
                "price": 0.00416,
                "tokens": 3328
              },
              "input_cache_write": {
                "price": 0,
                "tokens": 0
              }
            }
          }
        },
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": null,
        "agent_metadata": {
          "agent_id": "agent_1601k5fak9jsfrzsk06455d9f98j",
          "workflow_node_id": "node_appointment_scheduling"
        },
        "original_message": null,
        "time_in_call_secs": 77,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": {
          "metrics": {
            "convai_llm_service_ttfb": {
              "elapsed_time": 0.9402266909964965
            },
            "convai_llm_service_ttf_sentence": {
              "elapsed_time": 1.0169484180005384
            },
            "convai_llm_service_tt_last_sentence": {
              "elapsed_time": 3.1022218219950446
            }
          }
        }
      },
      {
        "role": "user",
        "message": "Friday the 26th at 10am",
        "feedback": null,
        "llm_usage": null,
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": "text",
        "agent_metadata": null,
        "original_message": null,
        "time_in_call_secs": 77,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": null
      },
      {
        "role": "agent",
        "message": "Great choice! I've scheduled your appointment for Friday, September twenty-sixth, at ten in the morning. Is there anything else you'd like to add or any special instructions for the technician?",
        "feedback": null,
        "llm_usage": {
          "model_usage": {
            "gpt-4o": {
              "input": {
                "price": 0.000665,
                "tokens": 266
              },
              "output_total": {
                "price": 0.00038,
                "tokens": 38
              },
              "input_cache_read": {
                "price": 0.004,
                "tokens": 3200
              },
              "input_cache_write": {
                "price": 0,
                "tokens": 0
              }
            }
          }
        },
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": null,
        "agent_metadata": {
          "agent_id": "agent_1601k5fak9jsfrzsk06455d9f98j",
          "workflow_node_id": "node_appointment_scheduling"
        },
        "original_message": null,
        "time_in_call_secs": 92,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": {
          "metrics": {
            "convai_llm_service_ttfb": {
              "elapsed_time": 0.9847200560034253
            },
            "convai_llm_service_ttf_sentence": {
              "elapsed_time": 1.1803041739985929
            },
            "convai_llm_service_tt_last_sentence": {
              "elapsed_time": 3.081043275000411
            }
          }
        }
      },
      {
        "role": "user",
        "message": "Yes, there is a gate code of 12345",
        "feedback": null,
        "llm_usage": null,
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": "text",
        "agent_metadata": null,
        "original_message": null,
        "time_in_call_secs": 92,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": null
      },
      {
        "role": "agent",
        "message": "Got it. I'll make a note of the gate code one two three four five. Let's confirm all the details: Your name is Ricky Charpentier, the service address is 5605 Trevesta Place, Palmetto, Florida 34221, your phone number is seven two seven, eight seven one, four eight six two, and your email is head2dasky@gmail.com. The appointment is scheduled for Friday, September twenty-sixth, at ten in the morning, with the gate code one two three four five. Is all of this information correct, or would you like to change anything?",
        "feedback": null,
        "llm_usage": {
          "model_usage": {
            "gpt-4o": {
              "input": {
                "price": 0.008805,
                "tokens": 3522
              },
              "output_total": {
                "price": 0.00125,
                "tokens": 125
              },
              "input_cache_read": {
                "price": 0,
                "tokens": 0
              },
              "input_cache_write": {
                "price": 0,
                "tokens": 0
              }
            }
          }
        },
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": null,
        "agent_metadata": {
          "agent_id": "agent_1601k5fak9jsfrzsk06455d9f98j",
          "workflow_node_id": "node_appointment_scheduling"
        },
        "original_message": null,
        "time_in_call_secs": 106,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": {
          "metrics": {
            "convai_llm_service_ttfb": {
              "elapsed_time": 1.0223416020016884
            },
            "convai_llm_service_ttf_sentence": {
              "elapsed_time": 1.2237899739993736
            },
            "convai_llm_service_tt_last_sentence": {
              "elapsed_time": 8.043949352002528
            }
          }
        }
      },
      {
        "role": "user",
        "message": "It's all correct",
        "feedback": null,
        "llm_usage": null,
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": "text",
        "agent_metadata": null,
        "original_message": null,
        "time_in_call_secs": 106,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": null
      },
      {
        "role": "agent",
        "message": null,
        "feedback": null,
        "llm_usage": null,
        "tool_calls": [
          {
            "type": "workflow",
            "tool_name": "notify_condition_1_met",
            "request_id": "call_J5r7u0P9W2kUMX41kf2SoBzu",
            "tool_details": null,
            "params_as_json": "{}",
            "tool_has_been_called": true
          }
        ],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": null,
        "agent_metadata": {
          "agent_id": "agent_1601k5fak9jsfrzsk06455d9f98j",
          "workflow_node_id": "node_appointment_scheduling"
        },
        "original_message": null,
        "time_in_call_secs": 119,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": {
          "metrics": {
            "convai_llm_service_ttfb": {
              "elapsed_time": 2.3412358190034865
            },
            "convai_llm_tool_request_generation_latency": {
              "elapsed_time": 2.342886746999284
            }
          }
        }
      },
      {
        "role": "agent",
        "message": null,
        "feedback": null,
        "llm_usage": null,
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [
          {
            "type": "workflow",
            "result": {
              "steps": [
                {
                  "type": "nested_tools",
                  "node_id": "node_01k5j9mq90e4b8s062cn11ejdq",
                  "results": [
                    {
                      "type": "system",
                      "result": {
                        "status": "success",
                        "delay_ms": 0,
                        "to_agent": "node_01k5j9mq90e4b8s062cn11ejdq",
                        "condition": "",
                        "from_agent": "agent_1601k5fak9jsfrzsk06455d9f98j",
                        "result_type": "transfer_to_agent_success",
                        "transfer_message": null,
                        "enable_transferred_agent_first_message": false
                      },
                      "is_error": false,
                      "tool_name": "transfer_to_agent",
                      "request_id": "tlcal_7001k5y64ejjexp9vwrfm67qhhb6",
                      "result_value": "{\"result_type\":\"transfer_to_agent_success\",\"status\":\"success\",\"from_agent\":\"agent_1601k5fak9jsfrzsk06455d9f98j\",\"to_agent\":\"node_01k5j9mq90e4b8s062cn11ejdq\",\"condition\":\"\",\"delay_ms\":0,\"transfer_message\":null,\"enable_transferred_agent_first_message\":false}",
                      "tool_latency_secs": 0.00010081900109071285,
                      "tool_has_been_called": true,
                      "dynamic_variable_updates": []
                    }
                  ],
                  "requests": [
                    {
                      "type": "system",
                      "tool_name": "transfer_to_agent",
                      "request_id": "tlcal_7001k5y64ejjexp9vwrfm67qhhb6",
                      "tool_details": null,
                      "params_as_json": "{\"reason\": \"Transferring to agent as part of a workflow route.\", \"agent_number\": 0}",
                      "tool_has_been_called": false
                    }
                  ],
                  "is_successful": true,
                  "step_latency_secs": 0.015925441999570467
                }
              ]
            },
            "is_error": false,
            "tool_name": "notify_condition_1_met",
            "request_id": "call_J5r7u0P9W2kUMX41kf2SoBzu",
            "result_value": "{\"steps\":[{\"step_latency_secs\":0.015925441999570467,\"type\":\"nested_tools\",\"node_id\":\"node_01k5j9mq90e4b8s062cn11ejdq\",\"requests\":[{\"type\":\"system\",\"request_id\":\"tlcal_7001k5y64ejjexp9vwrfm67qhhb6\",\"tool_name\":\"transfer_to_agent\",\"params_as_json\":\"{\\\"reason\\\": \\\"Transferring to agent as part of a workflow route.\\\", \\\"agent_number\\\": 0}\",\"tool_has_been_called\":false,\"tool_details\":null}],\"results\":[{\"request_id\":\"tlcal_7001k5y64ejjexp9vwrfm67qhhb6\",\"tool_name\":\"transfer_to_agent\",\"result_value\":\"{\\\"result_type\\\":\\\"transfer_to_agent_success\\\",\\\"status\\\":\\\"success\\\",\\\"from_agent\\\":\\\"agent_1601k5fak9jsfrzsk06455d9f98j\\\",\\\"to_agent\\\":\\\"node_01k5j9mq90e4b8s062cn11ejdq\\\",\\\"condition\\\":\\\"\\\",\\\"delay_ms\\\":0,\\\"transfer_message\\\":null,\\\"enable_transferred_agent_first_message\\\":false}\",\"is_error\":false,\"tool_has_been_called\":true,\"tool_latency_secs\":0.00010081900109071285,\"dynamic_variable_updates\":[],\"type\":\"system\",\"result\":{\"result_type\":\"transfer_to_agent_success\",\"status\":\"success\",\"from_agent\":\"agent_1601k5fak9jsfrzsk06455d9f98j\",\"to_agent\":\"node_01k5j9mq90e4b8s062cn11ejdq\",\"condition\":\"\",\"delay_ms\":0,\"transfer_message\":null,\"enable_transferred_agent_first_message\":false}}],\"is_successful\":true}]}",
            "tool_latency_secs": 0.01613505999557674,
            "tool_has_been_called": true,
            "dynamic_variable_updates": []
          }
        ],
        "source_medium": null,
        "agent_metadata": {
          "agent_id": "agent_1601k5fak9jsfrzsk06455d9f98j",
          "workflow_node_id": "node_appointment_scheduling"
        },
        "original_message": null,
        "time_in_call_secs": 119,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": null
      },
      {
        "role": "agent",
        "message": "Thanks! You've been confirmed. Is there anything else I can help you with?",
        "feedback": null,
        "llm_usage": {
          "model_usage": {
            "gpt-4o": {
              "input": {
                "price": 0.00592,
                "tokens": 2368
              },
              "output_total": {
                "price": 0.00030000000000000003,
                "tokens": 30
              },
              "input_cache_read": {
                "price": 0.00432,
                "tokens": 3456
              },
              "input_cache_write": {
                "price": 0,
                "tokens": 0
              }
            }
          }
        },
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": null,
        "agent_metadata": {
          "agent_id": "agent_1601k5fak9jsfrzsk06455d9f98j",
          "workflow_node_id": "node_01k5j9mq90e4b8s062cn11ejdq"
        },
        "original_message": null,
        "time_in_call_secs": 119,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": {
          "metrics": {
            "convai_llm_service_ttfb": {
              "elapsed_time": 1.2557829939978546
            },
            "convai_llm_service_ttf_sentence": {
              "elapsed_time": 1.2565772579982877
            },
            "convai_llm_service_tt_last_sentence": {
              "elapsed_time": 2.2975671579988557
            }
          }
        }
      },
      {
        "role": "user",
        "message": "Nope",
        "feedback": null,
        "llm_usage": null,
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": "text",
        "agent_metadata": null,
        "original_message": null,
        "time_in_call_secs": 119,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": null
      },
      {
        "role": "agent",
        "message": "Thank you for choosing Test A/C. Have a great day!",
        "feedback": null,
        "llm_usage": null,
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": null,
        "agent_metadata": {
          "agent_id": "agent_1601k5fak9jsfrzsk06455d9f98j",
          "workflow_node_id": "node_01k5j9mq90e4b8s062cn11ejdq"
        },
        "original_message": null,
        "time_in_call_secs": 126,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": {
          "metrics": {
            "convai_llm_service_ttfb": {
              "elapsed_time": 4.339290395000717
            },
            "convai_llm_tool_request_generation_latency": {
              "elapsed_time": 4.340258415002609
            }
          }
        }
      },
      {
        "role": "agent",
        "message": null,
        "feedback": null,
        "llm_usage": null,
        "tool_calls": [
          {
            "type": "system",
            "tool_name": "end_call",
            "request_id": "call_M1FWgMTOkv3JWoQyH9i3bMSu",
            "tool_details": null,
            "params_as_json": "{\"reason\":\"The user has confirmed all details and has no further questions.\",\"system__message_to_speak\":\"Thank you for choosing Test A/C. Have a great day!\"}",
            "tool_has_been_called": true
          }
        ],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [],
        "source_medium": null,
        "agent_metadata": {
          "agent_id": "agent_1601k5fak9jsfrzsk06455d9f98j",
          "workflow_node_id": "node_01k5j9mq90e4b8s062cn11ejdq"
        },
        "original_message": null,
        "time_in_call_secs": 126,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": {
          "metrics": {
            "convai_llm_service_ttfb": {
              "elapsed_time": 4.339290395000717
            },
            "convai_llm_tool_request_generation_latency": {
              "elapsed_time": 4.340258415002609
            }
          }
        }
      },
      {
        "role": "agent",
        "message": null,
        "feedback": null,
        "llm_usage": {
          "model_usage": {
            "gpt-4o": {
              "input": {
                "price": 0.0000425,
                "tokens": 17
              },
              "output_total": {
                "price": 0.00045,
                "tokens": 45
              },
              "input_cache_read": {
                "price": 0.00272,
                "tokens": 2176
              },
              "input_cache_write": {
                "price": 0,
                "tokens": 0
              }
            }
          }
        },
        "tool_calls": [],
        "interrupted": false,
        "llm_override": null,
        "tool_results": [
          {
            "type": "system",
            "result": {
              "reason": "The user has confirmed all details and has no further questions.",
              "status": "success",
              "message": null,
              "result_type": "end_call_success"
            },
            "is_error": false,
            "tool_name": "end_call",
            "request_id": "call_M1FWgMTOkv3JWoQyH9i3bMSu",
            "result_value": "{\"result_type\":\"end_call_success\",\"status\":\"success\",\"reason\":\"The user has confirmed all details and has no further questions.\",\"message\":null}",
            "tool_latency_secs": 0.5009573589995853,
            "tool_has_been_called": true,
            "dynamic_variable_updates": []
          }
        ],
        "source_medium": null,
        "agent_metadata": {
          "agent_id": "agent_1601k5fak9jsfrzsk06455d9f98j",
          "workflow_node_id": "node_01k5j9mq90e4b8s062cn11ejdq"
        },
        "original_message": null,
        "time_in_call_secs": 126,
        "multivoice_message": null,
        "rag_retrieval_info": null,
        "conversation_turn_metrics": null
      }
    ],
    "conversation_id": "conv_5701k5y60q87f088mtebx508wg7y",
    "conversation_initiation_client_data": {
      "user_id": "o3zdIqYwDYfKPw2KrSE2Tbi9kxX2",
      "source_info": {
        "source": "react_sdk",
        "version": "0.5.0"
      },
      "dynamic_variables": {
        "date": "Friday 8/25",
        "time": "9am",
        "services": "[{\"name\": \"HVAC service\", \"price\": 99}, {\"name\": \"A/C repair\", \"price\": 80}, {\"name\": \"thermostat fixes\", \"price\": 49}, {\"name\": \"refrigerant refill\", \"price\": 149}]",
        "timeframe": "30 minutes",
        "business_id": "5a8a338e-d401-4a14-a109-6974859ce5b8",
        "service_type": "A/C repair",
        "system__time": "Wednesday, 15:40 24 September 2025",
        "business_name": "Test A/C",
        "customer_name": "Ricky Charpentier",
        "email_address": "rickycharpentier@gmail.com",
        "service_names": "HVAC service, A/C repair, thermostat fixes, refrigerant refill",
        "customer_phone": "9412584006",
        "preferred_time": "Friday at 9am",
        "available_times": "[       {         \"endTime\": \"2025-09-24T11:30:00.000Z\",         \"startTime\": \"2025-09-24T10:30:00.000Z\",         \"timeOfDay\": \"morning\",         \"humanReadable\": \"Wednesday, September 24, 2025 10:30 am-11:30 am\"       },       {         \"endTime\": \"2025-09-24T16:30:00.000Z\",         \"startTime\": \"2025-09-24T14:45:00.000Z\",         \"timeOfDay\": \"afternoon\",         \"humanReadable\": \"Wednesday, September 24, 2025 2:45 pm-4:30 pm\"       },       {         \"endTime\": \"2025-09-25T11:45:00.000Z\",         \"startTime\": \"2025-09-25T09:00:00.000Z\",         \"timeOfDay\": \"morning\",         \"humanReadable\": \"Thursday, September 25, 2025 9 am-11:45 am\"       },       {         \"endTime\": \"2025-09-25T16:00:00.000Z\",         \"startTime\": \"2025-09-25T13:45:00.000Z\",         \"timeOfDay\": \"afternoon\",         \"humanReadable\": \"Thursday, September 25, 2025 1:45 pm-4 pm\"       },       {         \"endTime\": \"2025-09-26T15:00:00.000Z\",         \"startTime\": \"2025-09-26T09:00:00.000Z\",         \"timeOfDay\": \"morning\",         \"humanReadable\": \"Friday, September 26, 2025 9 am-3 pm\"       }     ]",
        "service_address": "5605 Trevesta Place, Palmetto, FL 34221",
        "additional_notes": "None",
        "system__agent_id": "agent_1601k5fak9jsfrzsk06455d9f98j",
        "system__call_sid": null,
        "system__time_utc": "2025-09-24T15:40:47.577644+00:00",
        "system__timezone": null,
        "forwarding_number": "9412584006",
        "system__caller_id": null,
        "system__called_number": null,
        "system__conversation_id": "conv_5701k5y60q87f088mtebx508wg7y",
        "system__current_agent_id": "agent_1601k5fak9jsfrzsk06455d9f98j",
        "system__call_duration_secs": 133
      },
      "custom_llm_extra_body": {},
      "conversation_config_override": {
        "tts": {
          "speed": null,
          "voice_id": null,
          "stability": null,
          "similarity_boost": null
        },
        "agent": {
          "prompt": null,
          "language": null,
          "first_message": null
        },
        "conversation": {
          "text_only": true
        }
      }
    }
  },
  "type": "post_call_transcription",
  "event_timestamp": 1758728451
};