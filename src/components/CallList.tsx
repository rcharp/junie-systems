import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Volume2, MessageSquare, Calendar, Phone, Clock } from "lucide-react";
import { useState } from "react";

const CallList = () => {
  const [calls] = useState([
    {
      id: 1,
      title: "New customer consultation",
      caller: "Sarah Johnson",
      phone: "+1 (555) 123-4567",
      type: "Sales Call",
      status: "Completed",
      duration: "3:24",
      time: "2 hours ago",
      outcome: "Appointment scheduled",
      leadCaptured: true,
      appointmentSet: true,
      color: "text-success"
    },
    {
      id: 2,
      title: "Emergency service request",
      caller: "Mike Thompson",
      phone: "+1 (555) 987-6543",
      type: "Urgent",
      status: "Completed",
      duration: "1:47",
      time: "4 hours ago",
      outcome: "Urgent callback requested",
      leadCaptured: true,
      appointmentSet: false,
      color: "text-destructive"
    },
    {
      id: 3,
      title: "Pricing inquiry",
      caller: "Jennifer Davis",
      phone: "+1 (555) 456-7890",
      type: "Info Request",
      status: "Completed",
      duration: "2:15",
      time: "6 hours ago",
      outcome: "Information provided",
      leadCaptured: true,
      appointmentSet: false,
      color: "text-primary"
    },
    {
      id: 4,
      title: "Appointment rescheduling",
      caller: "Robert Wilson",
      phone: "+1 (555) 321-0987",
      type: "Existing Client",
      status: "Completed",
      duration: "1:32",
      time: "Yesterday",
      outcome: "Rescheduled successfully",
      leadCaptured: false,
      appointmentSet: true,
      color: "text-accent"
    },
    {
      id: 5,
      title: "Product demo request",
      caller: "Lisa Anderson",
      phone: "+1 (555) 654-3210",
      type: "Sales Call",
      status: "Completed",
      duration: "4:12",
      time: "2 days ago",
      outcome: "Demo scheduled",
      leadCaptured: true,
      appointmentSet: true,
      color: "text-success"
    }
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <Phone className="w-5 h-5" />
            <span>Recent Calls</span>
          </span>
          <Badge variant="secondary">{calls.length} calls today</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {calls.map((call) => (
            <Card key={call.id} className="group hover:shadow-elegant transition-all duration-300 cursor-pointer border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Button size="icon" variant="outline" className="rounded-full">
                      <Play className="w-4 h-4" />
                    </Button>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{call.title}</h4>
                        <Badge variant="secondary" className={call.color}>
                          {call.type}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                        <span className="font-medium text-foreground">{call.caller}</span>
                        <span>{call.phone}</span>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{call.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Badge variant={call.status === "Completed" ? "default" : "secondary"}>
                    {call.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Volume2 className="w-4 h-4" />
                      <span>{call.duration}</span>
                    </div>
                    {call.leadCaptured && (
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="w-4 h-4 text-success" />
                        <span className="text-success">Lead captured</span>
                      </div>
                    )}
                    {call.appointmentSet && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="text-primary">Appointment set</span>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Outcome:</span> {call.outcome}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CallList;