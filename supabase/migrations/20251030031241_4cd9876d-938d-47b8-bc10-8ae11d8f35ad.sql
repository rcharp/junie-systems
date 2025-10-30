-- Clear all issue_details from call_logs
UPDATE call_logs SET issue_details = NULL WHERE issue_details IS NOT NULL;